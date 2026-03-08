# Web Scraping Phase Plan - PropBot

## 📋 Overview

The Agent Dashboard is now **complete and fully functional**. The next phase is to expand the property database with real-world pricing data from major real estate platforms to ensure the system has rich, diverse lead data.

---

## 🎯 Objectives

1. **Scrape Property Prices** from major platforms
   - 99acres.com (Bangalore + Mysore)
   - Magicbricks.com (Bangalore + Mysore)
   - Mysore-specific apartment sites

2. **Expand PIN Code Database**
   - Ensure all Mysore PIN codes have pricing data
   - Ensure all Bangalore PIN codes have pricing data
   - Map property types to price ranges

3. **Expand Leads Database**
   - From 12 sample leads → 100+ real leads
   - Diverse buyer profiles
   - Multiple property types and budgets

4. **Verify Data Quality**
   - Compare scraped prices with existing database
   - Validate PIN code coverage
   - Check for completeness

---

## 🏗️ Architecture

### **Scraping Stack**

```
Scraper Module (Node.js + Puppeteer/Cheerio)
        ↓
Chrome Browser Automation (Puppeteer)
        ↓
99acres.com, Magicbricks.com, Mysore sites
        ↓
Data Parser & Cleaner
        ↓
PIN Code Aggregator
        ↓
Updated Databases
        ├── PINCODE_GUIDANCE_DATABASE.json (prices)
        └── LEADS_DATABASE.json (100+ leads)
```

### **Components Needed**

1. **Web Scraper Module** (`/api/scrapers/`)
   - `ninety-nines-scraper.js` (99acres.com)
   - `magicbricks-scraper.js` (Magicbricks.com)
   - `mysore-scraper.js` (Mysore-specific sites)
   - `data-parser.js` (Clean & normalize data)
   - `pin-code-aggregator.js` (Group by PIN code)

2. **Data Processing**
   - `data-validator.js` (Validate price ranges)
   - `duplicate-detector.js` (Remove duplicates)
   - `price-calculator.js` (Average prices per PIN)

3. **Database Updaters**
   - `update-pincode-db.js`
   - `update-leads-db.js`

---

## 📊 Data to Scrape

### **From 99acres.com**

Search for: `site:99acres.com` for each area

**Bangalore Areas (Priority)**
- Koramangala (560034) - Premium
- JP Nagar (560078) - Premium
- Whitefield (560066) - IT Hub
- Indiranagar (560038) - Urban
- Marathahalli (560037) - Tech Area
- Hebbal (560024) - Mixed
- BTM Layout (560076) - Residential
- HSR Layout (560102) - Premium
- Gokulam (570002) - Mysore

**Mysore Areas (Priority)**
- Saraswathipuram (570009) - Premium
- Gokulam (570002) - Premium
- Vijayanagar (570009) - Residential
- Kuvempunagar (570023) - Residential

**Data to Extract**
- Property address / area
- PIN code
- Property type (apartment, villa, plot, etc.)
- Size (sqft/acres)
- Price (₹)
- Price per sqft
- Builder/owner
- Amenities
- BHK count (for apartments)

### **From Magicbricks.com**

Search filters available:
- City dropdown
- Area/locality
- Property type
- Price range
- Size range

**Same areas as above**

**Data to Extract**
- Same fields as 99acres
- Additional: contact info (optional)
- Possession date
- Project status

### **From Mysore-Specific Sites**

- Mysore property portals
- Local real estate blogs
- Property investor forums
- Municipality databases (if available)

---

## 🔧 Implementation Plan

### **Step 1: Set Up Puppeteer**

```bash
npm install puppeteer cheerio axios csv-parse
```

Create scraper skeleton:
```javascript
// /api/scrapers/base-scraper.js
class BaseScraper {
  async initialize() { }
  async search(query) { }
  async extractData(page) { }
  async cleanup() { }
}
```

### **Step 2: Implement 99acres Scraper**

```javascript
// /api/scrapers/ninety-nines-scraper.js
class NinetyNinesScraper extends BaseScraper {
  async scrapeArea(areaName, pinCode) {
    // Navigate to 99acres.com
    // Search for area
    // Extract property listings
    // Parse price data
    return propertyData;
  }
}
```

