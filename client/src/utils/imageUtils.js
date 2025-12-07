/**
 * Utility functions for handling image URLs
 */

const API_BASE_URL = process.env.REACT_APP_API_URL 
  ? process.env.REACT_APP_API_URL.replace('/api', '')
  : '';

/**
 * Converts a relative image URL to a full URL
 * @param {string} imageUrl - Relative URL (e.g., /uploads/product_18/image.png)
 * @returns {string} Full URL or relative URL depending on environment
 */
export const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  
  // If already a full URL (starts with http:// or https://), return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // If API_BASE_URL is set, prepend it; otherwise use relative path
  if (API_BASE_URL) {
    const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `${API_BASE_URL}${path}`;
  }
  
  // Return relative path (works with proxy in dev, or same domain in production)
  return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
};

/**
 * Opens an image in a new tab/window
 * @param {string} imageUrl - Image URL (relative or absolute)
 */
export const openImageInNewTab = (imageUrl) => {
  const fullUrl = getImageUrl(imageUrl);
  if (fullUrl) {
    window.open(fullUrl, '_blank');
  }
};

