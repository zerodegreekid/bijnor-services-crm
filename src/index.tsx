import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { type Bindings, type EnquiryFormData, type User } from './types'

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// Utility functions
function generateTicketNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `BS${year}${month}${day}${random}`
}

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

async function hashPassword(password: string): Promise<string> {
  // Simple hash for demo - in production use proper bcrypt
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'salt123')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedPassword = await hashPassword(password)
  return hashedPassword === hash
}

// API Routes

// Customer enquiry submission
app.post('/api/enquiry', async (c) => {
  try {
    const data: EnquiryFormData = await c.req.json()
    const { env } = c

    // Check if customer exists
    let customer = await env.DB.prepare(`
      SELECT * FROM customers WHERE phone_number = ?
    `).bind(data.phone_number).first()

    if (!customer) {
      // Create new customer
      const customerResult = await env.DB.prepare(`
        INSERT INTO customers (phone_number, name, email) VALUES (?, ?, ?)
      `).bind(data.phone_number, data.customer_name, data.email || null).run()
      
      customer = { id: customerResult.meta.last_row_id }
    }

    // Create enquiry
    const ticketNumber = generateTicketNumber()
    const enquiryResult = await env.DB.prepare(`
      INSERT INTO enquiries (
        ticket_number, customer_id, imei, device_model, 
        problem_description, warranty_status, insurance_status, 
        service_type, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      ticketNumber,
      customer.id,
      data.imei || null,
      data.device_model,
      data.problem_description,
      data.warranty_status || 'unknown',
      data.insurance_status || 'none',
      data.service_type,
      'web'
    ).run()

    return c.json({
      success: true,
      ticket_number: ticketNumber,
      message: 'Enquiry submitted successfully'
    })
  } catch (error) {
    console.error('Error submitting enquiry:', error)
    return c.json({ success: false, message: 'Error submitting enquiry' }, 500)
  }
})

// Staff login
app.post('/api/login', async (c) => {
  try {
    const { username, password } = await c.req.json()
    const { env } = c

    const user = await env.DB.prepare(`
      SELECT * FROM users WHERE username = ? AND is_active = 1
    `).bind(username).first() as User | null

    if (!user || !(await verifyPassword(password, user.password_hash as any))) {
      return c.json({ success: false, message: 'Invalid credentials' }, 401)
    }

    // Create session
    const sessionId = generateSessionId()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await env.DB.prepare(`
      INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)
    `).bind(sessionId, user.id, expiresAt.toISOString()).run()

    return c.json({
      success: true,
      session_id: sessionId,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ success: false, message: 'Login failed' }, 500)
  }
})

// IMEI/Phone lookup
app.get('/api/lookup/:type/:value', async (c) => {
  try {
    const type = c.req.param('type') // 'imei' or 'phone'
    const value = c.req.param('value')
    const { env } = c

    let query = ''
    if (type === 'imei') {
      query = `
        SELECT e.*, c.name as customer_name, c.phone_number, c.email as customer_email
        FROM enquiries e
        LEFT JOIN customers c ON e.customer_id = c.id
        WHERE e.imei = ?
        ORDER BY e.created_at DESC
      `
    } else if (type === 'phone') {
      query = `
        SELECT e.*, c.name as customer_name, c.phone_number, c.email as customer_email
        FROM enquiries e
        LEFT JOIN customers c ON e.customer_id = c.id
        WHERE c.phone_number = ?
        ORDER BY e.created_at DESC
      `
    }

    const results = await env.DB.prepare(query).bind(value).all()
    return c.json({ success: true, enquiries: results.results })
  } catch (error) {
    console.error('Lookup error:', error)
    return c.json({ success: false, message: 'Lookup failed' }, 500)
  }
})

// Get accessories with search/filter
app.get('/api/accessories', async (c) => {
  try {
    const search = c.req.query('search') || ''
    const category = c.req.query('category') || ''
    const { env } = c

    let query = `
      SELECT * FROM accessories 
      WHERE is_active = 1
    `
    const params: any[] = []

    if (search) {
      query += ` AND (part_name LIKE ? OR part_number LIKE ? OR compatible_devices LIKE ?)`
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    if (category) {
      query += ` AND category = ?`
      params.push(category)
    }

    query += ` ORDER BY part_name`

    const results = await env.DB.prepare(query).bind(...params).all()
    return c.json({ success: true, accessories: results.results })
  } catch (error) {
    console.error('Accessories fetch error:', error)
    return c.json({ success: false, message: 'Failed to fetch accessories' }, 500)
  }
})

// Get all enquiries for dashboard
app.get('/api/enquiries', async (c) => {
  try {
    const status = c.req.query('status') || ''
    const limit = parseInt(c.req.query('limit') || '50')
    const { env } = c

    let query = `
      SELECT e.*, c.name as customer_name, c.phone_number, c.email as customer_email,
             u.full_name as assigned_user_name
      FROM enquiries e
      LEFT JOIN customers c ON e.customer_id = c.id
      LEFT JOIN users u ON e.assigned_to = u.id
    `
    const params: any[] = []

    if (status) {
      query += ` WHERE e.status = ?`
      params.push(status)
    }

    query += ` ORDER BY e.created_at DESC LIMIT ?`
    params.push(limit)

    const results = await env.DB.prepare(query).bind(...params).all()
    return c.json({ success: true, enquiries: results.results })
  } catch (error) {
    console.error('Enquiries fetch error:', error)
    return c.json({ success: false, message: 'Failed to fetch enquiries' }, 500)
  }
})

// Update enquiry status
app.put('/api/enquiry/:id/status', async (c) => {
  try {
    const id = c.req.param('id')
    const { status, notes } = await c.req.json()
    const { env } = c

    // Get current enquiry
    const enquiry = await env.DB.prepare(`
      SELECT status FROM enquiries WHERE id = ?
    `).bind(id).first()

    if (!enquiry) {
      return c.json({ success: false, message: 'Enquiry not found' }, 404)
    }

    // Update enquiry status
    await env.DB.prepare(`
      UPDATE enquiries SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, id).run()

    // Add status history
    await env.DB.prepare(`
      INSERT INTO status_history (enquiry_id, old_status, new_status, notes)
      VALUES (?, ?, ?, ?)
    `).bind(id, enquiry.status, status, notes || null).run()

    return c.json({ success: true, message: 'Status updated successfully' })
  } catch (error) {
    console.error('Status update error:', error)
    return c.json({ success: false, message: 'Failed to update status' }, 500)
  }
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
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          .samsung-blue { color: #1f2937; }
          .samsung-bg-blue { background-color: #1565c0; }
          .samsung-accent { color: #2563eb; }
          .gradient-bg { 
            background: linear-gradient(135deg, #1565c0 0%, #2563eb 100%);
          }
          .card-shadow {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Header -->
        <header class="gradient-bg text-white shadow-lg">
            <div class="max-w-7xl mx-auto px-4 py-6">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <i class="fas fa-cog text-3xl"></i>
                        <div>
                            <h1 class="text-2xl font-bold">BIJNOR SERVICES</h1>
                            <p class="text-blue-100">Authorized Samsung Service Center</p>
                        </div>
                    </div>
                    <div class="hidden md:flex space-x-4">
                        <button onclick="showEnquiryForm()" class="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition">
                            <i class="fas fa-plus mr-2"></i>New Enquiry
                        </button>
                        <button onclick="showStaffLogin()" class="border border-white text-white px-4 py-2 rounded-lg hover:bg-white hover:text-blue-600 transition">
                            <i class="fas fa-sign-in-alt mr-2"></i>Staff Login
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 py-8">
            <!-- Hero Section -->
            <section class="text-center mb-12">
                <h2 class="text-4xl font-bold text-gray-800 mb-4">Professional Samsung Device Repair & Support</h2>
                <p class="text-xl text-gray-600 mb-8">Expert repair services for Samsung smartphones, tablets, and accessories with authorized parts and warranty</p>
                
                <!-- Service Info Cards -->
                <div class="grid md:grid-cols-3 gap-6 mb-8">
                    <div class="card-shadow bg-white p-6 rounded-lg">
                        <i class="fas fa-mobile-alt text-3xl samsung-accent mb-4"></i>
                        <h3 class="text-xl font-bold mb-2">Samsung Repairs</h3>
                        <p class="text-gray-600">In-house repair services for all Samsung devices with genuine parts</p>
                    </div>
                    <div class="card-shadow bg-white p-6 rounded-lg">
                        <i class="fas fa-shield-alt text-3xl samsung-accent mb-4"></i>
                        <h3 class="text-xl font-bold mb-2">Insurance Claims</h3>
                        <p class="text-gray-600">Bajaj Allianz claim processing with pickup and drop services</p>
                    </div>
                    <div class="card-shadow bg-white p-6 rounded-lg">
                        <i class="fas fa-truck text-3xl samsung-accent mb-4"></i>
                        <h3 class="text-xl font-bold mb-2">Pick & Drop</h3>
                        <p class="text-gray-600">Convenient pickup and delivery service for your devices</p>
                    </div>
                </div>
            </section>

            <!-- Contact Information -->
            <section class="mb-12">
                <h3 class="text-2xl font-bold text-center mb-8">Contact Us</h3>
                <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div class="card-shadow bg-white p-6 rounded-lg text-center">
                        <i class="fas fa-phone text-2xl samsung-accent mb-3"></i>
                        <h4 class="font-bold mb-2">Phone</h4>
                        <a href="tel:+918006999809" class="samsung-accent hover:underline">+91 80069 99809</a>
                    </div>
                    <div class="card-shadow bg-white p-6 rounded-lg text-center">
                        <i class="fab fa-whatsapp text-2xl text-green-500 mb-3"></i>
                        <h4 class="font-bold mb-2">WhatsApp</h4>
                        <a href="https://wa.me/918006999806" target="_blank" class="text-green-600 hover:underline">Chat Now</a>
                    </div>
                    <div class="card-shadow bg-white p-6 rounded-lg text-center">
                        <i class="fab fa-facebook text-2xl text-blue-600 mb-3"></i>
                        <h4 class="font-bold mb-2">Facebook</h4>
                        <a href="https://www.facebook.com/bijnorservices" target="_blank" class="text-blue-600 hover:underline">Follow Us</a>
                    </div>
                    <div class="card-shadow bg-white p-6 rounded-lg text-center">
                        <i class="fas fa-globe text-2xl samsung-accent mb-3"></i>
                        <h4 class="font-bold mb-2">Website</h4>
                        <a href="http://www.bijnorservices.in/" target="_blank" class="samsung-accent hover:underline">Visit Site</a>
                    </div>
                </div>
            </section>

            <!-- Business Hours & Location -->
            <section class="grid md:grid-cols-2 gap-8 mb-12">
                <div class="card-shadow bg-white p-6 rounded-lg">
                    <h4 class="text-xl font-bold mb-4"><i class="fas fa-clock mr-2 samsung-accent"></i>Business Hours</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between"><span>Monday - Saturday:</span><span class="font-medium">10:00 AM - 08:00 PM</span></div>
                        <div class="flex justify-between"><span>Sunday:</span><span class="font-medium text-red-600">Closed</span></div>
                    </div>
                </div>
                <div class="card-shadow bg-white p-6 rounded-lg">
                    <h4 class="text-xl font-bold mb-4"><i class="fas fa-map-marker-alt mr-2 samsung-accent"></i>Location</h4>
                    <p class="text-gray-600 mb-3">1st Floor, Sky Tower, Sheel Kunj<br>Civil Line II, Opposite PWD Guest House<br>Bijnor - 246701, Uttar Pradesh</p>
                    <a href="https://www.google.com/maps/place/Samsung+Service+Center/@29.377293,78.1361535,18z/data=!4m8!1m2!10m1!1e1!3m4!1s0x390bef29bd508f0b:0x99d3b831f45d9238!8m2!3d29.377293!4d78.1372478?hl=en-GB" 
                       target="_blank" 
                       class="samsung-accent hover:underline">
                        <i class="fas fa-directions mr-1"></i>Get Directions
                    </a>
                </div>
            </section>

            <!-- Quick Access Buttons -->
            <section class="text-center">
                <div class="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                    <button onclick="showEnquiryForm()" class="samsung-bg-blue text-white p-4 rounded-lg hover:bg-blue-700 transition">
                        <i class="fas fa-plus-circle text-xl mb-2"></i><br>
                        Submit New Enquiry
                    </button>
                    <button onclick="showAccessories()" class="bg-gray-600 text-white p-4 rounded-lg hover:bg-gray-700 transition">
                        <i class="fas fa-shopping-cart text-xl mb-2"></i><br>
                        Check Accessories
                    </button>
                    <a href="https://g.page/r/CTiSXfQxuNOZEBM/review" target="_blank" 
                       class="bg-yellow-500 text-white p-4 rounded-lg hover:bg-yellow-600 transition block">
                        <i class="fas fa-star text-xl mb-2"></i><br>
                        Write Review
                    </a>
                </div>
            </section>
        </main>

        <!-- Modals -->
        <div id="modalOverlay" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50" onclick="closeModal()">
            <div class="flex items-center justify-center min-h-screen p-4">
                <div id="modalContent" class="bg-white rounded-lg max-w-md w-full max-h-full overflow-y-auto" onclick="event.stopPropagation()">
                    <!-- Modal content will be inserted here -->
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
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
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          .samsung-blue { color: #1f2937; }
          .samsung-bg-blue { background-color: #1565c0; }
          .samsung-accent { color: #2563eb; }
        </style>
    </head>
    <body class="bg-gray-100">
        <div id="app"></div>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/portal.js"></script>
    </body>
    </html>
  `)
})

export default app