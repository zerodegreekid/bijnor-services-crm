// Staff Portal JavaScript

// Global state
let sessionId = localStorage.getItem('sessionId');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
let currentPage = 'dashboard';

// Check authentication on load
document.addEventListener('DOMContentLoaded', function() {
    if (!sessionId || !currentUser) {
        window.location.href = '/';
        return;
    }
    
    initPortal();
});

// API helper function (same as main app)
async function apiCall(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(sessionId && { 'x-session-id': sessionId })
        },
        ...options
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(`/api${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 401) {
                // Session expired
                logout();
                return;
            }
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Initialize portal
async function initPortal() {
    renderLayout();
    showPage('dashboard');
}

// Render main layout
function renderLayout() {
    document.getElementById('portalApp').innerHTML = `
        <div class="min-h-screen bg-bg-gray">
            <!-- Header -->
            <header class="gradient-bg text-white shadow-lg">
                <div class="px-6 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <i class="fas fa-cog text-2xl"></i>
                            <div>
                                <h1 class="text-xl font-semibold">BIJNOR SERVICES</h1>
                                <p class="text-sm text-gray-300">Staff Portal</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4">
                            <span class="text-sm">Welcome, ${currentUser.full_name}</span>
                            <button onclick="logout()" class="bg-white text-samsung-blue px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm">
                                <i class="fas fa-sign-out-alt mr-2"></i>Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div class="flex">
                <!-- Sidebar -->
                <aside class="w-64 bg-white shadow-lg min-h-screen">
                    <nav class="p-4">
                        <ul class="space-y-2">
                            <li>
                                <button onclick="showPage('dashboard')" class="nav-item w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors" data-page="dashboard">
                                    <i class="fas fa-chart-line mr-3"></i>Dashboard
                                </button>
                            </li>
                            <li>
                                <button onclick="showPage('enquiries')" class="nav-item w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors" data-page="enquiries">
                                    <i class="fas fa-ticket-alt mr-3"></i>Enquiries
                                </button>
                            </li>
                            <li>
                                <button onclick="showPage('lookup')" class="nav-item w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors" data-page="lookup">
                                    <i class="fas fa-search mr-3"></i>IMEI/Phone Lookup
                                </button>
                            </li>
                            ${currentUser.role === 'admin' ? `
                            <li>
                                <button onclick="showPage('accessories')" class="nav-item w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors" data-page="accessories">
                                    <i class="fas fa-box mr-3"></i>Accessories
                                </button>
                            </li>
                            ` : ''}
                        </ul>
                    </nav>
                </aside>

                <!-- Main Content -->
                <main class="flex-1 p-6">
                    <div id="pageContent">
                        <!-- Page content will be loaded here -->
                    </div>
                </main>
            </div>
        </div>
    `;
}

// Show specific page
async function showPage(pageName) {
    currentPage = pageName;
    
    // Update active navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('bg-accent-blue', 'text-white');
        item.classList.add('text-gray-700');
    });
    document.querySelector(`[data-page="${pageName}"]`).classList.add('bg-accent-blue', 'text-white');
    document.querySelector(`[data-page="${pageName}"]`).classList.remove('text-gray-700');

    const pageContent = document.getElementById('pageContent');
    
    switch(pageName) {
        case 'dashboard':
            await renderDashboard(pageContent);
            break;
        case 'enquiries':
            await renderEnquiries(pageContent);
            break;
        case 'lookup':
            renderLookup(pageContent);
            break;
        case 'accessories':
            await renderAccessories(pageContent);
            break;
    }
}

// Dashboard page
async function renderDashboard(container) {
    try {
        const stats = await apiCall('/dashboard');
        
        container.innerHTML = `
            <div>
                <h2 class="text-2xl font-bold text-samsung-blue mb-6">Dashboard</h2>
                
                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div class="bg-white p-6 rounded-xl shadow-sm">
                        <div class="flex items-center">
                            <div class="bg-red-100 p-3 rounded-full">
                                <i class="fas fa-exclamation-circle text-red-600 text-xl"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm text-gray-600">Open Enquiries</p>
                                <p class="text-2xl font-bold text-samsung-blue">${stats.open_enquiries}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-xl shadow-sm">
                        <div class="flex items-center">
                            <div class="bg-blue-100 p-3 rounded-full">
                                <i class="fas fa-cog text-blue-600 text-xl"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm text-gray-600">In Progress</p>
                                <p class="text-2xl font-bold text-samsung-blue">${stats.in_progress_enquiries}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-xl shadow-sm">
                        <div class="flex items-center">
                            <div class="bg-green-100 p-3 rounded-full">
                                <i class="fas fa-check-circle text-green-600 text-xl"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm text-gray-600">Completed Today</p>
                                <p class="text-2xl font-bold text-samsung-blue">${stats.completed_today}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-xl shadow-sm">
                        <div class="flex items-center">
                            <div class="bg-yellow-100 p-3 rounded-full">
                                <i class="fas fa-box text-yellow-600 text-xl"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm text-gray-600">Low Stock Items</p>
                                <p class="text-2xl font-bold text-samsung-blue">${stats.low_stock_items}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="bg-white rounded-xl shadow-sm p-6">
                    <h3 class="text-lg font-semibold text-samsung-blue mb-4">Quick Actions</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button onclick="showPage('enquiries')" class="bg-accent-blue text-white p-4 rounded-lg hover:bg-blue-600 transition-colors">
                            <i class="fas fa-plus mr-2"></i>View All Enquiries
                        </button>
                        <button onclick="showPage('lookup')" class="bg-gray-700 text-white p-4 rounded-lg hover:bg-gray-800 transition-colors">
                            <i class="fas fa-search mr-2"></i>Search IMEI/Phone
                        </button>
                        ${currentUser.role === 'admin' ? `
                        <button onclick="showPage('accessories')" class="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors">
                            <i class="fas fa-box mr-2"></i>Manage Accessories
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                Failed to load dashboard: ${error.message}
            </div>
        `;
    }
}

