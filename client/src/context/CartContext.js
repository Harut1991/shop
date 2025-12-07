import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  // Helper function to get cart key based on domain
  const getCartKey = () => {
    const domain = window.location.host;
    return `cart_${domain}`;
  };

  // Load cart from localStorage synchronously on initialization
  const loadCartFromStorage = () => {
    try {
      const key = getCartKey();
      const savedCart = localStorage.getItem(key);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
    }
    return [];
  };

  // Initialize state from localStorage immediately (synchronously)
  const [cartItems, setCartItems] = useState(loadCartFromStorage);
  const [isInitialized, setIsInitialized] = useState(false);

  // Mark as initialized after first render to prevent saving empty cart on mount
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Save cart to localStorage whenever it changes (but only after initialization)
  useEffect(() => {
    if (!isInitialized) return;
    
    const cartKey = getCartKey();
    try {
      localStorage.setItem(cartKey, JSON.stringify(cartItems));
      console.log('Cart saved to localStorage:', cartKey, cartItems.length, 'items');
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [cartItems, isInitialized]);

  const addToCart = (item) => {
    setCartItems((prevItems) => {
      // Check if item already exists in cart
      const existingItem = prevItems.find((cartItem) => cartItem.id === item.id);
      
      if (existingItem) {
        // If exists, increment quantity
        return prevItems.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        // If new, add with quantity 1
        return [...prevItems, { ...item, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (itemId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price || 0) * item.quantity, 0);
  };

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartCount,
    getCartTotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
