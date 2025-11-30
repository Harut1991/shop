import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Card, Button, Typography, Descriptions, Spin, message, Layout, Space } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import './ProductDetail.css';

const { Title } = Typography;
const { Header, Content } = Layout;
const API_URL = '/api';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/products`);
      const products = response.data.products || [];
      const foundProduct = products.find(p => p.id === parseInt(id));
      
      if (foundProduct) {
        setProduct(foundProduct);
      } else {
        message.error('Product not found');
        navigate('/');
      }
    } catch (error) {
      message.error('Failed to fetch product');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ background: '#001529', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title 
            level={3} 
            style={{ color: 'white', margin: 0, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            Shop Admin Panel
          </Title>
          <Space>
            <span style={{ color: 'white' }}>
              Welcome, {user?.username} ({user?.role})
            </span>
            <Button type="primary" danger icon={<LogoutOutlined />} onClick={logout}>
              Logout
            </Button>
          </Space>
        </Header>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)' }}>
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#001529', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title 
          level={3} 
          style={{ color: 'white', margin: 0, cursor: 'pointer' }}
          onClick={() => navigate('/admin')}
        >
          Shop Admin Panel
        </Title>
        <Space>
          <span style={{ color: 'white' }}>
            Welcome, {user?.username} ({user?.role})
          </span>
          <Button type="primary" danger icon={<LogoutOutlined />} onClick={logout}>
            Logout
          </Button>
        </Space>
      </Header>
      <Content style={{ padding: '24px' }}>
        <Card>
          <Title level={2}>Product Details</Title>
          <Descriptions bordered column={1}>
            <Descriptions.Item label="ID">{product.id}</Descriptions.Item>
            <Descriptions.Item label="Name">{product.name}</Descriptions.Item>
            <Descriptions.Item label="Description">
              {product.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Price">${product.price || 0}</Descriptions.Item>
            <Descriptions.Item label="Stock">{product.stock || 0}</Descriptions.Item>
            {product.image_url && (
              <Descriptions.Item label="Image">
                <img 
                  src={product.image_url} 
                  alt={product.name} 
                  style={{ maxWidth: '300px', maxHeight: '300px' }}
                />
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      </Content>
    </Layout>
  );
};

export default ProductDetail;

