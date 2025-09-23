// Enhanced Authentication API with partner type support
export const authRoutes = (app: any) => {
  app.post('/api/login', async (c: any) => {
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
      
      if (partnerType === 'samsung' && (user.partner_type !== 'samsung' && user.partner_type !== 'admin')) {
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
}

// Claims API routes
export const claimsRoutes = (app: any) => {
  // Submit new insurance claim
  app.post('/api/claims', async (c: any) => {
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
          claimData.location.lat,
          claimData.location.lng,
          claimData.location.method
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
        claimData.location.lat,
        claimData.location.lng
      ).run()
      
      // Log activity
      const claimId = await env.DB.prepare(`
        SELECT id FROM insurance_claims WHERE claim_number = ?
      `).bind(claimNumber).first()
      
      if (claimId) {
        await env.DB.prepare(`
          INSERT INTO claim_activities (claim_id, activity_type, description, performed_by, new_status)
          VALUES (?, ?, ?, ?, ?)
        `).bind(
          claimId.id,
          'claim_registered',
          'Insurance claim registered by customer',
          1, // System user
          'registered'
        ).run()
      }
      
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
  app.get('/api/claims', async (c: any) => {
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

  // Get partner-specific claims
  app.get('/api/claims/partner/:partnerId', async (c: any) => {
    const partnerId = c.req.param('partnerId')
    const { env } = c
    
    try {
      const claims = await env.DB.prepare(`
        SELECT ic.*, c.name as customer_name, c.phone_number as customer_phone
        FROM insurance_claims ic
        LEFT JOIN customers c ON ic.customer_id = c.id
        WHERE ic.assigned_partner_id = ?
        ORDER BY ic.created_at DESC
      `).bind(partnerId).all()
      
      return c.json(claims.results || [])
    } catch (error) {
      return c.json({ success: false, message: 'Error loading partner claims: ' + error.message })
    }
  })

  // Get claim details with full activity timeline
  app.get('/api/claims/:claimId/details', async (c: any) => {
    const claimId = c.req.param('claimId')
    const { env } = c
    
    try {
      // Get claim details
      const claim = await env.DB.prepare(`
        SELECT ic.*, c.name as customer_name, c.phone_number as customer_phone, c.email as customer_email,
               u.full_name as assigned_partner_name
        FROM insurance_claims ic
        LEFT JOIN customers c ON ic.customer_id = c.id
        LEFT JOIN users u ON ic.assigned_partner_id = u.id
        WHERE ic.id = ?
      `).bind(claimId).first()
      
      if (!claim) {
        return c.json({ success: false, message: 'Claim not found' })
      }
      
      // Get activities timeline
      const activities = await env.DB.prepare(`
        SELECT ca.*, u.full_name as performed_by_name
        FROM claim_activities ca
        LEFT JOIN users u ON ca.performed_by = u.id
        WHERE ca.claim_id = ?
        ORDER BY ca.created_at ASC
      `).bind(claimId).all()
      
      // Get documents
      const documents = await env.DB.prepare(`
        SELECT cd.*, u.full_name as uploaded_by_name
        FROM claim_documents cd
        LEFT JOIN users u ON cd.uploaded_by = u.id
        WHERE cd.claim_id = ?
        ORDER BY cd.upload_date DESC
      `).bind(claimId).all()
      
      // Get communications
      const communications = await env.DB.prepare(`
        SELECT cc.*, u.full_name as staff_name
        FROM claim_communications cc
        LEFT JOIN users u ON cc.staff_member_id = u.id
        WHERE cc.claim_id = ?
        ORDER BY cc.created_at DESC
      `).bind(claimId).all()
      
      return c.json({
        claim,
        activities: activities.results || [],
        documents: documents.results || [],
        communications: communications.results || []
      })
    } catch (error) {
      return c.json({ success: false, message: 'Error loading claim details: ' + error.message })
    }
  })

  // Update claim status
  app.put('/api/claims/:claimId/status', async (c: any) => {
    const claimId = c.req.param('claimId')
    const { status, notes, performedBy } = await c.req.json()
    const { env } = c
    
    try {
      // Get current claim
      const currentClaim = await env.DB.prepare(`
        SELECT status FROM insurance_claims WHERE id = ?
      `).bind(claimId).first()
      
      if (!currentClaim) {
        return c.json({ success: false, message: 'Claim not found' })
      }
      
      // Update claim status
      await env.DB.prepare(`
        UPDATE insurance_claims SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(status, claimId).run()
      
      // Log activity
      await env.DB.prepare(`
        INSERT INTO claim_activities (claim_id, activity_type, description, performed_by, old_status, new_status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        claimId,
        'status_updated',
        'Claim status updated from ' + currentClaim.status + ' to ' + status,
        performedBy,
        currentClaim.status,
        status,
        notes || null
      ).run()
      
      return c.json({ success: true, message: 'Claim status updated successfully' })
    } catch (error) {
      return c.json({ success: false, message: 'Error updating claim status: ' + error.message })
    }
  })

  // Get warranty verification URLs
  app.get('/api/warranty-urls/:brand', async (c: any) => {
    const brand = c.req.param('brand')
    const { env } = c
    
    try {
      const brandInfo = await env.DB.prepare(`
        SELECT * FROM device_brands WHERE brand_name = ?
      `).bind(brand).first()
      
      if (!brandInfo) {
        return c.json({ success: false, message: 'Brand not found' })
      }
      
      return c.json(brandInfo)
    } catch (error) {
      return c.json({ success: false, message: 'Error loading warranty URLs: ' + error.message })
    }
  })
}

// Enhanced enquiry routes
export const enquiryRoutes = (app: any) => {
  // Submit enquiry API (existing)
  app.post('/api/enquiries', async (c: any) => {
    const enquiryData = await c.req.json()
    const { env } = c
    
    try {
      // Generate ticket number
      const ticketNumber = 'BSC' + new Date().getFullYear() + 
                          String(Date.now()).slice(-6)
      
      // Insert or find customer
      let customer = await env.DB.prepare(`
        SELECT id FROM customers WHERE phone_number = ?
      `).bind(enquiryData.customerPhone).first()
      
      if (!customer) {
        // Create new customer
        const customerResult = await env.DB.prepare(`
          INSERT INTO customers (name, email, phone_number, address, location_lat, location_lng, location_method)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          enquiryData.customerName,
          enquiryData.customerEmail || null,
          enquiryData.customerPhone,
          enquiryData.manualAddress || null,
          enquiryData.location.lat,
          enquiryData.location.lng,
          enquiryData.location.method
        ).run()
        
        customer = { id: customerResult.meta.last_row_id }
      }
      
      // Insert enquiry
      await env.DB.prepare(`
        INSERT INTO enquiries (
          ticket_number, customer_id, device_model, problem_description, 
          priority, status, customer_location_lat, customer_location_lng, 
          location_method, submitted_by_type, service_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        ticketNumber,
        customer.id,
        enquiryData.deviceModel || 'Unknown',
        enquiryData.issueDescription,
        'normal', // default priority
        'open', // default status
        enquiryData.location.lat,
        enquiryData.location.lng,
        enquiryData.location.method,
        'customer',
        enquiryData.issueCategory || 'General Issue'
      ).run()
      
      return c.json({ 
        success: true, 
        ticketNumber,
        message: 'Enquiry submitted successfully' 
      })
      
    } catch (error) {
      return c.json({ success: false, message: 'Submission error: ' + error.message })
    }
  })

  // Get all enquiries (for partners)
  app.get('/api/enquiries', async (c: any) => {
    const { env } = c
    
    try {
      const enquiries = await env.DB.prepare(`
        SELECT e.*, c.name as customer_name, c.phone_number as customer_phone,
               e.service_type as issue_category
        FROM enquiries e
        LEFT JOIN customers c ON e.customer_id = c.id
        ORDER BY e.created_at DESC
        LIMIT 50
      `).bind().all()
      
      return c.json(enquiries.results || [])
    } catch (error) {
      return c.json({ success: false, message: 'Error loading enquiries: ' + error.message })
    }
  })
}