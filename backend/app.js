const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const bodyParser = require('body-parser');
const methodOverride = require("method-override");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("AIzaSyAHy6wDlhGYG6He8_4bz9TwVt_dAylh71E");
const Event = require('./models/Event');
const jwt = require('jsonwebtoken');
const flash = require("connect-flash");
const session = require('express-session');
const isLoggedIn = require('./middleware/isLoggedIn');
const isAdmin = require('./middleware/isAdmin');
const User = require('./models/User');
const dotenv = require('dotenv');
const authRoutes = require('./routes/userAuthRoute');
const eventRoutes = require('./routes/eventRoute');
const registerRoutes = require('./routes/registerRoute');
const nodemailer = require('nodemailer')
const http = require("http");
dotenv.config();
const app = express();  

//for flash meassge
app.use(
  session({
      secret: 'your-secret-key', // Replace with a secure key
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false }, // Set secure: true in production with HTTPS
  })
);



app.use(flash());

// Pass flash messages to all views
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const Razorpay = require('razorpay');
require('dotenv').config();
app.use(methodOverride("_method"));
//for EJS
app.set('views', path.join(__dirname, "../frontend"));  // Correct path for the 'views' directory
app.set('view engine', 'ejs');
app.set('view engine', 'ejs');

// Middleware
app.use(express.json());
app.use(cookieParser()); // To parse cookies
app.use(express.static('../frontend'));
// Flash middleware
app.use(flash());
// Middleware to make flash messages available globally in views
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});
app.get("/about",async(req,res)=>{
  try {
    const allEvents = await Event.find();
    const token = req.cookies.token;
    let user = {};
    if (token)
    {
      try {
        // Verify token and decode user details
        const decoded = jwt.verify(token, 'your-secret-key'); // Replace with your actual secret key
        req.user = decoded;
        // Retrieve the user from the database
        user = await User.findById(req.user.userId);
        res.render('about',{ events: allEvents, user: user, token: token || null });
      } catch (err) {
        console.error('Invalid or expired token:', err.message);
        // Optional: You can clear the token cookie here if desired
        res.clearCookie('token');
      }
    }

    else
    {

    req.flash('error', 'You must log in to access this page');
    res.redirect('/users/login');

   

    }
  } catch (err) {
    
   

    req.flash('error', 'You must log in to access this page');
    res.redirect('/users/login');

    
  } 
})

app.get("/eventall", async (req, res) => {
  try {
    const allEvents = await Event.find();
    const token = req.cookies.token;

    let user = {}; // Initialize user as an empty object

    if (token) {
      try {
        // Verify token and decode user details
        const decoded = jwt.verify(token, 'your-secret-key'); // Replace with your actual secret key
        req.user = decoded;
        // Retrieve the user from the database
        user = await User.findById(req.user.userId);
        res.render('eventAll',{ events: allEvents, user: user, token: token || null });
      } catch (err) {
        console.error('Invalid or expired token:', err.message);
        // Optional: You can clear the token cookie here if desired
        res.clearCookie('token');
      }
    }
  } catch (err) {
    req.flash('error', 'Server Error');
    res.redirect('/dashboard');
   
  }
});

//Event Bot Purpose
app.get("/bot", (req, res) => {
  res.render("index.ejs", { generatedContent: '' });
});

app.post("/bot", async (req, res) => {
  const { content } = req.body;
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    let generatedContent = "";

    // Fetch all events from the database
    const events = await Event.find();

    if (isEventQuery(content)) {
      if (events.length > 0) {
        const eventsData = events.map(event => ({
          title: event.title || "Unnamed Event",
          date: event.createdAt ? event.createdAt.toLocaleDateString() : "Unknown Date",
          location: event.location || "Unknown Location",
          organizer: event.organizer || "Unknown Organizer",
        }));

        if (content.toLowerCase().includes("next event")) {
          const nextEvent = events[0]; // Assuming events are sorted by date.
          generatedContent = `The next event is "${nextEvent.title}" organized by "${nextEvent.organizer}" on "${new Date(nextEvent.createdAt).toLocaleDateString()}" at "${nextEvent.location}".`;
        } else if (content.toLowerCase().includes("all events")) {
          generatedContent = eventsData
            .map(event => `Event: ${event.title}, Date: ${event.date}, Location: ${event.location}, Organizer: ${event.organizer}`)
            .join("\n");
        } else {
          const prompt = `Query: "${content}"\nEvents: ${eventsData
            .map(event => `${event.title}, ${event.date}, ${event.location}, ${event.organizer}`)
            .join("; ")}`;
          const result = await model.generateContent(prompt);
          generatedContent = await result.response.text();
        }
      } else {
        generatedContent = "No events found in the database.";
      }
    } else {
      const result = await model.generateContent(content);
      generatedContent = await result.response.text();
    }

    // Remove unwanted characters like "*" from the response if present
    generatedContent = generatedContent.replace(/\*/g, "");

    res.json({ question: content, response: generatedContent });
  } catch (error) {
    console.error("Error handling bot query:", error);
    res.status(500).json({ question: content, response: "An error occurred while processing your query." });
  }
});

