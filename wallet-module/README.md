# Wallet Connection Module

This module bundles `@mysten/dapp-kit` and exposes a vanilla JS API for wallet connection.

## Setup

```bash
cd wallet-module
npm install
npm run build
```

This will create `dist/wallet-api.umd.js` which can be loaded in your HTML file.

**Note:** You'll also need React and ReactDOM loaded before this script:
```html
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
```

## Usage

```html
<!-- Load React first -->
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

<!-- Load bundled wallet API -->
<script src="wallet-module/dist/wallet-api.umd.js"></script>

<script>
  // Initialize wallet API
  WalletAPI.initialize({ network: 'mainnet' }).then(async (api) => {
    console.log('Wallet API initialized');
    
    // Get available wallets
    const wallets = api.getWallets();
    console.log('Available wallets:', wallets);
    
    // Connect to wallet (automatically finds Slush/Sui wallet)
    try {
      const result = await api.connect();
      console.log('Connected:', result.address);
    } catch (error) {
      console.error('Connection failed:', error);
    }
    
    // Check connection status
    if (api.isConnected()) {
      console.log('Address:', api.getAddress());
      console.log('Formatted:', api.formatAddress(api.getAddress()));
    }
    
    // Listen for wallet events
    api.on((event) => {
      console.log('Wallet event:', event);
    });
  });
</script>
```

## API Methods

- `initialize(options)` - Initialize wallet API
  - `options.network` - 'mainnet' or 'testnet' (default: 'mainnet')
  - Returns: Promise<WalletAPI>
  
- `getAddress()` - Get current wallet address (null if not connected)
- `isConnected()` - Check if wallet is connected
- `getWallets()` - Get list of available wallets
- `connect(walletName?)` - Connect to wallet (auto-finds Slush if no name provided)
- `disconnect()` - Disconnect wallet
- `formatAddress(address)` - Format address for display
- `on(callback)` - Add event listener, returns unsubscribe function
- `off(callback)` - Remove event listener

