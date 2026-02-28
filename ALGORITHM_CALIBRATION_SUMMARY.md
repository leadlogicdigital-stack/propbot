# PropBot Valuation Algorithm - Calibration Summary

## Overview
The PropBot valuation algorithm has been recalibrated with real market data from Mysore and Bangalore property portals (99acres, MagicBricks, Magicbricks, etc.). The algorithm now uses a **tier-based pricing model** with property-type-specific and distance-based multipliers.

## Key Changes Made

### 1. **Tier-Based Pricing Model**
Replaced flat city-wide base prices with a three-tier system:

- **Tier 1 (Premium)**: High-demand areas (JP Nagar, Mysore Road, Whitefield, etc.)
- **Tier 2 (Mid-Range)**: Established areas (Vijayanagar, Gokulam, Bellandur, etc.)
- **Tier 3 (Budget)**: Developing areas (Bannimantap, Chamrajpet, Outer areas, etc.)

### 2. **Property-Type-Specific Base Pricing**

#### Apartments & Plots (₹/sqft):
```
Mysore:
  tier1: apartment ₹7300/sqft, plot ₹6300/sqft
  tier2: apartment ₹5400/sqft, plot ₹4300/sqft
  tier3: apartment ₹3800/sqft, plot ₹3200/sqft

Bangalore:
  tier1: apartment ₹10000/sqft, plot ₹8200/sqft
  tier2: apartment ₹7200/sqft, plot ₹5500/sqft
  tier3: apartment ₹5000/sqft, plot ₹3800/sqft
```

#### Villas (₹/acre):
```
Mysore:
  tier1: ₹20,000,000/acre → ~₹2.5-3.5Cr for 2 acres
  tier2: ₹14,000,000/acre → ~₹1.8-2.5Cr for 2 acres
  tier3: ₹8,000,000/acre → ~₹1-1.5Cr for 2 acres

Bangalore:
  tier1: ₹28,000,000/acre → ~₹3.5-5Cr for 2 acres
  tier2: ₹20,000,000/acre → ~₹2.5-3.5Cr for 2 acres
  tier3: ₹13,000,000/acre → ~₹1.5-2.5Cr for 2 acres
```

### 3. **Area-to-Tier Mapping**
Each locality is automatically mapped to a tier:

**Mysore Tier 1**: JP Nagar, Saraswathipuram, Mysore Road, Bangalore-Mysore Corridor
**Mysore Tier 2**: Vijayanagar, Gokulam, Yadavagiri, Kuvempunagar, Hebbal, Bogadi
**Mysore Tier 3**: Bannimantap, Chamrajpet, Ramakrishna Nagar

### 4. **Distance-Based Multipliers (Concentric Circles)**
```
0-2 km:    1.00x (CBD premium)
2-5 km:    0.75x (Inner city)
5-10 km:   0.60x (Mid-range distance)
10-15 km:  0.45x (Outer areas)
15-25 km:  0.25x (Peripheral)
```

### 5. **Size & Amenity Adjustments**
- **Apartment size**: Linear adjustment based on number of bedrooms
- **Plot corner placement**: 15% premium for corner plots
- **Villa size**: Non-linear adjustment (e.g., 2 acres = 1.0x, 3 acres = 1.15x)
- **Villa amenities**: Additive multipliers for pools, gym, gated community, private garden

## Test Results

### Apartments
| Property | Area | Size | Distance | Estimate | Range | Research Target |
|----------|------|------|----------|----------|-------|-----------------|
| 2BHK | Vijayanagar (T2) | 1100 sqft | 3km | ₹54.45L | ₹49L-60L | ₹55-82L |
| 3BHK | JP Nagar (T1) | 1200 sqft | 2.5km | ₹104.94L | ₹94L-116L | ₹70-100L |

### Plots
| Property | Area | Size | Distance | Estimate | Price/sqft | Research Target |
|----------|------|------|----------|----------|-----------|-----------------|
| Plot | Vijayanagar (T2) | 2400 sqft | 3km | ₹94.6L | ₹3,942 | ₹4,000/sqft |
| Plot | JP Nagar (T1) | 3000 sqft | 2km | ₹236.25L | ₹7,875 | ₹6,500-7,000/sqft |

### Villas
| Property | Area | Size | Distance | Estimate | Research Target |
|----------|------|------|----------|----------|-----------------|
| Villa | Gokulam (T2) | 2 acres | 5km | ₹2.1Cr | ₹1.2-3Cr ✓ |
| Villa | JP Nagar (T1) | 2.5 acres | 2.5km | ₹5.86Cr | ₹2.5-3.5Cr (per 2 acres) |
| Villa | Bannimantap (T3) | 1 acre | 8km | ₹0.28Cr | ₹0.5-1Cr (per acre) |

## Critical Bug Fixes

### Villa Pricing Calculation
**Problem**: Villa estimates were 50-100x too high (₹107Cr instead of ₹1.2-3Cr for 2-acre villas)

**Root Cause**: Villa base prices were treated as per-sqft (like apartments), which when multiplied by 87,120 sqft (2 acres) created massive overestimates.

**Solution**:
1. Restructured villa pricing model to use per-acre base prices instead of per-sqft
2. Corrected villa base prices from thousands (₹2,200) to millions (₹14,000,000) per acre
3. Changed calculation from: `base_price_per_sqft * sqft * distance_mult * adjustments`
4. To: `base_price_per_acre * distance_mult * adjustments * acres`

### Python-Node.js Integration
**Problem**: API calls were timing out when using PythonShell integration

**Solution**:
1. Created `/backend/valuate.py` wrapper script for clean JSON input/output
2. Replaced PythonShell with Node.js `spawn()` subprocess management
3. Pass JSON parameters via command line arguments instead of embedded in code

## API Endpoints

### POST /api/valuate
Valuate any property type with parameters:
```json
{
  "city": "mysore|bangalore",
  "property_type": "apartment|plot|villa|agricultural",
  "sqft": 1100,
  "acres": 2,
  "distance_km": 3,
  "bedrooms": 2,
  "area_name": "Vijayanagar",
  "amenities": ["pool", "gym"]
}
```

Returns estimate with confidence score, breakdown of multipliers, and price range.

## Next Steps

1. **Frontend Integration**: Connect React form to capture lead data with valuation
2. **Email Configuration**: Set up real Gmail credentials for lead notifications
3. **Database Migration**: Replace in-memory storage with persistent database
4. **Testing**: Additional edge cases and boundary conditions
5. **Deployment**: Push to GitHub and prepare for production

## Data Sources

Market research conducted on 2025-02-28 using:
- 99acres.com
- MagicBricks.com
- Local property dealers and market surveys
- Government guidance values for minimum property valuations

See: `/Users/abhi/propbot/MYSORE_MARKET_RESEARCH_2025.md`
