import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { Bindings, User, Customer, Enquiry, Accessory, Communication, EnquiryFormData } from './types'

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// Utility functions
function generateTicketNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `BS${year}${month}${day}${random}`
}

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

async function hashPassword(password: string): Promise<string> {
  // Simple hash for demo - in production use proper bcrypt
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'salt')
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedPassword = await hashPassword(password)
  return hashedPassword === hash
}

// Authentication middleware
async function requireAuth(c: any, next: () => Promise<void>) {
  const sessionId = c.req.header('x-session-id')
  if (!sessionId) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const session = await c.env.DB.prepare('SELECT u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > datetime("now")').bind(sessionId).first()
  if (!session) {
    return c.json({ error: 'Invalid or expired session' }, 401)
  }

  c.set('user', session)
  await next()
}

// API Routes

// Authentication
app.post('/api/login', async (c) => {
  const { username, password } = await c.req.json()
  
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').bind(username).first()
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const sessionId = generateSessionId()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours

  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').bind(sessionId, user.id, expiresAt).run()

  return c.json({ 
    success: true, 
    sessionId,
    user: { 
      id: user.id, 
      username: user.username, 
      full_name: user.full_name, 
      role: user.role 
    } 
  })
})

app.post('/api/logout', requireAuth, async (c) => {
  const sessionId = c.req.header('x-session-id')
  await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run()
  return c.json({ success: true })
})

// Customer enquiry submission (public)
app.post('/api/enquiry', async (c) => {
  const data: EnquiryFormData = await c.req.json()
  
  // Find or create customer
  let customer = await c.env.DB.prepare('SELECT * FROM customers WHERE phone_number = ?').bind(data.phone_number).first()
  
  if (!customer) {
    const customerResult = await c.env.DB.prepare(`
      INSERT INTO customers (phone_number, name, email) 
      VALUES (?, ?, ?) RETURNING id
    `).bind(data.phone_number, data.customer_name, data.email || null).run()
    
    customer = { id: customerResult.meta.last_row_id }
  }

  // Create enquiry
  const ticketNumber = generateTicketNumber()
  const enquiryResult = await c.env.DB.prepare(`
    INSERT INTO enquiries (
      ticket_number, customer_id, imei, device_model, problem_description, 
      warranty_status, insurance_status, service_type, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'web') RETURNING id
  `).bind(
    ticketNumber,
    customer.id,
    data.imei || null,
    data.device_model,
    data.problem_description,
    data.warranty_status || 'unknown',
    data.insurance_status || 'none',
    data.service_type
  ).run()

  return c.json({ 
    success: true, 
    ticket_number: ticketNumber,
    enquiry_id: enquiryResult.meta.last_row_id
  })
})

// IMEI/Phone lookup (staff only)
app.get('/api/lookup', requireAuth, async (c) => {
  const { imei, phone } = c.req.query()
  
  if (!imei && !phone) {
    return c.json({ error: 'IMEI or phone number required' }, 400)
  }

  let enquiries = []
  
  if (imei) {
    enquiries = await c.env.DB.prepare(`
      SELECT e.*, c.name as customer_name, c.phone_number, u.full_name as assigned_user_name
      FROM enquiries e 
      LEFT JOIN customers c ON e.customer_id = c.id
      LEFT JOIN users u ON e.assigned_to = u.id
      WHERE e.imei = ?
      ORDER BY e.created_at DESC
    `).bind(imei).all()
  } else if (phone) {
    enquiries = await c.env.DB.prepare(`
      SELECT e.*, c.name as customer_name, c.phone_number, u.full_name as assigned_user_name
      FROM enquiries e 
      LEFT JOIN customers c ON e.customer_id = c.id
      LEFT JOIN users u ON e.assigned_to = u.id
      WHERE c.phone_number = ?
      ORDER BY e.created_at DESC
    `).bind(phone).all()
  }

  return c.json({ results: enquiries.results || [] })
})

// Enquiries management (staff only)
app.get('/api/enquiries', requireAuth, async (c) => {
  const { status, limit = '50' } = c.req.query()
  
  let query = `
    SELECT e.*, c.name as customer_name, c.phone_number, u.full_name as assigned_user_name
    FROM enquiries e 
    LEFT JOIN customers c ON e.customer_id = c.id
    LEFT JOIN users u ON e.assigned_to = u.id
  `
  
  const params = []
  if (status && status !== 'all') {
    query += ' WHERE e.status = ?'
    params.push(status)
  }
  
  query += ' ORDER BY e.created_at DESC LIMIT ?'
  params.push(parseInt(limit))

  const result = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ enquiries: result.results || [] })
})

