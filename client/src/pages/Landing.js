import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, Typography, Spin } from 'antd';

const { Title, Paragraph } = Typography;

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // If user is logged in, redirect to admin
    if (user) {
      navigate('/admin', { replace: true });
    } else {
      // If not logged in, redirect to login
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '20px'
    }}>
      <Card>
        <Spin size="large" />
        <Title level={4} style={{ marginTop: '20px', textAlign: 'center' }}>
          Loading...
        </Title>
      </Card>
    </div>
  );
};

export default Landing;

