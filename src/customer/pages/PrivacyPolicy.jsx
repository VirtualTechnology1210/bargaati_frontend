import React from 'react'

const PrivacyPolicy = () => {
    return (
        <>
            <div className='min-h-screen bg-black text-white py-12'>
                <div className='container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl'>
                    {/* Header */}
                    <div className='text-center mb-12'>
                        <h1 className='text-4xl font-bold text-white mb-4'>Privacy Policy</h1>
                        {/* <p className='text-lg text-white/80'>Website: <a href='https://bargaati.com' target='_blank' rel='noreferrer' className='text-blue-400 hover:underline'>https://bargaati.com</a></p> */}
                        <div className='w-24 h-1 bg-white mx-auto mt-4'></div>
                    </div>

                    {/* Introduction */}
                    <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
                        <p className='text-white/80 leading-relaxed'>
                            At BARGAATI, we value the trust you place in us and recognize the importance of secure transactions and information privacy. This Privacy Policy describes how we collect, use, share, and protect your personal data when you visit or make a purchase from our Website.
                        </p>
                    </div>

                    {/* 1. Collection of Your Information */}
                    <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
                        <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
                            <span className='bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>1</span>
                            Collection of Your Information
                        </h2>
                        <div className='text-white/80 leading-relaxed space-y-4'>
                            <p>When you interact with our Website, we collect and store information that you provide to us from time to time. This may include:</p>
                            <ul className='list-disc ml-6 space-y-2'>
                                <li>Name, email address, phone number, billing and shipping address</li>
                                <li>Payment details (processed securely through third-party payment gateways)</li>
                                <li>Preferences and feedback shared through forms or communication channels</li>
                                <li>Order history and browsing activity on our Website</li>
                            </ul>
                            <p>We indicate which fields are mandatory and which are optional. Once you share your personal data, you are not anonymous to us.</p>
                        </div>
                    </div>

                    {/* 2. Use of Your Information */}
                    <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
                        <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
                            <span className='bg-green-100 text-green-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>2</span>
                            Use of Your Information
                        </h2>
                        <ul className='list-disc ml-6 space-y-2 text-white/80 leading-relaxed'>
                            <li>Process and deliver your orders</li>
                            <li>Communicate with you regarding orders, offers, and services</li>
                            <li>Facilitate payments and refunds</li>
                            <li>Provide customer support and resolve disputes</li>
                            <li>Enhance your shopping experience on our Website</li>
                            <li>Prevent fraud and ensure safe transactions</li>
                            <li>Comply with applicable legal and regulatory requirements</li>
                        </ul>
                        <p className='text-white/80 mt-4'>We may also use your data to send marketing and promotional communications. You will always have the option to opt out of receiving such messages.</p>
                    </div>

                    {/* 3. Additional Information We May Request */}
                    <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mb-8'>
                        <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
                            <span className='bg-purple-100 text-purple-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>3</span>
                            Additional Information We May Request
                        </h2>
                        <div className='space-y-4 text-white/80 leading-relaxed'>
                            <p>With your consent, we may request additional details such as:</p>
                            <ul className='list-disc ml-6 space-y-2'>
                                <li>Government-issued ID (for KYC verification if required by law)</li>
                                <li>GST number (for business invoices, if applicable)</li>
                            </ul>
                            <p>This information helps us to:</p>
                            <ul className='list-disc ml-6 space-y-2'>
                                <li>Issue invoices where legally required</li>
                                <li>Verify your eligibility for certain offers or services</li>
                                <li>Enhance your overall experience on our Website</li>
                            </ul>
                            <div className='bg-red-950/40 border border-red-500/30 rounded-lg p-4'>
                                <p className='text-red-200'>
                                    <strong>Important:</strong> You agree that BARGAATI shall not be responsible for misuse of your account where you fail to update your contact information (such as email or mobile number).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 4. Cookies */}
                    <div className='bg-neutral-900 rounded-lg border border-white/10 p-8'>
                        <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
                            <span className='bg-orange-100 text-orange-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>4</span>
                            Cookies
                        </h2>
                        <div className='text-white/80 leading-relaxed space-y-4'>
                            <div className='bg-blue-950/40 border border-blue-500/30 rounded-lg p-4'>
                                <h4 className='font-semibold text-blue-200 mb-2'>What are Cookies?</h4>
                                <p className='text-blue-200/90'>
                                    Cookies are small text files placed on your device that help us provide certain Website features. They do not contain personal information.
                                </p>
                            </div>

                            <div className='space-y-3'>
                                <h4 className='font-semibold text-white'>How We Use Cookies:</h4>
                                <ul className='list-disc ml-6 space-y-2'>
                                    <li>To keep you logged in and reduce the need to re-enter your password</li>
                                    <li>To analyze Website traffic and performance</li>
                                    <li>To personalize product recommendations and offers</li>
                                </ul>
                            </div>

                            <div className='bg-white/5 border border-white/10 rounded-lg p-4'>
                                <p className='text-white/80'>
                                    <strong>Your Choice:</strong> You may decline or delete cookies via your browser settings. However, some features of the Website may not function properly without cookies.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 5. Sharing of Information */}
                    <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mt-8'>
                        <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
                            <span className='bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>5</span>
                            Sharing of Information
                        </h2>
                        <ul className='list-disc ml-6 space-y-2 text-white/80 leading-relaxed'>
                            <li>We do not sell or rent your personal data to third parties.</li>
                            <li>We may share information with trusted service providers (such as delivery partners, payment gateways, and analytics tools) strictly for fulfilling your orders and improving our services.</li>
                            <li>We may disclose information if required by law or government authorities.</li>
                        </ul>
                    </div>

                    {/* 6. Data Security */}
                    <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mt-8'>
                        <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
                            <span className='bg-emerald-100 text-emerald-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>6</span>
                            Data Security
                        </h2>
                        <p className='text-white/80 leading-relaxed'>
                            We implement industry-standard measures to protect your personal data from unauthorized access, misuse, or disclosure. However, no system is 100% secure, and we cannot guarantee absolute security of your data.
                        </p>
                    </div>

                    {/* 7. Your Rights */}
                    <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mt-8'>
                        <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
                            <span className='bg-gray-100 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>7</span>
                            Your Rights
                        </h2>
                        <ul className='list-disc ml-6 space-y-2 text-white/80 leading-relaxed'>
                            <li>Access and update your personal information</li>
                            <li>Request deletion of your account and data (subject to legal obligations)</li>
                            <li>Opt out of marketing communications at any time</li>
                        </ul>
                    </div>

                    {/* 8. Changes to this Policy */}
                    <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mt-8'>
                        <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
                            <span className='bg-indigo-100 text-indigo-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>8</span>
                            Changes to this Policy
                        </h2>
                        <p className='text-white/80 leading-relaxed'>
                            We may update this Privacy Policy periodically. Any changes will be posted on this page with the updated effective date. Continued use of our Website after such changes constitutes your acceptance of the revised policy.
                        </p>
                    </div>

                    {/* 9. Contact Us */}
                    <div className='bg-neutral-900 rounded-lg border border-white/10 p-8 mt-8'>
                        <h2 className='text-2xl font-bold text-white mb-6 flex items-center'>
                            <span className='bg-teal-100 text-teal-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3'>9</span>
                            Contact Us
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

export default PrivacyPolicy;