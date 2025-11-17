/**
 * Type declarations for window global properties
 */

interface WalletAPIInstance {
  isConnected(): boolean;
  getAddress(): string | null;
  connect(): Promise<{ success: boolean; address?: string; error?: string }>;
  disconnect(): Promise<void>;
}

declare global {
  interface Window {
    walletAPIInstance?: WalletAPIInstance;
  }
}

export {};

