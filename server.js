require('dotenv').config();
const path=require("path");
const express=require("express");
const mongoose=require("mongoose");
const port=8000;
const session=require("express-session");
const bcrypt=require("bcryptjs");
const User=require("./model/Loginmodel.js");
const cookieParser=require("cookie-parser");
const csrf=require("csurf");
const jwt=require("jsonwebtoken");
const auth=require("./auth2/auth.js");
const Data=require("./model/data.js");
const minifyHTML = require('express-minify-html-terser');
const Shortage=require("./model/shortage.js");
const multer=require("multer");
const Online=require("./model/online.js");
const passport=require("passport");
require("./auth2/google.js");
const nodemailer=require("nodemailer");
const MongoStore = require("connect-mongo");
const compression=require("compression");
const cors=require("cors");
const { v2: cloudinary } = require("cloudinary");

const fs = require("fs");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir); // use the folder we ensured exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const filefilter=(req,file,cb)=>{
  if(file.mimetype==="image/jpeg"||file.mimetype==="image/png"||file.mimetype==="image/webp"){
    cb(null,true);
  }else{
    cb(new Error(" only jpeg,png and webp files are allowed"),false);
  }
}


const upload = multer({
  storage: storage,
  limits: { fileSize: 3 * 1024 * 1024 }, 
  fileFilter: filefilter
});
const app=express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));



app.use(cors({
  origin: [
    "http://localhost:3000", 
    "https://shopping-website-ksvf.onrender.com",
     "http://192.168.29.203:8000"
  ],
  credentials: true
}));




app.use("/uploads", express.static("uploads"));
app.set('trust proxy', 1);
app.use(
  minifyHTML({
    override: true,
    htmlMinifier: {
      removeComments: true,
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeAttributeQuotes: true,
      removeEmptyAttributes: true,
    },
  }),
);
app.use(compression({
  level: 9,
  threshold:10*1024,
}));

app.use(cookieParser());
app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URL, 
    collectionName: "sessions"
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
       httpOnly: true,
   

    secure:false,
  }
}));

app.use(passport.initialize());
app.use(passport.session());
let State;
let City;



const csrfProtection = csrf({ cookie: true });

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.static(path.join(__dirname,"public")));
app.use("/images", express.static("images"));
// app.use("/images", express.static(path.join(__dirname, "images")));


const transporter=nodemailer.createTransport({
  host:"smtp.gmail.com",
  port:587,
  secure:false,
  auth:{
    user:"govindkumar40674@gmail.com",
    pass:"mujrjavgzzbrkfpt"
  }
});
async function main(){
  await mongoose.connect(process.env.MONGO_URL);


};
main()
.then(()=>{
  console.log("connected with database")
})
.catch((err)=>{
  console.log(err);
})



//sign up route
app.get("/signup",csrfProtection,(req,res)=>{
  const error=req.query.error;
  res.render("signup",{error,csrfToken:req.csrfToken()});
});
app.post("/signup/check",async(req,res)=>{
  let{name,password}=req.body;
  if(!name||await User.findOne({username:name})){

    return res.redirect("/signup?error=username already exist or username is required");
  }
  if(!password){
    return res.redirect("/signup?error=password is required");
  }

  const hashedpassword=await bcrypt.hash(password,10);
 const user = new User({
    username: name,
   
    password: hashedpassword,
  });

  await user.save();
  
  res.redirect("/login?news=account created successfully");


  
});
app.get("/signup/:id",async(req,res)=>{
   res.render("error",{error:"page not found"});
});
app.get("/signup/check/:id",async(req,res)=>{
   res.render("error",{error:"page not found"});
});


//Google login routes
app.get('/auth/google',
  passport.authenticate('google', { scope:
  	[ 'email', 'profile' ] }
));
 
app.get( '/auth/google/callback',
    passport.authenticate( 'google', {
        successRedirect: '/register',
        failureRedirect: '/login'
}));
app.get('/register',csrfProtection,(req,res)=>{
  const error=req.query.error;
  res.render("register",{csrfToken:req.csrfToken(),error});
  
});
app.get("/register/check",async(req,res)=>{
   let{name,password}=req.query;
   if(!name||!password){
    return res.redirect("/register?error=username or password is required");
   };
  let find= await User.findOne({username:name});
  try{
  if(find){
    let c= await bcrypt.compare(password,find.password);
    if(c){
      const token=jwt.sign({userid:find._id,username:find.username}, process.env.SECRET_KEY,{expiresIn:"1d"});
         res.cookie("token", token, {
        httpOnly: true,
       secure:process.env.SECRET_KEY==="Govind123",
        maxAge: 3600000*24,
      });
      req.session.userId = find._id;
      req.session.username = find.username;


      return res.redirect("/location");
    }else{
      return res.redirect("/register?error=wrong password");
    }
  }else{
    return res.redirect("/register?error=invalid username");
  }

  }catch(error){
    return res.redirect("/register?error=something wrong ");
  }
 
  
});

