/**
 * Wallet-related type definitions
 * Types for wallet connections, balances, and network management
 */

// Wallet connection state
export interface WalletConnectionState {
  isConnected: boolean;
  accountAddress: string | null;
  network: string;
  balance: string | null;
  isLoading: boolean;
}

// Wallet provider interface
export interface WalletProvider {
  id: string;
  name: string;
  icon: string;
  isAvailable: boolean;
  isConnected: boolean;
}

// Wallet account information
export interface WalletAccount {
  address: string;
  publicKey: string;
  chain: string;
  features: string[];
}

// Network information
export interface NetworkInfo {
  name: string;
  chainId: string;
  rpcUrl: string;
  explorerUrl: string;
  isTestnet: boolean;
}

// Balance information
export interface BalanceInfo {
  coinType: string;
  totalBalance: string;
  coinObjectCount: number;
  lockedBalance?: string;
}

// Transaction status
export type TransactionStatus = 
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'cancelled';

// Transaction information
export interface TransactionInfo {
  id: string;
  status: TransactionStatus;
  from: string;
  to?: string;
  amount: string;
  coinType: string;
  timestamp: number;
  gasUsed?: string;
  gasPrice?: string;
}

// Wallet error types
export type WalletError = 
  | 'connection_failed'
  | 'disconnection_failed'
  | 'transaction_failed'
  | 'insufficient_balance'
  | 'network_error'
  | 'user_rejected'
  | 'unknown_error';

// Wallet error interface
export interface WalletErrorInfo {
  type: WalletError;
  message: string;
  code?: string;
  details?: unknown;
}

// Wallet connection options
export interface WalletConnectionOptions {
  autoConnect?: boolean;
  network?: string;
  timeout?: number;
}

// Wallet disconnection options
export interface WalletDisconnectionOptions {
  clearCache?: boolean;
  resetState?: boolean;
}

// Wallet event types
export type WalletEvent = 
  | 'connect'
  | 'disconnect'
  | 'accountChange'
  | 'networkChange'
  | 'balanceChange';

// Wallet event listener
export interface WalletEventListener {
  event: WalletEvent;
  callback: (data: unknown) => void;
}

// Wallet capabilities
export interface WalletCapabilities {
  canSign: boolean;
  canExecute: boolean;
  canView: boolean;
  supportedNetworks: string[];
}
