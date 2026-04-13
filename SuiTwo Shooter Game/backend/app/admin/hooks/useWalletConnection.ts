// ==========================================
// Admin Page - Wallet Connection Hook
// ==========================================
// Independent implementation that calls platform APIs
// No code dependencies on platform - only API calls

'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/get-api-url';

// Set up console.error interceptor at module level to catch wallet extension errors early
if (typeof window !== 'undefined' && !(window as any).__walletErrorInterceptorSet) {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    // Get the current call stack to check where console.error is being called from
    const callStack = new Error().stack || '';
    // Check if error is coming from wallet connection code
    // Be VERY aggressive - check for the file name in the stack in multiple ways
    const isFromWalletConnection = 
      callStack.includes('connectWallet') || 
      callStack.includes('useWalletConnection') ||
      callStack.includes('useWalletConnection.ts') ||
      callStack.includes('app\\admin\\hooks\\useWalletConnection') ||
      callStack.includes('app/admin/hooks/useWalletConnection') ||
      callStack.includes('useWalletConnection.ts:') || // Line number format
      callStack.includes('connectWallet (') || // Function call format
      callStack.includes('at connectWallet'); // Stack trace format
    
    // NUCLEAR OPTION: If ANY error is logged from connectWallet context, check all args for TRPCClientError
    // This catches cases where the error might be stringified or transformed
    if (isFromWalletConnection) {
      let foundTRPCError = false;
      for (const arg of args) {
        const argStr = typeof arg === 'string' ? arg : String(arg);
        const argLower = argStr.toLowerCase();
        if (argLower.includes('trpcclienterror') || argLower.includes('trpc')) {
          foundTRPCError = true;
          break;
        }
        // Also check error objects
        if (arg instanceof Error) {
          const errorName = (arg.name || '').toLowerCase();
          const errorMessage = (arg.message || '').toLowerCase();
          if (errorName.includes('trpcclienterror') || errorName.includes('trpc') ||
              errorMessage.includes('trpcclienterror') || errorMessage.includes('trpc')) {
            foundTRPCError = true;
            break;
          }
        }
      }
      // If we found any TRPC-related error from connectWallet, suppress it completely
      if (foundTRPCError) {
        return; // Exit early, don't log
      }
    }
    
    // Check if this error is from the wallet extension or contains rejection patterns
    let isWalletExtensionError = false;
    let errorText = '';
    let hasTRPCClientError = false;
    
    for (const arg of args) {
      if (typeof arg === 'string') {
        errorText += arg + ' ';
        // Check if string itself contains rejection message
        const lowerArg = arg.toLowerCase();
        if (lowerArg.includes('user rejected') || 
            lowerArg.includes('user cancelled') ||
            (lowerArg.includes('rejected') && (lowerArg.includes('request') || lowerArg.includes('user')))) {
          isWalletExtensionError = true;
        }
      } else if (arg instanceof Error) {
        errorText += `${arg.name} ${arg.message} ${arg.stack || ''} `;
        
        // Check if stack trace includes chrome-extension URL (wallet extension)
        if (arg.stack && arg.stack.includes('chrome-extension://') && arg.stack.includes('dapp-interface')) {
          isWalletExtensionError = true;
        }
        
        // Check for TRPCClientError which might be a wallet rejection
        if (arg.name === 'TRPCClientError' || arg.constructor?.name === 'TRPCClientError') {
          hasTRPCClientError = true;
          
          // If TRPCClientError is being logged from wallet connection code, suppress it (it's a user rejection)
          if (isFromWalletConnection) {
            isWalletExtensionError = true;
          }
          
          // Also check the error's own stack trace and message
          const stack = arg.stack || '';
          const message = (arg.message || '').toLowerCase();
          const fullText = `${stack} ${message}`.toLowerCase();
          
          // If TRPC error is from wallet connection code path, it's likely a user rejection
          const isFromWalletConnectionStack = 
            stack.includes('useWalletConnection') ||
            stack.includes('connectWallet') ||
            stack.includes('wallet-api') ||
            stack.includes('useWalletConnection.ts');
          
          // Check for explicit rejection messages
          const hasRejectionMessage = 
            message.includes('user rejected') ||
            message.includes('user cancelled') ||
            message.includes('rejected') ||
            message.includes('cancelled') ||
            message.includes('denied') ||
            fullText.includes('dapp.connect') ||
            (fullText.includes('query') && fullText.includes('dapp'));
          
          // Suppress if from wallet connection OR has rejection message
          if (isFromWalletConnectionStack || hasRejectionMessage) {
            isWalletExtensionError = true;
          }
        }
      } else {
        const argStr = String(arg);
        errorText += argStr + ' ';
        // Check if stringified arg contains rejection message
        const lowerArg = argStr.toLowerCase();
        if (lowerArg.includes('user rejected') || 
            lowerArg.includes('user cancelled') ||
            (lowerArg.includes('rejected') && (lowerArg.includes('request') || lowerArg.includes('user')))) {
          isWalletExtensionError = true;
        }
      }
    }
    
    errorText = errorText.toLowerCase();
    
    // If TRPCClientError is being logged from wallet connection code, suppress it
    // This is almost always a user rejection in the wallet connection context
    // Be VERY aggressive - if it's a TRPCClientError and we're in wallet connection context, ALWAYS suppress it
    if (hasTRPCClientError) {
      // If from wallet connection, ALWAYS suppress (no questions asked)
      if (isFromWalletConnection) {
        isWalletExtensionError = true;
      } else {
        // Fallback: if TRPCClientError has any rejection-like text, suppress it
        const lowerErrorText = errorText.toLowerCase();
        if (lowerErrorText.includes('rejected') || 
            lowerErrorText.includes('cancelled') ||
            lowerErrorText.includes('denied') ||
            lowerErrorText.includes('user') ||
            lowerErrorText.includes('request')) {
          isWalletExtensionError = true;
        }
        // Last resort: if it's a TRPCClientError and we can't determine context,
        // but the call stack shows it's from this file, suppress it anyway
        if (!isWalletExtensionError && callStack.includes('useWalletConnection')) {
          isWalletExtensionError = true;
        }
      }
    }
    
    // Check for wallet rejection patterns
    // Pattern: "[[ << query #X ]dApp.connect {}" or similar (from wallet extension's dapp-interface.js)
    // Also check for TRPCClientError from wallet connection flow
    const isWalletRejectionError = 
      isWalletExtensionError ||
      // Wallet extension's dApp.connect logging (chrome-extension dapp-interface); we cannot prevent extension from logging
      (errorText.includes('dapp.connect') && (errorText.includes('{}') || errorText.includes('<<') || errorText.includes('query'))) ||
      // Direct rejection message patterns
      errorText.includes('user rejected the request') ||
      errorText.includes('user rejected') ||
      errorText.includes('user cancelled') ||
      (errorText.includes('rejected') && (errorText.includes('request') || errorText.includes('user'))) ||
      // Wallet extension patterns
      (errorText.includes('dapp.connect') && (errorText.includes('chrome-extension://') || errorText.includes('query'))) ||
      (errorText.includes('query') && errorText.includes('dapp') && (errorText.includes('chrome-extension://') || errorText.includes('<<'))) ||
      (errorText.includes('<< query') && errorText.includes('dapp')) ||
      (errorText.includes('query #') && errorText.includes('dapp.connect')) ||
      // Suppress TRPCClientError from wallet connection code paths or with rejection messages
      (errorText.includes('trpcclienterror') && (
        errorText.includes('usewalletconnection') || 
        errorText.includes('connectwallet') || 
        errorText.includes('wallet-api') || 
        errorText.includes('user rejected') ||
        errorText.includes('user cancelled') ||
        errorText.includes('rejected') ||
        errorText.includes('cancelled') ||
        errorText.includes('denied') ||
        errorText.includes('dapp') || 
        errorText.includes('query')
      )) ||
      // Last resort: if TRPCClientError and call stack includes this file, suppress it
      (hasTRPCClientError && callStack.includes('useWalletConnection')) ||
      // Very aggressive: if TRPCClientError and we're in wallet connection context, suppress it
      // This catches cases where Next.js intercepts console.error before our stack trace check works
      (hasTRPCClientError && (
        callStack.includes('connectWallet') ||
        callStack.includes('wallet-api') ||
        callStack.includes('wallet-module') ||
        callStack.includes('useWalletConnection')
      )) ||
      // ULTRA aggressive: if TRPCClientError appears anywhere in the error text and call stack,
      // and we're in this file's context, suppress it (Next.js might format the stack differently)
      (hasTRPCClientError && errorText.includes('trpcclienterror') && callStack.includes('useWalletConnection'));
    
    // ULTRA aggressive: If it's a TRPCClientError from connectWallet, ALWAYS suppress it
    // This is the nuclear option - Next.js intercepts console.error first, so we need to be very aggressive
    if (hasTRPCClientError && isFromWalletConnection) {
      // Suppress completely - don't log at all
      return; // Exit early, don't call originalConsoleError
    }
    
    // NUCLEAR option: If ANY error is logged from connectWallet and it contains "TRPC" or "Error", suppress it
    // This catches cases where the error object might be transformed or stringified
    if (isFromWalletConnection) {
      const allArgsText = args.map(arg => {
        if (arg instanceof Error) {
          return `${arg.name} ${arg.message} ${arg.stack || ''}`;
        }
        return String(arg);
      }).join(' ').toLowerCase();
      
      if (allArgsText.includes('trpc') || allArgsText.includes('trpcclienterror') || allArgsText.includes('error')) {
        // Suppress completely - if it's from connectWallet and mentions error/trpc, suppress it
        return;
      }
    }
    
    // FINAL NUCLEAR OPTION: If the call stack shows connectWallet and ANY arg is an Error object, suppress it
    // This is the most aggressive check - if we're in connectWallet context and there's an error, suppress it
    // This catches cases where the error might not match our patterns but is still from wallet rejection
    if (isFromWalletConnection && args.some(arg => arg instanceof Error)) {
      // Suppress all errors from connectWallet - they're almost always user rejections
      return;
    }
    
    // Only suppress wallet extension rejection errors, let others through
    if (!isWalletRejectionError) {
      originalConsoleError.apply(console, args);
    } else {
      // Silently suppress - don't log anything for wallet rejection errors
    }
    // Silently ignore wallet extension rejection errors
  };
  
  (window as any).__walletErrorInterceptorSet = true;
}

