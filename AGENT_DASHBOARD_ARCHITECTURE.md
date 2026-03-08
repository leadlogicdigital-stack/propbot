# Agent Dashboard - End-to-End Architecture Plan

## 📋 Overview

The Agent Dashboard is the primary interface where agents interact with the PropBot gamification system. It's where agents:
1. **See their rewards** (coin balance, tier, achievements)
2. **Submit properties** (single form or CSV bulk upload)
3. **Manage their coins** (view, redeem for leads)
4. **Access leads** (browse available, view redeemed)
5. **Track progress** (submissions, earnings, redemption history)

---

## 🏗️ Architecture Design

### 1. **Dashboard Layout (UI Structure)**

```
┌─────────────────────────────────────────────────────────────┐
│                       AGENT DASHBOARD                       │
│  [Logo]  Welcome, John!  [Coin Balance: 45]  [Tier: Silver] │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  📊 MY STATS                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Coins: 45    │  │ Submissions: │  │ Tier:        │     │
│  │ Earned: 127  │  │ 12 approved  │  │ Silver ⭐    │     │
│  │ Redeemed: 82 │  │ 3 pending    │  │ Next: Gold   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────┐  ┌────────────────────────────────┐
│  🏠 SUBMIT PROPERTIES    │  │  💰 REDEEM COINS FOR LEADS    │
│                          │  │                                │
│  • Single Form           │  │  [Tier 1] 5 coins → 1 lead    │
│  • CSV Bulk Upload ⬇️     │  │  [Tier 2] 10 coins → 5 leads  │
│  • Template Download     │  │  [Tier 3] 15 coins → 7 leads  │
│  • Submission Status     │  │  [Tier 4] 20 coins → 10 leads │
│  • View Submissions      │  │  [Tier 5] 30 coins → 15 leads │
│                          │  │  [Tier 6] 40 coins → 20 leads │
└──────────────────────────┘  │                                │
                              │  [Redeem Now] [View Terms]    │
                              └────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  ✅ MY REDEEMED LEADS (5 leads)                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Lead #1: Rajesh Kumar                              │   │
│  │ Phone: +91-98765-43210  |  Email: rajesh@...      │   │
│  │ Interest: Apartment, Koramangala, ₹50-75L          │   │
│  │ [Copy Details] [Call] [Email] [Archive]           │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Lead #2: Priya Singh                               │   │
│  │ Phone: +91-88765-54321  |  Email: priya@...       │   │
│  │ Interest: Villa, JP Nagar, ₹1-2Cr                  │   │
│  │ [Copy Details] [Call] [Email] [Archive]           │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  🔍 AVAILABLE LEADS (12 total)                             │
│  [All] [Basic] [Targeted] [Premium] [VIP] [Elite]          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Lead: Aditya Kapoor (Basic Lead)                    │  │
│  │ Budget: ₹25-40L | Location: Whitefield             │  │
│  │ Quality: Basic  │  Response Rate: ~40%              │  │
│  │ [Preview] [Redeem - 5 coins]                        │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  📈 TRANSACTION HISTORY                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ✅ +5 coins | Property approved | 2 days ago       │  │
│  │ ❌ -5 coins | Lead redeemed | 1 day ago            │  │
│  │ ✅ +10 bonus coins | 5-submission streak | 5h ago  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### 2. **Key Sections & Functionality**

| Section | Purpose | Data Needed | APIs Used |
|---------|---------|------------|-----------|
| **Header** | Agent identity + coin balance | Agent name, coin balance, tier | `/api/sales-executive/{agentId}/coins` |
| **Stats Panel** | Quick overview of progress | Coins, submissions, tier, next milestone | `/api/sales-executive/{agentId}/coins` |
| **Submit Properties** | Single or bulk property submission | Property form or CSV | `/api/agent/submissions` (new) |
| **Redeem Coins** | View packages and redeem leads | Available packages, agent balance | `/api/sales-executive/packages`, POST `/api/sales-executive/{agentId}/redeem-leads` |
| **My Redeemed Leads** | View all claimed leads | Lead details, contact info | `/api/sales-executive/{agentId}/redeemed-leads` (new) |
| **Available Leads** | Browse and filter leads | All leads, filter by tier/location | `/api/sales-executive/{agentId}/available-leads` |
| **Transaction History** | Track coin activity | All transactions | `/api/sales-executive/{agentId}/transactions` |

---

## 📊 Data Flow Diagram

### **Flow 1: Agent Submits Property → Gets Coins**

```
┌─────────────────────┐
│ Agent submits       │
│ property via form/  │
│ CSV on dashboard    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│ Backend: /api/agent/submissions (POST)      │
│ - Validate property data                    │
│ - Store in agentSubmissions                 │
│ - Return submission_id + status             │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│ Admin Dashboard: Review submission          │
│ - View pending submissions                  │
│ - Click Approve/Reject                      │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│ Backend: /api/agent/submissions/.../review  │
│ - Update status to approved                 │
│ - Trigger coin award                        │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│ Backend: /api/sales-executive/coins/award   │
│ - Add 1 coin to agent balance               │
│ - Check for bonuses (streak, milestones)    │
│ - Log transaction                           │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│ Agent Dashboard: Real-time update           │
│ - Coin balance increases                    │
│ - Submission moves to Approved              │
│ - Achievement notification shown            │
└─────────────────────────────────────────────┘
```

### **Flow 2: Agent Redeems Coins → Gets Leads**

```
┌──────────────────────────────────────────┐
│ Agent selects leads from "Available" or  │
│ chooses a Redemption Tier package        │
└─────────┬────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────┐
│ Dashboard: Check coin balance                    │
│ - Required coins: 5-40 depending on tier        │
│ - Available coins: Check agentCoins[agentId]    │
│ - Show "Confirm Redemption" dialog             │
└─────────┬───────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────────┐
│ Backend: POST /api/sales-executive/{agentId}/redeem-leads │
│ - Check balance ✓                                          │
│ - Deduct coins from account                               │
│ - Mark leads as "claimed"                                 │
│ - Set redeemed_by and redeemed_date                       │
│ - Log transaction                                         │
└─────────┬─────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────┐
│ Agent Dashboard: Display redeemed leads          │
│ - Move to "My Redeemed Leads" section            │
│ - Show contact details                          │
│ - Show copy/call/email buttons                  │
│ - Update coin balance in header                 │
└──────────────────────────────────────────────────┘
```

### **Flow 3: CSV Bulk Upload**

```
┌────────────────────────────────┐
│ Agent downloads CSV template   │
│ Fields: Name, Location, PIN,   │
│ Cost, Property Type            │
└─────────┬──────────────────────┘
          │
          ▼