**Approach**:
1. Use Puppeteer to open browser
2. Navigate to 99acres.com
3. Search for each area
4. Extract property listings
5. Parse HTML to get prices, sizes, details
6. Return structured data

### **Step 3: Implement Magicbricks Scraper**

Similar structure to 99acres scraper with MagicBricks-specific selectors

### **Step 4: Implement Mysore Scraper**

Scrape Mysore-specific property websites

### **Step 5: Data Aggregation**

```javascript
// /api/pin-code-aggregator.js
class PinCodeAggregator {
  aggregate(propertyData) {
    // Group by PIN code
    // Calculate average prices
    // Organize by property type
    // Return aggregated data
  }
}
```

### **Step 6: Update Databases**

```javascript
// /api/update-pincode-db.js
async function updatePinCodeDatabase(scrapedData) {
  // Merge with existing PINCODE_GUIDANCE_DATABASE.json
  // Keep government guidance values
  // Add market prices
  // Save updated file
}

// /api/update-leads-db.js
async function updateLeadsDatabase(propertyData) {
  // Convert properties to buyer leads
  // Create buyer profiles
  // Assign quality tiers
  // Save to LEADS_DATABASE.json
}
```

---

## 📈 Data Processing Pipeline

```
Raw HTML
   ↓
[Puppeteer + Cheerio]
   ↓
Extracted Data
   ↓
[Data Parser]
   ↓
Normalized Data
   ├─ Address
   ├─ PIN Code
   ├─ Property Type
   ├─ Size
   ├─ Price
   └─ Amenities
   ↓
[Validator & Cleaner]
   ├─ Remove duplicates
   ├─ Validate ranges
   ├─ Convert units
   └─ Standardize format
   ↓
[PIN Code Aggregator]
   ├─ Group by PIN
   ├─ Calculate averages
   ├─ Identify outliers
   └─ Generate statistics
   ↓
[Database Updater]
   ├─ Merge with existing
   ├─ Update prices
   ├─ Add new areas
   └─ Save to files
```

---

## 📊 PIN Code Database Schema

Current structure:
```json
{
  "pin_codes": [{
    "pin_code": "560034",
    "locality": "Koramangala",
    "area_type": "urban",
    "city": "bangalore",
    "guidance_value": {
      "min": 1000,
      "max": 1500,
      "currency": "per_sqft"
    },
    "market_multiplier": 1.4,
    "property_types": {
      "apartment": {
        "avg_price_sqft": 1600,
        "range": { "min": 1400, "max": 2200 }
      },
      "plot": { ... },
      "villa": { ... }
    }
  }]
}
```

---

## 🔍 Leads Database Expansion

Current: 12 sample leads
Target: 100+ diverse leads

Schema per lead:
```json
{
  "lead_id": "LEAD_001",
  "buyer_name": "Name",
  "buyer_phone": "+91-XXXXX-XXXXX",
  "buyer_email": "email@domain.com",
  "property_interest": {
    "property_type": "apartment",
    "location": "Koramangala",
    "pin_code": "560034",
    "budget_range": {
      "min": "50 lakhs",
      "max": "75 lakhs"
    }
  },
  "quality_tier": "premium",
  "interest_level": 80,
  "status": "available",
  "source": "scraped_data",
  "created_date": "2026-03-05T00:00:00Z"
}
```

---

## ⏱️ Timeline & Effort Estimates

| Task | Effort | Duration |
|------|--------|----------|
| Set up Puppeteer | 1 day | 2 hours |
| 99acres scraper | 3 days | 8 hours |
| Magicbricks scraper | 3 days | 8 hours |
| Mysore scraper | 2 days | 4 hours |
| Data aggregation | 2 days | 4 hours |
| Database update logic | 2 days | 4 hours |
| Testing & validation | 2 days | 4 hours |
| **Total** | **15 days** | **~34 hours** |

---

## 🚨 Challenges & Solutions

### **Challenge 1: Website Structure Changes**
**Problem**: Websites change layout, breaking selectors
**Solution**:
- Use robust XPath selectors
- Add error handling per element
- Keep selector library maintainable
- Monitor and update regularly

### **Challenge 2: Rate Limiting**
**Problem**: Scraping too fast blocks IP
**Solution**:
- Add delays between requests (1-3 seconds)
- Rotate IP addresses if needed
- Use residential proxies
- Respect robots.txt