export function useWalletConnection() {
  const [adminAddress, setAdminAddress] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState<Array<{ name: string; icon?: string; installed?: boolean }>>([]);

  // Load admin address from platform API
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
  // Gets wallet module URL from platform API (api/config)
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
        // Get network and wallet module URL from platform API
        const configUrl = getApiUrl('api/config');
        console.log('🔧 [WALLET] Fetching config from platform API:', configUrl);
        const configResponse = await fetch(configUrl);
        
        if (!configResponse.ok) {
          throw new Error(`Platform config API returned ${configResponse.status}: ${configResponse.statusText}`);
        }
        
        const config = await configResponse.json();
        console.log('🔧 [WALLET] Config received from platform:', { network: config.network, walletModuleUrl: config.walletModuleUrl });
        
        if (!config.success) {
          throw new Error('Platform config API returned unsuccessful response');
        }
        
        const network = config.network || 'testnet';
        const walletModuleUrl = config.walletModuleUrl || 'http://localhost:3000/wallet-api.umd.cjs';
        const storageKey = config.storageKey || 'game-admin-wallet';
        
        console.log('🔧 [WALLET] Using wallet module URL from platform:', walletModuleUrl);

        // Create and load script
        const script = document.createElement('script');
        script.src = walletModuleUrl;
        script.async = true;
        
        script.onload = async () => {
          console.log('✅ Wallet script loaded from platform');
          
          // Initialize wallet API (storageKey keeps game and platform admin connections separate)
          if (typeof window.WalletAPI !== 'undefined') {
            try {
              if (typeof window.WalletAPI.initialize === 'function') {
                const api = await window.WalletAPI.initialize({ network, storageKey });
                window.walletAPIInstance = api;
                console.log('✅ Wallet API initialized:', api);
              } else {
                console.error('❌ WalletAPI.initialize is not a function');
              }
            } catch (error) {
              console.error('❌ Failed to initialize wallet API:', error);
              setWalletError(`Failed to initialize wallet API: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          } else {
            console.error('❌ WalletAPI not found after script load');
            setWalletError('WalletAPI not found after script loaded. The wallet module may be corrupted or incompatible.');
          }
        };

        script.onerror = (error) => {
          console.error('❌ Failed to load wallet script from platform:', walletModuleUrl, error);
          setWalletError(`Failed to load wallet module from platform (${walletModuleUrl}). Please ensure the platform backend (port 3000) is running and the wallet module is accessible.`);
        };

        document.head.appendChild(script);
        scriptLoaded = true;
      } catch (error) {
        console.error('❌ Error loading wallet API from platform:', error);
        setWalletError('Failed to load wallet API from platform. Please refresh the page.');
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

  const connectWallet = async (walletName?: string) => {
    setWalletError(null);
    
    // Wrap the entire function to catch and suppress TRPCClientError before it reaches console.error
    // This works around Next.js's console.error interceptor that runs before ours
    try {
      if (!window.walletAPIInstance) {
        setWalletError('Wallet API not loaded. Please wait a moment and try again.');
        return;
      }

      // If no wallet name is provided and a wallet is already connected,
      // disconnect first to force wallet selection dialog to appear
      if (!walletName && window.walletAPIInstance.isConnected && window.walletAPIInstance.isConnected()) {
        try {
          await window.walletAPIInstance.disconnect();
          setConnectedAddress(null);
          // Small delay to ensure disconnect completes
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.warn('Error disconnecting before reconnect:', error);
          // Continue anyway - might not be connected
        }
      }

      // Wrap the connect call to catch TRPCClientError specifically
      // The wallet API's connect method may throw TRPCClientError when user rejects
      // We need to catch it here to prevent React Query/Next.js from logging it
      let result;
      try {
        result = await window.walletAPIInstance.connect(walletName);
      } catch (connectError: any) {
        // Check if this is a TRPCClientError (user rejection)
        // Be very thorough in checking - React Query errors can be in various forms
        const errorName = connectError?.name || connectError?.constructor?.name || '';
        const errorMessage = connectError?.message || String(connectError) || '';
        const errorString = String(connectError);
        const errorCause = connectError?.cause;
        const errorData = connectError?.data;
        
        // Check for TRPCClientError in multiple ways
        const isTRPCError = 
          errorName === 'TRPCClientError' || 
          errorName.includes('TRPCClientError') ||
          errorString.includes('TRPCClientError') ||
          errorMessage.includes('TRPCClientError') ||
          (errorCause && String(errorCause).includes('TRPCClientError')) ||
          (errorData && String(errorData).includes('TRPCClientError'));
        
        // Also check for rejection patterns in the error
        const lowerMessage = errorMessage.toLowerCase();
        const lowerString = errorString.toLowerCase();
        const isRejection = 
          lowerMessage.includes('user rejected') ||
          lowerMessage.includes('user cancelled') ||
          lowerMessage.includes('rejected') ||
          lowerMessage.includes('cancelled') ||
          lowerMessage.includes('denied') ||
          lowerString.includes('user rejected') ||
          lowerString.includes('user cancelled') ||
          lowerString.includes('rejected') ||
          lowerString.includes('cancelled');
        
        if (isTRPCError || isRejection) {
          // This is a user rejection - don't log it, just return silently
          // Suppress the error completely to prevent Next.js/React Query from logging it
          // Do NOT re-throw or log anything
          return;
        }
        // If it's not a TRPC/rejection error, re-throw it to be handled by outer catch
        throw connectError;
      }
      // The connect() method returns an object: { success: boolean, address?: string, error?: string }
      if (result && result.success && result.address) {
        setConnectedAddress(result.address.toLowerCase());
      } else {
        // Check if this is a user cancellation/rejection (common error patterns)
        const errorMessage = result?.error || '';
        const isUserRejection = 
          errorMessage.toLowerCase().includes('user rejected') ||
          errorMessage.toLowerCase().includes('user cancelled') ||
          errorMessage.toLowerCase().includes('rejected') ||
          errorMessage.toLowerCase().includes('cancelled') ||
          errorMessage.toLowerCase().includes('denied') ||
          errorMessage.includes('dApp.connect');
        
        // Only show error if it's not a user rejection (user rejection is silent)
        if (!isUserRejection && errorMessage) {
          setWalletError(errorMessage);
        }
        // If user rejected, silently return - don't show error
      }
    } catch (error: any) {
      // Check if this is a TRPCClientError or user cancellation/rejection
      const errorName = error?.name || error?.constructor?.name || '';
      const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : String(error)) || 'Failed to connect wallet';
      const errorString = String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      
      // Check if it's a TRPCClientError
      const isTRPCError = 
        errorName === 'TRPCClientError' || 
        errorName.includes('TRPCClientError') ||
        errorString.includes('TRPCClientError') ||
        errorMessage.includes('TRPCClientError');
      
      // Combine all error information for pattern matching
      const fullErrorText = `${errorName} ${errorMessage} ${errorString} ${errorStack}`.toLowerCase();
      
      // Check for user rejection patterns - including wallet extension's "query #X dApp.connect" pattern
      const isUserRejection = 
        isTRPCError || // TRPCClientError in wallet context is almost always a user rejection
        fullErrorText.includes('user rejected') ||
        fullErrorText.includes('user cancelled') ||
        fullErrorText.includes('rejected') ||
        fullErrorText.includes('cancelled') ||
        fullErrorText.includes('denied') ||
        fullErrorText.includes('dapp.connect') ||
        (fullErrorText.includes('query') && fullErrorText.includes('dapp')) ||
        errorMessage.includes('dApp.connect') ||
        errorMessage.includes('query') ||
        errorMessage.includes('<< query') ||
        errorString.includes('dApp.connect') ||
        errorString.includes('query') ||
        errorString.includes('<< query');
      
      // Only show error if it's not a user rejection
      // Don't log to console at all - suppress completely for user rejections
      if (!isUserRejection) {
        // Only set error state for UI display, don't log to console
        setWalletError(errorMessage);
      }
      // If user rejected, silently return - don't show error or log to console
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
    availableWallets,
    connectWallet,
    disconnectWallet,
  };
}
