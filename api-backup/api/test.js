// Minimal test endpoint to isolate crash cause
export default function handler(req, res) {
  console.log('✅ Test function started');
  
  try {
    console.log('✅ Basic execution works');
    
    return res.status(200).json({
      success: true,
      message: 'Test endpoint works',
      timestamp: Date.now(),
      env: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('❌ Test function error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}