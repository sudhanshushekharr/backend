class ApiError extends Error {
    constructor(
        statusCode,
        message="Something went wrong",
        errors=[],
        stack =""
    )
    {
        super(message) // to call constructor from error class
        this.statusCode=statusCode
        this.data=null
        this.message=message
        this.success=false
        this.errors=errors;

        if(stack){
            this.stack=stack
        } else {
           Error.captureStackTrace(this,this.constructor)
        }
    }
}

export { ApiError }