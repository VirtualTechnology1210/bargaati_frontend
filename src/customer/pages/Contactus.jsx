import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

const COMPANY_EMAIL = 'bargaati@gmail.com';   // TODO: replace
const COMPANY_PHONE = '9740366124';      // TODO: replace
const COMPANY_ADDRESS = 'Floor No.: Ground Floor, Building No./Flat No.: No.1,K H No.640/1,Road/Street: Vinayaka Green Park Layout,Varanasi Main Road,Opp to Sunny Layout,Nearby Landmark: Opp to Sunny Layout,Locality/Sub Locality: maragondanahalli,City/Town/Village: Bengaluru,District: Bengaluru Urban,State: Karnataka,PIN CODE:560036';
const MAP_EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d0!2d0!3d0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z!5e0!3m2!1sen!2sin!4v0000000000000'; // optional placeholder

export default function Contactus() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Contact from ${form.name || 'Customer'}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\n\nMessage:\n${form.message}`
    );
    window.location.href = `mailto:${COMPANY_EMAIL}?subject=${subject}&body=${body}`;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard');
    } catch {
      alert('Copy failed');
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-black text-white">
      <div className="container mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold">Contact Us</h1>
          <p className="text-white/70 mt-2">
            Have questions? We’re here to help. Reach us via phone, email, or the form below.
          </p>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info Cards */}
          <div className="space-y-4 lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-start gap-4">
              <div className="p-3 rounded-lg bg-white/10">
                <Phone size={20} />
              </div>
              <div className="flex-1">
                <div className="text-sm text-white/60">Phone</div>
                <div className="font-semibold text-white mt-1">{COMPANY_PHONE}</div>
                <div className="mt-3 flex gap-2">
                  <a
                    href={`tel:${COMPANY_PHONE.replace(/\\s/g, '')}`}
                    className="px-3 py-1.5 text-xs rounded-full bg-blue-600 hover:bg-blue-700 transition"
                  >
                    Call Now
                  </a>
                  <button
                    onClick={() => copyToClipboard(COMPANY_PHONE)}
                    className="px-3 py-1.5 text-xs rounded-full bg-white/10 hover:bg-white/20 transition"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-start gap-4">
              <div className="p-3 rounded-lg bg-white/10">
                <Mail size={20} />
              </div>
              <div className="flex-1">
                <div className="text-sm text-white/60">Email</div>
                <div className="font-semibold text-white mt-1">{COMPANY_EMAIL}</div>
                <div className="mt-3 flex gap-2">
                  <a
                    href={`mailto:${COMPANY_EMAIL}`}
                    className="px-3 py-1.5 text-xs rounded-full bg-blue-600 hover:bg-blue-700 transition"
                  >
                    Send Email
                  </a>
                  <button
                    onClick={() => copyToClipboard(COMPANY_EMAIL)}
                    className="px-3 py-1.5 text-xs rounded-full bg-white/10 hover:bg-white/20 transition"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            {COMPANY_ADDRESS && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-start gap-4">
                <div className="p-3 rounded-lg bg-white/10">
                  <MapPin size={20} />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white/60">Address</div>
                  <div className="font-semibold text-white mt-1 leading-relaxed">
                    {COMPANY_ADDRESS}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/70">Your Name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="mt-1 w-full px-3 py-2 bg-black border border-white/10 rounded-lg focus:ring-2 focus:ring-white/20 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/70">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    required
                    className="mt-1 w-full px-3 py-2 bg-black border border-white/10 rounded-lg focus:ring-2 focus:ring-white/20 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/70">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="mt-1 w-full px-3 py-2 bg-black border border-white/10 rounded-lg focus:ring-2 focus:ring-white/20 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-white/70">Message</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={5}
                    placeholder="How can we help you?"
                    className="mt-1 w-full px-3 py-2 bg-black border border-white/10 rounded-lg focus:ring-2 focus:ring-white/20 outline-none resize-y"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 transition font-semibold"
                >
                  <Send size={16} />
                  Send Message
                </button>
              </div>
            </form>

            {/* Map */}
            {MAP_EMBED_URL && (
              <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <iframe
                  title="Map"
                  src={MAP_EMBED_URL}
                  width="100%"
                  height="280"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}