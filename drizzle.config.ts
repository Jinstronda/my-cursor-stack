import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

// Load environment variables for drizzle-kit CLI compatibility
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not found. Ensure your environment variables are properly configured in .env file.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
