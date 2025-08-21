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






const app=express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));


app.use("/uploads", express.static("uploads"));
app.use(session({
  secret:"secret",
  resave:false,
  saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(cookieParser());

const csrfProtection = csrf({ cookie: true });

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.static(path.join(__dirname,"public")));
const storage=multer.diskStorage({
  destination:function(req,file,cb){
    cb(null, path.join(__dirname, "uploads"));
  },
  filename:function(req,file,cb){
    const newfile=Date.now()+path.extname(file.originalname);
    cb(null,newfile);
  }
});
const limits={
  filesize:1024*1024*5
};
const upload=multer({
  storage:storage,
  limits:limits
});
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
  await mongoose.connect("mongodb://127.0.0.1:27017/login");

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

  const hashedpassword=await bcrypt.hash(password,10);
 const user = new User({
    username: name,
    email: email,
    password: hashedpassword,
  });

  await user.save();
  
  res.redirect("/?news= You can login")


  
});


//Google login routes
app.get('/auth/google',
  passport.authenticate('google', { scope:
  	[ 'email', 'profile' ] }
));
 
app.get( '/auth/google/callback',
    passport.authenticate( 'google', {
        successRedirect: '/google/login',
        failureRedirect: '/login'
}));
app.get("/google/login",async(req,res)=>{
  let user=req.user;
  if(user){
    const token=jwt.sign({userid:user._id,username:req.user.displayName}, process.env.SECRET_KEY,{expiresIn:"20d"});
         res.cookie("token", token, {
        httpOnly: true,
        secure: false, // true in production
        maxAge: 3600000*24*20,
      });
      return res.redirect("/");
  }
 

});

// login route
app.get("/login",(req,res)=>{
   
  const news=req.query.news;
 

  res.render("login",{news});
 
});


app.get("/login/check",async(req,res)=>{
   let{name,password}=req.query;
  let find= await User.findOne({username:name});
  if(find){
    let c= await bcrypt.compare(password,find.password);
    if(c){
      const token=jwt.sign({userid:find._id,username:find.username}, process.env.SECRET_KEY,{expiresIn:"20d"});
         res.cookie("token", token, {
        httpOnly: true,
        secure: false, // true in production
        maxAge: 3600000*24*20,
      });

      return res.redirect("/");
    }else{
      return res.redirect("/?news=invalid password");
    }
  }else{
    res.redirect("/?news=invalid details");

  }


});
//forget password route
app.get("/forgetpassword",csrfProtection,(req,res)=>{
  const error=req.query.error;
  res.render("forgetpassword",{error,csrfToken:req.csrfToken()});
})
function googleauth(req,res,next){
  if(req.user){
    next();
  }else{
    res.redirect("/login");
  };
  
};
// app.use(googleauth);
app.use(auth);
app.get("/",async(req,res)=>{
   let data=await Online.find({username:{$ne:req.user.username}});
   let error=req.query.error;
  res.render("home",{data,error});  
});





app.get("/home",async(req,res)=>{
 let data=await Online.find({username:{$ne:req.user.username}});
   let error=req.query.error;
  res.render("home",{data,error}); 
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
app.get("/show",async(req,res)=>{
  let data=await Data.find({username:req.user.username});
  res.render("show",{data});
});
app.get("/showdata", async (req, res) => {
    let data = await Data.find({ username: req.user.username });
    res.json({ data }); // Tabulator-friendly JSON
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

app.get("/delete/:id",async(req,res)=>{
  let {id}=req.params;
  await Data.findByIdAndDelete(id);
  res.redirect("/show");
});

app.get("/shortage",async(req,res)=>{
  let data=await Shortage.find({username:req.user.username});
  res.render("shortage",{data});
});
app.get("/shortageadd",csrfProtection,(req,res)=>{
  res.render("shortageadd",{ csrfToken: req.csrfToken() });
})
app.post("/addshortage",async(req,res)=>{
  let {item,itemsize}=req.body;
  const data=new Shortage({
    username:req.user.username,
    item:item,
    quantity:itemsize
   
  });
  await data.save();
  res.redirect("/shortage");
});
app.get("/deleteshortage/:id",async(req,res)=>{
  let {id}=req.params;
  await Shortage.findByIdAndDelete(id);
  res.redirect("/shortage");
});


app.get("/sold",csrfProtection,(req,res)=>{
  const error=req.query.error;
  res.render("sellonline",{csrfToken:req.csrfToken(),error});
});

app.post("/sellonline",upload.single("image"),async(req,res)=>{

  let {item,price,description,quantity,phone}=req.body;
   let imagePath = null;
  if (req.file) {
    imagePath="/uploads/" + req.file.filename;
  }
  if(item&&price&&description&&quantity&&phone){

  

  const data = new Online({
    item:item,
    image:imagePath,
    price:price,
    description,
    username: req.user.username,
    quantity:quantity,
    phone:phone,
  });
  await data.save();
  res.redirect("/home");
}else{
  return res.redirect("/sold?error=something is missing")
}
});

app.get("/previoussellonline",async(req,res)=>{
  let data=await Online.find({username:req.user.username});
  res.render("previoussellonline",{data});
});
app.get("/deleteonline/:id",async(req,res)=>{
  let {id}=req.params;
  await Online.findByIdAndDelete(id);
  res.redirect("/previoussellonline");
});
app.get("/search",async(req,res)=>{
  let {search}=req.query;
  let data=await Online.find({username:{$ne:req.user.username},item:search});
  if(data.length==0){
    data=await Online.find({username:{$ne:req.user.username},description:search});
  }
  
  
  
  if(data.length==0){
    
    
    return res.render("home", {data:null, error: "Item not found" });

  }
  res.render("home",{data});
});
app.get("/buy/:id",async(req,res)=>{
  let {id}=req.params;
  let data=await Online.findById(id);
  res.render("buy",{data});
});
app.get("/mail",csrfProtection,(req,res)=>{
  let error=req.query.error;

 
  res.render("sendmail",{csrfToken:req.csrfToken(),error});
})
app.post("/sendmail",async(req,res)=>{
  let {id}=req.query;
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
  return res.render("sendmail", { error});
};
});



app.get('/logout', (req, res) => {

  req.logout(()=>{
      res.clearCookie('token'); 
  res.redirect('/login?news=You are logged out');
  })
});





app.listen(port,()=>{
  console.log(`listening on the port ${port}`);
})

