import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Space, Modal, Form, Input, message, Dropdown, Badge } from 'antd';
import { UserOutlined, ShoppingOutlined, ShoppingCartOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import axios from 'axios';
import './Header.css';

const { Header: AntHeader } = Layout;
const API_URL = process.env.REACT_APP_API_URL || '/api';

const Header = ({ productId }) => {
  const navigate = useNavigate();
  const { user, login, logout } = useAuth();
  const { getCartCount } = useCart();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [signInForm] = Form.useForm();
  const [signUpForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [userMenuVisible, setUserMenuVisible] = useState(false);

  const handleSignIn = async (values) => {
    try {
      setLoading(true);
      const domain = window.location.host;
      const result = await login(values.email, values.password);
      
      if (result.success) {
        message.success('Signed in successfully!');
        setShowSignIn(false);
        signInForm.resetFields();
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
      
      // Reload page to update auth state
      window.location.reload();
    } catch (error) {
      message.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      key: 'shop',
      icon: <ShoppingOutlined />,
      label: 'Shop',
      onClick: () => {
        navigate('/shop');
      }
    },
    {
      key: 'about',
      icon: <InfoCircleOutlined />,
      label: 'About Us',
      onClick: () => {
        navigate('/about');
      }
    }
  ];

  return (
    <>
      <AntHeader className="site-header">
        <div className="header-content">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <ShoppingOutlined style={{ fontSize: '24px', marginRight: '8px' }} />
            <span className="logo-text">Shop</span>
          </div>
          
          <Menu
            mode="horizontal"
            items={menuItems}
            className="header-menu"
          />

          <Space className="header-actions" size="middle">
            {/* Shopping Cart Icon */}
            <Badge count={getCartCount()} showZero={false}>
              <Button
                type="text"
                icon={<ShoppingCartOutlined style={{ fontSize: '20px' }} />}
                onClick={() => navigate('/cart')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              />
            </Badge>

            {/* User Icon with Dropdown */}
            <Dropdown
              menu={{
                items: user
                  ? [
                      {
                        key: 'user-info',
                        label: (
                          <div style={{ padding: '4px 0' }}>
                            <div style={{ fontWeight: 'bold' }}>
                              {user.first_name && user.last_name
                                ? `${user.first_name} ${user.last_name}`
                                : user.email}
                            </div>
                            <div style={{ fontSize: '12px', color: '#999' }}>{user.email}</div>
                          </div>
                        ),
                        disabled: true,
                      },
                      { type: 'divider' },
                      {
                        key: 'orders',
                        label: 'Orders',
                        onClick: () => navigate('/orders'),
                      },
                      { type: 'divider' },
                      {
                        key: 'logout',
                        label: 'Sign Out',
                        onClick: logout,
                      },
                    ]
                  : [
                      {
                        key: 'sign-in',
                        label: 'Sign In',
                        onClick: () => setShowSignIn(true),
                      },
                      {
                        key: 'sign-up',
                        label: 'Sign Up',
                        onClick: () => setShowSignUp(true),
                      },
                    ],
              }}
              trigger={['hover', 'click']}
              placement="bottomRight"
              open={userMenuVisible}
              onOpenChange={setUserMenuVisible}
            >
              <Button
                type="text"
                icon={<UserOutlined style={{ fontSize: '20px' }} />}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              />
            </Dropdown>
          </Space>
        </div>
      </AntHeader>

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
          onFinish={handleSignIn}
          layout="vertical"
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input placeholder="Enter your email" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter your password' }]}
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
        title="Sign Up"
        open={showSignUp}
        onCancel={() => {
          setShowSignUp(false);
          signUpForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={signUpForm}
          onFinish={handleSignUp}
          layout="vertical"
        >
          <Form.Item
            name="first_name"
            label="First Name"
            rules={[{ required: true, message: 'Please enter your first name' }]}
          >
            <Input placeholder="Enter your first name" />
          </Form.Item>

          <Form.Item
            name="last_name"
            label="Last Name"
            rules={[{ required: true, message: 'Please enter your last name' }]}
          >
            <Input placeholder="Enter your last name" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input placeholder="Enter your email" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone"
            rules={[{ required: true, message: 'Please enter your phone number' }]}
          >
            <Input placeholder="Enter your phone number" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please enter your password' },
              { min: 6, message: 'Password must be at least 6 characters' }
            ]}
          >
            <Input.Password placeholder="Enter your password" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm your password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Sign Up
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Header;

