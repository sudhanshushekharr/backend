import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import { User } from "../models/user.models.js";

import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import { deleteFromCloudinary } from "../utils/cloudinary.js";
import { Logger } from "sass";
import jwt from  "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken=async (userId)=>{
try {
     const user= await User.findById(userId) //databse related thing so needs to be awaited
    
    //small check for user
    
    if(!user)
    {
        throw new ApiError(404,"user doesnt exists") 
        
    }
    
    const accessToken=user.generateAccessToken()
    const refreshToken=user.generateRefreshToken()
    
    
    user.refreshToken=refreshToken
    await user.save({validateBeforeSave:false})
    return {accessToken,refreshToken}
} catch (error) {
    throw new ApiError(500,"Something went wrong while generating refresh tokens and access tokens") 
        
}
}


const loginUser=asyncHandler(async (req,res)=>{
  //get data from body
 const {username,email,password} =req.body

 //validation
 if (!email) {
    throw new ApiError(400, "Username or email is required");
  }

 const user = await User.findOne({
    $or: [{username},{email}]
})

if(!user)
{
    throw new ApiError(404,"user not found") 
    
}

//now user is there now we need to validate password

const isPasswordValid=await user.isPasswordCorrect(password)

if(!isPasswordValid)
{
    throw new ApiError(401,"invalid user credentials") 

}

const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id)

//firing up a database query
const loggedInUser=await User.findById(user._id)
.select("-password -refreshToken"); //it will give object which wont have password and refreshtoken

if(!loggedInUser)
{
    throw new ApiError(404,"loggedInUser doesnt exist") 
    
}


const options={
    httpOnly:true,
    secure:process.env.NODE_ENV==="production",

}

//send the data

return res
 .status(200)
 .cookie("accessToken",accessToken,options)
 .cookie("refreshToken",refreshToken,options)
 .json( new ApiResponse(
    200,
    {user:loggedInUser,accessToken,refreshToken},
    "User logged in successfully"
 ))


})




const logoutUser=asyncHandler(async (req,res)=>{
    await User.findByIdAndUpdate(
        //TODO: need to come back here after middleware
        req.user._id,
        {
          $set:{
            refreshToken:undefined,
          }  
        },
        {
          new:true
        }
    )

    const options ={
        httpOnly:true,
        secure:process.env.NODE_env ==="production",
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out successfully"))
     
})






const refreshAccessToken=asyncHandler(async (req, res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken)
    {
        throw new ApiError(401,"Something went wrong while generating refresh tokens") 
        
    }

try {
   const decodedToken=  jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET,
     )
     const user=await User.findById(decodedToken?._id)
     if(!user)
     {
        throw new ApiError(401,"Invalid refresh token") 
        
     }

     if(incomingRefreshToken!==user?.refreshToken){
        throw new ApiError(401,"Invalid refresh token") 
        
        
     }

     const options={
        httpOnly:true,
        secure:process.env.NODE_ENV==="production"
     }

const {accessToken,refreshToken:newRefreshToken}=await generateAccessAndRefreshToken(user._id)

return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newRefreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                accessToken,
                refreshToken:newRefreshToken
            },
            "access token refreshed successfully"
        ))} 
        catch (error) {
            throw new ApiError(500,"Something went wrong while generating refresh tokens and access tokens") 
}

})








const registerUser= asyncHandler( async (req ,res)=>{
   const {fullname,email,username,password} = req.body


   //validation
   if([fullname,username,email,password].some((field)=>field?.trim()===""))
   {
    throw new ApiError(400,"all fields are required")
   }


const existedUser = await User.findOne({
    $or: [{username},{email}]
})

if(existedUser)
{
    throw new ApiError(409,"user with email or username already exists")  
}


console.warn(req.files)
const avatarLocalPath = req.files?.avatar?.[0]?.path
const coverLocalPath = req.files?.coverImage?.[0]?.path


if(!avatarLocalPath)
{
    throw new ApiError(400,"avatar file is missing")
}



// const avatar=await uploadOnCloudinary(avatarLocalPath);

// let coverImage=""


// if(coverLocalPath)
// {
//     coverImage=await uploadOnCloudinary(coverLocalPath);
// }



let avatar;
try{
avatar = await uploadOnCloudinary(avatarLocalPath)
console.log("Uploaded avatar",avatar);

}catch(error){
    console.log("Error uploading avatar",error);
    throw new ApiError(500,"failed to upload avatar")
}


let coverImage;
try{
coverImage= await uploadOnCloudinary(coverLocalPath)
console.log("Uploaded coverImage",coverImage);

}catch(error){
    console.log("Error uploading coverImage",error);
    throw new ApiError(500,"failed to upload coverImage")
}



//now costruct a user

try {
    const user = await User.create({
    fullname,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    email,
    password,
    username:username.toLowerCase()
    
    
    })
    
    
    
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering a user")
    }
    
    return res
    .status(201)
    .json( new ApiResponse(201,createdUser,"User registered successfully"))
} catch (error) {
   console.log("User creation failed");

   if(avatar)
   {
    await deleteFromCloudinary(avatar.publicId);
   }
  
   
   if(coverImage)
    {
     await deleteFromCloudinary(coverImage.publicId);
    }

    throw new ApiError(500,"Something went wrong while registering a user and images were deleted")
}

})



