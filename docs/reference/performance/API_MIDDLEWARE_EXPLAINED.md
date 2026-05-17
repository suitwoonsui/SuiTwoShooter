# API Middleware Explained

## 📍 Location

**File**: `backend/lib/api/api-handler.ts`

This is a **new file** created to centralize common API route functionality.

---

## 🎯 What is it?

The middleware is a **wrapper function** that automatically handles common tasks for all API routes:

1. **CORS handling** - Automatically adds CORS headers
2. **Error handling** - Catches and formats errors consistently
3. **Request logging** - Logs requests with timing information
4. **Error sanitization** - Hides internal error details in production
5. **Response formatting** - Standardizes response format

---

## 🔧 How It Works

### Before (Without Middleware)

Every API route had to manually handle:
- CORS headers
- Error catching
- Error formatting
- Response structure
- Logging

**Example - Old Way**:
```typescript
export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    const body = await request.json();
    // ... handler logic ...
    
    return NextResponse.json(
      { success: true, data: result },
      { headers: corsHeaders }
    );
  } catch (error) {
    // Manual error handling
    if (error instanceof BadgeError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400, headers: corsHeaders }
      );
    }
    // ... more error handling ...
  }
}
```

**Problems**:
- ❌ Code duplication across every route
- ❌ Inconsistent error handling
- ❌ No automatic logging
- ❌ Manual CORS header management

---

### After (With Middleware)

The middleware handles all the boilerplate automatically!

**Example - New Way**:
```typescript
export const POST = withApiHandler(
  async (request: NextRequest) => {
    // Just write your business logic!
    const body = await getRequestBody(request);
    const result = await doSomething(body);
    return { success: true, data: result };
  },
  { logRequest: true }
);
```

**Benefits**:
- ✅ No CORS boilerplate
- ✅ Automatic error handling
- ✅ Automatic logging with timing
- ✅ Consistent response format
- ✅ Production-safe error messages

---

## 📖 How to Use It

### Basic Usage

```typescript
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';

export const POST = withApiHandler(
  async (request: NextRequest) => {
    // 1. Get request body
    const body = await getRequestBody(request);
    
    // 2. Write your business logic
    const result = await processRequest(body);
    
    // 3. Return data (middleware wraps it in { success: true, data: ... })
    return result;
  }
);
```

### With Route Parameters

```typescript
export const GET = withApiHandler(
  async (request: NextRequest, params: { address: string }) => {
    const { address } = await params;
    
    // Use the address parameter
    const badge = await getBadge(address);
    
    return { badge };
  }
);
```

### With Custom Options

```typescript
export const POST = withApiHandler(
  async (request: NextRequest) => {
    // Your handler logic
    return { data: result };
  },
  {
    logRequest: true,        // Enable request logging (default: true)
    requireAuth: false,      // Future: require authentication
    validateBody: (body) => { // Future: custom validation
      if (!body.email) throw new Error('Email required');
    }
  }
);
```

### Error Handling

Just throw errors - the middleware handles them:

```typescript
export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody(request);
    
    // Throw BadgeError for known errors
    if (!body.address) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Address is required'
      );
    }
    
    // Throw regular errors for unexpected issues
    const result = await processRequest(body);
    if (!result) {
      throw new Error('Processing failed');
    }
    
    return result;
  }
);
```

The middleware will:
- ✅ Catch the error
- ✅ Log it with context
- ✅ Format it properly
- ✅ Sanitize it for production
- ✅ Return appropriate HTTP status code

---

## 🔍 What Happens Behind the Scenes

When you use `withApiHandler`, here's what happens:

### 1. Request Arrives
```
POST /api/badges/mint
```

### 2. Middleware Intercepts
```typescript
withApiHandler(yourHandler)
```

### 3. Middleware Does:
- ✅ Adds CORS headers
- ✅ Logs request start
- ✅ Starts timer
- ✅ Calls your handler
- ✅ Logs completion with duration
- ✅ Wraps response in standard format
- ✅ Catches any errors
- ✅ Sanitizes error messages
- ✅ Returns formatted response

### 4. Response Sent
```json
{
  "success": true,
  "data": { ... }
}
```

Or on error:
```json
{
  "success": false,
  "error": "User-friendly error message",
  "code": "INVALID_ADDRESS"
}
```

---

## 🎨 Real Example: Before vs After

### Before (Old Route)

