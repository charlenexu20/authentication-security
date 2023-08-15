//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();

// Set up static files and template engine
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

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
    password: String
});

// Create User model
const User = new mongoose.model("User", userSchema);

// Route: Home page
app.get("/", (req, res) => {
    res.render("home");
});

// Route: Registration page
app.route("/register")
    .get((req, res) => {
        res.render("register");
    })
    .post(async (req, res) => {
        try {
            // Hash the provided password using bcrypt
            const hash = await bcrypt.hash(req.body.password, saltRounds);

            // Create a new user in the database with the hashed password
            await User.create({
                email: req.body.username,
                password: hash
            })
            res.render("secrets");
        } catch (err) {
            res.send(err);
        }
    });

// Route: Login page
app.route("/login")
    .get((req, res) => {
        res.render("login");
    })
    .post(async (req, res) => {
        try {
            // Get the username and password from the request
            const username = req.body.username;
            const password = req.body.password;

            // Find the user record based on the provided username
            const data = await User.findOne({ email: username});

            // Compare the provided password with the stored hash
            const result = await bcrypt.compare(password, data.password);
            if (result === true) {
                res.render("secrets");
            } else {
                res.send("The username or password doesn't match.");
            }
        } catch (err) {
            res.send(err);
        }
    });

app.listen(3000, () => {
    console.log("Server started on port 3000.");
});
