// @ts-check

var Codes = require("./codes")

/**
 * Provides basic methods to apply basic validation rules.
 * Provide an internal repository of validation error messages and also an attribute indicating 
 * if the validation was successful or not.
 */
class ValidatorBase {

    constructor() {
        this._results = [];
        this.userErrorCodeKey = "";
    }

    //#region Private Members
    /**
     * Add and error to the list of error messages found by the validator.
     * @param {string} errorMsg Error message to add.
     */
    _addError(errorMsg) {
        this._results.push("-" + errorMsg)
    }

    /**
     * Allows to set the user error code to return with the Error object by the "getErrors()" method.
     * @param {string} key User error code key
     */
    _setUserErrorCode(key){
        this.userErrorCodeKey = key;
    }
    //#endregion

    get isValid() {
        return (this._results.length == 0);
    }

    getErrors() {
        var ret = null;

        if (!this.isValid) {
            ret = new Error(this._results.join("\n"));

            if (this.userErrorCodeKey) {
                Codes.addUserErrorCode(ret, this.userErrorCodeKey);
            }
        }

        return ret;
    }
}

module.exports = ValidatorBase;