// Enquiries page
async function renderEnquiries(container) {
    try {
        const enquiries = await apiCall('/enquiries');
        
        container.innerHTML = `
            <div>
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-samsung-blue">Enquiries</h2>
                    <select id="statusFilter" onchange="filterEnquiries()" class="px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="all">All Status</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="waiting_parts">Waiting Parts</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div id="enquiriesList">
                        ${renderEnquiriesList(enquiries.enquiries)}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                Failed to load enquiries: ${error.message}
            </div>
        `;
    }
}

function renderEnquiriesList(enquiries) {
    if (!enquiries || enquiries.length === 0) {
        return `
            <div class="p-8 text-center text-gray-500">
                <i class="fas fa-inbox text-4xl mb-4"></i>
                <p>No enquiries found</p>
            </div>
        `;
    }

    return `
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Problem</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${enquiries.map(enquiry => `
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 text-sm font-medium text-samsung-blue">${enquiry.ticket_number}</td>
                            <td class="px-6 py-4 text-sm text-gray-900">
                                <div>
                                    <p class="font-medium">${enquiry.customer_name || 'N/A'}</p>
                                    <p class="text-gray-500">${enquiry.phone_number || ''}</p>
                                </div>
                            </td>
                            <td class="px-6 py-4 text-sm text-gray-900">
                                <div>
                                    <p>${enquiry.device_model}</p>
                                    ${enquiry.imei ? `<p class="text-xs text-gray-500">IMEI: ${enquiry.imei}</p>` : ''}
                                </div>
                            </td>
                            <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">${enquiry.problem_description}</td>
                            <td class="px-6 py-4 text-sm">
                                <span class="px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(enquiry.status)}">
                                    ${enquiry.status.replace('_', ' ').toUpperCase()}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-sm text-gray-500">
                                ${new Date(enquiry.created_at).toLocaleDateString()}
                            </td>
                            <td class="px-6 py-4 text-sm">
                                <button onclick="viewEnquiry(${enquiry.id})" class="text-accent-blue hover:text-blue-600 mr-2">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button onclick="editEnquiry(${enquiry.id})" class="text-gray-600 hover:text-gray-800">
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

function getStatusColor(status) {
    const colors = {
        open: 'bg-red-100 text-red-800',
        in_progress: 'bg-blue-100 text-blue-800',
        waiting_parts: 'bg-yellow-100 text-yellow-800',
        completed: 'bg-green-100 text-green-800',
        cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

// Lookup page
function renderLookup(container) {
    container.innerHTML = `
        <div>
            <h2 class="text-2xl font-bold text-samsung-blue mb-6">IMEI / Phone Number Lookup</h2>
            
            <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">IMEI Number</label>
                        <input type="text" id="imeiLookup" placeholder="Enter 15-digit IMEI" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                        <input type="text" id="phoneLookup" placeholder="Enter phone number" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue">
                    </div>
                </div>
                <button onclick="performLookup()" class="bg-accent-blue text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                    <i class="fas fa-search mr-2"></i>Search
                </button>
            </div>
            
            <div id="lookupResults">
                <!-- Results will appear here -->
            </div>
        </div>
    `;
}

async function performLookup() {
    const imei = document.getElementById('imeiLookup').value.trim();
    const phone = document.getElementById('phoneLookup').value.trim();
    
    if (!imei && !phone) {
        alert('Please enter either IMEI or phone number');
        return;
    }

    try {
        const params = new URLSearchParams();
        if (imei) params.append('imei', imei);
        if (phone) params.append('phone', phone);
        
        const response = await apiCall(`/lookup?${params}`);
        
        const resultsContainer = document.getElementById('lookupResults');
        if (response.results && response.results.length > 0) {
            resultsContainer.innerHTML = `
                <div class="bg-white rounded-xl shadow-sm p-6">
                    <h3 class="text-lg font-semibold text-samsung-blue mb-4">Search Results (${response.results.length} found)</h3>
                    <div class="space-y-4">
                        ${response.results.map(result => `
                            <div class="border border-gray-200 rounded-lg p-4">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <h4 class="font-medium text-samsung-blue">${result.ticket_number}</h4>
                                        <p class="text-sm text-gray-600">Customer: ${result.customer_name || 'N/A'} (${result.phone_number})</p>
                                        <p class="text-sm text-gray-600">Device: ${result.device_model}</p>
                                        ${result.imei ? `<p class="text-sm text-gray-600">IMEI: ${result.imei}</p>` : ''}
                                        <p class="text-sm text-gray-700 mt-2">${result.problem_description}</p>
                                    </div>
                                    <div class="text-right">
                                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(result.status)}">
                                            ${result.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                        <p class="text-sm text-gray-500 mt-1">${new Date(result.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div class="mt-3 flex gap-2">
                                    <button onclick="viewEnquiry(${result.id})" class="bg-accent-blue text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
                                        View Details
                                    </button>
                                    <button onclick="editEnquiry(${result.id})" class="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700">
                                        Edit
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            resultsContainer.innerHTML = `
                <div class="bg-white rounded-xl shadow-sm p-6 text-center">
                    <i class="fas fa-search text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-600">No enquiries found for the given IMEI or phone number</p>
                </div>
            `;
        }
    } catch (error) {
        document.getElementById('lookupResults').innerHTML = `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                Search failed: ${error.message}
            </div>
        `;
    }
}

// Accessories page (admin only)
async function renderAccessories(container) {
    if (currentUser.role !== 'admin') {
        container.innerHTML = `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                Access denied. Admin privileges required.
            </div>
        `;
        return;
    }

    try {
        const accessories = await apiCall('/accessories');
        
        container.innerHTML = `
            <div>
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-samsung-blue">Accessories Management</h2>
                    <button onclick="addAccessory()" class="bg-accent-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                        <i class="fas fa-plus mr-2"></i>Add New
                    </button>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                    ${renderAccessoriesList(accessories.accessories)}
                </div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                Failed to load accessories: ${error.message}
            </div>
        `;
    }
}

function renderAccessoriesList(accessories) {
    if (!accessories || accessories.length === 0) {
        return `
            <div class="p-8 text-center text-gray-500">
                <i class="fas fa-box text-4xl mb-4"></i>
                <p>No accessories found</p>
            </div>
        `;
    }

    return `
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part Name</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part Number</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${accessories.map(accessory => `
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 text-sm font-medium text-gray-900">${accessory.part_name}</td>
                            <td class="px-6 py-4 text-sm text-gray-500">${accessory.part_number || 'N/A'}</td>
                            <td class="px-6 py-4 text-sm text-gray-500">${accessory.category || 'N/A'}</td>
                            <td class="px-6 py-4 text-sm text-gray-900">₹${accessory.retail_price}</td>
                            <td class="px-6 py-4 text-sm">
                                <span class="px-2 py-1 text-xs font-semibold rounded-full ${accessory.stock_quantity <= accessory.low_stock_threshold ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                                    ${accessory.stock_quantity}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-sm">
                                <button onclick="editAccessory(${accessory.id})" class="text-accent-blue hover:text-blue-600 mr-2">
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

// Utility functions
async function filterEnquiries() {
    const status = document.getElementById('statusFilter').value;
    try {
        const enquiries = await apiCall(`/enquiries?status=${status}`);
        document.getElementById('enquiriesList').innerHTML = renderEnquiriesList(enquiries.enquiries);
    } catch (error) {
        console.error('Failed to filter enquiries:', error);
    }
}

function viewEnquiry(id) {
    // Implementation for viewing enquiry details
    alert(`View enquiry ${id} - Feature to be implemented`);
}

function editEnquiry(id) {
    // Implementation for editing enquiry
    alert(`Edit enquiry ${id} - Feature to be implemented`);
}

function addAccessory() {
    // Implementation for adding new accessory
    alert('Add accessory - Feature to be implemented');
}

function editAccessory(id) {
    // Implementation for editing accessory
    alert(`Edit accessory ${id} - Feature to be implemented`);
}

async function logout() {
    try {
        await apiCall('/logout', { method: 'POST' });
    } catch (error) {
        console.error('Logout failed:', error);
    }
    
    localStorage.removeItem('sessionId');
    localStorage.removeItem('currentUser');
    window.location.href = '/';
}