const changeCurrentPassword=asyncHandler( async(req,res )=>{
   const {oldPassword, newPassword}=req.body

  const user=await User.findById(req.user?._id)

 const isPasswordValid=await user.isPasswordCorrect(oldPassword);

 if(!isPasswordValid)
 {
    throw new ApiError(401,"Old password is incorrect")
 }

 user.password=newPassword;

 await user.save({ validateBeforeSave:false})

 return res.status(200).json( new ApiResponse(200, {}, "Password changed successfully" ))
})

const getCurrentUser=asyncHandler( async(req,res )=>{
  return res.status(200).json(new ApiResponse(200,req.user,"Current user details"))
})

const updateAccountDetails=asyncHandler( async(req,res )=>{
   const {fullname,email} =req.body

   if(!fullname || !email){
    throw new ApiError(400,"Fullname and email are required")
   }
  const user= await User.findByIdAndUpdate(
    req.user?._id,
    {
        $set:{
            fullname,
            email: email,
        }
    },
    {
        new:true
    }
   ).select("-password -refreshToken")

  return res.status(200).json( new ApiResponse(200,user,"Account details updated successfully"))

})

const updateUserAvatar=asyncHandler( async(req,res )=>{
const avatarLocalPath=req.file?.path

if(!avatarLocalPath)
{
    throw new ApiError(400,"File is required")
}

const avatar= await uploadOnCloudinary(avatarLocalPath)

if(!avatar.url){
    throw new ApiError(500,"Something went wrong while uploading avatar")
}

await User.findByIdAndUpdate(
    req.user?._id,
    {
        $set:
        {
            avatar:avatar.url
        }
    },
    {new:true}
).select("-password -refreshToken")

return res.status(200).json( new ApiResponse(200,user,"Avatar updated successfully"))

})

const updateUserCoverImage=asyncHandler( async(req,res )=>{
         const coverImagePath=req.file?.path;

         if(!coverImagePath)
         {
            throw new ApiError(400,"File is required")
         }

        const coverImage= await uploadOnCloudinary(coverImagePath)

        if(!coverImage.url)
        {
            throw new ApiError(500,"Something went wrong while uploading cover Image") 
        }

       const user=await User.findByIdAndUpdate(
            req.user._id,
            {
                $set:{
                    coverImage:coverImage.url
                }
            },
            {new:true}
        ).select("-password -refreshToken")

        return res.status(200).json( new ApiResponse(200,user,"Cover Image updated successfully"))
})



const getUserChannelProfile= asyncHandler(async (req,res)=>{

    const { username }=req.params  //to grab data from url we use params

    if(!username?.trim())
    {
        throw new ApiError(400,"Usnername is required");
    }
  const channel=await User.aggregate(
    [
       {
        $match:{
          username:username?.toLowerCase()
        }
       },
       {
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"Channel",
            as: "subscribers"
        }
       },{
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as: "subscribedTo"
        }
       },
       {
       $addFields:{
          subscribersCount:{
            $size:"$subscribers" //$ is required when u have named something
          },
          
            channelsSubscribedToCount:{
                $size:"$subscribedTo"
            },
            isSubscribed:{
                $cond:{
                    if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                    then:true,
                    else:false
                }
            }
          
       }
       },
       {
          //project only the necessary data
          $project:{
              fullName:1,
              username:1,
              avatar:1,
              subscribersCount:1,
              channelsSubscribedToCount:1,
              isSubscribed:1,
              coverImage:1,
              email:1

          }
       }
    ]
  )

  if(!channel?.length){
    throw new ApiError(404,"Channel not found");
  }

  return res
          .status(200).json( new ApiResponse(
            200,
            channel[0],
            "Channel profile fetched successfully"
          ))

})

const getWatchHistory=asyncHandler(async(req,res)=>{
       const user=await User.aggregate(
        [
            {
                $match:{
                    _id:new mongoose.Types.ObjectId(req.user?._id)  //mongose object id
                }
            },
            {
                $lookup:{
                    from:"videos",
                    localField:"watchHistory",
                    foreignField:"_id",
                    as: "watchHistory",
                    pipeline:[
                        {
                            $lookup:{
                                from:"users",
                                localField:"owner",
                                foreignField:"_id",
                                as:"owner",
                                pipeline:[
                                    {
                                        $project:{
                                            fullName:1,
                                            username:1,
                                            avatar:1,
                                        }
                                    }
                                ]
                            }
                        },
                        {
                           $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                           } 
                        }

                    ]
                }
            }
        ]
       )

       return res.status(200).json( new ApiResponse(200,user[0]?.watchHistory,"Watch history fetched successfully"))
})


export {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    getCurrentUser,
    changeCurrentPassword,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory

}