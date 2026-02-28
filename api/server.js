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
╔════════════════════════════════════════════╗
║  PropBot API Server Running                ║
╠════════════════════════════════════════════╣
║  Port: ${PORT}
║  Status: http://localhost:${PORT}/api/health
║  Lead Email: ${NOTIFICATION_EMAIL}
╠════════════════════════════════════════════╣
║  Available Endpoints:                      ║
║  POST   /api/valuate    (Valuation)       ║
║  POST   /api/leads      (Capture lead)    ║
║  GET    /api/leads      (View all leads)  ║
║  GET    /api/health     (Health check)    ║
╚════════════════════════════════════════════╝
  `);
});

module.exports = app;
