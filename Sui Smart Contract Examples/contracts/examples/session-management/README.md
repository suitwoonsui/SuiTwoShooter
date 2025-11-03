# Activity Management Smart Contract

## Overview
The `ActivityManager.move` contract demonstrates **activity management patterns** in Sui Move, showing how to create, validate, and manage user activities with rate limiting mechanisms.

## 🎯 Learning Objectives
- **Activity Lifecycle Management**: Creating and tracking user activities
- **Rate Limiting Validation**: Implementing realistic constraints and rate limiting
- **Time-Based Logic**: Using Sui's Clock object for time validation
- **Cross-Contract Integration**: Interacting with other smart contracts
- **Event Emission**: Creating transparent, auditable events

## 📋 Key Concepts Demonstrated

### 1. **Activity Creation**
```move
public fun start_activity(
    clock: &Clock,
    ctx: &mut sui::tx_context::TxContext
)
```
- Creates a new `UserActivity` object for each user
- Uses Sui's Clock object for accurate timestamps
- Transfers activity ownership to the user
- Emits events for transparency

### 2. **Rate Limiting Mechanisms**
```move
// Rate limiting: max 3 actions per second
let max_allowed_value = activity.max_value_per_second * (activity_duration / 1000);
```
- **Rate Limiting**: Prevents unrealistic action rates
- **Duration Validation**: Ensures minimum activity time
- **Ownership Checks**: Only activity owner can submit values
- **Status Validation**: Prevents actions on completed activities

### 3. **Activity Completion**
```move
public fun complete_activity(
    activity: &mut UserActivity,
    analytics_system: &mut AnalyticsSystem,
    clock: &Clock,
    ctx: &mut sui::tx_context::TxContext
)
```
- Updates activity status to completed
- Integrates with analytics system
- Emits completion events
- Calculates final activity duration

## 🏗️ Contract Architecture

### **Core Structs**
- `UserActivity`: Represents an active user activity
- `ActivityStarted`: Event emitted when activity begins
- `ActivityCompleted`: Event emitted when activity ends
- `ValueSubmitted`: Event emitted for each value submission

### **Key Functions**
- `start_activity()`: Initialize new user activity
- `submit_value()`: Validate and record user actions
- `complete_activity()`: Finalize activity and update analytics
- `get_activity_info()`: Query activity details
- `is_activity_active()`: Check activity status

## 🔒 Security Features

### **Rate Limiting Mechanisms**
1. **Rate Limiting**: Maximum 3 actions per second
2. **Duration Validation**: Minimum 5-second activities
3. **Ownership Verification**: Only activity owner can interact
4. **Status Checks**: Prevents actions on completed activities

### **Event Transparency**
- All actions emit events for audit trails
- Activity lifecycle is fully trackable
- Value submissions are publicly verifiable

## 📊 Integration Points

### **Analytics System**
- Updates user analytics on activity completion
- Tracks personal bests and averages
- Calculates user tiers based on performance

### **Clock Integration**
- Uses Sui's Clock object for accurate timestamps
- Prevents timestamp manipulation
- Ensures consistent time validation

## 🚀 Usage Examples

### **Starting an Activity**
```move
let activity = activity_management::start_activity(clock, ctx);
```

### **Submitting a Value**
```move
activity_management::submit_value(
    &mut activity,
    &mut analytics_system,
    value,
    category,
    clock,
    ctx
);
```

### **Completing an Activity**
```move
activity_management::complete_activity(
    &mut activity,
    &mut analytics_system,
    clock,
    ctx
);
```

## 🎓 Educational Value

This contract teaches:
- **Activity Management**: How to create and manage user activities
- **Rate Limiting Design**: Implementing realistic constraints
- **Cross-Contract Communication**: Integrating with other systems
- **Event-Driven Architecture**: Using events for transparency
- **Time-Based Logic**: Working with blockchain timestamps

## 🔧 Customization Ideas

- **Different Rate Limits**: Adjust `MAX_ACTIONS_PER_SECOND`
- **Activity Types**: Add different activity categories
- **Reward Systems**: Integrate with token rewards
- **Team Activities**: Support multi-user activities
- **Competition Mode**: Add competitive activity features

## 📚 Related Contracts

- **Analytics System**: Tracks user performance data
- **System Controls**: Manages system parameters
- **Subscription System**: Handles premium activity access

This contract serves as a foundation for any application requiring activity management, user validation, and rate limiting mechanisms.