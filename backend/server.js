const express = require('express');
const Database = require('better-sqlite3');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(express.json());

// Initialize SQLite database
const dbPath = path.join(__dirname, 'data', 'sre-practice.db');
const db = new Database(dbPath);

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// Seed initial data
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (userCount === 0) {
    const insert = db.prepare('INSERT INTO users (name, email, role) VALUES (?, ?, ?)');
    const users = [
        ['Alice Johnson', 'alice@example.com', 'Developer'],
        ['Bob Smith', 'bob@example.com', 'SRE'],
        ['Charlie Brown', 'charlie@example.com', 'DevOps'],
        ['Diana Prince', 'diana@example.com', 'Manager'],
        ['Eve Davis', 'eve@example.com', 'QA Engineer']
    ];
    
    users.forEach(user => insert.run(...user));
    console.log('Database seeded with initial users');
}

// Health check endpoint
app.get('/health', (req, res) => {
    try {
        // Test database connection
        db.prepare('SELECT 1').get();
        
        res.json({
            status: 'healthy',
            database: 'connected',
            uptime: process.uptime().toFixed(2) + 's',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Metrics endpoint for SRE monitoring
app.get('/metrics', (req, res) => {
    try {
        const dbMetrics = db.prepare('SELECT COUNT(*) as count FROM users').get();
        
        res.json({
            uptime: process.uptime().toFixed(2) + 's',
            db_connections: 1, // SQLite has single connection
            total_users: dbMetrics.count,
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to collect metrics',
            message: error.message
        });
    }
});

// Get all users
app.get('/users', (req, res) => {
    try {
        const users = db.prepare('SELECT * FROM users ORDER BY id').all();
        res.json({
            users: users,
            count: users.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch users',
            message: error.message
        });
    }
});

// Get single user
app.get('/users/:id', (req, res) => {
    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
        if (user) {
            res.json({ user: user });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch user',
            message: error.message
        });
    }
});

// Create user
app.post('/users', (req, res) => {
    try {
        const { name, email, role } = req.body;
        
        if (!name || !email || !role) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['name', 'email', 'role']
            });
        }
        
        const insert = db.prepare('INSERT INTO users (name, email, role) VALUES (?, ?, ?)');
        const result = insert.run(name, email, role);
        
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ user: user });
    } catch (error) {
        if (error.message.includes('UNIQUE constraint')) {
            res.status(409).json({
                error: 'Email already exists',
                message: 'A user with this email already exists'
            });
        } else {
            res.status(500).json({
                error: 'Failed to create user',
                message: error.message
            });
        }
    }
});

// Simulate slow response for SRE practice
app.get('/slow', (req, res) => {
    const delay = parseInt(req.query.delay) || 5000;
    setTimeout(() => {
        res.json({
            message: 'Slow response completed',
            delay: delay + 'ms'
        });
    }, delay);
});

// Simulate error for SRE practice
app.get('/error', (req, res) => {
    res.status(500).json({
        error: 'Simulated error for SRE practice',
        message: 'This is a test error to practice debugging'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing database connection');
    db.close();
    server.close(() => {
        console.log('HTTP server closed');
    });
});

const server = app.listen(PORT, () => {
    console.log(`Backend service running on port ${PORT}`);
    console.log(`Database: ${dbPath}`);
});

module.exports = app;