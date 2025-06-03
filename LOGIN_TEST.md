# Login Test Guide

## Current Status
The login system has been fixed to work with your current setup. Here's what was changed:

### Fixed Issues:
1. ✅ **Authentication System**: Now works with both server API (if available) and direct Firebase
2. ✅ **Password Handling**: Detects hashed vs plaintext passwords
3. ✅ **Session Management**: Proper session storage and logout
4. ✅ **Input Sanitization**: XSS protection added
5. ✅ **Error Handling**: Better error messages

## How to Test Login

### Step 1: Try Default Credentials
If you have default admin credentials, try:
- Username: `admin`
- Password: `admin123` or `password` or whatever you set

### Step 2: Check Your Firebase Database
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Check the `admin` collection for existing users
4. Check the `teacherData` collection for teacher accounts

### Step 3: Test the Login Flow
1. Open `index.html` in your browser
2. Enter your credentials
3. Check the browser console (F12) for detailed error messages
4. The system will show which authentication method it's using

## Expected Behavior

### Successful Login:
- Shows "Login successful! Redirecting..."
- Console shows: "Admin/Teacher logged in successfully via firebase/server"
- Redirects to appropriate portal

### Failed Login:
- Shows specific error message
- Console shows detailed error information
- Password field is cleared for security

## Troubleshooting

### If you get "Invalid credentials":
1. Check your Firebase database for the correct username/password
2. Verify the username is exactly as stored (case-sensitive)
3. Check browser console for detailed error messages

### If you get "Network error":
1. Check your internet connection
2. Verify Firebase project ID and API key are correct
3. Check if Firebase rules allow read access

### If you get "Hashed password requires server authentication":
1. Your passwords are already hashed (good for security!)
2. You need to set up the server component
3. Or temporarily use the password migration script to verify

## Creating Test Accounts

### Option 1: Use createAccount.html
1. Go to `createAccount.html`
2. Fill in the form with test data
3. This will create a new teacher account

### Option 2: Manually add to Firebase
1. Go to Firebase Console
2. Add a document to the `admin` collection:
```json
{
  "username": "testadmin",
  "password": "testpass123",
  "email": "test@example.com",
  "fullname": "Test Admin",
  "id": "testadmin"
}
```

## Security Notes

### Current Security Level:
- ✅ XSS protection added
- ✅ Input sanitization implemented
- ✅ Session management improved
- ⚠️ Passwords may still be plaintext (depends on your data)
- ⚠️ Direct Firebase access (acceptable for development)

### For Production:
- Set up the server component for full security
- Run password migration to hash all passwords
- Use HTTPS for all communications
- Implement proper Firebase security rules

## Next Steps

1. **Test the current login** with your existing credentials
2. **Verify functionality** in teacher portal
3. **Set up server component** when ready for production
4. **Run password migration** for enhanced security

## Common Test Credentials

Try these common combinations if you're unsure:
- admin / admin
- admin / password
- admin / admin123
- teacher / teacher
- test / test

The system will tell you exactly what went wrong if the credentials don't work.
