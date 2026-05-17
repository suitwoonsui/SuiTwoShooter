# Simplified Start Screen Approach

## Current Over-Engineering

**What we have now:**
- Inline styles with !important everywhere
- Dynamic image creation (prevents flash but adds complexity)
- Deferred script loading with complex timing
- CSS hiding all images, then selectively showing
- Multiple layers of visibility management

**Problems:**
- Too complex to maintain
- Hard to debug
- Over-engineered for the problem

## Simple Solution

### Core Principle
**The start screen should just work. No special tricks needed.**

### Simple Approach

1. **HTML Structure** (Simple)
   - Front page first in HTML
   - Everything else after it
   - Images use normal `<img>` tags

2. **CSS** (Simple)
   - Front page visible by default
   - Other overlays hidden by default
   - Use CSS classes for show/hide
   - No !important hacks

3. **JavaScript** (Simple)
   - Just toggle CSS classes
   - Load images normally
   - No complex timing or deferring

### Implementation

```html
<!-- Simple HTML -->
<div class="viewport-container">
  <div id="frontPage" class="front-page-overlay front-page-overlay-visible">
    <div class="front-page-content">
      <h1 class="game-title">
        <img src="assets/SuiTwo_Profile.webp" alt="SuiTwo" class="title-profile-image"> 
        SuiTwo
      </h1>
      <!-- rest of content -->
    </div>
  </div>
  
  <div id="mainMenuOverlay" class="main-menu-overlay main-menu-overlay-hidden">
    <!-- menu content -->
  </div>
  
  <div class="game-container game-container-hidden">
    <!-- game content -->
  </div>
</div>
```

```css
/* Simple CSS */
.front-page-overlay-visible { display: flex; }
.front-page-overlay-hidden { display: none; }
.main-menu-overlay-visible { display: flex; }
.main-menu-overlay-hidden { display: none; }
.game-container-visible { display: flex; }
.game-container-hidden { display: none; }
```

```javascript
// Simple JavaScript
function showMainMenu() {
  document.getElementById('frontPage').classList.remove('front-page-overlay-visible');
  document.getElementById('frontPage').classList.add('front-page-overlay-hidden');
  document.getElementById('mainMenuOverlay').classList.remove('main-menu-overlay-hidden');
  document.getElementById('mainMenuOverlay').classList.add('main-menu-overlay-visible');
}
```

## Why This Works

1. **HTML order** - Front page is first, so it renders first
2. **CSS classes** - Simple show/hide, no complexity
3. **No tricks** - Just normal web development
4. **Maintainable** - Easy to understand and debug

## What We Should Remove

1. ❌ All inline styles with !important
2. ❌ Dynamic image creation
3. ❌ Complex script deferring
4. ❌ CSS hiding all images then selectively showing
5. ❌ Multiple layers of visibility checks

## What We Should Keep

1. ✅ CSS classes for visibility
2. ✅ Front page first in HTML
3. ✅ Simple JavaScript to toggle classes
4. ✅ Normal image loading

