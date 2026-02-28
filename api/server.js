#!/usr/bin/env node
/**
 * PropBot API Server
 * REST API for property valuation + lead capture
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

// ==========================================================================
// CONFIGURATION
// ==========================================================================

const app = express();
const PORT = process.env.PORT || 3001;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'abhi7lash@gmail.com';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from public directory
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// Email configuration (using test email - configure with real SMTP later)
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// In-memory lead storage (replace with database later)
const leads = {};

// In-memory agent submissions storage (replace with database later)
const agentSubmissions = {};

// ==========================================================================
// PYTHON INTEGRATION
// ==========================================================================

async function callValuationEngine(params) {
  /**
   * Call Python valuation engine with parameters
   * Returns: { success: true/false, data: {...}, error: "..." }
   */

  return new Promise((resolve) => {
    const backendPath = path.join(__dirname, '..', 'backend');
    const valuateScript = path.join(backendPath, 'valuate.py');

    // Spawn Python process
    const python = spawn('python3', [valuateScript, JSON.stringify(params)], {
      cwd: backendPath,
      timeout: 10000
    });

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        console.error('Python error:', errorOutput);
        resolve({
          success: false,
          error: 'Valuation engine error: ' + errorOutput
        });
      } else {
        try {
          const result = JSON.parse(output);
          if (result.error) {
            resolve({
              success: false,
              error: result.error
            });
          } else {
            resolve({
              success: true,
              data: result
            });
          }
        } catch (parseErr) {
          console.error('JSON parse error:', parseErr, 'Output:', output);
          resolve({
            success: false,
            error: 'Failed to parse valuation result'
          });
        }
      }
    });

    python.on('error', (err) => {
      console.error('Spawn error:', err);
      resolve({
        success: false,
        error: 'Failed to spawn valuation engine: ' + err.message
      });
    });
  });
}

// ==========================================================================
// EMAIL NOTIFICATION
// ==========================================================================

async function sendLeadNotification(leadData) {
  /**
   * Send email notification when lead submits form
   */

  const htmlContent = `
    <h2>New Property Valuation Lead</h2>
    <hr>
    <h3>Lead Information</h3>
    <p><strong>Name:</strong> ${leadData.name}</p>
    <p><strong>Email:</strong> ${leadData.email}</p>
    <p><strong>Phone:</strong> ${leadData.phone}</p>
    <h3>Property Details</h3>
    <p><strong>City:</strong> ${leadData.city}</p>
    <p><strong>Property Type:</strong> ${leadData.property_type}</p>
    <p><strong>Location:</strong> ${leadData.area_name || 'Not specified'}</p>
    <p><strong>Distance from CBD:</strong> ${leadData.distance_km || 'Not specified'} km</p>
    <h3>Valuation Estimate</h3>
    <p><strong>Estimate Range:</strong> ₹${(leadData.estimate_min / 100000).toFixed(2)}L - ₹${(leadData.estimate_max / 100000).toFixed(2)}L</p>
    <p><strong>Confidence:</strong> ${leadData.confidence}</p>
    <hr>
    <p><small>Lead ID: ${leadData.lead_id}</small></p>
    <p><small>Received: ${new Date().toLocaleString()}</small></p>
  `;

  try {
    await emailTransporter.sendMail({
      from: process.env.EMAIL_USER || 'noreply@propbot.in',
      to: NOTIFICATION_EMAIL,
      subject: `New Lead: ${leadData.name} - ${leadData.property_type}`,
      html: htmlContent
    });

    return { success: true };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
}

// ==========================================================================
// API ROUTES
// ==========================================================================

/**
 * Root endpoint - serve landing page
 */
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).json({
        status: 'online',
        app: 'PropBot API',
        message: 'Visit /api/valuate to test the valuation engine'
      });
    }
  });
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * Valuation endpoint
 * POST /api/valuate
 * Body: { city, property_type, sqft/acres, distance_km, ... }
 */
