const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend-service:5000';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting for SRE practice
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', async (req, res) => {
    const startTime = Date.now();
    
    try {
        // Check backend health
        const backendResponse = await axios.get(`${BACKEND_URL}/health`, {
            timeout: 5000 // 5 second timeout for SRE monitoring
        });
        
        const responseTime = Date.now() - startTime;
        
        res.json({
            status: 'healthy',
            services: {
                gateway: 'up',
                backend: backendResponse.data.status
            },
            response_time: responseTime,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        const responseTime = Date.now() - startTime;
        res.status(503).json({
            status: 'degraded',
            services: {
                gateway: 'up',
                backend: 'down'
            },
            response_time: responseTime,
            message: `Backend service unavailable: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
});

// Metrics endpoint for SRE monitoring
app.get('/api/metrics', async (req, res) => {
    try {
        const gatewayMetrics = {
            uptime: process.uptime().toFixed(2) + 's',
            requests: requestCounter,
            memory: process.memoryUsage()
        };
        
        const backendResponse = await axios.get(`${BACKEND_URL}/metrics`, {
            timeout: 3000
        });
        
        res.json({
            gateway: gatewayMetrics,
            backend: backendResponse.data,
            avg_response_time: getAvgResponseTime().toFixed(2),
            error_rate: requestCounter > 0 ? ((errorCount / requestCounter) * 100).toFixed(2) : '0.00'
        });
    } catch (error) {
        res.status(503).json({
            error: 'Failed to collect metrics',
            message: error.message
        });
    }
});

// Proxy to backend - Users endpoint
app.get('/api/users', async (req, res) => {
    const startTime = Date.now();
    requestCounter++;
    
    try {
        const response = await axios.get(`${BACKEND_URL}/users`, {
            timeout: 10000 // 10 second timeout
        });
        
        const responseTime = Date.now() - startTime;
        updateAvgResponseTime(responseTime);
        
        res.json(response.data);
    } catch (error) {
        errorCount++;
        const responseTime = Date.now() - startTime;
        updateAvgResponseTime(responseTime);
        
        if (error.code === 'ECONNABORTED') {
            res.status(504).json({
                error: 'Backend timeout',
                message: 'Backend service took too long to respond'
            });
        } else if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(503).json({
                error: 'Backend unavailable',
                message: error.message
            });
        }
    }
});

// Serve static frontend
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Serve frontend static files
app.use(express.static(__dirname + '/public'));

// Metrics tracking
let requestCounter = 0;
let errorCount = 0;
let totalResponseTime = 0;
let responseCount = 0;

function updateAvgResponseTime(responseTime) {
    totalResponseTime += responseTime;
    responseCount++;
}

function getAvgResponseTime() {
    return responseCount > 0 ? totalResponseTime / responseCount : 0;
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

const server = app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
    console.log(`Backend URL: ${BACKEND_URL}`);
});

module.exports = app;