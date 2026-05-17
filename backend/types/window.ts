// Extend Window for wallet API injected by wallet script
export type WalletAPIInstance = {
  isConnected(): boolean;
  getAddress(): string;
  connect(walletName?: string): Promise<{ success?: boolean; address?: string; error?: string }>;
  disconnect(): Promise<void>;
};

declare global {
  interface Window {
    walletAPIInstance?: WalletAPIInstance;
    WalletAPI?: { initialize: (opts: unknown) => Promise<WalletAPIInstance> };
  }
}
export {};
