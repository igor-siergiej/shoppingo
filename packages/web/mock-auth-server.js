const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 4002;

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(bodyParser.json());
app.use(cookieParser());

const users = new Map();
const refreshTokens = new Map(); // Store refresh tokens for users

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

const generateRefreshToken = (username) => {
    return `refresh-${username}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    console.log(`Mock login attempt for user: ${username}`);
    
    const accessToken = generateMockToken(username);
    const refreshToken = generateRefreshToken(username);
    
    if (!users.has(username)) {
        users.set(username, { username, password });
    }
    
    // Store refresh token
    refreshTokens.set(refreshToken, username);
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.status(200).json({
        token: accessToken,
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
    
    const accessToken = generateMockToken(username);
    const refreshToken = generateRefreshToken(username);
    
    users.set(username, { username, password });
    
    // Store refresh token
    refreshTokens.set(refreshToken, username);
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.status(201).json({
        token: accessToken,
        user: {
            username,
            id: `user-${username}`
        },
        message: 'Registration successful'
    });
});

app.post('/logout', (req, res) => {
    console.log('Mock logout request');
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken');
    
    // If refresh token is provided in request, remove it from storage
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken && refreshTokens.has(refreshToken)) {
        refreshTokens.delete(refreshToken);
    }
    
    res.status(200).json({
        message: 'Logout successful'
    });
});

app.post('/refresh', (req, res) => {
    console.log('Mock token refresh request');
    
    // Extract refresh token from cookies
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken || !refreshTokens.has(refreshToken)) {
        return res.status(401).json({
            error: 'Invalid or expired refresh token'
        });
    }
    
    // Get username from refresh token
    const username = refreshTokens.get(refreshToken);
    
    // Generate new access token and refresh token
    const newAccessToken = generateMockToken(username);
    const newRefreshToken = generateRefreshToken(username);
    
    // Remove old refresh token and store new one
    refreshTokens.delete(refreshToken);
    refreshTokens.set(newRefreshToken, username);
    
    // Set new refresh token as HTTP-only cookie
    res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.status(200).json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 3600 // 1 hour
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Mock authentication server running on http://localhost:${PORT}`);
});

module.exports = app;
