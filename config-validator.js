//@ts-check

const ValidatorBase = require("./validator-base");

/**
 * This  class provides a method to validate .env config file.
 * @extends ValidatorBase
 */
class ConfigValidator extends ValidatorBase {

    constructor() {
        super();
    }

    /**
     * Validates the .env Config file after been loaded.
     */
    validateConfig() {

        let validEnvValues = ["development", "production"];
    
        //NODE_ENV is required and can be only one of the following values "dev", "prod":
        if (!process.env.NODE_ENV || !validEnvValues.includes(process.env.NODE_ENV)) {
            super._addError(`NODE_ENV is missing or it has an invalid value.
            Current value is: "${(process.env.NODE_ENV) ? process.env.NODE_ENV : "null or undefined"}".
            Possible values are: ${validEnvValues.join(", ")}.`);
        }
    
        //DB_ENDPOINT is required and can't be null or empty:
        if(!process.env.DB_ENDPOINT){
            super._addError("DB_ENDPOINT is required and can't be null or empty.");
        }
    
        //REQUESTS_ADDED_DELAY if specified must be a number greater or equal to 0 and less than max 32bit integer value.
        if(process.env.REQUESTS_ADDED_DELAY && (isNaN(Number(process.env.REQUESTS_ADDED_DELAY)) || Number(process.env.REQUESTS_ADDED_DELAY) < 0 || 
                Number(process.env.REQUESTS_ADDED_DELAY) >= Number.MAX_SAFE_INTEGER)){
                    super._addError(`REQUESTS_ADDED_DELAY is not a number or is out of the range of valid delay time in milliseconds, (0 to ${Number.MAX_SAFE_INTEGER})`);
        }

        //AUTHMANAGEMENT_DOMAIN is required and can't be null or empty:
        if(!process.env.AUTHMANAGEMENT_DOMAIN){
            super._addError("AUTHMANAGEMENT_DOMAIN is required and can't be null or empty.");
        }

        //AUTHMANAGEMENT_CLIENT_ID is required and can't be null or empty:
        if(!process.env.AUTHMANAGEMENT_CLIENT_ID){
            super._addError("AUTHMANAGEMENT_CLIENT_ID is required and can't be null or empty.");
        }

        //AUTHMANAGEMENT_CLIENT_SECRET is required and can't be null or empty:
        if(!process.env.AUTHMANAGEMENT_CLIENT_SECRET){
            super._addError("AUTHMANAGEMENT_CLIENT_SECRET is required and can't be null or empty.");
        }

        //AUTHMANAGEMENT_SCOPE is required and can't be null or empty:
        if(!process.env.AUTHMANAGEMENT_SCOPE){
            super._addError("AUTHMANAGEMENT_SCOPE is required and can't be null or empty.");
        }

        //CDN_CLOUD_NAME is required and can't be null or empty:
        if(!process.env.CDN_CLOUD_NAME){
            super._addError("CDN_CLOUD_NAME is required and can't be null or empty.");
        }

        //CDN_API_KEY is required and can't be null or empty:
        if(!process.env.CDN_API_KEY){
            super._addError("CDN_API_KEY is required and can't be null or empty.");
        }

        //CDN_API_SECRET is required and can't be null or empty:
        if(!process.env.CDN_API_SECRET){
            super._addError("CDN_API_SECRET is required and can't be null or empty.");
        }

        //CDN_CAROUSEL_PREFIX is required and can't be null or empty:
        if(!process.env.CDN_CAROUSEL_PREFIX){
            super._addError("CDN_CAROUSEL_PREFIX is required and can't be null or empty.");
        }

        //CDN_CAROUSEL_SUBFOLDERS must be a number greater than 0 and less than 255.
        if(isNaN(Number(process.env.CDN_CAROUSEL_SUBFOLDERS)) || Number(process.env.CDN_CAROUSEL_SUBFOLDERS) < 1 || 
                Number(process.env.CDN_CAROUSEL_SUBFOLDERS) >= 255){
                    super._addError("CDN_CAROUSEL_SUBFOLDERS is not a number or is out of range, (Valid range is 1 to 255)");
        }

        //CDN_CAROUSEL_IMAGE_HEIGHT if specified must be a number greater than 0 and less than max 32bit integer value.
        if(process.env.CDN_CAROUSEL_IMAGE_HEIGHT && (isNaN(Number(process.env.CDN_CAROUSEL_IMAGE_HEIGHT)) || Number(process.env.CDN_CAROUSEL_IMAGE_HEIGHT) <= 0 || 
                Number(process.env.CDN_CAROUSEL_IMAGE_HEIGHT) >= Number.MAX_SAFE_INTEGER)){
                    super._addError(`CDN_CAROUSEL_IMAGE_HEIGHT is not a number or is out of the range of valid image height size in pixels, (1 to ${Number.MAX_SAFE_INTEGER})`);
        }

        //LOCAL_UPLOAD_FOLDER is required and can't be null or empty:
        if(!process.env.LOCAL_UPLOAD_FOLDER){
            super._addError("LOCAL_UPLOAD_FOLDER is required and can't be null or empty.");
        }

        //CDN_MAX_UPLOAD_SIZE must be a number greater than 0 and less than max 32bit integer value.
        if(isNaN(Number(process.env.CDN_MAX_UPLOAD_SIZE)) || Number(process.env.CDN_MAX_UPLOAD_SIZE) < 1 || 
                Number(process.env.CDN_MAX_UPLOAD_SIZE) >= Number.MAX_SAFE_INTEGER){
                    super._addError(`CDN_MAX_UPLOAD_SIZE is not a number or is out of range, (Valid range is 1 to ${Number.MAX_SAFE_INTEGER})`);
        }

        //CDN_MAX_UPLOADS_PER_CALL must be a number greater than 0 and less than max 32bit integer value.
        if(isNaN(Number(process.env.CDN_MAX_UPLOADS_PER_CALL)) || Number(process.env.CDN_MAX_UPLOADS_PER_CALL) < 1 || 
                Number(process.env.CDN_MAX_UPLOADS_PER_CALL) >= Number.MAX_SAFE_INTEGER){
                    super._addError(`CDN_MAX_UPLOADS_PER_CALL is not a number or is out of range, (Valid range is 1 to ${Number.MAX_SAFE_INTEGER})`);
        }

        //CDN_SUPPORTED_FILE_FORMATS is required and can't be null or empty:
        if(!process.env.CDN_SUPPORTED_FILE_FORMATS){
            super._addError("CDN_SUPPORTED_FILE_FORMATS is required and can't be null or empty.");
        }

        //CDN_USERS_PREFIX is required and can't be null or empty:
        if(!process.env.CDN_USERS_PREFIX){
            super._addError("CDN_USERS_PREFIX is required and can't be null or empty.");
        }

        //CDN_INGREDIENTS_PREFIX is required and can't be null or empty:
        if(!process.env.CDN_INGREDIENTS_PREFIX){
            super._addError("CDN_INGREDIENTS_PREFIX is required and can't be null or empty.");
        }

        //LOG_DSN is required and can't be null or empty:
        if(!process.env.LOG_DSN){
            super._addError("LOG_DSN is required and can't be null or empty.");
        }

        //LOG_SOURCE is required and can't be null or empty:
        if(!process.env.LOG_SOURCE){
            super._addError("LOG_SOURCE is required and can't be null or empty.");
        }
        
        return this;
    }
}

module.exports = ConfigValidator;