app.get("/register/signup",csrfProtection,(req,res)=>{
  const error=req.query.error;
  res.render("registersignup",{error,csrfToken:req.csrfToken()});
});
app.post("/register/signup",async(req,res)=>{
  let{name,password}=req.body;
  if(!name||await User.findOne({username:name})){

    return res.redirect("/register/signup?error=username already exist or username is required");
  }
  if(!password){
    return res.redirect("/register/signup?error=password is required");
  }

  const hashedpassword=await bcrypt.hash(password,10);
 const user = new User({
    username: name,
   
    password: hashedpassword,
  });

  await user.save();
  
  res.redirect("/login?news=account created successfully and you can login now");


  
});
app.get("/register/:id",async(req,res)=>{
   res.render("error",{error:"page not found"});
});
  


app.get("/login",(req,res)=>{
   
  const news=req.query.news;
 

  res.render("login",{news});
 
});


app.post("/login/check",async(req,res)=>{
   let{name,password}=req.body;
   if(!name||!password){
    return res.redirect("/login?news=username or password is required");
   };
  let find= await User.findOne({username:name});
  try{
  if(find){
    let c= await bcrypt.compare(password,find.password);
    if(c){
      const token=jwt.sign({userid:find._id,username:find.username}, process.env.SECRET_KEY,{expiresIn:"1d"});
         res.cookie("token", token, {
        httpOnly: true,
      //  secure:process.env.SECRET_KEY==="Govind123",
        maxAge: 3600000*24,
      });
      req.session.userId = find._id;
      req.session.username = find.username;

      return res.redirect("/location");
    }else{
      return res.redirect("/login?news=wrong password");
    }
  }else{
    return res.redirect("/login?news=invalid username");
  }

  }catch(error){
    return res.redirect("/login?news=something wrong ");
  }


});
//forget password route
app.get("/forgetpassword",csrfProtection,(req,res)=>{
  const error=req.query.error;
  res.render("forgetpassword",{error,csrfToken:req.csrfToken()});
});
app.get("/login/:id",(req,res)=>{
  
   res.render("error",{error:"page not found"});
});

app.get("/login/check/:id",(req,res)=>{
   res.render("error",{error:"page not found"});
});
app.post("/forgetpassword",async(req,res)=>{
  let{name,password}=req.body;
  let user=await User.findOne({username:name});
  if(!user){
     return res.redirect("/forgetpassword?error=invalid username")
  };
  let hashedpassword=await bcrypt.hash(password,10);
  await User.updateOne({username:name},{password:hashedpassword});
  return res.redirect("/login?news=password updated successfully");



});
app.get("/forgetpassword/:id",(req,res)=>{
   res.render("error",{error:"page not found"});
});
function googleauth(req,res,next){
  if(req.user){
    next();
  }else{
    res.redirect("/login");
  };
  
};
app.get("/guest",async(req,res)=>{
  let data=await Online.find();
  res.render("guest",{data,error:null});
});
// app.use(googleauth);
app.use(auth);
app.get("/location",csrfProtection,(req,res)=>{
  const error=req.query.error;
  res.render("location",{error,csrfToken:req.csrfToken()});
});
app.post("/location",async(req,res)=>{
  let{state,city}=req.body;
  if(!state||!city){
    return res.redirect("/location?error=state or city is required");
  }

  city=city.trim();
  State=state;
  City=city;
  res.redirect("/");
  
})
app.get("/",async(req,res)=>{
  if(!State||!City){
    let data=await Online.find({username:{$ne:req.user.username}});
    let error=req.query.error;
    if(data.length===0){
      return res.render("home",{data:null,error:"No item found yet"});
    }
   return res.render("home",{data,error});

    
  }
   let data=await Online.find({username:{$ne:req.user.username},state:State,city:City});
   if(data.length===0){
    return res.render("home",{data:null,error:"No item found in this region yet"});
   }
   let error=req.query.error;
  res.render("home",{data,error});  
});
app.get("/location/:id",(req,res)=>{
   res.render("error",{error:"page not found"});
});




app.get("/home",async(req,res)=>{
 if(!State||!City){
    let data=await Online.find({username:{$ne:req.user.username}});
    let error=req.query.error;
   return res.render("home",{data,error});

    
  }
   let data=await Online.find({username:{$ne:req.user.username},state:State,city:City});
   if(data.length===0){
    return res.render("home",{data,error:"No item found in this region yet"});
   }
   let error=req.query.error;
  res.render("home",{data,error}); 
});
app.get("/home/:id",(req,res)=>{
   res.render("error",{error:"page not found"});
});

