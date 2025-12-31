// ==========================================
// Balance Checker - Reusable balance validation utility
// ==========================================
// Provides balance checking functionality for any transaction that requires gas
// Can be used by badges, store, score submission, or any other service

import { SuiClient } from '@mysten/sui/client';
import { BadgeError, BadgeErrorCode } from './badge-errors';
import { BadgeLogger } from './badge-logger';

export interface BalanceCheckOptions {
  /** Sui client to use for balance query */
  client: SuiClient;
  /** Wallet address to check balance for */
  walletAddress: string;
  /** Required gas budget for the transaction */
  gasBudget: number;
  /** Additional buffer amount (default: 100_000_000 = 0.1 SUI) */
  buffer?: number;
  /** Context for logging (e.g., 'mint badge', 'upgrade badge') */
  context?: string;
}

export interface BalanceCheckResult {
  /** Whether the wallet has sufficient balance */
  hasSufficientBalance: boolean;
  /** Current balance in SUI */
  currentBalance: string;
  /** Required balance in SUI */
  requiredBalance: string;
  /** Error message if balance is insufficient */
  error?: string;
}

/**
 * Check if wallet has sufficient balance for a transaction
 * 
 * @param options - Balance check options
 * @returns Balance check result
 * @throws BadgeError with INSUFFICIENT_BALANCE if balance is insufficient
 */
export async function checkBalanceBeforeTransaction(
  options: BalanceCheckOptions
): Promise<BalanceCheckResult> {
  const {
    client,
    walletAddress,
    gasBudget,
    buffer = 100_000_000, // Default 0.1 SUI buffer
    context = 'transaction',
  } = options;

  // Get current balance
  const balance = await client.getBalance({ owner: walletAddress });
  const balanceInSUI = BigInt(balance.totalBalance) / BigInt(1_000_000_000);
  const requiredBalance = BigInt(gasBudget) + BigInt(buffer);
  const requiredBalanceInSUI = Number(requiredBalance) / 1_000_000_000;

  BadgeLogger.debug('Balance check', {
    context,
    walletAddress,
    currentBalance: balanceInSUI.toString(),
    requiredBalance: requiredBalanceInSUI.toFixed(4),
    gasBudget,
    buffer,
  });

  const result: BalanceCheckResult = {
    hasSufficientBalance: BigInt(balance.totalBalance) >= requiredBalance,
    currentBalance: balanceInSUI.toString(),
    requiredBalance: requiredBalanceInSUI.toFixed(4),
  };

  if (!result.hasSufficientBalance) {
    const errorMessage = `Insufficient wallet balance. Need ${result.requiredBalance} SUI, have ${result.currentBalance} SUI`;
    result.error = errorMessage;
    
    BadgeLogger.warn('Insufficient balance detected', {
      context,
      walletAddress,
      currentBalance: result.currentBalance,
      requiredBalance: result.requiredBalance,
    });

    throw new BadgeError(
      BadgeErrorCode.INSUFFICIENT_BALANCE,
      errorMessage
    );
  }

  return result;
}

/**
 * Check balance without throwing (returns result object)
 * Useful when you want to handle insufficient balance gracefully
 * 
 * @param options - Balance check options
 * @returns Balance check result (never throws)
 */
