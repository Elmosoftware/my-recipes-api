//@ts-check

/**
 * This class encapsulates the unified response body sent always by this API.
 */
class ResponseBody{

    constructor(err, data, headers = null){
        this.error = this._stringifyError(err);
        this.payload = data;
        if (headers) {
            this.headers = headers;
        }        
    }

    _stringifyError(err){

        let ret = { message: "", stack: "", userErrorCode: ""};

        if (!err) {
            ret = null;
        }
        else if (typeof err == "object") {
            
            if (err.message) {
                ret.message = err.message;
            }
            
            if (err.stack) {
                ret.stack = err.stack;
            }

            if (err.userErrorCode) {
                ret.userErrorCode = err.userErrorCode;
            } 
        }
        else {
            ret.message = err.toString();
        }

        return ret;
    }
}

module.exports = ResponseBody;