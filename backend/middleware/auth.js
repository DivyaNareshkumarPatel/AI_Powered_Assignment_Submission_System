const jwt = require('jsonwebtoken');
require('dotenv').config();

// Renamed from 'auth' to 'verifyToken' to match your routes
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        const tokenString = token.replace('Bearer ', '');
        
        const decoded = jwt.verify(
            tokenString, 
            process.env.JWT_SECRET || 'secret123'
        );

        // Attach the user payload to the request object
        req.user = decoded.user; 
        
        next();

    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};

// Added missing checkRole function
const checkRole = (roles) => {
    return (req, res, next) => {
        // Ensure req.user exists and their role matches the required roles
        if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied: insufficient permissions' });
        }
        next();
    };
};

// Export both functions as an object so destructuring works in your routes
module.exports = { verifyToken, checkRole };