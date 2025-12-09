import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  Card, 
  Button, 
  Typography, 
  Descriptions, 
  Spin, 
  message, 
  Layout, 
  Space, 
  Tabs,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  Popconfirm,
  Tag,
  Divider,
  Row,
  Col,
  Switch,
  InputNumber,
  Collapse,
  Upload,
  Empty
} from 'antd';
import { 
  LogoutOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  DragOutlined,
  MenuOutlined,
  UploadOutlined,
  EyeOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons';
import './ProductDetail.css';
import { getImageUrl, openImageInNewTab } from '../utils/imageUtils';

const { Title, Text } = Typography;
const { Header, Content } = Layout;
const { Option } = Select;
const API_URL = process.env.REACT_APP_API_URL || '/api';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  
  // Category management states
  const [categories, setCategories] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubCategory, setEditingSubCategory] = useState(null);
  const [selectedCategoryForSub, setSelectedCategoryForSub] = useState(null);
  const [categoryForm] = Form.useForm();
  const [subCategoryForm] = Form.useForm();
  const [productCategoryForm] = Form.useForm();
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState(null);
  const [draggedSubCategoryIndex, setDraggedSubCategoryIndex] = useState(null);
  const [subCategoryImageFile, setSubCategoryImageFile] = useState(null);
  const [subCategoryImagePreview, setSubCategoryImagePreview] = useState(null);

  // Promo code management states
  const [promoCodes, setPromoCodes] = useState([]);
  const [loadingPromoCodes, setLoadingPromoCodes] = useState(false);
  const [showPromoCodeModal, setShowPromoCodeModal] = useState(false);
  const [editingPromoCode, setEditingPromoCode] = useState(null);
  const [promoCodeForm] = Form.useForm();

  // Product items management states
  const [productItems, setProductItems] = useState([]);
  const [loadingProductItems, setLoadingProductItems] = useState(false);
  const [showProductItemModal, setShowProductItemModal] = useState(false);
  const [editingProductItem, setEditingProductItem] = useState(null);
  const [productItemForm] = Form.useForm();
  const [draggedProductItemIndex, setDraggedProductItemIndex] = useState(null);
  const [productItemImageFile, setProductItemImageFile] = useState(null);
  const [productItemImagePreview, setProductItemImagePreview] = useState(null);

  // Brand management states
  const [brands, setBrands] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [brandForm] = Form.useForm();

  // Tax management states
  const [taxes, setTaxes] = useState([]);
  const [loadingTaxes, setLoadingTaxes] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [editingTax, setEditingTax] = useState(null);
  const [taxForm] = Form.useForm();

  // Orders management states
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);

  // Track which tabs have been loaded
  const [loadedTabs, setLoadedTabs] = useState(new Set());

  useEffect(() => {
    fetchProduct();
    // Reset form when product ID changes
    productCategoryForm.resetFields();
    setProductCategories([]);
    setLoadedTabs(new Set()); // Reset loaded tabs when product changes
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

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      // Fetch categories for this specific product
      const response = await axios.get(`${API_URL}/categories?productId=${id}`);
      setCategories(response.data.categories || []);
    } catch (error) {
      message.error('Failed to fetch categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchProductCategories = async () => {
    try {
      // Ensure we're using the current product ID
      const currentProductId = parseInt(id);
      if (!currentProductId) {
        return;
      }

      // Reset form first to clear any previous product's data
      productCategoryForm.resetFields();
      
      const response = await axios.get(`${API_URL}/products/${currentProductId}/categories`);
      const productCats = response.data.categories || [];
      
      // Only set categories if we're still on the same product
      if (parseInt(id) === currentProductId) {
        setProductCategories(productCats);
        
        // Initialize form values after categories are loaded
        setTimeout(() => {
          // Double-check we're still on the same product
          if (parseInt(id) !== currentProductId) {
            return;
          }
          
          const formValues = {};
          productCats.forEach(pc => {
            const key = pc.category_id.toString();
            // Multi-select - use array for all categories
            if (!formValues[key]) {
              formValues[key] = [];
            }
            if (pc.sub_category_id) {
              formValues[key].push(pc.sub_category_id);
            }
          });
          productCategoryForm.setFieldsValue(formValues);
        }, 100);
      }
    } catch (error) {
      message.error('Failed to fetch product categories');
    }
  };

  const handleCreateCategory = async (values) => {
    try {
      await axios.post(`${API_URL}/categories`, { name: values.name, productId: id });
      message.success('Category created successfully');
      setShowCategoryModal(false);
      categoryForm.resetFields();
      fetchCategories();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to create category');
    }
  };

  const handleUpdateCategory = async (values) => {
    try {
      await axios.put(`${API_URL}/categories/${editingCategory.id}`, { name: values.name });
      message.success('Category updated successfully');
      setShowCategoryModal(false);
      setEditingCategory(null);
      categoryForm.resetFields();
      fetchCategories();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      await axios.delete(`${API_URL}/categories/${categoryId}?productId=${id}`);
      message.success('Category deleted successfully');
      fetchCategories();
      fetchProductCategories();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to delete category');
    }
  };

  const handleCreateSubCategory = async (values) => {
    try {
      let imageUrl = values.image_url;

      // Upload image if file was selected
      if (subCategoryImageFile) {
        const formData = new FormData();
        formData.append('image', subCategoryImageFile);
        formData.append('productId', id);

        const uploadResponse = await axios.post(`${API_URL}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        imageUrl = uploadResponse.data.imageUrl;
      }

      await axios.post(`${API_URL}/sub-categories`, {
        categoryId: selectedCategoryForSub,
        name: values.name,
        image_url: imageUrl,
        productId: id
      });
      message.success('Sub-category created successfully');
      setShowSubCategoryModal(false);
      setSelectedCategoryForSub(null);
      subCategoryForm.resetFields();
      setSubCategoryImageFile(null);
      setSubCategoryImagePreview(null);
      fetchCategories();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to create sub-category');
    }
  };

  const handleUpdateSubCategory = async (values) => {
    try {
      let imageUrl = values.image_url;

      // Upload new image if file was selected
      if (subCategoryImageFile) {
        const formData = new FormData();
        formData.append('image', subCategoryImageFile);
        formData.append('productId', id);

        const uploadResponse = await axios.post(`${API_URL}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        imageUrl = uploadResponse.data.imageUrl;
      }

      await axios.put(`${API_URL}/sub-categories/${editingSubCategory.id}`, { 
        name: values.name,
        image_url: imageUrl
      });
      message.success('Sub-category updated successfully');
      setShowSubCategoryModal(false);
      setEditingSubCategory(null);
      subCategoryForm.resetFields();
      setSubCategoryImageFile(null);
      setSubCategoryImagePreview(null);
      fetchCategories();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to update sub-category');
    }
  };

  const handleDeleteSubCategory = async (subCategoryId) => {
    try {
      await axios.delete(`${API_URL}/sub-categories/${subCategoryId}?productId=${id}`);
      message.success('Sub-category deleted successfully');
      fetchCategories();
      fetchProductCategories();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to delete sub-category');
    }
  };

  const handleSaveProductCategories = async (values) => {
    try {
      // Ensure we're using the current product ID
      const currentProductId = parseInt(id);
      if (!currentProductId) {
        message.error('Invalid product ID');
        return;
      }

      // Transform form values to API format
      const categoriesData = Object.keys(values).map(categoryId => {
        const subCategoryValue = values[categoryId];
        let subCategoryIds = [];
        
        if (subCategoryValue) {
          if (Array.isArray(subCategoryValue)) {
            subCategoryIds = subCategoryValue;
          } else {
            // Single value (for THC Potency)
            subCategoryIds = [subCategoryValue];
          }
        }
        
        return {
          categoryId: parseInt(categoryId),
          subCategoryIds: subCategoryIds
        };
      }).filter(cat => cat.categoryId && cat.subCategoryIds.length > 0);

      // Use the current product ID explicitly
      await axios.post(`${API_URL}/products/${currentProductId}/categories`, { categories: categoriesData });
      message.success('Product categories updated successfully');
      // Refresh product categories for this specific product
      await fetchProductCategories();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to update product categories');
    }
  };

  const openEditCategory = (category) => {
    setEditingCategory(category);
    categoryForm.setFieldsValue({ name: category.name });
    setShowCategoryModal(true);
  };

  const openEditSubCategory = (subCategory, categoryId) => {
    setEditingSubCategory(subCategory);
    setSelectedCategoryForSub(categoryId);
    const imageUrl = subCategory.image_url || null;
    subCategoryForm.setFieldsValue({ 
      name: subCategory.name,
      image_url: imageUrl
    });
    setSubCategoryImageFile(null);
    setSubCategoryImagePreview(imageUrl);
    setShowSubCategoryModal(true);
  };

  const openAddSubCategory = (categoryId) => {
    setEditingSubCategory(null);
    setSelectedCategoryForSub(categoryId);
    subCategoryForm.resetFields();
    setSubCategoryImageFile(null);
    setSubCategoryImagePreview(null);
    setShowSubCategoryModal(true);
  };

  const handleCategoryDragStart = (e, index) => {
    setDraggedCategoryIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
  };

  const handleCategoryDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleCategoryDrop = async (e, toIndex) => {
    e.preventDefault();
    if (draggedCategoryIndex === null || draggedCategoryIndex === toIndex) {
      setDraggedCategoryIndex(null);
      return;
    }

    const newCategories = [...categories];
    const [moved] = newCategories.splice(draggedCategoryIndex, 1);
    newCategories.splice(toIndex, 0, moved);

    // Update display_order for all affected categories
    const updates = newCategories.map((cat, index) => ({
      id: cat.id,
      display_order: index + 1
    }));

    try {
      await axios.put(`${API_URL}/categories/reorder`, { categories: updates, productId: id });
      setCategories(newCategories);
      message.success('Category order updated');
    } catch (error) {
      message.error('Failed to update category order');
      fetchCategories(); // Revert on error
    }
    setDraggedCategoryIndex(null);
  };

  const handleSubCategoryDragStart = (e, categoryId, index) => {
    setDraggedSubCategoryIndex({ categoryId, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
  };

  const handleSubCategoryDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSubCategoryDrop = async (e, categoryId, toIndex) => {
    e.preventDefault();
    if (!draggedSubCategoryIndex || draggedSubCategoryIndex.categoryId !== categoryId) {
      setDraggedSubCategoryIndex(null);
      return;
    }

    const fromIndex = draggedSubCategoryIndex.index;
    if (fromIndex === toIndex) {
      setDraggedSubCategoryIndex(null);
      return;
    }

    const category = categories.find(c => c.id === categoryId);
    if (!category || !category.subCategories) {
      setDraggedSubCategoryIndex(null);
      return;
    }

    const newSubCategories = [...category.subCategories];
    const [moved] = newSubCategories.splice(fromIndex, 1);
    newSubCategories.splice(toIndex, 0, moved);

    // Update display_order for all affected sub-categories
    const updates = newSubCategories.map((sub, index) => ({
      id: sub.id,
      display_order: index + 1
    }));

    try {
      await axios.put(`${API_URL}/sub-categories/reorder`, { subCategories: updates, productId: id });
      category.subCategories = newSubCategories;
      setCategories([...categories]);
      message.success('Sub-category order updated');
    } catch (error) {
      message.error('Failed to update sub-category order');
      fetchCategories(); // Revert on error
    }
    setDraggedSubCategoryIndex(null);
  };

  const fetchPromoCodes = async () => {
    try {
      setLoadingPromoCodes(true);
      const response = await axios.get(`${API_URL}/products/${id}/promo-codes`);
      setPromoCodes(response.data.promoCodes || []);
    } catch (error) {
      message.error('Failed to fetch promo codes');
    } finally {
      setLoadingPromoCodes(false);
    }
  };

  const fetchProductItems = async () => {
    try {
      setLoadingProductItems(true);
      const response = await axios.get(`${API_URL}/products/${id}/product-items`);
      setProductItems(response.data.productItems || []);
    } catch (error) {
      message.error('Failed to fetch product items');
    } finally {
      setLoadingProductItems(false);
    }
  };


  const handleCreatePromoCode = async (values) => {
    try {
      await axios.post(`${API_URL}/products/${id}/promo-codes`, {
        name: values.name,
        discount_percentage: values.discount_percentage,
        is_active: values.is_active !== undefined ? values.is_active : true
      });
      message.success('Promo code created successfully');
      setShowPromoCodeModal(false);
      promoCodeForm.resetFields();
      fetchPromoCodes();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to create promo code');
    }
  };

  const handleUpdatePromoCode = async (values) => {
    try {
      await axios.put(`${API_URL}/promo-codes/${editingPromoCode.id}`, {
        name: values.name,
        discount_percentage: values.discount_percentage,
        is_active: values.is_active !== undefined ? values.is_active : true
      });
      message.success('Promo code updated successfully');
      setShowPromoCodeModal(false);
      setEditingPromoCode(null);
      promoCodeForm.resetFields();
      fetchPromoCodes();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to update promo code');
    }
  };

  const handleDeletePromoCode = async (promoCodeId) => {
    try {
      await axios.delete(`${API_URL}/promo-codes/${promoCodeId}`);
      message.success('Promo code deleted successfully');
      fetchPromoCodes();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to delete promo code');
    }
  };

  const handleTogglePromoCode = async (promoCodeId, currentState) => {
    try {
      await axios.put(`${API_URL}/promo-codes/${promoCodeId}/toggle`);
      message.success(`Promo code ${currentState ? 'deactivated' : 'activated'} successfully`);
      fetchPromoCodes();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to toggle promo code');
    }
  };

  const openEditPromoCode = (promoCode) => {
    setEditingPromoCode(promoCode);
    promoCodeForm.setFieldsValue({
      name: promoCode.name,
      discount_percentage: promoCode.discount_percentage,
      is_active: promoCode.is_active === 1
    });
    setShowPromoCodeModal(true);
  };

  const openAddPromoCode = () => {
    setEditingPromoCode(null);
    promoCodeForm.resetFields();
    setShowPromoCodeModal(true);
  };

  const fetchBrands = async () => {
    try {
      setLoadingBrands(true);
      const response = await axios.get(`${API_URL}/products/${id}/brands`);
      setBrands(response.data.brands || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
      message.error('Failed to fetch brands');
    } finally {
      setLoadingBrands(false);
    }
  };

  const handleCreateBrand = async (values) => {
    try {
      await axios.post(`${API_URL}/products/${id}/brands`, {
        name: values.name
      });
      message.success('Brand created successfully');
      setShowBrandModal(false);
      brandForm.resetFields();
      fetchBrands();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to create brand');
    }
  };

  const handleUpdateBrand = async (values) => {
    try {
      await axios.put(`${API_URL}/brands/${editingBrand.id}`, {
        name: values.name
      });
      message.success('Brand updated successfully');
      setShowBrandModal(false);
      setEditingBrand(null);
      brandForm.resetFields();
      fetchBrands();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to update brand');
    }
  };

  const handleDeleteBrand = async (brandId) => {
    try {
      await axios.delete(`${API_URL}/brands/${brandId}`);
      message.success('Brand deleted successfully');
      fetchBrands();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to delete brand');
    }
  };

  const openEditBrand = (brand) => {
    setEditingBrand(brand);
    brandForm.setFieldsValue({
      name: brand.name
    });
    setShowBrandModal(true);
  };

  const openAddBrand = () => {
    setEditingBrand(null);
    brandForm.resetFields();
    setShowBrandModal(true);
  };

  const fetchTaxes = async () => {
    try {
      setLoadingTaxes(true);
      const response = await axios.get(`${API_URL}/products/${id}/taxes`);
      setTaxes(response.data.taxes || []);
    } catch (error) {
      console.error('Error fetching taxes:', error);
      message.error('Failed to fetch taxes');
    } finally {
      setLoadingTaxes(false);
    }
  };

  const handleCreateTax = async (values) => {
    try {
      await axios.post(`${API_URL}/products/${id}/taxes`, {
        name: values.name,
        type: values.type,
        value: values.value,
        display_order: values.display_order || 0,
        is_active: values.is_active !== undefined ? values.is_active : true
      });
      message.success('Tax created successfully');
      setShowTaxModal(false);
      taxForm.resetFields();
      fetchTaxes();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to create tax');
    }
  };

  const handleUpdateTax = async (values) => {
    try {
      await axios.put(`${API_URL}/taxes/${editingTax.id}`, {
        name: values.name,
        type: values.type,
        value: values.value,
        display_order: values.display_order || 0,
        is_active: values.is_active !== undefined ? values.is_active : true
      });
      message.success('Tax updated successfully');
      setShowTaxModal(false);
      setEditingTax(null);
      taxForm.resetFields();
      fetchTaxes();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to update tax');
    }
  };

  const handleDeleteTax = async (taxId) => {
    try {
      await axios.delete(`${API_URL}/taxes/${taxId}?productId=${id}`);
      message.success('Tax deleted successfully');
      fetchTaxes();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to delete tax');
    }
  };

  const openEditTax = (tax) => {
    setEditingTax(tax);
    taxForm.setFieldsValue({
      name: tax.name,
      type: tax.type,
      value: tax.value,
      display_order: tax.display_order || 0,
      is_active: tax.is_active === 1
    });
    setShowTaxModal(true);
  };

  const openAddTax = () => {
    setEditingTax(null);
    taxForm.resetFields();
    taxForm.setFieldsValue({
      type: 'percentage',
      is_active: true,
      display_order: 0
    });
    setShowTaxModal(true);
  };

  // Orders management functions
  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const response = await axios.get(`${API_URL}/products/${id}/orders`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch orders';
      message.error(errorMessage);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${API_URL}/orders/${orderId}/status`, { status }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      message.success('Order status updated successfully');
      fetchOrders();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to update order status');
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

  const handleCreateProductItem = async (values) => {
    try {
      let imageUrl = values.image_url;

      // Upload image if file was selected
      if (productItemImageFile) {
        const formData = new FormData();
        formData.append('image', productItemImageFile);
        formData.append('productId', id);

        const uploadResponse = await axios.post(`${API_URL}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        imageUrl = uploadResponse.data.imageUrl;
      }

      await axios.post(`${API_URL}/products/${id}/product-items`, {
        name: values.name,
        description: values.description,
        weight: values.weight,
        price: values.price,
        image_url: imageUrl,
        is_active: values.is_active !== undefined ? values.is_active : true,
        brand_id: values.brand_id || null,
        sub_category_ids: values.sub_category_ids || []
      });
      message.success('Product item created successfully');
      setShowProductItemModal(false);
      productItemForm.resetFields();
      setProductItemImageFile(null);
      setProductItemImagePreview(null);
      fetchProductItems();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to create product item');
    }
  };

  const handleUpdateProductItem = async (values) => {
    try {
      let imageUrl = values.image_url;

      // Upload image if file was selected
      if (productItemImageFile) {
        const formData = new FormData();
        formData.append('image', productItemImageFile);
        formData.append('productId', id);

        const uploadResponse = await axios.post(`${API_URL}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        imageUrl = uploadResponse.data.imageUrl;
      }

      await axios.put(`${API_URL}/product-items/${editingProductItem.id}`, {
        name: values.name,
        description: values.description,
        weight: values.weight,
        price: values.price,
        image_url: imageUrl,
        is_active: values.is_active !== undefined ? values.is_active : true,
        brand_id: values.brand_id || null,
        sub_category_ids: values.sub_category_ids || []
      });
      message.success('Product item updated successfully');
      setShowProductItemModal(false);
      setEditingProductItem(null);
      productItemForm.resetFields();
      setProductItemImageFile(null);
      setProductItemImagePreview(null);
      fetchProductItems();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to update product item');
    }
  };

  const handleDeleteProductItem = async (productItemId) => {
    try {
      await axios.delete(`${API_URL}/product-items/${productItemId}`);
      message.success('Product item deleted successfully');
      fetchProductItems();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to delete product item');
    }
  };

  const openEditProductItem = (productItem) => {
    // Ensure categories and brands are loaded before opening modal
    if (categories.length === 0 && !loadingCategories) {
      fetchCategories();
    }
    if (brands.length === 0 && !loadingBrands) {
      fetchBrands();
    }
    setEditingProductItem(productItem);
    productItemForm.setFieldsValue({
      name: productItem.name,
      description: productItem.description,
      weight: productItem.weight,
      price: productItem.price,
      image_url: productItem.image_url,
      is_active: productItem.is_active === 1,
      brand_id: productItem.brand_id || undefined,
      sub_category_ids: productItem.subCategories ? productItem.subCategories.map(sc => sc.id) : []
    });
    setProductItemImagePreview(productItem.image_url || null);
    setProductItemImageFile(null);
    setShowProductItemModal(true);
  };

  const openAddProductItem = () => {
    // Ensure categories and brands are loaded before opening modal
    if (categories.length === 0 && !loadingCategories) {
      fetchCategories();
    }
    if (brands.length === 0 && !loadingBrands) {
      fetchBrands();
    }
    setEditingProductItem(null);
    productItemForm.resetFields();
    setProductItemImageFile(null);
    setProductItemImagePreview(null);
    setShowProductItemModal(true);
  };

  const handleProductItemDragStart = (e, index) => {
    setDraggedProductItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
  };

  const handleProductItemDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleProductItemDrop = async (e, toIndex) => {
    e.preventDefault();
    if (draggedProductItemIndex === null || draggedProductItemIndex === toIndex) {
      setDraggedProductItemIndex(null);
      return;
    }

    const newProductItems = [...productItems];
    const [moved] = newProductItems.splice(draggedProductItemIndex, 1);
    newProductItems.splice(toIndex, 0, moved);

    // Update display_order for all affected product items
    const updates = newProductItems.map((item, index) => ({
      id: item.id,
      display_order: index + 1
    }));

    try {
      await axios.put(`${API_URL}/product-items/reorder`, { productItems: updates, productId: id });
      setProductItems(newProductItems);
      message.success('Product item order updated');
    } catch (error) {
      message.error('Failed to update product item order');
      fetchProductItems(); // Revert on error
    }
    setDraggedProductItemIndex(null);
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
          <Tabs activeKey={activeTab} onChange={(key) => {
            setActiveTab(key);
            // Load data when tab is clicked (only if not already loaded)
            if (isAdmin() && !loadedTabs.has(key)) {
              switch(key) {
                case 'category':
                  if (!loadedTabs.has('category')) {
                    fetchCategories();
                    fetchProductCategories();
                    setLoadedTabs(prev => new Set([...prev, 'category']));
                  }
                  break;
                case 'promo-codes':
                  if (!loadedTabs.has('promo-codes')) {
                    fetchPromoCodes();
                    setLoadedTabs(prev => new Set([...prev, 'promo-codes']));
                  }
                  break;
                case 'product-items':
                  if (!loadedTabs.has('product-items')) {
                    fetchProductItems();
                    setLoadedTabs(prev => new Set([...prev, 'product-items']));
                  }
                  break;
                case 'brands':
                  if (!loadedTabs.has('brands')) {
                    fetchBrands();
                    setLoadedTabs(prev => new Set([...prev, 'brands']));
                  }
                  break;
                case 'taxes':
                  if (!loadedTabs.has('taxes')) {
                    fetchTaxes();
                    setLoadedTabs(prev => new Set([...prev, 'taxes']));
                  }
                  break;
                case 'orders':
                  if (!loadedTabs.has('orders')) {
                    fetchOrders();
                    setLoadedTabs(prev => new Set([...prev, 'orders']));
                  }
                  break;
                default:
                  break;
              }
            }
          }}>
            <Tabs.TabPane tab="Details" key="details">
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
                      src={getImageUrl(product.image_url)} 
                      alt={product.name}
                      onClick={() => openImageInNewTab(product.image_url)}
                      style={{ cursor: 'pointer' }}
                      title="Click to open image" 
                      style={{ maxWidth: '300px', maxHeight: '300px' }}
                    />
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Tabs.TabPane>
            
            <Tabs.TabPane tab="Category" key="category">
              {isAdmin() ? (
                <div>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={4} style={{ margin: 0 }}>Product Categories</Title>
                    <Button 
                      type="primary" 
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setEditingCategory(null);
                        categoryForm.resetFields();
                        setShowCategoryModal(true);
                      }}
                    >
                      Add Category
                    </Button>
                  </div>

                  <Form
                    form={productCategoryForm}
                    layout="vertical"
                    onFinish={handleSaveProductCategories}
                  >
                    <Collapse
                      ghost
                      style={{ background: 'transparent' }}
                      items={categories.map((category, catIndex) => ({
                        key: category.id,
                        label: (
                          <div
                            draggable
                            onDragStart={(e) => handleCategoryDragStart(e, catIndex)}
                            onDragOver={handleCategoryDragOver}
                            onDrop={(e) => handleCategoryDrop(e, catIndex)}
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              padding: '4px 0',
                              background: draggedCategoryIndex === catIndex ? '#e6f7ff' : 'transparent',
                              borderRadius: '4px',
                              cursor: 'move',
                              transition: 'all 0.2s',
                              border: draggedCategoryIndex === catIndex ? '1px dashed #1890ff' : 'none'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <MenuOutlined style={{ color: '#8c8c8c', fontSize: '14px' }} />
                              <span style={{ fontSize: '15px', fontWeight: '500', color: '#1890ff' }}>
                                {category.name}
                              </span>
                              <Tag color="blue" style={{ margin: 0, fontSize: '11px' }}>
                                {category.subCategories.length} items
                              </Tag>
                            </div>
                            <Space size="small" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="small"
                                type="text"
                                icon={<PlusOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAddSubCategory(category.id);
                                }}
                                style={{ padding: '0 4px' }}
                              >
                                Add
                              </Button>
                              <Button
                                size="small"
                                type="text"
                                icon={<EditOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditCategory(category);
                                }}
                                style={{ padding: '0 4px' }}
                              >
                                Edit
                              </Button>
                              <Popconfirm
                                title="Delete this category?"
                                onConfirm={() => handleDeleteCategory(category.id)}
                                okText="Yes"
                                cancelText="No"
                              >
                                <Button 
                                  size="small" 
                                  type="text" 
                                  danger 
                                  icon={<DeleteOutlined />}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ padding: '0 4px' }}
                                >
                                  Delete
                                </Button>
                              </Popconfirm>
                            </Space>
                          </div>
                        ),
                        children: (
                          <div style={{ padding: '8px 0', marginLeft: '24px' }}>
                            <Form.Item name={category.id.toString()} style={{ marginBottom: '8px' }}>
                              <Checkbox.Group style={{ width: '100%', display: 'none' }}>
                                {category.subCategories.map((sub) => (
                                  <Checkbox key={sub.id} value={sub.id} />
                                ))}
                              </Checkbox.Group>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {category.subCategories.map((sub, subIndex) => {
                                  const currentValues = productCategoryForm.getFieldValue(category.id.toString()) || [];
                                  const isChecked = currentValues.includes(sub.id);
                                  
                                  return (
                                    <div
                                      key={sub.id}
                                      draggable
                                      onDragStart={(e) => handleSubCategoryDragStart(e, category.id, subIndex)}
                                      onDragOver={handleSubCategoryDragOver}
                                      onDrop={(e) => handleSubCategoryDrop(e, category.id, subIndex)}
                                      onClick={(e) => {
                                        // Toggle checkbox when clicking the row (but not on buttons)
                                        if (e.target.tagName !== 'BUTTON' && !e.target.closest('button') && !e.target.closest('.ant-popconfirm')) {
                                          const currentValues = productCategoryForm.getFieldValue(category.id.toString()) || [];
                                          const newValues = isChecked
                                            ? currentValues.filter(v => v !== sub.id)
                                            : [...currentValues, sub.id];
                                          productCategoryForm.setFieldsValue({
                                            [category.id.toString()]: newValues
                                          });
                                        }
                                      }}
                                      style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center', 
                                        padding: '6px 8px',
                                        border: isChecked 
                                          ? '1px solid #1890ff' 
                                          : draggedSubCategoryIndex?.categoryId === category.id && draggedSubCategoryIndex?.index === subIndex 
                                            ? '1px dashed #1890ff' 
                                            : '1px solid #e8e8e8',
                                        borderRadius: '4px',
                                        background: isChecked
                                          ? '#e6f7ff'
                                          : draggedSubCategoryIndex?.categoryId === category.id && draggedSubCategoryIndex?.index === subIndex
                                            ? '#e6f7ff'
                                            : '#fafafa',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        fontSize: '13px'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                        <MenuOutlined style={{ color: '#bfbfbf', fontSize: '12px' }} />
                                        {sub.image_url && (
                                          <img 
                                            src={getImageUrl(sub.image_url)} 
                                            alt={sub.name}
                                            onClick={() => openImageInNewTab(sub.image_url)}
                                            style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }}
                                            title="Click to open image"
                                          />
                                        )}
                                        <span style={{ fontSize: '13px', fontWeight: isChecked ? '500' : 'normal' }}>{sub.name}</span>
                                      </div>
                                      <Space size="small" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          size="small"
                                          type="text"
                                          icon={<EditOutlined />}
                                          onClick={() => openEditSubCategory(sub, category.id)}
                                          style={{ padding: '0 4px', fontSize: '12px' }}
                                        >
                                          Edit
                                        </Button>
                                        <Popconfirm
                                          title="Delete this sub-category?"
                                          onConfirm={() => handleDeleteSubCategory(sub.id)}
                                          okText="Yes"
                                          cancelText="No"
                                        >
                                          <Button 
                                            size="small" 
                                            type="text" 
                                            danger 
                                            icon={<DeleteOutlined />}
                                            style={{ padding: '0 4px', fontSize: '12px' }}
                                          >
                                            Delete
                                          </Button>
                                        </Popconfirm>
                                      </Space>
                                    </div>
                                  );
                                })}
                              </div>
                            </Form.Item>
                          </div>
                        )
                      }))}
                    />

                    <Form.Item style={{ marginTop: '16px', textAlign: 'center' }}>
                      <Button 
                        type="primary" 
                        htmlType="submit"
                        size="default"
                        style={{ 
                          minWidth: '150px'
                        }}
                      >
                        Save Categories
                      </Button>
                    </Form.Item>
                  </Form>

                  {/* Category Modal */}
                  <Modal
                    title={editingCategory ? 'Edit Category' : 'Add Category'}
                    open={showCategoryModal}
                    onCancel={() => {
                      setShowCategoryModal(false);
                      setEditingCategory(null);
                      categoryForm.resetFields();
                    }}
                    footer={null}
                  >
                    <Form
                      form={categoryForm}
                      layout="vertical"
                      onFinish={editingCategory ? handleUpdateCategory : handleCreateCategory}
                    >
                      <Form.Item
                        name="name"
                        label="Category Name"
                        rules={[{ required: true, message: 'Category name is required' }]}
                      >
                        <Input placeholder="Enter category name" />
                      </Form.Item>
                      <Form.Item>
                        <Space>
                          <Button onClick={() => {
                            setShowCategoryModal(false);
                            setEditingCategory(null);
                            categoryForm.resetFields();
                          }}>
                            Cancel
                          </Button>
                          <Button type="primary" htmlType="submit">
                            {editingCategory ? 'Update' : 'Create'}
                          </Button>
                        </Space>
                      </Form.Item>
                    </Form>
                  </Modal>

                  {/* Sub-Category Modal */}
                  <Modal
                    title={editingSubCategory ? 'Edit Sub-Category' : 'Add Sub-Category'}
                    open={showSubCategoryModal}
                    onCancel={() => {
                      setShowSubCategoryModal(false);
                      setEditingSubCategory(null);
                      setSelectedCategoryForSub(null);
                      subCategoryForm.resetFields();
                    }}
                    footer={null}
                  >
                    <Form
                      form={subCategoryForm}
                      layout="vertical"
                      onFinish={editingSubCategory ? handleUpdateSubCategory : handleCreateSubCategory}
                    >
                      <Form.Item
                        name="name"
                        label="Sub-Category Name"
                        rules={[{ required: true, message: 'Sub-category name is required' }]}
                      >
                        <Input placeholder="Enter sub-category name" />
                      </Form.Item>
                      <Form.Item
                        name="image_url"
                        label="Image"
                      >
                        <Upload
                          name="image"
                          listType="picture-card"
                          className="avatar-uploader"
                          showUploadList={false}
                          beforeUpload={(file) => {
                            const isImage = file.type.startsWith('image/');
                            if (!isImage) {
                              message.error('You can only upload image files!');
                              return Upload.LIST_IGNORE;
                            }
                            const isLt5M = file.size / 1024 / 1024 < 5;
                            if (!isLt5M) {
                              message.error('Image must be smaller than 5MB!');
                              return Upload.LIST_IGNORE;
                            }
                            setSubCategoryImageFile(file);
                            
                            // Create preview
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setSubCategoryImagePreview(reader.result);
                            };
                            reader.readAsDataURL(file);
                            return false; // Prevent auto upload
                          }}
                        >
                          {subCategoryImagePreview || subCategoryForm.getFieldValue('image_url') ? (
                            <img 
                              src={(subCategoryImagePreview && subCategoryImagePreview.startsWith('data:')) 
                                ? subCategoryImagePreview 
                                : getImageUrl(subCategoryImagePreview || subCategoryForm.getFieldValue('image_url'))} 
                              alt="preview"
                              onClick={() => {
                                const url = subCategoryImagePreview || subCategoryForm.getFieldValue('image_url');
                                if (url && !url.startsWith('data:')) {
                                  openImageInNewTab(url);
                                }
                              }}
                              style={{ cursor: (subCategoryImagePreview && subCategoryImagePreview.startsWith('data:')) ? 'default' : 'pointer' }}
                              title={(subCategoryImagePreview && subCategoryImagePreview.startsWith('data:')) ? '' : "Click to open image"} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div>
                              <UploadOutlined />
                              <div style={{ marginTop: 8 }}>Upload</div>
                            </div>
                          )}
                        </Upload>
                      </Form.Item>
                      <Form.Item>
                        <Space>
                          <Button onClick={() => {
                            setShowSubCategoryModal(false);
                            setEditingSubCategory(null);
                            setSelectedCategoryForSub(null);
                            subCategoryForm.resetFields();
                            setSubCategoryImageFile(null);
                            setSubCategoryImagePreview(null);
                          }}>
                            Cancel
                          </Button>
                          <Button type="primary" htmlType="submit">
                            {editingSubCategory ? 'Update' : 'Create'}
                          </Button>
                        </Space>
                      </Form.Item>
                    </Form>
                  </Modal>
                </div>
              ) : (
                <div>
                  <Title level={2}>Product Categories</Title>
                  <Spin spinning={loadingCategories}>
                    {productCategories.length > 0 ? (
                      <div>
                        {categories.map(category => {
                          const assigned = productCategories.filter(pc => pc.category_id === category.id);
                          if (assigned.length === 0) return null;
                          
                          return (
                            <Card key={category.id} style={{ marginBottom: '16px' }}>
                              <Title level={4}>{category.name}</Title>
                              <Space wrap>
                                {assigned.map(pc => (
                                  <Tag key={pc.id} color="blue">
                                    {pc.sub_category_name || category.name}
                                  </Tag>
                                ))}
                              </Space>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <p>No categories assigned to this product.</p>
                    )}
                  </Spin>
                </div>
              )}
            </Tabs.TabPane>

            {isAdmin() && (
              <Tabs.TabPane tab="Promo Codes" key="promo-codes">
                <div>
                  <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={2}>Promo Codes</Title>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openAddPromoCode}>
                      Add Promo Code
                    </Button>
                  </div>

                  {loadingPromoCodes ? (
                    <Spin size="large" />
                  ) : promoCodes.length === 0 ? (
                    <Card>
                      <p>No promo codes found. Click "Add Promo Code" to create one.</p>
                    </Card>
                  ) : (
                    <Table
                      dataSource={promoCodes}
                      rowKey="id"
                      columns={[
                        {
                          title: 'Name',
                          dataIndex: 'name',
                          key: 'name',
                          render: (text) => <strong>{text}</strong>
                        },
                        {
                          title: 'Discount',
                          dataIndex: 'discount_percentage',
                          key: 'discount_percentage',
                          render: (value) => `${value}%`
                        },
                        {
                          title: 'Status',
                          dataIndex: 'is_active',
                          key: 'is_active',
                          render: (isActive, record) => (
                            <Switch
                              checked={isActive === 1}
                              onChange={() => handleTogglePromoCode(record.id, isActive === 1)}
                              checkedChildren="On"
                              unCheckedChildren="Off"
                            />
                          )
                        },
                        {
                          title: 'Actions',
                          key: 'actions',
                          render: (_, record) => (
                            <Space>
                              <Button
                                size="small"
                                type="primary"
                                icon={<EditOutlined />}
                                onClick={() => openEditPromoCode(record)}
                              >
                                Edit
                              </Button>
                              <Popconfirm
                                title="Are you sure you want to delete this promo code?"
                                onConfirm={() => handleDeletePromoCode(record.id)}
                                okText="Yes"
                                cancelText="No"
                              >
                                <Button size="small" danger icon={<DeleteOutlined />}>
                                  Delete
                                </Button>
                              </Popconfirm>
                            </Space>
                          )
                        }
                      ]}
                      pagination={false}
                    />
                  )}
                </div>

                {/* Promo Code Modal */}
                <Modal
                  title={editingPromoCode ? 'Edit Promo Code' : 'Add Promo Code'}
                  open={showPromoCodeModal}
                  onCancel={() => {
                    setShowPromoCodeModal(false);
                    setEditingPromoCode(null);
                    promoCodeForm.resetFields();
                  }}
                  footer={null}
                >
                  <Form
                    form={promoCodeForm}
                    layout="vertical"
                    onFinish={editingPromoCode ? handleUpdatePromoCode : handleCreatePromoCode}
                  >
                    <Form.Item
                      name="name"
                      label="Name"
                      rules={[{ required: true, message: 'Promo code name is required' }]}
                    >
                      <Input placeholder="Enter promo code name" />
                    </Form.Item>
                    <Form.Item
                      name="discount_percentage"
                      label="Discount (Percentage)"
                      rules={[
                        { required: true, message: 'Discount percentage is required' },
                        { type: 'number', min: 0, max: 100, message: 'Discount must be between 0 and 100' }
                      ]}
                    >
                      <InputNumber
                        placeholder="Enter discount percentage"
                        min={0}
                        max={100}
                        style={{ width: '100%' }}
                        formatter={value => `${value}%`}
                        parser={value => value.replace('%', '')}
                      />
                    </Form.Item>
                    <Form.Item
                      name="is_active"
                      label="Status"
                      valuePropName="checked"
                      initialValue={true}
                    >
                      <Switch checkedChildren="On" unCheckedChildren="Off" />
                    </Form.Item>
                    <Form.Item>
                      <Space>
                        <Button onClick={() => {
                          setShowPromoCodeModal(false);
                          setEditingPromoCode(null);
                          promoCodeForm.resetFields();
                        }}>
                          Cancel
                        </Button>
                        <Button type="primary" htmlType="submit">
                          {editingPromoCode ? 'Update' : 'Create'}
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>
                </Modal>
              </Tabs.TabPane>
            )}

            {isAdmin() && (
              <Tabs.TabPane tab="Product Items" key="product-items">
                <div>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Title level={4} style={{ margin: 0 }}>Product Items</Title>
                      <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAddProductItem}>
                        Add Product Item
                      </Button>
                    </div>

                    {loadingProductItems ? (
                      <Spin size="large" />
                    ) : productItems.length === 0 ? (
                      <Card size="small">
                        <p style={{ margin: 0, color: '#999' }}>No product items found. Click "Add Product Item" to create one.</p>
                      </Card>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {productItems.map((item, index) => (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleProductItemDragStart(e, index)}
                            onDragOver={handleProductItemDragOver}
                            onDrop={(e) => handleProductItemDrop(e, index)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px',
                              border: draggedProductItemIndex === index ? '1px dashed #1890ff' : '1px solid #e8e8e8',
                              borderRadius: '4px',
                              background: draggedProductItemIndex === index ? '#e6f7ff' : '#fafafa',
                              cursor: 'move',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                              <MenuOutlined style={{ color: '#8c8c8c', fontSize: '14px' }} />
                              {item.image_url && (
                                <img 
                                  src={getImageUrl(item.image_url)} 
                                  alt={item.weight}
                                  onClick={() => openImageInNewTab(item.image_url)}
                                  style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }}
                                  title="Click to open image"
                                />
                              )}
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <strong>{item.name || item.weight}</strong>
                                  <Tag color="blue">${item.price}</Tag>
                                  {item.is_active === 1 ? (
                                    <Tag color="green">Active</Tag>
                                  ) : (
                                    <Tag color="red">Inactive</Tag>
                                  )}
                                </div>
                                {item.name && item.weight && (
                                  <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                                    Weight: {item.weight}
                                  </div>
                                )}
                                {item.description && (
                                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                                    {item.description}
                                  </div>
                                )}
                                {item.brand_name && (
                                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                                    Brand: {item.brand_name}
                                  </div>
                                )}
                                {item.subCategories && item.subCategories.length > 0 && (
                                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                                    Categories: {item.subCategories.map(sc => `${sc.category_name} - ${sc.name}`).join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Space>
                              <Button
                                size="small"
                                type="text"
                                icon={<EditOutlined />}
                                onClick={() => openEditProductItem(item)}
                              >
                                Edit
                              </Button>
                              <Popconfirm
                                title="Delete this product item?"
                                onConfirm={() => handleDeleteProductItem(item.id)}
                                okText="Yes"
                                cancelText="No"
                              >
                                <Button size="small" type="text" danger icon={<DeleteOutlined />}>
                                  Delete
                                </Button>
                              </Popconfirm>
                            </Space>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Product Item Modal */}
                    <Modal
                      title={editingProductItem ? 'Edit Product Item' : 'Add Product Item'}
                      open={showProductItemModal}
                      onCancel={() => {
                        setShowProductItemModal(false);
                        setEditingProductItem(null);
                        productItemForm.resetFields();
                        setProductItemImageFile(null);
                        setProductItemImagePreview(null);
                      }}
                      footer={null}
                      width={600}
                    >
                      <Form
                        form={productItemForm}
                        layout="vertical"
                        onFinish={editingProductItem ? handleUpdateProductItem : handleCreateProductItem}
                      >
                        <Form.Item
                          name="name"
                          label="Name"
                          rules={[{ required: true, message: 'Name is required' }]}
                        >
                          <Input placeholder="Enter product item name" />
                        </Form.Item>
                        <Form.Item
                          name="description"
                          label="Description"
                        >
                          <Input.TextArea 
                            placeholder="Enter product item description" 
                            rows={3}
                          />
                        </Form.Item>
                        <Form.Item
                          name="weight"
                          label="Weight"
                          rules={[{ required: true, message: 'Weight is required' }]}
                        >
                          <Input placeholder="e.g., 150.00 mg, 100 mg, 200 mg" />
                        </Form.Item>
                        <Form.Item
                          name="price"
                          label="Price"
                          rules={[{ required: true, message: 'Price is required' }]}
                        >
                          <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            step={0.01}
                            placeholder="Enter price"
                            formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value.replace(/\$\s?|(,*)/g, '')}
                          />
                        </Form.Item>
                        <Form.Item
                          name="image"
                          label="Image"
                        >
                          <Upload
                            beforeUpload={(file) => {
                              setProductItemImageFile(file);
                              const reader = new FileReader();
                              reader.onload = (e) => {
                                setProductItemImagePreview(e.target.result);
                              };
                              reader.readAsDataURL(file);
                              return false; // Prevent auto upload
                            }}
                            onRemove={() => {
                              setProductItemImageFile(null);
                              setProductItemImagePreview(null);
                              productItemForm.setFieldsValue({ image: null });
                            }}
                            fileList={productItemImageFile ? [{
                              uid: '-1',
                              name: productItemImageFile.name,
                              status: 'done',
                            }] : []}
                            listType="picture-card"
                            maxCount={1}
                          >
                            {!productItemImagePreview && !productItemForm.getFieldValue('image_url') && (
                              <div>
                                <UploadOutlined />
                                <div style={{ marginTop: 8 }}>Upload</div>
                              </div>
                            )}
                          </Upload>
                          {productItemImagePreview && (
                            <img 
                              src={productItemImagePreview.startsWith('data:') ? productItemImagePreview : getImageUrl(productItemImagePreview)} 
                              alt="Preview"
                              onClick={() => !productItemImagePreview.startsWith('data:') && openImageInNewTab(productItemImagePreview)}
                              style={{ cursor: productItemImagePreview.startsWith('data:') ? 'default' : 'pointer' }}
                              title={productItemImagePreview.startsWith('data:') ? '' : "Click to open image"} 
                              style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px', marginTop: '8px' }}
                            />
                          )}
                          {!productItemImagePreview && productItemForm.getFieldValue('image_url') && (
                            <img 
                              src={getImageUrl(productItemForm.getFieldValue('image_url'))} 
                              alt="Current"
                              onClick={() => openImageInNewTab(productItemForm.getFieldValue('image_url'))}
                              style={{ cursor: 'pointer' }}
                              title="Click to open image" 
                              style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px', marginTop: '8px' }}
                            />
                          )}
                        </Form.Item>
                        <Form.Item
                          name="brand_id"
                          label="Brand"
                        >
                          <Select
                            placeholder="Select a brand (optional)"
                            allowClear
                            showSearch
                            filterOption={(input, option) =>
                              (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                          >
                            {brands.map(brand => (
                              <Option key={brand.id} value={brand.id}>
                                {brand.name}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                        <Form.Item
                          name="sub_category_ids"
                          label="Categories & Sub-Categories"
                        >
                          <Checkbox.Group style={{ width: '100%' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', padding: '8px', border: '1px solid #e8e8e8', borderRadius: '4px' }}>
                              {categories.map(category => (
                                <div key={category.id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '8px', marginBottom: '8px' }}>
                                  <div style={{ fontWeight: '500', marginBottom: '6px', color: '#1890ff' }}>
                                    {category.name}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '16px' }}>
                                    {category.subCategories.map(sub => (
                                      <Checkbox key={sub.id} value={sub.id}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          {sub.image_url && (
                                            <img 
                                              src={getImageUrl(sub.image_url)} 
                                              alt={sub.name}
                                              onClick={() => openImageInNewTab(sub.image_url)}
                                              style={{ cursor: 'pointer' }}
                                              title="Click to open image"
                                              style={{ width: '20px', height: '20px', objectFit: 'cover', borderRadius: '2px' }}
                                            />
                                          )}
                                          <span>{sub.name}</span>
                                        </div>
                                      </Checkbox>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Checkbox.Group>
                        </Form.Item>
                        <Form.Item
                          name="is_active"
                          label="Status"
                          valuePropName="checked"
                          initialValue={true}
                        >
                          <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                        </Form.Item>
                        <Form.Item>
                          <Space>
                            <Button onClick={() => {
                              setShowProductItemModal(false);
                              setEditingProductItem(null);
                              productItemForm.resetFields();
                            }}>
                              Cancel
                            </Button>
                            <Button type="primary" htmlType="submit">
                              {editingProductItem ? 'Update' : 'Create'}
                            </Button>
                          </Space>
                        </Form.Item>
                      </Form>
                    </Modal>
                </div>
              </Tabs.TabPane>
            )}

            {isAdmin() && (
              <Tabs.TabPane tab="Brands" key="brands">
                <div>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={4} style={{ margin: 0 }}>Brands</Title>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAddBrand}>
                      Add Brand
                    </Button>
                  </div>

                  {loadingBrands ? (
                    <Spin size="large" />
                  ) : brands.length === 0 ? (
                    <Card size="small">
                      <p style={{ margin: 0, color: '#999' }}>No brands found. Click "Add Brand" to create one.</p>
                    </Card>
                  ) : (
                    <Table
                      dataSource={brands}
                      rowKey="id"
                      columns={[
                        {
                          title: 'Name',
                          dataIndex: 'name',
                          key: 'name',
                        },
                        {
                          title: 'Actions',
                          key: 'actions',
                          render: (_, brand) => (
                            <Space>
                              <Button
                                size="small"
                                type="text"
                                icon={<EditOutlined />}
                                onClick={() => openEditBrand(brand)}
                              >
                                Edit
                              </Button>
                              <Popconfirm
                                title="Delete this brand?"
                                onConfirm={() => handleDeleteBrand(brand.id)}
                                okText="Yes"
                                cancelText="No"
                              >
                                <Button size="small" type="text" danger icon={<DeleteOutlined />}>
                                  Delete
                                </Button>
                              </Popconfirm>
                            </Space>
                          ),
                        },
                      ]}
                      pagination={false}
                    />
                  )}

                  {/* Brand Modal */}
                  <Modal
                    title={editingBrand ? 'Edit Brand' : 'Add Brand'}
                    open={showBrandModal}
                    onCancel={() => {
                      setShowBrandModal(false);
                      setEditingBrand(null);
                      brandForm.resetFields();
                    }}
                    footer={null}
                  >
                    <Form
                      form={brandForm}
                      layout="vertical"
                      onFinish={editingBrand ? handleUpdateBrand : handleCreateBrand}
                    >
                      <Form.Item
                        name="name"
                        label="Brand Name"
                        rules={[{ required: true, message: 'Brand name is required' }]}
                      >
                        <Input placeholder="Enter brand name" />
                      </Form.Item>
                      <Form.Item>
                        <Space>
                          <Button onClick={() => {
                            setShowBrandModal(false);
                            setEditingBrand(null);
                            brandForm.resetFields();
                          }}>
                            Cancel
                          </Button>
                          <Button type="primary" htmlType="submit">
                            {editingBrand ? 'Update' : 'Create'}
                          </Button>
                        </Space>
                      </Form.Item>
                    </Form>
                  </Modal>
                </div>
              </Tabs.TabPane>
            )}

            {isAdmin() && (
              <Tabs.TabPane tab="Taxes" key="taxes">
                <div>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={4} style={{ margin: 0 }}>Taxes</Title>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAddTax}>
                      Add Tax
                    </Button>
                  </div>

                  {loadingTaxes ? (
                    <Spin size="large" />
                  ) : taxes.length === 0 ? (
                    <Card size="small">
                      <p style={{ margin: 0, color: '#999' }}>No taxes found. Click "Add Tax" to create one.</p>
                    </Card>
                  ) : (
                    <Table
                      dataSource={taxes}
                      rowKey="id"
                      columns={[
                        {
                          title: 'Name',
                          dataIndex: 'name',
                          key: 'name',
                        },
                        {
                          title: 'Type',
                          dataIndex: 'type',
                          key: 'type',
                          render: (type) => (
                            <Tag color={type === 'percentage' ? 'blue' : 'green'}>
                              {type === 'percentage' ? 'Percentage' : 'Fixed'}
                            </Tag>
                          ),
                        },
                        {
                          title: 'Value',
                          key: 'value',
                          render: (_, tax) => (
                            <span>
                              {tax.type === 'percentage' 
                                ? `${tax.value}%` 
                                : `$${parseFloat(tax.value).toFixed(2)}`}
                            </span>
                          ),
                        },
                        {
                          title: 'Status',
                          dataIndex: 'is_active',
                          key: 'is_active',
                          render: (isActive) => (
                            <Tag color={isActive === 1 ? 'green' : 'red'}>
                              {isActive === 1 ? 'Active' : 'Inactive'}
                            </Tag>
                          ),
                        },
                        {
                          title: 'Actions',
                          key: 'actions',
                          render: (_, tax) => (
                            <Space>
                              <Button
                                size="small"
                                type="text"
                                icon={<EditOutlined />}
                                onClick={() => openEditTax(tax)}
                              >
                                Edit
                              </Button>
                              <Popconfirm
                                title="Delete this tax?"
                                onConfirm={() => handleDeleteTax(tax.id)}
                                okText="Yes"
                                cancelText="No"
                              >
                                <Button size="small" type="text" danger icon={<DeleteOutlined />}>
                                  Delete
                                </Button>
                              </Popconfirm>
                            </Space>
                          ),
                        },
                      ]}
                      pagination={false}
                    />
                  )}

                  {/* Tax Modal */}
                  <Modal
                    title={editingTax ? 'Edit Tax' : 'Add Tax'}
                    open={showTaxModal}
                    onCancel={() => {
                      setShowTaxModal(false);
                      setEditingTax(null);
                      taxForm.resetFields();
                    }}
                    footer={null}
                    width={600}
                  >
                    <Form
                      form={taxForm}
                      layout="vertical"
                      onFinish={editingTax ? handleUpdateTax : handleCreateTax}
                    >
                      <Form.Item
                        name="name"
                        label="Tax Name"
                        rules={[{ required: true, message: 'Tax name is required' }]}
                      >
                        <Input placeholder="e.g., Sales Tax, VAT, Service Tax" />
                      </Form.Item>
                      <Form.Item
                        name="type"
                        label="Tax Type"
                        rules={[{ required: true, message: 'Tax type is required' }]}
                      >
                        <Select>
                          <Option value="percentage">Percentage (%)</Option>
                          <Option value="fixed">Fixed Amount ($)</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item
                        name="value"
                        label="Tax Value"
                        rules={[
                          { required: true, message: 'Tax value is required' },
                          { type: 'number', min: 0, message: 'Tax value must be non-negative' }
                        ]}
                      >
                        <InputNumber
                          style={{ width: '100%' }}
                          min={0}
                          step={0.01}
                          placeholder={taxForm.getFieldValue('type') === 'percentage' ? 'Enter percentage (e.g., 10)' : 'Enter amount (e.g., 5.00)'}
                        />
                      </Form.Item>
                      <Form.Item
                        name="display_order"
                        label="Display Order"
                      >
                        <InputNumber
                          style={{ width: '100%' }}
                          min={0}
                          placeholder="Order in which tax appears (0 = first)"
                        />
                      </Form.Item>
                      <Form.Item
                        name="is_active"
                        label="Status"
                        valuePropName="checked"
                        initialValue={true}
                      >
                        <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                      </Form.Item>
                      <Form.Item>
                        <Space>
                          <Button onClick={() => {
                            setShowTaxModal(false);
                            setEditingTax(null);
                            taxForm.resetFields();
                          }}>
                            Cancel
                          </Button>
                          <Button type="primary" htmlType="submit">
                            {editingTax ? 'Update' : 'Create'}
                          </Button>
                        </Space>
                      </Form.Item>
                    </Form>
                  </Modal>
                </div>
              </Tabs.TabPane>
            )}

            {isAdmin() && (
              <Tabs.TabPane tab="Orders" key="orders">
                <div>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={4} style={{ margin: 0 }}>Product Orders</Title>
                  </div>

                  {loadingOrders ? (
                    <Spin size="large" />
                  ) : orders.length === 0 ? (
                    <Card size="small">
                      <p style={{ margin: 0, color: '#999' }}>No orders found.</p>
                    </Card>
                  ) : (
                    <Table
                      dataSource={orders}
                      rowKey="id"
                      columns={[
                        {
                          title: 'Order Number',
                          dataIndex: 'order_number',
                          key: 'order_number',
                          render: (text) => <Text strong>{text}</Text>,
                        },
                        {
                          title: 'Customer',
                          key: 'customer',
                          render: (_, record) => (
                            <div>
                              <div>{record.first_name} {record.last_name}</div>
                              <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
                              {record.phone && (
                                <div style={{ fontSize: '12px', color: '#666' }}>{record.phone}</div>
                              )}
                            </div>
                          ),
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
                                View
                              </Button>
                              {record.status === 'pending' && (
                                <>
                                  <Button
                                    size="small"
                                    type="primary"
                                    onClick={() => handleUpdateOrderStatus(record.id, 'confirmed')}
                                  >
                                    Confirm
                                  </Button>
                                  <Button
                                    size="small"
                                    danger
                                    onClick={() => handleUpdateOrderStatus(record.id, 'rejected')}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              {record.status === 'confirmed' && (
                                <Button
                                  size="small"
                                  onClick={() => handleUpdateOrderStatus(record.id, 'preparing')}
                                >
                                  Mark Preparing
                                </Button>
                              )}
                              {record.status === 'preparing' && (
                                <Button
                                  size="small"
                                  onClick={() => handleUpdateOrderStatus(record.id, 'arriving')}
                                >
                                  Mark Arriving
                                </Button>
                              )}
                              {record.status === 'arriving' && (
                                <Button
                                  size="small"
                                  type="primary"
                                  onClick={() => handleUpdateOrderStatus(record.id, 'completed')}
                                >
                                  Mark Complete
                                </Button>
                              )}
                            </Space>
                          ),
                        },
                      ]}
                      pagination={{ pageSize: 10 }}
                    />
                  )}

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
                          <Descriptions.Item label="Customer">
                            <div>
                              <div>{selectedOrder.first_name} {selectedOrder.last_name}</div>
                              <Text type="secondary" style={{ fontSize: '12px' }}>{selectedOrder.email}</Text>
                              {selectedOrder.phone && (
                                <div style={{ fontSize: '12px', color: '#666' }}>{selectedOrder.phone}</div>
                              )}
                            </div>
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
                                    <img
                                      src={getImageUrl(item.product_item_image_url)}
                                      alt={item.product_item_name}
                                      style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: '4px' }}
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

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {selectedOrder.status === 'pending' && (
                            <>
                              <Button
                                type="primary"
                                onClick={() => {
                                  handleUpdateOrderStatus(selectedOrder.id, 'confirmed');
                                  setShowOrderDetail(false);
                                  setSelectedOrder(null);
                                }}
                              >
                                Confirm Order
                              </Button>
                              <Button
                                danger
                                onClick={() => {
                                  handleUpdateOrderStatus(selectedOrder.id, 'rejected');
                                  setShowOrderDetail(false);
                                  setSelectedOrder(null);
                                }}
                              >
                                Reject Order
                              </Button>
                            </>
                          )}
                          {selectedOrder.status === 'confirmed' && (
                            <Button
                              onClick={() => {
                                handleUpdateOrderStatus(selectedOrder.id, 'preparing');
                                setShowOrderDetail(false);
                                setSelectedOrder(null);
                              }}
                            >
                              Mark as Preparing
                            </Button>
                          )}
                          {selectedOrder.status === 'preparing' && (
                            <Button
                              onClick={() => {
                                handleUpdateOrderStatus(selectedOrder.id, 'arriving');
                                setShowOrderDetail(false);
                                setSelectedOrder(null);
                              }}
                            >
                              Mark as Arriving
                            </Button>
                          )}
                          {selectedOrder.status === 'arriving' && (
                            <Button
                              type="primary"
                              onClick={() => {
                                handleUpdateOrderStatus(selectedOrder.id, 'completed');
                                setShowOrderDetail(false);
                                setSelectedOrder(null);
                              }}
                            >
                              Mark as Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </Modal>
                </div>
              </Tabs.TabPane>
            )}

          </Tabs>
        </Card>
      </Content>
    </Layout>
  );
};

export default ProductDetail;

