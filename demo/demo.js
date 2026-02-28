// Mock valuation data based on algorithm
const getValuation = (city, propertyType, size, distance) => {
  const CITY_BASES = {
    bangalore: 5000,  // ₹ per sq.ft
    mysore: 4000      // ₹ per sq.ft
  };

  const TYPE_MULTIPLIERS = {
    apartment: 1.2,
    plot: 0.9,
    villa: 1.5,
    commercial: 1.8,
    agricultural: 0.4
  };

  // Distance multiplier (concentric circles)
  let distanceMultiplier = 1.0;
  if (distance > 25) distanceMultiplier = 0.25;
  else if (distance > 15) distanceMultiplier = 0.4;
  else if (distance > 10) distanceMultiplier = 0.6;
  else if (distance > 5) distanceMultiplier = 0.8;
  else if (distance > 2) distanceMultiplier = 0.95;

  // Calculate base price
  const basePrice = CITY_BASES[city] || 5000;
  const pricePerSqft = basePrice * TYPE_MULTIPLIERS[propertyType] * distanceMultiplier;

  // Calculate total value
  const estimateMin = pricePerSqft * size * 0.85;  // -15% variance
  const estimateMid = pricePerSqft * size;
  const estimateMax = pricePerSqft * size * 1.15;  // +15% variance

  // Determine confidence based on distance
  let confidence = '75-80%';
  if (distance < 5) confidence = '80-85%';
  if (distance > 15) confidence = '65-70%';

  return {
    property_type: propertyType,
    price_per_sqft: Math.round(pricePerSqft),
    estimate_min: Math.round(estimateMin),
    estimate_mid: Math.round(estimateMid),
    estimate_max: Math.round(estimateMax),
    distance_km: distance,
    confidence: confidence
  };
};

// Update size label based on property type
function updateSizeLabel() {
  const propertyType = document.getElementById('property_type').value;
  const sizeLabel = document.getElementById('sizeLabel');
  const sizeInput = document.getElementById('size');
  const bedroomsGroup = document.getElementById('bedroomsGroup');

  if (propertyType === 'villa' || propertyType === 'agricultural') {
    sizeLabel.textContent = 'Size (acres)';
    sizeInput.placeholder = 'e.g., 2.5';
    sizeInput.step = '0.1';
    bedroomsGroup.style.display = 'none';
  } else {
    sizeLabel.textContent = 'Size (sq.ft)';
    sizeInput.placeholder = 'e.g., 1200';
    sizeInput.step = '1';
    if (propertyType === 'apartment') {
      bedroomsGroup.style.display = 'block';
    } else {
      bedroomsGroup.style.display = 'none';
    }
  }
}

// Calculate valuation
function calculateValuation(event) {
  event.preventDefault();

  const city = document.getElementById('city').value;
  const propertyType = document.getElementById('property_type').value;
  const size = parseFloat(document.getElementById('size').value);
  const distance = parseFloat(document.getElementById('distance').value);

  if (!size || size <= 0) {
    alert('Please enter a valid property size');
    return;
  }

  // Get valuation
  const result = getValuation(city, propertyType, size, distance);

  // Display results
  displayResults(result);
}

// Display results
function displayResults(result) {
  const resultsContainer = document.getElementById('resultsContainer');
  const emptyState = document.getElementById('emptyState');

  // Format and display values
  document.getElementById('resultValue').textContent =
    `₹${(result.estimate_mid / 10000000).toFixed(2)} Cr`;

  document.getElementById('resultRange').textContent =
    `₹${(result.estimate_min / 100000).toFixed(0)}L - ₹${(result.estimate_max / 100000).toFixed(0)}L`;

  document.getElementById('resultType').textContent =
    result.property_type.charAt(0).toUpperCase() + result.property_type.slice(1);

  document.getElementById('resultPricePerSqft').textContent =
    `₹${result.price_per_sqft.toLocaleString()}`;

  document.getElementById('resultDistance').textContent =
    `${result.distance_km} km`;

  document.getElementById('resultConfidence').textContent =
    result.confidence;

  // Show/hide elements
  resultsContainer.style.display = 'block';
  emptyState.style.display = 'none';

  // Store result for lead form
  window.lastValuation = result;
}

// Lead form handlers
function openLeadForm() {
  document.getElementById('leadFormModal').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeLeadForm() {
  document.getElementById('leadFormModal').classList.remove('show');
  document.body.style.overflow = 'auto';
  resetLeadForm();
}

function resetLeadForm() {
  document.getElementById('leadForm').reset();
  document.getElementById('leadError').classList.add('hidden');
  document.getElementById('leadFormContent').style.display = 'block';
  document.getElementById('leadSuccess').classList.add('hidden');
}

function submitLead(event) {
  event.preventDefault();

  const name = document.getElementById('leadName').value.trim();
  const email = document.getElementById('leadEmail').value.trim();
  const phone = document.getElementById('leadPhone').value.trim();

  const errorDiv = document.getElementById('leadError');

  // Validate
  if (!name || !email || !phone) {
    errorDiv.textContent = 'Please fill in all fields';
    errorDiv.classList.remove('hidden');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errorDiv.textContent = 'Please enter a valid email';
    errorDiv.classList.remove('hidden');
    return;
  }

  // In demo, just show success
  console.log('Lead submitted:', { name, email, phone });

  document.getElementById('leadFormContent').style.display = 'none';
  document.getElementById('leadSuccess').classList.remove('hidden');

  setTimeout(() => {
    closeLeadForm();
  }, 2000);
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
  const modal = document.getElementById('leadFormModal');
  if (e.target === modal) {
    closeLeadForm();
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  updateSizeLabel();
});
