import React from "react";

const AboutUs = () => {
  return (
    <>
      <div className='min-h-screen bg-black text-white py-12'>
        <div className='container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl'>
          {/* Header */}
          <div className='text-center mb-12'>
            <h1 className='text-4xl font-bold text-white mb-4'>About Us</h1>
            <div className='w-24 h-1 bg-white mx-auto mt-4'></div>
          </div>

          {/* About content card */}
          <div className='bg-neutral-900 rounded-lg border border-white/10 p-8'>
            <p className='text-white/80 leading-relaxed'>
              At Bargatti, we believe style should be effortless and accessible. From the beginning, our mission
              has been simple: create quality essentials that fit your life—beautifully and reliably. We’re proud
              of our roots, our growth, and the community that inspires us. Thank you for being part of our story.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AboutUs;