┌──────────────────────────────────────┐
│ Agent fills in properties in CSV     │
│ - Multiple rows (10, 50, 100+)       │
│ - Each row = 1 property submission   │
└─────────┬──────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────┐
│ Agent clicks "Upload CSV" on dashboard             │
│ - File picker opens                                │
│ - Select CSV file                                  │
│ - Preview rows before upload                       │
└─────────┬─────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────┐
│ Backend: POST /api/agent/submissions/bulk-upload   │
│ - Parse CSV file                                    │
│ - Validate each row (required fields, data types)   │
│ - Create submission for each row                    │
│ - Return results (success, failed, skipped)         │
└─────────┬────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────┐
│ Dashboard: Show upload result summary             │
│ - X submitted successfully                       │
│ - Y failed (show errors)                         │
│ - Z skipped (duplicates)                         │
│ - All appear in "My Submissions" list             │
└──────────────────────────────────────────────────┘
```

---

## 🔧 API Requirements

### **New/Modified Endpoints Needed**

#### 1. **POST /api/agent/submissions/bulk-upload**
Upload CSV file with multiple property submissions
```
Request:
- Content-Type: multipart/form-data
- agentId: string (from header or body)
- csv_file: File (CSV data)

Response:
{
  success: boolean,
  total_rows: number,
  successful: number,
  failed: number,
  skipped: number,
  submissions: [{
    row: number,
    status: "success|error|skipped",
    submission_id: string (if success),
    error: string (if error),
    property_data: {...}
  }]
}
```

#### 2. **GET /api/sales-executive/{agentId}/redeemed-leads** (NEW)
Get all leads redeemed by agent
```
Response:
{
  success: boolean,
  agent_id: string,
  total_redeemed: number,
  data: [{
    lead_id: string,
    buyer_name: string,
    buyer_phone: string,
    buyer_email: string,
    property_interest: {...},
    redeemed_date: ISO string,
    status: "active|archived"
  }]
}
```

#### 3. **GET /api/agent/submissions?agentId={agentId}** (MODIFY)
Get agent's own submissions (with filter for their submissions only)
```
Response: Same format as existing, but filtered to agent's submissions
```

---

## 📁 File Structure

```
/public/
├── agent-dashboard.html          ← NEW: Main agent dashboard
├── agent-login.html              ✓ Existing: Login page
├── agent-chat.html               ✓ Existing: Property submission form
├── admin-dashboard.html          ✓ Existing: Admin review panel
└── sales-executive-leads.html    ✓ (Will be deprecated/replaced)

