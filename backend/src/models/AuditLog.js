import mongoose from 'mongoose';
export default mongoose.model('AuditLog',new mongoose.Schema({actor:{type:mongoose.Schema.Types.ObjectId,ref:'User'},action:String,targetType:String,targetId:String,metadata:mongoose.Schema.Types.Mixed,ip:String},{timestamps:true}));
