# Testing DeleteAccountButton Cookie

## Issue
The cookie `account_deletion_request` might not be visible in help.emergent.sh cookies because:
- It's set with Domain=`.emergent.sh` (note the leading dot)
- This makes it accessible to ALL *.emergent.sh subdomains
- But browsers sometimes don't show cross-subdomain cookies in the originating domain

## How to Test

### Step 1: Clear All Cookies
1. Go to help.emergent.sh
2. Open DevTools (F12)
3. Application → Cookies → Delete all for help.emergent.sh

### Step 2: Click the Button
1. Navigate to: https://help.emergent.sh/plans-and-credits
2. Scroll to "Deleting Your Account" section
3. Open Console (F12 → Console tab)
4. Click "Delete Your Account" button
5. Check console logs - should see:
   - "🍪 All cookies after setting: ..."
   - "🍪 Set cookie string: ..."
   - "🍪 Cookie readable from help.emergent.sh: true/false"
   - "✓ Opened app.emergent.sh in new tab"

### Step 3: Check Cookie in app.emergent.sh
1. Switch to the new tab (app.emergent.sh)
2. Open DevTools (F12)
3. Go to Application → Cookies
4. Look for cookies under BOTH:
   - app.emergent.sh
   - .emergent.sh (may appear as a separate entry)
5. Find: `account_deletion_request` = `true`

### Step 4: Verify Cookie Properties
The cookie should have:
- Name: `account_deletion_request`
- Value: `true`
- Domain: `.emergent.sh` (note the dot)
- Path: `/`
- Expires: ~1 hour from now
- Secure: ✓ (Yes)
- SameSite: Lax

## Expected Behavior

### On help.emergent.sh:
- Cookie is SET but might not be visible in DevTools
- Console shows cookie was set
- New tab opens to app.emergent.sh

### On app.emergent.sh:
- Cookie IS visible in DevTools
- Cookie can be read by JavaScript: 
  ```javascript
  document.cookie.includes('account_deletion_request=true')
  ```
- App detects cookie and opens deletion modal

## Troubleshooting

### If cookie is not visible on app.emergent.sh:

**Option A: Check Browser Settings**
- Some browsers block third-party cookies
- Chrome: Settings → Privacy → Cookies → Allow all cookies (for testing)
- Firefox: Settings → Privacy → Standard (not Strict)

**Option B: Alternative Cookie Setting**
If cross-subdomain doesn't work, we can:
1. Redirect to app.emergent.sh with URL parameter:
   `https://app.emergent.sh?action=delete_account`
2. App reads the parameter instead of cookie

**Option C: Use localStorage + PostMessage**
- Set flag in localStorage on help.emergent.sh
- Open app.emergent.sh in new window
- Use window.postMessage() to communicate

## Code for app.emergent.sh to Read Cookie

```javascript
// On page load at app.emergent.sh
function checkAccountDeletionRequest() {
  // Method 1: Read from cookie
  const cookies = document.cookie.split('; ');
  const deletionCookie = cookies.find(c => c.startsWith('account_deletion_request='));
  
  if (deletionCookie) {
    console.log('✓ Deletion request cookie found!');
    
    // Delete the cookie immediately
    document.cookie = 'account_deletion_request=; Domain=.emergent.sh; Path=/; Max-Age=0';
    
    // Open account deletion modal
    openAccountDeletionModal();
    return true;
  }
  
  // Method 2: Check URL parameter (fallback)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'delete_account') {
    console.log('✓ Deletion request via URL parameter');
    openAccountDeletionModal();
    return true;
  }
  
  return false;
}

// Call on page load
document.addEventListener('DOMContentLoaded', checkAccountDeletionRequest);
```
