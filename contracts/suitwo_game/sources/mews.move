module suitwo_game::mews {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use std::option;
    use std::string::{Self, String};

    /// The MEWS token type (one-time witness)
    struct MEWS has drop {}

    /// Initialize the MEWS token
    /// This creates the token metadata and returns a TreasuryCap
    /// The TreasuryCap allows minting and burning of MEWS tokens
    fun init(witness: MEWS, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency<MEWS>(
            witness,
            9,  // 9 decimals (same as mainnet MEWS)
            b"MEWS",  // Symbol
            b"Mews Token",  // Name
            b"Testnet version of MEWS token for testing purposes",  // Description
            option::none(),  // Icon URL (optional)
            ctx
        );
        
        // Freeze metadata (prevents changes)
        transfer::public_freeze_object(metadata);
        
        // Transfer TreasuryCap to the deployer (allows minting)
        transfer::public_transfer(treasury, tx_context::sender(ctx));
    }

    /// Mint MEWS tokens to a recipient
    /// Requires the TreasuryCap (only deployer can mint)
    public entry fun mint(
        treasury: &mut TreasuryCap<MEWS>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(treasury, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    /// Mint MEWS tokens to the sender
    public entry fun mint_to_sender(
        treasury: &mut TreasuryCap<MEWS>,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(treasury, amount, ctx);
        transfer::public_transfer(coin, tx_context::sender(ctx));
    }

    /// Burn MEWS tokens
    /// Requires the TreasuryCap (only deployer can burn)
    public entry fun burn(
        treasury: &mut TreasuryCap<MEWS>,
        coin: Coin<MEWS>
    ) {
        coin::burn(treasury, coin);
    }
}

