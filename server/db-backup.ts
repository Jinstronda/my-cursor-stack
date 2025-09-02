import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";
import { createSupabaseFallback, SupabaseFallback } from './supabase-fallback';

let client: any = null;
let db: any = null;
let supabaseFallback: SupabaseFallback | null = null;
let isUsingFallback = false;

// Validate DATABASE_URL format
function validateDatabaseURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'postgresql:' && 
           !!parsed.hostname && 
           !!parsed.pathname &&
           parsed.pathname !== '/';
  } catch {
    return false;
  }
}

// Database configuration with connection pooling and retry logic
async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set - running without database connection');
    console.log('   To enable database features, add DATABASE_URL to your .env file');
    return;
  }


  // Validate DATABASE_URL format before attempting connection
  if (!validateDatabaseURL(process.env.DATABASE_URL)) {
    const maskedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@');
    throw new Error(`❌ Invalid DATABASE_URL format: ${maskedUrl}`);
  }

  // Try multiple connection strategies for Windows network compatibility
  const connectionStrategies = [
    {
      name: 'Standard Supabase Connection',
      url: process.env.DATABASE_URL,
      config: {
        max: 1,
        idle_timeout: 30,
        connect_timeout: 60,
        no_prepare: true,
        ssl: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Direct Connection Mode',
      url: process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL,
      config: {
        max: 1,
        idle_timeout: 20,
        connect_timeout: 30,
        no_prepare: true,
        ssl: { rejectUnauthorized: false },
        // Force IPv4 for Windows compatibility
        family: 4
      }
    },
    {
      name: 'Session-based Connection',
      url: process.env.DATABASE_URL.replace('.pooler.supabase.com', '.supabase.co'),
      config: {
        max: 1,
        idle_timeout: 15,
        connect_timeout: 45,
        no_prepare: true,
        ssl: { rejectUnauthorized: false },
        // Use session mode instead of transaction pooling
        prepare: false
      }
    }
  ];

  let lastError;
  
  for (const strategy of connectionStrategies) {
    try {
      console.log(`🔄 Attempting: ${strategy.name}...`);
      
      client = postgres(strategy.url, strategy.config);
      db = drizzle(client, { schema });
      
      // Test the connection with timeout
      const testPromise = client`SELECT 1`;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection test timeout')), 30000)
      );
      
      await Promise.race([testPromise, timeoutPromise]);
      
      console.log(`✅ Database connected successfully using: ${strategy.name}`);
      
      // Log connection info in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔗 Connection pool: max ${strategy.config.max}, timeout ${strategy.config.connect_timeout}s`);
      }
      
      return; // Success - exit the retry loop
      
    } catch (error) {
      console.log(`❌ ${strategy.name} failed: ${error.message}`);
      lastError = error;
      
      // Clean up failed connection
      if (client) {
        try {
          await client.end();
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        client = null;
        db = null;
      }
    }
  }

  // All PostgreSQL strategies failed - try HTTP fallback
  console.error('🚨 All PostgreSQL connection strategies failed!');
  console.error('Last error:', lastError);
  
  // Try Supabase HTTP API fallback
  console.log('\n🔄 Attempting Supabase HTTP API fallback...');
  try {
    supabaseFallback = await createSupabaseFallback();
    
    if (supabaseFallback) {
      isUsingFallback = true;
      console.log('✅ Successfully connected using Supabase HTTP API fallback');
      console.log('⚠️  Limited functionality: Complex SQL queries may not work');
      return; // Success with fallback
    }
  } catch (fallbackError) {
    console.log('❌ HTTP fallback also failed:', fallbackError);
  }
  
  // Both PostgreSQL and HTTP fallback failed
  console.error('\n💥 ALL CONNECTION METHODS FAILED');
  
  // Windows-specific troubleshooting help
  if (process.platform === 'win32') {
    console.log('\n🔧 WINDOWS TROUBLESHOOTING STEPS:');
    console.log('1. Run as Administrator: windows-db-fix.bat');
    console.log('2. Check Windows Firewall: Allow Node.js through firewall');
    console.log('3. Corporate Network: Port 5432 may be blocked');
    console.log('4. Try mobile hotspot to test ISP blocking');
    console.log('5. Disable VPN/Proxy temporarily');
    console.log('6. Check antivirus software network protection');
  }
  
  // In development, allow the app to continue without database
  if (process.env.NODE_ENV === 'development') {
    console.log('\n⚠️  DEVELOPMENT MODE: Continuing without database connection');
    console.log('   Some features may not work properly');
    return;
  }
  
  // In production, database is required
  if (process.env.NODE_ENV === 'production') {
    console.error('🚨 Database is required in production. Please check your DATABASE_URL.');
    throw lastError;
  }
}

// Health check function for monitoring
export async function checkDatabaseHealth(): Promise<boolean> {
  // Check fallback mode first
  if (isUsingFallback && supabaseFallback) {
    try {
      await supabaseFallback.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Fallback health check failed:', error);
      return false;
    }
  }
  
  // Check direct PostgreSQL connection
  if (!client) return false;
  
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Graceful shutdown function
export async function closeDatabaseConnection(): Promise<void> {
  // Close fallback connection
  if (supabaseFallback) {
    try {
      await supabaseFallback.end();
      supabaseFallback = null;
      isUsingFallback = false;
    } catch (error) {
      console.error('Error closing fallback connection:', error);
    }
  }
  
  // Close PostgreSQL connection
  if (client) {
    try {
      await client.end();
      console.log('✅ Database connection closed gracefully');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  }
}

// Export connection status helpers
export function isUsingHttpFallback(): boolean {
  return isUsingFallback;
}

export function getSupabaseFallback(): SupabaseFallback | null {
  return supabaseFallback;
}

export { client, db, initializeDatabase };