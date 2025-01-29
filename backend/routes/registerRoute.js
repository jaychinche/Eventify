const express = require('express');
const jwt = require('jsonwebtoken');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const mongoose = require('mongoose');
const router = express.Router({ mergeParams: true });
const User = require('../models/User');
const isLoggedIn = require('../middleware/isLoggedIn');

router.use(express.static('../frontend'));

// Register event route
router.get('/:id', isLoggedIn, (req, res) => {
    res.render('registrationEvent', { eventId: req.params.id });
});

// Event details route
router.get('/', async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            req.flash('error', 'You must log in to access this page');
            return res.redirect('/users/login');
        }

        const decoded = jwt.verify(token, 'your-secret-key');
        req.user = decoded;

        const user = await User.findById(req.user.userId);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/users/login');
        }

        const eventId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            req.flash('error', 'Invalid Event ID');
            return res.redirect('/events');
        }

        const event = await Event.findById(eventId);
        if (!event) {
            req.flash('error', 'Event not found');
            return res.redirect('/dashboard');
        }

        res.render('eventdetatil', { event, user, token });
    } catch (err) {
        console.error('Error fetching event details:', err.message);
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/dashboard');
    }
});

// Event registration route
router.post('/:id', async (req, res) => {
    try {
        const eventId = req.params.id;
        const token = req.cookies.token;
        if (!token) {
            req.flash('error', 'No token provided. Please log in.');
            return res.redirect('/users/login');
        }

        const decoded = jwt.verify(token, 'your-secret-key');
        const { fullName, email, phoneNumber, additionalComments } = req.body;

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            req.flash('error', 'Invalid Event ID format');
            return res.redirect('/dashboard');
        }

        const event = await Event.findById(eventId);
        if (!event) {
            req.flash('error', 'Event not found');
            return res.redirect('/dashboard');
        }

        const registration = new Registration({
            event: eventId,
            student: decoded.userId,
            fullName,
            email,
            phoneNumber,
            additionalComments,
        });

        await registration.save();
        req.flash('success', 'Registration successful! Proceed to payment.');
        res.redirect('/payment');
    } catch (error) {
        console.error('Server error:', error.message);

        if (error.name === 'JsonWebTokenError') {
            req.flash('error', 'Invalid token');
            return res.redirect('/users/login');
        } else if (error.name === 'TokenExpiredError') {
            req.flash('error', 'Session expired. Please log in again.');
            return res.redirect('/users/login');
        }

        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/events');
    }
});

module.exports = router;
