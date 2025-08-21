const mongoose=require("mongoose");
const shema5=new mongoose.Schema({
  item:{
    type:String,

  },
  image:{
    type:String,
  },
  price:{
    type:Number,
  },
  description:{
    type:String,
  },
  username:{
    type:String,
  },
  phone:{
    type:Number,
  },
  quantity:{
    type:Number,
  }
  
});
const Online=mongoose.model("Online",shema5);
module.exports=Online;