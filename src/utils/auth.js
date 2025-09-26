/**
 * Authentication Utilities
 * Secure password hashing, JWT token management, and session handling
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { config } = require('../config/security');

class AuthUtils {
    constructor() {
        this.loginAttempts = new Map(); // In production, use Redis or database
        this.blacklistedTokens = new Set(); // In production, use Redis
    }

    /**
     * Hash password using bcrypt
     * @param {string} password - Plain text password
     * @returns {Promise<string>} - Hashed password
     */
    async hashPassword(password) {
        try {
            const salt = await bcrypt.genSalt(config.bcrypt.rounds);
            return await bcrypt.hash(password, salt);
        } catch (error) {
            throw new Error('Password hashing failed');
        }
    }

    /**
     * Verify password against hash
     * @param {string} password - Plain text password
     * @param {string} hash - Hashed password
     * @returns {Promise<boolean>} - Password match result
     */
    async verifyPassword(password, hash) {
        try {
            return await bcrypt.compare(password, hash);
        } catch (error) {
            return false;
        }
    }

    /**
     * Generate JWT token
     * @param {object} payload - Token payload
     * @param {string} expiresIn - Token expiration
     * @returns {string} - JWT token
     */
    generateToken(payload, expiresIn = config.jwt.expiresIn) {
        return jwt.sign(payload, config.jwt.secret, { expiresIn });
    }

    /**
     * Generate refresh token
     * @param {object} payload - Token payload
     * @returns {string} - Refresh token
     */
    generateRefreshToken(payload) {
        return jwt.sign(payload, config.jwt.secret, { 
            expiresIn: config.jwt.refreshExpiresIn 
        });
    }

    /**
     * Verify JWT token
     * @param {string} token - JWT token
     * @returns {object|null} - Decoded payload or null
     */
    verifyToken(token) {
        try {
            if (this.blacklistedTokens.has(token)) {
                return null;
            }
            return jwt.verify(token, config.jwt.secret);
        } catch (error) {
            return null;
        }
    }

    /**
     * Blacklist token (for logout)
     * @param {string} token - JWT token to blacklist
     */
    blacklistToken(token) {
        this.blacklistedTokens.add(token);
        // In production, set expiration in Redis
        setTimeout(() => {
            this.blacklistedTokens.delete(token);
        }, 3600000); // 1 hour
    }

    /**
     * Check if user is rate limited
     * @param {string} identifier - User identifier (IP, email, etc.)
     * @returns {boolean} - Whether user is rate limited
     */
    isRateLimited(identifier) {
        const attempts = this.loginAttempts.get(identifier);
        if (!attempts) return false;

        const { count, lastAttempt } = attempts;
        const timeSinceLastAttempt = Date.now() - lastAttempt;

        // Reset attempts if lockout period has passed
        if (timeSinceLastAttempt > config.session.lockoutDuration) {
            this.loginAttempts.delete(identifier);
            return false;
        }

        return count >= config.session.maxLoginAttempts;
    }

    /**
     * Record failed login attempt
     * @param {string} identifier - User identifier
     */
    recordFailedAttempt(identifier) {
        const attempts = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
        attempts.count += 1;
        attempts.lastAttempt = Date.now();
        this.loginAttempts.set(identifier, attempts);

        // Auto-cleanup after lockout duration
        setTimeout(() => {
            this.loginAttempts.delete(identifier);
        }, config.session.lockoutDuration);
    }

    /**
     * Clear failed attempts (on successful login)
     * @param {string} identifier - User identifier
     */
    clearFailedAttempts(identifier) {
        this.loginAttempts.delete(identifier);
    }

    /**
     * Generate secure random string
     * @param {number} length - String length
     * @returns {string} - Random string
     */
    generateSecureRandom(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Generate CSRF token
     * @returns {string} - CSRF token
     */
    generateCSRFToken() {
        return this.generateSecureRandom(32);
    }

    /**
     * Verify CSRF token
     * @param {string} token - CSRF token
     * @param {string} sessionToken - Session CSRF token
     * @returns {boolean} - Token validity
     */
    verifyCSRFToken(token, sessionToken) {
        return token && sessionToken && token === sessionToken;
    }

    /**
     * Create secure session data
     * @param {object} user - User data
     * @returns {object} - Session data with tokens
     */
    createSession(user) {
        const payload = {
            id: user.id,
            username: user.username,
            role: user.role || 'teacher',
            iat: Math.floor(Date.now() / 1000)
        };

        const accessToken = this.generateToken(payload);
        const refreshToken = this.generateRefreshToken(payload);
        const csrfToken = this.generateCSRFToken();

        return {
            accessToken,
            refreshToken,
            csrfToken,
            expiresIn: config.jwt.expiresIn,
            user: {
                id: user.id,
                username: user.username,
                fullname: user.fullname,
                email: user.email,
                role: user.role || 'teacher'
            }
        };
    }

    /**
     * Refresh access token
     * @param {string} refreshToken - Refresh token
     * @returns {object|null} - New session data or null
     */
    refreshSession(refreshToken) {
        const decoded = this.verifyToken(refreshToken);
        if (!decoded) return null;

        const payload = {
            id: decoded.id,
            username: decoded.username,
            role: decoded.role,
            iat: Math.floor(Date.now() / 1000)
        };

        const accessToken = this.generateToken(payload);
        const csrfToken = this.generateCSRFToken();

        return {
            accessToken,
            csrfToken,
            expiresIn: config.jwt.expiresIn
        };
    }
}

module.exports = new AuthUtils();
