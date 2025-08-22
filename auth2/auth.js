// require('dotenv').config();
// const jwt=require("jsonwebtoken");
// const User=require("../model/Loginmodel.js");

// const auth=async (req,res,next)=>{
//     let token = req.cookies.token;
 
//   if(typeof token!=="undefined"){
   
//         try {
       
//       const user = await jwt.verify(token, process.env.SECRET_KEY);

    
//       req.user = user; // You can access it later as req.user
//        res.locals.username = user.username;
//       next();
//     } catch (err) {
//       console.error("Invalid or expired token:", err.message);
//       res.redirect("/login?news=Invalid or expired token. Please login again.");
//     }

//   }else{
//     res.redirect("/login");
//   }

// };
// module.exports=auth;
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
        return res.redirect("/login");
    }
};

module.exports = auth;