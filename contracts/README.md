# Smart Contracts Directory

This directory contains Move smart contracts for the SuiTwo game.

## Structure

```
contracts/
├── suitwo_game/          # Main game score submission contract
│   ├── sources/
│   │   └── game.move    # Score submission contract
│   ├── Move.toml        # Package configuration
│   └── README.md        # Contract-specific documentation
└── README.md            # This file
```

## Contracts

### `suitwo_game`
- **Purpose**: Game score submission with anti-cheat validation
- **Status**: Ready for testnet deployment
- **Documentation**: See `suitwo_game/README.md`

## Development Workflow

1. **Install Sui CLI** (see `suitwo_game/README.md`)
2. **Navigate to contract directory**
3. **Build**: `sui move build`
4. **Test**: `sui move test` (if tests exist)
5. **Deploy**: `sui client publish --gas-budget 10000000`
6. **Update backend config** with package ID

## Documentation

- [Smart Contract Design](../../docs/sui-integration/05-smart-contracts.md)
- [Testing & Deployment](../../docs/sui-integration/06-testing-deployment.md)
- [Security Considerations](../../docs/sui-integration/08-security-considerations.md)

## Next Contracts (Future)

- `token_burn` - Performance-based token burning
- `subscription` - Monthly subscription management

