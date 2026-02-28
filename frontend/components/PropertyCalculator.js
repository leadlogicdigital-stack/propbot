import { useState } from 'react';
import axios from 'axios';

const PropertyCalculator = ({ onValuationComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [formData, setFormData] = useState({
    city: 'bangalore',
    property_type: 'apartment',
    sqft: '',
    acres: '',
    distance_km: '5',
    bedrooms: '2',
    area_name: ''
  });

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate inputs
      if (!formData.city || !formData.property_type) {
        throw new Error('Please select city and property type');
      }

      if (formData.property_type === 'apartment' && !formData.sqft) {
        throw new Error('Please enter property size in sq.ft');
      }

      if ((formData.property_type === 'villa' || formData.property_type === 'agricultural') && !formData.acres) {
        throw new Error('Please enter property size in acres');
      }

      const payload = {
        city: formData.city,
        property_type: formData.property_type,
        sqft: formData.sqft ? parseInt(formData.sqft) : undefined,
        acres: formData.acres ? parseFloat(formData.acres) : undefined,
        distance_km: formData.distance_km ? parseInt(formData.distance_km) : 5,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
        area_name: formData.area_name || undefined
      };

      const response = await axios.post(`${API_BASE}/api/valuate`, payload);

      if (response.data.success) {
        setResult(response.data.data);
        onValuationComplete(response.data.data);
      } else {
        throw new Error(response.data.error || 'Valuation failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const propertyTypes = {
    apartment: 'Apartment',
    plot: 'Plot',
    villa: 'Villa',
    commercial: 'Commercial',
    agricultural: 'Agricultural Land'
  };

  const cities = {
    bangalore: 'Bangalore',
    mysore: 'Mysore'
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Calculator Form */}
      <div className="card">
        <h3 className="text-2xl font-bold mb-6">Property Details</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* City */}
          <div>
            <label className="block text-sm font-semibold mb-2">City</label>
            <select
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="input-field"
            >
              {Object.entries(cities).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Property Type */}
          <div>
            <label className="block text-sm font-semibold mb-2">Property Type</label>
            <select
              name="property_type"
              value={formData.property_type}
              onChange={handleChange}
              className="input-field"
            >
              {Object.entries(propertyTypes).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Size Input - Dynamic based on property type */}
          {(formData.property_type === 'apartment' || formData.property_type === 'plot' || formData.property_type === 'commercial') ? (
            <div>
              <label className="block text-sm font-semibold mb-2">Size (sq.ft)</label>
              <input
                type="number"
                name="sqft"
                value={formData.sqft}
                onChange={handleChange}
                placeholder="e.g., 1200"
                className="input-field"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold mb-2">Size (acres)</label>
              <input
                type="number"
                step="0.1"
                name="acres"
                value={formData.acres}
                onChange={handleChange}
                placeholder="e.g., 2.5"
                className="input-field"
              />
            </div>
          )}

          {/* Bedrooms - Only for apartments */}
          {formData.property_type === 'apartment' && (
            <div>
              <label className="block text-sm font-semibold mb-2">Bedrooms</label>
              <select
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleChange}
                className="input-field"
              >
                <option value="1">1 BHK</option>
                <option value="2">2 BHK</option>
                <option value="3">3 BHK</option>
                <option value="4">4 BHK</option>
                <option value="5">5+ BHK</option>
              </select>
            </div>
          )}

          {/* Distance from CBD */}
          <div>
            <label className="block text-sm font-semibold mb-2">Distance from City Center (km)</label>
            <input
              type="number"
              step="0.5"
              name="distance_km"
              value={formData.distance_km}
              onChange={handleChange}
              placeholder="e.g., 5"
              className="input-field"
            />
          </div>

          {/* Area Name */}
          <div>
            <label className="block text-sm font-semibold mb-2">Area Name (Optional)</label>
            <input
              type="text"
              name="area_name"
              value={formData.area_name}
              onChange={handleChange}
              placeholder="e.g., Whitefield, Vijayanagar"
              className="input-field"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full text-lg"
          >
            {loading ? 'Calculating...' : 'Get Valuation'}
          </button>
        </form>
      </div>

      {/* Results Section */}
      <div>
        {result ? (
          <div className="card">
            <h3 className="text-2xl font-bold mb-6">Valuation Result</h3>

            <div className="space-y-4">
              {/* Main Estimate */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200">
                <p className="text-sm text-gray-600 mb-2">Estimated Value</p>
                <p className="text-4xl font-bold text-blue-600 mb-2">
                  ₹{(result.estimate_mid / 10000000).toFixed(2)} Cr
                </p>
                <p className="text-sm text-gray-600">
                  (₹{(result.estimate_min / 100000).toFixed(0)}L - ₹{(result.estimate_max / 100000).toFixed(0)}L)
                </p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border-l-4 border-blue-600 pl-4">
                  <p className="text-xs text-gray-600 mb-1">Property Type</p>
                  <p className="font-semibold capitalize">{result.property_type}</p>
                </div>
                <div className="border-l-4 border-blue-600 pl-4">
                  <p className="text-xs text-gray-600 mb-1">Price per Sq.ft</p>
                  <p className="font-semibold">₹{result.price_per_sqft?.toLocaleString()}</p>
                </div>
                <div className="border-l-4 border-blue-600 pl-4">
                  <p className="text-xs text-gray-600 mb-1">Distance from CBD</p>
                  <p className="font-semibold">{result.distance_km} km</p>
                </div>
                <div className="border-l-4 border-blue-600 pl-4">
                  <p className="text-xs text-gray-600 mb-1">Confidence</p>
                  <p className="font-semibold">{result.confidence}</p>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">
                <strong>Disclaimer:</strong> This is an AI-powered estimate based on government guidance values and market analysis. Actual property values may vary based on condition, amenities, and local market factors.
              </div>

              {/* Lead Form CTA */}
              <button
                onClick={() => onValuationComplete(result)}
                className="btn btn-primary w-full"
              >
                Get More Details & Exclusive Insights
              </button>
            </div>
          </div>
        ) : (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-gray-600">Enter property details on the left to get an instant valuation</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyCalculator;
