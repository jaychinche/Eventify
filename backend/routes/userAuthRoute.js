const express = require('express');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
router.use(express.static('../frontend'));
const session = require('express-session');

// Render registration page
router.get('/register', (req, res) => {
    res.render('signup');
});

// Render admin signup page
router.get('/adminsignup', (req, res) => {
    res.render('adminSignup');
});

// Register a new user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, confirmPassword, userType = 'student' } = req.body;

        if (!username || !email || !password || !confirmPassword) {
            req.flash('error', 'All fields are required');
            return res.redirect('/users/register');
        }

        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect('/users/register');
        }

        if (!['admin', 'student'].includes(userType)) {
            req.flash('error', 'Invalid user type');
            return res.redirect('/users/register');
        }

        // Check for existing user
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            req.flash('error', 'Username or email already exists');
            return res.redirect('/users/register');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Save new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            userType,
            lastLogin: null,
        });

        await newUser.save();
        res.redirect('/users/login');
    } catch (error) {
        req.flash('error', 'An internal server error occurred');
        res.redirect('/users/register');
    }
});

// Render login page
router.get('/login', (req, res) => {
    const message = req.flash('error'); // Retrieve error messages
    res.render('login', { message });
});

// User login
router.post('/login', async (req, res) => {
    const { username, password, userType } = req.body;
    try {
        // Find the user based on username
        const user = await User.findOne({ username });
        
        if (!user) {
            req.flash('error', 'Authentication failed: User not found');
            return res.redirect('/users/login');
        }

        // For admin user, check the default password
        if (userType === 'admin') {
            if (password !== '1234') {
                req.flash('error', 'Authentication failed: Incorrect admin password');
                return res.redirect('/users/login');
            }
        } else {
            // For student and other non-admin users, compare hashed password
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                req.flash('error', 'Authentication failed: Incorrect password');
                return res.redirect('/users/login');
            }
        }

        // Generate JWT token for both admin and student
        const token = jwt.sign({ userId: user._id, userType }, 'your-secret-key', { expiresIn: '1h' });

        // Set the token as a cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600000,
        });

        // Update last login time
        user.lastLogin = new Date();
        await user.save();

        // Redirect or respond with success depending on the user type
        return res.redirect('/dashboard');
    } catch (error) {
        req.flash('error', 'An internal server error occurred');
        res.redirect('/users/login');
    }
});

// User logout
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/users/login');
});

module.exports = router;
