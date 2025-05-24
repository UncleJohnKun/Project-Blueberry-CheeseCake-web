/**
 * Authentication Routes
 * Handles secure login, logout, and token management
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const admin = require('firebase-admin');
const authUtils = require('../utils/auth');
const {
    authRateLimiter,
    trackLoginAttempts,
    validateInputMiddleware,
    validationRules,
    authenticateToken
} = require('../middleware/security');

const router = express.Router();

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

const db = admin.firestore();

/**
 * Admin Login
 * POST /api/auth/admin/login
 */
router.post('/admin/login', 
    authRateLimiter,
    trackLoginAttempts,
    [
        body('username').trim().isLength({ min: 3, max: 30 }).escape(),
        body('password').isLength({ min: 1, max: 128 })
    ],
    async (req, res) => {
        try {
            // Validate input
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { username, password } = req.body;
            const loginIdentifier = req.loginIdentifier;

            // Query admin collection
            const adminQuery = await db.collection('admin')
                .where('username', '==', username)
                .limit(1)
                .get();

            if (adminQuery.empty) {
                authUtils.recordFailedAttempt(loginIdentifier);
                return res.status(401).json({
                    error: 'Authentication failed',
                    message: 'Invalid credentials'
                });
            }

            const adminDoc = adminQuery.docs[0];
            const adminData = adminDoc.data();

            // Verify password
            const isValidPassword = await authUtils.verifyPassword(password, adminData.password);
            if (!isValidPassword) {
                authUtils.recordFailedAttempt(loginIdentifier);
                return res.status(401).json({
                    error: 'Authentication failed',
                    message: 'Invalid credentials'
                });
            }

            // Clear failed attempts on successful login
            authUtils.clearFailedAttempts(loginIdentifier);

            // Create session
            const sessionData = authUtils.createSession({
                id: adminDoc.id,
                username: adminData.username,
                email: adminData.email,
                role: 'admin'
            });

            // Log successful login
            console.log(`Admin login successful: ${username} from ${req.ip}`);

            res.json({
                message: 'Login successful',
                ...sessionData
            });

        } catch (error) {
            console.error('Admin login error:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Login failed'
            });
        }
    }
);

/**
 * Teacher Login
 * POST /api/auth/teacher/login
 */
router.post('/teacher/login',
    authRateLimiter,
    trackLoginAttempts,
    [
        body('username').trim().isLength({ min: 3, max: 30 }).escape(),
        body('password').isLength({ min: 1, max: 128 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { username, password } = req.body;
            const loginIdentifier = req.loginIdentifier;

            // Query teacher collection
            const teacherQuery = await db.collection('teacherData')
                .where('username', '==', username)
                .limit(1)
                .get();

            if (teacherQuery.empty) {
                authUtils.recordFailedAttempt(loginIdentifier);
                return res.status(401).json({
                    error: 'Authentication failed',
                    message: 'Invalid credentials'
                });
            }

            const teacherDoc = teacherQuery.docs[0];
            const teacherData = teacherDoc.data();

            // Verify password
            const isValidPassword = await authUtils.verifyPassword(password, teacherData.password);
            if (!isValidPassword) {
                authUtils.recordFailedAttempt(loginIdentifier);
                return res.status(401).json({
                    error: 'Authentication failed',
                    message: 'Invalid credentials'
                });
            }

            authUtils.clearFailedAttempts(loginIdentifier);

            // Create session
            const sessionData = authUtils.createSession({
                id: teacherData.id,
                username: teacherData.username,
                email: teacherData.email,
                fullname: teacherData.fullname,
                role: 'teacher'
            });

            console.log(`Teacher login successful: ${username} from ${req.ip}`);

            res.json({
                message: 'Login successful',
                ...sessionData
            });

        } catch (error) {
            console.error('Teacher login error:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Login failed'
            });
        }
    }
);

/**
 * Refresh Token
 * POST /api/auth/refresh
 */
router.post('/refresh',
    [body('refreshToken').notEmpty()],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { refreshToken } = req.body;
            const newSession = authUtils.refreshSession(refreshToken);

            if (!newSession) {
                return res.status(401).json({
                    error: 'Token refresh failed',
                    message: 'Invalid or expired refresh token'
                });
            }

            res.json({
                message: 'Token refreshed successfully',
                ...newSession
            });

        } catch (error) {
            console.error('Token refresh error:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Token refresh failed'
            });
        }
    }
);

/**
 * Logout
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            authUtils.blacklistToken(token);
        }

        console.log(`User logout: ${req.user.username} from ${req.ip}`);

        res.json({
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Logout failed'
        });
    }
});

/**
 * Get current user info
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, (req, res) => {
    res.json({
        user: req.user
    });
});

module.exports = router;