app.get("/adddata",csrfProtection,(req,res)=>{
  res.render("add",{ csrfToken: req.csrfToken() });

});
app.post("/adddata",async(req,res)=>{
  let {item,itemsize,mrp,sp,sdi}=req.body;
  let rem=itemsize-sdi;
  let profit=sp*sdi-mrp*sdi;

  const data=new Data({
    username:req.user.username,
    item:item,
    itemsize:itemsize,
    mrp:mrp,
    sp:sp,
    sdi:sdi,
    profit:profit,
    rem:rem
  });
  await data.save();
  res.redirect("/show");


  

});
app.get("/adddata/:id",(req,res)=>{
   res.render("error",{error:"page not found"});
});

app.get("/show", async (req, res) => {
    if (!req.user.username) {
        return res.redirect("/login?news=you are not logged in"); // or send error message
    }

    try {
        let data = await Data.find({ username: req.user.username });
        res.render("show", { data });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching data");
    }
});
app.get("/show/:id",(req,res)=>{
   res.render("error",{error:"page not found"});
});

app.get("/showdata", async (req, res) => {
    if (!req.user.username) {
        return res.status(401).json({ error: "User not logged in" });
    }

    try {
        let data = await Data.find({ username: req.user.username });
        res.json({ data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error fetching data" });
    }
});
app.get("/showdata/:id",(req,res)=>{
   res.render("error",{error:"page not found"});
});

app.get("/update1/:id",async(req,res)=>{
  let {id}=req.params;
  let {value}=req.query;
  
  await Data.findByIdAndUpdate(id,{item:value});
  res.redirect("/show");


});
app.get("/update2/:id",async(req,res)=>{
  let {id}=req.params;
  let {value}=req.query;
  let data=await Data.findById(id);
  let rem=value-data.sdi;
 


  await Data.findByIdAndUpdate(id,{itemsize:value,rem:rem});
  res.redirect("/show");
});
app.get("/update3/:id",async(req,res)=>{
  let {id}=req.params;
  let {value}=req.query;
  let data=await Data.findById(id);
  let profit=data.sdi*data.sp-value*data.sdi;
  await Data.findByIdAndUpdate(id,{mrp:value,profit:profit});
  res.redirect("/show");
});
app.get("/update4/:id",async(req,res)=>{
  let {id}=req.params;
  let {value}=req.query;
  let data=await Data.findById(id);
  let profit=data.sdi*value-data.sdi*data.mrp;
  await Data.findByIdAndUpdate(id,{sp:value,profit:profit});
  res.redirect("/show");
});
app.get("/update5/:id",async(req,res)=>{
  let {id}=req.params;
  let {value}=req.query;
  let data=await Data.findById(id);
  let rem=data.itemsize-value;
  let profit=data.sp*value-data.mrp*value;
  await Data.findByIdAndUpdate(id,{sdi:value,rem:rem,profit:profit});
  res.redirect("/show");
});
app.get("/update6/:id/:m",async(req,res)=>{
   res.render("error",{error:"page not found"});
});

app.get("/delete/:id",async(req,res)=>{
  let {id}=req.params;
  await Data.findByIdAndDelete(id);
  res.redirect("/show");
});
app.get("/delete/:id/:m",async(req,res)=>{
   res.render("error",{error:"page not found"});
});

app.get("/shortage",async(req,res)=>{
  let data=await Shortage.find({username:req.user.username});
  res.render("shortage",{data});
});
app.get("/shortage/:id",(req,res)=>{
   res.render("error",{error:"page not found"});
});
app.get("/shortageadd",csrfProtection,(req,res)=>{
  res.render("shortageadd",{ csrfToken:req.csrfToken() });
});
app.get("/shortageadd/:id",(req,res)=>{
   res.render("error",{error:"page not found"});
});
app.post("/addshortage",async(req,res)=>{
  let {item,itemsize}=req.body;
  const data=new Shortage({
    username:req.user.username,
    item:item,
    quantity:itemsize,
  });
  await data.save();
  res.redirect("/shortage");
});
app.get("/addshortage/:id",(req,res)=>{
   res.render("error",{error:"page not found"});
});

app.get("/deleteshortage/:id",async(req,res)=>{
  let {id}=req.params;
  await Shortage.findByIdAndDelete(id);
  res.redirect("/shortage");
});
app.get("/deleteshortage/:id/:m",async(req,res)=>{
   res.render("error",{error:"page not found"});
});

app.get("/sold",csrfProtection,(req,res)=>{
  const error=req.query.error;
  res.render("sellonline",{csrfToken:req.csrfToken(),error});
});
app.get("/sold/:id",(req,res)=>{
   res.render("error",{error:"page not found"});
});
app.post("/sellonline", async (req, res) => {
  upload.single("image")(req, res, async (err) => {

    // Handle Multer errors first
    if (err) {
      let errorMessage;
      if (err.code === "LIMIT_FILE_SIZE") {
        errorMessage = "File too large! Maximum allowed size is 3 MB.";
      } else {
        errorMessage = err.message;
      }
      return res.redirect("/sold?error=" + encodeURIComponent(errorMessage));
    }

    try {
      const { item, price, description, quantity, phone, state, city, address } = req.body;

      // Check for missing fields
      if (!item || !price || !description || !quantity || !phone || !state || !city || !address) {
        return res.redirect("/sold?error=" + encodeURIComponent("Something is missing"));
      }

      // Check if file exists
      if (!req.file) {
        return res.redirect("/sold?error=" + encodeURIComponent("Image is required"));
      }

      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "online-items"
      });

      // Delete local file
      fs.unlink(req.file.path, () => {});

      const data = new Online({
        item,
        image: uploadResult.secure_url,
        price,
        description,
        username: req.user.username,
        quantity,
        phone,
        state,
        city,
        address,
        cloudinary_id:uploadResult.public_id
      });

      await data.save();

      return res.redirect("/sold?error=" + encodeURIComponent("Item added successfully"));

    } catch (err) {
      console.error(err);
      return res.redirect("/sold?error=" + encodeURIComponent("Upload failed"));
    }
  });
});
app.get("/sellonline/:id",(req,res)=>{
   res.render("error",{error:"page not found"});
});





