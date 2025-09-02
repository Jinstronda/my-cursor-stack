/**
 * Main API entry point for Vercel serverless deployment
 * This file routes all /api/* requests to the bundled Express server
 */

// Import the bundled server app
import('./api-server.js').then(({ app }) => {
  console.log('✅ Bundled server loaded successfully');
}).catch((error) => {
  console.error('❌ Failed to load bundled server:', error);
});

// Export the serverless handler
export default async function handler(req, res) {
  try {
    // Import the bundled server app dynamically
    const { app } = await import('./api-server.js');
    
    if (!app) {
      console.error('❌ Failed to import server app from bundle');
      return res.status(500).json({ 
        message: 'Server initialization failed - app not found in bundle',
        error: 'SERVER_INIT_ERROR',
        timestamp: new Date().toISOString()
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
}