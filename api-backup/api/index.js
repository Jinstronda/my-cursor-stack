// Vercel API route to handle all /api/* requests
// This file will be deployed as a serverless function

// Since the bundled server runs immediately, we need to import it differently
// Let's create a simple proxy that forwards all requests to the dist/index.js export

module.exports = async (req, res) => {
  try {
    // Import the bundled server app
    const { app } = await import('../dist/index.js');
    
    if (!app) {
      console.error('❌ Failed to import server app from bundle');
      return res.status(500).json({ 
        message: 'Server initialization failed - app not found in bundle',
        error: 'SERVER_INIT_ERROR'
      });
    }
    
    // Handle the request with the Express app
    app(req, res);
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({ 
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server Error',
      timestamp: new Date().toISOString()
    });
  }
};