app.get("/previoussellonline",async(req,res)=>{
  let data=await Online.find({username:req.user.username});
  res.render("previoussellonline",{data});
});
app.get("/previoussellonline/:id",(req,res)=>{
   res.render("error",{error:"page not found"});
  
});

app.get("/deleteonline/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Online.findById(id);

    if (doc && doc.cloudinary_id) {
      // delete image from Cloudinary
      await cloudinary.uploader.destroy(doc.cloudinary_id);
    }

    await Online.findByIdAndDelete(id);
    res.redirect("/previoussellonline");
  } catch (e) {
    console.error(e);
    res.redirect("/previoussellonline");
  }
});
app.get("/deleteonline/:id/:m",async(req,res)=>{
   res.render("error",{error:"page not found"});
})

app.get("/search",async(req,res)=>{

  let {q}=req.query;
  if(!State||!City){
    let data=await Online.find({username:{$ne:req.user.username},item:q});
    if(data.length==0){
      data=await Online.find({username:{$ne:req.user.username},description:q});
    }
    if(data.length==0){
      return res.render("home", {data, error: "Item not found"});
    }
    return res.render("home",{data,error:null});
  }
  let data=await Online.find({username:{$ne:req.user.username},item:q,state:State,city:City});
  if(data.length==0){
    data=await Online.find({username:{$ne:req.user.username},description:q,state:State,city:City});
  }
  
  
  
  if(data.length==0){
    
    
    return res.render("home", {data:null, error: "Item not found in this region"});

  }
  res.render("home",{data,error:null});
});
app.get("/search/:id",(req,res)=>{
   res.render("error",{error:"page not found"});
})
app.get("/buy/:id",async(req,res)=>{
  let {id}=req.params;
  let data=await Online.findById(id);
  res.render("buy",{data});
});
app.get("/buy/:id/:m",async(req,res)=>{
  res.render("error",{error:"page not found"});
})
app.get("/mail",csrfProtection,(req,res)=>{
  let error=req.query.error;

 
  res.render("sendmail",{csrfToken:req.csrfToken(),error});
});
app.get("/mail/:id",(req,res)=>{
  res.render("error",{error:"page not found"});
});
app.post("/sendmail",async(req,res)=>{
  // let {id}=req.query;
  let {from,subject,message}=req.body;
 
try{
  let info=await transporter.sendMail({
    from: `${req.user.username} <${from}>`,
    to: "govindkumar4067444@gmail.com",
    subject: subject,
    text: message,
  });
  return res.redirect("/home");

}catch(error){
  return res.render("sendmail", {error});
};
});
app.get("/sendmail/:m",async(req,res)=>{
  res.render("error",{error:"page not found"});
});


app.get('/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) { 
          return res.redirect("/login?news= invalid logout from google "); 
        }

        // Destroy session stored in MongoDB
        req.session.destroy((err) => {
            if (err) console.log(err);

            // Clear JWT cookie
            res.clearCookie('token');

            // Clear session cookie (connect.sid)
            res.clearCookie('connect.sid');

            // Redirect to login
            res.redirect('/login?news=You are logged out');
        });
    });
});



app.get("/:id",(req,res)=>{
  res.render("error",{error:"page not found"});
});


app.use((err,req,res,next)=>{
  
  
  error=err.message;

  res.render("error",{error:"something went wrong"});
})










app.listen(port,()=>{
  console.log(`listening on the port ${port}`);
})

