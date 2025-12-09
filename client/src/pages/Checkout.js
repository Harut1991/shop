import React, { useState, useEffect } from 'react';
import { Layout, Card, Typography, Row, Col, Divider, Button, Space, Modal, Form, Input, message, Image, Select, Radio, Switch, InputNumber, DatePicker } from 'antd';
import { ArrowLeftOutlined, ShoppingCartOutlined, DeleteOutlined, CarOutlined, ShopOutlined, ShoppingOutlined, LockOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../utils/imageUtils';
import axios from 'axios';

const { Content } = Layout;
const { Title, Text } = Typography;
const API_URL = process.env.REACT_APP_API_URL || '/api';

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, getCartTotal, updateQuantity, removeFromCart, clearCart } = useCart();
  const { user, login } = useAuth();
  const [productId, setProductId] = useState(null);
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  const [taxes, setTaxes] = useState([]);
  const [loadingTaxes, setLoadingTaxes] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [signInForm] = Form.useForm();
  const [signUpForm] = Form.useForm();
  const [orderDetailsForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [scheduleDelivery, setScheduleDelivery] = useState(false);
  const [bagType, setBagType] = useState('normal');

  useEffect(() => {
    // Get productId from domain and fetch taxes
    const fetchData = async () => {
      try {
        const domain = window.location.host;
        
        // Fetch product ID
        const categoriesResponse = await axios.get(`${API_URL}/public/categories`, {
          headers: {
            'X-Client-Domain': domain
          }
        });
        if (categoriesResponse.data && categoriesResponse.data.productId) {
          setProductId(categoriesResponse.data.productId);
        }

        // Fetch taxes
        setLoadingTaxes(true);
        const taxesResponse = await axios.get(`${API_URL}/public/taxes`, {
          headers: {
            'X-Client-Domain': domain
          }
        });
        if (taxesResponse.data && taxesResponse.data.taxes) {
          setTaxes(taxesResponse.data.taxes || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // If taxes endpoint doesn't exist or fails, set empty array
        setTaxes([]);
      } finally {
        setLoadingTaxes(false);
      }
    };
    fetchData();
  }, []);

  // Redirect to cart if cart is empty
  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems.length, navigate]);

  // Update current step based on authentication
  useEffect(() => {
    if (user) {
      setCurrentStep(2); // Move to Order Details if logged in
    } else {
      setCurrentStep(1); // Stay on Log In or Create Account
    }
  }, [user]);

  const handleSignIn = async (values) => {
    try {
      setLoading(true);
      const result = await login(values.email, values.password);
      
      if (result.success) {
        message.success('Signed in successfully!');
        setShowSignIn(false);
        signInForm.resetFields();
        setCurrentStep(2);
      } else {
        message.error(result.error || 'Sign in failed');
      }
    } catch (error) {
      message.error('Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (values) => {
    try {
      setLoading(true);
      
      if (!productId) {
        message.error('Product not found. Please refresh the page.');
        return;
      }

      const response = await axios.post(`${API_URL}/auth/register-customer`, {
        email: values.email,
        password: values.password,
        phone: values.phone,
        first_name: values.first_name,
        last_name: values.last_name,
        productId: productId
      });

      const { token, user: newUser } = response.data;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      message.success('Account created successfully!');
      setShowSignUp(false);
      signUpForm.resetFields();
      setCurrentStep(2);
      
      // Reload page to update auth state
      window.location.reload();
    } catch (error) {
      message.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = getCartTotal();
  
  // Calculate taxes based on saved taxes
  const calculateTaxes = () => {
    let totalTaxes = 0;
    const taxDetails = taxes.map(tax => {
      let taxAmount = 0;
      if (tax.type === 'percentage') {
        taxAmount = (subtotal * tax.value) / 100;
      } else if (tax.type === 'fixed') {
        taxAmount = parseFloat(tax.value);
      }
      totalTaxes += taxAmount;
      return {
        ...tax,
        calculatedAmount: taxAmount
      };
    });
    return { totalTaxes, taxDetails };
  };

  const { totalTaxes, taxDetails } = calculateTaxes();
  const estimatedDelivery = 5.00; // Fixed delivery fee
  const orderTotal = subtotal + totalTaxes + estimatedDelivery;

  if (cartItems.length === 0) {
    return null; // Will redirect
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header productId={productId} />
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/cart')}
          style={{ marginBottom: '16px' }}
        >
          Back to Cart
        </Button>

        <Row gutter={[24, 24]}>
          {/* Left Column - Checkout Steps */}
          <Col xs={24} lg={16}>
            <Card>
              <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                {/* Step 1: Log In or Create Account */}
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: currentStep === 1 ? '#1890ff' : '#d9d9d9',
                      color: currentStep === 1 ? '#fff' : '#666',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '16px'
                    }}>
                      1
                    </div>
                    <Title level={4} style={{ 
                      margin: 0, 
                      color: currentStep === 1 ? '#000' : '#999',
                      fontSize: '18px'
                    }}>
                      Log In or Create Account
                    </Title>
                  </div>
                  
                  {currentStep === 1 && (
                    <div style={{ marginLeft: '44px' }}>
                      <Text style={{ 
                        display: 'block', 
                        marginBottom: '16px',
                        color: '#666',
                        fontSize: '14px'
                      }}>
                        Already our customer? Log in with your account.
                      </Text>
                      <Space size="middle">
                        <Button 
                          type="primary"
                          size="large"
                          onClick={() => setShowSignUp(true)}
                          style={{
                            background: '#52c41a',
                            borderColor: '#52c41a',
                            height: '40px',
                            padding: '0 24px',
                            fontWeight: '500'
                          }}
                        >
                          CREATE ACCOUNT
                        </Button>
                        <Button 
                          size="large"
                          onClick={() => setShowSignIn(true)}
                          style={{
                            background: '#fff',
                            borderColor: '#52c41a',
                            color: '#52c41a',
                            height: '40px',
                            padding: '0 24px',
                            fontWeight: '500'
                          }}
                        >
                          LOG IN
                        </Button>
                      </Space>
                    </div>
                  )}
                </div>

                <Divider style={{ margin: '24px 0' }} />

                {/* Step 2: Order Details */}
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: currentStep === 2 ? '#1890ff' : '#d9d9d9',
                      color: currentStep === 2 ? '#fff' : '#666',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '16px'
                    }}>
                      2
                    </div>
                    <Title level={4} style={{ 
                      margin: 0, 
                      color: currentStep === 2 ? '#000' : '#999',
                      fontSize: '18px'
                    }}>
                      Order Details
                    </Title>
                  </div>

                  {currentStep === 2 && (
                    <div style={{ marginLeft: '44px', marginTop: '24px' }}>
                      <Form
                        form={orderDetailsForm}
                        layout="vertical"
                        initialValues={{
                          scheduleDelivery: false,
                          bagType: 'normal',
                          address: ''
                        }}
                      >
                        {/* SCHEDULE DELIVERY */}
                        <div style={{ marginBottom: '24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: scheduleDelivery ? '12px' : '0' }}>
                            <Text strong style={{ fontSize: '14px', textTransform: 'uppercase' }}>
                              SCHEDULE DELIVERY:
                            </Text>
                            <Switch 
                              checked={scheduleDelivery} 
                              onChange={setScheduleDelivery}
                            />
                          </div>
                          {scheduleDelivery && (
                            <Form.Item 
                              name="deliveryDateTime" 
                              label="Select Date & Time"
                              rules={[{ required: scheduleDelivery, message: 'Please select delivery date and time' }]}
                              style={{ marginTop: '12px' }}
                            >
                              <DatePicker
                                showTime
                                format="YYYY-MM-DD HH:mm"
                                placeholder="Select delivery date and time"
                                style={{ width: '100%', height: '40px' }}
                                disabledDate={(current) => {
                                  // Disable past dates
                                  if (!current) return false;
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  return current.toDate() < today;
                                }}
                                disabledTime={(current) => {
                                  if (!current) return {};
                                  
                                  // If today, disable past hours and minutes
                                  const now = new Date();
                                  const selectedDate = current.toDate();
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const selectedDay = new Date(selectedDate);
                                  selectedDay.setHours(0, 0, 0, 0);
                                  
                                  if (selectedDay.getTime() === today.getTime()) {
                                    const currentHour = now.getHours();
                                    const currentMinute = now.getMinutes();
                                    return {
                                      disabledHours: () => {
                                        const hours = [];
                                        for (let i = 0; i <= currentHour; i++) {
                                          hours.push(i);
                                        }
                                        return hours;
                                      },
                                      disabledMinutes: (selectedHour) => {
                                        if (selectedHour === currentHour) {
                                          const minutes = [];
                                          for (let i = 0; i <= currentMinute; i++) {
                                            minutes.push(i);
                                          }
                                          return minutes;
                                        }
                                        return [];
                                      }
                                    };
                                  }
                                  return {};
                                }}
                              />
                            </Form.Item>
                          )}
                        </div>

                        {/* DELIVERY ADDRESS */}
                        <div style={{ marginBottom: '24px' }}>
                          <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px', textTransform: 'uppercase' }}>
                            DELIVERY ADDRESS:
                          </Text>
                          <Form.Item 
                            name="address" 
                            style={{ marginBottom: '8px' }}
                            rules={[{ required: true, message: 'Please use "Use My Location" to set your address' }]}
                          >
                            <Input 
                              placeholder="Click 'Use My Location' to get your address"
                              style={{ height: '40px' }}
                              readOnly
                              disabled
                            />
                          </Form.Item>
                          <Button 
                            icon={<EnvironmentOutlined />}
                            loading={loading}
                            type="primary"
                            onClick={async () => {
                              if (!navigator.geolocation) {
                                message.error('Geolocation is not supported by your browser');
                                return;
                              }

                              setLoading(true);
                              
                              // Check if running on HTTPS or localhost
                              const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                              if (!isSecure) {
                                setLoading(false);
                                message.warning('Location access requires HTTPS. Please use HTTPS or localhost.');
                                return;
                              }

                              navigator.geolocation.getCurrentPosition(
                                async (position) => {
                                  const { latitude, longitude } = position.coords;
                                  
                                  try {
                                    // Use reverse geocoding to get address from coordinates
                                    // OpenStreetMap requires User-Agent header
                                    const response = await fetch(
                                      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                                      {
                                        headers: {
                                          'User-Agent': 'ShopApp/1.0'
                                        }
                                      }
                                    );
                                    
                                    if (!response.ok) {
                                      throw new Error(`HTTP error! status: ${response.status}`);
                                    }
                                    
                                    const data = await response.json();
                                    
                                    if (data && data.display_name) {
                                      const address = data.display_name;
                                      orderDetailsForm.setFieldsValue({ address });
                                      message.success('Location retrieved successfully!');
                                    } else {
                                      // Fallback: show coordinates
                                      const address = `${latitude}, ${longitude}`;
                                      orderDetailsForm.setFieldsValue({ address });
                                      message.info('Location retrieved. Address may need manual verification.');
                                    }
                                  } catch (error) {
                                    console.error('Error getting address:', error);
                                    // Fallback: show coordinates
                                    const address = `${latitude}, ${longitude}`;
                                    orderDetailsForm.setFieldsValue({ address });
                                    message.warning('Could not get full address. Coordinates saved. You can manually edit if needed.');
                                  } finally {
                                    setLoading(false);
                                  }
                                },
                                (error) => {
                                  setLoading(false);
                                  let errorMessage = 'Failed to get location';
                                  let detailedMessage = '';
                                  
                                  switch (error.code) {
                                    case error.PERMISSION_DENIED:
                                      errorMessage = 'Location access denied';
                                      detailedMessage = 'Please enable location permissions in your browser settings and try again.';
                                      break;
                                    case error.POSITION_UNAVAILABLE:
                                      errorMessage = 'Location information unavailable';
                                      detailedMessage = 'Your device could not determine your location. Please check your GPS/WiFi settings.';
                                      break;
                                    case error.TIMEOUT:
                                      errorMessage = 'Location request timed out';
                                      detailedMessage = 'The location request took too long. Please try again.';
                                      break;
                                    default:
                                      detailedMessage = error.message || 'An unknown error occurred.';
                                  }
                                  
                                  message.error({
                                    content: (
                                      <div>
                                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{errorMessage}</div>
                                        <div style={{ fontSize: '12px' }}>{detailedMessage}</div>
                                      </div>
                                    ),
                                    duration: 6
                                  });
                                },
                                {
                                  enableHighAccuracy: true,
                                  timeout: 15000, // Increased timeout
                                  maximumAge: 60000 // Accept cached position up to 1 minute old
                                }
                              );
                            }}
                          >
                            Use My Location
                          </Button>
                        </div>

                        {/* Apt./Suite */}
                        <Form.Item 
                          name="aptSuite" 
                          label="Apt./Suite (optional)"
                          style={{ marginBottom: '24px' }}
                        >
                          <Input placeholder="Apt./Suite (optional)" style={{ height: '40px' }} />
                        </Form.Item>

                        {/* Bag Type Selection */}
                        <div style={{ marginBottom: '24px' }}>
                          <Text strong style={{ display: 'block', marginBottom: '12px', fontSize: '14px', textTransform: 'uppercase' }}>
                            Bag Type Selection:
                          </Text>
                          <Radio.Group 
                            value={bagType} 
                            onChange={(e) => setBagType(e.target.value)}
                            style={{ width: '100%' }}
                          >
                            <Space direction="horizontal" size="large" style={{ width: '100%' }}>
                              <Radio.Button 
                                value="normal"
                                style={{
                                  flex: 1,
                                  height: '60px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: bagType === 'normal' ? '2px solid #52c41a' : '1px solid #d9d9d9',
                                  borderRadius: '4px'
                                }}
                              >
                                <Space>
                                  <ShoppingOutlined style={{ fontSize: '20px', color: bagType === 'normal' ? '#52c41a' : '#666' }} />
                                  <span style={{ fontSize: '16px', fontWeight: '500' }}>Normal Bag</span>
                                </Space>
                              </Radio.Button>
                              <Radio.Button 
                                value="discrete"
                                style={{
                                  flex: 1,
                                  height: '60px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: bagType === 'discrete' ? '2px solid #52c41a' : '1px solid #d9d9d9',
                                  borderRadius: '4px'
                                }}
                              >
                                <Space>
                                  <LockOutlined style={{ fontSize: '20px', color: bagType === 'discrete' ? '#52c41a' : '#666' }} />
                                  <span style={{ fontSize: '16px', fontWeight: '500' }}>Discrete Bag</span>
                                </Space>
                              </Radio.Button>
                            </Space>
                          </Radio.Group>
                        </div>

                        {/* ORDER REQUEST */}
                        <Form.Item 
                          name="orderRequest" 
                          label="ORDER REQUEST:"
                          style={{ marginBottom: '24px' }}
                        >
                          <Input.TextArea 
                            rows={4}
                            placeholder="Examples: please text only, need an accessible delivery, call when arrived, etc."
                            style={{ resize: 'vertical' }}
                          />
                        </Form.Item>

                        {/* NEXT Button */}
                        <Form.Item 
                          key={`next-button-${scheduleDelivery}`}
                          shouldUpdate={(prevValues, currentValues) => {
                            // Watch for changes in address and deliveryDateTime
                            return prevValues.address !== currentValues.address || 
                                   prevValues.deliveryDateTime !== currentValues.deliveryDateTime;
                          }} 
                          style={{ marginBottom: 0 }}
                        >
                          {({ getFieldsValue }) => {
                            const values = getFieldsValue(['address', 'deliveryDateTime']);
                            
                            // Check if address is filled
                            const hasAddress = values.address && values.address.trim() !== '';
                            
                            // Check if delivery date is required and filled
                            const needsDeliveryDate = scheduleDelivery;
                            const hasDeliveryDate = values.deliveryDateTime !== null && values.deliveryDateTime !== undefined;
                            
                            // Button is disabled if:
                            // 1. Address is missing, OR
                            // 2. Schedule delivery is ON but no date selected
                            const isDisabled = !hasAddress || (needsDeliveryDate && !hasDeliveryDate);
                            
                            return (
                              <Button 
                                type="primary"
                                size="large"
                                block
                                disabled={isDisabled}
                                onClick={async () => {
                                  try {
                                    // Validate all fields
                                    const fieldsToValidate = ['address'];
                                    if (scheduleDelivery) {
                                      fieldsToValidate.push('deliveryDateTime');
                                    }
                                    await orderDetailsForm.validateFields(fieldsToValidate);
                                    setCurrentStep(3);
                                    message.success('Order details saved!');
                                  } catch (error) {
                                    if (error.errorFields) {
                                      const missingFields = error.errorFields.map(f => f.name[0]).join(', ');
                                      message.warning(`Please fill in: ${missingFields}`);
                                    }
                                  }
                                }}
                                style={{
                                  height: '48px',
                                  fontSize: '16px',
                                  fontWeight: '500',
                                  background: isDisabled ? '#d9d9d9' : '#1890ff',
                                  borderColor: isDisabled ? '#d9d9d9' : '#1890ff',
                                  cursor: isDisabled ? 'not-allowed' : 'pointer'
                                }}
                              >
                                NEXT
                              </Button>
                            );
                          }}
                        </Form.Item>
                      </Form>
                    </div>
                  )}
                </div>

                <Divider style={{ margin: '24px 0' }} />

                {/* Step 3: Review Order */}
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: currentStep === 3 ? '#1890ff' : '#d9d9d9',
                      color: currentStep === 3 ? '#fff' : '#666',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '16px'
                    }}>
                      3
                    </div>
                    <Title level={4} style={{ 
                      margin: 0, 
                      color: currentStep === 3 ? '#000' : '#999',
                      fontSize: '18px'
                    }}>
                      Review Order
                    </Title>
                  </div>

                  {currentStep === 3 && (
                    <div style={{ marginLeft: '44px', marginTop: '24px' }}>
                      <Card>
                        {/* Order Summary */}
                        <div style={{ marginBottom: '24px' }}>
                          <Title level={5} style={{ marginBottom: '16px' }}>Order Summary</Title>
                          
                          {/* Delivery Address */}
                          <div style={{ marginBottom: '16px' }}>
                            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Delivery Address:</Text>
                            <Text>{orderDetailsForm.getFieldValue('address') || 'Not set'}</Text>
                            {orderDetailsForm.getFieldValue('aptSuite') && (
                              <Text style={{ display: 'block', marginTop: '4px' }}>
                                Apt./Suite: {orderDetailsForm.getFieldValue('aptSuite')}
                              </Text>
                            )}
                          </div>

                          {/* Scheduled Delivery */}
                          {scheduleDelivery && orderDetailsForm.getFieldValue('deliveryDateTime') && (
                            <div style={{ marginBottom: '16px' }}>
                              <Text strong style={{ display: 'block', marginBottom: '8px' }}>Scheduled Delivery:</Text>
                              <Text>
                                {(() => {
                                  const dateTime = orderDetailsForm.getFieldValue('deliveryDateTime');
                                  if (!dateTime) return 'Not set';
                                  // Ant Design DatePicker returns dayjs object
                                  if (dateTime.format) {
                                    return dateTime.format('YYYY-MM-DD HH:mm');
                                  }
                                  // Fallback if it's a string or Date
                                  return dateTime.toString();
                                })()}
                              </Text>
                            </div>
                          )}

                          {/* Bag Type */}
                          <div style={{ marginBottom: '16px' }}>
                            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Bag Type:</Text>
                            <Text>{bagType === 'normal' ? 'Normal Bag' : 'Discrete Bag'}</Text>
                          </div>

                          {/* Order Request */}
                          {orderDetailsForm.getFieldValue('orderRequest') && (
                            <div style={{ marginBottom: '16px' }}>
                              <Text strong style={{ display: 'block', marginBottom: '8px' }}>Order Request:</Text>
                              <Text>{orderDetailsForm.getFieldValue('orderRequest')}</Text>
                            </div>
                          )}

                          <Divider />

                          {/* Cart Items Summary */}
                          <div style={{ marginBottom: '16px' }}>
                            <Text strong style={{ display: 'block', marginBottom: '12px' }}>Items ({cartItems.length}):</Text>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {cartItems.map((item) => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#fafafa', borderRadius: '4px' }}>
                                  <div>
                                    <Text>{item.name || 'Unnamed Product'}</Text>
                                    <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                                      Qty: {item.quantity} × ${(item.price || 0).toFixed(2)}
                                    </Text>
                                  </div>
                                  <Text strong>${((item.price || 0) * item.quantity).toFixed(2)}</Text>
                                </div>
                              ))}
                            </div>
                          </div>

                          <Divider />

                          {/* Total */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <Text strong style={{ fontSize: '18px' }}>Total:</Text>
                            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                              ${orderTotal.toFixed(2)}
                            </Title>
                          </div>

                          {/* Action Buttons */}
                          <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Button 
                              onClick={() => setCurrentStep(2)}
                            >
                              Back
                            </Button>
                            <Button 
                              type="primary"
                              size="large"
                              loading={loading}
                              onClick={async () => {
                                if (!user) {
                                  message.warning('Please sign in to place an order');
                                  setCurrentStep(1);
                                  return;
                                }

                                if (!productId) {
                                  message.error('Product not found. Please refresh the page.');
                                  return;
                                }

                                try {
                                  setLoading(true);
                                  
                                  const orderData = {
                                    productId,
                                    deliveryAddress: orderDetailsForm.getFieldValue('address'),
                                    aptSuite: orderDetailsForm.getFieldValue('aptSuite'),
                                    scheduledDeliveryDateTime: orderDetailsForm.getFieldValue('deliveryDateTime')?.format('YYYY-MM-DD HH:mm'),
                                    bagType,
                                    orderRequest: orderDetailsForm.getFieldValue('orderRequest'),
                                    cartItems: cartItems.map(item => ({
                                      id: item.id,
                                      name: item.name,
                                      description: item.description,
                                      image_url: item.image_url,
                                      quantity: item.quantity,
                                      price: item.price
                                    })),
                                    subtotal,
                                    taxes: totalTaxes,
                                    deliveryFee: estimatedDelivery,
                                    total: orderTotal
                                  };

                                  const response = await axios.post(`${API_URL}/orders`, orderData, {
                                    headers: {
                                      Authorization: `Bearer ${localStorage.getItem('token')}`
                                    }
                                  });

                                  if (response.data) {
                                    message.success(`Order placed successfully! Order #${response.data.orderNumber}`);
                                    clearCart();
                                    navigate('/orders');
                                  }
                                } catch (error) {
                                  console.error('Error placing order:', error);
                                  message.error(error.response?.data?.error || 'Failed to place order. Please try again.');
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              style={{
                                height: '48px',
                                fontSize: '16px',
                                fontWeight: '500',
                                padding: '0 32px'
                              }}
                            >
                              Place Order
                            </Button>
                          </Space>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </Col>

          {/* Right Column - Cart Items and Order Summary */}
          <Col xs={24} lg={8}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Cart Items */}
              <Card 
                style={{ 
                  background: '#fff',
                  borderRadius: '8px'
                }}
              >
                <Title level={4} style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
                  Your Items
                </Title>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {cartItems.map((item) => (
                    <div 
                      key={item.id}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        paddingBottom: '24px',
                        borderBottom: cartItems.indexOf(item) < cartItems.length - 1 ? '1px solid #e8e8e8' : 'none'
                      }}
                    >
                      {/* Product Image */}
                      <div style={{ flexShrink: 0 }}>
                        {item.image_url ? (
                          <Image
                            src={getImageUrl(item.image_url)}
                            alt={item.name}
                            width={80}
                            height={80}
                            style={{ 
                              objectFit: 'cover', 
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                            preview={false}
                            onClick={() => navigate(`/product/${item.id}`)}
                          />
                        ) : (
                          <div 
                            style={{ 
                              width: 80, 
                              height: 80, 
                              background: '#f0f0f0', 
                              borderRadius: '4px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                            onClick={() => navigate(`/product/${item.id}`)}
                          >
                            <ShoppingCartOutlined style={{ fontSize: '32px', color: '#ccc' }} />
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div 
                          style={{ 
                            fontWeight: 'bold', 
                            fontSize: '16px',
                            color: '#000',
                            cursor: 'pointer'
                          }}
                          onClick={() => navigate(`/product/${item.id}`)}
                        >
                          {item.name || 'Unnamed Product'}
                        </div>
                        
                        {item.brand_name && (
                          <div style={{ fontSize: '14px', color: '#666' }}>
                            {item.brand_name}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Text style={{ fontSize: '14px', color: '#666' }}>Quantity</Text>
                            <Select
                              value={item.quantity}
                              onChange={(value) => {
                                if (value === 0) {
                                  removeFromCart(item.id);
                                  message.success('Item removed from cart');
                                } else {
                                  updateQuantity(item.id, value);
                                }
                              }}
                              style={{ width: 80 }}
                              options={Array.from({ length: 10 }, (_, i) => ({
                                value: i + 1,
                                label: i + 1
                              }))}
                            />
                          </div>
                          
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => {
                              removeFromCart(item.id);
                              message.success('Item removed from cart');
                            }}
                            style={{ padding: '4px 8px' }}
                          />
                        </div>
                      </div>

                      {/* Price */}
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        justifyContent: 'flex-start'
                      }}>
                        <Text strong style={{ fontSize: '16px', fontWeight: 'bold' }}>
                          ${((item.price || 0) * item.quantity).toFixed(2)}
                        </Text>
                        {item.quantity > 1 && (
                          <Text style={{ fontSize: '12px', color: '#999' }}>
                            ${(item.price || 0).toFixed(2)} each
                          </Text>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e8e8e8' }}>
                  <Button 
                    type="link" 
                    onClick={() => navigate('/shop')}
                    style={{ padding: 0, fontSize: '14px' }}
                  >
                    Continue Shopping →
                  </Button>
                </div>
              </Card>

              {/* Order Summary */}
              <Card 
                style={{ 
                  background: '#fafafa',
                  borderRadius: '8px'
                }}
              >
                <Title level={4} style={{ marginBottom: '20px', fontSize: '20px', fontWeight: 'bold' }}>
                  Order Summary
                </Title>

              <Divider style={{ margin: '16px 0' }} />

              <div style={{ marginBottom: '12px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <Text style={{ fontSize: '16px' }}>Subtotal</Text>
                  <Text style={{ fontSize: '16px', fontWeight: '500' }}>
                    ${subtotal.toFixed(2)}
                  </Text>
                </div>

                {taxes.length > 0 && (
                  <>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Text style={{ fontSize: '16px' }}>Estimated Taxes</Text>
                        {taxes.length > 1 && (
                          <Button 
                            type="link" 
                            size="small" 
                            style={{ padding: 0, height: 'auto', fontSize: '14px' }}
                            onClick={() => setShowTaxDetails(!showTaxDetails)}
                          >
                            {showTaxDetails ? 'Hide' : 'Show'} Details
                          </Button>
                        )}
                      </div>
                      <Text style={{ fontSize: '16px', fontWeight: '500' }}>
                        ${totalTaxes.toFixed(2)}
                      </Text>
                    </div>

                    {showTaxDetails && taxDetails.length > 0 && (
                      <div style={{ 
                        padding: '12px', 
                        background: '#fff', 
                        borderRadius: '4px',
                        marginBottom: '12px',
                        fontSize: '14px',
                        color: '#666'
                      }}>
                        {taxDetails.map((tax, index) => (
                          <div key={tax.id || index} style={{ marginBottom: index < taxDetails.length - 1 ? '8px' : '0' }}>
                            {tax.name}{tax.type === 'percentage' ? ` (${tax.value}%)` : ''}: ${tax.calculatedAmount.toFixed(2)}
                          </div>
                        ))}
                      </div>
                    )}

                    {taxes.length === 1 && (
                      <div style={{ 
                        padding: '12px', 
                        background: '#fff', 
                        borderRadius: '4px',
                        marginBottom: '12px',
                        fontSize: '14px',
                        color: '#666'
                      }}>
                        {taxDetails[0].name}{taxDetails[0].type === 'percentage' ? ` (${taxDetails[0].value}%)` : ''}: ${taxDetails[0].calculatedAmount.toFixed(2)}
                      </div>
                    )}
                  </>
                )}

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <Text style={{ fontSize: '16px' }}>Estimated Delivery</Text>
                  <Text style={{ fontSize: '16px', fontWeight: '500' }}>
                    ${estimatedDelivery.toFixed(2)}
                  </Text>
                </div>
              </div>

              <Divider style={{ margin: '16px 0' }} />

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <Text strong style={{ fontSize: '18px', fontWeight: 'bold' }}>Order Total</Text>
                <Title level={3} style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                  ${orderTotal.toFixed(2)}
                </Title>
              </div>

              <div style={{ 
                textAlign: 'center', 
                color: '#666',
                fontSize: '14px',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid #e8e8e8'
              }}>
                Discounts available once logged in
              </div>
            </Card>
            </div>
          </Col>
        </Row>

        {/* Sign In Modal */}
        <Modal
          title="Sign In"
          open={showSignIn}
          onCancel={() => {
            setShowSignIn(false);
            signInForm.resetFields();
          }}
          footer={null}
        >
          <Form
            form={signInForm}
            layout="vertical"
            onFinish={handleSignIn}
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input placeholder="Enter your email" />
            </Form.Item>
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Password is required' }]}
            >
              <Input.Password placeholder="Enter your password" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Sign In
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        {/* Sign Up Modal */}
        <Modal
          title="Create Account"
          open={showSignUp}
          onCancel={() => {
            setShowSignUp(false);
            signUpForm.resetFields();
          }}
          footer={null}
        >
          <Form
            form={signUpForm}
            layout="vertical"
            onFinish={handleSignUp}
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input placeholder="Enter your email" />
            </Form.Item>
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: 'Password is required' },
                { min: 6, message: 'Password must be at least 6 characters' }
              ]}
            >
              <Input.Password placeholder="Enter your password" />
            </Form.Item>
            <Form.Item
              name="first_name"
              label="First Name"
              rules={[{ required: true, message: 'First name is required' }]}
            >
              <Input placeholder="Enter your first name" />
            </Form.Item>
            <Form.Item
              name="last_name"
              label="Last Name"
              rules={[{ required: true, message: 'Last name is required' }]}
            >
              <Input placeholder="Enter your last name" />
            </Form.Item>
            <Form.Item
              name="phone"
              label="Phone"
            >
              <Input placeholder="Enter your phone number" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Create Account
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
};

export default Checkout;

