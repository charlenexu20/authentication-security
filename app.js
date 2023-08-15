//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

// Set up static files and template engine
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

// Initialize Passport.js for authentication
app.use(passport.initialize());
app.use(passport.session());

// Initialize and connect to the Database
async function main() {
    try {
      await mongoose.connect("mongodb://127.0.0.1:27017/userDB");
    } catch (error) {
      console.error("Error initializing database:", error);
    }
}

main();

// Define the user schema
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String
});

// This plugin simplifies adding username and password fields for authentication
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// Create User model
const User = new mongoose.model("User", userSchema);

// Configure Passport.js local strategy
passport.use(User.createStrategy());

// Serialize and Deserialize user
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).exec();
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Configure Google authentication strategy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

// Route: Home page
app.get("/", (req, res) => {
    res.render("home");
});

// Route: Google authentication
app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] })
);

// Callback for Google authentication
app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

// Route: Secrets page (protected by authentication)
app.get("/secrets", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("secrets");
    } else {
        res.redirect("/login");
    }
});

// Route: Logout
app.get("/logout", (req, res) => {
    req.logout((err) => {
        // Handle error if logout encounters one
        if (err) { return next(err); }
        res.redirect("/");
    });
});

// Route: Registration page
app.route("/register")
    .get((req, res) => {
        res.render("register");
    })
    .post(async (req, res) => {
        try {
            await User.register(
                { username: req.body.username },
                req.body.password
            )
            passport.authenticate("local") (req, res, () => {
                res.redirect("/secrets");
            });
        } catch (err) {
            console.error(err);
            res.redirect("/register");
        }
    });

// Route: Login page
app.route("/login")
    .get((req, res) => {
        res.render("login");
    })
    .post(async (req, res) => {
        try {
            const user = new User({
                username: req.body.username,
                password: req.body.password
            });
            req.login(user, async (err) => {
                if (err) {
                    console.error(err);
                } else {
                    passport.authenticate("local") (req, res, () => {
                        res.redirect("/secrets");
                    });
                }
            });
        } catch (err) {
            console.error(err);
        }
    });

app.listen(3000, () => {
    console.log("Server started on port 3000.");
});
