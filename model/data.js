const mongoose=require("mongoose");
const schemanew=new mongoose.Schema({
  username:{
    type:String,
  },
  item:{
    type:String,
    // required:true,
    
  },
  itemsize:{
    type:Number,
    
  },
  mrp:{
    type:Number,

  },
  sp:{
    type:Number,

  },
  sdi:{
    type:Number,

  },
   profit:{
    type:Number,

  },
   rem:{
    type:Number,

  },
  

});
const Data=mongoose.model("Data",schemanew);
module.exports=Data;