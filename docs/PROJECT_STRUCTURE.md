# Project Structure

## Overview
This document describes the organized file structure of the Kamusta Po Guro admin dashboard project.

## Directory Structure

```
kamusta-po-guro-admin/
├── docs/                           # Documentation files
│   ├── DEPLOYMENT.md              # Deployment instructions
│   ├── LOGIN_TEST.md              # Login testing documentation
│   ├── MIGRATION_GUIDE.md         # Migration guide
│   ├── PROJECT_STRUCTURE.md       # This file
│   ├── SECURITY.md                # Security documentation
│   └── SECURITY_FIXES.md          # Security fixes log
├── public/                         # Static client-side files
│   ├── assets/                    # Static assets
│   │   ├── css/
│   │   │   └── main.css           # Main stylesheet (formerly style.css)
│   │   └── js/                    # Client-side JavaScript
│   │       ├── create-account.js  # Account creation logic
│   │       ├── dashboard.js       # Dashboard functionality (formerly home.js)
│   │       ├── inputSanitizer.js  # Input sanitization utilities
│   │       ├── main.js            # Main client script (formerly script.js)
│   │       ├── navigation.js      # Navigation utilities
│   │       ├── secureAuth.js      # Client-side auth utilities
│   │       ├── student-details.js # Student details page logic
│   │       ├── teacher-info.js    # Teacher info page logic
│   │       └── teacher-portal.js  # Teacher portal functionality
│   ├── pages/                     # HTML pages
│   │   ├── create-account.html    # Account creation page
│   │   ├── dashboard.html         # Main dashboard (formerly home.html)
│   │   ├── student-details.html   # Student details view
│   │   ├── teacher-info.html      # Teacher information page
│   │   └── teacher-portal.html    # Teacher portal interface
│   └── index.html                 # Main login page
├── src/                           # Server-side source code
│   ├── components/                # Reusable components
│   │   └── Sidebar.js
│   ├── config/                    # Configuration files
│   │   └── security.js
│   ├── middleware/                # Express middleware
│   │   └── security.js
│   ├── routes/                    # API route handlers
│   │   ├── admin.js
│   │   ├── auth.js
│   │   └── teachers.js
│   ├── scripts/                   # Utility scripts
│   │   └── migrate-passwords.js
│   ├── shared/                    # Shared utilities
│   │   └── teacherUtils.js
│   ├── utils/                     # General utilities
│   │   └── auth.js
│   ├── admin-checker.js           # Admin validation (formerly adminChecker.js)
│   └── server.js                  # Main server file
├── .env.example                   # Environment variables template
├── .gitignore                     # Git ignore rules
├── package.json                   # Node.js dependencies and scripts
└── README.md                      # Project documentation
```

## File Naming Conventions

### Changes Made:
- **Kebab-case**: All files now use kebab-case naming (e.g., `create-account.js` instead of `createAccount.js`)
- **Descriptive names**: Files have more descriptive names (e.g., `dashboard.html` instead of `home.html`)
- **Organized structure**: Files are organized by type and functionality

### Frontend Files:
- `style.css` → `public/assets/css/main.css`
- `script.js` → `public/assets/js/main.js`
- `createAccount.js` → `public/assets/js/create-account.js`
- `home.js` → `public/assets/js/dashboard.js`
- `studentDetails.js` → `public/assets/js/student-details.js`
- `teacherInfo.js` → `public/assets/js/teacher-info.js`
- `teacherPortal.js` → `public/assets/js/teacher-portal.js`

### HTML Pages:
- `createAccount.html` → `public/pages/create-account.html`
- `home.html` → `public/pages/dashboard.html`
- `studentDetails.html` → `public/pages/student-details.html`
- `teacherInfo.html` → `public/pages/teacher-info.html`
- `teacherPortal.html` → `public/pages/teacher-portal.html`

### Backend Files:
- `adminChecker.js` → `src/admin-checker.js`
- `server.js` → `src/server.js`

## Updated References

All file references have been updated to reflect the new structure:
- CSS imports in HTML files now point to `../assets/css/main.css`
- JavaScript imports in HTML files now point to the correct paths in `../assets/js/`
- Server configuration updated to serve static files from `public/` directory
- Package.json scripts updated to use `src/server.js`

## Benefits of This Structure

1. **Clear separation**: Frontend and backend code are clearly separated
2. **Scalability**: Easy to add new pages, assets, and server modules
3. **Maintainability**: Logical organization makes the codebase easier to navigate
4. **Professional standards**: Follows modern web application directory conventions
5. **Security**: Static files are served from a dedicated public directory
6. **Documentation**: All documentation is centralized in the docs folder