import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"
import dotenv from "dotenv"

dotenv.config()

//configure cloudinary

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


//this is how our file will get uploaded on cloudinary
const uploadOnCloudinary= async (localFilePath)=>{
    try {
        if(!localFilePath) return null
      const response=await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        console.log("File uploaded on cloudinary. File src: "+response.url)
        //once the file is uploaded,we would like to delete from our server
        fs.unlinkSync(localFilePath)
        return response
    } catch (error) {
        if (fs.existsSync(localFilePath)) {
            console.warn("Local file not deleted due to upload failure:", localFilePath);
        }

        // Throw the error to handle it in the calling function
        throw new Error("Failed to upload file to Cloudinary");
    }
}




const deleteFromCloudinary= async (publicId)=>{
try{
const result=await cloudinary.uploader.destroy(publicId)
console.log("Deleted from cloudinary. publicId",publicId);

}catch(error){
console.log("Error deleteing from Clouidnary",error)
return null;

}

}





export {uploadOnCloudinary,deleteFromCloudinary}