### **Challenge 3: Dynamic Content**
**Problem**: JavaScript-rendered content not visible to Cheerio
**Solution**:
- Use Puppeteer for JS-heavy sites
- Wait for elements to load
- Take screenshots for debugging
- Fall back to API if available

### **Challenge 4: Data Quality**
**Problem**: Inconsistent or missing data
**Solution**:
- Validate all scraped data
- Set reasonable value ranges
- Flag and skip outliers
- Manual verification of sample data

### **Challenge 5: Legal Issues**
**Problem**: Terms of service restrictions
**Solution**:
- Check robots.txt
- Review Terms of Service
- Consider using official APIs
- Use scraped data for internal analytics only
- Don't overload servers (throttle requests)

---

## 🧪 Testing Strategy

### **Unit Tests**
```javascript
// test/scrapers.test.js
describe('99acres Scraper', () => {
  it('should extract property data correctly', async () => {
    const data = await scraper.scrapeArea('Koramangala');
    expect(data).toHaveProperty('properties');
    expect(data.properties.length).toBeGreaterThan(0);
  });
});
```

### **Integration Tests**
```javascript
// test/integration.test.js
describe('PIN Code Aggregator', () => {
  it('should aggregate prices correctly', () => {
    const result = aggregator.aggregate(testData);
    expect(result['560034'].avg_price_sqft).toBeDefined();
  });
});
```

### **Data Validation Tests**
```javascript
// test/validation.test.js
describe('Data Validator', () => {
  it('should reject outliers', () => {
    const invalid = { price_sqft: 999999 };
    expect(validator.validate(invalid)).toBe(false);
  });
});
```

---

## 📋 Scraping Checklist

- [ ] Install Puppeteer & Cheerio
- [ ] Create base scraper class
- [ ] Implement 99acres scraper
- [ ] Implement Magicbricks scraper
- [ ] Implement Mysore scraper
- [ ] Create data parser
- [ ] Create PIN code aggregator
- [ ] Create database updater
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Validate scraped data
- [ ] Test with 100+ properties
- [ ] Verify PIN code coverage
- [ ] Update LEADS_DATABASE.json
- [ ] Update PINCODE_GUIDANCE_DATABASE.json
- [ ] Document results

---

## 🔒 Data Privacy & Legal

### **Considerations**:
- ✅ Use public data only
- ✅ Respect robots.txt
- ✅ Don't overload servers
- ✅ Include delays between requests
- ✅ Check Terms of Service
- ✅ Don't store buyer phone numbers permanently
- ⚠️ Use data for internal analytics only
- ⚠️ Don't republish scraped data

---

## 📦 Deliverables

### **At End of Phase:**

1. **Web Scraping Module**
   - `/api/scrapers/` directory
   - Multiple scraper implementations
   - Data parser & aggregator

2. **Updated Databases**
   - `PINCODE_GUIDANCE_DATABASE.json` (100+ PIN codes)
   - `LEADS_DATABASE.json` (100+ diverse leads)
   - Sample data verified

3. **Testing & Documentation**
   - Unit tests (80%+ coverage)
   - Integration tests
   - Data validation report
   - Scraping documentation

4. **Integration**
   - Scrapers callable via CLI
   - Scheduled scraping (optional)
   - Error logging & monitoring

---

## 🚀 Success Criteria

- [x] ✅ Agent Dashboard complete & tested
- [ ] 100+ PIN codes with pricing data
- [ ] 100+ diverse buyer leads
- [ ] All Mysore areas covered
- [ ] All major Bangalore areas covered
- [ ] Data validation passing
- [ ] Scrapers handling errors gracefully
- [ ] Documentation complete

---

## 📞 Next Steps

1. **Review** this plan with the team
2. **Set up** development environment with Puppeteer
3. **Start** with 99acres scraper (most comprehensive)
4. **Test** with small dataset (10-20 properties)
5. **Scale** to full scraping once validated
6. **Merge** data into existing databases
7. **Test** agent dashboard with new data

---

**Ready to begin web scraping phase! 🚀**

This phase will ensure PropBot has rich, diverse property data to provide agents with genuine buyer leads across Bangalore and Mysore.

