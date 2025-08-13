import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { CollectionSection } from '../components/CollectionSection';
import { ProductSection } from '../components/ProductSection';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Banner Slider */}
      <HeroSection />

      {/* Collection Section */}
      <CollectionSection />

      {/* Featured Products */}
      <ProductSection sectionType="featured" />

      {/* Trending Products */}
      <div className="bg-gray-50">
        <ProductSection sectionType="trending" />
      </div>

      {/* Newsletter/CTA Section */}
      <section className="py-16 bg-gradient-to-r from-brand-purple to-brand-emerald">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready for Your Next Event?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who trust CostumeRent for their special occasions. 
            Browse our collection and find the perfect costume today!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/products" className="bg-brand-gold hover:bg-brand-gold-dark text-white font-semibold px-8 py-3 rounded-full transition-colors duration-300 text-center">
              Browse All Costumes
            </a>
            <button className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white font-semibold px-8 py-3 rounded-full border border-white/30 transition-colors duration-300">
              Contact Us
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-purple to-brand-emerald rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">C</span>
                </div>
                <span className="text-xl font-bold">CostumeRent</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                Your trusted partner for costume rentals. We provide high-quality costumes 
                for all occasions with convenient delivery and pickup services.
              </p>
              <div className="flex space-x-4">
                <div className="w-8 h-8 bg-brand-purple rounded-full flex items-center justify-center">
                  <span className="text-xs">📱</span>
                </div>
                <div className="w-8 h-8 bg-brand-purple rounded-full flex items-center justify-center">
                  <span className="text-xs">📧</span>
                </div>
                <div className="w-8 h-8 bg-brand-purple rounded-full flex items-center justify-center">
                  <span className="text-xs">📘</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Size Guide</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Delivery Info</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Customer Service */}
            <div>
              <h3 className="font-semibold mb-4">Customer Service</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Return Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms & Conditions</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 CostumeRent. All rights reserved. Made with ❤️ for costume lovers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
