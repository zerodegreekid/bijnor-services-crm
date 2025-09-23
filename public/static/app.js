// Main application JavaScript

// Global state
let sessionId = localStorage.getItem('sessionId');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// API helper function
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
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Show/hide functions
function showLogin() {
    document.getElementById('loginModal').classList.remove('hidden');
    document.getElementById('loginModal').classList.add('flex');
}

function hideLogin() {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('loginModal').classList.remove('flex');
}

function showEnquiryForm() {
    document.getElementById('enquiryModal').classList.remove('hidden');
    document.getElementById('enquiryModal').classList.add('flex');
}

function hideEnquiryForm() {
    document.getElementById('enquiryModal').classList.add('hidden');
    document.getElementById('enquiryModal').classList.remove('flex');
}

function showAccessories() {
    document.getElementById('accessoriesModal').classList.remove('hidden');
    document.getElementById('accessoriesModal').classList.add('flex');
    loadAccessories();
}

function hideAccessories() {
    document.getElementById('accessoriesModal').classList.add('hidden');
    document.getElementById('accessoriesModal').classList.remove('flex');
}

// Login form handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const credentials = {
                username: formData.get('username'),
                password: formData.get('password')
            };

            try {
                const response = await apiCall('/login', {
                    method: 'POST',
                    body: credentials
                });

                if (response.success) {
                    sessionId = response.sessionId;
                    currentUser = response.user;
                    
                    localStorage.setItem('sessionId', sessionId);
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    
                    // Redirect to portal
                    window.location.href = '/portal';
                } else {
                    alert('Login failed: ' + (response.error || 'Unknown error'));
                }
            } catch (error) {
                alert('Login failed: ' + error.message);
            }
        });
    }

    // Enquiry form handler
    const enquiryForm = document.getElementById('enquiryForm');
    if (enquiryForm) {
        enquiryForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const enquiryData = {
                customer_name: formData.get('customer_name'),
                phone_number: formData.get('phone_number'),
                email: formData.get('email'),
                device_model: formData.get('device_model'),
                imei: formData.get('imei'),
                problem_description: formData.get('problem_description'),
                service_type: formData.get('service_type'),
                warranty_status: formData.get('warranty_status'),
                insurance_status: formData.get('insurance_status')
            };

            try {
                const response = await apiCall('/enquiry', {
                    method: 'POST',
                    body: enquiryData
                });

                if (response.success) {
                    alert(`Enquiry submitted successfully! Your ticket number is: ${response.ticket_number}`);
                    hideEnquiryForm();
                    enquiryForm.reset();
                } else {
                    alert('Failed to submit enquiry: ' + (response.error || 'Unknown error'));
                }
            } catch (error) {
                alert('Failed to submit enquiry: ' + error.message);
            }
        });
    }

    // Accessory search handler
    const accessorySearch = document.getElementById('accessorySearch');
    if (accessorySearch) {
        let searchTimeout;
        accessorySearch.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadAccessories(this.value);
            }, 300);
        });
    }
});

// Load accessories
async function loadAccessories(search = '') {
    try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        
        const response = await apiCall(`/accessories?${params}`);
        const accessoriesList = document.getElementById('accessoriesList');
        
        if (response.accessories && response.accessories.length > 0) {
            accessoriesList.innerHTML = response.accessories.map(item => `
                <div class="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <h4 class="font-semibold text-gray-900">${item.part_name}</h4>
                            ${item.part_number ? `<p class="text-sm text-gray-500">Part #: ${item.part_number}</p>` : ''}
                            ${item.compatible_devices ? `<p class="text-sm text-gray-600 mt-1">Compatible: ${item.compatible_devices}</p>` : ''}
                            ${item.category ? `<span class="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mt-2">${item.category}</span>` : ''}
                        </div>
                        <div class="text-right">
                            <p class="text-lg font-bold text-samsung-blue">₹${item.retail_price}</p>
                            <p class="text-sm ${item.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}">
                                ${item.stock_quantity > 0 ? `In Stock (${item.stock_quantity})` : 'Out of Stock'}
                            </p>
                        </div>
                    </div>
                    <div class="mt-3 flex gap-2">
                        <a href="https://wa.me/918006999806?text=I'm interested in ${item.part_name}" 
                           target="_blank" 
                           class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors">
                            <i class="fab fa-whatsapp mr-1"></i>Enquire on WhatsApp
                        </a>
                        <a href="tel:+918006999809" 
                           class="bg-accent-blue text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors">
                            <i class="fas fa-phone mr-1"></i>Call Now
                        </a>
                    </div>
                </div>
            `).join('');
        } else {
            accessoriesList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-search text-4xl mb-4"></i>
                    <p>No accessories found</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load accessories:', error);
        document.getElementById('accessoriesList').innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <p>Failed to load accessories</p>
            </div>
        `;
    }
}

// Close modals when clicking outside
document.addEventListener('click', function(e) {
    const modals = ['loginModal', 'enquiryModal', 'accessoriesModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal && e.target === modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    });
});