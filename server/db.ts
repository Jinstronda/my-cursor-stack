import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

let client: any = null;
let db: any = null;

async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set - running without database connection');
    return;
  }

  try {
    console.log('🔄 Connecting to database...');
    
    // Connection with timeout and retry
    client = postgres(process.env.DATABASE_URL, {
      max: 1,
      connect_timeout: 10,
      idle_timeout: 30,
      ssl: { rejectUnauthorized: false }
    });
    
    db = drizzle(client, { schema });
    
    // Test the connection with timeout
    const testQuery = client`SELECT 1`;
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
    );
    
    await Promise.race([testQuery, timeout]);
    
    console.log('✅ Database connected successfully');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error; // Always throw - database is required
  }
}

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
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
  if (client) {
    try {
      await client.end();
      console.log('✅ Database connection closed gracefully');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  }
}

export { client, db, initializeDatabase };