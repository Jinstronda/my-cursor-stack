import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath, URL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    // Code splitting and chunk optimization
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for third-party libraries
          vendor: ['react', 'react-dom'],
          // UI components chunk
          ui: ['@radix-ui/react-accordion', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          // Charts and data visualization
          charts: ['recharts'],
          // Form handling
          forms: ['react-hook-form', '@hookform/resolvers'],
          // Utility libraries
          utils: ['clsx', 'date-fns', 'zod'],
        },
        // Optimize chunk sizes
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return `assets/[name]-[hash][extname]`;
          const info = assetInfo.name.split('.');
          const extType = info[info.length - 1];
          if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)$/.test(assetInfo.name)) {
            return `media/[name]-[hash][extname]`;
          }
          if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(assetInfo.name)) {
            return `images/[name]-[hash][extname]`;
          }
          if (extType === 'css') {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    // Source maps for production debugging
    sourcemap: process.env.NODE_ENV === 'production' ? 'hidden' : true,
    // Asset inlining threshold
    assetsInlineLimit: 4096,
    // CSS code splitting
    cssCodeSplit: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    // Development server optimizations
    hmr: {
      overlay: true,
    },
  },
  // Preview server configuration for local testing
  preview: {
    port: 3000,
    strictPort: true,
    open: true,
  },
  // Define global constants for build optimization
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production'),
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-hook-form',
      '@hookform/resolvers/zod',
      'zod',
      'clsx',
      'date-fns',
    ],
    exclude: ['@shared/schema']
  },
});
