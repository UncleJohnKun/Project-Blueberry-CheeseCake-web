/**
 * Teacher Management Routes
 * Handles CRUD operations for teacher accounts
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const admin = require('firebase-admin');
const authUtils = require('../utils/auth');
const {
    authenticateToken,
    requireAdmin,
    validateInputMiddleware,
    validationRules
} = require('../middleware/security');

const router = express.Router();
const db = admin.firestore();

/**
 * Calculate student progress based on completed levels
 */
function calculateStudentProgress(studentData) {
    if (!studentData) return 0;

    let completedLevels = 0;
    let totalLevels = 10; // Assuming 10 levels total

    // Count completed levels
    for (let i = 1; i <= totalLevels; i++) {
        const levelFinishField = `level${i}Finish`;
        if (studentData[levelFinishField] === true) {
            completedLevels++;
        }
    }

    return completedLevels / totalLevels;
}

/**
 * Get all teachers (Admin only)
 * GET /api/teachers
 */
router.get('/', 
    authenticateToken, 
    requireAdmin,
    async (req, res) => {
        try {
            const teachersSnapshot = await db.collection('teacherData')
                .orderBy('timestamp', 'desc')
                .limit(300)
                .get();

            const teachers = [];
            teachersSnapshot.forEach(doc => {
                const data = doc.data();
                // Remove sensitive data
                delete data.password;
                teachers.push({
                    id: doc.id,
                    ...data
                });
            });

            res.json({
                teachers,
                total: teachers.length
            });

        } catch (error) {
            console.error('Error fetching teachers:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to fetch teachers'
            });
        }
    }
);

/**
 * Get specific teacher by ID
 * GET /api/teachers/:id
 */
router.get('/:id',
    authenticateToken,
    [param('id').trim().isLength({ min: 1, max: 50 }).escape()],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { id } = req.params;

            // Check if user is admin or accessing their own data
            if (req.user.role !== 'admin' && req.user.id !== id) {
                return res.status(403).json({
                    error: 'Access denied',
                    message: 'You can only access your own data'
                });
            }

            // First try to find by document ID, then by id field
            let teacherDoc = await db.collection('teacherData').doc(id).get();
            let teacherData = null;
            let docId = id;

            if (teacherDoc.exists) {
                teacherData = teacherDoc.data();
                docId = teacherDoc.id;
            } else {
                // If not found by document ID, search by id field
                const teacherQuery = await db.collection('teacherData')
                    .where('id', '==', id)
                    .limit(1)
                    .get();

                if (!teacherQuery.empty) {
                    teacherDoc = teacherQuery.docs[0];
                    teacherData = teacherDoc.data();
                    docId = teacherDoc.id;
                }
            }

            if (!teacherData) {
                return res.status(404).json({
                    error: 'Teacher not found',
                    message: 'The requested teacher does not exist'
                });
            }

            // Remove password from response
            delete teacherData.password;

            res.json({
                id: docId,
                ...teacherData
            });

        } catch (error) {
            console.error('Error fetching teacher:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to fetch teacher data'
            });
        }
    }
);

/**
 * Get students for a specific teacher
 * GET /api/teachers/:id/students
 */
router.get('/:id/students',
    authenticateToken,
    [param('id').trim().isLength({ min: 1, max: 50 }).escape()],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { id } = req.params;

            // Check if user is admin or accessing their own students
            if (req.user.role !== 'admin' && req.user.id !== id) {
                return res.status(403).json({
                    error: 'Access denied',
                    message: 'You can only access your own students'
                });
            }

            // Query students by teacherID field (which links students to teachers)
            const studentsSnapshot = await db.collection('studentData')
                .where('teacherID', '==', id)
                .get();

            const students = [];
            studentsSnapshot.forEach(doc => {
                const studentData = doc.data();
                students.push({
                    id: doc.id,
                    ...studentData,
                    // Calculate progress if level data exists
                    progress: calculateStudentProgress(studentData),
                    // Format last active date
                    lastActive: studentData.timestamp || null
                });
            });

            res.json({
                students,
                total: students.length,
                teacherId: id
            });

        } catch (error) {
            console.error('Error fetching students:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to fetch students'
            });
        }
    }
);

/**
 * Create new teacher account (Admin only)
 * POST /api/teachers
 */
