const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('Setting up proxy middleware...');
  
  // Get backend URL from environment variable or use default for development
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
  
  // Proxy API requests
  app.use(
    '/api',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying request:', req.method, req.url, 'to', backendUrl + req.url);
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
      }
    })
  );
  
  // Proxy uploads directory
  app.use(
    '/uploads',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      secure: false,
    })
  );
  
  console.log('Proxy middleware configured to proxy to:', backendUrl);
};

