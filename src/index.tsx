import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for frontend-backend communication
app.use('/api/*', cors())

// Serve static files from public directory
app.use('/static/*', serveStatic({ root: './public' }))

// Enhanced Authentication API with partner type support
app.post('/api/login', async (c) => {
  const { username, password, partnerType } = await c.req.json()
  const { env } = c
  
  try {
    // Find user in database
    const user = await env.DB.prepare(`
      SELECT u.*, dp.dealer_level, dp.total_points, dp.benefits_earned, dp.benefits_paid
      FROM users u 
      LEFT JOIN dealer_profiles dp ON u.id = dp.user_id 
      WHERE u.username = ? AND u.is_active = 1
    `).bind(username).first()
    
    if (!user) {
      return c.json({ success: false, message: 'User not found' })
    }
    
    // Simple password check (in production, use proper hashing)
    if (user.password_hash !== password) {
      return c.json({ success: false, message: 'Invalid password' })
    }
    
    // Check partner type matches
    if (partnerType === 'dealer' && user.role !== 'dealer') {
      return c.json({ success: false, message: 'Access denied. This is not a dealer account.' })
    }
    
    if (partnerType === 'samsung' && (user.partner_type !== 'samsung' && user.partner_type !== 'admin' && user.role !== 'staff')) {
      return c.json({ success: false, message: 'Access denied. Not authorized for Samsung portal.' })
    }
    
    if (partnerType === 'bajaj_allianz' && (user.partner_type !== 'bajaj_allianz' && user.partner_type !== 'admin')) {
      return c.json({ success: false, message: 'Access denied. Not authorized for Bajaj Allianz portal.' })
    }
    
    // Return user info (excluding password)
    const { password_hash, ...userInfo } = user
    
    return c.json({ 
      success: true, 
      user: userInfo,
      message: 'Login successful' 
    })
    
  } catch (error) {
    return c.json({ success: false, message: 'Login error: ' + error.message })
  }
})

