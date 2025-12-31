# 🛠️ **INSOMNIA GAME - DEVELOPMENT GUIDE**

## 📋 **OVERVIEW**

This guide provides comprehensive information for developers working on the Insomnia Game project. It covers development setup, coding standards, architecture patterns, and best practices.

## 🚀 **DEVELOPMENT SETUP**

### **Prerequisites**
- **Node.js**: Version 18+ (LTS recommended)
- **npm**: Version 8+ or yarn 1.22+
- **Git**: Version 2.30+
- **Code Editor**: VS Code with recommended extensions
- **Browser**: Chrome/Edge with DevTools

### **Recommended VS Code Extensions**
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json"
  ]
}
```

### **Initial Setup**
```bash
# Clone the repository
git clone <repository-url>
cd Insomnia

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

## 🏗️ **PROJECT ARCHITECTURE**

### **Directory Structure**
```
src/
├── app/                    # Next.js App Router
├── components/             # Reusable React components
├── contexts/               # React Context providers
├── hooks/                  # Custom React hooks
├── lib/                    # Core business logic
│   ├── config/            # Configuration management
│   ├── services/          # Business logic services
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
└── styles/                 # CSS and styling
```

### **Architecture Principles**
1. **Separation of Concerns**: Business logic separated from UI components
2. **Modularity**: Feature-based organization with clear boundaries
3. **Type Safety**: Comprehensive TypeScript interfaces
4. **Performance First**: Code splitting, lazy loading, and optimization
5. **Accessibility**: WCAG 2.1 AA compliance built-in

## 📝 **CODING STANDARDS**

### **TypeScript Standards**
- **Strict Mode**: Always enabled
- **Type Definitions**: Comprehensive interfaces for all data structures
- **Generic Types**: Use generics for reusable components and functions
- **Type Exports**: Use `export type` for type-only exports

```typescript
// ✅ Good: Comprehensive type definition
interface GameState {
  isActive: boolean;
  score: number;
  timeElapsed: number;
  currentEnduranceLevel: number;
}

// ✅ Good: Generic component
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

// ❌ Avoid: Any types
const handleData = (data: any) => { /* ... */ };
```

### **React Standards**
- **Functional Components**: Use functional components with hooks
- **Props Interface**: Define props interface for every component
- **Event Handlers**: Use proper event types and handlers
- **State Management**: Use appropriate hooks for state management

```typescript
// ✅ Good: Proper component structure
interface GameGridProps {
  size: number;
  currentBlock: GameBlock | null;
  onBlockClick: (x: number, y: number) => void;
  gameActive: boolean;
}

export const GameGrid: React.FC<GameGridProps> = ({
  size,
  currentBlock,
  onBlockClick,
  gameActive,
}) => {
  // Component implementation
};
```

### **CSS and Styling Standards**
- **Tailwind CSS**: Primary styling framework
- **CSS Variables**: Use CSS custom properties for theming
- **Responsive Design**: Mobile-first approach
- **Accessibility**: Proper contrast ratios and focus indicators

```css
/* ✅ Good: CSS custom properties for theming */
:root {
  --color-background: #0f0f23;
  --color-text: #ffffff;
  --color-accent1: #6366f1;
  --color-accent2: #8b5cf6;
}

/* ✅ Good: Responsive design */
@media (max-width: 768px) {
  .game-grid {
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;
  }
}
```

## 🔧 **DEVELOPMENT WORKFLOW**

### **Feature Development Process**
1. **Create Feature Branch**: `git checkout -b feature/feature-name`
2. **Implement Feature**: Follow coding standards and patterns
3. **Add Tests**: Unit tests for business logic, integration tests for components
4. **Update Documentation**: Modify relevant documentation files
5. **Code Review**: Submit pull request for review
6. **Merge**: After approval and testing

### **File Naming Conventions**
- **Components**: `ComponentName.tsx` (PascalCase)
- **Hooks**: `useHookName.ts` (camelCase)
- **Types**: `featureName.ts` (camelCase)
- **Services**: `FeatureService.ts` (PascalCase)
- **Utils**: `featureUtils.ts` (camelCase)
- **Directories**: `feature-name` (kebab-case)

