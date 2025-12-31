# Frontend Integration Guide - Tournament Creation

## Overview

This guide explains how to integrate the tournament creation UI into your game frontend.

## Files Added

### JavaScript
- `src/game/systems/ui/tournament-creation-modal.js` - Tournament creation wizard

### CSS
- `src/game/rendering/ui/tournament-creation-modal.css` - Tournament creation modal styles

## Integration Steps

### 1. Files Already Added to Lazy Loader

The tournament creation modal has been added to the lazy loader:
- **JavaScript**: Added to `MENU_SCRIPTS` in `src/game/systems/core/lazy-loader.js`
- **CSS**: Added to `loadSharedCSS()` in `src/game/systems/device/css-loader.js`

### 2. Create Tournament Button

A "Create Tournament" button has been added to the tournament modal (`src/game/systems/ui/tournament-modal.js`).

The button appears in the tournament actions section and calls `showTournamentCreation()` when clicked.

### 3. Testing the Integration

#### Step 1: Load the Game
1. Open `index.html` in your browser
2. Click "Enter Game" to load menu scripts
3. Click "Tournaments" to open the tournament modal

#### Step 2: Test Tournament Creation
1. Click the "Create Tournament" button (green button with ➕ icon)
2. The tournament creation wizard should open
3. Walk through all 7 steps:
   - Step 1: Enter tournament name
   - Step 2: Select category
   - Step 3: Set schedule (start/end times)
   - Step 4: Set entry fee
   - Step 5: Configure rewards (default or custom)
   - Step 6: Set starting ante (optional)
   - Step 7: Review and pay

#### Step 3: Test Payment Flow
1. Complete all steps
2. On Step 7, select payment method (SUI, MEWS, or USDC)
3. Click "Pay & Create Tournament"
4. Wallet should prompt for transaction signing
5. After signing, tournament should be created

## API Configuration

Make sure your API base URL is configured:

```javascript
// In api-config.js or similar
window.GAME_CONFIG = {
  API_BASE_URL: 'https://sui-two-shooter-backend-sui-integra.vercel.app/api',
  // ... other config
};
```

## Wallet Integration

The tournament creation modal uses the same wallet integration as the store:

- Uses `window.walletAPIInstance.signAndExecuteTransaction()` for signing
- Falls back to `WalletService.signAndExecuteTransaction()` if available
- Requires wallet connection before creating tournament

## Troubleshooting

### Issue: "Please connect your wallet"
**Solution**: Make sure wallet is connected before clicking "Create Tournament"

### Issue: Modal doesn't open
**Solution**: 
1. Check browser console for errors
2. Verify `tournament-creation-modal.js` is loaded (check Network tab)
3. Verify CSS file is loaded

### Issue: Cost calculation not working
**Solution**:
1. Check API endpoint `/api/tournaments/calculate-reward-cost` is accessible
2. Verify wallet address is available
3. Check browser console for API errors

### Issue: Transaction signing fails
**Solution**:
1. Verify wallet is connected and unlocked
2. Check wallet has sufficient balance for gas
3. Verify transaction bytes are valid (check console logs)

## Features

### Real-Time Cost Calculation
- Automatically calculates reward costs as user configures
- Shows cost breakdown (base, special items, level 2+)
- Applies discounts (25% base + badge discount)

### Badge Discount Integration
- Automatically fetches user's badge tier on modal open
- Applies badge discount to reward costs
- Shows discount percentage in cost display

### Payment Method Selection
- Supports SUI, MEWS, and USDC
- Backend handles token conversion
- User selects payment method on review step

## Next Steps

1. **Test Default Rewards**: Create tournament with default rewards (no payment)
2. **Test Custom Rewards**: Create tournament with custom rewards (payment required)
3. **Test Payment**: Complete full payment flow with real wallet
4. **Test Error Handling**: Test with invalid inputs, network errors, etc.

## UI Customization

The CSS file can be customized to match your theme:

```css
/* Main colors */
.tournament-creation-content {
  background: #1a1a2e; /* Change to your background */
  border-color: #16213e; /* Change to your border */
}

/* Accent colors */
.tournament-creation-btn.primary {
  background: #0f3460; /* Change to your primary */
}

.progress-step.active .progress-step-number {
  background: #0f3460; /* Change to your accent */
}
```

## Support

For issues or questions:
- Check browser console for errors
- Verify API endpoints are accessible
- Check network tab for failed requests
- Review `TOURNAMENT_CREATION_UI_IMPLEMENTATION.md` for detailed documentation







