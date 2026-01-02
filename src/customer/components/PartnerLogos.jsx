import React, { useEffect, useRef } from 'react';
import samsungLogo from '../assets/Samsung.png';
import sonyLogo from '../assets/Sony.png';
import godrejLogo from '../assets/godrej.png';
import lgLogo from '../assets/LG.png';
import philipsLogo from '../assets/Philips.png';
import boschLogo from '../assets/Bosch.png';


const PartnerLogo = ({ logo, name, index }) => {
  const logoRef = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'scale-100');
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );
    
    const currentRef = logoRef.current;
    
    if (currentRef) {
      observer.observe(currentRef);
    }
    
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);
  
  const animationDelay = (index * 0.1).toFixed(1);
  
  return (
    <div 
      ref={logoRef}
      className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-xl transition-all duration-500
                opacity-0 scale-90 hover:scale-110 group"
      style={{ transitionDelay: `${animationDelay}s` }}
    >
      <div className="w-full h-12 sm:h-16 flex items-center justify-center filter dark:invert">
        {logo}
      </div>
      <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-400 font-semibold group-hover:text-white transition-colors">{name}</p>
    </div>
  );
};

const PartnerLogos = () => {
  // SVG logos for popular brands in grayscale
  const partners = [
    {
      name: "Samsung",
      logo: (
       <img src={samsungLogo} />
      )
    },
    {
      name: "Sony",
      logo: (
       <img src={sonyLogo} />
      )
    },
    {
      name: "Godrej",
      logo: (
       <img src={godrejLogo} />
      )
    },
    {
      name: "LG",
      logo: (
       <img src={lgLogo} />
      )
    },
    {
      name: "Philips",
      logo: (
       <img src={philipsLogo} />
      )
    },
    {
      name: "Bosch",
      logo: (
       <img src={boschLogo} />
      )
    },
    
  ];

  return (
    <section className="bg-gray-900 py-8 sm:py-12 px-2 sm:px-4 md:px-24 relative z-10 overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-48 sm:w-64 h-48 sm:h-64 bg-blue-900/50 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-purple-900/50 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
      
      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-6 sm:mb-10">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-amber-200 inline-block mb-1 sm:mb-2">
            Our Successful Partners
          </h2>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
            Trusted by leading global brands to deliver exceptional quality and service
          </p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {partners.map((partner, index) => (
            <PartnerLogo
              key={index}
              index={index}
              logo={partner.logo}
              name={partner.name}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnerLogos;
