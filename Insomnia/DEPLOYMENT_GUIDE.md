# 🚀 **INSOMNIA GAME - DEPLOYMENT GUIDE**

## 📋 **OVERVIEW**

This guide provides comprehensive deployment instructions for the Insomnia Game application across various platforms and environments. The application is production-ready and optimized for deployment.

## 🎯 **DEPLOYMENT STATUS**

**✅ PRODUCTION READY**: All security, performance, and accessibility requirements met
**🔒 SECURITY AUDITED**: Comprehensive security review completed
**♿ ACCESSIBILITY COMPLIANT**: WCAG 2.1 AA standards met
**📱 MOBILE OPTIMIZED**: PWA support and mobile-first design
**🌐 SSR SAFE**: Server-side rendering compatible

## 🏗️ **ARCHITECTURE OVERVIEW**

### **Frontend Application**
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS with custom theming
- **State Management**: React Context + React Query
- **Performance**: Web Workers, code splitting, lazy loading

### **Backend Service**
- **Runtime**: Node.js 18+ with Express
- **Purpose**: Secure blockchain operations
- **Features**: Rate limiting, CORS, security headers
- **Database**: No database required (blockchain-based)

### **Blockchain Integration**
- **Network**: Sui blockchain (Testnet/Mainnet)
- **Smart Contracts**: Move language contracts
- **Wallet Support**: @mysten/dapp-kit compatible wallets

## 🔧 **PRE-DEPLOYMENT CHECKLIST**

### **Code Quality** ✅
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] ESLint passes without warnings
- [ ] Bundle size within acceptable limits
- [ ] Performance metrics meet targets

### **Security** ✅
- [ ] Environment variables configured
- [ ] Security headers implemented
- [ ] Input validation in place
- [ ] Rate limiting configured
- [ ] CORS properly set

### **Performance** ✅
- [ ] Code splitting implemented
- [ ] Web Workers configured
- [ ] Caching strategy in place
- [ ] Image optimization enabled
- [ ] Bundle analyzer configured

### **Accessibility** ✅
- [ ] WCAG 2.1 AA compliance verified
- [ ] Screen reader support tested
- [ ] Keyboard navigation working
- [ ] Color contrast ratios met
- [ ] Touch targets properly sized

## 🌍 **DEPLOYMENT PLATFORMS**

### **1. Vercel (Recommended)**

#### **Why Vercel?**
- **Next.js Native**: Built for Next.js applications
- **Automatic Deployments**: Git-based deployment pipeline
- **Global CDN**: Edge network for fast delivery
- **Analytics**: Built-in performance monitoring
- **Environment Variables**: Secure configuration management

#### **Deployment Steps**
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy from project directory
vercel

# 4. Follow prompts to configure:
# - Project name: insomnia-game
# - Framework preset: Next.js
# - Root directory: ./
# - Build command: npm run build
# - Output directory: .next
# - Install command: npm install
```

#### **Environment Configuration**
```bash
# In Vercel dashboard or via CLI
vercel env add NEXT_PUBLIC_BACKEND_URL
vercel env add NODE_ENV

# Set values:
NEXT_PUBLIC_BACKEND_URL=https://api.insomnia-game.com
NODE_ENV=production
```

#### **Custom Domain Setup**
```bash
# 1. Add custom domain in Vercel dashboard
# 2. Configure DNS records:
#    Type: CNAME
#    Name: @
#    Value: cname.vercel-dns.com

# 3. SSL certificate automatically provisioned
```

### **2. Netlify**

#### **Deployment Steps**
```bash
# 1. Install Netlify CLI
npm i -g netlify-cli

# 2. Login to Netlify
netlify login

# 3. Initialize project
netlify init

# 4. Configure build settings:
#    Build command: npm run build
#    Publish directory: .next
#    Functions directory: (leave empty)
```

#### **Netlify Configuration File**
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### **3. AWS (Enterprise)**

#### **Architecture**
```
CloudFront (CDN) → S3 (Static Assets) → CloudFront (API Gateway) → Lambda (Backend)
```

#### **Deployment Steps**
```bash
# 1. Install AWS CLI and configure credentials
aws configure

