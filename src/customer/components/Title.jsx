import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BASE_URL } from '../../util';

const Title = () => {
  const [offerTitles, setOfferTitles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchActiveOfferTitles = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/offertitle/getactiveoffertitle`);
        setOfferTitles(response.data);
      } catch (error) {
        console.error('Error fetching active offer titles:', error);
      }
    };

    fetchActiveOfferTitles();
  }, []);

  useEffect(() => {
    if (offerTitles.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % offerTitles.length);
      }, 6000); // Change slide every 3 seconds
      return () => clearInterval(interval);
    }
  }, [offerTitles.length]);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % offerTitles.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + offerTitles.length) % offerTitles.length);
  };

  if (offerTitles.length === 0) {
    return null;
  }

  return (
    // <div className="relative bg-black text-white text-center m-0.3 flex items-center justify-between">
    //   <button onClick={prevSlide} className="absolute left-0 p-2 by-2 text-white">&#10094;</button>
    //   <p className="font-semibold m-1.5 h-6 fs-6 w-full font-playfair">{offerTitles[currentIndex]?.title}</p>
    //   <button onClick={nextSlide} className="absolute right-0 p-1 fw-light by-2 text-white">&#10095;</button>
    // </div>

    <div className="relative bg-gray-800 text-white text-center m-0.3 flex items-center justify-between">
      <button
        onClick={prevSlide}
        className="absolute left-0 p-2 text-white/60 hover:text-white transition"
      >
        &#10094;
      </button>

      <p className="font-family: 'Playfair Display'; m-1.5 h-6 fs-6 w-full font-playfair">
        {offerTitles[currentIndex]?.title}
      </p>

      <button
        onClick={nextSlide}
        className="absolute right-0 p-2 text-white/60 hover:text-white transition"
      >
        &#10095;
      </button>
    </div>

  );
};

export default Title;
