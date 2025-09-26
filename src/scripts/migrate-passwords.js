/**
 * Password Migration Script
 * Migrates existing plaintext passwords to hashed versions
 * 
 * IMPORTANT: Run this script ONCE to migrate existing data
 * This script should be run in a secure environment
 */

require('dotenv').config();
const admin = require('firebase-admin');
const authUtils = require('../utils/auth');

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

async function migrateAdminPasswords() {
    console.log('🔄 Starting admin password migration...');
    
    try {
        const adminSnapshot = await db.collection('admin').get();
        let migratedCount = 0;
        let skippedCount = 0;

        for (const doc of adminSnapshot.docs) {
            const data = doc.data();
            
            // Check if password is already hashed (bcrypt hashes start with $2b$)
            if (data.password && !data.password.startsWith('$2b$')) {
                console.log(`Migrating admin: ${data.username}`);
                
                // Hash the plaintext password
                const hashedPassword = await authUtils.hashPassword(data.password);
                
                // Update the document
                await doc.ref.update({
                    password: hashedPassword,
                    passwordMigrated: true,
                    migratedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                migratedCount++;
                console.log(`✅ Migrated admin: ${data.username}`);
            } else {
                console.log(`⏭️  Skipping admin: ${data.username} (already hashed)`);
                skippedCount++;
            }
        }

        console.log(`\n📊 Admin Migration Summary:`);
        console.log(`   Migrated: ${migratedCount}`);
        console.log(`   Skipped: ${skippedCount}`);
        console.log(`   Total: ${adminSnapshot.size}`);

    } catch (error) {
        console.error('❌ Error migrating admin passwords:', error);
        throw error;
    }
}

async function migrateTeacherPasswords() {
    console.log('\n🔄 Starting teacher password migration...');
    
    try {
        const teacherSnapshot = await db.collection('teacherData').get();
        let migratedCount = 0;
        let skippedCount = 0;

        for (const doc of teacherSnapshot.docs) {
            const data = doc.data();
            
            // Check if password is already hashed
            if (data.password && !data.password.startsWith('$2b$')) {
                console.log(`Migrating teacher: ${data.username || data.id}`);
                
                // Hash the plaintext password
                const hashedPassword = await authUtils.hashPassword(data.password);
                
                // Update the document
                await doc.ref.update({
                    password: hashedPassword,
                    passwordMigrated: true,
                    migratedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                migratedCount++;
                console.log(`✅ Migrated teacher: ${data.username || data.id}`);
            } else {
                console.log(`⏭️  Skipping teacher: ${data.username || data.id} (already hashed)`);
                skippedCount++;
            }
        }

        console.log(`\n📊 Teacher Migration Summary:`);
        console.log(`   Migrated: ${migratedCount}`);
        console.log(`   Skipped: ${skippedCount}`);
        console.log(`   Total: ${teacherSnapshot.size}`);

    } catch (error) {
        console.error('❌ Error migrating teacher passwords:', error);
        throw error;
    }
}

async function createDefaultAdmin() {
    console.log('\n🔄 Checking for default admin account...');
    
    try {
        const adminQuery = await db.collection('admin')
            .where('username', '==', 'admin')
            .get();

        if (adminQuery.empty) {
            console.log('Creating default admin account...');
            
            const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123!';
            const hashedPassword = await authUtils.hashPassword(defaultPassword);
            
            await db.collection('admin').add({
                username: 'admin',
                password: hashedPassword,
                email: process.env.ADMIN_EMAIL || 'admin@kamustapo.edu',
                role: 'admin',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: 'migration-script',
                passwordMigrated: true
            });
            
            console.log('✅ Default admin account created');
            console.log(`   Username: admin`);
            console.log(`   Password: ${defaultPassword}`);
            console.log('   ⚠️  CHANGE THE DEFAULT PASSWORD IMMEDIATELY!');
        } else {
            console.log('⏭️  Default admin account already exists');
        }

    } catch (error) {
        console.error('❌ Error creating default admin:', error);
        throw error;
    }
}

async function runMigration() {
    console.log('🚀 Starting password migration process...\n');
    
    try {
        // Migrate admin passwords
        await migrateAdminPasswords();
        
        // Migrate teacher passwords
        await migrateTeacherPasswords();
        
        // Create default admin if needed
        await createDefaultAdmin();
        
        console.log('\n🎉 Password migration completed successfully!');
        console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
        console.log('   1. Change any default passwords immediately');
        console.log('   2. Inform users that their passwords remain the same');
        console.log('   3. Consider implementing password reset functionality');
        console.log('   4. Delete this migration script after use');
        
    } catch (error) {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    runMigration();
}

module.exports = {
    migrateAdminPasswords,
    migrateTeacherPasswords,
    createDefaultAdmin,
    runMigration
};
