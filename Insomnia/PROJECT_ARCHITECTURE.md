# 🏗️ **INSOMNIA GAME - PROJECT ARCHITECTURE**

## 📋 **OVERVIEW**

Insomnia Game is a **modern, production-ready blockchain gaming application** built with Next.js 15, TypeScript, and Sui blockchain integration. The application follows enterprise-grade architectural patterns with a focus on modularity, performance, accessibility, and security.

## 🎯 **ARCHITECTURAL PRINCIPLES**

### **1. Separation of Concerns**
- **Business Logic**: Separated into service layers
- **UI Components**: Pure React components with minimal logic
- **Data Management**: Centralized through React Context and hooks
- **Configuration**: Environment-specific and centralized

### **2. Modularity**
- **Feature-based Organization**: Each feature has its own directory
- **Reusable Components**: Shared components across features
- **Service Abstraction**: Blockchain operations abstracted into services
- **Type Safety**: Comprehensive TypeScript interfaces

### **3. Performance First**
- **Code Splitting**: Lazy loading of non-critical components
- **Web Workers**: Heavy computations off main thread
- **Optimized Bundles**: Tree shaking and vendor chunking
- **Caching Strategy**: Smart React Query implementation

### **4. Accessibility & UX**
- **WCAG 2.1 AA Compliance**: Full accessibility support
- **Mobile-First Design**: Responsive across all devices
- **PWA Support**: App-like experience on mobile
- **Performance Monitoring**: Real-time user experience tracking

## 🏛️ **HIGH-LEVEL ARCHITECTURE**

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                           │
├─────────────────────────────────────────────────────────────┤
│  Components  │  Hooks  │  Contexts  │  Utils  │  Styles   │
├─────────────────────────────────────────────────────────────┤
│                    SERVICE LAYER                            │
├─────────────────────────────────────────────────────────────┤
│  Blockchain Services  │  Game Services  │  Utility Services │
├─────────────────────────────────────────────────────────────┤
│                    BLOCKCHAIN LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  Sui Client  │  Smart Contracts  │  Wallet Integration    │
├─────────────────────────────────────────────────────────────┤
│                    BACKEND LAYER                            │
├─────────────────────────────────────────────────────────────┤
│  Express API  │  Game Owner Wallet  │  Credit Management   │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 **TECHNOLOGY STACK**

### **Frontend Framework**
- **Next.js 15**: React framework with SSR/SSG support
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **React Query**: Server state management

### **Blockchain Integration**
- **Sui Blockchain**: High-performance Layer 1 blockchain
- **@mysten/sui**: Official Sui SDK
- **@mysten/dapp-kit**: Wallet connection and transaction signing

### **State Management**
- **React Context**: Global state management
- **React Hooks**: Local state and side effects
- **React Query**: Server state and caching

### **Performance & Monitoring**
- **Web Workers**: Background processing
- **Performance API**: Real-time metrics
- **Error Boundaries**: Graceful error handling
- **Bundle Analyzer**: Build optimization

## 🎮 **GAME ARCHITECTURE**

### **Core Game Loop**
```
User Action → Game State Update → Blockchain Interaction → UI Update
     ↓              ↓                    ↓              ↓
Block Click → Score Update → Credit Consumption → Visual Feedback
```

### **State Management Flow**
```
Game Component → useGameState Hook → Blockchain Context → Services
     ↓              ↓                    ↓              ↓
Local State → Shared State → Blockchain State → Smart Contract
```

### **Performance Optimization**
- **Game Loop**: Optimized with requestAnimationFrame
- **Block Spawning**: Efficient grid management
- **Audio System**: Lazy-loaded sound effects
- **Visual Effects**: CSS-based animations

## 🔐 **SECURITY ARCHITECTURE**

### **Multi-Layer Security**
1. **Frontend Security**: Input validation, XSS protection
2. **API Security**: Rate limiting, CORS, authentication
3. **Blockchain Security**: Private key management, transaction validation
4. **Environment Security**: Secret separation, HTTPS enforcement

### **Security Features**
- **Content Security Policy**: XSS prevention
- **Input Sanitization**: Malicious code filtering
- **Rate Limiting**: Abuse prevention
- **Private Key Protection**: Backend-only storage

## 📱 **MOBILE & PWA ARCHITECTURE**

### **Progressive Web App**
- **Service Worker**: Offline functionality
- **Web App Manifest**: Native app experience
- **Responsive Design**: Mobile-first approach
- **Touch Optimization**: Haptic feedback and gestures

