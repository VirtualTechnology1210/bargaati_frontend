// favoritesPage.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import FavoritesComponent from '../components/favorites'; // Fix the typo: 'favorutes' -> 'favorites'
import BackgroundParticles from '../components/BackgroundParticles';

const FavoritesPage = () => {
  return (
    <>
      <BackgroundParticles />
      <FavoritesComponent />
    </>
  );
};

export default FavoritesPage;
