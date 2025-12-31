# Phase 1 Testing Guide - Game Pass & Paywall System

## ✅ Integration Complete!

All components have been integrated and are ready for testing.

---

## 🧪 Testing Checklist

### Prerequisites
- [ ] Backend is running and accessible
- [ ] Smart contract is deployed (or using mock/test mode)
- [ ] Wallet is connected
- [ ] Environment variables are set:
  - `GAME_PASS_CONTRACT` (or network-specific variants)
  - `GAME_PASS_SYSTEM_OBJECT_ID` (or network-specific variants)

### Test Flow 1: Demo Mode → Purchase → Full Game

1. **Start Game Without Pass**
   - [ ] Connect wallet
   - [ ] Click "Start Game"
   - [ ] Should start in demo mode (no credit consumed)
   - [ ] Check console for "Player has no active game pass, starting in demo mode"

2. **Defeat First Boss**
   - [ ] Play until first boss appears
   - [ ] Defeat first boss
   - [ ] End Demo modal should appear
   - [ ] Modal shows score and stats
   - [ ] Modal shows "No Active Pass" message

3. **Purchase Credit Pack**
   - [ ] Click "Get Game Pass" in End Demo modal
   - [ ] Store should open with Game Pass tab active
   - [ ] See 4 credit pack options (Starter, Regular, Value, Mega)
   - [ ] See pay-per-game option
   - [ ] Select a pack (e.g., Starter - $1.00)
   - [ ] Click "Purchase"
   - [ ] Transaction should be built
   - [ ] Sign transaction in wallet
   - [ ] Purchase should complete
   - [ ] Alert should show success message
   - [ ] Credits should update in store

4. **Continue Playing**
   - [ ] Close store
   - [ ] Click "Continue Playing" in End Demo modal (if still open)
   - [ ] OR start a new game
   - [ ] Credit should be consumed automatically
   - [ ] Game should start in full mode (not demo)
   - [ ] Check console for "Credit consumed successfully"

5. **Verify Credit Display**
   - [ ] Return to main menu
   - [ ] Credit display should show updated credits
   - [ ] Start another game
   - [ ] Another credit should be consumed
   - [ ] Credits should decrease

### Test Flow 2: Direct Purchase from Menu

1. **Open Store from Menu**
   - [ ] Connect wallet
   - [ ] Click "Store" in main menu
   - [ ] Store should open with Items tab active
   - [ ] Click "Game Pass" tab
   - [ ] Game Pass tab should load
   - [ ] Current credits should be displayed (if any)

2. **Purchase Credit Pack**
   - [ ] Select a pack
   - [ ] Click "Purchase"
   - [ ] Complete transaction
   - [ ] Credits should update
   - [ ] Credit display in menu should refresh

3. **Purchase Single Game**
   - [ ] Click "Purchase Game" in pay-per-game section
   - [ ] Complete transaction
   - [ ] Should get 1 credit
   - [ ] Credits should update

### Test Flow 3: Badge Discount

1. **Check Badge Discount**
   - [ ] Ensure player has a badge (tier 1+)
   - [ ] Open store → Game Pass tab
   - [ ] Prices should show original and discounted prices
   - [ ] Discount badge should appear on packs
   - [ ] Discount percentage should match badge tier

2. **Purchase with Discount**
   - [ ] Purchase a pack with discount
   - [ ] Transaction should use discounted price
   - [ ] Verify discount was applied correctly

### Test Flow 4: Credit Consumption

1. **Start Game with Active Pass**
   - [ ] Ensure player has credits
   - [ ] Click "Start Game"
   - [ ] Credit should be consumed immediately
   - [ ] Check console for consumption transaction digest
   - [ ] Game should start in full mode
   - [ ] Credits should decrease by 1

2. **Start Game Without Credits**
   - [ ] Use all credits
   - [ ] Click "Start Game"
   - [ ] Should start in demo mode
   - [ ] No credit should be consumed

### Test Flow 5: Error Handling

1. **Network Errors**
   - [ ] Disconnect internet
   - [ ] Try to purchase pack
   - [ ] Should show error message
   - [ ] Should not break UI

2. **Transaction Failures**
   - [ ] Try to purchase with insufficient balance
   - [ ] Should show error message
   - [ ] Should allow retry

3. **Service Unavailable**
   - [ ] Stop backend
   - [ ] Try to check game pass status
   - [ ] Should handle gracefully
   - [ ] Should fall back to demo mode

---

## 🔍 Debugging Tips

### Check Console Logs

Look for these log messages:
- `[GAME SERVICE] Player has no active game pass, starting in demo mode`
- `[GAME SERVICE] Player has active game pass, consuming credit`
- `[GAME PASS SERVICE] Game pass status retrieved`
- `[GAME PASS SERVICE] Credit pack purchase transaction built`
- `[GAME PASS SERVICE] Game credit consumed`

### Common Issues

1. **Credits not showing**
   - Check if `GamePassDisplay.refresh()` is being called
   - Check if wallet address is correct
   - Check backend API response

2. **Purchase not working**
   - Check wallet connection
   - Check token balance
   - Check backend API is accessible
   - Check transaction signing

3. **End Demo modal not showing**
   - Check if `game.isDemoMode` is set correctly
   - Check if `bossesDefeated === 1`
   - Check if `EndDemoModal` is initialized

4. **Store tab not switching**
   - Check if `switchStoreTab()` function exists
   - Check if tab elements exist in DOM
   - Check console for errors

---

## 📊 Expected Behavior

### Demo Mode
- Free to play up to first boss
- Scores are NOT saved
- No credit consumed
- End Demo modal appears after first boss

### Full Game Mode
- Credit consumed on game start
- Scores ARE saved
- Can play unlimited (until credits run out)
- No End Demo modal

### Credit Display
- Shows in main menu footer (if active pass)
- Updates after purchase
- Updates after consumption
- Hidden when no active pass

### Store Integration
- Two tabs: Items and Game Pass
- Game Pass tab shows packs and pay-per-game
- Badge discount applied automatically
- Current credits displayed

---

## 🎯 Success Criteria

✅ All test flows pass  
✅ No console errors  
✅ Credits update correctly  
✅ Purchases complete successfully  
✅ Credit consumption works  
✅ Demo mode works correctly  
✅ End Demo modal appears  
✅ Store tabs work  
✅ Badge discounts apply  

---

## 🐛 Known Issues / Limitations

- CSS may need adjustment for mobile devices
- Transaction signing may vary by wallet
- Backend must be running for full functionality
- Smart contract must be deployed for production

---

## 📝 Next Steps After Testing

1. Fix any bugs found
2. Adjust CSS for better mobile experience
3. Add more error handling if needed
4. Optimize API calls if performance issues
5. Add analytics tracking
6. Prepare for production deployment