### **Import Organization**
```typescript
// 1. External libraries
import React from 'react';
import { useState, useEffect } from 'react';

// 2. Internal components
import { GameGrid } from '@/components/GameGrid';
import { GameControls } from '@/components/GameControls';

// 3. Internal hooks
import { useGameState } from '@/hooks/useGameState';
import { useGameAudio } from '@/hooks/useGameAudio';

// 4. Internal utilities
import { formatScore } from '@/lib/utils/gameUtils';

// 5. Types
import type { GameState, GameBlock } from '@/types/game';
```

## 🧪 **TESTING STRATEGY**

### **Testing Framework**
- **Jest**: Unit testing framework
- **React Testing Library**: Component testing
- **MSW**: API mocking for integration tests
- **Playwright**: End-to-end testing

### **Test Structure**
```
tests/
├── unit/                   # Unit tests for utilities and services
├── integration/            # Integration tests for components
├── e2e/                   # End-to-end tests
└── fixtures/              # Test data and mocks
```

### **Testing Standards**
- **Coverage**: Minimum 80% code coverage
- **Naming**: Descriptive test names that explain the scenario
- **Isolation**: Tests should be independent and not affect each other
- **Mocking**: Use mocks for external dependencies

```typescript
// ✅ Good: Descriptive test names
describe('GameState Hook', () => {
  it('should initialize with default values when game starts', () => {
    // Test implementation
  });

  it('should update score when block is clicked', () => {
    // Test implementation
  });
});
```

## 📊 **PERFORMANCE OPTIMIZATION**

### **Code Splitting**
- **Route-based**: Lazy load pages and routes
- **Component-based**: Lazy load non-critical components
- **Library-based**: Split vendor bundles

```typescript
// ✅ Good: Lazy loading components
const GameOverModal = lazy(() => import('./GameOverModal'));
const GamePassPurchase = lazy(() => import('./GamePassPurchase'));

// ✅ Good: Route-based splitting
const GamePage = lazy(() => import('./game/page'));
```

### **Web Workers**
- **Heavy Computations**: Move complex calculations to Web Workers
- **Game Logic**: Offload game loop calculations
- **Data Processing**: Handle large data sets in background

```typescript
// ✅ Good: Web Worker integration
const gameWorker = new Worker('/gameWorker.js');
gameWorker.postMessage({ type: 'CALCULATE_LEVEL', data: { timeElapsed } });
```

### **Caching Strategy**
- **React Query**: Server state management and caching
- **Memoization**: Use React.memo, useMemo, and useCallback
- **Bundle Caching**: Optimize asset delivery and caching

## 🔐 **SECURITY PRACTICES**

### **Input Validation**
- **Sanitization**: Always sanitize user inputs
- **Type Checking**: Validate data types and structures
- **Boundary Checks**: Check for out-of-bounds values

```typescript
// ✅ Good: Input validation
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, MAX_USERNAME_LENGTH);
};
```

### **Environment Variables**
- **Frontend**: Only expose public variables with `NEXT_PUBLIC_` prefix
- **Backend**: Keep sensitive data in backend environment variables
- **Validation**: Validate environment variables at startup

### **API Security**
- **Rate Limiting**: Implement rate limiting for API endpoints
- **CORS**: Configure CORS properly for production
- **Authentication**: Implement proper authentication for protected routes

## ♿ **ACCESSIBILITY STANDARDS**

### **WCAG 2.1 AA Compliance**
- **ARIA Labels**: Proper ARIA attributes for screen readers
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Visible focus indicators
- **Color Contrast**: Sufficient contrast ratios

```typescript
// ✅ Good: Accessibility attributes
<button
  aria-label={`Active game block at row ${y + 1}, column ${x + 1}`}
  aria-pressed={wasClicked}
  tabIndex={gameActive ? 0 : -1}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBlockClick(x, y);
    }
  }}
>
  {/* Button content */}
</button>
```

### **Screen Reader Support**
- **Semantic HTML**: Use proper HTML elements
- **Live Regions**: Announce dynamic content changes
- **Skip Links**: Provide skip navigation links

## 📱 **MOBILE DEVELOPMENT**

### **Responsive Design**
- **Mobile-First**: Design for mobile devices first
- **Touch Targets**: Minimum 44px touch targets
- **Viewport Management**: Handle safe areas and orientations
- **Performance**: Optimize for mobile performance

