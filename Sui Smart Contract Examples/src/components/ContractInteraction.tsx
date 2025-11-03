'use client';

import React, { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';

export const ContractInteraction: React.FC = () => {
  const { isConnected, accountAddress } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStartProcess = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate contract interaction
      // In a real implementation, this would call the actual smart contract
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setResult({
        success: true,
        message: 'Process started successfully!',
        transactionId: '0x' + Math.random().toString(16).substr(2, 8),
        note: 'This is a simulation. In production, this would call your deployed smart contract.'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start process');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchaseItem = async (itemType: number) => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    const itemNames = {
      1: 'Basic Item (0.1 SUI)',
      2: 'Standard Item (0.4 SUI)',
      3: 'Premium Item (1 SUI)'
    };

    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate contract interaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setResult({
        success: true,
        message: `${itemNames[itemType as keyof typeof itemNames]} purchased successfully!`,
        transactionId: '0x' + Math.random().toString(16).substr(2, 8),
        note: 'This is a simulation. In production, this would call your deployed smart contract.'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to purchase item');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="contract-interaction bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
        <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4">Contract Interactions</h2>
        <p className="text-[var(--color-text-secondary)]">
          Please connect your wallet to interact with smart contracts.
        </p>
      </div>
    );
  }

  return (
    <div className="contract-interaction bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
      <h2 className="text-2xl font-bold text-[var(--color-text)] mb-6">Contract Interactions</h2>
      
      <div className="space-y-6">
        {/* Process Management */}
        <div className="border border-[var(--color-border)] rounded-lg p-4">
          <h3 className="text-lg font-semibold text-[var(--color-accent1)] mb-3">Process Management</h3>
          <p className="text-sm text-[var(--color-text-secondary)] mb-3">
            Example of calling a process management smart contract function.
          </p>
          <button 
            onClick={handleStartProcess}
            disabled={isLoading}
            className="px-4 py-2 bg-[var(--color-accent1)] text-white rounded-lg hover:bg-[var(--color-accent1)]/80 disabled:opacity-50"
          >
            {isLoading ? 'Starting...' : 'Start Process'}
          </button>
        </div>
        
        {/* Item Purchases */}
        <div className="border border-[var(--color-border)] rounded-lg p-4">
          <h3 className="text-lg font-semibold text-[var(--color-accent2)] mb-3">Purchase Items</h3>
          <p className="text-sm text-[var(--color-text-secondary)] mb-3">
            Example of calling a purchase smart contract function.
          </p>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => handlePurchaseItem(1)}
              disabled={isLoading}
              className="px-4 py-2 bg-[var(--color-accent2)] text-white rounded-lg hover:bg-[var(--color-accent2)]/80 disabled:opacity-50"
            >
              Basic Item (0.1 SUI)
            </button>
            <button 
              onClick={() => handlePurchaseItem(2)}
              disabled={isLoading}
              className="px-4 py-2 bg-[var(--color-accent2)] text-white rounded-lg hover:bg-[var(--color-accent2)]/80 disabled:opacity-50"
            >
              Standard Item (0.4 SUI)
            </button>
            <button 
              onClick={() => handlePurchaseItem(3)}
              disabled={isLoading}
              className="px-4 py-2 bg-[var(--color-accent2)] text-white rounded-lg hover:bg-[var(--color-accent2)]/80 disabled:opacity-50"
            >
              Premium Item (1 SUI)
            </button>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {result && (
        <div className="mt-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          <h4 className="font-semibold mb-2">Transaction Result</h4>
          <p className="mb-2">{result.message}</p>
          <p className="text-sm font-mono mb-2">Transaction ID: {result.transactionId}</p>
          <p className="text-xs text-gray-600">{result.note}</p>
        </div>
      )}
    </div>
  );
};