export async function checkBalance(
  options: BalanceCheckOptions
): Promise<BalanceCheckResult> {
  try {
    return await checkBalanceBeforeTransaction(options);
  } catch (error) {
    if (error instanceof BadgeError && error.code === BadgeErrorCode.INSUFFICIENT_BALANCE) {
      return {
        hasSufficientBalance: false,
        currentBalance: '',
        requiredBalance: '',
        error: error.message,
      };
    }
    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Check player balance for a transaction that requires gas + payment
 * Used for player-signed transactions like mint badge, upgrade badge
 * 
 * @param options - Balance check options with payment amount
 * @returns Balance check result
 * @throws BadgeError with INSUFFICIENT_BALANCE if balance is insufficient
 */
export async function checkPlayerBalanceForTransaction(
  options: BalanceCheckOptions & {
    /** Payment amount in MIST (e.g., 100_000_000 = 0.1 SUI) */
    paymentAmount?: number;
  }
): Promise<BalanceCheckResult> {
  const {
    client,
    walletAddress,
    gasBudget,
    paymentAmount = 0,
    buffer = 100_000_000, // Default 0.1 SUI buffer
    context = 'player transaction',
  } = options;

  // Get current SUI balance
  const balance = await client.getBalance({ owner: walletAddress });
  const balanceInSUI = BigInt(balance.totalBalance) / BigInt(1_000_000_000);
  
  // Required balance = gas + payment + buffer
  const requiredBalance = BigInt(gasBudget) + BigInt(paymentAmount) + BigInt(buffer);
  const requiredBalanceInSUI = Number(requiredBalance) / 1_000_000_000;

  BadgeLogger.debug('Player balance check', {
    context,
    walletAddress,
    currentBalance: balanceInSUI.toString(),
    requiredBalance: requiredBalanceInSUI.toFixed(4),
    gasBudget,
    paymentAmount,
    buffer,
  });

  const result: BalanceCheckResult = {
    hasSufficientBalance: BigInt(balance.totalBalance) >= requiredBalance,
    currentBalance: balanceInSUI.toString(),
    requiredBalance: requiredBalanceInSUI.toFixed(4),
  };

  if (!result.hasSufficientBalance) {
    const errorMessage = `Insufficient wallet balance. Need ${result.requiredBalance} SUI (${(gasBudget / 1_000_000_000).toFixed(4)} gas + ${(paymentAmount / 1_000_000_000).toFixed(4)} payment), have ${result.currentBalance} SUI`;
    result.error = errorMessage;
    
    BadgeLogger.warn('Insufficient player balance detected', {
      context,
      walletAddress,
      currentBalance: result.currentBalance,
      requiredBalance: result.requiredBalance,
      gasBudget,
      paymentAmount,
    });

    throw new BadgeError(
      BadgeErrorCode.INSUFFICIENT_BALANCE,
      errorMessage
    );
  }

  return result;
}

/**
 * Check player token balance for a purchase transaction
 * Used for store purchases that require payment token + gas
 * 
 * @param options - Balance check options with token type and amount
 * @returns Balance check result
 * @throws BadgeError with INSUFFICIENT_BALANCE if balance is insufficient
 */
export async function checkPlayerTokenBalanceForPurchase(
  options: BalanceCheckOptions & {
    /** Payment token type ID (for MEWS/USDC) or 'SUI' for native SUI */
    paymentTokenType: string;
    /** Required payment amount in MIST (for token) or smallest unit */
    paymentAmount: string;
    /** Token decimals (default: 6 for MEWS/USDC, 9 for SUI) */
    tokenDecimals?: number;
  }
): Promise<BalanceCheckResult & {
  tokenBalance: string;
  requiredTokenAmount: string;
}> {
  const {
    client,
    walletAddress,
    gasBudget,
    paymentTokenType,
    paymentAmount,
    tokenDecimals = 6, // Default for MEWS/USDC
    buffer = 100_000_000, // Default 0.1 SUI buffer for gas
    context = 'purchase transaction',
  } = options;

  // Check SUI balance for gas
  const suiBalance = await client.getBalance({ owner: walletAddress });
  const suiBalanceInSUI = BigInt(suiBalance.totalBalance) / BigInt(1_000_000_000);
  const requiredGas = BigInt(gasBudget) + BigInt(buffer);
  const requiredGasInSUI = Number(requiredGas) / 1_000_000_000;

  // Check token balance for payment
  let tokenBalance = BigInt(0);
  let tokenBalanceFormatted = '0';
  
  if (paymentTokenType === 'SUI') {
    // For SUI, use the same balance but need to account for gas
    tokenBalance = BigInt(suiBalance.totalBalance);
    tokenBalanceFormatted = suiBalanceInSUI.toString();
  } else {
    // For custom tokens (MEWS/USDC), use getCoins
    try {
      BadgeLogger.debug('Checking token balance', {
        walletAddress,
        paymentTokenType,
        tokenDecimals,
        context,
      });
      
      const coins = await client.getCoins({
        owner: walletAddress,
        coinType: paymentTokenType,
      });
      
      BadgeLogger.debug('Token coins query result', {
        paymentTokenType,
        coinsFound: coins.data?.length || 0,
        coinDetails: coins.data?.map(c => ({
          coinObjectId: c.coinObjectId,
          balance: c.balance,
          balanceFormatted: (Number(c.balance) / (10 ** tokenDecimals)).toFixed(tokenDecimals),
        })) || [],
      });
      
      coins.data.forEach((coin) => {
        tokenBalance += BigInt(coin.balance);
      });
      
      // Format token balance (divide by 10^decimals)
      const divisor = BigInt(10 ** tokenDecimals);
      tokenBalanceFormatted = (Number(tokenBalance / divisor)).toFixed(tokenDecimals);
      
      BadgeLogger.debug('Token balance calculated', {
        paymentTokenType,
        totalBalanceRaw: tokenBalance.toString(),
        totalBalanceFormatted: tokenBalanceFormatted,
        tokenDecimals,
      });
    } catch (error) {
      BadgeLogger.warn('Error checking token balance', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        paymentTokenType,
        walletAddress,
        context,
      });
      tokenBalance = BigInt(0);
      tokenBalanceFormatted = '0';
    }
  }

  const requiredPayment = BigInt(paymentAmount);
  const requiredPaymentFormatted = tokenDecimals === 9 
    ? (Number(requiredPayment) / 1_000_000_000).toFixed(4)
    : (Number(requiredPayment) / (10 ** tokenDecimals)).toFixed(tokenDecimals);

  BadgeLogger.debug('Player token balance check', {
    context,
    walletAddress,
    paymentTokenType,
    tokenBalance: tokenBalanceFormatted,
    requiredPayment: requiredPaymentFormatted,
    suiBalance: suiBalanceInSUI.toString(),
    requiredGas: requiredGasInSUI.toFixed(4),
  });

  // Check both gas and payment token
  const hasEnoughGas = BigInt(suiBalance.totalBalance) >= requiredGas;
  const hasEnoughToken = tokenBalance >= requiredPayment;

  if (!hasEnoughGas) {
    const errorMessage = `Insufficient SUI balance for gas. Need ${requiredGasInSUI.toFixed(4)} SUI, have ${suiBalanceInSUI.toString()} SUI`;
    BadgeLogger.warn('Insufficient gas balance', {
      context,
      walletAddress,
      currentBalance: suiBalanceInSUI.toString(),
      requiredBalance: requiredGasInSUI.toFixed(4),
    });
    throw new BadgeError(
      BadgeErrorCode.INSUFFICIENT_BALANCE,
      errorMessage
    );
  }

  if (!hasEnoughToken) {
    const errorMessage = `Insufficient ${paymentTokenType === 'SUI' ? 'SUI' : 'token'} balance for payment. Need ${requiredPaymentFormatted}, have ${tokenBalanceFormatted}`;
    BadgeLogger.warn('Insufficient payment token balance', {
      context,
      walletAddress,
      paymentTokenType,
      currentBalance: tokenBalanceFormatted,
      requiredBalance: requiredPaymentFormatted,
    });
    throw new BadgeError(
      BadgeErrorCode.INSUFFICIENT_BALANCE,
      errorMessage
    );
  }

  return {
    hasSufficientBalance: true,
    currentBalance: suiBalanceInSUI.toString(),
    requiredBalance: requiredGasInSUI.toFixed(4),
    tokenBalance: tokenBalanceFormatted,
    requiredTokenAmount: requiredPaymentFormatted,
  };
}