// Helper function
function isEventQuery(query) {
  const eventKeywords = ["event", "schedule", "activities", "upcoming", "next event", "all events"];
  return eventKeywords.some(keyword => query.toLowerCase().includes(keyword));
}

//Welcome Route 
app.get('/', (req, res) => {
   res.render('welcome');
});


app.get('/dashboard', async (req, res) => {
  try {
    // Retrieve all events from the database
    const allEvents = await Event.find();
    const token = req.cookies.token;

    let user = {}; // Initialize user as an empty object

    if (token) {
      try {
        // Verify token and decode user details
        const decoded = jwt.verify(token, 'your-secret-key'); // Replace with your actual secret key
        req.user = decoded;
        // Retrieve the user from the database
        user = await User.findById(req.user.userId);
      } catch (err) {
        c
        // Optional: You can clear the token cookie here if desired
        res.clearCookie('token');
      }
    }

    // Render the dashboard view with events and the user (empty if token is not provided)
    res.render('dashboard', { events: allEvents, user: user, token: token || null });
  } catch (error) {
    // console.error('Error fetching events:', error);
    // return res.status(500).json({ message: 'Server error', error: error.message });
    req.flash('error', 'Server error');
      res.redirect('/dashboard');
  }
});

//UserRoute
app.use('/users', authRoutes);

// Event Routes
app.use('/events',eventRoutes);

//RegisterEvent Routes
app.use('/register',registerRoutes);
app.use('/register/:id/view',registerRoutes);

app.get('/sendmail',(req,res)=>{

  res.render('sendMailToAll');
})

// Endpoint to handle sending custom messages
app.post("/sendmail", async (req, res) => {
  try {
      // Extract data from the request body
      const { subject, message } = req.body;
      console.log(subject);

      if (!subject || !message) {
          // return res.status(400).json({ message: "Subject and message are required." });

          req.flash('error', "Subject and message are required");
          res.redirect('/dashboard');

      }

      // Fetch all user emails from the database
      const users = await User.find({}, "email");
      const emailList = users.map(user => user.email);

      if (emailList.length === 0) {
          return res.status(200).json({ message: "No recipients found for email notifications." });
      }

      // Configure the email transporter
      const transporter = nodemailer.createTransport({
          service: "gmail",
          secure: true,
          auth: {
               user: "chinchejay@gmail.com",
                  pass: "xtqf ftin fnvq rgqp"
          },
      });

      // Email details
      const mailOptions = {
          from: process.env.EMAIL_USER,
          to: emailList,
          subject: subject,
          text: `Dear Students,\n\n${message}\n\nBest regards,\nAdmin Team`,
      };

      // Send emails
      transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
              console.error("Error sending email:", error);
              // return res.status(500).json({ message: "Error sending email", error });
              req.flash('error', 'Error sending email');
              res.redirect('/dashboard');
  
          }
          console.log("Emails sent successfully:", info.response);
          res.redirect('/dashboard');
      });
  } catch (error) {
      console.error("Error in sendmail route:", error);
      res.status(500).json({ message: "Internal server error." });
  }
});

//payment
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID, // Key ID from .env
    key_secret: process.env.RAZORPAY_KEY_SECRET, // Key Secret from .env
  });

app.get('/payment',(req,res)=>{
  res.render('payment');
  });
app.post('/pay', async (req, res) => {
    try {
      const options = {
        amount: 5000, // Amount in paise (₹500.00)
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
      };
  
      const order = await razorpay.orders.create(options);
      ; // Log the full order response
    
      // Render the Razorpay payment page with order details
      res.render('success', {
        key_id: process.env.RAZORPAY_KEY_ID,
        order_id: order.id,
        amount: options.amount,
      });
    } catch (err) {
      console.error('Error creating order:', err); // Log the full error details
      
      req.flash('error', 'Error creating order');
      res.redirect('/dashboard');

    }
  });

// Database Connection
async function main() {
    try {
        await mongoose.connect("mongodb+srv://chinchejay:Js0i3A8k5y9KaqSX@cluster0.f7cga.mongodb.net/myDatabaseName?retryWrites=true&w=majority", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Connected to MongoDB successfully");
    } catch (err) {
        console.error("Failed to connect to MongoDB:", err.message);
    }
}
main();
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

app.all("*", (req, res, next) => {
 res.render('pagenotfound');
});


