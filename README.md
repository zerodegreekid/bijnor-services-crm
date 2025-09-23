# Bijnor Services - Samsung Service Center CRM

## Project Overview
- **Name**: Bijnor Services CRM Web Application
- **Goal**: Complete online portal and CRM system for Bijnor Services - Authorized Samsung Service Center in Bijnor, UP
- **Features**: Customer enquiry management, staff portal, IMEI/phone lookup, accessories inventory, and Bajaj Allianz insurance claim processing

## 🌐 Live URLs
- **Production**: https://3000-iscicgtlzklqk4hip4oxc-6532622b.e2b.dev
- **Staff Portal**: https://3000-iscicgtlzklqk4hip4oxc-6532622b.e2b.dev/portal
- **API Base**: https://3000-iscicgtlzklqk4hip4oxc-6532622b.e2b.dev/api

## 🏢 Business Information
- **Service Center ID**: 236981
- **Address**: 1st Floor, Sky Tower, Sheel Kunj, Civil Line II, Opposite PWD Guest House, Bijnor - 246701, UP
- **Phone**: +91 80069 99809
- **WhatsApp**: https://wa.me/918006999806
- **Facebook**: https://www.facebook.com/bijnorservices
- **Website**: http://www.bijnorservices.in/
- **Business Hours**: Monday-Saturday 10:00 AM - 8:00 PM, Sunday Closed

## 📊 Data Architecture

### **Database Schema (D1 SQLite)**
- **Users**: Staff/admin authentication and role management
- **Customers**: Customer contact information and history
- **Enquiries**: Service tickets with full lifecycle tracking
- **Accessories**: Parts inventory with pricing and stock management
- **Communications**: Customer interaction logs (calls, WhatsApp, visits)
- **Status History**: Audit trail for enquiry status changes
- **Audit Logs**: System-wide change tracking
- **Sessions**: User session management

### **Storage Services**
- **Cloudflare D1**: Primary database for all structured data
- **Local SQLite**: Development environment with `--local` flag
- **Static Assets**: Served via Cloudflare Pages from `public/static/`

### **Data Models**
- **Enquiry Lifecycle**: Open → In Progress → Waiting Parts → Completed/Cancelled
- **User Roles**: Admin (full access), Staff (limited access)
- **Service Types**: Repair, Claim (Bajaj Allianz), General Enquiry
- **Communication Types**: Call, WhatsApp, Email, SMS, Visit, Internal Note

## 🎯 Core Features Implemented

### **✅ Public Landing Page**
- Samsung-branded responsive design with official colors
- Service information (repairs, claims, pickup/drop)
- Complete contact information with direct links
- Business hours and location with Google Maps integration
- Customer enquiry form with device model selection
- Accessories price checking system
- Multi-language support structure (English/Hindi/Hinglish ready)

### **✅ Customer Enquiry System**
- Comprehensive enquiry form with validation
- IMEI number collection and validation
- Device model selection from Samsung catalog
- Service type categorization (repair/claim/enquiry)
- Warranty and insurance status tracking
- Automatic ticket number generation (BS2025MMDDXXX format)
- Customer phone/email duplicate detection

### **✅ Staff Portal & Authentication**
- Secure login system with session management
- Role-based access (admin vs staff permissions)
- Dashboard with enquiry overview and filters
- Real-time enquiry status updates
- Staff assignment and workload management

### **✅ IMEI & Phone Number Lookup Engine**
- Instant search by 15-digit IMEI number
- Customer history lookup by phone number
- Complete enquiry history with timeline
- Cross-reference detection for repeat customers
- Related case identification and linking

### **✅ Enquiry Management Dashboard**
- Real-time enquiry listing with filters
- Status tracking (Open, In Progress, Waiting Parts, Completed, Cancelled)
- Priority management (Low, Normal, High, Urgent)
- Assignment to staff members
- Estimated completion date tracking
- Customer communication history

### **✅ Accessories & Parts Inventory**
- Complete Samsung parts catalog with pricing
- Stock quantity tracking with low-stock alerts
- Compatible device mapping
- Wholesale and retail pricing
- Search and filter functionality
- Part number and compatibility tracking
- Excel upload capability (admin only)

### **✅ Communication & Audit System**
- Customer interaction logging (calls, WhatsApp, visits)
- Status change history with timestamps
- Staff action audit trail
- Communication direction tracking (incoming/outgoing)
- Notes and internal communication system

## 🔧 Technical Stack
- **Backend**: Hono framework on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite) with local development support
- **Frontend**: Vanilla JavaScript with TailwindCSS
- **Icons**: FontAwesome 6.4.0
- **HTTP Client**: Axios
- **Deployment**: Cloudflare Pages with edge distribution
- **Development**: PM2 process management with hot reload

