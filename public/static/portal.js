// Global state
let currentUser = null;
let enquiries = [];
let currentEnquiry = null;

// Check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

function checkAuth() {
    const sessionId = localStorage.getItem('session_id');
    const user = localStorage.getItem('user');
    
    if (!sessionId || !user) {
        showLoginForm();
        return;
    }
    
    try {
        currentUser = JSON.parse(user);
        showDashboard();
    } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.clear();
        showLoginForm();
    }
}

function logout() {
    localStorage.clear();
    currentUser = null;
    showLoginForm();
}

function showLoginForm() {
    document.getElementById('app').innerHTML = `
        <div class="min-h-screen flex items-center justify-center bg-gray-100">
            <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
                <div class="text-center mb-6">
                    <i class="fas fa-cog text-4xl samsung-accent mb-3"></i>
                    <h2 class="text-2xl font-bold samsung-blue">Bijnor Services Portal</h2>
                    <p class="text-gray-600">Staff & Admin Access</p>
                </div>
                
                <form id="loginForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input type="text" name="username" required 
                               class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                               placeholder="Enter username">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input type="password" name="password" required
                               class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                               placeholder="Enter password">
                    </div>
                    
                    <button type="submit" 
                            class="w-full samsung-bg-blue text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
                        <i class="fas fa-sign-in-alt mr-2"></i>Login
                    </button>
                </form>
                
                <div class="mt-4 pt-4 border-t text-center">
                    <p class="text-xs text-gray-500 mb-2">Demo credentials:</p>
                    <p class="text-xs text-gray-500">Admin: admin / admin123</p>
                    <p class="text-xs text-gray-500">Staff: staff1 / admin123</p>
                    <a href="/" class="text-sm samsung-accent hover:underline mt-2 inline-block">← Back to Home</a>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Logging in...';
    submitButton.disabled = true;
    
    try {
        const response = await axios.post('/api/login', data);
        
        if (response.data.success) {
            localStorage.setItem('session_id', response.data.session_id);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            currentUser = response.data.user;
            showDashboard();
        } else {
            throw new Error(response.data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
        submitButton.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Login';
        submitButton.disabled = false;
    }
}

function showDashboard() {
    document.getElementById('app').innerHTML = `
        <div class="min-h-screen bg-gray-100">
            <!-- Header -->
            <header class="samsung-bg-blue text-white shadow-lg">
                <div class="max-w-7xl mx-auto px-4 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <i class="fas fa-cog text-2xl"></i>
                            <div>
                                <h1 class="text-xl font-bold">Bijnor Services Portal</h1>
                                <p class="text-blue-100 text-sm">Welcome, ${currentUser.full_name}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4">
                            <span class="text-sm bg-blue-800 px-2 py-1 rounded">${currentUser.role}</span>
                            <button onclick="logout()" class="text-blue-200 hover:text-white">
                                <i class="fas fa-sign-out-alt"></i> Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Navigation -->
            <nav class="bg-white shadow-sm border-b">
                <div class="max-w-7xl mx-auto px-4">
                    <div class="flex space-x-8">
                        <button onclick="showEnquiriesTab()" 
                                class="tab-btn py-3 px-2 border-b-2 border-blue-500 text-blue-600 font-medium" 
                                id="enquiriesTab">
                            <i class="fas fa-ticket-alt mr-2"></i>Enquiries
                        </button>
                        <button onclick="showLookupTab()" 
                                class="tab-btn py-3 px-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700" 
                                id="lookupTab">
                            <i class="fas fa-search mr-2"></i>IMEI/Phone Lookup
                        </button>
                        <button onclick="showAccessoriesTab()" 
                                class="tab-btn py-3 px-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700" 
                                id="accessoriesTab">
                            <i class="fas fa-boxes mr-2"></i>Accessories
                        </button>
                    </div>
                </div>
            </nav>

            <!-- Main Content -->
            <main class="max-w-7xl mx-auto px-4 py-6">
                <div id="tabContent">
                    <!-- Tab content will be loaded here -->
                </div>
            </main>
        </div>
    `;
    
    // Load initial tab
    showEnquiriesTab();
}

function setActiveTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.className = 'tab-btn py-3 px-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700';
    });
    document.getElementById(tabId).className = 'tab-btn py-3 px-2 border-b-2 border-blue-500 text-blue-600 font-medium';
}

async function showEnquiriesTab() {
    setActiveTab('enquiriesTab');
    
    document.getElementById('tabContent').innerHTML = `
        <div>
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold samsung-blue">Service Enquiries</h2>
                <div class="flex space-x-2">
                    <select id="statusFilter" class="border border-gray-300 rounded-lg px-3 py-2" onchange="loadEnquiries()">
                        <option value="">All Status</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="waiting_parts">Waiting Parts</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <button onclick="loadEnquiries()" class="samsung-bg-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-sync mr-2"></i>Refresh
                    </button>
                </div>
            </div>
            
            <div id="enquiriesList" class="bg-white rounded-lg shadow">
                <div class="p-4 text-center">
                    <i class="fas fa-spinner fa-spin text-xl samsung-accent"></i>
                    <p class="mt-2 text-gray-600">Loading enquiries...</p>
                </div>
            </div>
        </div>
    `;
    
    await loadEnquiries();
}

async function loadEnquiries() {
    const status = document.getElementById('statusFilter').value;
    
    try {
        const response = await axios.get('/api/enquiries' + (status ? `?status=${status}` : ''));
        
        if (response.data.success) {
            enquiries = response.data.enquiries;
            displayEnquiries();
        }
    } catch (error) {
        console.error('Error loading enquiries:', error);
        document.getElementById('enquiriesList').innerHTML = `
            <div class="p-4 text-center text-red-600">
                <i class="fas fa-exclamation-triangle text-xl"></i>
                <p class="mt-2">Error loading enquiries</p>
            </div>
        `;
    }
}

function displayEnquiries() {
    const listElement = document.getElementById('enquiriesList');
    
    if (enquiries.length === 0) {
        listElement.innerHTML = `
            <div class="p-8 text-center">
                <i class="fas fa-inbox text-4xl text-gray-400 mb-4"></i>
                <p class="text-gray-600">No enquiries found</p>
            </div>
        `;
        return;
    }
    
    listElement.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Ticket</th>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Customer</th>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Device</th>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Problem</th>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Created</th>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${enquiries.map(enquiry => `
                        <tr class="hover:bg-gray-50">
                            <td class="px-4 py-3">
                                <span class="font-mono text-sm font-medium">${enquiry.ticket_number}</span>
                            </td>
                            <td class="px-4 py-3">
                                <div>
                                    <div class="font-medium">${enquiry.customer_name || 'N/A'}</div>
                                    <div class="text-sm text-gray-600">${enquiry.phone_number}</div>
                                </div>
                            </td>
                            <td class="px-4 py-3">
                                <div>
                                    <div class="font-medium">${enquiry.device_model}</div>
                                    ${enquiry.imei ? `<div class="text-xs text-gray-500">IMEI: ${enquiry.imei}</div>` : ''}
                                </div>
                            </td>
                            <td class="px-4 py-3">
                                <div class="max-w-xs truncate" title="${enquiry.problem_description}">
                                    ${enquiry.problem_description}
                                </div>
                            </td>
                            <td class="px-4 py-3">
                                <span class="status-badge status-${enquiry.status}">${formatStatus(enquiry.status)}</span>
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-600">
                                ${formatDate(enquiry.created_at)}
                            </td>
                            <td class="px-4 py-3">
                                <button onclick="viewEnquiry(${enquiry.id})" 
                                        class="text-blue-600 hover:text-blue-800 mr-2">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button onclick="updateStatus(${enquiry.id})" 
                                        class="text-green-600 hover:text-green-800">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function showLookupTab() {
    setActiveTab('lookupTab');
    
    document.getElementById('tabContent').innerHTML = `
        <div>
            <div class="mb-6">
                <h2 class="text-2xl font-bold samsung-blue mb-4">IMEI & Phone Number Lookup</h2>
                <p class="text-gray-600">Search customer history by IMEI number or phone number</p>
            </div>
            
            <div class="bg-white rounded-lg shadow p-6 mb-6">
                <div class="grid md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Search by IMEI</label>
                        <div class="flex">
                            <input type="text" id="imeiSearch" placeholder="Enter 15-digit IMEI number"
                                   class="flex-1 p-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <button onclick="searchByIMEI()" 
                                    class="samsung-bg-blue text-white px-4 py-3 rounded-r-lg hover:bg-blue-700">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Search by Phone Number</label>
                        <div class="flex">
                            <input type="text" id="phoneSearch" placeholder="Enter 10-digit phone number"
                                   class="flex-1 p-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <button onclick="searchByPhone()" 
                                    class="samsung-bg-blue text-white px-4 py-3 rounded-r-lg hover:bg-blue-700">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="lookupResults" class="bg-white rounded-lg shadow p-6">
                <div class="text-center text-gray-500">
                    <i class="fas fa-search text-4xl mb-4"></i>
                    <p>Enter IMEI or phone number to search customer history</p>
                </div>
            </div>
        </div>
    `;
}

async function searchByIMEI() {
    const imei = document.getElementById('imeiSearch').value.trim();
    if (!imei) {
        alert('Please enter an IMEI number');
        return;
    }
    
    await performLookup('imei', imei);
}

async function searchByPhone() {
    const phone = document.getElementById('phoneSearch').value.trim();
    if (!phone) {
        alert('Please enter a phone number');
        return;
    }
    
    await performLookup('phone', phone);
}

async function performLookup(type, value) {
    const resultsElement = document.getElementById('lookupResults');
    
    resultsElement.innerHTML = `
        <div class="text-center">
            <i class="fas fa-spinner fa-spin text-xl samsung-accent"></i>
            <p class="mt-2 text-gray-600">Searching...</p>
        </div>
    `;
    
    try {
        const response = await axios.get(`/api/lookup/${type}/${value}`);
        
        if (response.data.success) {
            displayLookupResults(response.data.enquiries, type, value);
        }
    } catch (error) {
        console.error('Lookup error:', error);
        resultsElement.innerHTML = `
            <div class="text-center text-red-600">
                <i class="fas fa-exclamation-triangle text-xl"></i>
                <p class="mt-2">Error performing lookup</p>
            </div>
        `;
    }
}

function displayLookupResults(results, type, value) {
    const resultsElement = document.getElementById('lookupResults');
    
    if (results.length === 0) {
        resultsElement.innerHTML = `
            <div class="text-center text-gray-500">
                <i class="fas fa-inbox text-4xl mb-4"></i>
                <p>No records found for ${type}: ${value}</p>
            </div>
        `;
        return;
    }
    
    resultsElement.innerHTML = `
        <div>
            <div class="mb-4">
                <h3 class="text-lg font-bold samsung-blue">Search Results for ${type.toUpperCase()}: ${value}</h3>
                <p class="text-gray-600">${results.length} record(s) found</p>
            </div>
            
            <div class="space-y-4">
                ${results.map(enquiry => `
                    <div class="border border-gray-200 rounded-lg p-4">
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <h4 class="font-bold samsung-blue">${enquiry.ticket_number}</h4>
                                <p class="text-sm text-gray-600">Created: ${formatDate(enquiry.created_at)}</p>
                            </div>
                            <span class="status-badge status-${enquiry.status}">${formatStatus(enquiry.status)}</span>
                        </div>
                        
                        <div class="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <strong>Customer:</strong> ${enquiry.customer_name || 'N/A'}<br>
                                <strong>Phone:</strong> ${enquiry.phone_number}<br>
                                <strong>Device:</strong> ${enquiry.device_model}
                                ${enquiry.imei ? `<br><strong>IMEI:</strong> ${enquiry.imei}` : ''}
                            </div>
                            <div>
                                <strong>Service Type:</strong> ${enquiry.service_type}<br>
                                <strong>Problem:</strong> ${enquiry.problem_description.substring(0, 100)}${enquiry.problem_description.length > 100 ? '...' : ''}
                            </div>
                        </div>
                        
                        <div class="mt-3 flex space-x-2">
                            <button onclick="viewEnquiry(${enquiry.id})" 
                                    class="text-blue-600 hover:text-blue-800 text-sm">
                                <i class="fas fa-eye mr-1"></i>View Details
                            </button>
                            <button onclick="updateStatus(${enquiry.id})" 
                                    class="text-green-600 hover:text-green-800 text-sm">
                                <i class="fas fa-edit mr-1"></i>Update Status
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function showAccessoriesTab() {
    setActiveTab('accessoriesTab');
    
    document.getElementById('tabContent').innerHTML = `
        <div>
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold samsung-blue">Accessories & Parts Inventory</h2>
                ${currentUser.role === 'admin' ? `
                <button class="samsung-bg-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    <i class="fas fa-upload mr-2"></i>Upload Excel
                </button>
                ` : ''}
            </div>
            
            <div class="bg-white rounded-lg shadow p-6">
                <div class="mb-4">
                    <input type="text" id="accessorySearchPortal" placeholder="Search accessories..."
                           class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                           oninput="filterPortalAccessories()">
                </div>
                
                <div id="portalAccessoriesList">
                    <div class="text-center">
                        <i class="fas fa-spinner fa-spin text-xl samsung-accent"></i>
                        <p class="mt-2 text-gray-600">Loading accessories...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    loadPortalAccessories();
}

async function loadPortalAccessories() {
    try {
        const response = await axios.get('/api/accessories');
        
        if (response.data.success) {
            window.portalAccessories = response.data.accessories;
            displayPortalAccessories(window.portalAccessories);
        }
    } catch (error) {
        console.error('Error loading accessories:', error);
        document.getElementById('portalAccessoriesList').innerHTML = `
            <div class="text-center text-red-600">
                <i class="fas fa-exclamation-triangle text-xl"></i>
                <p class="mt-2">Error loading accessories</p>
            </div>
        `;
    }
}

function displayPortalAccessories(accessories) {
    const listElement = document.getElementById('portalAccessoriesList');
    
    if (accessories.length === 0) {
        listElement.innerHTML = `
            <div class="text-center text-gray-500">
                <i class="fas fa-box-open text-4xl mb-4"></i>
                <p>No accessories found</p>
            </div>
        `;
        return;
    }
    
    listElement.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Part Name</th>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Part Number</th>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Compatible Devices</th>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Price</th>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Stock</th>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${accessories.map(accessory => `
                        <tr class="hover:bg-gray-50">
                            <td class="px-4 py-3 font-medium">${accessory.part_name}</td>
                            <td class="px-4 py-3 font-mono text-sm">${accessory.part_number || 'N/A'}</td>
                            <td class="px-4 py-3 text-sm">${accessory.compatible_devices || 'N/A'}</td>
                            <td class="px-4 py-3">₹${accessory.retail_price}</td>
                            <td class="px-4 py-3">
                                <span class="${accessory.stock_quantity <= accessory.low_stock_threshold ? 'text-red-600 font-bold' : 'text-green-600'}">
                                    ${accessory.stock_quantity}
                                </span>
                            </td>
                            <td class="px-4 py-3">
                                <span class="${accessory.is_active ? 'text-green-600' : 'text-red-600'}">
                                    ${accessory.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function filterPortalAccessories() {
    const search = document.getElementById('accessorySearchPortal').value.toLowerCase();
    const filtered = window.portalAccessories.filter(accessory => 
        accessory.part_name.toLowerCase().includes(search) ||
        (accessory.part_number && accessory.part_number.toLowerCase().includes(search)) ||
        (accessory.compatible_devices && accessory.compatible_devices.toLowerCase().includes(search))
    );
    
    displayPortalAccessories(filtered);
}

// Utility functions
function formatStatus(status) {
    const statusMap = {
        'open': 'Open',
        'in_progress': 'In Progress',
        'waiting_parts': 'Waiting Parts',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Add CSS for status badges
const style = document.createElement('style');
style.textContent = `
    .status-badge {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 500;
    }
    .status-open { background-color: #fef3c7; color: #92400e; }
    .status-in_progress { background-color: #dbeafe; color: #1d4ed8; }
    .status-waiting_parts { background-color: #fed7d7; color: #c53030; }
    .status-completed { background-color: #d1fae5; color: #065f46; }
    .status-cancelled { background-color: #f3f4f6; color: #374151; }
    
    .samsung-blue { color: #1f2937; }
    .samsung-bg-blue { background-color: #1565c0; }
    .samsung-accent { color: #2563eb; }
`;
document.head.appendChild(style);

console.log('Staff Portal loaded successfully!');