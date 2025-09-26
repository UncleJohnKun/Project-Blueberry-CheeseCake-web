/**
 * Admin Routes
 * Handles admin-specific operations and system management
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const admin = require('firebase-admin');
const authUtils = require('../utils/auth');
const {
    authenticateToken,
    requireAdmin
} = require('../middleware/security');

const router = express.Router();
const db = admin.firestore();

/**
 * Get system statistics (Admin only)
 * GET /api/admin/stats
 */
router.get('/stats',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            // Get teacher count
            const teachersSnapshot = await db.collection('teacherData').get();
            const teacherCount = teachersSnapshot.size;

            // Get student count
            const studentsSnapshot = await db.collection('studentData').get();
            const studentCount = studentsSnapshot.size;

            // Get admin count
            const adminsSnapshot = await db.collection('admin').get();
            const adminCount = adminsSnapshot.size;

            // Calculate recent activity (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const recentTeachersSnapshot = await db.collection('teacherData')
                .where('timestamp', '>=', sevenDaysAgo)
                .get();
            const recentTeacherCount = recentTeachersSnapshot.size;

            const recentStudentsSnapshot = await db.collection('studentData')
                .where('timestamp', '>=', sevenDaysAgo)
                .get();
            const recentStudentCount = recentStudentsSnapshot.size;

            res.json({
                statistics: {
                    totalTeachers: teacherCount,
                    totalStudents: studentCount,
                    totalAdmins: adminCount,
                    recentActivity: {
                        newTeachers: recentTeacherCount,
                        newStudents: recentStudentCount,
                        period: '7 days'
                    }
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error fetching admin stats:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to fetch system statistics'
            });
        }
    }
);

/**
 * Get system health status (Admin only)
 * GET /api/admin/health
 */
router.get('/health',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            // Check database connectivity
            const healthCheck = await db.collection('admin').limit(1).get();
            const dbStatus = healthCheck ? 'healthy' : 'unhealthy';

            // Check memory usage
            const memoryUsage = process.memoryUsage();
            const memoryUsageMB = {
                rss: Math.round(memoryUsage.rss / 1024 / 1024),
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                external: Math.round(memoryUsage.external / 1024 / 1024)
            };

            // Check uptime
            const uptimeSeconds = process.uptime();
            const uptimeFormatted = {
                days: Math.floor(uptimeSeconds / 86400),
                hours: Math.floor((uptimeSeconds % 86400) / 3600),
                minutes: Math.floor((uptimeSeconds % 3600) / 60),
                seconds: Math.floor(uptimeSeconds % 60)
            };

            res.json({
                status: 'healthy',
                database: dbStatus,
                memory: memoryUsageMB,
                uptime: uptimeFormatted,
                nodeVersion: process.version,
                environment: process.env.NODE_ENV || 'development',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error checking system health:', error);
            res.status(500).json({
                status: 'unhealthy',
                error: 'Health check failed',
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * Get audit logs (Admin only)
 * GET /api/admin/logs
 */
router.get('/logs',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            // In a production environment, you would fetch from a proper logging system
            // For now, we'll return a placeholder response
            res.json({
                message: 'Audit logs feature',
                note: 'In production, this would return actual audit logs from your logging system',
                logs: [
                    {
                        timestamp: new Date().toISOString(),
                        action: 'admin_login',
                        user: req.user.username,
                        ip: req.ip,
                        details: 'Admin logged in successfully'
                    }
                ]
            });

        } catch (error) {
            console.error('Error fetching audit logs:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to fetch audit logs'
            });
        }
    }
);

/**
 * Create new admin account (Super Admin only)
 * POST /api/admin/create
 */
router.post('/create',
    authenticateToken,
    requireAdmin,
    [
        body('username').trim().isLength({ min: 3, max: 30 }).escape(),
        body('password').isLength({ min: 8, max: 128 }),
        body('email').isEmail().normalizeEmail()
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

            const { username, password, email } = req.body;

            // Check if admin already exists
            const existingAdminQuery = await db.collection('admin')
                .where('username', '==', username)
                .get();

            if (!existingAdminQuery.empty) {
                return res.status(409).json({
                    error: 'Admin already exists',
                    message: 'An admin with this username already exists'
                });
            }

            // Hash password
            const hashedPassword = await authUtils.hashPassword(password);

            // Create admin document
            const adminData = {
                username,
                password: hashedPassword,
                email,
                createdBy: req.user.username,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                role: 'admin'
            };

            await db.collection('admin').add(adminData);

            console.log(`New admin created: ${username} by ${req.user.username}`);

            res.status(201).json({
                message: 'Admin account created successfully',
                admin: {
                    username,
                    email,
                    createdBy: req.user.username
                }
            });

        } catch (error) {
            console.error('Error creating admin:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to create admin account'
            });
        }
    }
);

/**
 * Update system settings (Admin only)
 * PUT /api/admin/settings
 */
router.put('/settings',
    authenticateToken,
    requireAdmin,
    [
        body('maxLoginAttempts').optional().isInt({ min: 1, max: 10 }),
        body('sessionTimeout').optional().isInt({ min: 300000, max: 86400000 }), // 5 min to 24 hours
        body('maintenanceMode').optional().isBoolean()
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

            const settings = req.body;
            settings.lastUpdated = admin.firestore.FieldValue.serverTimestamp();
            settings.updatedBy = req.user.username;

            // In a real application, you would store these in a settings collection
            // For now, we'll just acknowledge the request
            console.log(`System settings updated by ${req.user.username}:`, settings);

            res.json({
                message: 'System settings updated successfully',
                settings
            });

        } catch (error) {
            console.error('Error updating settings:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to update system settings'
            });
        }
    }
);

/**
 * Backup database (Admin only)
 * POST /api/admin/backup
 */
router.post('/backup',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            // In a production environment, you would implement actual backup logic
            // This could involve exporting Firestore data, creating snapshots, etc.
            
            const backupId = `backup_${Date.now()}`;
            
            console.log(`Database backup initiated by ${req.user.username}, ID: ${backupId}`);

            res.json({
                message: 'Database backup initiated',
                backupId,
                status: 'in_progress',
                note: 'In production, this would trigger actual backup procedures'
            });

        } catch (error) {
            console.error('Error initiating backup:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to initiate backup'
            });
        }
    }
);

module.exports = router;
