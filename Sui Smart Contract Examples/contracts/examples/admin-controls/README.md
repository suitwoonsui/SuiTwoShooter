# System Controls Smart Contract

## Overview
The `SystemControls.move` contract demonstrates **system configuration and administrative controls** in Sui Move, showing how to manage system parameters, implement admin capabilities, and provide centralized configuration management.

## 🎯 Learning Objectives
- **Configuration Management**: Centralized system configuration
- **Admin Capabilities**: Secure administrative access control
- **Event Logging**: Transparent admin action tracking
- **System Updates**: Dynamic parameter modification
- **Access Control**: Capability-based admin functions

## 📋 Key Concepts Demonstrated

### 1. **System Configuration**
```move
public struct SystemConfiguration has key, store {
    id: sui::object::UID,
    base_reward_amount: u64,
    value_bonus_multiplier: u64,
    daily_activity_bonus: u64,
    weekly_streak_bonus: u64,
    special_reward_amount: u64,
    last_updated: u64
}
```
- **Centralized Config**: All system parameters in one place
- **Version Tracking**: Timestamps for parameter updates
- **Flexible Structure**: Easy to add new parameters
- **Immutable History**: Parameter changes are logged

### 2. **Admin Capability System**
```move
public struct AdminCapability has key, store {
    id: sui::object::UID
}
```
- **Capability-Based Access**: Only capability holders can admin
- **Transferable**: Admin rights can be transferred
- **Secure**: Prevents unauthorized parameter changes
- **Single Source**: One capability per system

### 3. **Configuration Update Functions**
```move
public fun update_configuration(
    system: &mut SystemControls,
    base_reward_amount: u64,
    value_bonus_multiplier: u64,
    daily_activity_bonus: u64,
    weekly_streak_bonus: u64,
    special_reward_amount: u64,
    _admin_cap: &AdminCapability,
    ctx: &mut sui::tx_context::TxContext
)
```
- **Bulk Updates**: Change multiple parameters at once
- **Individual Updates**: Modify specific parameters
- **Event Logging**: All changes are tracked
- **Timestamp Updates**: Automatic update time recording

## 🏗️ Contract Architecture

### **Core Structs**
- `SystemConfiguration`: System configuration data
- `AdminCapability`: Admin access token
- `SystemControls`: Main admin management system
- `ConfigurationUpdated`: Parameter change event
- `AdminAction`: Admin action event

### **Key Functions**
- `update_configuration()`: Bulk parameter updates
- `update_base_reward()`: Individual parameter updates
- `get_configuration()`: Query current parameters
- `calculate_total_reward()`: Utility calculations

## 🔧 Configuration Management

### **Reward System Parameters**
- **Base Reward**: Base amount for all activities
- **Value Multiplier**: Bonus multiplier for values
- **Daily Bonus**: Additional reward for daily activity
- **Weekly Bonus**: Additional reward for weekly streaks
- **Special Reward**: Special reward for special activities

### **Update Mechanisms**
- **Bulk Updates**: Change all parameters at once
- **Individual Updates**: Modify specific parameters
- **Validation**: Ensure parameter values are valid
- **Event Emission**: Log all parameter changes

## 🔒 Security Features

### **Capability-Based Access**
- **Admin Capability**: Required for all admin functions
- **Transferable**: Admin rights can be transferred
- **Single Source**: One capability per system
- **Secure**: Prevents unauthorized access

### **Event Transparency**
- **Action Logging**: All admin actions are logged
- **Parameter Tracking**: Parameter changes are recorded
- **Audit Trail**: Complete history of changes
- **Public Events**: All changes are publicly visible

### **Validation**
- **Parameter Bounds**: Ensure parameters are within valid ranges
- **Update Timestamps**: Track when parameters were changed
- **Admin Verification**: Verify admin capability ownership

## 🚀 Usage Examples

### **Updating All Parameters**
```move
system_controls::update_configuration(
    &mut system,
    100,    // base_reward_amount
    2,      // value_bonus_multiplier
    50,     // daily_activity_bonus
    200,    // weekly_streak_bonus
    500,    // special_reward_amount
    &admin_cap,
    ctx
);
```

### **Updating Individual Parameters**
```move
system_controls::update_base_reward(
    &mut system,
    150,    // new_amount
    &admin_cap,
    ctx
);
```

### **Querying Parameters**
```move
let config = system_controls::get_configuration(&system);
let base_reward = system_controls::get_base_reward_amount(&system);
```

### **Calculating Rewards**
```move
let total_reward = system_controls::calculate_total_reward(
    &system,
    base_value,
    has_daily_bonus,
    has_weekly_bonus,
    is_special
);
```

## 🎓 Educational Value

This contract teaches:
- **Configuration Management**: Centralized configuration systems
- **Admin Capabilities**: Secure administrative access
- **Event Logging**: Transparent action tracking
- **System Updates**: Dynamic parameter modification
- **Access Control**: Capability-based security

## 🔧 Customization Ideas

- **Custom Parameters**: Add new system parameters
- **Parameter Validation**: Add bounds checking
- **Multi-Admin**: Support multiple admin capabilities
- **Parameter History**: Track parameter change history
- **Conditional Updates**: Add update conditions

## 📊 Admin Features

### **Parameter Monitoring**
- Track parameter changes over time
- Monitor system configuration
- Analyze parameter impact

### **Action Logging**
- Log all admin actions
- Track parameter modifications
- Monitor system updates

### **Reward Calculation**
- Calculate total rewards
- Apply bonus multipliers
- Handle special conditions

## 🎯 Use Cases

### **DeFi Applications**
- Adjust interest rates
- Modify fee structures
- Update protocol parameters

### **SaaS Platforms**
- Configure feature limits
- Adjust pricing tiers
- Update system settings

### **Service Platforms**
- Adjust service parameters
- Modify reward structures
- Update system configurations

## 📚 Related Contracts

- **Activity Management**: Uses parameters for activity rewards
- **Analytics System**: Applies parameters to analytics
- **Subscription System**: Uses parameters for subscription calculations

This contract serves as a foundation for any application requiring centralized parameter management, administrative controls, and dynamic system configuration.