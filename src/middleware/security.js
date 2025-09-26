/**
 * Security Middleware
 * Implements various security measures for the application
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { config, validateInput, sanitizeInput } = require('../config/security');
const authUtils = require('../utils/auth');

/**
 * Rate limiting middleware
 */
const createRateLimiter = (windowMs = config.rateLimit.windowMs, max = config.rateLimit.maxRequests) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            error: 'Too many requests from this IP, please try again later.',
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                error: 'Rate limit exceeded',
                message: 'Too many requests from this IP, please try again later.',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
    });
};

/**
 * Strict rate limiter for authentication endpoints
 */
const authRateLimiter = createRateLimiter(900000, 10); // 10 attempts per 15 minutes

/**
 * General API rate limiter
 */
const apiRateLimiter = createRateLimiter();

/**
 * Security headers middleware
 */
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: config.securityHeaders.contentSecurityPolicy.directives,
        reportOnly: false
    },
    hsts: {
        maxAge: config.securityHeaders.hsts.maxAge,
        includeSubDomains: config.securityHeaders.hsts.includeSubDomains,
        preload: config.securityHeaders.hsts.preload
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'same-origin' },
    frameguard: { action: 'deny' }
});

/**
 * CORS middleware
 */
const corsMiddleware = cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-CSRF-Token']
});

/**
 * Input validation middleware
 */
const validateInputMiddleware = (validationRules) => {
    return (req, res, next) => {
        const errors = [];

        for (const [field, rules] of Object.entries(validationRules)) {
            const value = req.body[field];

            if (rules.required && (!value || value.trim() === '')) {
                errors.push(`${field} is required`);
                continue;
            }

            if (value && rules.validate && !rules.validate(value)) {
                errors.push(`${field} is invalid`);
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors
            });
        }

        // Sanitize inputs
        for (const [field, rules] of Object.entries(validationRules)) {
            if (req.body[field] && rules.sanitize) {
                req.body[field] = rules.sanitize(req.body[field]);
            }
        }

        next();
    };
};

/**
 * Authentication middleware
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            error: 'Access denied',
            message: 'No token provided'
        });
    }

    const decoded = authUtils.verifyToken(token);
    if (!decoded) {
        return res.status(403).json({
            error: 'Access denied',
            message: 'Invalid or expired token'
        });
    }

    req.user = decoded;
    next();
};

/**
 * Admin authorization middleware
 */
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Access denied',
            message: 'Admin privileges required'
        });
    }
    next();
};

/**
 * CSRF protection middleware
 */
const csrfProtection = (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
        return next();
    }

    const token = req.headers['x-csrf-token'];
    const sessionToken = req.session?.csrfToken;

    if (!authUtils.verifyCSRFToken(token, sessionToken)) {
        return res.status(403).json({
            error: 'CSRF token validation failed',
            message: 'Invalid or missing CSRF token'
        });
    }

    next();
};

/**
 * Login attempt tracking middleware
 */
const trackLoginAttempts = (req, res, next) => {
    const identifier = req.ip + ':' + (req.body.username || req.body.email || '');

    if (authUtils.isRateLimited(identifier)) {
        return res.status(429).json({
            error: 'Account temporarily locked',
            message: 'Too many failed login attempts. Please try again later.',
            retryAfter: Math.ceil(config.session.lockoutDuration / 1000)
        });
    }

    req.loginIdentifier = identifier;
    next();
};

/**
 * Validation rules for different endpoints
 */
const validationRules = {
    login: {
        username: {
            required: true,
            validate: validateInput.username,
            sanitize: sanitizeInput.username
        },
        password: {
            required: true,
            validate: (password) => password && password.length >= 1,
            sanitize: sanitizeInput.string
        }
    },
    
    createTeacher: {
        email: {
            required: true,
            validate: validateInput.email,
            sanitize: sanitizeInput.email
        },
        fullname: {
            required: true,
            validate: validateInput.fullName,
            sanitize: sanitizeInput.string
        },
        username: {
            required: true,
            validate: validateInput.username,
            sanitize: sanitizeInput.username
        },
        password: {
            required: true,
            validate: validateInput.password,
            sanitize: sanitizeInput.string
        },
        id: {
            required: true,
            validate: validateInput.teacherId,
            sanitize: sanitizeInput.string
        }
    }
};

/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('Security middleware error:', err);

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
        error: 'Internal server error',
        message: isDevelopment ? err.message : 'Something went wrong'
    });
};

module.exports = {
    authRateLimiter,
    apiRateLimiter,
    securityHeaders,
    corsMiddleware,
    validateInputMiddleware,
    authenticateToken,
    requireAdmin,
    csrfProtection,
    trackLoginAttempts,
    validationRules,
    errorHandler
};
