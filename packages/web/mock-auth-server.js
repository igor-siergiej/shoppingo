const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 4002;

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(bodyParser.json());

const users = new Map();

const generateMockToken = (username) => {
    // Create a proper JWT-like structure with user data
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
        username: username,
        id: `user-${username}`,
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        iat: Math.floor(Date.now() / 1000)
    }));
    const signature = btoa('mock-signature');
    
    return `${header}.${payload}.${signature}`;
};

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    console.log(`Mock login attempt for user: ${username}`);
    
    const token = generateMockToken(username);
    
    if (!users.has(username)) {
        users.set(username, { username, password });
    }
    
    res.status(200).json({
        token,
        user: {
            username,
            id: `user-${username}`
        },
        message: 'Login successful'
    });
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    
    console.log(`Mock registration attempt for user: ${username}`);
    
    const token = generateMockToken(username);
    
    users.set(username, { username, password });
    
    res.status(201).json({
        token,
        user: {
            username,
            id: `user-${username}`
        },
        message: 'Registration successful'
    });
});

app.post('/logout', (req, res) => {
    console.log('Mock logout request');
    
    res.status(200).json({
        message: 'Logout successful'
    });
});

app.post('/refresh', (req, res) => {
    console.log('Mock token refresh request');
    
    // Generate a new token with a default user (you might want to extract from the request)
    const newToken = generateMockToken('mockuser');
    
    res.status(200).json({
        accessToken: newToken,
        refreshToken: `mock-refresh-token-${Date.now()}`,
        expiresIn: 3600 // 1 hour
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Mock authentication server running on http://localhost:${PORT}`);
});

module.exports = app;
