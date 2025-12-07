import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout, Typography, Card, Spin, Row, Col, Image, Checkbox, Button, Empty, Input, message } from 'antd';
import { ShoppingOutlined, SearchOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import axios from 'axios';
import { getImageUrl } from '../utils/imageUtils';

const { Content, Sider } = Layout;
const { Title, Paragraph } = Typography;
const API_URL = process.env.REACT_APP_API_URL || '/api';

const Shop = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [productId, setProductId] = useState(null);
  const [productItems, setProductItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [error, setError] = useState(null);
  const isInitialLoad = useRef(true);
  const lastFetchParams = useRef({ productId: null, subCategoryIds: '', brandIds: '', search: '' });
  const searchTimeoutRef = useRef(null);

  // Create a map of URL-friendly keys to IDs for easy lookup
  // Format: "categoryName-subcategoryName-id" (e.g., "flowers-rose-123")
  const subCategoryMap = useMemo(() => {
    const map = new Map();
    categories.forEach(category => {
      if (category.subCategories) {
        category.subCategories.forEach(sub => {
          // Create a unique key: "categoryName-subcategoryName-id"
          const categorySlug = category.name.toLowerCase().replace(/\s+/g, '-');
          const subSlug = sub.name.toLowerCase().replace(/\s+/g, '-');
          const key = `${categorySlug}-${subSlug}-${sub.id}`;
          map.set(key, sub.id);
        });
      }
    });
    return map;
  }, [categories]);

  // Create reverse map: ID to URL-friendly key
  const subCategoryIdToKeyMap = useMemo(() => {
    const map = new Map();
    categories.forEach(category => {
      if (category.subCategories) {
        category.subCategories.forEach(sub => {
          const categorySlug = category.name.toLowerCase().replace(/\s+/g, '-');
          const subSlug = sub.name.toLowerCase().replace(/\s+/g, '-');
          const key = `${categorySlug}-${subSlug}-${sub.id}`;
          map.set(sub.id, key);
        });
      }
    });
    return map;
  }, [categories]);

  // Debounce search query - wait 500ms after user stops typing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Only search if query is at least 2 characters
    if (searchQuery.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        setDebouncedSearchQuery(searchQuery);
      }, 500);
    } else {
      // Clear search if less than 2 characters
      setDebouncedSearchQuery('');
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Load filters from URL on mount and when categories/brands are loaded
  useEffect(() => {
    if (categories.length === 0 || brands.length === 0) return;

    const filterParam = searchParams.get('filter');
    const brandsParam = searchParams.get('brands');
    const searchParam = searchParams.get('search');
    
    // Parse subcategory filters
    if (filterParam) {
      const filterKeys = filterParam.split(',').map(f => f.trim().toLowerCase());
      const ids = filterKeys
        .map(key => {
          const id = subCategoryMap.get(key);
          if (id) return id;
          const parts = key.split('-');
          if (parts.length >= 3) {
            const lastPart = parts[parts.length - 1];
            const extractedId = parseInt(lastPart);
            if (!isNaN(extractedId)) {
              return extractedId;
            }
          }
          return null;
        })
        .filter(id => id !== null && id !== undefined);
      
      if (ids.length > 0) {
        const idsStr = ids.sort().join(',');
        const currentIdsStr = selectedSubCategories.sort().join(',');
        if (idsStr !== currentIdsStr) {
          setSelectedSubCategories(ids);
        }
      } else if (selectedSubCategories.length > 0) {
        setSelectedSubCategories([]);
      }
    } else if (selectedSubCategories.length > 0 && isInitialLoad.current) {
      setSelectedSubCategories([]);
    }

    // Parse brand filters
    if (brandsParam) {
      const brandIds = brandsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (brandIds.length > 0) {
        const idsStr = brandIds.sort().join(',');
        const currentIdsStr = selectedBrands.sort().join(',');
        if (idsStr !== currentIdsStr) {
          setSelectedBrands(brandIds);
        }
      } else if (selectedBrands.length > 0) {
        setSelectedBrands([]);
      }
    } else if (selectedBrands.length > 0 && isInitialLoad.current) {
      setSelectedBrands([]);
    }

    // Parse search query from URL
    if (searchParam) {
      setSearchQuery(searchParam);
      setDebouncedSearchQuery(searchParam);
    } else if (searchQuery && isInitialLoad.current) {
      setSearchQuery('');
      setDebouncedSearchQuery('');
    }
    
    isInitialLoad.current = false;
  }, [categories, brands, searchParams, subCategoryMap]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const domain = window.location.host;
        const response = await axios.get(`${API_URL}/public/categories`, {
          headers: {
            'X-Client-Domain': domain
          }
        });
        
        if (response.data && response.data.categories) {
          setCategories(response.data.categories);
          setProductId(response.data.productId);
        } else {
          setError('No categories found');
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(err.response?.data?.error || 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    const fetchBrands = async () => {
      try {
        setLoadingBrands(true);
        const domain = window.location.host;
        const response = await axios.get(`${API_URL}/public/brands`, {
          headers: {
            'X-Client-Domain': domain
          }
        });
        
        if (response.data && response.data.brands) {
          setBrands(response.data.brands);
          if (response.data.productId && !productId) {
            setProductId(response.data.productId);
          }
        }
      } catch (err) {
        console.error('Error fetching brands:', err);
        // Don't show error for brands, just set empty array
        setBrands([]);
      } finally {
        setLoadingBrands(false);
      }
    };

    fetchCategories();
    fetchBrands();
  }, []);

  useEffect(() => {
    const fetchProductItems = async () => {
      if (!productId) return;

      // Send IDs to backend (backend only accepts IDs)
      const subCategoryIds = selectedSubCategories.length > 0 
        ? selectedSubCategories.sort().join(',') 
        : '';
      const brandIds = selectedBrands.length > 0 
        ? selectedBrands.sort().join(',') 
        : '';
      const search = debouncedSearchQuery.trim().length >= 2 ? debouncedSearchQuery.trim() : '';
      
      // Prevent duplicate calls with same parameters
      if (lastFetchParams.current.productId === productId && 
          lastFetchParams.current.subCategoryIds === subCategoryIds &&
          lastFetchParams.current.brandIds === brandIds &&
          lastFetchParams.current.search === search) {
        return;
      }

      // Update last fetch params
      lastFetchParams.current = { productId, subCategoryIds, brandIds, search };

      try {
        setLoadingItems(true);
        const domain = window.location.host;
        
        const params = new URLSearchParams();
        if (subCategoryIds) params.append('subCategoryIds', subCategoryIds);
        if (brandIds) params.append('brandIds', brandIds);
        if (search) params.append('search', search);
        
        const url = `${API_URL}/product-items${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await axios.get(url, {
          headers: {
            'X-Client-Domain': domain
          }
        });
        
        if (response.data && response.data.productItems) {
          setProductItems(response.data.productItems);
          setFilteredItems(response.data.productItems);
        }
      } catch (err) {
        console.error('Error fetching product items:', err);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchProductItems();
  }, [productId, selectedSubCategories, selectedBrands, debouncedSearchQuery]);

  // Update URL when filters change
  useEffect(() => {
    if (subCategoryIdToKeyMap.size === 0) return;

    const newParams = new URLSearchParams(searchParams);
    
    // Update subcategory filter
    if (selectedSubCategories.length === 0) {
      newParams.delete('filter');
    } else {
      const filterKeys = selectedSubCategories
        .map(id => subCategoryIdToKeyMap.get(id))
        .filter(key => key !== undefined)
        .join(',');
      if (filterKeys) {
        newParams.set('filter', filterKeys);
      } else {
        newParams.delete('filter');
      }
    }

    // Update brand filter
    if (selectedBrands.length === 0) {
      newParams.delete('brands');
    } else {
      newParams.set('brands', selectedBrands.sort().join(','));
    }

    // Update search query in URL (only if 2+ characters)
    if (debouncedSearchQuery.trim().length >= 2) {
      newParams.set('search', debouncedSearchQuery.trim());
    } else {
      newParams.delete('search');
    }

    setSearchParams(newParams, { replace: true });
  }, [selectedSubCategories, selectedBrands, debouncedSearchQuery, subCategoryIdToKeyMap, searchParams, setSearchParams]);

  const handleSubCategoryChange = (subCategoryId, checked) => {
    if (checked) {
      setSelectedSubCategories([...selectedSubCategories, subCategoryId]);
    } else {
      setSelectedSubCategories(selectedSubCategories.filter(id => id !== subCategoryId));
    }
  };

  const handleBrandChange = (brandId, checked) => {
    if (checked) {
      setSelectedBrands([...selectedBrands, brandId]);
    } else {
      setSelectedBrands(selectedBrands.filter(id => id !== brandId));
    }
  };

  const handleClearFilters = () => {
    setSelectedSubCategories([]);
    setSelectedBrands([]);
    setSearchQuery('');
    setDebouncedSearchQuery('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('filter');
    newParams.delete('brands');
    newParams.delete('search');
    setSearchParams(newParams, { replace: true });
  };

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header productId={productId} />
        <Content style={{ padding: '24px', background: '#f0f2f5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header productId={productId} />
        <Layout>
          <Sider 
            width={300} 
            style={{ 
              background: '#fff', 
              padding: '16px',
              overflow: 'auto',
              height: 'calc(100vh - 64px)',
              position: 'sticky',
              top: 64
            }}
          >
            {error ? (
              <Card>
                <Paragraph type="danger">{error}</Paragraph>
              </Card>
            ) : (
              <div>
                {(selectedSubCategories.length > 0 || selectedBrands.length > 0) && (
                  <Button
                    type="link"
                    onClick={handleClearFilters}
                    style={{ marginBottom: '16px', paddingLeft: 0 }}
                  >
                    Clear All Filters
                  </Button>
                )}
                <Title level={4} style={{ marginBottom: '16px' }}>Filters</Title>
                
                {/* Categories Section */}
                <div style={{ marginBottom: '24px' }}>
                  <Title level={5} style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
                    Categories
                  </Title>
                  {categories.length === 0 ? (
                    <Paragraph type="secondary" style={{ fontSize: '12px' }}>No categories available</Paragraph>
                  ) : (
                    <div>
                      {categories.map((category) => (
                        <div key={category.id} style={{ marginBottom: '16px' }}>
                          <Title level={5} style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                            {category.name}
                          </Title>
                          {category.subCategories && category.subCategories.length > 0 ? (
                            <div style={{ marginLeft: '8px' }}>
                              {category.subCategories.map((subCategory) => (
                                <div
                                  key={subCategory.id}
                                  style={{
                                    marginBottom: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '4px 0'
                                  }}
                                >
                                  <Checkbox
                                    checked={selectedSubCategories.includes(subCategory.id)}
                                    onChange={(e) => handleSubCategoryChange(subCategory.id, e.target.checked)}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      {subCategory.image_url && (
                                        <Image
                                          src={getImageUrl(subCategory.image_url)}
                                          alt={subCategory.name}
                                          width={24}
                                          height={24}
                                          style={{ objectFit: 'cover', borderRadius: '4px' }}
                                          preview={false}
                                        />
                                      )}
                                      <span>{subCategory.name}</span>
                                    </div>
                                  </Checkbox>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <Paragraph type="secondary" style={{ marginLeft: '8px', fontSize: '12px' }}>
                              No subcategories
                            </Paragraph>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Brands Section */}
                <div style={{ marginBottom: '24px' }}>
                  <Title level={5} style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
                    Brands
                  </Title>
                  {loadingBrands ? (
                    <Spin size="small" />
                  ) : brands.length === 0 ? (
                    <Paragraph type="secondary" style={{ fontSize: '12px' }}>No brands available</Paragraph>
                  ) : (
                    <div style={{ marginLeft: '8px' }}>
                      {brands.map((brand) => (
                        <div
                          key={brand.id}
                          style={{
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '4px 0'
                          }}
                        >
                          <Checkbox
                            checked={selectedBrands.includes(brand.id)}
                            onChange={(e) => handleBrandChange(brand.id, e.target.checked)}
                          >
                            <span>{brand.name}</span>
                          </Checkbox>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Sider>
          
          <Content style={{ padding: '24px', background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <Title level={2} style={{ margin: 0 }}>
                  Products
                  {(selectedSubCategories.length > 0 || selectedBrands.length > 0 || debouncedSearchQuery.length >= 2) && (
                    <span style={{ fontSize: '16px', fontWeight: 'normal', color: '#666', marginLeft: '12px' }}>
                      ({filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'})
                    </span>
                  )}
                </Title>
                <Input
                  placeholder="Search products..."
                  prefix={<SearchOutlined />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  allowClear
                  style={{ maxWidth: '300px' }}
                />
              </div>
              
              {loadingItems ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                  <Spin size="large" />
                </div>
              ) : filteredItems.length === 0 ? (
                <Card>
                  <Empty 
                    description={
                      selectedSubCategories.length > 0 || selectedBrands.length > 0 || debouncedSearchQuery.length >= 2
                        ? "No products match the selected filters" 
                        : "No products available"
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </Card>
              ) : (
                <Row gutter={[16, 16]}>
                  {filteredItems.map((item) => (
                    <Col xs={24} sm={12} md={8} lg={6} key={item.id}>
                      <Card
                        hoverable
                        onClick={() => navigate(`/product/${item.id}`)}
                        style={{ cursor: 'pointer' }}
                        cover={
                          item.image_url ? (
                            <Image
                              src={getImageUrl(item.image_url)}
                              alt={item.name || item.weight}
                              height={200}
                              style={{ objectFit: 'cover' }}
                              preview={false}
                            />
                          ) : (
                            <div style={{ height: 200, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <ShoppingOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                            </div>
                          )
                        }
                      >
                        <Card.Meta
                          title={item.name || `Weight: ${item.weight}`}
                          description={
                            <div>
                              {item.description && (
                                <Paragraph 
                                  ellipsis={{ rows: 2 }} 
                                  style={{ marginBottom: '8px', fontSize: '12px' }}
                                >
                                  {item.description}
                                </Paragraph>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                                  ${item.price?.toFixed(2) || '0.00'}
                                </span>
                                {item.brand_name && (
                                  <span style={{ fontSize: '12px', color: '#999' }}>
                                    {item.brand_name}
                                  </span>
                                )}
                              </div>
                              <Button
                                type="primary"
                                icon={<ShoppingCartOutlined />}
                                block
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent card click
                                  addToCart(item);
                                  message.success(`${item.name || 'Item'} added to cart!`);
                                }}
                              >
                                Add to Cart
                              </Button>
                            </div>
                          }
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </div>
          </Content>
        </Layout>
      </Layout>
  );
};

export default Shop;

