import { getFullnodeUrl } from '@mysten/sui/client';

export const networkConfig = {
  networks: {
    mainnet: {
      url: getFullnodeUrl('mainnet'),
      name: 'Mainnet',
    },
    testnet: {
      url: getFullnodeUrl('testnet'),
      name: 'Testnet',
    },
    devnet: {
      url: getFullnodeUrl('devnet'),
      name: 'Devnet',
    },
    localnet: {
      url: getFullnodeUrl('localnet'),
      name: 'Localnet',
    },
  },
  defaultNetwork: 'testnet' as const,
};

// Debug function to log network configuration
export const debugNetworkConfig = () => {
  // Network configuration debug function (console logs removed for cleaner output)
};
