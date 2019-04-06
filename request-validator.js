//@ts-check
const ValidatorBase = require("./validator-base");
const RequestContext = require("./request-context").RequestContext

/**
 * Cross API request validator.
 * @extends ValidatorBase
 */
class RequestValidator extends ValidatorBase {

    constructor() {
        super();
    }

    /**
     * Validates the request context.
     * @param {RequestContext} context RequestContext object. 
     */
    validateRequestContext(context) {

        //The list of valid endpoints is required. It must be always present:
        if (!context.options.validEndpoints || !Array.isArray(context.options.validEndpoints) || context.options.validEndpoints.length == 0) {
            super._addError(`List of valid endpoints is not defined!!!.`);
        }
        else if (!context.options.validEndpoints.includes(context.endpoint.replace(/\//g, ""))) {
            super._addError(`-The requested URI is invalid: "${encodeURI(context.url)}", no endpoint defined in this API with that name.`);
        }

        //Check if the method is supported:
        if (!context.getAllowedHTTPMethods().includes(context.method)) {
            super._addError(`-The requested method is not supported by this API. 
                Method: "${encodeURI(context.method)}". Allowed HTTP methods are: "${context.getAllowedHTTPMethods().join(", ")}".`);
        }

        return this;
    }
}

module.exports = RequestValidator;
