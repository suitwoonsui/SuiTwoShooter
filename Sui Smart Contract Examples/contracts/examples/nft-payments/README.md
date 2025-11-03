# Subscription System Smart Contract

## Overview
The `SubscriptionSystem.move` contract demonstrates **subscription-based payment systems** in Sui Move, showing how to create, sell, and manage digital subscriptions with usage tracking and expiration mechanisms.

## 🎯 Learning Objectives
- **Subscription Creation**: Creating and managing digital subscriptions
- **Payment Processing**: Handling SUI token payments
- **Usage Tracking**: Monitoring subscription consumption
- **Expiration Logic**: Time-based subscription validity
- **Revenue Management**: Tracking sales and income

## 📋 Key Concepts Demonstrated

### 1. **Subscription Types and Pricing**
```move
const SUBSCRIPTION_BASIC: u8 = 1;      // 10 uses for 0.1 SUI
const SUBSCRIPTION_STANDARD: u8 = 2;   // 50 uses for 0.4 SUI
const SUBSCRIPTION_UNLIMITED: u8 = 3;  // 1 month unlimited for 1 SUI
```
- **Tiered Pricing**: Different subscription levels with varying benefits
- **Usage-Based**: Basic and Standard subscriptions have limited uses
- **Time-Based**: Unlimited subscriptions expire after duration
- **Flexible Pricing**: Easy to adjust costs and benefits

### 2. **Subscription Purchase System**
```move
public fun purchase_subscription(
    system: &mut SubscriptionSystem,
    subscription_type: u8,
    payment: Coin<SUI>,
    clock: &sui::clock::Clock,
    ctx: &mut sui::tx_context::TxContext
)
```
- **Payment Validation**: Ensures correct payment amount
- **Subscription Creation**: Generates new user subscription NFT
- **Revenue Tracking**: Updates total sales and income
- **Event Emission**: Transparent purchase logging

### 3. **Usage Management**
```move
public fun use_subscription(
    system: &mut SubscriptionSystem,
    user: address,
    clock: &sui::clock::Clock,
    ctx: &mut sui::tx_context::TxContext
): bool
```
- **Usage Validation**: Checks subscription validity and remaining uses
- **Expiration Handling**: Automatically removes expired subscriptions
- **Usage Tracking**: Decrements remaining uses
- **Return Value**: Indicates if subscription was successfully used

## 🏗️ Contract Architecture

### **Core Structs**
- `UserSubscription`: Individual user subscription NFT
- `SubscriptionSystem`: Global subscription management system
- `AdminCapability`: Admin control token
- `SubscriptionPurchased`: Purchase event
- `SubscriptionUsed`: Usage event

### **Key Functions**
- `purchase_subscription()`: Buy a new subscription
- `use_subscription()`: Consume subscription usage
- `get_user_subscription()`: Query user's current subscription
- `has_active_subscription()`: Check subscription validity
- `pause_system()`: Admin control functions

## 💰 Payment System

### **Subscription Types**
- **Basic Subscription**: 10 uses, 0.1 SUI, 30-day validity
- **Standard Subscription**: 50 uses, 0.4 SUI, 30-day validity
- **Unlimited Subscription**: Unlimited uses, 1 SUI, 30-day validity

### **Revenue Tracking**
- **Total Sales**: Count of all subscriptions sold
- **Total Revenue**: Cumulative income in SUI
- **Admin Controls**: Pause/resume system operations

## 🔒 Security Features

### **Payment Validation**
- **Amount Verification**: Ensures correct payment
- **Subscription Type Validation**: Validates subscription type selection
- **Duplicate Prevention**: Prevents multiple active subscriptions

### **Usage Protection**
- **Expiration Checks**: Validates subscription hasn't expired
- **Usage Limits**: Enforces remaining use limits
- **Ownership Verification**: Only subscription owner can use

### **Admin Controls**
- **System Pause**: Can temporarily disable purchases
- **Revenue Management**: Track and update income
- **Capability-Based**: Admin functions require capability

## 🚀 Usage Examples

### **Purchasing a Subscription**
```move
let payment = coin::from_balance(sui::balance::split(&mut user_balance, BASIC_PRICE));
subscription_system::purchase_subscription(
    &mut system,
    SUBSCRIPTION_BASIC,
    payment,
    clock,
    ctx
);
```

### **Using a Subscription**
```move
let success = subscription_system::use_subscription(
    &mut system,
    user_address,
    clock,
    ctx
);
```

### **Checking Subscription Status**
```move
let user_subscription = subscription_system::get_user_subscription(&system, user_address);
let has_subscription = subscription_system::has_active_subscription(&system, user_address, clock);
```

## 🎓 Educational Value

This contract teaches:
- **Subscription Management**: Creating and managing digital subscriptions
- **Payment Processing**: Handling cryptocurrency payments
- **Usage Tracking**: Monitoring subscription consumption
- **Time-Based Logic**: Implementing expiration systems
- **Revenue Systems**: Tracking sales and income

## 🔧 Customization Ideas

- **Custom Subscription Types**: Add new subscription categories
- **Dynamic Pricing**: Adjust prices based on demand
- **Referral System**: Add referral bonuses
- **Bulk Purchases**: Support multiple subscription purchases
- **Recurring Subscriptions**: Recurring subscription renewals

## 📊 Analytics Features

### **Sales Tracking**
- Monitor subscription sales volume
- Track revenue trends
- Analyze popular subscription types

### **Usage Analytics**
- Track subscription utilization rates
- Monitor expiration patterns
- Identify user behavior

### **Revenue Management**
- Calculate total income
- Track profit margins
- Monitor payment success rates

## 🎯 Use Cases

### **SaaS Applications**
- Feature access tiers
- Usage-based billing
- Premium subscriptions

### **Content Platforms**
- Premium content access
- Ad-free experiences
- Exclusive features

### **Service Platforms**
- Service access tiers
- Premium support
- Advanced features

## 📚 Related Contracts

- **Activity Management**: Uses subscriptions for activity access
- **Analytics System**: Tracks subscription usage analytics
- **System Controls**: Manages system parameters

This contract serves as a foundation for any application requiring subscription-based payments, usage tracking, and subscription management systems.