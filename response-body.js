//@ts-check

/**
 * This class encapsulates the unified response body sent always by this API.
 */
class ResponseBody{

    constructor(err, data, headers = null){
        this.error = this._stringifyError(err);

        //We need to ensure always return an array as payload:
        if (Array.isArray(data)) {
            this.payload = data;
        }
        else {
            this.payload = new Array()
            
            //We will return payload only when some data must be returned to the client, otherwise an empty array will be sent:
            if (data) {
                this.payload.push(data);
            }            
        }

        if (headers) {
            this.headers = headers;
        }        
    }

    _stringifyError(err) {

        let ret = null;

        if (err) {

            ret = { message: "", stack: "", userErrorCode: "" };

            if (typeof err == "object") {

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
        }

        return ret;
    }
}

module.exports = ResponseBody;