app.post('/api/valuate', async (req, res) => {
  try {
    const { city, property_type, sqft, acres, distance_km, bedrooms, area_name } = req.body;

    // Validate inputs
    if (!city || !property_type) {
      return res.status(400).json({
        error: 'Missing required fields: city, property_type'
      });
    }

    if (!['bangalore', 'mysore'].includes(city)) {
      return res.status(400).json({
        error: 'City must be bangalore or mysore'
      });
    }

    // Call valuation engine
    const result = await callValuationEngine({
      city,
      property_type,
      sqft,
      acres,
      distance_km: distance_km || 5,
      bedrooms,
      area_name
    });

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Valuation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Lead capture endpoint
 * POST /api/leads
 * Body: { name, email, phone, city, property_type, area_name, distance_km, estimate_min, estimate_max, confidence }
 */
app.post('/api/leads', async (req, res) => {
  try {
    const { name, email, phone, city, property_type, area_name, distance_km, estimate_min, estimate_max, confidence } = req.body;

    // Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({
        error: 'Missing required fields: name, email, phone'
      });
    }

    // Create lead object
    const leadId = uuidv4();
    const leadData = {
      lead_id: leadId,
      name,
      email,
      phone,
      city,
      property_type,
      area_name,
      distance_km,
      estimate_min,
      estimate_max,
      confidence,
      created_at: new Date().toISOString()
    };

    // Store lead in memory (replace with database)
    leads[leadId] = leadData;

    // Send email notification
    const emailResult = await sendLeadNotification(leadData);

    // Log to console
    console.log(`[LEAD] ${name} (${email}) - ${property_type} in ${city}`);

    res.json({
      success: true,
      lead_id: leadId,
      message: 'Lead captured successfully',
      email_sent: emailResult.success
    });
  } catch (error) {
    console.error('Lead capture error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get lead details (admin endpoint)
 * GET /api/leads/:lead_id
 */
app.get('/api/leads/:lead_id', (req, res) => {
  const { lead_id } = req.params;

  if (leads[lead_id]) {
    res.json({
      success: true,
      data: leads[lead_id]
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Lead not found'
    });
  }
});

/**
 * Get all leads (admin endpoint)
 * GET /api/leads
 */
app.get('/api/leads', (req, res) => {
  const leadsList = Object.values(leads).sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  );

  res.json({
    success: true,
    total: leadsList.length,
    data: leadsList
  });
});

// ==========================================================================
// AGENT SUBMISSION ENDPOINTS (Phase 2)
// ==========================================================================

/**
 * Submit property data from agent
 * POST /api/agent/submissions
 * Body: { agentId, property: { property_type, pin_code, locality, bedrooms, property_size, cost_per_sqft, total_cost, amenities, additional_info } }
 */
app.post('/api/agent/submissions', (req, res) => {
  try {
    const { agentId, property } = req.body;

    // Validate required fields
    if (!agentId || !property) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: agentId, property'
      });
    }

    // Create submission object
    const submissionId = uuidv4();
    const submissionData = {
      id: submissionId,
      agent_id: agentId,
      property: property,
      status: 'pending_review',
      submitted_at: new Date().toISOString(),
      validated: false,
      crowd_score: 0
    };

    // Store submission
    agentSubmissions[submissionId] = submissionData;

    console.log(`[AGENT SUBMISSION] ${agentId} - ${property.property_type} at ${property.pin_code}`);

    res.json({
      success: true,
      submission_id: submissionId,
      message: 'Property data submitted successfully',
      data: submissionData
    });
  } catch (error) {
    console.error('Agent submission error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get all agent submissions (admin endpoint)
 * GET /api/agent/submissions?filter=pending|approved|all
 */
app.get('/api/agent/submissions', (req, res) => {
  try {
    const { filter = 'all' } = req.query;

    let submissionsList = Object.values(agentSubmissions);

    if (filter === 'pending') {
      submissionsList = submissionsList.filter(s => s.status === 'pending_review');
    } else if (filter === 'approved') {
      submissionsList = submissionsList.filter(s => s.status === 'approved');
    }

    submissionsList.sort((a, b) =>
      new Date(b.submitted_at) - new Date(a.submitted_at)
    );

    res.json({
      success: true,
      total: submissionsList.length,
      filter: filter,
      data: submissionsList
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get specific agent submission
 * GET /api/agent/submissions/:submission_id
 */
app.get('/api/agent/submissions/:submission_id', (req, res) => {
  try {
    const { submission_id } = req.params;

    if (agentSubmissions[submission_id]) {
      res.json({
        success: true,
        data: agentSubmissions[submission_id]
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Approve/Reject agent submission
 * POST /api/agent/submissions/:submission_id/review
 * Body: { action: 'approve' | 'reject', comments: '...' }
 */
app.post('/api/agent/submissions/:submission_id/review', (req, res) => {
  try {
    const { submission_id } = req.params;
    const { action, comments } = req.body;

    if (!agentSubmissions[submission_id]) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be approve or reject'
      });
    }

    const submission = agentSubmissions[submission_id];
    submission.status = action === 'approve' ? 'approved' : 'rejected';
    submission.review_comments = comments || '';
    submission.reviewed_at = new Date().toISOString();

    if (action === 'approve') {
      submission.validated = true;
    }

    console.log(`[SUBMISSION REVIEW] ${submission_id} - ${action}`);

    res.json({
      success: true,
      message: `Submission ${action}ed successfully`,
      data: submission
    });
  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get crowd-sourced property data by PIN code
 * GET /api/agent/properties/pin/:pin_code
 * Returns: Aggregated data from multiple agents for a PIN code
 */
app.get('/api/agent/properties/pin/:pin_code', (req, res) => {
  try {
    const { pin_code } = req.params;

    // Find all approved submissions for this PIN code
    const submissions = Object.values(agentSubmissions).filter(sub =>
      sub.status === 'approved' && sub.property.pin_code === pin_code
    );

    if (submissions.length === 0) {
      return res.json({
        success: true,
        pin_code: pin_code,
        count: 0,
        message: 'No validated property data available yet for this PIN code',
        data: null
      });
    }

    // Aggregate data
    const aggregated = {
      pin_code: pin_code,
      locality: submissions[0].property.locality,
      submission_count: submissions.length,
      properties_by_type: {},
      average_cost_per_sqft: 0,
      price_range: { min: Infinity, max: 0 },
      crowd_verified: true,
      last_updated: new Date().toISOString()
    };

    // Group by property type and calculate averages
    const costPerSqftValues = [];
    const priceValues = [];

    submissions.forEach(sub => {
      const pType = sub.property.property_type;

      if (!aggregated.properties_by_type[pType]) {
        aggregated.properties_by_type[pType] = {
          count: 0,
          avg_cost_per_sqft: 0,
          avg_price: 0,
          size_range: { min: Infinity, max: 0 }
        };
      }

      const typeData = aggregated.properties_by_type[pType];
      typeData.count++;

      if (sub.property.cost_per_sqft) {
        costPerSqftValues.push(parseInt(sub.property.cost_per_sqft));
      }

      if (sub.property.property_size) {
        const size = parseInt(sub.property.property_size);
        typeData.size_range.min = Math.min(typeData.size_range.min, size);
        typeData.size_range.max = Math.max(typeData.size_range.max, size);
      }

      if (sub.property.total_cost) {
        const price = sub.property.total_cost;
        priceValues.push(price);
      }
    });

    // Calculate averages
    if (costPerSqftValues.length > 0) {
      aggregated.average_cost_per_sqft = Math.round(
        costPerSqftValues.reduce((a, b) => a + b, 0) / costPerSqftValues.length
      );
    }

    // Calculate property type averages
    Object.keys(aggregated.properties_by_type).forEach(pType => {
      const typeSubmissions = submissions.filter(s => s.property.property_type === pType);
      const costsForType = typeSubmissions
        .filter(s => s.property.cost_per_sqft)
        .map(s => parseInt(s.property.cost_per_sqft));

      if (costsForType.length > 0) {
        aggregated.properties_by_type[pType].avg_cost_per_sqft = Math.round(
          costsForType.reduce((a, b) => a + b, 0) / costsForType.length
        );
      }
    });

    res.json({
      success: true,
      data: aggregated
    });
  } catch (error) {
    console.error('Get property data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path
  });
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ==========================================================================
// START SERVER
// ==========================================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  PropBot API Server Running (v2 - Agent Portal Enabled)   ║
╠════════════════════════════════════════════════════════════╣
║  Port: ${PORT}
║  Status: http://localhost:${PORT}/api/health
║  Lead Email: ${NOTIFICATION_EMAIL}
╠════════════════════════════════════════════════════════════╣
║  Customer Endpoints:                                       ║
║  POST   /api/valuate              (Property valuation)     ║
║  POST   /api/leads                (Capture lead)          ║
║  GET    /api/leads                (View all leads)        ║
╠════════════════════════════════════════════════════════════╣
║  Agent Portal Endpoints:                                   ║
║  POST   /api/agent/submissions    (Submit property data)   ║
║  GET    /api/agent/submissions    (View submissions)      ║
║  POST   /.../review               (Admin review action)    ║
║  GET    /api/agent/properties/pin/(PIN) (Crowd-sourced)   ║
╠════════════════════════════════════════════════════════════╣
║  Admin Portal:                                             ║
║  /admin-dashboard.html            (Review submissions)     ║
║  /agent-login.html                (Agent login)           ║
╠════════════════════════════════════════════════════════════╣
║  GET    /api/health               (Health check)          ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
