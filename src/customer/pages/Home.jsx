import React from 'react';
// import Hero from '../components/Hero';
import CategoryIcons from '../components/CategoryIcons';
import OfferBanner from '../components/Offerbanner';
// import BackgroundParticles from '../components/BackgroundParticles';
import FeaturedProducts from '../components/FeaturedProducts';
import TopRatedProducts from '../components/TopRatedProducts';
import WhyChooseUs from '../components/WhyChooseUs';
import PartnerLogos from '../components/PartnerLogos';
import AllProducts from '../components/Allproducts';
import VideoCarousel from '../components/VideoCarousel';

const Home = () => {
  return (
    // <div className="w-full" style={{ backgroundColor: 'black' }}>
    /* // <div className="w-full" style={{ backgroundColor: 'black' }}> */
    /* <div className="w-full" style={{ backgroundColor: '#202121' }}> */

    <div className="w-full" style={{ backgroundColor: 'black' }}>

      <div className="container mx-auto px-1 sm:px-1 lg:px-1">
        <div className="py-2 pg-white">
          <CategoryIcons />
        </div>
        <div className="py-0">
          <OfferBanner />
        </div>
        <div className="py-2.5">
          <FeaturedProducts />
        </div>
        <div className="py-2.5">
          <VideoCarousel />
        </div>
        <div className="py-2.5">
          <TopRatedProducts />
        </div>
        <div className="py-2.5">
          <WhyChooseUs />
        </div>
        {/* <div className="py-2.5">
          <PartnerLogos />
        </div> */}
        <div className="py-2.5">
          <AllProducts />
        </div>
      </div>
    </div>
  );
};

export default Home;