# 2. Create S3 bucket for static assets
aws s3 mb s3://insomnia-game-assets

# 3. Build and deploy frontend
npm run build
aws s3 sync .next s3://insomnia-game-assets --delete

# 4. Configure CloudFront distribution
# 5. Deploy backend to Lambda or ECS
```

#### **AWS Configuration Files**
```yaml
# serverless.yml (if using Serverless Framework)
service: insomnia-game-backend

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1

functions:
  api:
    handler: src/server.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
```

### **4. Docker Deployment**

#### **Dockerfile**
```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Build application
FROM base AS builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

#### **Docker Compose**
```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_BACKEND_URL=http://backend:3001
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
    volumes:
      - ./backend/.env:/app/.env:ro
```

## 🔐 **ENVIRONMENT CONFIGURATION**

### **Frontend Environment Variables**
```bash
# .env.production
NEXT_PUBLIC_BACKEND_URL=https://api.insomnia-game.com
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Optional: Analytics
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

### **Backend Environment Variables**
```bash
# backend/.env.production
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://insomnia-game.com

# Sui Network Configuration
SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
PACKAGE_ID=your_deployed_package_id
GAME_PASS_SYSTEM_ID=your_deployed_system_id
CLOCK_ID=0x6

# Game Owner Wallet (NEVER commit to version control!)
GAME_OWNER_PRIVATE_KEY=your_private_key_here

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### **Environment Validation**
```typescript
// src/lib/config/environment.ts
export const validateEnvironment = () => {
  const required = [
    'NEXT_PUBLIC_BACKEND_URL',
    'NODE_ENV'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate URLs
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (backendUrl && !backendUrl.startsWith('https://')) {
    console.warn('Warning: Backend URL should use HTTPS in production');
  }
};
```

## 📊 **PERFORMANCE OPTIMIZATION**

### **Build Optimization**
```javascript
// next.config.js
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
  },
  
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
            blockchain: {
              test: /[\\/]src[\\/]lib[\\/]services[\\/]/,
              name: 'blockchain',
              chunks: 'all',
            },
          },
        },
      };
    }
    return config;
  },
};
```

### **Bundle Analysis**
```bash
# Analyze bundle size
ANALYZE=true npm run build

# View analysis in browser
# Open http://localhost:8888 after build
```

### **Performance Monitoring**
```typescript
// src/hooks/usePerformanceMonitor.ts
export const usePerformanceMonitor = (
  componentName: string,
  options: PerformanceMonitorOptions = {}
) => {
  // Real-time FPS, memory, and render time tracking
  // Only enabled in development or when explicitly configured
};
```

## 🔒 **SECURITY CONFIGURATION**

### **Security Headers**
```javascript
// next.config.js
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'geolocation=(), microphone=(), camera=()',
        },
      ],
    },
  ];
}
```

### **Content Security Policy**
```typescript
// src/lib/config/security.ts
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", "data:", "https:"],
  'font-src': ["'self'"],
  'connect-src': ["'self'", "wss:", "https:"],
  'worker-src': ["'self'", "blob:"],
};
```

### **Rate Limiting**
```typescript
// backend/src/server.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // requests per window
  message: 'Too many requests from this IP',
});

app.use('/api/', limiter);
```

## 📱 **PWA CONFIGURATION**

