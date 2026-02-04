const jwt = require('jsonwebtoken');
require('dotenv').config();

const auth = (req, res, next) => {
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

        req.user = decoded.user;
        
        next();

    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};

module.exports = auth;