import mongoose from 'mongoose';
export default mongoose.model('Notification',new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User',index:true},type:String,title:String,body:String,data:mongoose.Schema.Types.Mixed,readAt:Date},{timestamps:true}));
