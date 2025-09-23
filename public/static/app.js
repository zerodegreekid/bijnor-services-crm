// Global state
let isModalOpen = false;
let accessories = [];

// Utility functions
function closeModal() {
    const modal = document.getElementById('modalOverlay');
    modal.classList.add('hidden');
    isModalOpen = false;
}

function showModal(content) {
    const modal = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    modalContent.innerHTML = content;
    modal.classList.remove('hidden');
    isModalOpen = true;
}

// Show enquiry form
function showEnquiryForm() {
    const form = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold samsung-blue">Submit Service Enquiry</h3>
                <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <form id="enquiryForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                    <input type="text" name="customer_name" required 
                           class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                           placeholder="Enter your full name">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input type="tel" name="phone_number" required pattern="[0-9]{10}"
                           class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                           placeholder="Enter 10-digit mobile number">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                    <input type="email" name="email"
                           class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                           placeholder="Enter your email address">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Device Model *</label>
                    <select name="device_model" required
                            class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Select your Samsung device</option>
                        <option value="Galaxy S24 Ultra">Galaxy S24 Ultra</option>
                        <option value="Galaxy S24+">Galaxy S24+</option>
                        <option value="Galaxy S24">Galaxy S24</option>
                        <option value="Galaxy S23 Ultra">Galaxy S23 Ultra</option>
                        <option value="Galaxy S23+">Galaxy S23+</option>
                        <option value="Galaxy S23">Galaxy S23</option>
                        <option value="Galaxy A55">Galaxy A55</option>
                        <option value="Galaxy A54">Galaxy A54</option>
                        <option value="Galaxy A35">Galaxy A35</option>
                        <option value="Galaxy A34">Galaxy A34</option>
                        <option value="Galaxy A25">Galaxy A25</option>
                        <option value="Galaxy A15">Galaxy A15</option>
                        <option value="Other">Other Samsung Device</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">IMEI Number (Optional)</label>
                    <input type="text" name="imei" pattern="[0-9]{15}"
                           class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                           placeholder="15-digit IMEI number (dial *#06#)">
                    <p class="text-xs text-gray-500 mt-1">Find IMEI: Settings → About Phone or dial *#06#</p>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Problem Description *</label>
                    <textarea name="problem_description" required rows="3"
                              class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Describe the issue with your device"></textarea>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Service Type *</label>
                    <select name="service_type" required
                            class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Select service type</option>
                        <option value="repair">Device Repair</option>
                        <option value="claim">Insurance Claim (Bajaj Allianz)</option>
                        <option value="enquiry">General Enquiry</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Warranty Status</label>
                    <select name="warranty_status"
                            class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="unknown">Not Sure</option>
                        <option value="in_warranty">In Warranty</option>
                        <option value="out_of_warranty">Out of Warranty</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Insurance Status</label>
                    <select name="insurance_status"
                            class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="none">No Insurance</option>
                        <option value="bajaj_allianz">Bajaj Allianz</option>
                        <option value="other">Other Insurance</option>
                    </select>
                </div>
                
                <div class="pt-4 border-t">
                    <button type="submit" 
                            class="w-full samsung-bg-blue text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
                        <i class="fas fa-paper-plane mr-2"></i>Submit Enquiry
                    </button>
                </div>
            </form>
        </div>
    `;
    
    showModal(form);
    
    // Add form submit handler
    setTimeout(() => {
        document.getElementById('enquiryForm').addEventListener('submit', submitEnquiry);
    }, 100);
}

// Submit enquiry
async function submitEnquiry(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...';
    submitButton.disabled = true;
    
    try {
        const response = await axios.post('/api/enquiry', data);
        
        if (response.data.success) {
            showModal(`
                <div class="p-6 text-center">
                    <i class="fas fa-check-circle text-5xl text-green-500 mb-4"></i>
                    <h3 class="text-xl font-bold text-green-600 mb-2">Enquiry Submitted Successfully!</h3>
                    <p class="text-gray-600 mb-4">Your ticket number is:</p>
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <span class="text-xl font-bold samsung-accent">${response.data.ticket_number}</span>
                    </div>
                    <p class="text-sm text-gray-500 mb-6">Please save this ticket number for future reference. Our team will contact you soon.</p>
                    <div class="space-y-2">
                        <a href="https://wa.me/918006999806" target="_blank" 
                           class="block bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition">
                            <i class="fab fa-whatsapp mr-2"></i>Contact via WhatsApp
                        </a>
                        <button onclick="closeModal()" 
                                class="block w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition">
                            Close
                        </button>
                    </div>
                </div>
            `);
        } else {
            throw new Error(response.data.message || 'Failed to submit enquiry');
        }
    } catch (error) {
        console.error('Error submitting enquiry:', error);
        alert('Error submitting enquiry. Please try again or contact us directly.');
    } finally {
        submitButton.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Submit Enquiry';
        submitButton.disabled = false;
    }
}

// Show staff login
function showStaffLogin() {
    const loginForm = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold samsung-blue">Staff Login</h3>
                <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-xl"></i>
                </button>
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
                <p class="text-xs text-gray-500">Demo credentials: admin / admin123</p>
            </div>
        </div>
    `;
    
    showModal(loginForm);
    
    // Add form submit handler
    setTimeout(() => {
        document.getElementById('loginForm').addEventListener('submit', handleStaffLogin);
    }, 100);
}

