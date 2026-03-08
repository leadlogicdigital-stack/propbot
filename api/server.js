#!/usr/bin/env node
/**
 * PropBot API Server
 * REST API for property valuation + lead capture
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const CSVParser = require('./csv-parser');

// ==========================================================================
// CONFIGURATION
// ==========================================================================

const app = express();
const PORT = process.env.PORT || 3001;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'abhi7lash@gmail.com';

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      cb(new Error('Only CSV files are allowed'));
    } else {
      cb(null, true);
    }
  }
});

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
 * Bulk upload properties via CSV
 * POST /api/agent/submissions/bulk-upload
 * Body: FormData with csv_file and agent_id
 */
app.post('/api/agent/submissions/bulk-upload', upload.single('csv_file'), async (req, res) => {
  try {
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing agentId'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No CSV file provided'
      });
    }

    // Parse CSV
    const csvContent = req.file.buffer.toString('utf-8');
    const parseResult = CSVParser.processCSV(csvContent);

    if (parseResult.error) {
      return res.status(400).json({
        success: false,
        error: parseResult.error
      });
    }

    // Submit valid properties
    const submissions = [];
    const errors = [];

    for (const validRow of parseResult.valid) {
      try {
        const submissionId = uuidv4();
        const submissionData = {
          id: submissionId,
          agent_id: agentId,
          property: validRow.property,
          status: 'pending_review',
          submitted_at: new Date().toISOString(),
          validated: false,
          crowd_score: 0,
          source: 'csv_bulk_upload',
          row_index: validRow.rowIndex
        };

        agentSubmissions[submissionId] = submissionData;
        submissions.push({
          row: validRow.rowIndex,
          status: 'success',
          submission_id: submissionId
        });

        console.log(`[CSV SUBMISSION] ${agentId} - Row ${validRow.rowIndex} - ${validRow.property.property_type} at ${validRow.property.pin_code}`);
      } catch (error) {
        errors.push({
          row: validRow.rowIndex,
          status: 'error',
          error: error.message
        });
      }
    }

    // Report invalid rows
    for (const invalidRow of parseResult.invalid) {
      errors.push({
        row: invalidRow.rowIndex,
        status: 'invalid',
        errors: invalidRow.errors
      });
    }

    res.json({
      success: true,
      file_name: req.file.originalname,
      total_rows: parseResult.total,
      successful: submissions.length,
      failed: errors.length,
      submissions: submissions,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    console.error('CSV upload error:', error);
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

// ==========================================================================
// GAMIFICATION SYSTEM - COINS & LEADS (Phase 3)
// ==========================================================================

// In-memory storage for agent coins
const agentCoins = {};

// In-memory storage for coin transactions
const coinTransactions = {};

// Load leads from database (in-memory for demo)
const leadsDatabase = (() => {
  try {
    const leadsPath = path.join(__dirname, '..', 'data', 'LEADS_DATABASE.json');
    const leadsData = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
    const leadsMap = {};
    leadsData.leads.forEach(lead => {
      leadsMap[lead.lead_id] = lead;
    });
    return leadsMap;
  } catch (error) {
    console.warn('Could not load leads database:', error.message);
    return {};
  }
})();

/**
 * Initialize agent coins (call after agent registration)
 * INTERNAL FUNCTION
 */
function initializeAgentCoins(agentId, agentName = 'Unknown') {
  if (!agentCoins[agentId]) {
    agentCoins[agentId] = {
      agent_id: agentId,
      agent_name: agentName,
      current_balance: 0,
      total_earned: 0,
      total_redeemed: 0,
      last_submission_date: null,
      submission_count: 0,
      submission_streak: 0,
      created_date: new Date().toISOString(),
      tier: 'Bronze'
    };
  }
}

/**
 * Award coins to agent (called when submission is approved)
 * POST /api/sales-executive/coins/award
 */
app.post('/api/sales-executive/coins/award', (req, res) => {
  try {
    const { agent_id, amount = 1, reason = 'Submission approved', submission_id } = req.body;

    if (!agent_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing agent_id'
      });
    }

    initializeAgentCoins(agent_id);

    const transactionId = uuidv4();
    const agent = agentCoins[agent_id];

    // Award coins
    agent.current_balance += amount;
    agent.total_earned += amount;
    agent.submission_count += 1;
    agent.submission_streak += 1;
    agent.last_submission_date = new Date().toISOString();

    // Check for bonuses
    let bonusAmount = 0;
    if (agent.submission_streak === 5) {
      bonusAmount = 5;
      agent.current_balance += bonusAmount;
      agent.total_earned += bonusAmount;
    } else if (agent.submission_streak === 10) {
      bonusAmount = 10;
      agent.current_balance += bonusAmount;
      agent.total_earned += bonusAmount;
    } else if (agent.submission_count === 20) {
      bonusAmount = 15;
      agent.current_balance += bonusAmount;
      agent.total_earned += bonusAmount;
    }

    // Update tier
    if (agent.submission_count >= 100) agent.tier = 'Platinum';
    else if (agent.submission_count >= 50) agent.tier = 'Gold';
    else if (agent.submission_count >= 25) agent.tier = 'Silver';

    // Record transaction
    coinTransactions[transactionId] = {
      transaction_id: transactionId,
      agent_id: agent_id,
      type: 'earned',
      amount: amount + bonusAmount,
      base_amount: amount,
      bonus_amount: bonusAmount,
      reason: reason,
      submission_id: submission_id,
      timestamp: new Date().toISOString()
    };

    console.log(`[COINS AWARDED] ${agent_id}: +${amount + bonusAmount} coins (${reason})`);

    res.json({
      success: true,
      agent_id: agent_id,
      coins_awarded: amount + bonusAmount,
      bonus: bonusAmount > 0 ? `+${bonusAmount} bonus coins!` : null,
      new_balance: agent.current_balance,
      transaction_id: transactionId,
      agent: agent
    });
  } catch (error) {
    console.error('Coin award error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get agent's coin balance and statistics
 * GET /api/sales-executive/:agent_id/coins
 */
app.get('/api/sales-executive/:agent_id/coins', (req, res) => {
  try {
    const { agent_id } = req.params;

    initializeAgentCoins(agent_id);
    const agent = agentCoins[agent_id];

    res.json({
      success: true,
      data: {
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
        current_balance: agent.current_balance,
        total_earned: agent.total_earned,
        total_redeemed: agent.total_redeemed,
        submission_count: agent.submission_count,
        submission_streak: agent.submission_streak,
        tier: agent.tier,
        next_bonus_at: agent.submission_streak === 4 ? 5 : agent.submission_streak === 9 ? 10 : null,
        monthly_stats: {
          submissions_this_month: agent.submission_count,
          coins_earned_this_month: agent.total_earned
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get available leads for redemption
 * GET /api/sales-executive/:agent_id/available-leads?tier=basic|targeted|premium|vip|elite
 */
app.get('/api/sales-executive/:agent_id/available-leads', (req, res) => {
  try {
    const { tier } = req.query;

    let availableLeads = Object.values(leadsDatabase)
      .filter(lead => lead.status === 'available');

    if (tier) {
      availableLeads = availableLeads.filter(lead => lead.quality_tier === tier);
    }

    // Group by tier
    const leadsByTier = {
      basic: [],
      targeted: [],
      premium: [],
      vip: [],
      elite: []
    };

    availableLeads.forEach(lead => {
      leadsByTier[lead.quality_tier].push(lead);
    });

    res.json({
      success: true,
      total_available: availableLeads.length,
      by_tier: {
        basic: leadsByTier.basic.length,
        targeted: leadsByTier.targeted.length,
        premium: leadsByTier.premium.length,
        vip: leadsByTier.vip.length,
        elite: leadsByTier.elite.length
      },
      data: availableLeads
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get agent's redeemed leads
 * GET /api/sales-executive/:agent_id/redeemed-leads
 */
app.get('/api/sales-executive/:agent_id/redeemed-leads', (req, res) => {
  try {
    const { agent_id } = req.params;

    const redeemedLeads = Object.values(leadsDatabase)
      .filter(lead => lead.status === 'claimed' && lead.redeemed_by === agent_id)
      .map(lead => ({
        lead_id: lead.lead_id,
        buyer_name: lead.buyer_name,
        buyer_phone: lead.buyer_phone,
        buyer_email: lead.buyer_email,
        property_interest: lead.property_interest,
        quality_tier: lead.quality_tier,
        interest_level: lead.interest_level,
        redeemed_date: lead.redeemed_date,
        status: 'active'
      }));

    res.json({
      success: true,
      agent_id: agent_id,
      total_redeemed: redeemedLeads.length,
      data: redeemedLeads
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Redeem coins for leads
 * POST /api/sales-executive/:agent_id/redeem-leads
 * Body: { lead_ids: [...], coin_cost: number }
 */
app.post('/api/sales-executive/:agent_id/redeem-leads', (req, res) => {
  try {
    const { agent_id } = req.params;
    const { lead_ids, coin_cost } = req.body;

    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least one lead_id'
      });
    }

    if (!coin_cost || coin_cost <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coin_cost'
      });
    }

    initializeAgentCoins(agent_id);
    const agent = agentCoins[agent_id];

    // Check if agent has enough coins
    if (agent.current_balance < coin_cost) {
      return res.status(400).json({
        success: false,
        error: `Insufficient coins. You have ${agent.current_balance} coins but need ${coin_cost}.`,
        current_balance: agent.current_balance,
        required: coin_cost,
        shortfall: coin_cost - agent.current_balance
      });
    }

    // Get the leads
    const redeemedLeads = [];
    const invalidLeads = [];

    lead_ids.forEach(lead_id => {
      if (leadsDatabase[lead_id]) {
        const lead = leadsDatabase[lead_id];
        if (lead.status === 'available') {
          redeemedLeads.push(lead);
          // Mark lead as claimed
          lead.status = 'claimed';
          lead.redeemed_by = agent_id;
          lead.redeemed_date = new Date().toISOString();
        } else {
          invalidLeads.push(lead_id);
        }
      } else {
        invalidLeads.push(lead_id);
      }
    });

    if (redeemedLeads.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid leads found for redemption',
        invalid_leads: invalidLeads
      });
    }

    // Deduct coins
    agent.current_balance -= coin_cost;
    agent.total_redeemed += coin_cost;

    // Record transaction
    const transactionId = uuidv4();
    coinTransactions[transactionId] = {
      transaction_id: transactionId,
      agent_id: agent_id,
      type: 'redeemed',
      amount: coin_cost,
      reason: `Redeemed ${redeemedLeads.length} leads`,
      lead_ids: redeemedLeads.map(l => l.lead_id),
      timestamp: new Date().toISOString()
    };

    console.log(`[LEADS REDEEMED] ${agent_id}: Redeemed ${redeemedLeads.length} leads for ${coin_cost} coins`);

    res.json({
      success: true,
      agent_id: agent_id,
      coins_spent: coin_cost,
      leads_redeemed: redeemedLeads.length,
      new_balance: agent.current_balance,
      transaction_id: transactionId,
      redeemed_leads: redeemedLeads.map(lead => ({
        lead_id: lead.lead_id,
        buyer_name: lead.buyer_name,
        buyer_phone: lead.buyer_phone,
        buyer_email: lead.buyer_email,
        property_interest: lead.property_interest,
        interest_level: lead.interest_level
      })),
      invalid_leads: invalidLeads.length > 0 ? invalidLeads : null
    });
  } catch (error) {
    console.error('Lead redemption error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get agent's coin transaction history
 * GET /api/sales-executive/:agent_id/transactions
 */
app.get('/api/sales-executive/:agent_id/transactions', (req, res) => {
  try {
    const { agent_id } = req.params;

    const transactions = Object.values(coinTransactions)
      .filter(t => t.agent_id === agent_id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      agent_id: agent_id,
      total_transactions: transactions.length,
      data: transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get redemption packages/tiers
 * GET /api/sales-executive/packages
 */
app.get('/api/sales-executive/packages', (req, res) => {
  try {
    const packages = {
      standard_tiers: [
        {
          tier: 1,
          name: 'Basic Lead',
          coin_cost: 5,
          lead_count: 1,
          quality: 'basic',
          description: 'Single verified buyer lead'
        },
        {
          tier: 2,
          name: 'Targeted Lead Bucket (Small)',
          coin_cost: 10,
          lead_count: '3-5',
          quality: 'targeted',
          description: 'Filtered by location + property type'
        },
        {
          tier: 3,
          name: 'Targeted Lead Bucket (Medium)',
          coin_cost: 15,
          lead_count: '5-7',
          quality: 'targeted',
          description: 'Filtered by location, type + price range'
        },
        {
          tier: 4,
          name: 'Targeted Lead Bucket (Large)',
          coin_cost: 20,
          lead_count: '8-10',
          quality: 'premium',
          description: 'Advanced filters + buyer qualification'
        },
        {
          tier: 5,
          name: 'Premium Lead Bucket (XL)',
          coin_cost: 30,
          lead_count: '12-15',
          quality: 'premium',
          description: 'Pre-qualified buyers, verified intent'
        },
        {
          tier: 6,
          name: 'Elite Lead Package (Ultimate)',
          coin_cost: 40,
          lead_count: '10-15',
          quality: 'elite',
          description: 'VIP buyers, high net-worth, immediate needs'
        }
      ],
      custom_search: [
        {
          level: 1,
          name: 'Basic Custom Search',
          coin_cost: 10,
          features: ['Location', 'Property Type'],
          access: '1 search/month'
        },
        {
          level: 2,
          name: 'Advanced Custom Search',
          coin_cost: 15,
          features: ['Location', 'Type', 'Price', 'Bedrooms'],
          access: '3 searches/month'
        },
        {
          level: 3,
          name: 'Professional Custom Search',
          coin_cost: 20,
          features: ['All above', 'Investment Type', 'Timeline'],
          access: '5 searches/month + saved searches'
        },
        {
          level: 4,
          name: 'Executive Custom Search',
          coin_cost: 30,
          features: ['Advanced filters', 'Market segment', 'Historical data'],
          access: 'Unlimited for 30 days'
        },
        {
          level: 5,
          name: 'Elite Executive Access',
          coin_cost: 50,
          features: ['AI recommendations', 'All filters', 'Priority data'],
          access: 'Unlimited + 1-on-1 support'
        }
      ]
    };

    res.json({
      success: true,
      data: packages
    });
  } catch (error) {
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
║  POST   /api/agent/submissions    (Submit property)        ║
║  POST   /api/agent/submissions/bulk-upload (CSV upload)   ║
║  GET    /api/agent/submissions    (View submissions)      ║
║  POST   /.../review               (Admin review)           ║
║  GET    /api/agent/properties/pin/(PIN) (Crowd-sourced)   ║
║  Gamification Endpoints:                                   ║
║  POST   /api/sales-executive/coins/award (Award coins)     ║
║  GET    /api/sales-executive/{id}/coins (Get balance)     ║
║  GET    /api/sales-executive/{id}/available-leads (Browse) ║
║  GET    /api/sales-executive/{id}/redeemed-leads (My leads)║
║  POST   /api/sales-executive/{id}/redeem-leads (Redeem)    ║
║  GET    /api/sales-executive/{id}/transactions (History)   ║
║  GET    /api/sales-executive/packages (Packages)           ║
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
