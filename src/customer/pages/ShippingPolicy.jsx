import React from 'react'

const ShippingPolicy = () => {
  return (
    <>
      <div className='min-h-screen bg-black text-white py-12'>
        <div className='container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl'>
          {/* Header */}
          <div className='text-center mb-12'>
            <h1 className='text-4xl font-bold text-white mb-4'>Shipping Policy</h1>
            {/* <p className='text-lg text-white/80'>Website: <a href='https://bargaati.com' target='_blank' rel='noreferrer' className='text-blue-400 hover:underline'>https://bargaati.com</a></p> */}
            <div className='w-24 h-1 bg-white mx-auto mt-4'></div>
          </div>

          {/* Intro */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
            <p className='text-white/80 leading-relaxed'>
              At BARGAATI, we are committed to delivering your favorite jewelry safely and on time. This Shipping Policy explains how we handle processing, shipping, and delivery of your orders.
            </p>
          </div>

          {/* 1. Processing and Shipping Time */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
            <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
              <span className='bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>1</span>
              Processing and Shipping Time
            </h2>
            <ul className='list-disc ml-6 space-y-2 text-white/80 leading-relaxed'>
              <li>Orders are processed and shipped within 1–2 business days after payment confirmation.</li>
              <li>Orders placed on weekends or public holidays will be processed on the next working day.</li>
            </ul>
          </div>

          {/* 2. Delivery Timeline */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
            <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
              <span className='bg-green-100 text-green-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>2</span>
              Delivery Timeline
            </h2>
            <ul className='list-disc ml-6 space-y-2 text-white/80 leading-relaxed'>
              <li>Standard delivery within India: 3–7 business days (depending on location).</li>
              <li>Metro cities: 3–4 business days.</li>
              <li>Tier-2 & Tier-3 cities: 5–7 business days.</li>
              <li>Remote/Outstation areas: delivery may take up to 10 business days.</li>
            </ul>
          </div>

          {/* 3. Shipping Charges */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
            <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
              <span className='bg-purple-100 text-purple-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>3</span>
              Shipping Charges
            </h2>
            <ul className='list-disc ml-6 space-y-2 text-white/80 leading-relaxed'>
              <li>Free shipping on all prepaid orders above ₹1000.</li>
              <li>Standard shipping charges apply for orders below the free-shipping threshold and for Cash on Delivery (if applicable). Shipping charges will be displayed at checkout before payment.</li>
            </ul>
          </div>

          {/* 4. Order Tracking */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
            <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
              <span className='bg-orange-100 text-orange-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>4</span>
              Order Tracking
            </h2>
            <ul className='list-disc ml-6 space-y-2 text-white/80 leading-relaxed'>
              <li>Once shipped, you will receive an email/SMS with tracking details.</li>
              <li>You can track your order directly through the courier partner’s website or via the tracking link shared.</li>
            </ul>
          </div>

          {/* 5. Delays */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
            <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
              <span className='bg-yellow-100 text-yellow-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>5</span>
              Delays
            </h2>
            <p className='text-white/80 leading-relaxed'>While we strive to deliver on time, delays may occur due to:</p>
            <ul className='list-disc ml-6 mt-2 space-y-2 text-white/80 leading-relaxed'>
              <li>Natural calamities, strikes, or unforeseen logistics issues.</li>
              <li>Incorrect or incomplete delivery addresses provided by the customer.</li>
              <li>Public holidays or peak season rush (festivals, sales, etc.).</li>
            </ul>
            <p className='text-white/80 mt-3'>In such cases, we will keep you updated and work with our courier partners to ensure quick resolution.</p>
          </div>

          {/* 6. Contact Support */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8'>
            <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
              <span className='bg-teal-100 text-teal-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>6</span>
              Contact Support
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

export default ShippingPolicy
