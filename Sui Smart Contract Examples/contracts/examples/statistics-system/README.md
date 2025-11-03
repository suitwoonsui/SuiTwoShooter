# Analytics System Smart Contract

## Overview
The `AnalyticsSystem.move` contract demonstrates **user analytics and data tracking** in Sui Move, showing how to collect, store, and analyze user performance data with tier classification.

## 🎯 Learning Objectives
- **Data Collection**: Gathering and storing user performance metrics
- **Analytics Processing**: Calculating averages, bests, and trends
- **Tier Classification System**: Implementing progressive user classification
- **Table Management**: Using Sui's Table for efficient data storage
- **Event-Driven Updates**: Real-time analytics updates

## 📋 Key Concepts Demonstrated

### 1. **User Analytics Tracking**
```move
public struct UserAnalytics has key, store {
    id: sui::object::UID,
    user: address,
    total_activities: u64,
    best_value: u64,
    best_category: u8,
    average_value: u64,
    current_tier: u8
}
```
- **Comprehensive Metrics**: Tracks activities, values, categories, and actions
- **Personal Bests**: Records highest achievements
- **Averages**: Calculates performance trends
- **Tier Classification**: Progressive user classification

### 2. **Dynamic Analytics Updates**
```move
public fun update_user_analytics(
    system: &mut AnalyticsSystem,
    user: address,
    value: u64,
    category: u8,
    duration: u64,
    actions_count: u64,
    ctx: &mut sui::tx_context::TxContext
)
```
- **Real-Time Updates**: Analytics update immediately
- **Incremental Calculations**: Efficient average computation
- **Tier Recalculation**: Automatic tier updates
- **Event Emission**: Transparent analytics changes

### 3. **Tier Classification System**
```move
fun calculate_user_tier(value: u64, category: u8): u8 {
    if (value >= 1000 && category >= 10) {
        USER_TIER_ENTERPRISE
    } else if (value >= 500 && category >= 7) {
        USER_TIER_PROFESSIONAL
    } // ... more tiers
}
```
- **Progressive Tiers**: Basic → Standard → Premium → Professional → Enterprise
- **Multi-Criteria**: Based on both value and category achievements
- **Automatic Updates**: Tiers recalculate with new data

## 🏗️ Contract Architecture

### **Core Structs**
- `UserAnalytics`: Individual user performance data
- `AnalyticsSystem`: Global analytics management
- `UserAnalyticsUpdated`: Event for analytics changes
- `SystemPaused/Resumed`: Admin control events

### **Key Functions**
- `update_user_analytics()`: Process new user data
- `get_user_analytics()`: Query user analytics
- `get_user_tier()`: Get current tier classification
- `pause_system()`: Admin control functions
- `resume_system()`: Admin control functions

## 📊 Analytics Tracked

### **Activity Metrics**
- **Total Activities**: Number of completed activities
- **Best Value**: Highest single activity value
- **Best Category**: Highest category achieved
- **Best Duration**: Longest activity time

### **Performance Averages**
- **Average Value**: Mean value across all activities
- **Average Category**: Mean category achieved
- **Average Duration**: Mean activity length
- **Total Actions**: Cumulative action count

### **Tier Classification**
- **Basic**: New users starting out
- **Standard**: Developing skills
- **Premium**: Skilled users
- **Professional**: Highly skilled users
- **Enterprise**: Top-tier performers

## 🔒 Security Features

### **Access Control**
- **Admin Functions**: Only authorized contracts can update analytics
- **Pause/Resume**: System can be temporarily disabled
- **Authorization Management**: Contract whitelist system

### **Data Integrity**
- **Validation**: Ensures data consistency
- **Event Logging**: All changes are auditable
- **Immutable History**: Analytics cannot be retroactively changed

## 🚀 Usage Examples

### **Updating User Analytics**
```move
analytics_system::update_user_analytics(
    &mut system,
    user_address,
    value,
    category,
    duration,
    actions_count,
    ctx
);
```

### **Querying User Data**
```move
let user_analytics = analytics_system::get_user_analytics(&system, user_address);
let user_tier = analytics_system::get_user_tier(&system, user_address);
```

### **Admin Controls**
```move
analytics_system::pause_system(&mut system, admin_address);
analytics_system::resume_system(&mut system, admin_address);
```

## 🎓 Educational Value

This contract teaches:
- **Data Management**: Efficient storage and retrieval patterns
- **Analytics Design**: Calculating meaningful metrics
- **User Classification**: Implementing tier-based systems
- **Admin Controls**: Managing system operations
- **Event Architecture**: Transparent data updates

## 🔧 Customization Ideas

- **Custom Metrics**: Add new performance indicators
- **Time-Based Analysis**: Track performance over time
- **Comparative Rankings**: Add leaderboard functionality
- **Achievement System**: Implement milestone rewards
- **Team Analytics**: Support group performance tracking

## 📈 Analytics Features

### **Performance Trends**
- Track improvement over time
- Identify peak performance periods
- Analyze activity patterns

### **Tier Progression**
- Monitor tier advancement
- Set tier-based rewards
- Create progression milestones

### **Comparative Analysis**
- Compare user performance
- Identify top performers
- Create competitive elements

## 📚 Related Contracts

- **Activity Management**: Provides activity data
- **System Controls**: Manages system parameters
- **Subscription System**: Handles premium features

This contract serves as a foundation for any application requiring user analytics, performance tracking, and tier-based classification systems.