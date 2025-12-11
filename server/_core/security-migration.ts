/**
 * Security Migration Script
 * Adds security-related fields to existing users table and creates new security tables
 */

import * as db from "../db";

export async function runSecurityMigration() {
  console.log("🔄 Running security migration...");

  const database = await db.getDb();
  if (!database) {
    throw new Error("Database not available");
  }

  try {
    // Add security fields to users table (if they don't exist)
    console.log("Adding security fields to users table...");

    const alterUserQueries = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS passwordHash VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS passwordSalt VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS failedLoginAttempts INT DEFAULT 0 NOT NULL`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS lastFailedLoginAt TIMESTAMP NULL`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS lockedUntil TIMESTAMP NULL`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS lastLoginAt TIMESTAMP NULL`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS passwordChangedAt TIMESTAMP NULL`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS requirePasswordChange BOOLEAN DEFAULT FALSE NOT NULL`,
    ];

    for (const query of alterUserQueries) {
      try {
        await database.execute(query);
      } catch (error) {
        // Ignore errors for columns that already exist
        console.log(`Column might already exist: ${error}`);
      }
    }

    // Create sessions table
    console.log("Creating sessions table...");
    await database.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sessionId VARCHAR(64) NOT NULL UNIQUE,
        userId INT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        lastAccessedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        expiresAt TIMESTAMP NOT NULL,
        ipAddress VARCHAR(45) NOT NULL,
        userAgent TEXT,
        isActive BOOLEAN DEFAULT TRUE NOT NULL,
        INDEX idx_sessions_user_id (userId),
        INDEX idx_sessions_session_id (sessionId),
        INDEX idx_sessions_expires_at (expiresAt)
      )
    `);

    // Create security_events table
    console.log("Creating security_events table...");
    await database.execute(`
      CREATE TABLE IF NOT EXISTS security_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('sql_injection_attempt', 'xss_attempt', 'invalid_file_upload', 'rate_limit_exceeded', 'unauthorized_access', 'suspicious_activity', 'csrf_violation', 'session_hijack_attempt') NOT NULL,
        severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
        description TEXT NOT NULL,
        details JSON,
        userId INT,
        ipAddress VARCHAR(45) NOT NULL,
        userAgent TEXT,
        endpoint VARCHAR(255),
        input TEXT,
        resolved BOOLEAN DEFAULT FALSE NOT NULL,
        resolvedBy INT,
        resolvedAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_security_events_type (type),
        INDEX idx_security_events_severity (severity),
        INDEX idx_security_events_user_id (userId),
        INDEX idx_security_events_created_at (createdAt)
      )
    `);

    // Create password_history table
    console.log("Creating password_history table...");
    await database.execute(`
      CREATE TABLE IF NOT EXISTS password_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        passwordHash VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_password_history_user_id (userId)
      )
    `);

    // Create rate_limit_violations table
    console.log("Creating rate_limit_violations table...");
    await database.execute(`
      CREATE TABLE IF NOT EXISTS rate_limit_violations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        identifier VARCHAR(100) NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        violationCount INT DEFAULT 1 NOT NULL,
        windowStart TIMESTAMP NOT NULL,
        windowEnd TIMESTAMP NOT NULL,
        blocked BOOLEAN DEFAULT FALSE NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_rate_limit_identifier (identifier),
        INDEX idx_rate_limit_endpoint (endpoint)
      )
    `);

    // Create file_uploads table
    console.log("Creating file_uploads table...");
    await database.execute(`
      CREATE TABLE IF NOT EXISTS file_uploads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        originalName VARCHAR(255) NOT NULL,
        storedName VARCHAR(255) NOT NULL,
        mimeType VARCHAR(100) NOT NULL,
        fileSize INT NOT NULL,
        uploadedBy INT NOT NULL,
        entityType VARCHAR(50) NOT NULL,
        entityId INT NOT NULL,
        category VARCHAR(100),
        scanStatus ENUM('pending', 'clean', 'infected', 'error') DEFAULT 'pending' NOT NULL,
        scanResult TEXT,
        isActive BOOLEAN DEFAULT TRUE NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_file_uploads_entity (entityType, entityId),
        INDEX idx_file_uploads_uploaded_by (uploadedBy)
      )
    `);

    // Add checksum column to audit_logs if it doesn't exist
    console.log("Adding checksum to audit_logs table...");
    try {
      await database.execute(`
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS checksum VARCHAR(64)
      `);
    } catch (error) {
      console.log("Checksum column might already exist:", error);
    }

    console.log("✅ Security migration completed successfully!");
    return true;
  } catch (error) {
    console.error("❌ Security migration failed:", error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runSecurityMigration()
    .then(() => {
      console.log("Migration completed");
      process.exit(0);
    })
    .catch(error => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
