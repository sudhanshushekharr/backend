import express from "express"
import cors from "cors"
//who should be able to talk to your backend
import cookieParser from "cookie-parser" //to handle cookies


const app=express()

app.use(
    cors(
        {
            origin:process.env.CORS_ORIGIN,
            Credentials:true
        }
    )
)



//common middlewares from express
app.use(express.json({limit:'16kb'}))

app.use(express.urlencoded({extended:true,limit:"16kb"}))

app.use(express.static("public"))//any image can be stored

app.use(cookieParser())



// import routes

import healthcheckRouter from "./routes/healthcheck.routes.js"
import router from "./routes/healthcheck.routes.js"

import userRouter from "./routes/user.routes.js"
import { errorHandler } from "./middlewares/error.middlewares.js"



// routes

app.use("/api/v1/healthcheck",healthcheckRouter)
app.use("/api/v1/users",userRouter)


app.use(errorHandler)

export { app }
