const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Event = require("../models/Event");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const http = require("http");

const router = express.Router();

router.use(express.static("../frontend"));

// Render "addevent" page
router.get("/", (req, res) => {
    res.render("addevent");
});

// Render "eventedit" page by ID
router.get("/:id", async (req, res) => {
    try {
        const eventId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            req.flash("error", "Invalid event ID");
            return res.redirect("/dashboard");
        }

        const event = await Event.findById(eventId);
        if (!event) {
            req.flash("error", "Event not found");
            return res.redirect("/dashboard");
        }

        res.render("eventedit", { event });
    } catch (error) {
        console.error("Server error:", error.message);
        req.flash("error", "Server error");
        res.redirect("/dashboard");
    }
});

// Create a new event and send an email notification
router.post("/", async (req, res) => {
    try {
        const { title, content, media, location, date } = req.body;

        const newEvent = new Event({ title, content, media, date, location });
        await newEvent.save();

        const users = await User.find({}, "email");
        const emailList = users.map((user) => user.email);

        if (emailList.length === 0) {
            req.flash("error", "No recipients found for email notifications");
            return res.redirect("/dashboard");
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            secure: true,
            auth: {
                user: "chinchejay@gmail.com",
                  pass: "xtqf ftin fnvq rgqp"
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: emailList,
            subject: `New Event: ${title}`,
            text: `Dear Students,\n\nWe are excited to announce a new event: "${title}".\n\nDetails:\n${content}\n\nDate: ${date}\nLocation: ${location}\n\nPlease register and join us!\n\nBest regards,\nEvent Team`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error.message);
                req.flash("error", "Error sending email");
                return res.redirect("/dashboard");
            }
            console.log("Emails sent successfully:", info.response);
        });

        res.redirect("/dashboard");
    } catch (error) {
        console.error("Server error:", error.message);
        req.flash("error", "Server error");
        res.redirect("/dashboard");
    }
});

// Update event by ID
router.put("/:id", async (req, res) => {
    try {
        const { title, content, media } = req.body;

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            { title, content, media },
            { new: true }
        );

        if (!updatedEvent) {
            req.flash("error", "Event not found");
            return res.redirect("/dashboard");
        }

        res.redirect("/dashboard");
    } catch (error) {
        console.error("Server error:", error.message);
        req.flash("error", "Server error");
        res.redirect("/dashboard");
    }
});

// Get all events
router.get("/events", async (req, res) => {
    try {
        const events = await Event.find();
        res.status(200).json({ events });
    } catch (error) {
        console.error("Server error:", error.message);
        req.flash("error", "Server error");
        res.redirect("/dashboard");
    }
});

// Get event by ID
router.get("/events/:id", async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            req.flash("error", "Event not found");
            return res.redirect("/dashboard");
        }
        res.status(200).json({ event });
    } catch (error) {
        console.error("Server error:", error.message);
        req.flash("error", "Server error");
        res.redirect("/dashboard");
    }
});

// Delete event by ID
router.delete("/:id", async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            req.flash("error", "Event not found");
            return res.redirect("/dashboard");
        }

        await Event.findByIdAndDelete(req.params.id);
        res.redirect("/dashboard");
    } catch (error) {
        console.error("Server error:", error.message);
        req.flash("error", "Server error");
        res.redirect("/dashboard");
    }
});

module.exports = router;
