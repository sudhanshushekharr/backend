import mongoose, {Schema} from "mongoose";
//destructre schema
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

//method
const userSchema = new Schema(
    {
      username: {
        type:String,
        required: true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true //indexing for querying
      },
    email: {
        type:String,
        required: true,
        unique:true,
        lowercase:true,
        trim:true
    },
    fullname:{
        type:String,
        required: true,
        trim:true,
        index:true

    },
     avatar:{
      type:String, //cloudnary URL
      required:true,
     },
     coverImage:{
        type:String, //cloudnary URL
      
     },
     watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref:"Video"
        }
     ],
     password:{
        type:String,
        required: [true, "password is required"]
     },
     refreshToken:{
        type:String

     }

     

    },
    { timestamps:true}
)


//prehooks
userSchema.pre("save", async function (next)
{
     if(!this.isModified("password")) return next()

     this.password=await bcrypt.hash(this.password,10)

  next()
})

//cecking password is correct or not
userSchema.methods.isPasswordCorrect = async function(password){
  return await bcrypt.compare(password,this.password)
}


//access tokens
userSchema.methods.generateAccessToken= function (){
  //short lived access token
  return jwt.sign(
    { _id:this._id,
      email:this.email,
      username:this.username,
      fullname:this.fullname,

    }, process.env.ACCESS_TOKEN_SECRET,{ expiresIn: ACCESS_TOKEN_EXPIRY });
  

}

//refresh token
userSchema.methods.generateRefreshToken= function (){
  //long lived access token
  return jwt.sign(
    { _id:this._id,
    }, process.env.REFRESH_TOKEN_SECRET,{ expiresIn: REFRESH_TOKEN_EXPIRY });
  

}

//mongoose model
export const User =mongoose.model("User",userSchema)