## 📋 Functional Entry URIs

### **Public APIs**
- `POST /api/enquiry` - Submit customer service enquiry
- `GET /api/accessories` - Fetch accessories catalog (with search/filter)
- `GET /api/accessories?search={query}` - Search accessories by keyword
- `GET /api/accessories?category={category}` - Filter by accessory category

### **Staff Portal APIs**
- `POST /api/login` - Staff/admin authentication
- `GET /api/enquiries` - Get all enquiries (with optional status filter)
- `GET /api/enquiries?status={status}` - Filter enquiries by status
- `GET /api/enquiries?limit={number}` - Limit enquiry results
- `PUT /api/enquiry/{id}/status` - Update enquiry status with notes

### **Lookup APIs**
- `GET /api/lookup/imei/{imei}` - Search enquiries by IMEI number
- `GET /api/lookup/phone/{phone}` - Search enquiries by phone number

### **Web Pages**
- `/` - Public landing page with enquiry form
- `/portal` - Staff authentication and dashboard
- `/static/*` - Static assets (CSS, JS, images)

## 👥 User Guide

### **For Customers**
1. **Submit Enquiry**: Click "New Enquiry" → Fill form with device details → Get ticket number
2. **Check Accessories**: Click "Check Accessories" → Search by device model or part name
3. **Contact Support**: Use WhatsApp, phone, or visit service center
4. **Track Status**: Contact staff with your ticket number for updates

### **For Staff Members**
1. **Login**: Use staff credentials at `/portal`
2. **View Enquiries**: Dashboard shows all open and assigned enquiries
3. **Search History**: Use IMEI/Phone lookup to find customer history
4. **Update Status**: Change enquiry status and add progress notes
5. **Manage Inventory**: View accessories stock and pricing

### **For Administrators**
1. **Full Access**: All staff features plus inventory management
2. **User Management**: Add/remove staff accounts
3. **Inventory Upload**: Bulk update accessories via Excel import
4. **System Monitoring**: View audit logs and system usage

## 🚀 Deployment Status
- **Platform**: Cloudflare Pages with Workers
- **Status**: ✅ Active and fully functional
- **Environment**: Development (ready for production deployment)
- **Database**: Local D1 with migration support
- **Last Updated**: September 23, 2025

## 🔐 Demo Credentials
- **Admin**: username: `admin`, password: `admin123`
- **Staff**: username: `staff1`, password: `admin123`

## 📱 Mobile Compatibility
- Fully responsive design optimized for mobile devices
- Touch-friendly interface with large buttons
- Optimized forms for mobile input
- Fast loading on mobile networks
- Progressive Web App (PWA) ready structure

## 🔄 Development Workflow

### **Local Development**
```bash
# Install dependencies
npm install

# Build application
npm run build

# Apply database migrations
npm run db:migrate:local

# Seed test data
npm run db:seed

# Start development server
pm2 start ecosystem.config.cjs

# View logs
pm2 logs bijnor-services --nostream
```

### **Database Management**
```bash
# Reset database (development only)
npm run db:reset

# Execute SQL commands
npm run db:console:local

# Apply new migrations
npm run db:migrate:local
```

## 🌟 Advanced Features Ready for Implementation

### **Planned Enhancements**
- **WhatsApp Integration**: Auto-sync enquiries from WhatsApp Business API
- **Facebook Integration**: Direct enquiry import from Facebook messages
- **Email Notifications**: Automated customer updates via email
- **SMS Integration**: Status updates via SMS gateway
- **Analytics Dashboard**: Service performance metrics and reporting
- **Multi-language Support**: Complete Hindi/Hinglish interface
- **PDF Reports**: Printable service reports and invoices
- **QR Code Generation**: Quick access codes for customers
- **Photo Upload**: Device condition documentation
- **Parts Ordering**: Direct supplier integration

### **Scalability Features**
- **Multi-branch Support**: Handle multiple service center locations
- **Advanced Reporting**: Business intelligence and analytics
- **Customer Self-Service**: Online status checking portal
- **Automated Workflows**: Smart assignment and escalation rules
- **Integration Hub**: Connect with Samsung official systems

## 🏆 Business Impact
This CRM system transforms Bijnor Services from a traditional service center into a modern, digitally-enabled operation with:
- **Enhanced Customer Experience**: Professional online presence with self-service options
- **Operational Efficiency**: Streamlined enquiry management and staff coordination
- **Data-Driven Insights**: Complete customer interaction history and analytics
- **Competitive Advantage**: Modern digital tools matching larger service chains
- **Growth Ready**: Scalable architecture supporting business expansion

---

**Built with ❤️ for Bijnor Services - Leading Samsung service provider in Bijnor, UP**