# PropBot - India Real Estate Property Valuation

**AI-powered property valuation for Bangalore & Mysore**

Instant property value estimates using government guidance values and distance-based algorithms.

## 🏗️ Project Structure

```
propbot/
├── backend/                 # Python valuation engine
│   ├── valuation_engine.py # Core algorithm
│   ├── data/               # Mysore guidance values
│   └── requirements.txt    # Python dependencies
│
├── api/                    # Node.js REST API
│   ├── server.js           # Express server
│   ├── routes/             # API endpoints
│   └── package.json
│
├── frontend/               # React.js landing page
│   ├── pages/              # Landing page components
│   ├── components/         # Reusable components
│   └── styles/             # CSS
│
├── demo/                   # Frontend sandbox
│   ├── index.html          # Demo interface
│   └── demo.js             # Interactive demo
│
└── docs/                   # Documentation
    ├── ALGORITHM.md        # Valuation algorithm docs
    └── API.md              # API documentation
```

## 🚀 Quick Start

### 1. Backend (Python Algorithm)
```bash
cd backend
python3 valuation_engine.py
```

### 2. API Server (Node.js)
```bash
cd api
npm install
npm start
```

### 3. Frontend (React Landing Page)
```bash
cd frontend
npm install
npm run dev
```

### 4. Demo Sandbox
Open `demo/index.html` in browser for interactive testing

## 📊 Valuation Algorithm

**Concentric Circles Model:**
- Identifies distance from city center (CBD)
- Applies government guidance values
- Calculates property estimate based on:
  - Property type (apartment, plot, villa, commercial, agricultural)
  - Size/specifications
  - Distance from center
  - Area-specific guidance values

## 🔄 Data Flow

```
User Input (Location, Property Type, Size)
    ↓
Distance Calculation (from CBD)
    ↓
Guidance Value Lookup (Government Data)
    ↓
Multiplier Calculation (Distance, Adjustments)
    ↓
Price Estimation
    ↓
Lead Capture (Name, Email, Phone)
    ↓
Email Notification (to abhi7lash@gmail.com)
```

## 📍 Cities Supported

- **Bangalore:** Full circle model (CBD: MG Road)
- **Mysore:** Full circle model (CBD: Devaraja Market)
- Mysore West: Real government guidance values integrated

## 🎯 Features

✅ Instant property valuations (5 types)
✅ Government guidance value integration
✅ Distance-based multipliers
✅ Lead capture form
✅ Email notifications
✅ Interactive demo
✅ Mobile responsive
✅ No authentication required (MVP)

## 📈 Accuracy

- **MVP Target:** ±15-20% margin
- **With Real Data:** ±10% achievable
- **Reference:** Government guidance values + actual transactions

## 🔧 Technology Stack

**Backend:**
- Python 3.x
- Flask (lightweight API)
- Pandas (data processing)

**API:**
- Node.js / Express
- REST endpoints
- CORS enabled

**Frontend:**
- React / Next.js
- Tailwind CSS
- Responsive design

**Deployment:**
- Vercel (Frontend)
- Heroku (API - Free tier)
- Firebase (Lead storage)

## 📝 Environment Variables

Create `.env` file:
```
NOTIFICATION_EMAIL=abhi7lash@gmail.com
FIREBASE_KEY=your_firebase_key
API_PORT=3001
PYTHONPATH=/Users/abhi/propbot/backend
```

## 🤝 Contributing

This is a private MVP. All changes tracked via Git.

## 📧 Contact

**Lead Notifications:** abhi7lash@gmail.com

---

**Status:** 🔨 Building (2-week MVP)
**Last Updated:** Feb 28, 2026
