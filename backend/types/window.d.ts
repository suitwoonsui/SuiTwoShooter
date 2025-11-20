/**
 * Type declarations for window global properties
 */

interface WalletAPIInstance {
  isConnected(): boolean;
  getAddress(): string | null;
  connect(): Promise<{ success: boolean; address?: string; error?: string }>;
  disconnect(): Promise<void>;
}

interface WalletAPIConstructor {
  initialize(options?: { network?: string; containerId?: string }): Promise<WalletAPIInstance>;
}

declare global {
  interface Window {
    walletAPIInstance?: WalletAPIInstance;
    WalletAPI?: WalletAPIConstructor;
  }
}

export {};

