# Kamusta Po Guro - Secure Admin Dashboard

A secure, modern admin dashboard for the Kamusta Po Guro educational platform with comprehensive security features.

## � Latest Update - 6/7/25:
✅ **Git Commit**: Project-Blueberry-CheeseCake-web
✅ **Web Deployment** - Admin Major Changes
✅ **Teacher and Admin Account Creation Revamp**

### 🚀 Major Changes:
- **Teacher and Admin Account Creation Revamp**
  - Secure account creation now uses a server API
  - Input fields are now protected with sanitization to avoid errors and security issues
  - Improved login/logout experience for teachers and admins
  - Better error messages for failed logins or access issues

- **New Teacher Portal Features**

Teachers can now manage students more effectively:
- View student info like ID, section, and progress
- Edit and update student details
- Track student performance in real-time
- Organized student data into different levels or tabs for easier navigation
- Added Excel export feature so teachers can download student records
- Improved UI animations when switching between levels or tabs

### 👥 Student Information:
- Student display updated to show more details like ID and section
- Switched from using internal IDs to usernames (more readable)
- Removed email and "last active" info to clean up the view

### 📚 Section and Question Management:
- Teachers can now create, edit, filter, and delete sections of students
- Question management improved with tabs based on difficulty levels
- Cleaner layout for adding and managing questions

### 🎨 Major UI/UX Enhancements:
- Animated modals added for account creation and logout
- Smooth entrance animations for lists of students and teachers
- Hover animations added to avoid accidental duplication
- Pagination now helps teachers scroll through long student lists
- New mobile-friendly sidebar and setting menus

### 🔧 Minor Improvements:
- "View Teacher Portal" button removed for clarity
- Logout button made always visible and styled better
- Progress modal added to show batch account creation status
- Added new settings and close buttons for modals and sidebars
- Alert added when viewing temporary student details for future updates
- Cleaned up unnecessary code and comments in many files
- Fixed header title from "COMPANY" to "ADMIN PORTAL" for accuracy
- Simplified spacing in search areas and modals for consistency
- Improved search design for better mobile and desktop viewing
- Teacher info toggle now lets users collapse or expand extra details
- Password toggle added when editing teacher accounts
- Fixed some buttons not responding
- Fixed some UI problems

### 📋 Full Changelog:
- [Project-Blueberry-CheeseCake](https://github.com/UncleJohnKun/Project-Blueberry-CheeseCake/commits/main/)
- [Project-Blueberry-CheeseCake-web](https://github.com/UncleJohnKun/Project-Blueberry-CheeseCake-web/commits/main/)

## �🔒 Security Features

### Authentication & Authorization
- ✅ **Password Hashing**: Bcrypt with configurable rounds
- ✅ **JWT Tokens**: Secure token-based authentication with refresh tokens
- ✅ **Session Management**: Automatic token refresh and secure logout
- ✅ **Role-Based Access**: Admin and Teacher role separation
- ✅ **Rate Limiting**: Protection against brute force attacks

### Data Protection
- ✅ **Input Validation**: Comprehensive server-side validation
- ✅ **Input Sanitization**: XSS protection and data cleaning
- ✅ **CSRF Protection**: Cross-site request forgery prevention
- ✅ **SQL Injection Prevention**: Parameterized queries and validation
- ✅ **Secure Headers**: Content Security Policy, HSTS, and more

### Infrastructure Security
- ✅ **HTTPS Enforcement**: Secure communication
- ✅ **Environment Variables**: Secure configuration management
- ✅ **API Key Protection**: Server-side API key management
- ✅ **Error Handling**: Secure error responses without data leakage
- ✅ **Audit Logging**: Authentication and action tracking

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm 8+
- Firebase project with Firestore enabled
- Environment variables configured

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd kamusta-po-guro-admin
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your Firebase credentials and security settings
```

3. **Migrate existing passwords (one-time only):**
```bash
node src/scripts/migrate-passwords.js
```

4. **Start the secure server:**
```bash
npm start
# For development: npm run dev
```

5. **Access the application:**
- Open `http://localhost:3000` (or your configured port)
- Use the default admin credentials (change immediately!)

## 📁 Project Structure

**🎉 REORGANIZED FOR BETTER MAINTAINABILITY!**

```
├── docs/                   # 📚 Documentation files
├── public/                 # 🌐 Static frontend files
│   ├── assets/            # CSS, JS, images
│   │   ├── css/           # Stylesheets
│   │   └── js/            # Client-side JavaScript
│   ├── pages/             # HTML pages
│   └── index.html         # Main login page
├── src/                   # ⚙️ Server-side source code
│   ├── components/        # Reusable components
│   ├── config/            # Configuration files
│   ├── middleware/        # Express middleware
│   ├── routes/            # API route handlers
│   ├── scripts/           # Utility scripts
│   ├── shared/            # Shared utilities
│   ├── utils/             # General utilities
│   └── server.js          # Main server file
├── package.json           # Dependencies and scripts
└── .env.example          # Environment template
```

> 📖 **Detailed Structure**: See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) for complete file organization details and naming conventions.





LastUpdate: 6/8/25 for v1.5.0
Game:
- Can now see the section
- Its now connected the LevelUnlock Depends on the Sectiion
- Removed Teacher's Portal
- Removed Choose Rep
- Compatibility in new Structure of Frebase

Web: 
- When adding a new section, users are now shown a warning: "Section name cannot be changed after creation."
- When editing a section, the section name field is read-only and cannot be changed.
- Section names are validated to only allow letters and numbers (no spaces or symbols) when creating a section