import React from 'react'

const RefundReturnPolicy = () => {
    return (
        <>
            <div className='min-h-screen bg-black text-white py-12'>
                <div className='container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl'>
                    {/* Header */}
                    <div className='text-center mb-12'>
                        <h1 className='text-4xl font-bold text-white mb-4'>Return & Refund Policy</h1>
                        {/* <p className='text-lg text-white/80'>Website: <a href='https://bargaati.com' target='_blank' rel='noreferrer' className='text-blue-400 hover:underline'>https://bargaati.com</a></p> */}
                        <div className='w-24 h-1 bg-white mx-auto mt-4'></div>
                    </div>

                    {/* Introduction */}
                    <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
                        <p className='text-white/80 leading-relaxed'>
                            At BARGAATI, we want you to love your jewelry. If for any reason you are not satisfied, we offer a refund or exchange within <strong>2 days</strong> from the date of delivery, subject to the terms below.
                        </p>
                    </div>

                    {/* 1. Eligibility for Returns/Exchanges */}
                    <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
                        <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
                            <span className='bg-green-100 text-green-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>1</span>
                            Eligibility for Returns/Exchanges
                        </h2>
                        <div className='space-y-4 text-white/80 leading-relaxed'>
                            <div className='flex items-start space-x-3'>
                                <span className='bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-1'>1</span>
                                <p>The item must be <strong>unused</strong>, unworn, and in the same condition as received.</p>
                            </div>
                            <div className='flex items-start space-x-3'>
                                <span className='bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-1'>2</span>
                                <p>It must include all <strong>original packaging</strong> (including jewelry boxes and protective covers).</p>
                            </div>
                            <div className='flex items-start space-x-3'>
                                <span className='bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-1'>3</span>
                                <p><strong>Sale items</strong> may not be eligible for return/exchange unless defective or damaged.</p>
                            </div>
                        </div>
                    </div>

                    {/* 2. Mandatory Unboxing Video */}
                    <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
                        <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
                            <span className='bg-purple-100 text-purple-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>2</span>
                            Mandatory Unboxing Video
                        </h2>
                        <ul className='list-disc ml-6 space-y-2 text-white/80 leading-relaxed'>
                            <li>A continuous, unedited unboxing video (from opening the sealed package to showing the product fully) is mandatory.</li>
                            <li>Requests without proper video proof will be declined immediately.</li>
                            <li>Products damaged due to mishandling after delivery will not be accepted for return or refund.</li>
                        </ul>
                    </div>

                    {/* 3. Non-Returnable Items */}
                    <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
                        <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
                            <span className='bg-orange-100 text-orange-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>3</span>
                            Non-Returnable Items
                        </h2>
                        <p className='text-white/80 leading-relaxed'>
                            Certain categories (such as personalized, customized, or hygiene-sensitive products) are non-returnable/non-refundable. These will be clearly mentioned at the time of purchase.
                        </p>
                    </div>

                    {/* 4. Refunds */}
                    <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
                        <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
                            <span className='bg-rose-100 text-rose-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>4</span>
                            Refunds
                        </h2>
                        <ul className='list-disc ml-6 space-y-2 text-white/80 leading-relaxed'>
                            <li>Once your return is received and inspected, we will send you an email notification.</li>
                            <li>If approved, refunds will be credited within <strong>2–3 business days</strong> to the original payment method.</li>
                        </ul>
                    </div>

                    {/* 5. Exchanges */}
                    <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
                        <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
                            <span className='bg-green-100 text-green-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>5</span>
                            Exchanges
                        </h2>
                        <ul className='list-disc ml-6 space-y-2 text-white/80 leading-relaxed'>
                            <li>If approved for exchange, the replacement product will be shipped and delivered within <strong>3–5 business days</strong> after we receive and inspect the returned item.</li>
                            <li>Delivery timelines may vary depending on your location and courier availability.</li>
                            <li>You will be notified via email/SMS once your exchange order has been dispatched along with tracking details.</li>
                        </ul>
                    </div>

                    {/* 6. How to Request a Return/Exchange */}
                    <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
                        <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
                            <span className='bg-cyan-100 text-cyan-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>6</span>
                            How to Request a Return/Exchange
                        </h2>
                        <ol className='list-decimal ml-6 space-y-2 text-white/80 leading-relaxed'>
                            <li>Contact us within <strong>2 days of delivery</strong> via email or phone.</li>
                            <li>Provide your order details and the unboxing video.</li>
                            <li>Ship the product back to us in its original condition and packaging (return shipping details will be shared upon approval).</li>
                        </ol>
                    </div>

                    {/* 7. Contact Support */}
                    <div className='bg-neutral-900 rounded-lg border border-white/10 p-8'>
                        <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
                            <span className='bg-indigo-100 text-indigo-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>7</span>
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

export default RefundReturnPolicy;