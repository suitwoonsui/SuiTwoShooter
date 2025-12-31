// ==========================================
// Admin Page - Wallet Connection Hook
// ==========================================

'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/get-api-url';

export function useWalletConnection() {
  const [adminAddress, setAdminAddress] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Load admin address
  useEffect(() => {
    fetch(getApiUrl('api/admin/verify-wallet'))
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAdminAddress(data.adminAddress.toLowerCase());
        }
      })
      .catch(err => console.error('Failed to load admin address:', err));
  }, []);

  // Load wallet API script and initialize
  useEffect(() => {
    let scriptLoaded = false;
    let checkInterval: NodeJS.Timeout | null = null;

    const loadWalletAPI = async () => {
      // Check if already loaded
      if (window.walletAPIInstance) {
        console.log('✅ Wallet API already loaded');
        return;
      }

      // Check if script is already in the DOM
      if (document.querySelector('script[src*="wallet-api"]')) {
        console.log('✅ Wallet script already in DOM, waiting for initialization...');
        // Wait for initialization
        checkInterval = setInterval(() => {
          if (window.walletAPIInstance) {
            clearInterval(checkInterval!);
            console.log('✅ Wallet API initialized after script load');
          }
        }, 500);
        return;
      }

      // Load the wallet script
      try {
        // Get network and wallet module URL from config
        const configResponse = await fetch(getApiUrl('api/config'));
        const config = await configResponse.json();
        const network = config.network || 'testnet';
        const walletModuleUrl = config.walletModuleUrl || '/wallet-module/dist/wallet-api.umd.cjs';

        // Create and load script
        const script = document.createElement('script');
        script.src = walletModuleUrl;
        script.async = true;
        
        script.onload = async () => {
          console.log('✅ Wallet script loaded');
          
          // Initialize wallet API
          if (typeof window.WalletAPI !== 'undefined') {
            try {
              if (typeof window.WalletAPI.initialize === 'function') {
                const api = await window.WalletAPI.initialize({ network });
                window.walletAPIInstance = api;
                console.log('✅ Wallet API initialized:', api);
              } else {
                console.error('❌ WalletAPI.initialize is not a function');
              }
            } catch (error) {
              console.error('❌ Failed to initialize wallet API:', error);
            }
          } else {
            console.error('❌ WalletAPI not found after script load');
          }
        };

        script.onerror = () => {
          console.error('❌ Failed to load wallet script from:', walletModuleUrl);
          setWalletError('Failed to load wallet module. Please ensure the wallet module is accessible.');
        };

        document.head.appendChild(script);
        scriptLoaded = true;
      } catch (error) {
        console.error('❌ Error loading wallet API:', error);
        setWalletError('Failed to load wallet API. Please refresh the page.');
      }
    };

    // Load wallet API
    loadWalletAPI();

    // Check if wallet is already connected
    const checkConnection = () => {
      if (window.walletAPIInstance) {
        // Check if wallet is connected and get address
        if (typeof window.walletAPIInstance.isConnected === 'function' && 
            typeof window.walletAPIInstance.getAddress === 'function') {
          try {
            if (window.walletAPIInstance.isConnected()) {
              const currentAddress = window.walletAPIInstance.getAddress();
              if (currentAddress && typeof currentAddress === 'string') {
                setConnectedAddress(currentAddress.toLowerCase());
              }
            }
          } catch (error) {
            // Silently fail - wallet might not be connected yet
          }
        }
      }
    };

    // Check connection periodically
    const connectionInterval = setInterval(checkConnection, 1000);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      clearInterval(connectionInterval);
    };
  }, []);

  const connectWallet = async () => {
    setWalletError(null);
    try {
      if (!window.walletAPIInstance) {
        setWalletError('Wallet API not loaded. Please wait a moment and try again.');
        return;
      }

      const result = await window.walletAPIInstance.connect();
      // The connect() method returns an object: { success: boolean, address?: string, error?: string }
      if (result && result.success && result.address) {
        setConnectedAddress(result.address.toLowerCase());
      } else {
        const errorMessage = result?.error || 'Failed to connect wallet. Please try again.';
        setWalletError(errorMessage);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setWalletError(error instanceof Error ? error.message : 'Failed to connect wallet');
    }
  };

  const disconnectWallet = async () => {
    try {
      if (window.walletAPIInstance) {
        await window.walletAPIInstance.disconnect();
      }
      setConnectedAddress(null);
      setWalletError(null);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  const isAdminWalletConnected = connectedAddress !== null && connectedAddress === adminAddress;

  return {
    adminAddress,
    connectedAddress,
    walletError,
    isAdminWalletConnected,
    connectWallet,
    disconnectWallet,
  };
}

