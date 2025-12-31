/**
 * Network configuration for different Sui networks
 * Centralized configuration management for easy switching between environments
 */

export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  faucetUrl?: string;
  chainId: string;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  mainnet: {
    name: 'Mainnet',
    rpcUrl: process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443',
    explorerUrl: 'https://suiexplorer.com',
    chainId: 'sui:mainnet'
  },
  testnet: {
    name: 'Testnet',
    rpcUrl: process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
    explorerUrl: 'https://suiexplorer.com/testnet',
    faucetUrl: 'https://discord.gg/sui',
    chainId: 'sui:testnet'
  },
  devnet: {
    name: 'Devnet',
    rpcUrl: process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.devnet.sui.io:443',
    explorerUrl: 'https://suiexplorer.com/devnet',
    faucetUrl: 'https://suiexplorer.com/faucet',
    chainId: 'sui:devnet'
  },
  localnet: {
    name: 'Localnet',
    rpcUrl: process.env.NEXT_PUBLIC_SUI_RPC_URL || 'http://127.0.0.1:9000',
    explorerUrl: 'http://127.0.0.1:3000',
    chainId: 'sui:localnet'
  }
};

export const DEFAULT_NETWORK = (process.env.NEXT_PUBLIC_NETWORK_TYPE as string) || 'testnet';

export function getNetworkConfig(network: string): NetworkConfig {
  return NETWORKS[network] || NETWORKS[DEFAULT_NETWORK];
}

export function getNetworkUrl(network: string): string {
  return getNetworkConfig(network).rpcUrl;
}

export function getChainId(network: string): string {
  return getNetworkConfig(network).chainId;
}