### **PWA Features**
- **Service Worker**: Offline functionality
- **Web App Manifest**: App-like experience
- **Installation**: Add to home screen capability

## 🚀 **DEPLOYMENT**

### **Build Process**
```bash
# Development build
npm run dev

# Production build
npm run build

# Bundle analysis
ANALYZE=true npm run build

# Start production server
npm start
```

### **Environment Configuration**
```bash
# Development
NODE_ENV=development
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Production
NODE_ENV=production
NEXT_PUBLIC_BACKEND_URL=https://api.insomnia-game.com
```

### **Deployment Platforms**
- **Vercel**: Optimal for Next.js applications
- **Netlify**: Good alternative with CDN
- **AWS/GCP/Azure**: Enterprise deployments

## 🎨 **UI COMPONENT PATTERNS**

### **Dropdown Components**
- **Click-Outside-to-Close**: Use `useEffect` with `useRef` for click-outside detection
- **Event Handling**: Listen for `mousedown` events when dropdown is open
- **Cleanup**: Always remove event listeners to prevent memory leaks

```typescript
// ✅ Good: Click-outside implementation
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

### **Modal Components**
- **Positioning**: Use absolute positioning with `transform: translate(-50%, -50%)` for perfect centering
- **Backdrop**: Implement click-outside-to-close with proper event propagation control
- **Z-Index Management**: Ensure proper layering with appropriate z-index values

### **Theme Integration**
- **CSS Variables**: Use `var(--color-*)` for all theme-dependent colors
- **Dynamic Effects**: Apply theme colors to shadows, borders, and backgrounds
- **Consistent Transitions**: Maintain smooth animations across theme changes

## 🐛 **DEBUGGING AND TROUBLESHOOTING**

### **Development Tools**
- **React DevTools**: Component inspection and debugging
- **Redux DevTools**: State management debugging
- **Performance Profiler**: Performance analysis
- **Network Tab**: API request debugging

### **Common Issues**
1. **Hydration Mismatches**: Check SSR/CSR compatibility
2. **Type Errors**: Verify TypeScript configurations
3. **Performance Issues**: Use performance monitoring tools
4. **Build Errors**: Check dependency versions and configurations

### **Debugging Techniques**
```typescript
// ✅ Good: Debug logging
if (process.env.NODE_ENV === 'development') {
  console.log('Game state update:', { score, timeElapsed, level });
}

// ✅ Good: Performance monitoring
const startTime = performance.now();
// ... operation ...
const endTime = performance.now();
console.log(`Operation took ${endTime - startTime}ms`);
```

## 📚 **RESOURCES AND REFERENCES**

### **Documentation**
- **Next.js**: [nextjs.org/docs](https://nextjs.org/docs)
- **React**: [react.dev](https://react.dev)
- **TypeScript**: [typescriptlang.org/docs](https://typescriptlang.org/docs)
- **Tailwind CSS**: [tailwindcss.com/docs](https://tailwindcss.com/docs)

### **Best Practices**
- **React Patterns**: [reactpatterns.com](https://reactpatterns.com)
- **TypeScript Best Practices**: [typescript-eslint.io](https://typescript-eslint.io)
- **Web Performance**: [web.dev/performance](https://web.dev/performance)
- **Accessibility**: [web.dev/accessibility](https://web.dev/accessibility)

### **Community**
- **Discord**: Join our development community
- **GitHub**: Contribute to the project
- **Stack Overflow**: Ask questions and find solutions

## 🎯 **DEVELOPMENT CHECKLIST**

### **Before Committing**
- [ ] Code follows established patterns and standards
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] ESLint passes without warnings
- [ ] Accessibility requirements met
- [ ] Performance impact assessed
- [ ] Documentation updated

### **Before Deploying**
- [ ] All tests pass in CI/CD pipeline
- [ ] Build completes successfully
- [ ] Bundle size within acceptable limits
- [ ] Environment variables configured
- [ ] Security headers implemented
- [ ] Performance metrics meet targets
- [ ] Accessibility audit completed

---

*This development guide provides comprehensive information for developers working on the Insomnia Game project. Follow these standards and practices to maintain code quality and project consistency.*
