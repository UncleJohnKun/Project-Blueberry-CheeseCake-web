# Kamusta Po Guro - Secure Admin Dashboard

A secure, modern admin dashboard for the Kamusta Po Guro educational platform with comprehensive security features.

## 🔒 Security Features

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
node scripts/migrate-passwords.js
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

```
├── config/
│   └── security.js          # Security configuration
├── middleware/
│   └── security.js          # Security middleware
├── routes/
│   ├── auth.js             # Authentication endpoints
│   ├── teachers.js         # Teacher management
│   └── admin.js            # Admin operations
├── scripts/
│   └── migrate-passwords.js # Password migration utility
├── shared/
│   └── teacherUtils.js     # Secure client utilities
├── utils/
│   └── auth.js             # Authentication utilities
├── server.js               # Main server file
├── package.json            # Dependencies and scripts
└── .env.example           # Environment template
```
