import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
    'process.platform': JSON.stringify('browser'),
    'process.version': JSON.stringify('v18.0.0')
  },
  build: {
    lib: {
      entry: 'src/wallet-api.jsx',
      name: 'WalletAPI',
      fileName: 'wallet-api',
      formats: ['umd']
    },
    rollupOptions: {
      // Don't externalize React - bundle it with the wallet module
      // This ensures React and ReactDOM initialize __CLIENT_INTERNALS correctly
      external: [],
      output: {
        // Bundle React and ReactDOM with the wallet module
        inlineDynamicImports: true,
        // Ensure exports are available
        exports: 'auto',
        // Set React on globalThis after bundle loads so other code can use it
        banner: `
          // Wallet module with bundled React
          // React will be available on globalThis after this bundle loads
        `,
        footer: `
          // Expose React and ReactDOM on globalThis for other code to use
          if (typeof globalThis !== 'undefined') {
            if (typeof WalletAPI !== 'undefined' && WalletAPI.React) {
              globalThis.React = WalletAPI.React;
              globalThis.ReactDOM = WalletAPI.ReactDOM;
            }
          }
        `
      }
    },
    // Include all dependencies in bundle
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  }
});

