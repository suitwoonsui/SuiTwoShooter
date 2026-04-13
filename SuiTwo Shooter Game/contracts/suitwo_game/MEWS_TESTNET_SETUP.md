# MEWS Testnet Token Setup Guide

## ✅ Deployment Complete

The MEWS testnet token has been successfully deployed!

## 📋 Deployment Information

### Package ID
```
0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a
```

### Token Type ID
```
0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a::mews::MEWS
```

### TreasuryCap Object ID
```
0x5f39df4a95196b95954100357d74f8405969e0cb4c3e16b1ca41bcbb8ddb7dba
```

### Transaction Digest
```
2Wfr3rUdC3mTiKGPLNyYswFHLuPdjEt7Eu2kZa22UK5D
```

### View on Sui Explorer
- **Package**: https://suiexplorer.com/object/0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a?network=testnet
- **Transaction**: https://suiexplorer.com/txblock/2Wfr3rUdC3mTiKGPLNyYswFHLuPdjEt7Eu2kZa22UK5D?network=testnet

## 🔧 Configuration

### Add to Backend `.env.local`:
```env
# MEWS Testnet Token Configuration
MEWS_TOKEN_TYPE_ID_TESTNET=0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a::mews::MEWS
MEWS_TREASURY_CAP_OBJECT_ID_TESTNET=0x5f39df4a95196b95954100357d74f8405969e0cb4c3e16b1ca41bcbb8ddb7dba
```

## 🪙 Minting Testnet MEWS Tokens

### Using the Mint Script

The `mint-mews.js` script allows you to mint MEWS tokens to any address:

```bash
# Mint 1 MEWS (1,000,000,000 raw units with 9 decimals) to your address
node mint-mews.js

# Mint to a specific address
node mint-mews.js 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Mint a specific amount (in raw units)
node mint-mews.js 0x1234... 5000000000  # 5 MEWS
```

### Amount Conversion

- **1 MEWS** = `1,000,000,000` raw units (9 decimals)
- **10 MEWS** = `10,000,000,000` raw units
- **100 MEWS** = `100,000,000,000` raw units
- **1,000 MEWS** = `1,000,000,000,000` raw units

### Example: Mint 1,000 MEWS to a test wallet
```bash
node mint-mews.js 0xYOUR_TEST_WALLET_ADDRESS 1000000000000
```

## 📝 Token Details

- **Name**: Mews Token
- **Symbol**: MEWS
- **Decimals**: 9 (same as mainnet)
- **Network**: Sui Testnet
- **Description**: Testnet version of MEWS token for testing purposes

## 🔐 Security Notes

- **TreasuryCap**: The TreasuryCap object controls minting and burning
- **Keep it secure**: Only the wallet that owns the TreasuryCap can mint tokens
- **Current owner**: The deployer wallet (address shown in deployment output)

## 🧪 Testing Checklist

- [x] Contract deployed successfully
- [x] TreasuryCap created and owned by deployer
- [x] Token metadata created and frozen
- [x] Mint function tested (1 MEWS minted successfully)
- [ ] Test minting to different addresses
- [ ] Test token transfers
- [ ] Test token balance queries
- [ ] Update backend config with token type ID
- [ ] Test premium store purchases with MEWS

## 📚 Related Files

- **Contract**: `contracts/suitwo_game/sources/mews.move`
- **Mint Script**: `contracts/suitwo_game/mint-mews.js`
- **Extract Script**: `contracts/suitwo_game/extract-treasury-cap.js`

## 🆘 Troubleshooting

### Can't find TreasuryCap?
Run the extract script with the transaction digest:
```bash
# Update extract-treasury-cap.js with your transaction digest
node extract-treasury-cap.js
```

### Minting fails?
- Check that you have the correct TreasuryCap object ID
- Verify the package ID is correct
- Ensure your wallet has enough SUI for gas fees
- Check that the TreasuryCap is owned by your wallet

### Token not showing in wallet?
- Verify the token type ID is correct
- Check that tokens were actually minted (view transaction on Sui Explorer)
- Some wallets may need the token type ID added manually

