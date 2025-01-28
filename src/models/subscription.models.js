import mongoose, { Schema } from "mongoose";

const subscriptionSchema=new Schema(
    {
        subscriber:{ //who is subscribing to a channel uska id
        type:Schema.Types.ObjectId,
        ref:'users'
        },
        channel:{ //one to whom a subscribser has subscribed too
            type:Schema.Types.ObjectId,
            ref:'user',
        },
    }, {timestamps:true},
)

export const Subscription=mongoose.model("Subscription",subscriptionSchema);