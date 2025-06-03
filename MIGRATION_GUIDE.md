# Migration Guide: Upgrading to Secure Authentication System

## Overview
This guide helps you migrate from the old insecure system to the new secure authentication system.

## Pre-Migration Checklist

### 1. Backup Your Data
```bash
# Backup your Firebase data before migration
# Export your Firestore collections:
# - admin
# - teacherData
# - studentData
```

### 2. Server Setup
Ensure your server environment is properly configured:

```bash
# Install dependencies
npm install

# Set up environment variables (copy from .env.example)
cp .env.example .env

# Edit .env with your actual values:
# - FIREBASE_PROJECT_ID
# - FIREBASE_API_KEY
# - JWT_SECRET (generate a strong secret)
# - BCRYPT_ROUNDS=12
```

### 3. Start the Server
```bash
# Start the secure server
npm start

# Verify server is running
curl http://localhost:3000/api/health
```

## Migration Steps

### Step 1: Password Migration
Run the password migration script to hash existing plaintext passwords:

```bash
node scripts/migrate-passwords.js
```

This script will:
- Hash all plaintext passwords in the `admin` collection
- Hash all plaintext passwords in the `teacherData` collection
- Create a default admin account if none exists
- Mark migrated accounts with `passwordMigrated: true`

### Step 2: Update Client Files
The following files have been updated with security fixes:

#### Core Files Modified:
- `adminChecker.js` - Now uses secure API authentication
- `teacherPortal.js` - Integrated with secure auth module
- `createAccount.js` - Uses server API for account creation
- `script.js` - Uses server API for admin creation
- `index.html` - Added input sanitizer script
- `teacherPortal.html` - Added input sanitizer script

#### New Files Added:
- `js/secureAuth.js` - Secure authentication module
- `js/inputSanitizer.js` - Input sanitization utilities
- `SECURITY_FIXES.md` - Documentation of fixes applied
- `MIGRATION_GUIDE.md` - This migration guide

### Step 3: Test the Migration

#### 3.1 Test Admin Login
1. Go to `index.html`
2. Try logging in with existing admin credentials
3. Verify redirection to `home.html`

#### 3.2 Test Teacher Login
1. Go to `index.html`
2. Try logging in with existing teacher credentials
3. Verify redirection to `teacherPortal.html`

#### 3.3 Test Account Creation
1. Go to `createAccount.html`
2. Create a new teacher account
3. Verify the account is created with hashed password

### Step 4: Verify Security Features

#### 4.1 Authentication Security
- [ ] Cannot access teacher portal without login
- [ ] Logout properly clears session data
- [ ] Invalid credentials are rejected
- [ ] Tokens expire and refresh automatically

#### 4.2 Input Sanitization
- [ ] HTML in form inputs is escaped
- [ ] XSS attempts are blocked
- [ ] Form data is properly validated

#### 4.3 Configuration Security
- [ ] No Firebase credentials in client-side code
- [ ] Configuration only comes from server
- [ ] Fallback credentials are removed

## Troubleshooting

### Common Issues

#### 1. "Configuration not available" Error
**Problem**: Server is not running or `/api/config` endpoint is not accessible
**Solution**: 
- Ensure server is running: `npm start`
- Check server logs for errors
- Verify environment variables are set

#### 2. "Invalid credentials" Error
**Problem**: Passwords may not be migrated yet
**Solution**:
- Run password migration script: `node scripts/migrate-passwords.js`
- Check if passwords are hashed in Firebase console

#### 3. "Teacher ID not found" Error
**Problem**: Session data is not properly set
**Solution**:
- Clear browser storage: `localStorage.clear()` and `sessionStorage.clear()`
- Try logging in again
- Check if teacher has proper `id` field in database

#### 4. XSS/Input Validation Issues
**Problem**: Input sanitizer not loaded
**Solution**:
- Ensure `js/inputSanitizer.js` is included in HTML files
- Check browser console for script loading errors

### Database Issues

#### Checking Password Migration Status
```javascript
// In Firebase console, check if passwords are hashed
// Hashed passwords start with "$2b$"
// Look for "passwordMigrated: true" field
```

#### Manual Password Reset
If you need to manually reset a password:
```javascript
// Use the server API to update password
fetch('/api/admin/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    newPassword: 'newSecurePassword123'
  })
});
```

## Post-Migration Verification

### Security Checklist
- [ ] All passwords are hashed (start with "$2b$")
- [ ] No plaintext passwords in database
- [ ] Authentication requires server API calls
- [ ] Input sanitization is working
- [ ] Session management is secure
- [ ] Configuration is server-side only

### Functionality Checklist
- [ ] Admin login works
- [ ] Teacher login works
- [ ] Account creation works
- [ ] Student management works
- [ ] Question management works
- [ ] Level management works
- [ ] Logout works properly

## Rollback Plan

If you need to rollback to the old system:

1. **Restore Database Backup**
   ```bash
   # Restore your Firebase backup
   # This will restore plaintext passwords
   ```

2. **Revert Code Changes**
   ```bash
   git checkout <previous-commit>
   ```

3. **Remove New Files**
   ```bash
   rm js/secureAuth.js
   rm js/inputSanitizer.js
   rm SECURITY_FIXES.md
   rm MIGRATION_GUIDE.md
   ```

**⚠️ Warning**: Rollback will restore security vulnerabilities. Only use for emergency situations.

## Support

If you encounter issues during migration:

1. Check the browser console for JavaScript errors
2. Check server logs for API errors
3. Verify environment variables are correctly set
4. Ensure all dependencies are installed
5. Test with a fresh browser session (clear cache/storage)

## Next Steps

After successful migration:

1. **Security Audit**: Conduct a thorough security review
2. **User Training**: Train users on the new login process
3. **Monitoring**: Set up logging and monitoring for the new system
4. **Documentation**: Update user documentation
5. **Regular Updates**: Keep dependencies and security measures up to date

## Conclusion

This migration transforms your system from an insecure authentication model to a production-ready secure system. Take time to thoroughly test all functionality before deploying to production.

Remember: Security is an ongoing process. Regularly review and update your security measures.
