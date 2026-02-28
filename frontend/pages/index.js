import Head from 'next/head';
import { useState } from 'react';
import PropertyCalculator from '../components/PropertyCalculator';
import LeadForm from '../components/LeadForm';
import FeatureShowcase from '../components/FeatureShowcase';

export default function Home() {
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [valuationData, setValuationData] = useState(null);

  const handleValuationComplete = (data) => {
    setValuationData(data);
    setShowLeadForm(true);
  };

  return (
    <>
      <Head>
        <title>PropBot - Know Your Property Worth in 30 Seconds</title>
        <meta name="description" content="Instant AI-powered property valuations for Bangalore & Mysore using government guidance values." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container flex justify-between items-center py-4">
          <div className="text-2xl font-bold text-blue-600">🏠 PropBot</div>
          <div className="flex gap-4">
            <a href="#features" className="text-gray-600 hover:text-blue-600">Features</a>
            <a href="#faq" className="text-gray-600 hover:text-blue-600">FAQ</a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="section bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Know Your Property Worth in 30 Seconds
            </h1>
            <p className="text-xl text-gray-700 mb-8">
              AI-powered instant valuations for apartments, plots, villas & more in Bangalore & Mysore. Government guidance values, distance-based accuracy.
            </p>
            <button
              onClick={() => document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' })}
              className="btn btn-primary text-lg"
            >
              Get Free Valuation →
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="card text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">50K+</div>
              <p className="text-gray-600">Properties Valued</p>
            </div>
            <div className="card text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">±15%</div>
              <p className="text-gray-600">Accuracy Margin</p>
            </div>
            <div className="card text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">2 Cities</div>
              <p className="text-gray-600">Bangalore & Mysore</p>
            </div>
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section id="calculator" className="section">
        <div className="container">
          <h2 className="text-4xl font-bold text-center mb-12">Instant Property Valuation</h2>
          <PropertyCalculator onValuationComplete={handleValuationComplete} />
        </div>
      </section>

      {/* Lead Form Modal */}
      {showLeadForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <LeadForm
              valuationData={valuationData}
              onClose={() => setShowLeadForm(false)}
            />
          </div>
        </div>
      )}

      {/* Features Section */}
      <FeatureShowcase />

      {/* CTA Section */}
      <section className="section bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="container text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Valuate Your Property?</h2>
          <p className="text-xl mb-8">Get instant AI-powered estimates backed by government guidance values.</p>
          <button
            onClick={() => document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' })}
            className="btn btn-primary bg-white text-blue-600 hover:bg-gray-100"
          >
            Start Free Valuation
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-bold mb-4">PropBot</h3>
              <p className="text-gray-400">AI-powered property valuations for India.</p>
            </div>
            <div>
              <h4 className="text-sm font-bold mb-4">PRODUCT</h4>
              <ul className="text-gray-400 space-y-2">
                <li><a href="#" className="hover:text-white">Valuations</a></li>
                <li><a href="#" className="hover:text-white">Lead Capture</a></li>
                <li><a href="#" className="hover:text-white">API Docs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold mb-4">COMPANY</h4>
              <ul className="text-gray-400 space-y-2">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold mb-4">LEGAL</h4>
              <ul className="text-gray-400 space-y-2">
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8">
            <p className="text-center text-gray-400">© 2026 PropBot. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
