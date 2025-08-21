require('dotenv').config();
const jwt=require("jsonwebtoken");
const User=require("../model/Loginmodel.js");

const auth=async (req,res,next)=>{
    let token = req.cookies.token;
 
  if(typeof token!=="undefined"){
   
        try {
       
      const user = await jwt.verify(token, process.env.SECRET_KEY);

    
      req.user = user; // You can access it later as req.user
       res.locals.username = user.username;
      next();
    } catch (err) {
      console.error("Invalid or expired token:", err.message);
      res.redirect("/login?news=Invalid or expired token. Please login again.");
    }

  }else{
    res.redirect("/login");
  }

};
module.exports=auth;