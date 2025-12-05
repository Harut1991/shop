import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Typography, Spin, Alert } from 'antd';

const { Title, Paragraph } = Typography;
const API_URL = '/api';

const ProductHome = () => {
  const [productId, setProductId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [domain, setDomain] = useState('');

  useEffect(() => {
    const currentDomain = window.location.host; // e.g., "localhost:3000"
    setDomain(currentDomain);
    
    const fetchProductByDomain = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`${API_URL}/products/by-domain?domain=${encodeURIComponent(currentDomain)}`);
        
        if (response.data && response.data.productId) {
          setProductId(response.data.productId);
        } else {
          setError('Product not found for this domain');
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setError('No product found for this domain. Please check that the product domain matches exactly.');
        } else {
          setError(err.response?.data?.error || 'Failed to fetch product information');
        }
        console.error('Error fetching product:', err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProductByDomain();
  }, []);

  if (loading) {
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
            Checking domain...
          </Title>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '20px'
    }}>
      <Card style={{ maxWidth: '600px', width: '100%' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '24px' }}>
          Product Information
        </Title>
        
        <Paragraph style={{ textAlign: 'center', marginBottom: '16px' }}>
          <strong>Domain:</strong> {domain}
        </Paragraph>

        {error ? (
          <div>
            <Alert
              message="Error"
              description={error}
              type="error"
              showIcon
              style={{ marginTop: '16px' }}
            />
            <Alert
              message="How to Fix"
              description={
                <div>
                  <p style={{ marginBottom: '8px' }}>To set the domain for your product:</p>
                  <ol style={{ marginLeft: '20px', marginBottom: '8px' }}>
                    <li>Go to <a href="/admin/login" target="_blank">Admin Login</a></li>
                    <li>Log in as super admin</li>
                    <li>Go to "Products Management" tab</li>
                    <li>Click "Edit" on your product</li>
                    <li>Set the <strong>Domain</strong> field to: <code>{domain}</code></li>
                    <li>Click "Update" to save</li>
                  </ol>
                  <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                    <strong>Debug:</strong> <a href="/api/products/debug-domains" target="_blank">View all products and domains</a>
                  </p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginTop: '16px' }}
            />
          </div>
        ) : productId ? (
          <Alert
            message="Product Found"
            description={`Product ID: ${productId}`}
            type="success"
            showIcon
            style={{ marginTop: '16px' }}
          />
        ) : null}
      </Card>
    </div>
  );
};

export default ProductHome;

