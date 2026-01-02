import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './NavBar';
import Footer from './Footer';
import Title from './Title';

// CustomerLayout component for wrapping customer-facing pages
const CustomerLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Title />
      <Navbar />
      <main className="flex-grow pt-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default CustomerLayout;