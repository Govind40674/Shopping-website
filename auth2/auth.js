
require('dotenv').config();
const jwt = require("jsonwebtoken");

/**
 * Middleware to protect routes and attach user info from JWT cookie.
 */
const auth = (req, res, next) => {
    const token = req.cookies.token;

    // If no token, redirect to login
    if (!token) {
        return res.redirect("/login");
    }

    try {
        // Verify JWT (synchronous)
        const user = jwt.verify(token, process.env.SECRET_KEY);

        // Attach user to request
        req.user = user;

        // Make username available in EJS templates
        res.locals.username = user.username;

        next(); // proceed to next middleware or route
    } catch (err) {
        console.error("Invalid or expired token:", err.message);

        // Token invalid or expired, redirect to login
        return res.redirect("/login?news=Invalid or expired token. Please login again.");
    }
};

module.exports = auth;