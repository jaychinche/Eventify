
const jwt = require('jsonwebtoken');
const User = require('../models/User');


const isLoggedIn = (req, res, next) => {
    const token = req.cookies.token;
    // Check if the token exists
    if (!token) {
        req.flash('error_msg', 'Please provide all required fields');

        return res.redirect('/users/login');
    }
    try {
        // Verify the token
        const decoded = jwt.verify(token, 'your-secret-key'); // Replace with your actual secret key
        req.user = decoded; // Attach user info to the request object for later use
        next(); // Proceed to the next middleware or route
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token, user not logged in' });
    }
};
module.exports = isLoggedIn;