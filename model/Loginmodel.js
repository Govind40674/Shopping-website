const mongoose=require("mongoose");
const schema=new mongoose.Schema({
  username:{
    type:String,
    unique:true,
    requirement:true
  },
  // email:{
  //      type:String,
  //   unique:true,
  //   requirement:true
    
  // }, 
  password:{
       type:String,
 
    requirement:true
  }


})
const User=mongoose.model("User",schema);
module.exports=User;