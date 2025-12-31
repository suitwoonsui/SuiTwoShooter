# Tournament Creation UI Implementation

## Overview

The tournament creation UI is a multi-step wizard that allows users to create custom tournaments with payment. It includes reward configuration, cost calculation, and payment processing.

## Files Created

### Frontend
1. **`src/game/systems/ui/tournament-creation-modal.js`**
   - Main tournament creation modal component
   - Multi-step wizard implementation
   - Reward configuration UI
   - Payment integration

2. **`src/game/rendering/ui/tournament-creation-modal.css`**
   - Styling for tournament creation modal
   - Responsive design
   - Progress bar styling
   - Step-specific styles

### Backend
3. **`backend/lib/services/batch-reward-distribution.ts`**
   - Batch transaction service for reward distribution
   - Combines multiple token mints and item distributions
   - Efficient gas usage

## Integration

### Adding to Main Menu

Add a button to open the tournament creation modal:

```javascript
// In your main menu or tournament modal
<button onclick="showTournamentCreation()">Create Tournament</button>
```

### Loading the Module

Make sure the tournament creation modal is loaded:

```html
<script src="src/game/systems/ui/tournament-creation-modal.js"></script>
<link rel="stylesheet" href="src/game/rendering/ui/tournament-creation-modal.css">
```

## Wizard Steps

1. **Step 1: Tournament Name**
   - Text input for tournament name
   - Max 100 characters
   - Validation on next step

2. **Step 2: Category**
   - Visual category selection
   - 6 categories available
   - Icon-based selection cards

3. **Step 3: Schedule**
   - Start time picker
   - End time picker
   - Validation: end > start, start in future

4. **Step 4: Entry Fee**
   - Number input for tournament tickets
   - Minimum 1 ticket

5. **Step 5: Rewards**
   - Choice: Default or Custom
   - Custom rewards configuration:
     - Reward depth (how many get items)
     - Pool depth (how many get tokens)
     - Pool distribution percentages
     - Item rewards per rank
   - Real-time cost calculation

6. **Step 6: Starting Ante**
   - Optional prize pool contribution
   - USD amount input

7. **Step 7: Review & Payment**
   - Summary of all settings
   - Payment breakdown
   - Payment method selection (SUI, MEWS, USDC)
   - Final payment and creation

## Features

### Real-Time Cost Calculation
- Fetches badge discount on load
- Calculates reward cost as user configures
- Shows cost breakdown (base, special items, level 2+)
- Applies discounts (25% base + badge discount)

### Payment Integration
- Uses existing wallet connection
- Signs transaction with user's wallet
- Shows success message on completion
- Error handling with user-friendly messages

### Batch Transaction Support
- Backend service batches multiple reward distributions
- Combines token mints and item distributions
- More efficient gas usage
- Falls back to individual distribution if batch fails

## API Integration

### Calculate Reward Cost
```javascript
POST /api/tournaments/calculate-reward-cost
Body: {
  rewardConfig: TournamentRewardConfig | null,
  playerAddress: string,
  badgeDiscount?: number
}
Response: {
  success: boolean,
  cost: {
    baseCost: number,
    specialItemCost: number,
    level2PlusCost: number,
    totalCost: number,
    discountApplied: number,
    badgeDiscountApplied: number
  }
}
```

### Create Tournament
```javascript
POST /api/tournaments/create
Body: {
  name: string,
  category: string,
  startTime: number,
  endTime: number,
  entryFeeTickets: number,
  rewardConfig?: TournamentRewardConfig | null,
  startingAnteUSDCents: number,
  paymentToken: 'SUI' | 'MEWS' | 'USDC',
  playerAddress: string,
  badgeDiscount?: number
}
Response: {
  success: boolean,
  transaction: string, // Base64 encoded
  gasEstimate: string,
  payment: { ... },
  cost: { ... }
}
```

## Usage Example

```javascript
// Open tournament creation modal
showTournamentCreation();

// Or use the exported object
window.TournamentCreationModal.show();
```

## Styling Customization

The CSS file uses CSS variables that can be customized:

- Background colors: `#1a1a2e`, `#0f1419`, `#16213e`
- Accent colors: `#0f3460`, `#4CAF50`
- Text colors: `#fff`, `#aaa`, `#666`

Modify these in the CSS file to match your theme.

## Future Enhancements

1. **Item Selector Modal**: Replace prompt() with a proper modal for item selection
2. **Pool Distribution Sliders**: Visual sliders instead of number inputs
3. **Preview Mode**: Preview tournament before payment
4. **Save Draft**: Save tournament configuration as draft
5. **Templates**: Pre-configured tournament templates
6. **Advanced Pool Configuration**: More pool source options

## Testing Checklist

- [ ] Wallet connection required
- [ ] All steps validate correctly
- [ ] Default rewards work (no payment)
- [ ] Custom rewards calculate cost correctly
- [ ] Badge discount applied correctly
- [ ] Payment transaction signs successfully
- [ ] Success message displays
- [ ] Error messages are user-friendly
- [ ] Responsive on mobile devices
- [ ] Progress bar updates correctly

## Known Limitations

1. **Item Selector**: Currently uses `prompt()` - should be replaced with modal
2. **Pool Distribution**: Manual percentage input - could use sliders
3. **Error Recovery**: Limited error recovery in wizard
4. **Draft Saving**: No draft saving functionality

## Support

For issues or questions, refer to:
- `TOURNAMENT_CREATION_USER_FLOW.md` - Detailed user flow
- `TOURNAMENT_REWARD_PAYMENT_DESIGN.md` - Payment design
- `TOURNAMENT_CREATOR_REWARD_DESIGN.md` - Creator rewards







