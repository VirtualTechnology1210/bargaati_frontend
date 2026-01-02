import React from 'react'

const TermAndConditions = () => {
  return (
    <>
      <div className='min-h-screen bg-black text-white py-12'>
        <div className='container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl'>
          {/* Header */}
          <div className='text-center mb-12'>
            <h1 className='text-4xl font-bold text-white mb-3'>Terms and Conditions</h1>
            {/* <p className='text-lg text-white/80'>Website: <a href='https://bargaati.com' target='_blank' rel='noreferrer' className='text-blue-400 hover:underline'>https://bargaati.com</a></p> */}
            <div className='w-24 h-1 bg-white mx-auto mt-4'></div>
          </div>

          {/* Introduction */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
            <p className='text-white/80 leading-relaxed'>
              Welcome to BARGAATI. These Terms and Conditions (“Terms”) govern your use of our Website and services. By accessing or purchasing from our Website, you agree to comply with and be bound by these Terms. If you do not agree, please discontinue using our Website.
            </p>
          </div>

          {/* 1. Eligibility */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
            <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
              <span className='bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>1</span>
              Eligibility
            </h2>
            <p className='text-white/80 leading-relaxed'>
              By using our Website, you confirm that you are at least 18 years old or are accessing it under the supervision of a parent or legal guardian.
            </p>
          </div>

          {/* 2. Products & Services */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
            <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
              <span className='bg-green-100 text-green-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>2</span>
              Products & Services
            </h2>
            <ul className='list-disc ml-6 space-y-2 text-white/80 leading-relaxed'>
              <li>
                BARGAATI is an online shopping platform offering jewellery and fashion accessories, including but not limited to necklaces, bangles, bracelets, earrings, and related products.
              </li>
              <li>
                All products are subject to availability. We reserve the right to limit quantities, discontinue products, or update prices at any time without notice.
              </li>
            </ul>
          </div>

          {/* 3. Orders & Payments */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
            <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
              <span className='bg-purple-100 text-purple-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>3</span>
              Orders & Payments
            </h2>
            <ul className='list-disc ml-6 space-y-2 text-white/80 leading-relaxed'>
              <li>Placing an order on our Website constitutes an offer to purchase. Orders are confirmed only after payment is received.</li>
              <li>You agree to provide accurate and complete information during checkout.</li>
              <li>Payments must be made using valid payment methods accepted on our Website.</li>
              <li>We reserve the right to refuse or cancel any order at our discretion, including cases of suspected fraud or incorrect pricing.</li>
            </ul>
          </div>

          {/* 4. Connectivity & Availability */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
            <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
              <span className='bg-indigo-100 text-indigo-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>4</span>
              Connectivity & Availability
            </h2>
            <ul className='list-disc ml-6 space-y-2 text-white/80 leading-relaxed'>
              <li>Access to the Website requires internet connectivity, which may be subject to the terms, conditions, and fees of your service provider.</li>
              <li>Certain services, features, or offers may be available only in select geographies, for a limited time, or may require separate subscriptions.</li>
            </ul>
          </div>

          {/* 5. Cancellations, Returns & Refunds */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
            <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
              <span className='bg-yellow-100 text-yellow-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>5</span>
              Cancellations, Returns & Refunds
            </h2>
            <p className='text-white/80 leading-relaxed'>
              Please review our <a href='/customer/RefundReturnPolicy' className='text-blue-400 hover:underline'>Cancellation, Return, and Refund Policy</a> for detailed terms regarding order cancellations, refunds, and product returns.
            </p>
          </div>

          {/* 6. Privacy & Data Protection */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
            <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
              <span className='bg-teal-100 text-teal-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>6</span>
              Privacy & Data Protection
            </h2>
            <ul className='list-disc ml-6 space-y-2 text-white/80 leading-relaxed'>
              <li>We value your privacy. Any personal data collected will be handled in accordance with our <a href='/customer/PrivacyPolicy' className='text-blue-400 hover:underline'>Privacy Policy</a>.</li>
              <li>By using our Website, you consent to the collection, storage, and use of your information for order processing, communication, and service improvement.</li>
            </ul>
          </div>

          {/* 7. Intellectual Property */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
            <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
              <span className='bg-pink-100 text-pink-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>7</span>
              Intellectual Property
            </h2>
            <ul className='list-disc ml-6 space-y-2 text-white/80 leading-relaxed'>
              <li>All content on this Website, including text, images, designs, product descriptions, and logos, are the intellectual property of BARGAATI unless otherwise stated.</li>
              <li>You may not copy, reproduce, sell, or distribute any content without prior written permission.</li>
            </ul>
          </div>

          {/* 8. User Responsibilities */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
            <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
              <span className='bg-orange-100 text-orange-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>8</span>
              User Responsibilities
            </h2>
            <p className='text-white/80 mb-3'>You agree not to:</p>
            <ul className='list-disc ml-6 space-y-2 text-white/80 leading-relaxed'>
              <li>Misuse the Website for unlawful purposes.</li>
              <li>Attempt unauthorized access to our systems or data.</li>
              <li>Provide false information while placing an order.</li>
            </ul>
          </div>

          {/* 9. Changes to Services & Terms */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
            <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
              <span className='bg-lime-100 text-lime-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>9</span>
              Changes to Services & Terms
            </h2>
            <ul className='list-disc ml-6 space-y-2 text-white/80 leading-relaxed'>
              <li>We reserve the right to update, suspend, or discontinue any product, feature, or service without notice.</li>
              <li>We may amend these Terms at any time by posting updated versions on the Website. Continued use of the Website constitutes acceptance of the revised Terms.</li>
            </ul>
          </div>

          {/* 10. Termination */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
            <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
              <span className='bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>10</span>
              Termination
            </h2>
            <p className='text-white/80 leading-relaxed'>
              We may restrict or terminate your access to the Website if you fail to comply with these Terms. In such cases, any pending obligations (including payments) will remain enforceable.
            </p>
          </div>

          {/* 11. Disclaimer of Warranties */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
            <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
              <span className='bg-rose-100 text-rose-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>11</span>
              Disclaimer of Warranties
            </h2>
            <ul className='list-disc ml-6 space-y-2 text-white/80 leading-relaxed'>
              <li>All products and services are provided on an “as is” and “as available” basis.</li>
              <li>We make no warranties, express or implied, regarding merchantability, fitness for a particular purpose, or non-infringement.</li>
            </ul>
          </div>

          {/* 12. Limitation of Liability */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
            <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
              <span className='bg-gray-100 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>12</span>
              Limitation of Liability
            </h2>
            <p className='text-white/80 leading-relaxed'>
              To the fullest extent permitted by law, BARGAATI shall not be liable for any direct, indirect, incidental, or consequential damages resulting from:
            </p>
            <ul className='list-disc ml-6 mt-3 space-y-2 text-white/80 leading-relaxed'>
              <li>Use or inability to use our Website,</li>
              <li>Delays or delivery failures by third-party partners,</li>
              <li>Unauthorized access to your information.</li>
            </ul>
          </div>

          {/* 13. Governing Law & Dispute Resolution */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
            <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
              <span className='bg-cyan-100 text-cyan-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>13</span>
              Governing Law & Dispute Resolution
            </h2>
            <ul className='list-disc ml-6 space-y-2 text-white/80 leading-relaxed'>
              <li>These Terms shall be governed by and construed in accordance with the laws of India.</li>
              <li>Any disputes shall be subject to the exclusive jurisdiction of the courts in Bangalore, India.</li>
            </ul>
          </div>

          {/* 14. Contact Information */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8'>
            <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
              <span className='bg-emerald-100 text-emerald-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>14</span>
              Contact Information
            </h2>
            <div className='text-white/80 leading-relaxed space-y-2'>
              <p className='font-semibold text-white'>BARGAATI</p>
              <p>Address : Varanasi Main Road, Opp to Sunny Layout, Maragondanahalli, Bengaluru, Karnataka - 560036</p>
              <p>Email : <a href='mailto:bargaati@gmail.com' className='text-blue-400 hover:underline'>bargaati@gmail.com</a></p>
              <p>Phone: <a href='tel:9740366124' className='text-blue-400 hover:underline'>9740366124</a></p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default TermAndConditions