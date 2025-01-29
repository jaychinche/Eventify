const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    media: {
        type: String, 
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    location: {
        type: String,
        required: true
    },
    organizer: {
        type: String,
        required: false, // Name of the organizer
    },

});

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
