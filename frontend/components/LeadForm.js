import { useState } from 'react';
import axios from 'axios';

const LeadForm = ({ valuationData, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: valuationData?.city || 'bangalore',
    property_type: valuationData?.property_type || 'apartment',
    area_name: valuationData?.area_name || '',
    distance_km: valuationData?.distance_km || 5,
    estimate_min: valuationData?.estimate_min || 0,
    estimate_max: valuationData?.estimate_max || 0,
    confidence: valuationData?.confidence || '75-80%'
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
      // Validate required fields
      if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
        throw new Error('Please fill in all required fields');
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Basic phone validation (10-15 digits)
      const phoneRegex = /^\d{10,15}$/;
      if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
        throw new Error('Please enter a valid phone number');
      }

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        property_type: formData.property_type,
        area_name: formData.area_name,
        distance_km: formData.distance_km,
        estimate_min: formData.estimate_min,
        estimate_max: formData.estimate_max,
        confidence: formData.confidence
      };

      const response = await axios.post(`${API_BASE}/api/leads`, payload);

      if (response.data.success) {
        setSuccess(true);
        setFormData({
          name: '',
          email: '',
          phone: '',
          city: valuationData?.city || 'bangalore',
          property_type: valuationData?.property_type || 'apartment',
          area_name: valuationData?.area_name || '',
          distance_km: valuationData?.distance_km || 5,
          estimate_min: valuationData?.estimate_min || 0,
          estimate_max: valuationData?.estimate_max || 0,
          confidence: valuationData?.confidence || '75-80%'
        });

        // Close after 2 seconds
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 2000);
      } else {
        throw new Error(response.data.error || 'Failed to submit lead');
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold">Get Exclusive Insights</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl"
        >
          ✕
        </button>
      </div>

      {success ? (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">✅</div>
          <h4 className="text-xl font-bold text-green-600 mb-2">Lead Submitted Successfully!</h4>
          <p className="text-gray-600">We'll contact you soon with personalized property insights.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-gray-600 text-sm mb-4">
            Get property market insights, investment recommendations, and exclusive deals for your property.
          </p>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold mb-2">Full Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
              className="input-field"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold mb-2">Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              className="input-field"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold mb-2">Phone Number *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 98765 43210"
              className="input-field"
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Submitting...' : 'Get Insights'}
          </button>

          {/* Privacy Notice */}
          <p className="text-xs text-gray-500 text-center">
            We respect your privacy. Your information will be used only to contact you about this property valuation.
          </p>
        </form>
      )}
    </div>
  );
};

export default LeadForm;
