import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Tabs,
  message,
  Space,
  Tag,
  Popconfirm,
  Card,
  Layout,
  Typography
} from 'antd';
import {
  UserOutlined,
  ShoppingOutlined,
  LogoutOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import './AdminDashboard.css';

const { Header, Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;

const API_URL = '/api';

const AdminDashboard = () => {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [createUserForm] = Form.useForm();
  const [assignForm] = Form.useForm();

  // User management states
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm] = Form.useForm();

  // Product management states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm] = Form.useForm();

  // User product assignment states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningUser, setAssigningUser] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [userProducts, setUserProducts] = useState([]);
  const [currentDomainProductId, setCurrentDomainProductId] = useState(null);

  // Detect current domain and get product ID
  useEffect(() => {
    const detectDomainProduct = async () => {
      try {
        const currentDomain = window.location.host; // e.g., "localhost:3000"
        const response = await axios.get(`${API_URL}/products/by-domain?domain=${encodeURIComponent(currentDomain)}`);
        if (response.data && response.data.productId) {
          setCurrentDomainProductId(response.data.productId);
        }
      } catch (error) {
        // Domain not found or not authenticated - that's okay, continue
        console.log('No product found for current domain or not authenticated');
      }
    };

    if (user) {
      detectDomainProduct();
    }
  }, [user]);

  useEffect(() => {
    if (isAdmin() || user?.role === 'user') {
      if (isAdmin()) {
        fetchUsers();
        if (isSuperAdmin()) {
          fetchAllProducts();
        }
      }
      fetchProducts();
    }
  }, [isAdmin, user, currentDomainProductId]);

  const showError = (msg) => {
    message.error(msg);
  };

  const showSuccess = (msg) => {
    message.success(msg);
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/users`);
      let usersData = response.data.users || [];
      
      // If not super admin and we have a current domain product, filter users to only those with this product
      if (!isSuperAdmin() && currentDomainProductId) {
        usersData = usersData.filter(user => {
          // Check if user has the current domain's product
          return user.products && user.products.some(p => p.id === currentDomainProductId);
        });
      }
      
      setUsers(usersData);
    } catch (error) {
      showError('Failed to fetch users');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/products`);
      let productsData = response.data.products || [];
      
      // If not super admin and we have a current domain product, filter to only that product
      if (!isSuperAdmin() && currentDomainProductId) {
        productsData = productsData.filter(p => p.id === currentDomainProductId);
      }
      
      setProducts(productsData);
      // Store user's products for use in dropdowns (for regular admins)
      if (!isSuperAdmin()) {
        setUserProducts(productsData);
      }
      return productsData;
    } catch (error) {
      showError('Failed to fetch products');
      setProducts([]);
      return [];
    }
  };

  const fetchAllProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/products`);
      setAllProducts(response.data.products);
      // For super admin, also set as userProducts
      setUserProducts(response.data.products);
    } catch (error) {
      showError('Failed to fetch all products');
    }
  };

  // Get available products for dropdowns (user's products for regular admin, all products for super admin)
  const getAvailableProducts = () => {
    if (isSuperAdmin()) {
      return allProducts;
    }
    // For regular admin, if we have a current domain product, only show that product
    let available = userProducts.length > 0 ? userProducts : products;
    if (currentDomainProductId) {
      available = available.filter(p => p.id === currentDomainProductId);
    }
    return available;
  };

  // Check if current admin has only one product
  const hasOnlyOneProduct = () => {
    const availableProducts = getAvailableProducts();
    return availableProducts.length === 1;
  };

  // Get the single product ID if admin has only one product
  const getSingleProductId = () => {
    if (hasOnlyOneProduct()) {
      const availableProducts = getAvailableProducts();
      return availableProducts[0].id;
    }
    return null;
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    if (!isSuperAdmin()) {
      showError('Only super admin can change user roles');
      return;
    }

    try {
      await axios.put(`${API_URL}/admin/users/${userId}/role`, { role: newRole });
      showSuccess('User role updated successfully');
      fetchUsers();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to update user role');
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    editUserForm.setFieldsValue({
      email: user.email || '',
      password: ''
    });
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async (values) => {
    setLoading(true);
    try {
      const updateData = {};
      if (values.email !== undefined) {
        updateData.email = values.email || '';
      }
      if (values.password && values.password.trim()) {
        updateData.password = values.password;
      }

      await axios.put(`${API_URL}/admin/users/${editingUser.id}`, updateData);
      showSuccess('User updated successfully');
      setShowEditUserModal(false);
      setEditingUser(null);
      editUserForm.resetFields();
      fetchUsers();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`${API_URL}/admin/users/${userId}`);
      showSuccess('User deleted successfully');
      fetchUsers();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleProductSubmit = async (values) => {
    setLoading(true);
    const trimmedTitle = values.title.trim();
    const trimmedDomain = values.domain?.trim() || '';
    
    if (!trimmedTitle) {
      showError('Product title is required');
      setLoading(false);
      return;
    }

    if (!trimmedDomain) {
      showError('Domain is required');
      setLoading(false);
      return;
    }

    const duplicateProduct = products.find(
      p => p.name.toLowerCase() === trimmedTitle.toLowerCase() && 
      (!editingProduct || p.id !== editingProduct.id)
    );

    if (duplicateProduct) {
      showError('A product with this name already exists');
      setLoading(false);
      return;
    }

    const duplicateDomain = products.find(
      p => p.domain && p.domain.toLowerCase() === trimmedDomain.toLowerCase() && 
      (!editingProduct || p.id !== editingProduct.id)
    );

    if (duplicateDomain) {
      showError('A product with this domain already exists');
      setLoading(false);
      return;
    }

    try {
      const productData = {
        name: trimmedTitle,
        description: values.description || '',
        price: 0,
        stock: 0,
        image_url: '',
        domain: trimmedDomain
      };
      
      if (editingProduct) {
        await axios.put(`${API_URL}/products/${editingProduct.id}`, productData);
        showSuccess('Product updated successfully');
      } else {
        await axios.post(`${API_URL}/products`, productData);
        showSuccess('Product created successfully');
      }
      setShowProductModal(false);
      setEditingProduct(null);
      productForm.resetFields();
      fetchProducts();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await axios.delete(`${API_URL}/products/${productId}`);
      showSuccess('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to delete product');
    }
  };

  const openEditProduct = (product) => {
    setEditingProduct(product);
    productForm.setFieldsValue({
      title: product.name || product.title || '',
      description: product.description || '',
      domain: product.domain || ''
    });
    setShowProductModal(true);
  };

  const handleAssignProducts = (user) => {
    setAssigningUser(user);
    const productIds = user.products ? user.products.map(p => p.id) : [];
    assignForm.setFieldsValue({ productIds });
    setShowAssignModal(true);
  };

  const handleCreateUser = async (values) => {
    setLoading(true);

    // If admin has only one product and role is not super_admin, auto-assign it
    let productIds = values.productIds || [];
    if (values.role !== 'super_admin' && hasOnlyOneProduct()) {
      const singleProductId = getSingleProductId();
      if (singleProductId) {
        productIds = [singleProductId];
      }
    }

    if (values.role !== 'super_admin' && productIds.length === 0) {
      showError('User must have at least one product assigned');
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${API_URL}/admin/users`, {
        username: values.username,
        password: values.password,
        email: values.email || '',
        role: values.role,
        productIds: productIds
      });
      showSuccess('User created successfully');
      setShowCreateUserModal(false);
      createUserForm.resetFields();
      fetchUsers();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProductAssignment = async (values) => {
    if (!assigningUser) return;
    
    const productIds = values.productIds || [];
    if (assigningUser.role !== 'super_admin' && productIds.length === 0) {
      showError('User must have at least one product assigned');
      return;
    }

    try {
      await axios.post(`${API_URL}/admin/users/${assigningUser.id}/products`, {
        productIds
      });
      showSuccess('Products assigned successfully');
      setShowAssignModal(false);
      setAssigningUser(null);
      assignForm.resetFields();
      fetchUsers();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to assign products');
    }
  };

  const getRoleTag = (role) => {
    const colors = {
      super_admin: 'red',
      admin: 'blue',
      user: 'blue'
    };
    return <Tag color={colors[role]}>{role}</Tag>;
  };

  // Table column definitions
  const userColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username'
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => email || '-'
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role, record) => {
        if (isSuperAdmin()) {
          return (
            <Select
              value={role}
              onChange={(value) => handleUpdateUserRole(record.id, value)}
              style={{ width: 120 }}
            >
              <Select.Option value="user">User</Select.Option>
              <Select.Option value="admin">Admin</Select.Option>
              {isSuperAdmin() && (
                <Select.Option value="super_admin">Super Admin</Select.Option>
              )}
            </Select>
          );
        }
        return getRoleTag(role);
      }
    },
    {
      title: 'Products',
      key: 'products',
      render: (_, record) => {
        if (record.role === 'super_admin') {
          return <span style={{ color: '#999', fontStyle: 'italic' }}>All products</span>;
        }
        const products = record.products || [];
        if (products.length === 0) {
          return <Tag color="red">No products</Tag>;
        }
        return (
          <Space wrap>
            {products.map((product) => (
              <Tag key={product.id} color="blue">
                {product.name}
              </Tag>
            ))}
          </Space>
        );
      }
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString()
    }
  ];

  if (isAdmin()) {
    userColumns.push({
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditUser(record)}
          >
            Edit
          </Button>
          {record.role !== 'super_admin' && 
           !hasOnlyOneProduct() && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleAssignProducts(record)}
            >
              Assign Products
            </Button>
          )}
          <Popconfirm
            title="Are you sure you want to delete this user?"
            onConfirm={() => handleDeleteUser(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="primary" danger size="small" icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      )
    });
  }

  const productColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Domain',
      dataIndex: 'domain',
      key: 'domain',
      render: (domain) => domain || '-'
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (desc) => desc || '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        return (
          <Space>
            <Button
              type="default"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => window.open(`/admin/product/${record.id}`, '_blank')}
            >
              View
            </Button>
            {isSuperAdmin() && (
              <>
                <Button
                  type="primary"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openEditProduct(record)}
                >
                  Edit
                </Button>
                <Popconfirm
                  title="Are you sure you want to delete this product?"
                  onConfirm={() => handleDeleteProduct(record.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="primary" danger size="small" icon={<DeleteOutlined />}>
                    Delete
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
        );
      }
    }
  ];

  // Filter tabs based on user role - user role can only see products
  const getTabItems = () => {
    const tabs = [];
    
    // Dashboard tab - shown to all users
    tabs.push({
      key: 'dashboard',
      label: (
        <span>
          <DashboardOutlined />
          Dashboard
        </span>
      ),
      children: (
        <Card title="Dashboard" className="dashboard-card">
          <div className="dashboard-content">
            <Title level={3} className="dashboard-welcome-title">Welcome to Shop Admin Panel</Title>
            <p className="dashboard-welcome-text">Welcome, <strong>{user?.username}</strong>! Your role: {getRoleTag(user?.role)}</p>
            <div className="dashboard-stats-section">
              <Title level={4} className="dashboard-stats-title">Quick Stats</Title>
              <Space size="large" wrap className="dashboard-stats-cards">
                <Card className="stat-card stat-card-products">
                  <div className="stat-card-content">
                    <div className="stat-number stat-number-products">
                      {products.length}
                    </div>
                    <div className="stat-label">Products</div>
                  </div>
                </Card>
                {isAdmin() && (
                  <Card className="stat-card stat-card-users">
                    <div className="stat-card-content">
                      <div className="stat-number stat-number-users">
                        {users.length}
                      </div>
                      <div className="stat-label">Users</div>
                    </div>
                  </Card>
                )}
              </Space>
            </div>
          </div>
        </Card>
      )
    });
    
    // Only admin and super admin can see users tab
    if (isAdmin()) {
      tabs.push({
        key: 'users',
        label: (
          <span>
            <UserOutlined />
            Users Management
          </span>
        ),
        children: (
        <Card
          title="Users"
          extra={
            isAdmin() && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  createUserForm.resetFields();
                  // If admin has only one product, auto-set it
                  if (hasOnlyOneProduct()) {
                    const singleProductId = getSingleProductId();
                    createUserForm.setFieldsValue({ 
                      role: 'user',
                      productIds: singleProductId ? [singleProductId] : []
                    });
                  }
                  setShowCreateUserModal(true);
                }}
              >
                Create User
              </Button>
            )
          }
        >
          <Table
            dataSource={users}
            columns={userColumns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      )
      });
    }
    
    // All users (including user role) can see products tab
    tabs.push({
      key: 'products',
      label: (
        <span>
          <ShoppingOutlined />
          Products Management
        </span>
      ),
      children: (
        <Card
          title="Products"
          extra={
            isSuperAdmin() && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingProduct(null);
                  productForm.resetFields();
                  setShowProductModal(true);
                }}
              >
                Add Product
              </Button>
            )
          }
          >
            <Table
              dataSource={products || []}
              columns={productColumns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: 'No products available' }}
            />
          </Card>
      )
    });
    
    return tabs;
  };

  const tabItems = getTabItems();

  // Set default active tab - all users start on dashboard
  useEffect(() => {
    setActiveTab('dashboard');
  }, [user]);

  // User role can access dashboard but only see products tab
  if (!isAdmin() && user?.role !== 'user') {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: '50px' }}>
          <Card>
            <Title level={2}>Access Denied</Title>
            <p>You need admin privileges to access this page.</p>
            <p>Your current role: {getRoleTag(user?.role)}</p>
          </Card>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="admin-header-responsive" style={{ 
        background: '#001529', 
        padding: '0 24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <Title 
          level={3} 
          className="header-title-responsive"
          style={{ 
            color: 'white', 
            margin: 0, 
            cursor: 'pointer'
          }}
          onClick={() => navigate('/')}
        >
          Shop Admin Panel
        </Title>
        <Space className="header-actions-responsive">
          <span className="header-welcome-text" style={{ color: 'white' }}>
            Welcome, {user?.username} ({user?.role})
          </span>
          <Button 
            type="primary" 
            danger 
            icon={<LogoutOutlined />} 
            onClick={logout}
            className="header-logout-btn"
          >
            Logout
          </Button>
        </Space>
      </Header>
      <Content style={{ padding: '24px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />

        {/* Product Modal */}
        <Modal
          title={editingProduct ? 'Edit Product' : 'Add Product'}
          open={showProductModal}
          onCancel={() => {
            setShowProductModal(false);
            setEditingProduct(null);
            productForm.resetFields();
          }}
          footer={null}
        >
          <Form
            form={productForm}
            layout="vertical"
            onFinish={handleProductSubmit}
          >
            <Form.Item
              name="title"
              label="Title"
              rules={[{ required: true, message: 'Product title is required' }]}
              tooltip="Product title must be unique"
            >
              <Input placeholder="Enter product title" />
            </Form.Item>
            <Form.Item
              name="description"
              label="Description"
              tooltip="Optional product description"
            >
              <TextArea rows={3} placeholder="Enter product description" />
            </Form.Item>
            <Form.Item
              name="domain"
              label="Domain"
              rules={[{ required: true, message: 'Domain is required' }]}
              tooltip="Domain from where this product can be accessed (e.g., localhost:3000)"
            >
              <Input placeholder="Enter domain (e.g., localhost:3000)" />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button onClick={() => {
                  setShowProductModal(false);
                  setEditingProduct(null);
                  productForm.resetFields();
                }}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {editingProduct ? 'Update' : 'Create'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Create User Modal */}
        <Modal
          title="Create User"
          open={showCreateUserModal}
          onCancel={() => {
            setShowCreateUserModal(false);
            createUserForm.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form
            form={createUserForm}
            layout="vertical"
            onFinish={handleCreateUser}
            initialValues={{ role: 'user' }}
          >
            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true, message: 'Username is required' }]}
              tooltip="Username is required and must be unique"
            >
              <Input placeholder="Enter username" />
            </Form.Item>
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Password is required' }]}
              tooltip="Password is required"
            >
              <Input.Password placeholder="Enter password" />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              tooltip="Email is optional"
            >
              <Input type="email" placeholder="Enter email (optional)" />
            </Form.Item>
            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true, message: 'Role is required' }]}
            >
              <Select>
                <Select.Option value="user">User</Select.Option>
                <Select.Option value="admin">Admin</Select.Option>
                {isSuperAdmin() && (
                  <Select.Option value="super_admin">Super Admin</Select.Option>
                )}
              </Select>
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.role !== currentValues.role}
            >
              {({ getFieldValue }) => {
                const role = getFieldValue('role');
                if (role === 'super_admin') return null;
                
                // If admin has only one product, auto-assign it and don't show dropdown
                if (hasOnlyOneProduct()) {
                  const singleProductId = getSingleProductId();
                  // Set the single product automatically
                  setTimeout(() => {
                    createUserForm.setFieldsValue({ productIds: [singleProductId] });
                  }, 0);
                  return null; // Don't show the dropdown
                }
                
                return (
                  <Form.Item
                    name="productIds"
                    label="Products"
                    rules={[{ required: true, message: 'At least one product is required' }]}
                    tooltip="Select at least one product (required for non-super-admin users)"
                  >
                    <Select
                      mode="multiple"
                      placeholder="Select products"
                      options={getAvailableProducts().map(p => ({ label: p.name, value: p.id }))}
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    />
                  </Form.Item>
                );
              }}
            </Form.Item>
            <Form.Item>
              <Space>
                <Button onClick={() => {
                  setShowCreateUserModal(false);
                  createUserForm.resetFields();
                }}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Create User
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Assign Products Modal */}
        <Modal
          title={`Assign Products to ${assigningUser?.username}`}
          open={showAssignModal}
          onCancel={() => {
            setShowAssignModal(false);
            setAssigningUser(null);
            assignForm.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form
            form={assignForm}
            layout="vertical"
            onFinish={handleSaveProductAssignment}
          >
            <Form.Item
              name="productIds"
              label="Products"
              rules={[
                {
                  required: assigningUser?.role !== 'super_admin',
                  message: 'At least one product is required'
                }
              ]}
              tooltip="Select products to assign to this user. User must have at least one product."
            >
              <Select
                mode="multiple"
                placeholder="Select products"
                options={getAvailableProducts().map(p => ({ label: p.name, value: p.id }))}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button onClick={() => {
                  setShowAssignModal(false);
                  setAssigningUser(null);
                  assignForm.resetFields();
                }}>
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                >
                  Save Assignment
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Edit User Modal */}
        <Modal
          title={`Edit User: ${editingUser?.username}`}
          open={showEditUserModal}
          onCancel={() => {
            setShowEditUserModal(false);
            setEditingUser(null);
            editUserForm.resetFields();
          }}
          footer={null}
          width={500}
        >
          <Form
            form={editUserForm}
            layout="vertical"
            onFinish={handleUpdateUser}
          >
            <Form.Item
              name="email"
              label="Email"
              tooltip="Email is optional"
            >
              <Input type="email" placeholder="Enter email (optional)" />
            </Form.Item>
            <Form.Item
              name="password"
              label="Password"
              tooltip="Leave empty to keep current password"
            >
              <Input.Password placeholder="Enter new password (optional)" />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button onClick={() => {
                  setShowEditUserModal(false);
                  setEditingUser(null);
                  editUserForm.resetFields();
                }}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Update User
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
};

export default AdminDashboard;