```typescript
export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    const body = await request.json();
    const { playerAddress, paymentCoinId } = body;

    // Validation
    if (!playerAddress) {
      return NextResponse.json(
        { success: false, error: 'playerAddress is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Business logic
    const result = await badgeService.buildMintBadgeTransaction(
      playerAddress,
      paymentCoinId
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, transaction: result.transaction },
      { headers: corsHeaders }
    );
  } catch (error) {
    // Manual error handling
    const badgeError = BadgeError.fromUnknown(error);
    return NextResponse.json(
      { success: false, error: badgeError.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
```

**Lines of code**: ~45 lines  
**Boilerplate**: ~30 lines

---

### After (New Route with Middleware)

```typescript
export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      paymentCoinId?: string;
    }>(request);
    const { playerAddress, paymentCoinId } = body;

    // Validation (just throw errors)
    if (!playerAddress) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    // Business logic
    const result = await badgeService.buildMintBadgeTransaction(
      playerAddress,
      paymentCoinId
    );

    if (!result.success) {
      throw new BadgeError(
        BadgeErrorCode.TRANSACTION_FAILED,
        result.error || 'Failed to build transaction'
      );
    }

    // Just return data - middleware handles the rest!
    return {
      success: true,
      transaction: result.transaction,
    };
  },
  { logRequest: true }
);
```

**Lines of code**: ~30 lines  
**Boilerplate**: ~0 lines (all handled by middleware)

**Reduction**: 33% less code, 100% less boilerplate!

---

## 🛡️ Error Sanitization

The middleware automatically sanitizes error messages in production:

### Development
```json
{
  "error": "Cannot read property 'address' of undefined"
}
```

### Production
```json
{
  "error": "An error occurred. Please try again."
}
```

This prevents exposing:
- ❌ Internal code structure
- ❌ Stack traces
- ❌ Database errors
- ❌ File paths
- ❌ Internal API keys

---

## 📊 Automatic Logging

The middleware automatically logs:

**Request Start**:
```
[BADGE] API request received {
  method: 'POST',
  url: 'https://api.example.com/api/badges/mint',
  pathname: '/api/badges/mint'
}
```

**Request Complete**:
```
[BADGE] API request completed {
  method: 'POST',
  pathname: '/api/badges/mint',
  duration: '245ms'
}
```

**Request Failed**:
```
[BADGE ERROR] API request failed (BadgeError) {
  method: 'POST',
  pathname: '/api/badges/mint',
  error: 'Address is required',
  code: 'INVALID_ADDRESS',
  duration: '12ms'
}
```

---

## 🎯 Key Features

### 1. **CORS Handling**
- Automatically adds CORS headers
- Handles preflight (OPTIONS) requests
- Works in development and production

### 2. **Error Handling**
- Catches all errors automatically
- Formats errors consistently
- Maps error codes to HTTP status codes
- Sanitizes error messages in production

### 3. **Request Logging**
- Logs every request with timing
- Includes method, path, duration
- Logs errors with full context

### 4. **Response Formatting**
- Standardizes response structure
- Always includes `success` field
- Wraps data in `data` field
- Consistent error format

### 5. **Helper Functions**
- `getRequestBody<T>()` - Type-safe body parsing
- `getAddressParam()` - Extract address from params

---

## 📝 Migration Guide

To migrate an existing route:

1. **Import the middleware**:
```typescript
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
```

2. **Wrap your handler**:
```typescript
export const POST = withApiHandler(
  async (request: NextRequest) => {
    // Your existing handler code
  }
);
```

3. **Remove boilerplate**:
   - ❌ Remove `getCorsHeaders()` calls
   - ❌ Remove manual `try/catch` blocks
   - ❌ Remove manual error formatting
   - ❌ Remove manual response wrapping

4. **Use helpers**:
   - ✅ Use `getRequestBody()` instead of `request.json()`
   - ✅ Throw errors instead of returning error responses

5. **Test**:
   - ✅ Verify CORS still works
   - ✅ Verify error handling works
   - ✅ Check logs for timing info

---

## 🎓 Summary

**Location**: `backend/lib/api/api-handler.ts`

**What it does**: Wraps API route handlers to automatically handle:
- CORS
- Error handling
- Logging
- Response formatting
- Error sanitization

**How to use**: Wrap your handler function:
```typescript
export const POST = withApiHandler(yourHandler, options);
```

**Benefits**:
- ✅ Less code (33% reduction)
- ✅ Consistent error handling
- ✅ Automatic logging
- ✅ Production-safe errors
- ✅ Easier maintenance

---

**Created**: $(date)  
**Status**: ✅ Active - Used in `/api/badges/mint` route

