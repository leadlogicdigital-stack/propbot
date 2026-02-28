const FeatureShowcase = () => {
  const features = [
    {
      icon: '📍',
      title: 'Distance-Based Accuracy',
      description: 'Concentric circles model calculates property value based on proximity to city center, ensuring market-realistic valuations.'
    },
    {
      icon: '📋',
      title: 'Government Guidance Values',
      description: 'Leverages official government guidance values as the foundation for all valuations, backed by real data.'
    },
    {
      icon: '⚡',
      title: 'Instant Estimates',
      description: 'Get property valuations in seconds. No forms, no calls, no waiting. Just enter property details and see results.'
    },
    {
      icon: '📱',
      title: 'Multiple Property Types',
      description: 'Support for apartments, plots, villas, commercial properties, and agricultural land across both cities.'
    },
    {
      icon: '💬',
      title: 'Lead Capture & Insights',
      description: 'Submit your details to get personalized investment recommendations and exclusive property market insights.'
    },
    {
      icon: '🔒',
      title: 'Data Privacy',
      description: 'Your personal information is secure and used only for property-related communications with our team.'
    }
  ];

  return (
    <section id="features" className="section bg-gray-50">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl font-bold mb-4">Why PropBot?</h2>
          <p className="text-lg text-gray-600">
            The most accurate property valuation tool for Bangalore & Mysore, powered by AI and government data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="card hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <div className="mt-20 bg-white rounded-lg shadow-lg p-12">
          <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: 1, title: 'Enter Details', desc: 'Tell us about your property' },
              { step: 2, title: 'Calculate', desc: 'AI analyzes distance & data' },
              { step: 3, title: 'Get Valuation', desc: 'Instant market estimate' },
              { step: 4, title: 'Get Insights', desc: 'Market recommendations' }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white font-bold text-lg mb-4">
                  {item.step}
                </div>
                <h4 className="font-bold mb-2">{item.title}</h4>
                <p className="text-sm text-gray-600">{item.desc}</p>
                {index < 3 && (
                  <div className="hidden md:block absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Algorithm Explanation */}
        <div className="mt-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl font-bold mb-6">Our Algorithm</h3>
            <ul className="space-y-4">
              {[
                'Uses concentric circles model with CBD at center',
                'Distance multipliers decrease from 1.0 (center) to 0.25 (25km)',
                'Incorporates government guidance values for each area',
                'Adjusts for property type, size, and specific amenities',
                'Achieves ±15-20% accuracy on MVP, ±10% with more data'
              ].map((item, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-600 font-bold mr-3">✓</span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg p-8">
            <div className="text-center mb-6">
              <h4 className="text-lg font-bold text-gray-800">Sample Valuation Breakdown</h4>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Base Price (Government)</span>
                <span className="font-bold">₹8,000/sq.ft</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Property Size</span>
                <span className="font-bold">1,200 sq.ft</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Distance Multiplier (5km)</span>
                <span className="font-bold">0.80x</span>
              </div>
              <div className="border-t border-gray-300 pt-3 mt-3 flex justify-between">
                <span className="font-bold text-gray-800">Estimated Value</span>
                <span className="font-bold text-blue-600 text-lg">₹76.8 Lakhs</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
