/**
 * Test endpoint to verify environment variables in Vercel runtime
 */

console.log('🔍 Testing environment variables in Vercel runtime');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('VERCEL:', process.env.VERCEL);
console.log('Available SUPABASE vars:', Object.keys(process.env).filter(key => 
  key.includes('SUPABASE')
));

// Check if environment variables exist
const envCheck = {
  SUPABASE_URL: !!process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: process.env.VERCEL,
  PORT: process.env.PORT,
  HOST: process.env.HOST
};

console.log('Environment check:', envCheck);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.status(200).json({
    timestamp: new Date().toISOString(),
    environment: envCheck,
    nodeVersion: process.version,
    platform: process.platform,
    allEnvVars: Object.keys(process.env)
  });
}