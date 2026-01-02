import React, { useEffect, useRef } from 'react';
import { TbTruckDelivery, TbShieldCheck, TbHeadset, TbArrowBackUp, TbLock, TbUsers } from 'react-icons/tb';

const FeatureCard = ({ icon, title, description, index }) => {
  const cardRef = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0');
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );
    
    const currentRef = cardRef.current;
    
    if (currentRef) {
      observer.observe(currentRef);
    }
    
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);
  
  const colors = [
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-500',
    'from-green-400 to-cyan-500',
    'from-yellow-400 to-orange-500',
    'from-red-500 to-pink-600',
    'from-indigo-500 to-purple-600'
  ];
  
  // Define custom animations for each card
  const animations = [
    'hover:-rotate-2',
    'hover:rotate-2',
    'hover:scale-105',
    'hover:rotate-2',
    'hover:rotate-2'
  ];
  
  const gradientColor = colors[index % colors.length];
  const animation = animations[index % animations.length];
  const animationDelay = (index * 0.1).toFixed(1);
  
  return (
    <div 
      ref={cardRef}
      className={`flex flex-col items-center p-6  rounded-xl shadow-md hover:shadow-xl transition-all duration-500 relative z-10 
               bg-black-800/50 backdrop-blur-lg border border-gray-700 
                ${animation}`}
      style={{ transitionDelay: `${animationDelay}s` }}
    >
      <div className={`mb-1 p-2 rounded-full bg-gradient-to-br ${gradientColor} text-white shadow-lg transform transition-transform duration-300 hover:scale-110 hover:rotate-3`}>
        {React.createElement(icon, { className: 'text-3xl' })}
      </div>
      <h3 className="text-lg font-bold mb-3 text-gray-100 transition-colors duration-300 hover:text-amber-300">{title}</h3>
      <p className="text-gray-400 text-center text-sm">{description}</p>
    </div>
  );
};

const WhyChooseUs = () => {
  const features = [
    {
      icon: TbTruckDelivery,
      title: "Fast Delivery",
      description: "Get your order within 1-2 days"
    },
    {
      icon: TbShieldCheck,
      title: "Top Quality",
      description: "Only premium and verified items"
    },
    {
      icon: TbHeadset,
      title: "24/7 Support",
      description: "Always here to help, anytime"
    },
    {
      icon: TbArrowBackUp,
      title: "Easy Returns",
      description: "No questions asked 7-day returns"
    },
    {
      icon: TbLock,
      title: "Secure Payment",
      description: "100% safe and encrypted checkout"
    }
  ];

  return (
    <section className="bg-black-900 py-8 md:py-12 px-4 md:px-24 relative z-100 overflow-hidden">
      
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-900/50 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse animation-delay-0"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-pink-900/50 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse animation-delay-2000"></div>
      <div className="absolute -bottom-10 left-1/4 w-64 h-64 bg-purple-900/50 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse animation-delay-4000"></div>
      
      {/* Added floating shapes for modern aesthetic */}
      <div className="absolute top-40 right-10 w-20 h-20 bg-yellow-500/10 rounded-full opacity-20 animate-float"></div>
      <div className="absolute bottom-20 left-10 w-32 h-32 bg-blue-500/10 rounded-full opacity-20 animate-float animation-delay-3000"></div>
      <div className="absolute top-1/2 left-3/4 w-24 h-24 bg-green-500/10 rounded-lg rotate-45 opacity-20 animate-float animation-delay-1500"></div>

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-6">
          <h2 className="text-xl md:text-3xl font-extrabold text-amber-200 inline-block mb-4">
            Why Choose Us
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto font-semibold text-sm md:text-base">We pride ourselves on providing the best shopping experience with these amazing benefits</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-8 relative z-10">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              index={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
