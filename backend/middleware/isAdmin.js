const jwt = require('jsonwebtoken');
const User = require('../models/User');


const isAdmin = async (req, res, next) => {
    const token = req.cookies.token;

    // Check if the token exists
    if (!token) {
        req.flash('error_msg', 'Please log in to access this page.');
        return res.redirect('/users/login');
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, 'your-secret-key'); // Replace with your actual secret key
        req.user = decoded; // Attach decoded token to the request

        // Fetch the user from the database
        const user = await User.findById(req.user.userId);

        // Check if user exists and is an admin
        if (user && user.userType === 'admin') {
            req.user = user; // Attach user object to the request
            next(); // User is an admin, proceed
        } else {
            req.flash('error_msg', 'Unauthorized access, admin only!');
            return res.redirect('/dashboard');
        }
    } catch (error) {
        console.error('Error verifying admin access:', error);
        req.flash('error_msg', 'Invalid or expired token, please log in again.');
        return res.redirect('/dashboard');
    }
};
module.exports = isAdmin;


 