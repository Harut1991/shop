import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Typography, Card, Spin, Row, Col, Image, Tag, Button, Descriptions, Divider, Empty, Space, InputNumber, message } from 'antd';
import { ArrowLeftOutlined, ShoppingOutlined, ShoppingCartOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import axios from 'axios';
import { getImageUrl } from '../utils/imageUtils';

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const API_URL = process.env.REACT_APP_API_URL || '/api';

const ProductItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [productItem, setProductItem] = useState(null);
  const [productId, setProductId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProductItem = async () => {
      try {
        setLoading(true);
        setError(null);
        const domain = window.location.host;
        const response = await axios.get(`${API_URL}/product-items/${id}`, {
          headers: {
            'X-Client-Domain': domain
          }
        });
        
        if (response.data && response.data.productItem) {
          setProductItem(response.data.productItem);
          setProductId(response.data.productItem.product_id);
        } else {
          setError('Product item not found');
        }
      } catch (err) {
        console.error('Error fetching product item:', err);
        setError(err.response?.data?.error || 'Failed to load product item');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProductItem();
    }
  }, [id]);

  const handleAddToCart = () => {
    if (!productItem) return;
    
    // Add item to cart with the selected quantity
    for (let i = 0; i < quantity; i++) {
      addToCart(productItem);
    }
    
    message.success(`${quantity} ${quantity === 1 ? 'item' : 'items'} added to cart!`);
  };

  const handleQuantityChange = (value) => {
    if (value < 1) {
      setQuantity(1);
    } else {
      setQuantity(value);
    }
  };

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header productId={productId} />
        <Content style={{ padding: '24px', background: '#f0f2f5', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)' }}>
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  if (error || !productItem) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header productId={productId} />
        <Content style={{ padding: '24px', background: '#f0f2f5' }}>
          <Card>
            <Empty 
              description={error || 'Product item not found'}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={() => navigate('/shop')}>
                Back to Shop
              </Button>
            </Empty>
          </Card>
        </Content>
      </Layout>
    );
  }

  return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header productId={productId} />
        <Content style={{ padding: '24px', background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/shop')}
            style={{ marginBottom: '16px' }}
          >
            Back to Shop
          </Button>

          <Card>
            <Row gutter={[24, 24]}>
              {/* Image Section */}
              <Col xs={24} md={12}>
                {productItem.image_url ? (
                  <Image
                    src={getImageUrl(productItem.image_url)}
                    alt={productItem.name || productItem.weight}
                    style={{ width: '100%', borderRadius: '8px' }}
                    preview={true}
                  />
                ) : (
                  <div style={{ 
                    width: '100%', 
                    height: '400px', 
                    background: '#f0f0f0', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderRadius: '8px'
                  }}>
                    <ShoppingOutlined style={{ fontSize: '64px', color: '#ccc' }} />
                  </div>
                )}
              </Col>

              {/* Details Section */}
              <Col xs={24} md={12}>
                <div>
                  <Title level={2} style={{ marginBottom: '16px' }}>
                    {productItem.name || `Weight: ${productItem.weight}`}
                  </Title>

                  {productItem.brand_name && (
                    <Tag color="blue" style={{ marginBottom: '16px', fontSize: '14px', padding: '4px 12px' }}>
                      Brand: {productItem.brand_name}
                    </Tag>
                  )}

                  {productItem.weight && (
                    <div style={{ marginBottom: '16px' }}>
                      <strong>Weight:</strong> {productItem.weight}
                    </div>
                  )}

                  <div style={{ marginBottom: '24px' }}>
                    <Title level={3} style={{ color: '#1890ff', margin: 0 }}>
                      ${productItem.price?.toFixed(2) || '0.00'}
                    </Title>
                  </div>

                  {/* Quantity and Add to Cart Section */}
                  <div style={{ marginBottom: '24px', padding: '16px', background: '#fafafa', borderRadius: '8px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <strong>Quantity:</strong>
                    </div>
                    <Space size="middle" style={{ marginBottom: '16px' }}>
                      <Button
                        icon={<MinusOutlined />}
                        onClick={() => {
                          if (quantity > 1) {
                            setQuantity(quantity - 1);
                          }
                        }}
                        disabled={quantity <= 1}
                      />
                      <InputNumber
                        min={1}
                        value={quantity}
                        onChange={handleQuantityChange}
                        style={{ width: '80px', textAlign: 'center' }}
                      />
                      <Button
                        icon={<PlusOutlined />}
                        onClick={() => setQuantity(quantity + 1)}
                      />
                    </Space>
                    <Button
                      type="primary"
                      size="large"
                      icon={<ShoppingCartOutlined />}
                      onClick={handleAddToCart}
                      block
                      style={{ marginTop: '8px' }}
                    >
                      Add to Cart
                    </Button>
                  </div>

                  {productItem.description && (
                    <div style={{ marginBottom: '24px' }}>
                      <Title level={4}>Description</Title>
                      <Paragraph style={{ fontSize: '16px', lineHeight: '1.8' }}>
                        {productItem.description}
                      </Paragraph>
                    </div>
                  )}

                  <Divider />

                  {/* Categories */}
                  {productItem.categories && productItem.categories.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <Title level={4}>Categories</Title>
                      <div>
                        {productItem.categories.map((category) => (
                          <div key={category.id} style={{ marginBottom: '16px' }}>
                            <div style={{ marginBottom: '8px', fontWeight: 600, fontSize: '16px' }}>
                              {category.name}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {category.subCategories.map((subCategory) => (
                                <Tag 
                                  key={subCategory.id} 
                                  color="default"
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px',
                                    padding: '4px 12px',
                                    fontSize: '14px'
                                  }}
                                >
                                  {subCategory.image_url && (
                                    <Image
                                      src={getImageUrl(subCategory.image_url)}
                                      alt={subCategory.name}
                                      width={20}
                                      height={20}
                                      style={{ objectFit: 'cover', borderRadius: '4px' }}
                                      preview={false}
                                    />
                                  )}
                                  {subCategory.name}
                                </Tag>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional Info */}
                  <Descriptions column={1} bordered size="small">
                    {productItem.weight && (
                      <Descriptions.Item label="Weight">{productItem.weight}</Descriptions.Item>
                    )}
                    {productItem.brand_name && (
                      <Descriptions.Item label="Brand">{productItem.brand_name}</Descriptions.Item>
                    )}
                    <Descriptions.Item label="Price">
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                        ${productItem.price?.toFixed(2) || '0.00'}
                      </span>
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              </Col>
            </Row>
          </Card>
        </Content>
      </Layout>
  );
};

export default ProductItemDetail;

