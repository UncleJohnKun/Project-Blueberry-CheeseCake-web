/**
 * Secure Express Server for Kamusta Po Guro Admin Dashboard
 * Implements comprehensive security measures and API endpoints
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const compression = require('compression');
const morgan = require('morgan');

// Import security middleware
const {
    securityHeaders,
    corsMiddleware,
    apiRateLimiter,
    errorHandler
} = require('./middleware/security');

// Import route handlers
const authRoutes = require('./routes/auth');
const teacherRoutes = require('./routes/teachers');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Security middleware
app.use(securityHeaders);
app.use(corsMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting for API routes
app.use('/api', apiRateLimiter);

// Serve static files with security headers
app.use(express.static(path.join(__dirname), {
    setHeaders: (res, path) => {
        // Add security headers for static files
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        
        // Cache control for different file types
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (path.endsWith('.js') || path.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
    }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '2.0.0'
    });
});

// Serve HTML files with CSRF token injection
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/home.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});

app.get('/createAccount.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'createAccount.html'));
});

app.get('/teacherInfo.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'teacherInfo.html'));
});

app.get('/teacherPortal.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'teacherPortal.html'));
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        message: `The requested endpoint ${req.originalUrl} does not exist`
    });
});

// 404 handler for other routes
app.use('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Secure server running on port ${PORT}`);
    console.log(`🔒 Security features enabled`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    if (process.env.NODE_ENV === 'development') {
        console.log(`🌐 Local access: http://localhost:${PORT}`);
    }
});

module.exports = app;