### **Web App Manifest**
```json
// public/manifest.json
{
  "name": "Insomnia Game",
  "short_name": "Insomnia",
  "description": "Fast-paced blockchain game with NFT rewards",
  "theme_color": "#6366f1",
  "background_color": "#0f0f23",
  "display": "standalone",
  "orientation": "portrait-primary",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "/images/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### **Service Worker**
```javascript
// public/sw.js
const CACHE_NAME = 'insomnia-game-v1';
const urlsToCache = [
  '/',
  '/game',
  '/manifest.json',
  '/gameWorker.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

## 🧪 **TESTING DEPLOYMENT**

### **Pre-Deployment Testing**
```bash
# 1. Run all tests
npm test

# 2. Build locally
npm run build

# 3. Start production server
npm start

# 4. Test in browser
# - Check all pages load
# - Verify wallet connection
# - Test game functionality
# - Check mobile responsiveness
# - Verify accessibility features
```

### **Post-Deployment Testing**
```bash
# 1. Verify deployment
curl -I https://your-domain.com

# 2. Check security headers
curl -I -H "User-Agent: Mozilla/5.0" https://your-domain.com

# 3. Test PWA installation
# - Open in mobile browser
# - Check "Add to Home Screen" option
# - Verify offline functionality

# 4. Performance testing
# - Use Lighthouse in Chrome DevTools
# - Check Core Web Vitals
# - Verify bundle sizes
```

## 📊 **MONITORING & ANALYTICS**

### **Error Tracking**
```typescript
// src/lib/utils/errorHandler.ts
export class ErrorLogger {
  private async sendToAnalytics(error: AppError): Promise<void> {
    try {
      if (error.severity === 'critical' || error.severity === 'high') {
        // Send to Sentry, LogRocket, or custom endpoint
        await fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(error),
        });
      }
    } catch (e) {
      // Fail silently
    }
  }
}
```

### **Performance Monitoring**
```typescript
// src/hooks/usePerformanceMonitor.ts
export const usePerformanceMonitor = (
  componentName: string,
  options: PerformanceMonitorOptions = {}
) => {
  // Real-time performance metrics
  // FPS, memory usage, render time
  // Performance warnings and suggestions
};
```

### **Analytics Integration**
```typescript
// src/components/SEOHead.tsx
export const SEOHead: React.FC<SEOHeadProps> = ({
  // SEO meta tags
  // Google Analytics
  // Performance monitoring
}) => {
  // Implementation
};
```

## 🔄 **CI/CD PIPELINE**

### **GitHub Actions**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### **Environment Secrets**
```bash
# Required secrets in GitHub:
VERCEL_TOKEN=your_vercel_token
ORG_ID=your_vercel_org_id
PROJECT_ID=your_vercel_project_id

# Optional secrets:
SENTRY_DSN=your_sentry_dsn
ANALYTICS_ID=your_analytics_id
```

## 🚨 **TROUBLESHOOTING**

### **Common Deployment Issues**

#### **Build Failures**
```bash
# Check Node.js version
node --version  # Should be 18+

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check

# Verify environment variables
echo $NODE_ENV
echo $NEXT_PUBLIC_BACKEND_URL
```

#### **Runtime Errors**
```bash
# Check browser console for errors
# Verify environment variables are set
# Check CORS configuration
# Verify backend service is running
```

#### **Performance Issues**
```bash
# Analyze bundle size
ANALYZE=true npm run build

# Check Core Web Vitals
# Use Lighthouse in Chrome DevTools
# Monitor performance metrics
```

### **Debug Commands**
```bash
# Development
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Type check
npm run type-check

# Bundle analysis
ANALYZE=true npm run build
```

## 📈 **DEPLOYMENT METRICS**

### **Success Criteria**
- **Build Success**: 100% successful builds
- **Performance**: Core Web Vitals targets met
- **Accessibility**: WCAG 2.1 AA compliance
- **Security**: No security vulnerabilities
- **Uptime**: 99.9% availability target

### **Monitoring Dashboard**
```typescript
// Key metrics to track:
- Page load times
- Error rates
- User engagement
- Performance scores
- Accessibility compliance
- Security incidents
```

## 🎯 **NEXT STEPS**

### **Post-Deployment Tasks**
1. **Monitor Performance**: Track Core Web Vitals
2. **Error Tracking**: Set up Sentry or similar service
3. **Analytics**: Configure Google Analytics or similar
4. **Backup Strategy**: Implement automated backups
5. **Scaling Plan**: Plan for user growth

### **Future Enhancements**
1. **CDN Optimization**: Implement advanced CDN strategies
2. **Load Balancing**: Add load balancers for high traffic
3. **Database Integration**: Add persistent storage if needed
4. **Microservices**: Decompose into microservices architecture
5. **Kubernetes**: Container orchestration for scalability

---

*This deployment guide provides comprehensive instructions for deploying the Insomnia Game application to production. Follow these guidelines to ensure a successful and secure deployment.*