app.put('/api/enquiries/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  const updates = await c.req.json()
  const user = c.get('user')

  // Get current enquiry for audit trail
  const current = await c.env.DB.prepare('SELECT * FROM enquiries WHERE id = ?').bind(id).first()
  if (!current) {
    return c.json({ error: 'Enquiry not found' }, 404)
  }

  // Update enquiry
  const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ')
  const values = Object.values(updates)
  
  await c.env.DB.prepare(`
    UPDATE enquiries SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(...values, id).run()

  // Log status change if status was updated
  if (updates.status && updates.status !== current.status) {
    await c.env.DB.prepare(`
      INSERT INTO status_history (enquiry_id, old_status, new_status, notes, changed_by)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, current.status, updates.status, updates.notes || null, user.id).run()
  }

  return c.json({ success: true })
})

// Accessories management
app.get('/api/accessories', async (c) => {
  const { search, category } = c.req.query()
  
  let query = 'SELECT * FROM accessories WHERE is_active = 1'
  const params = []
  
  if (search) {
    query += ' AND (part_name LIKE ? OR compatible_devices LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }
  
  if (category) {
    query += ' AND category = ?'
    params.push(category)
  }
  
  query += ' ORDER BY part_name'
  
  const result = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ accessories: result.results || [] })
})

app.post('/api/accessories', requireAuth, async (c) => {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403)
  }

  const accessory = await c.req.json()
  
  const result = await c.env.DB.prepare(`
    INSERT INTO accessories (
      part_name, part_number, compatible_devices, category, 
      wholesale_price, retail_price, stock_quantity, low_stock_threshold, supplier
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
  `).bind(
    accessory.part_name,
    accessory.part_number || null,
    accessory.compatible_devices || null,
    accessory.category || null,
    accessory.wholesale_price || null,
    accessory.retail_price,
    accessory.stock_quantity || 0,
    accessory.low_stock_threshold || 5,
    accessory.supplier || null
  ).run()

  return c.json({ success: true, id: result.meta.last_row_id })
})

