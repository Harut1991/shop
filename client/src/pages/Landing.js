import React from 'react';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import Login from './Login';

const Landing = () => {
  const { user } = useAuth();

  // Show admin dashboard if logged in, otherwise show login
  // This allows each product domain to have its own admin at the root
  if (user) {
    return <AdminDashboard />;
  }
  
  return <Login />;
};

export default Landing;