// Submit new insurance claim
app.post('/api/claims', async (c) => {
  const claimData = await c.req.json()
  const { env } = c
  
  try {
    // Generate claim number
    const claimNumber = 'BA' + new Date().getFullYear() + 
                        String(Date.now()).slice(-6)
    
    // Insert or find customer
    let customer = await env.DB.prepare(`
      SELECT id FROM customers WHERE phone_number = ?
    `).bind(claimData.customerPhone).first()
    
    if (!customer) {
      // Create new customer
      const customerResult = await env.DB.prepare(`
        INSERT INTO customers (name, email, phone_number, address, location_lat, location_lng, location_method)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        claimData.customerName,
        claimData.customerEmail || null,
        claimData.customerPhone,
        claimData.pickupAddress || null,
        claimData.location?.lat || null,
        claimData.location?.lng || null,
        claimData.location?.method || 'manual'
      ).run()
      
      customer = { id: customerResult.meta.last_row_id }
    }
    
    // Insert insurance claim
    await env.DB.prepare(`
      INSERT INTO insurance_claims (
        claim_number, customer_id, device_brand, device_model, imei, policy_number,
        claim_type, damage_description, incident_date, service_type, 
        pickup_address, status, customer_location_lat, customer_location_lng
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      claimNumber,
      customer.id,
      claimData.deviceBrand,
      claimData.deviceModel,
      claimData.imei,
      claimData.policyNumber || null,
      claimData.claimType,
      claimData.damageDescription,
      claimData.incidentDate,
      claimData.serviceType,
      claimData.pickupAddress || null,
      'registered',
      claimData.location?.lat || null,
      claimData.location?.lng || null
    ).run()
    
    return c.json({ 
      success: true, 
      claimNumber,
      message: 'Insurance claim registered successfully' 
    })
    
  } catch (error) {
    return c.json({ success: false, message: 'Claim submission error: ' + error.message })
  }
})

// Get all claims (for Bajaj Allianz partners)
app.get('/api/claims', async (c) => {
  const { env } = c
  
  try {
    const claims = await env.DB.prepare(`
      SELECT ic.*, c.name as customer_name, c.phone_number as customer_phone,
             u.full_name as assigned_partner_name
      FROM insurance_claims ic
      LEFT JOIN customers c ON ic.customer_id = c.id
      LEFT JOIN users u ON ic.assigned_partner_id = u.id
      ORDER BY ic.created_at DESC
      LIMIT 100
    `).bind().all()
    
    return c.json(claims.results || [])
  } catch (error) {
    return c.json({ success: false, message: 'Error loading claims: ' + error.message })
  }
})

// Claims Dashboard Route
app.get('/claims-dashboard', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Claims Dashboard - Bijnor Services</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .status-registered { background-color: #EFF6FF; color: #1D4ED8; }
            .status-verification_pending { background-color: #FEF3C7; color: #D97706; }
            .status-assigned { background-color: #DBEAFE; color: #2563EB; }
            .status-pickup_scheduled { background-color: #E0E7FF; color: #5B21B6; }
            .status-repair_in_progress { background-color: #FEF2F2; color: #DC2626; }
            .status-repair_complete { background-color: #DCFCE7; color: #16A34A; }
            .status-settlement_complete { background-color: #F0FDF4; color: #15803D; }
        </style>
    </head>
    <body class="bg-gray-100">
        <!-- Header -->
        <header class="bg-white shadow-lg border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <img src="/bijnor-logo.svg" alt="Bijnor Services" class="h-10 w-auto">
                        <div>
                            <h1 class="text-xl font-bold text-gray-800">BIJNOR SERVICES</h1>
                            <p class="text-sm text-red-600 font-semibold">Bajaj Allianz Claims Dashboard</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <div class="text-right">
                            <p id="partnerName" class="font-semibold text-gray-800">-</p>
                            <p class="text-sm text-red-600">Claims Partner</p>
                        </div>
                        <button onclick="logout()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                            <i class="fas fa-sign-out-alt mr-1"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <div class="max-w-7xl mx-auto px-4 py-6">
            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                <div class="bg-white p-6 rounded-xl shadow-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">Total Claims</p>
                            <p id="totalClaims" class="text-2xl font-bold text-blue-600">-</p>
                        </div>
                        <i class="fas fa-clipboard-list text-3xl text-blue-500"></i>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-xl shadow-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">Pending</p>
                            <p id="pendingClaims" class="text-2xl font-bold text-yellow-600">-</p>
                        </div>
                        <i class="fas fa-clock text-3xl text-yellow-500"></i>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-xl shadow-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">In Progress</p>
                            <p id="progressClaims" class="text-2xl font-bold text-purple-600">-</p>
                        </div>
                        <i class="fas fa-cog fa-spin text-3xl text-purple-500"></i>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-xl shadow-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">Completed</p>
                            <p id="completedClaims" class="text-2xl font-bold text-green-600">-</p>
                        </div>
                        <i class="fas fa-check-circle text-3xl text-green-500"></i>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-xl shadow-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">This Month</p>
                            <p id="monthClaims" class="text-2xl font-bold text-indigo-600">-</p>
                        </div>
                        <i class="fas fa-calendar-alt text-3xl text-indigo-500"></i>
                    </div>
                </div>
            </div>

            <!-- Claims Board -->
            <div class="bg-white rounded-xl shadow-lg">
                <div class="p-6 border-b border-gray-200">
                    <div class="flex justify-between items-center">
                        <h3 class="text-xl font-bold text-gray-800">Insurance Claims Board</h3>
                        <div class="flex space-x-2">
                            <select id="statusFilter" onchange="filterClaims()" 
                                    class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                                <option value="all">All Status</option>
                                <option value="registered">Registered</option>
                                <option value="verification_pending">Verification Pending</option>
                                <option value="assigned">Assigned</option>
                                <option value="pickup_scheduled">Pickup Scheduled</option>
                                <option value="repair_in_progress">Repair In Progress</option>
                                <option value="repair_complete">Repair Complete</option>
                                <option value="settlement_complete">Settlement Complete</option>
                            </select>
                            <button onclick="refreshClaims()" 
                                    class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                                <i class="fas fa-sync-alt mr-1"></i> Refresh
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="p-6">
                    <div id="claimsTable">
                        <p class="text-gray-500 text-center py-8">Loading claims...</p>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            let currentUser = null;
            let allClaims = [];

            window.onload = function() {
                const userData = localStorage.getItem('user');
                if (!userData) {
                    window.location.href = '/';
                    return;
                }
                
                currentUser = JSON.parse(userData);
                if (currentUser.partner_type !== 'bajaj_allianz' && currentUser.partner_type !== 'admin') {
                    alert('Access denied. This is a Bajaj Allianz claims area.');
                    window.location.href = '/';
                    return;
                }
                
                loadClaimsDashboard();
            };

            async function loadClaimsDashboard() {
                document.getElementById('partnerName').textContent = currentUser.full_name;
                await loadClaims();
            }

            async function loadClaims() {
                try {
                    const response = await axios.get('/api/claims');
                    allClaims = response.data;
                    
                    updateStats(allClaims);
                    displayClaims(allClaims);
                    
                } catch (error) {
                    console.error('Error loading claims:', error);
                    document.getElementById('claimsTable').innerHTML = '<p class="text-red-500 text-center py-8">Error loading claims</p>';
                }
            }

            function updateStats(claims) {
                const total = claims.length;
                const pending = claims.filter(c => ['registered', 'verification_pending'].includes(c.status)).length;
                const progress = claims.filter(c => ['assigned', 'pickup_scheduled', 'repair_in_progress'].includes(c.status)).length;
                const completed = claims.filter(c => ['settlement_complete', 'claim_closed'].includes(c.status)).length;
                
                const currentMonth = new Date().getMonth();
                const thisMonth = claims.filter(c => new Date(c.created_at).getMonth() === currentMonth).length;
                
                document.getElementById('totalClaims').textContent = total;
                document.getElementById('pendingClaims').textContent = pending;
                document.getElementById('progressClaims').textContent = progress;
                document.getElementById('completedClaims').textContent = completed;
                document.getElementById('monthClaims').textContent = thisMonth;
            }

            function displayClaims(claims) {
                if (claims.length === 0) {
                    document.getElementById('claimsTable').innerHTML = '<p class="text-gray-500 text-center py-8">No claims found</p>';
                    return;
                }
                
                let html = '<div class="overflow-x-auto">';
                html += '<table class="min-w-full divide-y divide-gray-200">';
                html += '<thead class="bg-gray-50">';
                html += '<tr>';
                html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Claim #</th>';
                html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>';
                html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>';
                html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Claim Type</th>';
                html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>';
                html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>';
                html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>';
                html += '</tr></thead>';
                html += '<tbody class="bg-white divide-y divide-gray-200">';
                
                claims.forEach(claim => {
                    const date = new Date(claim.created_at).toLocaleDateString();
                    const statusClass = 'status-' + claim.status;
                    
                    html += '<tr class="hover:bg-gray-50">';
                    html += '<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">' + claim.claim_number + '</td>';
                    html += '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">';
                    html += '<div>' + (claim.customer_name || 'N/A') + '</div>';
                    html += '<div class="text-xs text-gray-400">' + (claim.customer_phone || '') + '</div>';
                    html += '</td>';
                    html += '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">';
                    html += '<div>' + claim.device_brand + ' ' + claim.device_model + '</div>';
                    html += '<div class="text-xs text-gray-400">' + claim.imei + '</div>';
                    html += '</td>';
                    html += '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">' + claim.claim_type + '</td>';
                    html += '<td class="px-6 py-4 whitespace-nowrap">';
                    html += '<span class="px-2 py-1 text-xs font-semibold rounded-full ' + statusClass + '">' + claim.status.replace('_', ' ') + '</span>';
                    html += '</td>';
                    html += '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">' + date + '</td>';
                    html += '<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">';
                    html += '<button onclick="viewClaim(' + claim.id + ')" class="text-indigo-600 hover:text-indigo-900 mr-2">View</button>';
                    html += '<button onclick="updateClaimStatus(' + claim.id + ')" class="text-green-600 hover:text-green-900">Update</button>';
                    html += '</td>';
                    html += '</tr>';
                });
                
                html += '</tbody></table></div>';
                document.getElementById('claimsTable').innerHTML = html;
            }

            function filterClaims() {
                const status = document.getElementById('statusFilter').value;
                
                if (status === 'all') {
                    displayClaims(allClaims);
                } else {
                    const filtered = allClaims.filter(claim => claim.status === status);
                    displayClaims(filtered);
                }
            }

            function refreshClaims() {
                loadClaims();
            }

            function viewClaim(claimId) {
                alert('Claim details view coming soon! Claim ID: ' + claimId);
            }

            function updateClaimStatus(claimId) {
                alert('Claim status update coming soon! Claim ID: ' + claimId);
            }

            function logout() {
                localStorage.removeItem('user');
                window.location.href = '/';
            }
        </script>
    </body>
    </html>
  `)
})

// Samsung Dashboard Route (Enhanced partner dashboard)
app.get('/samsung-dashboard', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Samsung Dashboard - Bijnor Services</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <!-- Header -->
        <header class="bg-white shadow-lg border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <img src="/bijnor-logo.svg" alt="Bijnor Services" class="h-10 w-auto">
                        <div>
                            <h1 class="text-xl font-bold text-gray-800">BIJNOR SERVICES</h1>
                            <p class="text-sm text-blue-600 font-semibold">Samsung Partner Dashboard</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <div class="text-right">
                            <p id="partnerName" class="font-semibold text-gray-800">-</p>
                            <p class="text-sm text-blue-600">Samsung Partner</p>
                        </div>
                        <button onclick="logout()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                            <i class="fas fa-sign-out-alt mr-1"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <div class="max-w-7xl mx-auto px-4 py-6">
            <!-- Navigation Tabs -->
            <div class="bg-white rounded-xl shadow-lg mb-6">
                <div class="border-b border-gray-200">
                    <nav class="flex">
                        <button onclick="showTab('enquiries')" id="tab-enquiries" 
                                class="tab-button px-6 py-3 text-sm font-medium border-b-2 border-blue-500 text-blue-600">
                            <i class="fas fa-clipboard-list mr-2"></i>Service Enquiries
                        </button>
                        <button onclick="showTab('dealers')" id="tab-dealers" 
                                class="tab-button px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700">
                            <i class="fas fa-users mr-2"></i>Dealers
                        </button>
                        <button onclick="showTab('inventory')" id="tab-inventory" 
                                class="tab-button px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700">
                            <i class="fas fa-boxes mr-2"></i>Inventory
                        </button>
                        <button onclick="showTab('customers')" id="tab-customers" 
                                class="tab-button px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700">
                            <i class="fas fa-address-book mr-2"></i>Customers
                        </button>
                    </nav>
                </div>
            </div>

            <!-- Tab Content -->
            <div id="tab-content">
                <div id="content-enquiries" class="tab-content">
                    <div class="bg-white rounded-xl shadow-lg p-6">
                        <h3 class="text-xl font-bold text-gray-800 mb-4">Samsung Service Enquiries</h3>
                        <div id="enquiriesList">
                            <p class="text-gray-500">Loading enquiries...</p>
                        </div>
                    </div>
                </div>

                <div id="content-dealers" class="tab-content hidden">
                    <div class="bg-white rounded-xl shadow-lg p-6">
                        <h3 class="text-xl font-bold text-gray-800 mb-4">Dealer Management</h3>
                        <div id="dealersList">
                            <p class="text-gray-500">Loading dealers...</p>
                        </div>
                    </div>
                </div>

                <div id="content-inventory" class="tab-content hidden">
                    <div class="bg-white rounded-xl shadow-lg p-6">
                        <h3 class="text-xl font-bold text-gray-800 mb-4">Samsung Parts Inventory</h3>
                        <div id="inventoryList">
                            <p class="text-gray-500">Loading inventory...</p>
                        </div>
                    </div>
                </div>

                <div id="content-customers" class="tab-content hidden">
                    <div class="bg-white rounded-xl shadow-lg p-6">
                        <h3 class="text-xl font-bold text-gray-800 mb-4">Customer Management</h3>
                        <div id="customersList">
                            <p class="text-gray-500">Loading customers...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            let currentUser = null;
            let currentTab = 'enquiries';

            window.onload = function() {
                const userData = localStorage.getItem('user');
                if (!userData) {
                    window.location.href = '/';
                    return;
                }
                
                currentUser = JSON.parse(userData);
                if (currentUser.partner_type !== 'samsung' && currentUser.partner_type !== 'admin' && currentUser.role !== 'staff') {
                    alert('Access denied. Not authorized for Samsung portal.');
                    window.location.href = '/';
                    return;
                }
                
                loadSamsungDashboard();
            };

            async function loadSamsungDashboard() {
                document.getElementById('partnerName').textContent = currentUser.full_name;
                loadTabContent(currentTab);
            }

            function showTab(tabName) {
                // Update tab buttons
                document.querySelectorAll('.tab-button').forEach(btn => {
                    btn.classList.remove('border-blue-500', 'text-blue-600');
                    btn.classList.add('border-transparent', 'text-gray-500');
                });
                
                document.getElementById('tab-' + tabName).classList.remove('border-transparent', 'text-gray-500');
                document.getElementById('tab-' + tabName).classList.add('border-blue-500', 'text-blue-600');
                
                // Update tab content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.add('hidden');
                });
                
                document.getElementById('content-' + tabName).classList.remove('hidden');
                
                currentTab = tabName;
                loadTabContent(tabName);
            }

            async function loadTabContent(tabName) {
                switch(tabName) {
                    case 'enquiries':
                        await loadEnquiries();
                        break;
                    case 'dealers':
                        await loadDealers();
                        break;
                    case 'inventory':
                        await loadInventory();
                        break;
                    case 'customers':
                        await loadCustomers();
                        break;
                }
            }

            async function loadEnquiries() {
                try {
                    const response = await axios.get('/api/enquiries');
                    const enquiries = response.data;
                    
                    let html = '';
                    if (enquiries.length === 0) {
                        html = '<p class="text-gray-500">No enquiries found</p>';
                    } else {
                        html = '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">';
                        html += '<thead class="bg-gray-50"><tr>';
                        html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket</th>';
                        html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>';
                        html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>';
                        html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>';
                        html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>';
                        html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>';
                        html += '</tr></thead><tbody class="bg-white divide-y divide-gray-200">';
                        
                        enquiries.forEach(enquiry => {
                            const date = new Date(enquiry.created_at).toLocaleDateString();
                            html += '<tr>';
                            html += '<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">' + enquiry.ticket_number + '</td>';
                            html += '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">' + (enquiry.customer_name || 'N/A') + '</td>';
                            html += '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">' + (enquiry.device_model || 'N/A') + '</td>';
                            html += '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">' + enquiry.issue_category + '</td>';
                            html += '<td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">' + enquiry.status + '</span></td>';
                            html += '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">' + date + '</td>';
                            html += '</tr>';
                        });
                        
                        html += '</tbody></table></div>';
                    }
                    
                    document.getElementById('enquiriesList').innerHTML = html;
                } catch (error) {
                    document.getElementById('enquiriesList').innerHTML = '<p class="text-red-500">Error loading enquiries</p>';
                }
            }

            async function loadDealers() {
                document.getElementById('dealersList').innerHTML = '<p class="text-gray-500">Dealer management coming soon!</p>';
            }

            async function loadInventory() {
                document.getElementById('inventoryList').innerHTML = '<p class="text-gray-500">Samsung parts inventory coming soon!</p>';
            }

            async function loadCustomers() {
                document.getElementById('customersList').innerHTML = '<p class="text-gray-500">Customer management coming soon!</p>';
            }

            function logout() {
                localStorage.removeItem('user');
                window.location.href = '/';
            }
        </script>
    </body>
    </html>
  `)
})

// Main portal route - Enhanced public landing page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bijnor Services - Authorized Samsung & Bajaj Allianz Partner</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .logo-text { font-family: 'Arial', sans-serif; }
            .btn-primary { 
                background: linear-gradient(135deg, #2C3E50 0%, #3498DB 100%);
                transition: all 0.3s ease;
            }
            .btn-primary:hover { 
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(52, 152, 219, 0.3);
            }
            .btn-samsung {
                background: linear-gradient(135deg, #1428A0 0%, #0066CC 100%);
                transition: all 0.3s ease;
            }
            .btn-samsung:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(20, 40, 160, 0.3);
            }
            .btn-bajaj {
                background: linear-gradient(135deg, #E31837 0%, #FF4444 100%);
                transition: all 0.3s ease;
            }
            .btn-bajaj:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(227, 24, 55, 0.3);
            }
            .card { 
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            .card:hover { 
                transform: translateY(-5px);
                box-shadow: 0 15px 35px rgba(0,0,0,0.1);
            }
        </style>
    </head>
    <body class="bg-gradient-to-br from-blue-50 to-gray-100 min-h-screen">
        <!-- Header -->
        <header class="bg-white shadow-lg border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <img src="/bijnor-logo.svg" alt="Bijnor Services" class="h-12 w-auto">
                        <div>
                            <h1 class="text-2xl font-bold text-gray-800 logo-text">BIJNOR SERVICES</h1>
                            <p class="text-sm text-blue-600 font-semibold">Authorized Samsung Service Center</p>
                            <p class="text-xs text-red-600 font-semibold">Bajaj Allianz Insurance Claims Partner</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-600">Working Hours: 10:00 AM - 6:30 PM</p>
                        <p class="text-sm text-gray-600">Monday - Saturday</p>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 py-8">
            <!-- Welcome Section -->
            <div class="text-center mb-12">
                <h2 class="text-4xl font-bold text-gray-800 mb-4">Welcome to Bijnor Services</h2>
                <p class="text-xl text-gray-600 mb-2">Your trusted partner for Samsung repairs and insurance claims</p>
                <p class="text-lg text-gray-500">Samsung Service Center • Bajaj Allianz Claims Processing • Multi-Brand Support</p>
            </div>

            <!-- Contact Channels -->
            <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
                <h3 class="text-xl font-bold text-gray-800 mb-4 text-center">
                    <i class="fas fa-phone-alt mr-2 text-green-600"></i>
                    Connect With Us
                </h3>
                <div class="grid md:grid-cols-4 gap-4">
                    <a href="https://wa.me/918006999806" target="_blank"
                       class="flex items-center justify-center space-x-2 bg-green-100 hover:bg-green-200 p-3 rounded-lg transition-colors">
                        <i class="fab fa-whatsapp text-green-600 text-xl"></i>
                        <span class="font-medium text-gray-800">WhatsApp</span>
                    </a>
                    <a href="https://www.facebook.com/bijnorservices" target="_blank"
                       class="flex items-center justify-center space-x-2 bg-blue-100 hover:bg-blue-200 p-3 rounded-lg transition-colors">
                        <i class="fab fa-facebook text-blue-600 text-xl"></i>
                        <span class="font-medium text-gray-800">Facebook</span>
                    </a>
                    <a href="http://www.bijnorservices.in/" target="_blank"
                       class="flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors">
                        <i class="fas fa-globe text-gray-600 text-xl"></i>
                        <span class="font-medium text-gray-800">Website</span>
                    </a>
                    <a href="https://maps.app.goo.gl/Q8jusQuafzFFhJ278" target="_blank"
                       class="flex items-center justify-center space-x-2 bg-red-100 hover:bg-red-200 p-3 rounded-lg transition-colors">
                        <i class="fas fa-map-marker-alt text-red-600 text-xl"></i>
                        <span class="font-medium text-gray-800">Location</span>
                    </a>
                </div>
            </div>

            <!-- Partner Login Options -->
            <div class="text-center mb-8">
                <h3 class="text-2xl font-bold text-gray-800 mb-6">Partner Access</h3>
                
                <div class="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    <!-- Samsung Partner Login -->
                    <div class="card bg-white rounded-xl shadow-lg p-6">
                        <div class="text-center mb-6">
                            <i class="fas fa-mobile-alt text-4xl text-blue-600 mb-4"></i>
                            <h4 class="text-xl font-bold text-gray-800 mb-2">Samsung Partner</h4>
                            <p class="text-gray-600 text-sm">Device repairs, CRM, and service center management</p>
                        </div>
                        <button onclick="showLoginModal('samsung')" 
                                class="btn-samsung w-full py-3 px-6 text-white font-semibold rounded-lg">
                            <i class="fas fa-sign-in-alt mr-2"></i>
                            Samsung Portal
                        </button>
                    </div>

                    <!-- Bajaj Allianz Partner Login -->
                    <div class="card bg-white rounded-xl shadow-lg p-6">
                        <div class="text-center mb-6">
                            <i class="fas fa-shield-alt text-4xl text-red-600 mb-4"></i>
                            <h4 class="text-xl font-bold text-gray-800 mb-2">Bajaj Allianz Partner</h4>
                            <p class="text-gray-600 text-sm">Insurance claims processing and settlement</p>
                        </div>
                        <button onclick="showLoginModal('bajaj_allianz')" 
                                class="btn-bajaj w-full py-3 px-6 text-white font-semibold rounded-lg">
                            <i class="fas fa-sign-in-alt mr-2"></i>
                            Claims Portal
                        </button>
                    </div>

                    <!-- Dealer Login -->
                    <div class="card bg-white rounded-xl shadow-lg p-6">
                        <div class="text-center mb-6">
                            <i class="fas fa-store text-4xl text-green-600 mb-4"></i>
                            <h4 class="text-xl font-bold text-gray-800 mb-2">Dealer Portal</h4>
                            <p class="text-gray-600 text-sm">Retailer dashboard with benefits and referrals</p>
                        </div>
                        <button onclick="showLoginModal('dealer')" 
                                class="btn-primary w-full py-3 px-6 text-white font-semibold rounded-lg">
                            <i class="fas fa-sign-in-alt mr-2"></i>
                            Dealer Dashboard
                        </button>
                    </div>
                </div>
            </div>

            <!-- Services Section -->
            <div class="grid md:grid-cols-2 gap-8 mb-8">
                <!-- Samsung Services -->
                <div class="bg-white rounded-xl shadow-lg p-6">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-tools mr-2 text-blue-600"></i>
                        Samsung Services
                    </h3>
                    <div class="space-y-3">
                        <button onclick="showEnquiryForm('samsung')" 
                                class="w-full bg-blue-100 hover:bg-blue-200 p-4 rounded-lg text-left transition-colors">
                            <i class="fas fa-wrench mr-2 text-blue-600"></i>
                            <span class="font-semibold">Device Repair</span>
                            <p class="text-sm text-gray-600 mt-1">Submit repair enquiry for Samsung devices</p>
                        </button>
                        <button onclick="showIMEILookup()" 
                                class="w-full bg-green-100 hover:bg-green-200 p-4 rounded-lg text-left transition-colors">
                            <i class="fas fa-search mr-2 text-green-600"></i>
                            <span class="font-semibold">IMEI Lookup</span>
                            <p class="text-sm text-gray-600 mt-1">Check device warranty and service history</p>
                        </button>
                    </div>
                </div>

                <!-- Insurance Claims -->
                <div class="bg-white rounded-xl shadow-lg p-6">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-shield-alt mr-2 text-red-600"></i>
                        Insurance Claims
                    </h3>
                    <div class="space-y-3">
                        <button onclick="showClaimForm()" 
                                class="w-full bg-red-100 hover:bg-red-200 p-4 rounded-lg text-left transition-colors">
                            <i class="fas fa-file-medical mr-2 text-red-600"></i>
                            <span class="font-semibold">Register Claim</span>
                            <p class="text-sm text-gray-600 mt-1">Submit Bajaj Allianz insurance claim</p>
                        </button>
                        <button onclick="showClaimTracker()" 
                                class="w-full bg-orange-100 hover:bg-orange-200 p-4 rounded-lg text-left transition-colors">
                            <i class="fas fa-search mr-2 text-orange-600"></i>
                            <span class="font-semibold">Track Claim</span>
                            <p class="text-sm text-gray-600 mt-1">Check your claim status and progress</p>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Quick Access Links -->
            <div class="bg-gradient-to-r from-blue-600 to-red-600 rounded-xl shadow-lg p-6 text-white text-center">
                <h3 class="text-xl font-bold mb-4">Quick Access Links</h3>
                <div class="grid md:grid-cols-2 gap-4">
                    <a href="https://servicecenter.samsungdigitalservicecenter.com/authorised-samsung-service-center-bijnor-services-mobile-phone-repair-service-civil-line-bijnor-236981/Home" 
                       target="_blank" class="bg-white bg-opacity-20 hover:bg-opacity-30 p-3 rounded-lg transition-colors">
                        <i class="fas fa-external-link-alt mr-2"></i>
                        Samsung Service Portal
                    </a>
                    <a href="https://g.page/r/CTiSXfQxuNOZEBM/review" 
                       target="_blank" class="bg-white bg-opacity-20 hover:bg-opacity-30 p-3 rounded-lg transition-colors">
                        <i class="fas fa-star mr-2"></i>
                        Leave a Review
                    </a>
                </div>
            </div>
        </main>

        <!-- Login Modal -->
        <div id="loginModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
            <div class="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md mx-4">
                <div class="text-center mb-6">
                    <h3 id="modalTitle" class="text-2xl font-bold text-gray-800 mb-2"></h3>
                    <p id="modalSubtitle" class="text-gray-600"></p>
                </div>
                
                <form id="loginForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input type="text" id="username" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="Enter your username">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input type="password" id="password" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="Enter your password">
                    </div>
                    
                    <div class="flex gap-3 mt-6">
                        <button type="button" onclick="hideLoginModal()" 
                                class="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" 
                                class="flex-1 btn-primary py-2 px-4 text-white rounded-lg">
                            Login
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Enquiry Modal -->
        <div id="enquiryModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
            <div class="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div class="text-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">Submit Service Enquiry</h3>
                    <p class="text-gray-600">Tell us about your device issue</p>
                </div>
                
                <form id="enquiryForm" class="space-y-4">
                    <!-- Customer Information -->
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                            <input type="text" id="customerName" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                            <input type="tel" id="customerPhone" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" id="customerEmail"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Device IMEI (if known)</label>
                        <input type="text" id="deviceIMEI"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="15-digit IMEI number">
                    </div>
                    
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Device Model *</label>
                            <select id="deviceModel" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Select Model</option>
                                <option value="Galaxy S24">Galaxy S24</option>
                                <option value="Galaxy S24+">Galaxy S24+</option>
                                <option value="Galaxy S24 Ultra">Galaxy S24 Ultra</option>
                                <option value="Galaxy A54">Galaxy A54</option>
                                <option value="Galaxy A34">Galaxy A34</option>
                                <option value="Galaxy M34">Galaxy M34</option>
                                <option value="Galaxy S23">Galaxy S23</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Issue Category *</label>
                            <select id="issueCategory" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Select Category</option>
                                <option value="Display Issue">Display Issue</option>
                                <option value="Battery Issue">Battery Issue</option>
                                <option value="Camera Issue">Camera Issue</option>
                                <option value="Software Issue">Software Issue</option>
                                <option value="Charging Issue">Charging Issue</option>
                                <option value="Audio Issue">Audio Issue</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Issue Description *</label>
                        <textarea id="issueDescription" required rows="3"
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Please describe the issue in detail..."></textarea>
                    </div>
                    
                    <!-- Location -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <div class="flex gap-2">
                            <button type="button" onclick="getCurrentLocation()" 
                                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                <i class="fas fa-location-arrow mr-1"></i>
                                Use GPS
                            </button>
                            <input type="text" id="manualAddress" 
                                   class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                   placeholder="Or enter address manually...">
                        </div>
                    </div>
                    
                    <div class="flex gap-3 mt-6">
                        <button type="button" onclick="hideEnquiryModal()" 
                                class="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" 
                                class="flex-1 btn-primary py-2 px-4 text-white rounded-lg">
                            Submit Enquiry
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Claims Modal -->
        <div id="claimModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
            <div class="bg-white rounded-xl shadow-2xl p-8 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
                <div class="text-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">Register Insurance Claim</h3>
                    <p class="text-gray-600">Bajaj Allianz Mobile Insurance Claim</p>
                </div>
                
                <form id="claimForm" class="space-y-6">
                    <!-- Customer Information -->
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-800 mb-3">Customer Information</h4>
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input type="text" id="claimCustomerName" required
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                                <input type="tel" id="claimCustomerPhone" required
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                            </div>
                        </div>
                        <div class="mt-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" id="claimCustomerEmail"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                        </div>
                    </div>

                    <!-- Device & Policy Information -->
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-800 mb-3">Device & Policy Details</h4>
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Device Brand *</label>
                                <select id="deviceBrand" required onchange="updateWarrantyLinks()"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                                    <option value="">Select Brand</option>
                                    <option value="Samsung">Samsung</option>
                                    <option value="Apple">Apple</option>
                                    <option value="OnePlus">OnePlus</option>
                                    <option value="Oppo">Oppo</option>
                                    <option value="Vivo">Vivo</option>
                                    <option value="Xiaomi">Xiaomi</option>
                                    <option value="Realme">Realme</option>
                                    <option value="Motorola">Motorola</option>
                                    <option value="Nothing">Nothing</option>
                                    <option value="Tecno">Tecno</option>
                                    <option value="Infinix">Infinix</option>
                                    <option value="iTel">iTel</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Device Model *</label>
                                <input type="text" id="claimDeviceModel" required
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                       placeholder="e.g., Galaxy S24, iPhone 15">
                            </div>
                        </div>
                        
                        <div class="grid md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">IMEI Number *</label>
                                <input type="text" id="claimIMEI" required
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                       placeholder="15-digit IMEI number">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
                                <input type="text" id="policyNumber"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                       placeholder="Bajaj Allianz Policy Number">
                            </div>
                        </div>

                        <!-- Warranty Verification Links -->
                        <div id="warrantyLinks" class="mt-4 hidden">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Quick Warranty Check</label>
                            <div class="space-y-2">
                                <a id="warrantyCheckUrl" href="#" target="_blank" 
                                   class="inline-flex items-center px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                                    <i class="fas fa-external-link-alt mr-2"></i>
                                    <span>Check Warranty Status</span>
                                </a>
                                <a id="activationCheckUrl" href="#" target="_blank" 
                                   class="inline-flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors ml-2">
                                    <i class="fas fa-mobile-alt mr-2"></i>
                                    <span>Check Activation Status</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- Claim Details -->
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-800 mb-3">Claim Details</h4>
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Claim Type *</label>
                                <select id="claimType" required
                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                                    <option value="">Select Type</option>
                                    <option value="screen_break">Screen Break</option>
                                    <option value="liquid_damage">Liquid Damage</option>
                                    <option value="damage">Physical Damage</option>
                                    <option value="theft">Theft</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Incident Date *</label>
                                <input type="date" id="incidentDate" required
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                            </div>
                        </div>
                        
                        <div class="mt-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Damage Description *</label>
                            <textarea id="damageDescription" required rows="3"
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                      placeholder="Please describe what happened to your device..."></textarea>
                        </div>
                    </div>

                    <!-- Service Options -->
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-800 mb-3">Service Options</h4>
                        <div class="space-y-3">
                            <label class="flex items-start space-x-3 cursor-pointer">
                                <input type="radio" name="serviceType" value="pickup_drop" 
                                       class="mt-1 text-red-600 focus:ring-red-500">
                                <div>
                                    <div class="font-medium text-gray-800">Pickup & Drop Service</div>
                                    <div class="text-sm text-gray-600">We'll collect your device, repair it, and deliver it back</div>
                                </div>
                            </label>
                            <label class="flex items-start space-x-3 cursor-pointer">
                                <input type="radio" name="serviceType" value="reimbursement" 
                                       class="mt-1 text-red-600 focus:ring-red-500">
                                <div>
                                    <div class="font-medium text-gray-800">Reimbursement</div>
                                    <div class="text-sm text-gray-600">Get your device repaired elsewhere and claim reimbursement</div>
                                </div>
                            </label>
                        </div>
                        
                        <div id="addressFields" class="mt-4 hidden">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Pickup Address</label>
                            <textarea id="pickupAddress" rows="2"
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                      placeholder="Complete address for device pickup"></textarea>
                        </div>
                    </div>
                    
                    <div class="flex gap-3 mt-6">
                        <button type="button" onclick="hideClaimModal()" 
                                class="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" 
                                class="flex-1 btn-bajaj py-3 px-4 text-white rounded-lg">
                            Register Claim
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            let currentUserType = null;
            let userLocation = { lat: null, lng: null, method: 'manual' };

            // Warranty verification URLs by brand
            const warrantyUrls = {
                'Samsung': 'https://account.samsung.com/accounts/v1/CyberService/signInGate?response_type=code&client_id=661924lxg8&locale=en_IN&countryCode=IN&redirect_uri=https:%2F%2Fwww.samsung.com%2Fin%2Fsupport%2Fyour-service%2FidenCallback&state=95e2b59c2575411baa847163695243ac&goBackURL=https:%2F%2Fwww.samsung.com%2Fin%2Fsupport%2Fyour-service%2FidenCallback&scope=&redirect_menu=main',
                'Apple': 'https://india.moli.lenovo.com/callcenterv2/moli?data=eyJmaXJzdE5hbWUiOiJtYWhlbmRyYSIsImVtYWlsIjoiVG9tZXJtYWhlbmRyYTA3QGdtYWlsLmNvbSIsInBob25lTnVtYmVyIjoiNzM3OTEzMTExMSIsImxhbmd1YWdlIjoiRW5nbGlzaCJ9',
                'OnePlus': 'https://service.oneplus.com/uk/warranty-check',
                'Oppo': 'https://support.oppo.com/in/warranty-check/',
                'Vivo': 'https://www.vivo.com/in/support/IMEI',
                'Xiaomi': 'https://xiaomicheck.com/',
                'Realme': 'https://www.realme.com/in/support/phonecheck',
                'Motorola': 'https://india.moli.lenovo.com/callcenterv2/moli?data=eyJmaXJzdE5hbWUiOiJtYWhlbmRyYSIsImVtYWlsIjoiVG9tZXJtYWhlbmRyYTA3QGdtYWlsLmNvbSIsInBob25lTnVtYmVyIjoiNzM3OTEzMTExMSIsImxhbmd1YWdlIjoiRW5nbGlzaCJ9',
                'Nothing': 'https://in.nothing.tech/pages/imei-result',
                'Tecno': 'https://www.carlcare.in/in/warranty-check/',
                'Infinix': 'https://www.carlcare.in/in/warranty-check/',
                'iTel': 'https://www.carlcare.in/in/warranty-check/'
            };

            const activationUrls = {
                'OnePlus': 'https://iunlocker.com/check_imei/oneplus/',
                'Apple': 'https://iunlocker.com/check_icloud.php'
            };

            function showLoginModal(type) {
                currentUserType = type;
                const modal = document.getElementById('loginModal');
                const title = document.getElementById('modalTitle');
                const subtitle = document.getElementById('modalSubtitle');
                
                if (type === 'samsung') {
                    title.textContent = 'Samsung Partner Login';
                    subtitle.textContent = 'Access Samsung service center management';
                } else if (type === 'bajaj_allianz') {
                    title.textContent = 'Bajaj Allianz Partner Login';
                    subtitle.textContent = 'Access insurance claims processing system';
                } else {
                    title.textContent = 'Dealer Login';
                    subtitle.textContent = 'Access dealer dashboard and referral system';
                }
                
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }

            function hideLoginModal() {
                document.getElementById('loginModal').classList.add('hidden');
                document.getElementById('loginModal').classList.remove('flex');
                document.getElementById('loginForm').reset();
            }

            function showEnquiryForm(serviceType) {
                document.getElementById('enquiryModal').classList.remove('hidden');
                document.getElementById('enquiryModal').classList.add('flex');
            }

            function hideEnquiryModal() {
                document.getElementById('enquiryModal').classList.add('hidden');
                document.getElementById('enquiryModal').classList.remove('flex');
                document.getElementById('enquiryForm').reset();
            }

            function showClaimForm() {
                document.getElementById('claimModal').classList.remove('hidden');
                document.getElementById('claimModal').classList.add('flex');
            }

            function hideClaimModal() {
                document.getElementById('claimModal').classList.add('hidden');
                document.getElementById('claimModal').classList.remove('flex');
                document.getElementById('claimForm').reset();
            }

            function showIMEILookup() {
                alert('IMEI Lookup feature coming soon!');
            }

            function showClaimTracker() {
                alert('Claim tracking feature coming soon!');
            }

            function updateWarrantyLinks() {
                const brand = document.getElementById('deviceBrand').value;
                const linksDiv = document.getElementById('warrantyLinks');
                const warrantyLink = document.getElementById('warrantyCheckUrl');
                const activationLink = document.getElementById('activationCheckUrl');
                
                if (brand && warrantyUrls[brand]) {
                    warrantyLink.href = warrantyUrls[brand];
                    linksDiv.classList.remove('hidden');
                    
                    if (activationUrls[brand]) {
                        activationLink.href = activationUrls[brand];
                        activationLink.classList.remove('hidden');
                    } else {
                        activationLink.classList.add('hidden');
                    }
                } else {
                    linksDiv.classList.add('hidden');
                }
            }

            function getCurrentLocation() {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(function(position) {
                        userLocation.lat = position.coords.latitude;
                        userLocation.lng = position.coords.longitude;
                        userLocation.method = 'gps';
                        
                        document.getElementById('manualAddress').value = 
                            'GPS Location: ' + position.coords.latitude.toFixed(6) + ', ' + position.coords.longitude.toFixed(6);
                        
                        alert('Location captured successfully!');
                    }, function(error) {
                        alert('Could not get location. Please enter address manually.');
                    });
                } else {
                    alert('Geolocation is not supported by this browser.');
                }
            }

            // Service type radio button handler
            document.addEventListener('DOMContentLoaded', function() {
                const serviceTypeRadios = document.querySelectorAll('input[name="serviceType"]');
                const addressFields = document.getElementById('addressFields');
                
                serviceTypeRadios.forEach(radio => {
                    radio.addEventListener('change', function() {
                        if (this.value === 'pickup_drop') {
                            addressFields.classList.remove('hidden');
                        } else {
                            addressFields.classList.add('hidden');
                        }
                    });
                });
            });

            // Login form submission
            document.getElementById('loginForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                try {
                    const response = await axios.post('/api/login', {
                        username,
                        password,
                        partnerType: currentUserType
                    });
                    
                    if (response.data.success) {
                        localStorage.setItem('user', JSON.stringify(response.data.user));
                        
                        if (currentUserType === 'samsung') {
                            window.location.href = '/samsung-dashboard';
                        } else if (currentUserType === 'bajaj_allianz') {
                            window.location.href = '/claims-dashboard';
                        } else if (currentUserType === 'dealer') {
                            window.location.href = '/dealer-dashboard';
                        }
                    } else {
                        alert('Login failed: ' + response.data.message);
                    }
                } catch (error) {
                    alert('Login error: ' + (error.response?.data?.message || error.message));
                }
            });

            // Enquiry form submission
            document.getElementById('enquiryForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const formData = {
                    customerName: document.getElementById('customerName').value,
                    customerPhone: document.getElementById('customerPhone').value,
                    customerEmail: document.getElementById('customerEmail').value,
                    deviceIMEI: document.getElementById('deviceIMEI').value,
                    deviceModel: document.getElementById('deviceModel').value,
                    issueCategory: document.getElementById('issueCategory').value,
                    issueDescription: document.getElementById('issueDescription').value,
                    manualAddress: document.getElementById('manualAddress').value,
                    location: userLocation
                };
                
                try {
                    const response = await axios.post('/api/enquiries', formData);
                    
                    if (response.data.success) {
                        alert('Enquiry submitted successfully! Your ticket number is: ' + response.data.ticketNumber);
                        hideEnquiryModal();
                    } else {
                        alert('Submission failed: ' + response.data.message);
                    }
                } catch (error) {
                    alert('Submission error: ' + (error.response?.data?.message || error.message));
                }
            });

            // Claim form submission
            document.getElementById('claimForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const serviceTypeElement = document.querySelector('input[name="serviceType"]:checked');
                if (!serviceTypeElement) {
                    alert('Please select a service type');
                    return;
                }
                
                const formData = {
                    customerName: document.getElementById('claimCustomerName').value,
                    customerPhone: document.getElementById('claimCustomerPhone').value,
                    customerEmail: document.getElementById('claimCustomerEmail').value,
                    deviceBrand: document.getElementById('deviceBrand').value,
                    deviceModel: document.getElementById('claimDeviceModel').value,
                    imei: document.getElementById('claimIMEI').value,
                    policyNumber: document.getElementById('policyNumber').value,
                    claimType: document.getElementById('claimType').value,
                    incidentDate: document.getElementById('incidentDate').value,
                    damageDescription: document.getElementById('damageDescription').value,
                    serviceType: serviceTypeElement.value,
                    pickupAddress: document.getElementById('pickupAddress').value,
                    location: userLocation
                };
                
                try {
                    const response = await axios.post('/api/claims', formData);
                    
                    if (response.data.success) {
                        alert('Insurance claim registered successfully! Your claim number is: ' + response.data.claimNumber);
                        hideClaimModal();
                    } else {
                        alert('Claim registration failed: ' + response.data.message);
                    }
                } catch (error) {
                    alert('Claim submission error: ' + (error.response?.data?.message || error.message));
                }
            });
        </script>
    </body>
    </html>
  `)
})

export default app
