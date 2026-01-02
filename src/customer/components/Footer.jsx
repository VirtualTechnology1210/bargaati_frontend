import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, Send, ArrowRight } from 'lucide-react';
// import BackgroundParticles from './BackgroundParticles';

const Footer = () => {
  return (
    <footer className="bg-black text-white py-8 z-0 border-t border-white/10">
      <div className="container mx-auto px-4 w-[95%]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {/* About Us Column */}
          <div>
            <Link to="/customer" className="flex items-center group">
              <img
                src="/IMG_1624.PNG"
                alt="Logo"
                className="h-16 sm:h-20 md:h-24 w-48 sm:w-56 md:w-64 object-cover object-center ml-1"
                loading="eager"
                decoding="async"
              />
            </Link>
            <p className="text-white/80 mb-6 leading-relaxed">
              Elevating everyday style with premium fashion essentials designed for modern living.
            </p>
            <div className="flex space-x-6">
              <a href="#" className="text-white hover:text-white/80 transition-colors group">
                <Facebook size={24} className="group-hover:animate-pulse" />
              </a>
              <a href="#" className="text-white hover:text-white/80 transition-colors group">
                <Instagram size={24} className="group-hover:animate-pulse" />
              </a>
              <a href="#" className="text-white hover:text-white/80 transition-colors group">
                <Youtube size={24} className="group-hover:animate-pulse" />
              </a>
            </div>
          </div>

          {/* Customer Care Column */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Customer Care</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/customer/about-us" className="text-white/80 hover:text-white transition-all duration-300 relative inline-block">
                  About Us
                </Link>
              </li>
              <li>
                <a href="/customer/orders" className="text-white/80 hover:text-white transition-all duration-300 relative inline-block">
                  Track Your Order
                </a>
              </li>

              <li>
                <a href="/customer/orders" className="text-white/80 hover:text-white transition-all duration-300 relative inline-block">
                  Shipping Information
                </a>
              </li>
              <li>
                <a href="/customer/Contactus" className="text-white/80 hover:text-white transition-all duration-300 relative inline-block">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Policy Column */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Policies</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/customer/PrivacyPolicy" className="text-white/80 hover:text-white transition-all duration-300 relative inline-block">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/customer/Termandconditions" className="text-white/80 hover:text-white transition-all duration-300 relative inline-block">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/customer/RefundReturnPolicy" className="text-white/80 hover:text-white transition-all duration-300 relative inline-block">
                  Refund & Return Policy
                </Link>
              </li>
              <li>
                <Link to="/customer/ShippingPolicy" className="text-white/80 hover:text-white transition-all duration-300 relative inline-block">
                  Shipping Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect Column */}
          {/* <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Connect With Us</h3>
            <p className="text-white/90 mb-4 leading-relaxed">
              Subscribe to receive updates, access to exclusive deals, and more.
            </p>
            <div className="relative">
              <input
                type="email"
                placeholder="Your email address"
                className="bg-white/10 w-full text-white placeholder-white/60 px-4 py-3 rounded-md focus:outline-none focus:ring-2 focus:ring-white/30 transition-all duration-300"
              />
              <button
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white text-black p-2 rounded-full hover:bg-white/90 transition-all duration-300"
                aria-label="Subscribe"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-white/70 text-sm mt-3 leading-relaxed">
              By subscribing, you agree to our Privacy Policy and consent to receive updates from our company.
            </p>
          </div> */}
        </div>

        {/* Bottom Section */}
        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-white/70 hover:text-white transition-colors">
            © {new Date().getFullYear()} BARGAATI . All rights reserved.
          </p>
          <div className="flex space-x-8 mt-4 md:mt-0">
            <Link to="/customer/Termandconditions" className="text-sm text-white/80 hover:text-white transition-all duration-300">
              Terms
            </Link>
            <Link to="/customer/PrivacyPolicy" className="text-sm text-white/80 hover:text-white transition-all duration-300">
              Privacy
            </Link>
            <Link to="/customer/ShippingPolicy" className="text-sm text-white/80 hover:text-white transition-all duration-300">
              Shipping
            </Link>
            <a href="#" className="text-sm text-white/80 hover:text-white transition-all duration-300">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;