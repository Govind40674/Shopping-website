const mongoose=require("mongoose");
const schema3=new mongoose.Schema({
  username:{
    type:String,
  },
  item:{
    type:String,
    unique:true,

  },
  quantity:{
    type:Number,
   
  }
  
});
const Shortage=mongoose.model("Shortage",schema3);
module.exports=Shortage;