router.post('/',
    authenticateToken,
    requireAdmin,
    validateInputMiddleware(validationRules.createTeacher),
    async (req, res) => {
        try {
            const { email, fullname, username, password, id } = req.body;

            // Check if teacher ID or email already exists
            const existingTeacherQuery = await db.collection('teacherData')
                .where('id', '==', id)
                .get();

            const existingEmailQuery = await db.collection('teacherData')
                .where('email', '==', email)
                .get();

            if (!existingTeacherQuery.empty) {
                return res.status(409).json({
                    error: 'Teacher ID already exists',
                    message: 'A teacher with this ID already exists'
                });
            }

            if (!existingEmailQuery.empty) {
                return res.status(409).json({
                    error: 'Email already exists',
                    message: 'A teacher with this email already exists'
                });
            }

            // Hash password
            const hashedPassword = await authUtils.hashPassword(password);

            // Create teacher document
            const teacherData = {
                email,
                fullname,
                username,
                password: hashedPassword,
                id,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                totalStudents: 0,
                rizal_questions: {
                    level1: [
                        { question: "What is the real name of Dr. Jose Rizal?", answer: "Jose Protasio Rizal Mercado y Alonso Realonda" },
                        { question: "Where was Dr. Jose Rizal born?", answer: "Calamba, Laguna" },
                        { question: "What are the two famous novels written by Dr. Jose Rizal?", answer: "Noli Me Tangere and El Filibusterismo" }
                    ],
                    level2: [
                        { question: "What was the pen name used by Dr. Jose Rizal?", answer: "Laong Laan" },
                        { question: "In what year was Dr. Jose Rizal executed?", answer: "1896" },
                        { question: "What was the name of Dr. Jose Rizal's sweetheart?", answer: "Josephine Bracken" }
                    ]
                },
                levelUnlocks: {
                    level1: true,
                    level2: false
                }
            };

            await db.collection('teacherData').doc(id).set(teacherData);

            // Log teacher creation
            console.log(`Teacher account created: ${username} by admin ${req.user.username}`);

            // Return success without password
            const responseData = { ...teacherData };
            delete responseData.password;

            res.status(201).json({
                message: 'Teacher account created successfully',
                teacher: responseData
            });

        } catch (error) {
            console.error('Error creating teacher:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to create teacher account'
            });
        }
    }
);

/**
 * Update teacher information
 * PUT /api/teachers/:id
 */
router.put('/:id',
    authenticateToken,
    [
        param('id').trim().isLength({ min: 1, max: 50 }).escape(),
        body('email').optional().isEmail().normalizeEmail(),
        body('fullname').optional().trim().isLength({ min: 2, max: 100 }).escape(),
        body('username').optional().trim().isLength({ min: 3, max: 30 }).escape()
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

            const { id } = req.params;
            const updates = req.body;

            // Check permissions
            if (req.user.role !== 'admin' && req.user.id !== id) {
                return res.status(403).json({
                    error: 'Access denied',
                    message: 'You can only update your own data'
                });
            }

            // Remove sensitive fields that shouldn't be updated this way
            delete updates.password;
            delete updates.id;
            delete updates.timestamp;

            // Add update timestamp
            updates.lastUpdated = admin.firestore.FieldValue.serverTimestamp();

            await db.collection('teacherData').doc(id).update(updates);

            console.log(`Teacher updated: ${id} by ${req.user.username}`);

            res.json({
                message: 'Teacher updated successfully',
                updates
            });

        } catch (error) {
            console.error('Error updating teacher:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to update teacher'
            });
        }
    }
);

/**
 * Delete teacher account (Admin only)
 * DELETE /api/teachers/:id
 */
router.delete('/:id',
    authenticateToken,
    requireAdmin,
    [param('id').trim().isLength({ min: 1, max: 50 }).escape()],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { id } = req.params;

            // Check if teacher exists
            const teacherDoc = await db.collection('teacherData').doc(id).get();
            if (!teacherDoc.exists) {
                return res.status(404).json({
                    error: 'Teacher not found',
                    message: 'The requested teacher does not exist'
                });
            }

            await db.collection('teacherData').doc(id).delete();

            console.log(`Teacher deleted: ${id} by admin ${req.user.username}`);

            res.json({
                message: 'Teacher account deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting teacher:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to delete teacher'
            });
        }
    }
);

module.exports = router;
