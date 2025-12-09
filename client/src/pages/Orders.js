import React, { useState, useEffect } from 'react';
import { Layout, Card, Table, Typography, Tag, Button, Space, Image, Empty, Spin, Popconfirm, message, Descriptions, Modal } from 'antd';
import { ShoppingCartOutlined, EyeOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../utils/imageUtils';
import axios from 'axios';

const { Content } = Layout;
const { Title, Text } = Typography;
const API_URL = process.env.REACT_APP_API_URL || '/api';

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  useEffect(() => {
    // Get productId from domain
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

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/orders`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      message.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      setCancellingOrderId(orderId);
      await axios.put(`${API_URL}/orders/${orderId}/cancel`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      message.success('Order cancelled successfully');
      fetchOrders();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to cancel order');
    } finally {
      setCancellingOrderId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'orange';
      case 'confirmed':
        return 'blue';
      case 'preparing':
        return 'cyan';
      case 'arriving':
        return 'purple';
      case 'completed':
        return 'green';
      case 'cancelled':
      case 'rejected':
        return 'red';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'preparing':
        return 'Preparing';
      case 'arriving':
        return 'Arriving';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  const columns = [
    {
      title: 'Order Number',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (total) => <Text strong>${total ? parseFloat(total).toFixed(2) : '0.00'}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedOrder(record);
              setShowOrderDetail(true);
            }}
          >
            View Details
          </Button>
          {(record.status === 'pending' || record.status === 'confirmed' || record.status === 'preparing' || record.status === 'arriving') && (
            <Popconfirm
              title="Cancel this order?"
              description="Are you sure you want to cancel this order?"
              onConfirm={() => handleCancelOrder(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                loading={cancellingOrderId === record.id}
              >
                Cancel
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (!user) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header productId={productId} />
        <Content style={{ padding: '24px', background: '#f0f2f5' }}>
          <Card>
            <Empty
              description="Please sign in to view your orders"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={() => navigate('/shop')}>
                Go to Shop
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
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <Card>
          <Title level={2} style={{ marginBottom: '24px' }}>My Orders</Title>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
            </div>
          ) : orders.length === 0 ? (
            <Empty
              description="You have no orders yet"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={() => navigate('/shop')}>
                Start Shopping
              </Button>
            </Empty>
          ) : (
            <Table
              columns={columns}
              dataSource={orders}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          )}
        </Card>

        {/* Order Detail Modal */}
        <Modal
          title={`Order Details - ${selectedOrder?.order_number || ''}`}
          open={showOrderDetail}
          onCancel={() => {
            setShowOrderDetail(false);
            setSelectedOrder(null);
          }}
          footer={null}
          width={800}
        >
          {selectedOrder && (
            <div>
              <Descriptions bordered column={1} style={{ marginBottom: '24px' }}>
                <Descriptions.Item label="Order Number">
                  <Text strong>{selectedOrder.order_number}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={getStatusColor(selectedOrder.status)}>
                    {getStatusText(selectedOrder.status)}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Order Date">
                  {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Delivery Address">
                  {selectedOrder.delivery_address}
                  {selectedOrder.apt_suite && (
                    <div style={{ marginTop: '4px', color: '#666' }}>
                      Apt./Suite: {selectedOrder.apt_suite}
                    </div>
                  )}
                </Descriptions.Item>
                {selectedOrder.scheduled_delivery_datetime && (
                  <Descriptions.Item label="Scheduled Delivery">
                    {selectedOrder.scheduled_delivery_datetime}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Bag Type">
                  {selectedOrder.bag_type === 'normal' ? 'Normal Bag' : 'Discrete Bag'}
                </Descriptions.Item>
                {selectedOrder.order_request && (
                  <Descriptions.Item label="Order Request">
                    {selectedOrder.order_request}
                  </Descriptions.Item>
                )}
              </Descriptions>

              <Title level={5} style={{ marginBottom: '16px' }}>Order Items</Title>
              <div style={{ marginBottom: '24px' }}>
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {selectedOrder.items.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          gap: '12px',
                          padding: '12px',
                          background: '#fafafa',
                          borderRadius: '4px'
                        }}
                      >
                        {item.product_item_image_url ? (
                          <Image
                            src={getImageUrl(item.product_item_image_url)}
                            alt={item.product_item_name}
                            width={60}
                            height={60}
                            style={{ objectFit: 'cover', borderRadius: '4px' }}
                            preview={false}
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
                              justifyContent: 'center'
                            }}
                          >
                            <ShoppingCartOutlined style={{ fontSize: '24px', color: '#ccc' }} />
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <Text strong style={{ display: 'block' }}>
                            {item.product_item_name}
                          </Text>
                          {item.product_item_description && (
                            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
                              {item.product_item_description}
                            </Text>
                          )}
                          <Text style={{ fontSize: '12px', color: '#666', display: 'block', marginTop: '4px' }}>
                            Quantity: {item.quantity} × ${(item.price || 0).toFixed(2)}
                          </Text>
                        </div>
                        <Text strong>${(item.subtotal || 0).toFixed(2)}</Text>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty description="No items found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </div>

              <div style={{ 
                padding: '16px', 
                background: '#fafafa', 
                borderRadius: '4px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>Subtotal:</Text>
                  <Text>${(selectedOrder.subtotal || 0).toFixed(2)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>Taxes:</Text>
                  <Text>${(selectedOrder.taxes || 0).toFixed(2)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>Delivery Fee:</Text>
                  <Text>${(selectedOrder.delivery_fee || 0).toFixed(2)}</Text>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #e8e8e8'
                }}>
                  <Text strong style={{ fontSize: '16px' }}>Total:</Text>
                  <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                    ${(selectedOrder.total || 0).toFixed(2)}
                  </Title>
                </div>
              </div>

              {(selectedOrder.status === 'pending' || selectedOrder.status === 'confirmed' || selectedOrder.status === 'preparing' || selectedOrder.status === 'arriving') && (
                <div style={{ textAlign: 'right' }}>
                  <Popconfirm
                    title="Cancel this order?"
                    description="Are you sure you want to cancel this order?"
                    onConfirm={() => {
                      handleCancelOrder(selectedOrder.id);
                      setShowOrderDetail(false);
                      setSelectedOrder(null);
                    }}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button danger icon={<CloseOutlined />} loading={cancellingOrderId === selectedOrder.id}>
                      Cancel Order
                    </Button>
                  </Popconfirm>
                </div>
              )}
            </div>
          )}
        </Modal>
      </Content>
    </Layout>
  );
};

export default Orders;

