import React, { useState, useEffect } from 'react';
import { Layout, Card, Button, Table, Typography, Space, Empty, message, Image, Row, Col, Divider } from 'antd';
import { ShoppingCartOutlined, DeleteOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import { getImageUrl } from '../utils/imageUtils';
import axios from 'axios';

const { Content } = Layout;
const { Title, Text } = Typography;
const API_URL = process.env.REACT_APP_API_URL || '/api';

const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateQuantity, clearCart, getCartTotal } = useCart();
  const [productId, setProductId] = useState(null);

  useEffect(() => {
    // Get productId from domain (same as other pages)
    const fetchProductId = async () => {
      try {
        const domain = window.location.host;
        const response = await axios.get(`${API_URL}/public/categories`, {
          headers: {
            'X-Client-Domain': domain
          }
        });
        if (response.data && response.data.productId) {
          setProductId(response.data.productId);
        }
      } catch (error) {
        console.error('Error fetching product ID:', error);
      }
    };
    fetchProductId();
  }, []);

  const columns = [
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => (
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px'
          }}
        >
          {record.image_url ? (
            <Image
              src={getImageUrl(record.image_url)}
              alt={record.name}
              width={60}
              height={60}
              style={{ 
                objectFit: 'cover', 
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              preview={false}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/product/${record.id}`);
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.8'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            />
          ) : (
            <div 
              style={{ 
                width: 60, 
                height: 60, 
                background: '#f0f0f0', 
                borderRadius: '4px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/product/${record.id}`);
              }}
            >
              <ShoppingCartOutlined style={{ fontSize: '24px', color: '#ccc' }} />
            </div>
          )}
          <div>
            <div 
              style={{ 
                fontWeight: 'bold', 
                color: '#1890ff',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/product/${record.id}`);
              }}
              onMouseEnter={(e) => e.target.style.color = '#40a9ff'}
              onMouseLeave={(e) => e.target.style.color = '#1890ff'}
            >
              {record.name || 'Unnamed Product'}
            </div>
            {record.brand_name && (
              <div style={{ fontSize: '12px', color: '#999' }}>{record.brand_name}</div>
            )}
            {record.description && (
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                {record.description.length > 50 
                  ? `${record.description.substring(0, 50)}...` 
                  : record.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price) => (
        <Text strong>${price ? price.toFixed(2) : '0.00'}</Text>
      ),
    },
    {
      title: 'Quantity',
      key: 'quantity',
      render: (_, record) => (
        <Space>
          <Button
            icon={<MinusOutlined />}
            size="small"
            onClick={() => {
              if (record.quantity > 1) {
                updateQuantity(record.id, record.quantity - 1);
              } else {
                removeFromCart(record.id);
                message.success('Item removed from cart');
              }
            }}
          />
          <Text style={{ minWidth: '40px', textAlign: 'center', display: 'inline-block' }}>
            {record.quantity}
          </Text>
          <Button
            icon={<PlusOutlined />}
            size="small"
            onClick={() => updateQuantity(record.id, record.quantity + 1)}
          />
        </Space>
      ),
    },
    {
      title: 'Subtotal',
      key: 'subtotal',
      render: (_, record) => (
        <Text strong>${((record.price || 0) * record.quantity).toFixed(2)}</Text>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => {
            removeFromCart(record.id);
            message.success('Item removed from cart');
          }}
        >
          Remove
        </Button>
      ),
    },
  ];

  const total = getCartTotal();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header productId={productId} />
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <Title level={2} style={{ margin: 0 }}>Shopping Cart</Title>
            {cartItems.length > 0 && (
              <Button danger onClick={() => {
                clearCart();
                message.success('Cart cleared');
              }}>
                Clear Cart
              </Button>
            )}
          </div>

          {cartItems.length === 0 ? (
            <Empty
              description="Your cart is empty"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={() => navigate('/shop')}>
                Continue Shopping
              </Button>
            </Empty>
          ) : (
            <Row gutter={[24, 24]}>
              {/* Left Column - Cart Items Table */}
              <Col xs={24} lg={16}>
                <Table
                  columns={columns}
                  dataSource={cartItems}
                  rowKey="id"
                  pagination={false}
                />
                <div style={{ marginTop: '16px' }}>
                  <Button onClick={() => navigate('/shop')}>
                    Continue Shopping
                  </Button>
                </div>
              </Col>

              {/* Right Column - Checkout Summary */}
              <Col xs={24} lg={8}>
                <Card 
                  style={{ 
                    position: 'sticky',
                    top: '24px'
                  }}
                >
                  <Title level={4} style={{ marginBottom: '16px' }}>
                    Order Summary
                  </Title>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '16px'
                    }}>
                      <Text style={{ fontSize: '16px' }}>Subtotal</Text>
                      <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                        ${total.toFixed(2)}
                      </Title>
                    </div>
                  </div>

                  <Divider />

                  <Button 
                    type="primary" 
                    size="large" 
                    block
                    style={{ marginBottom: '16px' }}
                    onClick={() => navigate('/checkout')}
                  >
                    CHECKOUT
                  </Button>

                  <div style={{ 
                    textAlign: 'center', 
                    color: '#666',
                    fontSize: '14px',
                    marginTop: '16px'
                  }}>
                    Have a Promo Code? Apply on next step.
                  </div>
                </Card>
              </Col>
            </Row>
          )}
        </Card>
      </Content>
    </Layout>
  );
};

export default Cart;

