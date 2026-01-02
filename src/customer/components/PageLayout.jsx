import React from 'react';
import AnimatedBackground from './AnimatedBackground';

const PageLayout = ({ children }) => {
  return (
    <div className="min-h-screen relative bg-gray-50">
      <AnimatedBackground />
      <div className="relative z-10 px-2 sm:px-4 md:px-6">
        <div className="container mx-auto max-w-7xl px-2 sm:px-4 md:px-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageLayout; 
