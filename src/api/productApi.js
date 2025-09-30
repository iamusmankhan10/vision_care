import sampleProducts from '../utils/addSampleProducts';

// Backend API configuration with deployment support
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  
  // Debug environment variables
  console.log('🔍 Environment Variables Check:');
  console.log('REACT_APP_PRODUCTS_API_URL:', process.env.REACT_APP_PRODUCTS_API_URL);
  console.log('REACT_APP_API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);
  console.log('Current hostname:', hostname);
  
  // Check if we have a custom API URL from environment
  if (process.env.REACT_APP_PRODUCTS_API_URL) {
    console.log(`🌐 Using environment API URL: ${process.env.REACT_APP_PRODUCTS_API_URL}`);
    return process.env.REACT_APP_PRODUCTS_API_URL;
  }
  
  // Check if this is a deployed environment (not localhost or IP)
  const isDeployedEnvironment = !hostname.includes('localhost') && 
                               !hostname.includes('127.0.0.1') && 
                               !hostname.match(/^\d+\.\d+\.\d+\.\d+$/); // Not an IP address
  
  if (isDeployedEnvironment) {
    console.log(`🌐 Deployed environment detected: ${hostname}`);
    console.log(`📦 No environment API URL found - using localStorage mode`);
    // For deployed environments without backend, we'll rely on localStorage
    // Return null to force localStorage usage
    return null;
  }
  
  // If accessing via IP address (mobile accessing desktop), use the same IP for API
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    console.log(`📱 Mobile detected: Using ${hostname} for API requests`);
    return `http://${hostname}:5004/api`;
  }
  
  // Default to localhost for desktop development
  return 'http://localhost:5004/api';
};

const API_BASE_URL = getApiBaseUrl();

// Helper function to handle API requests
const apiRequest = async (endpoint, options = {}) => {
  // If no API_BASE_URL, throw error immediately to trigger localStorage fallback
  if (!API_BASE_URL) {
    console.log(`📦 No API URL available - using localStorage fallback`);
    throw new Error('No API URL configured - using localStorage');
  }
  
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);
    console.log(`🔧 API Base URL: ${API_BASE_URL}`);
    console.log(`📱 User Agent: ${navigator.userAgent}`);
    console.log(`🌍 Current URL: ${window.location.href}`);
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
      console.error(`❌ API Error Response:`, errorMessage);
      console.error(`❌ Response Status: ${response.status} ${response.statusText}`);
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log(`✅ API Response: ${config.method || 'GET'} ${url} - Success`);
    
    // Handle Vercel API response structure
    if (data.success && data.products) {
      console.log(`📊 Data Count: ${data.products.length} items`);
      return data.products; // Return just the products array
    } else if (data.success && data.product) {
      console.log(`📊 Single Product Retrieved`);
      return data.product; // Return single product
    } else if (Array.isArray(data)) {
      console.log(`📊 Data Count: ${data.length} items`);
      return data; // Already an array
    } else {
      console.log(`📊 Data Count: N/A items`);
      return data; // Return as-is for other responses
    }
  } catch (error) {
    console.error(`❌ API Error: ${config.method || 'GET'} ${url}`);
    console.error(`❌ Error Details:`, error.message);
    console.error(`❌ Error Type:`, error.name);
    console.error(`❌ Error Stack:`, error.stack);
    
    // Check if it's a network error
    if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      console.error(`❌ Network Error: Cannot connect to backend server`);
      console.error(`❌ Make sure the product server is running on ${API_BASE_URL}`);
      console.error(`❌ Start server with: cd server && npm run dev:products`);
      console.error(`❌ Check if mobile device can access localhost:5004`);
    }
    
    throw error;
  }
};

// Fallback to localStorage for offline functionality
const getStoredProducts = () => {
  try {
    const stored = localStorage.getItem('eyewear_products_backup');
    if (stored) {
      return JSON.parse(stored);
    }
    return sampleProducts.map((product, index) => ({
      ...product,
      id: index + 1
    }));
  } catch (error) {
    console.error('Error reading from localStorage backup:', error);
    return sampleProducts.map((product, index) => ({
      ...product,
      id: index + 1
    }));
  }
};