/data/
├── LEADS_DATABASE.json           ✓ 12 sample leads (need to expand)
├── properties-submissions.json    ✓ Agent submissions log
└── CSV_TEMPLATE.csv              ← NEW: Template for bulk upload

/api/
├── server.js                     🔧 MODIFY: Add CSV upload endpoint + new endpoints
└── csv-parser.js                 ← NEW: CSV parsing utility

/utils/
├── web-scraper.js                ← NEW: Web scraping module (99acres, Magicbricks)
└── pin-code-updater.js           ← NEW: Update PIN code database with prices
```

---

## 🔐 Security Considerations

1. **Agent Authentication**
   - Validate agentId in all requests
   - Session/JWT token verification
   - Rate limiting on submissions/redemptions

2. **CSV Upload Validation**
   - File size limit (5MB max)
   - Allowed MIME types (text/csv)
   - Content validation (no SQL injection, XSS)
   - Row limit per upload (500 rows max)

3. **Data Privacy**
   - Hash sensitive lead data
   - Audit logs for all transactions
   - Prevent agents from viewing other agents' leads

4. **Fraud Prevention**
   - Prevent duplicate submissions
   - Validate PIN codes exist
   - Check cost reasonableness
   - Prevent coin manipulation

---

## 🎨 UI/UX Principles

1. **Clear Coin Balance** - Always visible in header
2. **Progress Visualization** - Show tier progression with bars/badges
3. **Action Buttons** - Primary actions (Redeem, Upload) prominent
4. **Real-time Updates** - Balance updates immediately after action
5. **Error Handling** - Clear error messages, not technical jargon
6. **Mobile Responsive** - Works on tablets and phones
7. **Accessibility** - ARIA labels, keyboard navigation

---

## 📋 Implementation Checklist

### Phase 1: Core Dashboard UI
- [ ] Create agent-dashboard.html with all sections
- [ ] Style with responsive grid layout
- [ ] Add tabs/accordion for collapsible sections
- [ ] Implement real-time coin balance display

### Phase 2: Data Integration
- [ ] Connect to /api/sales-executive/{agentId}/coins
- [ ] Connect to /api/sales-executive/{agentId}/available-leads
- [ ] Connect to /api/sales-executive/{agentId}/transactions
- [ ] Connect to /api/sales-executive/packages
- [ ] Add real-time polling or WebSocket for updates

### Phase 3: CSV Upload System
- [ ] Create CSV_TEMPLATE.csv
- [ ] Build CSV file upload UI
- [ ] Create /api/agent/submissions/bulk-upload endpoint
- [ ] Add CSV parser utility
- [ ] Add file size validation
- [ ] Show upload progress bar

### Phase 4: Additional APIs
- [ ] Create GET /api/sales-executive/{agentId}/redeemed-leads
- [ ] Modify GET /api/agent/submissions for agent filter
- [ ] Add submission status websocket updates

### Phase 5: Web Scraping & Data Enrichment
- [ ] Build 99acres.com scraper
- [ ] Build Magicbricks.com scraper
- [ ] Build Mysore apartment sites scraper
- [ ] Create PIN code price updater
- [ ] Expand LEADS_DATABASE.json with real data

---

## 🧪 Testing Workflow

```
1. Agent logs in → Dashboard loads with their data
2. Check coin balance → Matches API response
3. Click "Redeem Coins" → Modal shows available packages
4. Click "Tier 1 (5 coins)" → Shows confirmation
5. Confirm → Coins deducted, lead added to "My Redeemed Leads"
6. Download CSV template → Opens CSV file
7. Fill in CSV with 3 properties → Upload
8. See upload result → All 3 appear as "pending_review" submissions
9. Admin approves 1 submission → Agent's balance +1 coin
10. Verify all real-time updates work correctly
```

---

## 🚀 Deployment Notes

1. **Session Management** - Persist agent login across page reloads
2. **Offline Support** - Consider service worker for offline access
3. **Analytics** - Track which redemption tiers are most popular
4. **Email Notifications** - Send when leads are allocated
5. **Export Data** - Allow agents to export their transaction history

---

## 📞 Support & Documentation

- Link to terms & conditions for lead quality
- FAQ about coin system and bonuses
- Chat support for redemption issues
- Submission guide with examples

