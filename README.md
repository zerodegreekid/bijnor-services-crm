# Bijnor Services - Samsung Service Center CRM

## Project Overview
- **Name**: Bijnor Services CRM
- **Goal**: Complete customer relationship management system for the Authorized Samsung Service Center in Bijnor, UP
- **Features**: Customer enquiry management, IMEI tracking, staff portal, accessories inventory, and Bajaj Allianz claim support

## URLs
- **Development**: https://3000-iscicgtlzklqk4hip4oxc-6532622b.e2b.dev
- **Staff Portal**: https://3000-iscicgtlzklqk4hip4oxc-6532622b.e2b.dev/portal
- **GitHub**: To be deployed

## Business Information
- **Service Center ID**: 236981
- **Address**: 1st Floor, Sky Tower, Sheel Kunj, Civil Line II, Bijnor - 246701, UP
- **Phone**: +91 80069 99809
- **Hours**: Mon-Sat 10AM-8PM, Sunday Closed
- **Services**: Samsung device repairs, Bajaj Allianz claims, pickup & drop service

## Data Architecture
- **Database**: Cloudflare D1 SQLite (local development mode)
- **Main Tables**: users, customers, enquiries, accessories, communications, audit_logs, status_history
- **Storage Services**: D1 for relational data, session management
- **Authentication**: Session-based with role permissions (admin/staff)

## Features Implemented

### ✅ Public Landing Page
- Clean, professional Samsung-branded design
- Service information and contact details
- Customer enquiry submission form
- Accessories price lookup
- Direct contact links (WhatsApp, Facebook, Maps)

### ✅ Customer Enquiry System
- Web form submission with IMEI and device model
- Automatic ticket number generation (BS2025MMDDXXX format)
- Multiple service types: repair, insurance claim, general enquiry
- Warranty and insurance status tracking

### ✅ Staff/Admin Portal
- Secure login system with role-based access
- Dashboard with key metrics and quick actions
- Comprehensive enquiry management
- Status tracking and updates

### ✅ IMEI & Phone Number Lookup
- Advanced search by IMEI or customer phone number
- Complete enquiry history display
- Previous case reference and linking
- Customer interaction timeline

### ✅ Accessories Inventory Management (Admin)
- Part catalog with pricing and stock levels
- Compatible device mapping
- Low stock alerts and threshold management
- Public price lookup for customers

### ✅ Communication Logging
- All customer interactions tracked
- Multiple communication types (call, WhatsApp, email, visit)
- Internal notes and status updates
- Complete audit trail

### ✅ Status Management
- Enquiry lifecycle tracking (open → in_progress → completed)
- Status history with timestamps
- Assigned staff tracking
- Priority levels

## Current Functional Entry URIs

### Public APIs
- `GET /` - Landing page
- `POST /api/enquiry` - Submit customer enquiry
- `GET /api/accessories` - View accessories catalog

### Staff Portal
- `GET /portal` - Staff dashboard (requires authentication)
- `POST /api/login` - Staff/admin login
- `POST /api/logout` - Logout

### Staff/Admin APIs (Authenticated)
- `GET /api/dashboard` - Dashboard statistics
- `GET /api/enquiries` - List enquiries (filterable by status)
- `PUT /api/enquiries/:id` - Update enquiry status
- `GET /api/lookup` - IMEI/phone number lookup
- `POST /api/communications` - Add communication log
- `GET /api/communications/:enquiry_id` - Get communications for enquiry
- `POST /api/accessories` - Add new accessory (admin only)

## Demo Credentials
- **Admin**: username: `admin`, password: `admin123`
- **Staff**: username: `staff1`, password: `admin123`

## User Guide

### For Customers
1. Visit the landing page to view services and contact information
2. Submit enquiries using the "Submit Enquiry" form
3. Search accessories and pricing
4. Contact via WhatsApp, phone, or visit the service center

### For Staff
1. Login via the "Staff Login" button
2. Use dashboard to view pending enquiries and key metrics
3. Search customer history by IMEI or phone number
4. Update enquiry status and add communication logs
5. Track service progress and completion

### For Admins
- All staff features plus:
- Manage accessories inventory
- Add new parts and update pricing
- View comprehensive audit logs
- Manage user accounts

## Technical Stack
- **Backend**: Hono framework on Cloudflare Workers
- **Frontend**: Vanilla JavaScript with Tailwind CSS
- **Database**: Cloudflare D1 SQLite
- **Authentication**: Session-based with secure tokens
- **Deployment**: Cloudflare Pages
- **Local Development**: Wrangler with PM2 process management

## Database Schema
- **users**: Staff and admin authentication
- **customers**: Customer information and contact details
- **enquiries**: Service requests and tickets
- **accessories**: Parts inventory and pricing
- **communications**: Customer interaction logs
- **audit_logs**: Complete change tracking
- **status_history**: Enquiry status changes
- **sessions**: Authentication session management

## Deployment Status
- ✅ **Development Environment**: Active and running
- ⏳ **Production Deployment**: Ready for Cloudflare Pages deployment
- ⏳ **GitHub Repository**: Ready for version control setup

## Next Development Steps
1. Excel/CSV import functionality for bulk accessories upload
2. WhatsApp API integration for automatic message logging
3. Email notification system for status updates
4. Advanced reporting and analytics
5. Multi-language support (Hindi, English)
6. Mobile app version
7. Integration with Samsung official service APIs
8. Automated backup and data export features

## Architecture Highlights
- **Clean Design**: Minimal, professional aesthetic with Samsung brand colors
- **Mobile Responsive**: Optimized for both desktop and mobile use
- **Role-Based Security**: Different access levels for admin and staff
- **Audit Trail**: Complete tracking of all changes and interactions
- **Fast Performance**: Edge-optimized with Cloudflare infrastructure
- **Scalable**: Built for growth with proper database design

---

**Last Updated**: September 23, 2025  
**Version**: 1.0.0  
**Developed for**: Bijnor Services - Authorized Samsung Service Center