// Communications
app.post('/api/communications', requireAuth, async (c) => {
  const { enquiry_id, communication_type, direction, content } = await c.req.json()
  const user = c.get('user')

  await c.env.DB.prepare(`
    INSERT INTO communications (enquiry_id, communication_type, direction, content, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).bind(enquiry_id, communication_type, direction || 'internal', content, user.id).run()

  return c.json({ success: true })
})

app.get('/api/communications/:enquiry_id', requireAuth, async (c) => {
  const enquiryId = c.req.param('enquiry_id')
  
  const result = await c.env.DB.prepare(`
    SELECT c.*, u.full_name as created_by_name
    FROM communications c
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.enquiry_id = ?
    ORDER BY c.created_at DESC
  `).bind(enquiryId).all()

  return c.json({ communications: result.results || [] })
})

// Dashboard stats (staff only)
app.get('/api/dashboard', requireAuth, async (c) => {
  const openCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM enquiries WHERE status = "open"').first()
  const inProgressCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM enquiries WHERE status = "in_progress"').first()
  const completedToday = await c.env.DB.prepare('SELECT COUNT(*) as count FROM enquiries WHERE status = "completed" AND DATE(completed_at) = DATE("now")').first()
  const lowStock = await c.env.DB.prepare('SELECT COUNT(*) as count FROM accessories WHERE stock_quantity <= low_stock_threshold AND is_active = 1').first()

  return c.json({
    open_enquiries: openCount.count,
    in_progress_enquiries: inProgressCount.count,
    completed_today: completedToday.count,
    low_stock_items: lowStock.count
  })
})

// Main landing page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bijnor Services - Authorized Samsung Service Center</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'samsung-blue': '#1F2937',
                  'samsung-light': '#374151',
                  'accent-blue': '#3B82F6',
                  'bg-gray': '#F9FAFB'
                }
              }
            }
          }
        </script>
        <style>
          .gradient-bg {
            background: linear-gradient(135deg, #1F2937 0%, #374151 100%);
          }
          .glass-effect {
            backdrop-filter: blur(10px);
            background: rgba(255, 255, 255, 0.95);
          }
        </style>
    </head>
    <body class="bg-bg-gray text-gray-800">
        <!-- Header -->
        <header class="gradient-bg text-white shadow-lg">
            <div class="container mx-auto px-4 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <i class="fas fa-cog text-2xl"></i>
                        <div>
                            <h1 class="text-xl font-semibold">BIJNOR SERVICES</h1>
                            <p class="text-sm text-gray-300">Authorized Samsung Service Center</p>
                        </div>
                    </div>
                    <button onclick="showLogin()" class="bg-white text-samsung-blue px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <i class="fas fa-user mr-2"></i>Staff Login
                    </button>
                </div>
            </div>
        </header>

        <div id="app">
            <!-- Hero Section -->
            <section class="py-16 px-4">
                <div class="container mx-auto text-center">
                    <h2 class="text-3xl font-bold text-samsung-blue mb-4">Professional Samsung Device Service</h2>
                    <p class="text-gray-600 text-lg mb-8">Expert repairs, genuine parts, and Bajaj Allianz insurance claim support</p>
                    
                    <div class="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <!-- Services -->
                        <div class="glass-effect rounded-xl p-8 shadow-lg">
                            <i class="fas fa-mobile-alt text-4xl text-accent-blue mb-4"></i>
                            <h3 class="text-xl font-semibold mb-4">Our Services</h3>
                            <ul class="text-left text-gray-600 space-y-2">
                                <li><i class="fas fa-check text-green-500 mr-2"></i>Samsung Device Repairs</li>
                                <li><i class="fas fa-check text-green-500 mr-2"></i>Bajaj Allianz Claims</li>
                                <li><i class="fas fa-check text-green-500 mr-2"></i>Pickup & Drop Service</li>
                                <li><i class="fas fa-check text-green-500 mr-2"></i>Genuine Parts & Accessories</li>
                            </ul>
                        </div>

                        <!-- Contact Info -->
                        <div class="glass-effect rounded-xl p-8 shadow-lg">
                            <i class="fas fa-map-marker-alt text-4xl text-accent-blue mb-4"></i>
                            <h3 class="text-xl font-semibold mb-4">Visit Us</h3>
                            <div class="text-left text-gray-600 space-y-3">
                                <p><strong>Address:</strong><br>1st Floor, Sky Tower, Sheel Kunj<br>Civil Line II, Bijnor - 246701</p>
                                <p><strong>Hours:</strong> Mon-Sat 10AM-8PM</p>
                                <p><strong>Phone:</strong> +91 80069 99809</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Quick Actions -->
            <section class="py-12 px-4 bg-white">
                <div class="container mx-auto">
                    <h3 class="text-2xl font-bold text-center text-samsung-blue mb-8">Quick Actions</h3>
                    <div class="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
                        <button onclick="showEnquiryForm()" class="bg-accent-blue text-white p-6 rounded-xl hover:bg-blue-600 transition-colors">
                            <i class="fas fa-plus-circle text-3xl mb-3"></i>
                            <p class="font-semibold">Submit Enquiry</p>
                        </button>
                        <button onclick="showAccessories()" class="bg-gray-700 text-white p-6 rounded-xl hover:bg-gray-800 transition-colors">
                            <i class="fas fa-shopping-bag text-3xl mb-3"></i>
                            <p class="font-semibold">View Accessories</p>
                        </button>
                        <a href="https://wa.me/918006999806" target="_blank" class="bg-green-600 text-white p-6 rounded-xl hover:bg-green-700 transition-colors text-center">
                            <i class="fab fa-whatsapp text-3xl mb-3"></i>
                            <p class="font-semibold">WhatsApp Chat</p>
                        </a>
                        <a href="https://www.google.com/maps/place/29.3812701,78.130724" target="_blank" class="bg-red-600 text-white p-6 rounded-xl hover:bg-red-700 transition-colors text-center">
                            <i class="fas fa-map text-3xl mb-3"></i>
                            <p class="font-semibold">Get Directions</p>
                        </a>
                    </div>
                </div>
            </section>

            <!-- Contact Links -->
            <section class="py-12 px-4">
                <div class="container mx-auto text-center">
                    <h3 class="text-2xl font-bold text-samsung-blue mb-8">Connect With Us</h3>
                    <div class="flex justify-center space-x-6">
                        <a href="https://www.facebook.com/bijnorservices" target="_blank" class="bg-blue-600 text-white p-4 rounded-full hover:bg-blue-700 transition-colors">
                            <i class="fab fa-facebook text-xl"></i>
                        </a>
                        <a href="http://www.bijnorservices.in/" target="_blank" class="bg-gray-700 text-white p-4 rounded-full hover:bg-gray-800 transition-colors">
                            <i class="fas fa-globe text-xl"></i>
                        </a>
                        <a href="https://g.page/r/CTiSXfQxuNOZEBM/review" target="_blank" class="bg-yellow-600 text-white p-4 rounded-full hover:bg-yellow-700 transition-colors">
                            <i class="fab fa-google text-xl"></i>
                        </a>
                    </div>
                </div>
            </section>
        </div>

        <!-- Login Modal -->
        <div id="loginModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
            <div class="bg-white rounded-xl p-8 w-full max-w-md mx-4">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-semibold text-samsung-blue">Staff Login</h3>
                    <button onclick="hideLogin()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <form id="loginForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Username</label>
                        <input type="text" id="username" name="username" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-transparent">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                        <input type="password" id="password" name="password" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-transparent">
                    </div>
                    <button type="submit" class="w-full bg-accent-blue text-white py-2 rounded-lg hover:bg-blue-600 transition-colors">
                        <i class="fas fa-sign-in-alt mr-2"></i>Login
                    </button>
                </form>
                <p class="text-xs text-gray-500 mt-4">Demo: admin/admin123 or staff1/admin123</p>
            </div>
        </div>

        <!-- Enquiry Form Modal -->
        <div id="enquiryModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50 p-4">
            <div class="bg-white rounded-xl p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-semibold text-samsung-blue">Submit Service Enquiry</h3>
                    <button onclick="hideEnquiryForm()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <form id="enquiryForm" class="space-y-4">
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Your Name *</label>
                            <input type="text" name="customer_name" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                            <input type="tel" name="phone_number" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Email (Optional)</label>
                        <input type="email" name="email" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue">
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Device Model *</label>
                            <input type="text" name="device_model" required placeholder="e.g., Galaxy S24" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">IMEI (Optional)</label>
                            <input type="text" name="imei" placeholder="15-digit IMEI number" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Problem Description *</label>
                        <textarea name="problem_description" required rows="3" placeholder="Describe the issue with your device" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue"></textarea>
                    </div>
                    <div class="grid md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Service Type *</label>
                            <select name="service_type" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue">
                                <option value="repair">Repair</option>
                                <option value="claim">Insurance Claim</option>
                                <option value="enquiry">General Enquiry</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Warranty Status</label>
                            <select name="warranty_status" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue">
                                <option value="unknown">Unknown</option>
                                <option value="in_warranty">In Warranty</option>
                                <option value="out_of_warranty">Out of Warranty</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Insurance</label>
                            <select name="insurance_status" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue">
                                <option value="none">No Insurance</option>
                                <option value="bajaj_allianz">Bajaj Allianz</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-accent-blue text-white py-3 rounded-lg hover:bg-blue-600 transition-colors">
                        <i class="fas fa-paper-plane mr-2"></i>Submit Enquiry
                    </button>
                </form>
            </div>
        </div>

        <!-- Accessories Modal -->
        <div id="accessoriesModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50 p-4">
            <div class="bg-white rounded-xl p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-semibold text-samsung-blue">Accessories & Parts</h3>
                    <button onclick="hideAccessories()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div class="mb-4">
                    <input type="text" id="accessorySearch" placeholder="Search accessories..." class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue">
                </div>
                <div id="accessoriesList" class="space-y-4">
                    <!-- Accessories will be loaded here -->
                </div>
            </div>
        </div>

        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

// Staff portal
app.get('/portal', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Staff Portal - Bijnor Services</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'samsung-blue': '#1F2937',
                  'samsung-light': '#374151',
                  'accent-blue': '#3B82F6',
                  'bg-gray': '#F9FAFB'
                }
              }
            }
          }
        </script>
        <style>
          .gradient-bg {
            background: linear-gradient(135deg, #1F2937 0%, #374151 100%);
          }
        </style>
    </head>
    <body class="bg-bg-gray">
        <div id="portalApp">
            <!-- Portal content will be loaded here -->
        </div>
        <script src="/static/portal.js"></script>
    </body>
    </html>
  `)
})

export default app