// Handle staff login
async function handleStaffLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Logging in...';
    submitButton.disabled = true;
    
    try {
        const response = await axios.post('/api/login', data);
        
        if (response.data.success) {
            // Store session
            localStorage.setItem('session_id', response.data.session_id);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            // Redirect to portal
            window.location.href = '/portal';
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

// Show accessories
async function showAccessories() {
    try {
        const response = await axios.get('/api/accessories');
        
        if (response.data.success) {
            accessories = response.data.accessories;
            displayAccessoriesModal();
        }
    } catch (error) {
        console.error('Error fetching accessories:', error);
        alert('Error loading accessories. Please try again later.');
    }
}

function displayAccessoriesModal() {
    const content = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold samsung-blue">Samsung Accessories & Parts</h3>
                <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <div class="mb-4">
                <input type="text" id="accessorySearch" placeholder="Search accessories, parts, or device model..."
                       class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                       oninput="filterAccessories()">
            </div>
            
            <div id="accessoriesList" class="space-y-3 max-h-96 overflow-y-auto">
                ${renderAccessories(accessories)}
            </div>
            
            <div class="mt-4 pt-4 border-t text-center">
                <p class="text-sm text-gray-600">For orders, contact us via WhatsApp or visit our service center</p>
                <a href="https://wa.me/918006999806" target="_blank" 
                   class="inline-block mt-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition">
                    <i class="fab fa-whatsapp mr-2"></i>Order via WhatsApp
                </a>
            </div>
        </div>
    `;
    
    showModal(content);
}

function renderAccessories(accessoriesList) {
    if (accessoriesList.length === 0) {
        return '<div class="text-center py-8 text-gray-500">No accessories found</div>';
    }
    
    return accessoriesList.map(accessory => `
        <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h4 class="font-semibold samsung-blue">${accessory.part_name}</h4>
                    ${accessory.part_number ? `<p class="text-sm text-gray-500">Part #: ${accessory.part_number}</p>` : ''}
                    ${accessory.compatible_devices ? `<p class="text-sm text-gray-600 mt-1">Compatible: ${accessory.compatible_devices}</p>` : ''}
                    <div class="flex items-center mt-2 space-x-4">
                        <span class="text-lg font-bold samsung-accent">₹${accessory.retail_price}</span>
                        <span class="text-sm ${accessory.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}">
                            ${accessory.stock_quantity > 0 ? `${accessory.stock_quantity} in stock` : 'Out of stock'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function filterAccessories() {
    const search = document.getElementById('accessorySearch').value.toLowerCase();
    const filtered = accessories.filter(accessory => 
        accessory.part_name.toLowerCase().includes(search) ||
        (accessory.part_number && accessory.part_number.toLowerCase().includes(search)) ||
        (accessory.compatible_devices && accessory.compatible_devices.toLowerCase().includes(search))
    );
    
    document.getElementById('accessoriesList').innerHTML = renderAccessories(filtered);
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay' && isModalOpen) {
        closeModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isModalOpen) {
        closeModal();
    }
});

console.log('Bijnor Services CRM loaded successfully!');