// src/lib/db.ts - Database connection utility
import mysql from 'mysql2/promise';

// Connection pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'newrootpassword',
  database: process.env.MYSQL_DATABASE || 'whatsapp_automation',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Execute SQL queries
export async function query(sql: string, params: any[] = []) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Create database tables if they don't exist
export async function initDatabase() {
  try {
    // Create companies table
    await query(`
      CREATE TABLE IF NOT EXISTS companies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        profile TEXT,
        sector VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create contacts table
    await query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      )
    `);

    // Create messages table
    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contact_id INT NOT NULL,
        message_text TEXT,
        status ENUM('pending', 'sent', 'delivered', 'read', 'failed') DEFAULT 'pending',
        error_message TEXT,
        sent_at TIMESTAMP NULL,
        delivered_at TIMESTAMP NULL,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      )
    `);

    // Create campaigns table
    await query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        total_contacts INT DEFAULT 0,
        sent_count INT DEFAULT 0,
        delivered_count INT DEFAULT 0,
        read_count INT DEFAULT 0,
        failed_count INT DEFAULT 0,
        status ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
        started_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create campaign_contacts junction table
    await query(`
      CREATE TABLE IF NOT EXISTS campaign_contacts (
        campaign_id INT NOT NULL,
        contact_id INT NOT NULL,
        PRIMARY KEY (campaign_id, contact_id),
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}