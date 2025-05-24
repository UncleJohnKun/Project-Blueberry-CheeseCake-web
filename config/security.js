/**
 * Security Configuration Module
 * Centralizes all security-related configurations and utilities
 */

// Load environment variables
const config = {
    // Firebase Configuration (from environment variables)
    firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID || 'capstoneproject-2b428',
        apiKey: process.env.FIREBASE_API_KEY || '',
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
        databaseURL: process.env.FIREBASE_DATABASE_URL || '',
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.FIREBASE_APP_ID || ''
    },

    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
        expiresIn: '1h',
        refreshExpiresIn: '7d'
    },

    // Password Security
    bcrypt: {
        rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
    },

    // Session Configuration
    session: {
        timeout: parseInt(process.env.SESSION_TIMEOUT) || 3600000, // 1 hour
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
        lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 900000 // 15 minutes
    },

    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    },

    // CORS Configuration
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true
    },

    // Security Headers
    securityHeaders: {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "https://firestore.googleapis.com"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"]
            }
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
    },

    // Input Validation Rules
    validation: {
        email: {
            maxLength: 254,
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        password: {
            minLength: 8,
            maxLength: 128,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: false
        },
        username: {
            minLength: 3,
            maxLength: 30,
            pattern: /^[a-zA-Z0-9_-]+$/
        },
        fullName: {
            minLength: 2,
            maxLength: 100,
            pattern: /^[a-zA-Z\s'-]+$/
        },
        teacherId: {
            minLength: 3,
            maxLength: 20,
            pattern: /^[a-zA-Z0-9-]+$/
        }
    }
};

// Validation functions
const validateInput = {
    email: (email) => {
        if (!email || typeof email !== 'string') return false;
        if (email.length > config.validation.email.maxLength) return false;
        return config.validation.email.pattern.test(email);
    },

    password: (password) => {
        if (!password || typeof password !== 'string') return false;
        const rules = config.validation.password;
        
        if (password.length < rules.minLength || password.length > rules.maxLength) return false;
        if (rules.requireUppercase && !/[A-Z]/.test(password)) return false;
        if (rules.requireLowercase && !/[a-z]/.test(password)) return false;
        if (rules.requireNumbers && !/\d/.test(password)) return false;
        if (rules.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
        
        return true;
    },

    username: (username) => {
        if (!username || typeof username !== 'string') return false;
        const rules = config.validation.username;
        if (username.length < rules.minLength || username.length > rules.maxLength) return false;
        return rules.pattern.test(username);
    },

    fullName: (fullName) => {
        if (!fullName || typeof fullName !== 'string') return false;
        const rules = config.validation.fullName;
        if (fullName.length < rules.minLength || fullName.length > rules.maxLength) return false;
        return rules.pattern.test(fullName);
    },

    teacherId: (teacherId) => {
        if (!teacherId || typeof teacherId !== 'string') return false;
        const rules = config.validation.teacherId;
        if (teacherId.length < rules.minLength || teacherId.length > rules.maxLength) return false;
        return rules.pattern.test(teacherId);
    }
};

// Sanitization functions
const sanitizeInput = {
    string: (input) => {
        if (typeof input !== 'string') return '';
        return input.trim().replace(/[<>]/g, '');
    },

    email: (email) => {
        return sanitizeInput.string(email).toLowerCase();
    },

    username: (username) => {
        return sanitizeInput.string(username).toLowerCase();
    }
};

module.exports = {
    config,
    validateInput,
    sanitizeInput
};
