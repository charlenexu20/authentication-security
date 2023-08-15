//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

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

// Define the encryption secret key
const secret = "Thisisourlittlesecret.";

// Apply encryption plugin to the user schema
userSchema.plugin(encrypt, {
    secret: secret,                     // Encryption secret key
    encryptedFields: ["password"]       // Fields to be encrypted
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
            // Create a new user in the database
            await User.create({
                email: req.body.username,
                password: req.body.password
            });
            res.render("secrets");
        } catch (err) {
            console.error(err);
        }
    });

// Route: Login page
app.route("/login")
    .get((req, res) => {
        res.render("login");
    })
    .post(async (req, res) => {
        try {
            const username = req.body.username;
            const password = req.body.password;
            // Find the user in the database
            const foundUser = await User.findOne({ email: username });
            if (foundUser && foundUser.password === password) {
                res.render("secrets");
            }
        } catch (err) {
            console.error(err);
        }
    });

app.listen(3000, () => {
    console.log("Server started on port 3000.");
});