### **Mobile Optimizations**
- **Viewport Management**: Safe area handling
- **Touch Targets**: 44px minimum size
- **Performance**: Optimized for mobile devices
- **Orientation**: Portrait and landscape support

## 🎨 **UI COMPONENT ARCHITECTURE**

### **Component Patterns**
- **Click-Outside Detection**: Standardized pattern using `useEffect` and `useRef`
- **Modal Positioning**: Absolute positioning with calculated centering
- **Theme Integration**: CSS custom properties for dynamic theming
- **Responsive Design**: Mobile-first approach with progressive enhancement

### **Dropdown Implementation**
```typescript
// Standard click-outside pattern
const [isOpen, setIsOpen] = useState(false);
const dropdownRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  if (isOpen) {
    document.addEventListener('mousedown', handleClickOutside);
  }

  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [isOpen]);
```

### **Accessibility Features**
- **Focus Management**: Proper keyboard navigation support
- **Screen Reader**: ARIA labels and semantic HTML
- **Color Contrast**: WCAG 2.1 AA compliance
- **Touch Targets**: Mobile-optimized interaction areas

## 🚀 **DEPLOYMENT ARCHITECTURE**

### **Frontend Deployment**
- **Static Generation**: Pre-rendered pages
- **CDN Distribution**: Global asset delivery
- **Environment Configuration**: Production-ready setup
- **Performance Monitoring**: Real-time metrics

### **Backend Deployment**
- **Express Server**: Node.js backend service
- **Game Owner Wallet**: Secure blockchain operations
- **API Gateway**: Rate limiting and security
- **Health Monitoring**: Service availability tracking

## 🔄 **DATA FLOW ARCHITECTURE**

### **User Interaction Flow**
```
User Input → Component → Hook → Context → Service → Blockchain
     ↓         ↓        ↓       ↓        ↓         ↓
UI Update ← State ← Context ← Service ← Response ← Contract
```

### **Blockchain Integration Flow**
```
Game Action → Service → Sui Client → Smart Contract → Response
     ↓         ↓         ↓           ↓            ↓
UI Update ← Hook ← Context ← Service ← Transaction ← Event
```

## 📊 **PERFORMANCE ARCHITECTURE**

### **Optimization Strategies**
1. **Code Splitting**: Route-based and component-based
2. **Lazy Loading**: Non-critical feature loading
3. **Web Workers**: Background processing
4. **Caching**: Multiple layer caching strategy

### **Monitoring & Metrics**
- **Real-time FPS**: Game performance tracking
- **Memory Usage**: Memory leak detection
- **Bundle Analysis**: Build size optimization
- **Core Web Vitals**: User experience metrics

## 🔧 **DEVELOPMENT ARCHITECTURE**

### **Development Workflow**
1. **Feature Development**: Modular feature implementation
2. **Testing Strategy**: Unit, integration, and E2E tests
3. **Code Quality**: ESLint, TypeScript, and Prettier
4. **Performance Monitoring**: Development-time metrics

### **Build & Deployment**
- **Next.js Build**: Optimized production builds
- **Bundle Analysis**: Size and performance analysis
- **Environment Management**: Development and production configs
- **CI/CD Ready**: Automated deployment pipeline

## 🎯 **SCALABILITY CONSIDERATIONS**

### **Horizontal Scaling**
- **Stateless Design**: Easy horizontal scaling
- **CDN Integration**: Global content distribution
- **Database Optimization**: Efficient data queries
- **Load Balancing**: Traffic distribution

### **Performance Scaling**
- **Caching Layers**: Multiple caching strategies
- **Async Processing**: Non-blocking operations
- **Resource Optimization**: Efficient resource usage
- **Monitoring**: Performance bottleneck detection

## 🔮 **FUTURE ARCHITECTURE ROADMAP**

### **Phase 1: Enhanced Features**
- **Real-time Multiplayer**: WebSocket integration
- **Advanced Analytics**: User behavior tracking
- **A/B Testing**: Feature experimentation framework

### **Phase 2: Scalability**
- **Microservices**: Service decomposition
- **Database Optimization**: Advanced query optimization
- **CDN Enhancement**: Global performance optimization

### **Phase 3: Enterprise Features**
- **Admin Dashboard**: Game management interface
- **Advanced Security**: Multi-factor authentication
- **Compliance**: GDPR and regulatory compliance

---

*This architecture document provides a comprehensive overview of the Insomnia Game project structure, design decisions, and technical implementation details.*