// Save products to localStorage as backup
const saveProductsBackup = (products) => {
  try {
    localStorage.setItem('eyewear_products_backup', JSON.stringify(products));
  } catch (error) {
    console.error('Error saving products backup:', error);
  }
};

const productApi = {
  // Test API connection
  testConnection: async () => {
    // If no API URL (deployed environment), return false to indicate localStorage mode
    if (!API_BASE_URL) {
      console.log('🌐 Deployed environment: No backend API configured');
      return false;
    }

    try {
      console.log('🔍 Testing API connection...');
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        console.log('✅ API connection successful');
        return true;
      } else {
        console.warn('⚠️ API responded but with error status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ API connection failed:', error.message);
      return false;
    }
  },

  // Get all products
  getAllProducts: async () => {
    // If no API URL (deployed environment), use localStorage directly
    if (!API_BASE_URL) {
      console.log('🌐 Deployed environment: Using localStorage products');
      const products = getStoredProducts();
      console.log(`📦 Loaded ${products.length} products from localStorage`);
      return products;
    }

    try {
      console.log('🔍 Attempting to fetch products from backend API...');
      console.log(`🔗 API URL: ${API_BASE_URL}`);
      const products = await apiRequest('/products');
      console.log(`✅ Successfully fetched ${products.length} products from backend`);
      // Save as backup for offline use
      saveProductsBackup(products);
      return products;
    } catch (error) {
      console.warn('❌ Backend API failed, using localStorage backup:', error.message);
      console.warn('📱 This might be a mobile network connectivity issue');
      console.warn('💡 Try accessing the admin panel via your computer\'s IP address instead of localhost');
      // Fallback to localStorage backup
      const backupProducts = getStoredProducts();
      console.log(`📦 Using ${backupProducts.length} products from localStorage backup`);
      return backupProducts;
    }
  },

  // Get a single product by ID
  getProductById: async (id) => {
    try {
      const product = await apiRequest(`/products/${id}`);
      return product;
    } catch (error) {
      console.warn(`Backend API failed for product ${id}, using localStorage backup:`, error.message);
      // Fallback to localStorage backup
      const products = getStoredProducts();
      const product = products.find(p => p.id === parseInt(id));
      if (!product) {
        throw new Error(`Product with ID ${id} not found`);
      }
      return product;
    }
  },

  // Create a new product
  createProduct: async (productData) => {
    try {
      const newProduct = await apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify(productData),
      });
      
      // Update localStorage backup
      try {
        const products = await productApi.getAllProducts();
        saveProductsBackup(products);
      } catch (backupError) {
        console.warn('Failed to update backup after creating product:', backupError.message);
      }
      
      return newProduct;
    } catch (error) {
      console.error('Error creating product:', error);
      throw new Error(`Failed to create product: ${error.message}`);
    }
  },

  // Update a product
  updateProduct: async (id, productData) => {
    try {
      const updatedProduct = await apiRequest(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(productData),
      });
      
      // Update localStorage backup
      try {
        const products = await productApi.getAllProducts();
        saveProductsBackup(products);
      } catch (backupError) {
        console.warn('Failed to update backup after updating product:', backupError.message);
      }
      
      return updatedProduct;
    } catch (error) {
      console.error(`Error updating product ${id}:`, error);
      throw new Error(`Failed to update product: ${error.message}`);
    }
  },

  // Delete a product
  deleteProduct: async (id) => {
    try {
      const result = await apiRequest(`/products/${id}`, {
        method: 'DELETE',
      });
      
      // Update localStorage backup
      try {
        const products = await productApi.getAllProducts();
        saveProductsBackup(products);
      } catch (backupError) {
        console.warn('Failed to update backup after deleting product:', backupError.message);
      }
      
      return result;
    } catch (error) {
      console.error(`Error deleting product ${id}:`, error);
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }
};

// Named exports for specific functions
export const testConnection = productApi.testConnection;
export const getAllProducts = productApi.getAllProducts;
export const getProductById = productApi.getProductById;
export const createProduct = productApi.createProduct;
export const updateProduct = productApi.updateProduct;
export const deleteProduct = productApi.deleteProduct;

export default productApi;