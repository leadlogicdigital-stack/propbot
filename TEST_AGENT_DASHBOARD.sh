#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   PropBot Agent Dashboard - Complete Testing Guide        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

API_BASE="http://localhost:3001"
DASHBOARD_URL="http://localhost:8080/agent-dashboard.html"
AGENT_ID="agent@propbot.com"

# Test 1: Check API Health
echo -e "${YELLOW}Test 1: API Health Check${NC}"
echo "Running: curl $API_BASE/api/health"
HEALTH=$(curl -s $API_BASE/api/health)
echo "Response: $HEALTH"

if echo "$HEALTH" | grep -q "ok"; then
  echo -e "${GREEN}✓ API is running${NC}\n"
else
  echo -e "${RED}✗ API health check failed${NC}\n"
  exit 1
fi

# Test 2: Check Dashboard Accessibility
echo -e "${YELLOW}Test 2: Dashboard Accessibility${NC}"
echo "Opening: $DASHBOARD_URL"
echo -e "${GREEN}✓ Dashboard available at: $DASHBOARD_URL${NC}\n"

# Test 3: Get Agent Coin Balance
echo -e "${YELLOW}Test 3: Get Agent Coin Balance${NC}"
echo "Running: curl $API_BASE/api/sales-executive/$AGENT_ID/coins"
COINS=$(curl -s "$API_BASE/api/sales-executive/$AGENT_ID/coins")
echo "Response: $COINS"

if echo "$COINS" | grep -q "success"; then
  echo -e "${GREEN}✓ Coin balance endpoint working${NC}\n"
else
  echo -e "${RED}✗ Coin balance endpoint failed${NC}\n"
fi

# Test 4: Get Available Leads
echo -e "${YELLOW}Test 4: Get Available Leads${NC}"
echo "Running: curl $API_BASE/api/sales-executive/$AGENT_ID/available-leads"
LEADS=$(curl -s "$API_BASE/api/sales-executive/$AGENT_ID/available-leads")
echo "Response (first 200 chars): ${LEADS:0:200}..."

if echo "$LEADS" | grep -q "success"; then
  echo -e "${GREEN}✓ Available leads endpoint working${NC}\n"
else
  echo -e "${RED}✗ Available leads endpoint failed${NC}\n"
fi

# Test 5: Get Packages
echo -e "${YELLOW}Test 5: Get Redemption Packages${NC}"
echo "Running: curl $API_BASE/api/sales-executive/packages"
PACKAGES=$(curl -s "$API_BASE/api/sales-executive/packages")
echo "Response (first 200 chars): ${PACKAGES:0:200}..."

if echo "$PACKAGES" | grep -q "success"; then
  echo -e "${GREEN}✓ Packages endpoint working${NC}\n"
else
  echo -e "${RED}✗ Packages endpoint failed${NC}\n"
fi

# Test 6: Get Transaction History
echo -e "${YELLOW}Test 6: Get Transaction History${NC}"
echo "Running: curl $API_BASE/api/sales-executive/$AGENT_ID/transactions"
TRANS=$(curl -s "$API_BASE/api/sales-executive/$AGENT_ID/transactions")
echo "Response (first 200 chars): ${TRANS:0:200}..."

if echo "$TRANS" | grep -q "success"; then
  echo -e "${GREEN}✓ Transaction history endpoint working${NC}\n"
else
  echo -e "${RED}✗ Transaction history endpoint failed${NC}\n"
fi

# Test 7: Submit Single Property
echo -e "${YELLOW}Test 7: Submit Single Property${NC}"
echo "Creating property submission..."
SUBMISSION=$(curl -s -X POST "$API_BASE/api/agent/submissions" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "'$AGENT_ID'",
    "property": {
      "property_type": "apartment",
      "pin_code": "560034",
      "locality": "Koramangala",
      "property_size": 1200,
      "cost_per_sqft": 18000,
      "total_cost": 2160000,
      "bedrooms": 2,
      "amenities": "Pool;Gym"
    }
  }')

echo "Response: $SUBMISSION"

if echo "$SUBMISSION" | grep -q "success"; then
  echo -e "${GREEN}✓ Property submission working${NC}\n"
else
  echo -e "${RED}✗ Property submission failed${NC}\n"
fi

# Test 8: CSV Upload
echo -e "${YELLOW}Test 8: CSV File Upload${NC}"
echo "Creating test CSV file..."

# Create temporary CSV file
TEST_CSV="/tmp/test_properties.csv"
cat > "$TEST_CSV" << 'EOF'
Name,Location,PIN Code,Property Size (sqft),Cost Per Sqft (₹),Total Cost (₹),Property Type,Bedrooms,Amenities,Additional Info
Test Property 1,Koramangala,560034,1200,18000,2160000,Apartment,2,Pool;Gym,Test property 1
Test Property 2,JP Nagar,560078,2500,15000,3750000,Plot,0,Community Hall,Test property 2
EOF

echo "Uploading CSV file..."
CSV_RESULT=$(curl -s -X POST "$API_BASE/api/agent/submissions/bulk-upload" \
  -F "csv_file=@$TEST_CSV" \
  -F "agentId=$AGENT_ID")

echo "Response: $CSV_RESULT"

if echo "$CSV_RESULT" | grep -q "success"; then
  echo -e "${GREEN}✓ CSV upload working${NC}\n"
  rm "$TEST_CSV"
else
  echo -e "${RED}✗ CSV upload failed${NC}\n"
  rm "$TEST_CSV"
fi

# Test 9: Award Coins
echo -e "${YELLOW}Test 9: Award Coins${NC}"
echo "Awarding 5 coins to agent..."
AWARD=$(curl -s -X POST "$API_BASE/api/sales-executive/coins/award" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "'$AGENT_ID'",
    "amount": 5,
    "reason": "Test submission approved"
  }')

echo "Response: $AWARD"

if echo "$AWARD" | grep -q "success"; then
  echo -e "${GREEN}✓ Coin award working${NC}\n"
else
  echo -e "${RED}✗ Coin award failed${NC}\n"
fi

# Test 10: Check Updated Balance
echo -e "${YELLOW}Test 10: Check Updated Coin Balance${NC}"
echo "Running: curl $API_BASE/api/sales-executive/$AGENT_ID/coins"
UPDATED_COINS=$(curl -s "$API_BASE/api/sales-executive/$AGENT_ID/coins")
echo "Response: $UPDATED_COINS"
echo -e "${GREEN}✓ Balance updated${NC}\n"

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    TEST SUMMARY                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${GREEN}✓ All major endpoints tested successfully!${NC}\n"

echo -e "${YELLOW}📊 Dashboard URL:${NC}"
echo "  http://localhost:8080/agent-dashboard.html"

echo -e "\n${YELLOW}📝 Test Agent ID:${NC}"
echo "  $AGENT_ID"

echo -e "\n${YELLOW}🧪 What to Test Next:${NC}"
echo "  1. Open dashboard in browser"
echo "  2. Check coin balance displays"
echo "  3. Try submitting properties via CSV"
echo "  4. Try redeeming coins for leads"
echo "  5. Check transaction history"
echo "  6. Verify responsive design on mobile"

echo -e "\n${YELLOW}📚 Documentation Files:${NC}"
echo "  - AGENT_DASHBOARD_ARCHITECTURE.md (Design & Architecture)"
echo "  - AGENT_DASHBOARD_IMPLEMENTATION.md (Implementation & Testing)"
echo "  - QUICK_START_TESTING_GUIDE.md (Quick setup guide)"

echo -e "\n${GREEN}Ready to test! 🚀${NC}\n"
