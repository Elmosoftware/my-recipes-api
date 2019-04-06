//@ts-check
var path = require('path')
const ValidatorBase = require("./validator-base");
const Security = require("./security-service");
var Codes = require("./codes");

/**
 * Data API Service validator.
 * @extends ValidatorBase
 */
class ServiceValidator extends ValidatorBase {

    constructor() {
        super();
        this.svcSec = new Security.SecurityService();
    }

    /**
     * Validates the requested access.
     * @param {object} accessType Requested Access Type.
     * @param {object} entity Entity object. 
     * @param {object} session RequestContext.activeSession object
     * @param {object} query RequestContext.query object.  
     */
    validateAccess(accessType, entity, session = null, query = null) {
        let ret = ""

        ret = this.svcSec.validateAccessRequest(accessType, entity, session, query);
        
        if (ret) {
            super._addError(ret);
        }

        return this;
    }

    /**
     * Validates the document to be created or updatedby this API.
     * @param {object} document Entity object to be validated.
     * @param {object} entity Entity model object. 
     */
    validateDocument(document, entity) {
        let ret = "";
        
        if (!document) {
            ret = `The parameter "document" can't be a null reference. Parameter value: '${document}'.`;
        }
        else if (!(document === Object(document))) {
            ret = `We expected an Object for parameter "document" and we get a type of '${typeof document}'.`;
        }

        if (!ret) {
            let hasHidden = false;

            Object.getOwnPropertyNames(document).forEach((prop) => {
                if (entity.hiddenFields.includes(prop)) {
                    hasHidden = true;
                }
            })

            if (hasHidden) {
                ret = `At least one of the following attributes were found in the JSON filter: ${entity.hiddenFields.join(", ")}. ` +
                    `Those attributes are for internal use only, please remove them from the document and try again.`
            }
        }

        if (ret) {
            super._addError(ret);
        }

        return this;
    }

    /**
     * Validate the supplied callback function.
     * @param {function} callback 
     */
    validateCallback(callback) {
        let ret = "";

        if (typeof callback !== "function") {
            ret = `We expected a callback function in parameter "callback" and we get a type of '${(!callback) ? "null|undefined" : (typeof callback)}'.`;
        }

        if (ret) {
            super._addError(ret);
        }

        return this;
    }

    /**
     * 
     * @param {string} conditions Filter conditions or an Object ID.
     * @param {boolean} onlyAllowObjectId Boolean value indicating if only an Object ID will be acceptable as parameter.
     * @param {object} entity Entity model object.
     */
    validateConditions(conditions, onlyAllowObjectId, entity) {
        let notQueryableFieldsFound = false;
        let ret = "";

        onlyAllowObjectId = (onlyAllowObjectId) ? true : false;

        if (!(typeof conditions === "string")) {
            ret = `We expected a String for parameter "conditions" and we get a type of '${typeof conditions}'.`;
        }
        else {

            var isJSONFilter = conditions.toString().startsWith("{");

            //If only Object Ids are allowed as parameters:
            if (onlyAllowObjectId && isJSONFilter) {
                ret = `We expected only Object Ids as parameters for this request. Filter parameters are forbidden for this particular action. Parameter received: '${conditions}'`
            }

            //If the parameter is not a JSON Filter and also is not empty, we check if it's a valid Object Id:
            if (!isJSONFilter && conditions && !this.isValidObjectId(conditions.toString())) {
                ret = `The Object Id '${conditions}' is not a valid object Id.`;
            }

            //We check for not queryable fields included in the JSOn filter:
            if (!ret && isJSONFilter) {
                entity.notQueryableFields.forEach((attr) => {
                    if (!notQueryableFieldsFound && conditions.indexOf(`"${attr}":`) != -1) {
                        notQueryableFieldsFound = true;
                    }
                });

                if (notQueryableFieldsFound) {
                    ret = `At least one of the following invalid attributes were found in the JSON filter: ${entity.notQueryableFields.join(", ")}
                        Please use the query parameters "pub" and "owner" to get specific sets of data involving those attributes.`
                }
            }
        }

        if (ret) {
            super._addError(ret);
        }

        return this;
    }

    /**
     * Validate the supplied querystring parameters in the HTTP request.
     * @param {object} query RequestContext.query object.
     * @param {object} session RequestContext.activeSession object
     */
    validateQuery(query, session) {
        let ret = "";

        if (!query) {
            ret = `The parameter "query" can't be null or empty. Parameter value: '${query}'.`;
        }
        else if (!(query === Object(query))) {
            ret = `We expected an Object for parameter "query" and we get a type of '${typeof query}'.`;
        }
        else {
            if (query.skip || query.top) {
                this._validatePagination(query.skip, query.top);
            }
            if (query.pop) {
                this._validatePopulateReferences(query.pop);
            }
            if (query.count) {
                this._validateCount(query.count);
            }
            if (query.fields) {
                this._validateFields(query.fields);
            }
            if (query.pub) {
                this._validatePub(query.pub, session);
            }
            if (query.owner) {
                this._validateOwner(query.owner, session)
            }
        }

        if (ret) {
            super._addError(ret);
        }

        return this;
    }

    validateMediaUploadContent(files){
        let ret = "";
        let userCode = "";
        let fileFormats = process.env.CDN_SUPPORTED_FILE_FORMATS.toLowerCase().split(",");

        if (!files || !Array.isArray(files)) {
            ret = `We expect an array for Parameter "files" but is a null reference or not an array.`;
            userCode = Codes.UploadNoFiles.key;
        }
        else if (files.length == 0) {
            ret = `No files provided to upload. Parameter "files" is an array with no elements.`;
            userCode = Codes.UploadNoFiles.key;
        }
        else if (files.length > Number(process.env.CDN_MAX_UPLOADS_PER_CALL)) {
            ret = `The upload request contains more files than allowed. Total files submitted: ${files.length}, total files allowed ${process.env.CDN_MAX_UPLOADS_PER_CALL}.`;
            userCode = Codes.UploadTooManyFiles.key
        }
        else {
            //Still need to check for max file size per each one:
            for (let i = 0; i < files.length; i++) {

                let file = files[i];
                let fileExt = path.extname(file.originalname);
        
                if (file.size > Number(process.env.CDN_MAX_UPLOAD_SIZE)) {
                    ret = `The size of file number ${i+1}, original name: "${file.originalname}" is bigger than allowed. File size: ${file.size} bytes. Maximum upload size: ${process.env.CDN_MAX_UPLOAD_SIZE} bytes.`;
                    userCode = Codes.UploadTooBigFile.key
                }
                else if (!fileExt) {
                    ret = `Submitted file has no extension so we cannot process it. File number ${i+1}, original name: "${file.originalname}".`;
                    userCode = Codes.UploadFileWithoutExtension.key;
                }
                else if(!fileFormats.includes(fileExt)) {
                    ret = `File type is not supported.File number ${i+1}, original name: "${file.originalname}", Supported file types:"${process.env.CDN_SUPPORTED_FILE_FORMATS}".`;
                    userCode = Codes.UploadNotSupportedFile.key;
                }
                
                if (ret) {
                    break;
                }                
            }
        }

        if (ret) {
            super._addError(ret);
        }

        if (userCode) {
            super._setUserErrorCode(userCode);
        }

        return this;
    }

    /**
     * Returns a boolean value indicating if the supplied string is a valid Object ID.
     * @param {string} id Object ID
     */
    isValidObjectId(id) {
        /*
            Created by Felipe Lorenzo VI 
            https://github.com/cnkdynamics/valid-objectid
        */

        // check first if undefined
        if (!id) {
            return false;
        }

        // check if id is a valid string
        if (typeof id !== 'string') {
            id = String(id);
        }

        // simply match the id from regular expression
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            return true;
        } else {
            return false;
        }
    }

    //#region Private Members

    _validatePagination(skip, top) {
        let ret = "";

        if (!((typeof skip === "string") || (typeof skip === "number"))) {
            ret = `We expected a String or Number for the pagination parameter "skip".
                Current type: "skip" is "${typeof skip}".`;
        }
        else if (!((typeof top === "string") || (typeof top === "number"))) {
            ret = `We expected a String or Number for the pagination parameter "top".
                Current type: "top" is "${typeof top}".`;
        }
        else if (Number.isNaN(Number(skip))) {
            ret = `The pagination parameter "skip" is not a number.
                Current value: "skip"=${skip}.`;
        }
        else if (Number.isNaN(Number(top))) {
            ret = `The pagination parameter "top" is not a number.
                Current value: "top"=${top}.`;
        }
        else if (skip != "" && Number(skip) < 0) {
            ret = `The pagination parameter "skip" can't be negative.
                Current value: "skip"=${skip}.`;
        }
        else if (top != "" && Number(top) <= 0) {
            ret = `The pagination parameter "top" can't be negative or zero.
                Current value: "top"=${top}.`;
        }

        if (ret) {
            super._addError(ret);
        }

        return this;
    }

    _validatePopulateReferences(pop) {
        let ret = "";

        if (!(typeof pop === "string")) {
            ret = `We expected a String for the "populate references" query parameter "pop".
                        Current type: "pop" is "${typeof pop}".`;
        }
        else if (!(pop == "" || pop == "true" || pop == "false")) {
            ret = `The "populate references" parameter "pop" can accept only the following values: "true", "false" or empty, (which by default will turn to "true").
                        Current value: "pop"=${pop}.`;
        }

        if (ret) {
            super._addError(ret);
        }

        return this;
    }

    _validateCount(value) {
        let ret = "";

        if (!(typeof value === "string")) {
            ret = `We expected a String for the "Count records" query parameter "count".
                        Current type: "count" is "${typeof value}".`;
        }
        else if (!(value == "" || value == "true" || value == "false")) {
            ret = `The "Count Records" parameter "count" can accept only the following values: "true", "false" or empty, (which by default will turn to "false").
                        Current value: "count"=${value}.`;
        }

        if (ret) {
            super._addError(ret);
        }

        return this;
    }

    _validateFields(value) {
        let ret = "";

        if (!(typeof value === "string")) {
            ret = `We expected a String for the "Fields selection" query parameter "fields".
                        Current type: "fields" is "${typeof value}".`;
        }

        if (ret) {
            super._addError(ret);
        }

        return this;
    }

    _validatePub(value, session) {
        let ret = "";
        /*
            "pub" query parameter valid values and meaning:
            ======================================
            "default" or missing argument, ("") -> Only include Published entities in the results.
            "all" -> include both published and not published entities in the results.
            "notpub" -> Only include Not Published entities in the results. 
        */
        let validValues = ["", "default", "all", "notpub"];

        if (!(typeof value === "string")) {
            ret = `We expected a String for the "Published indicator" query parameter "pub".
                        Current type: "pub" is "${typeof value}".`;
        }
        else if (!validValues.includes(value.toLowerCase())) {
            ret = `The query parameter "pub" has an invalid value.
            Current value is: "${value}".
            Possible values are: ${validValues.join(", ")}.`;
        }
        else if (!session && (value.toLowerCase() == "all" || value.toLowerCase() == "notpub")) {
            ret = `The query option "pub" was specified with value '${value}' but there is no authenticated user for this request`;
        }

        if (ret) {
            super._addError(ret);
        }

        return this;
    }

    _validateOwner(value, session) {
        let ret = "";
        /*
            "owner" query parameter valid values and meaning:
            ==================================================

            "any" or missing argument, ("") -> Will retrieve any entity regardless of which user is the owner.
            "me" -> Will retrieve only entities owned by the authenticated user.
            "others" -> Will retrieve only entities owned by other users different than the current authenticated user.
        */
        let validValues = ["", "any", "me", "others"];

        if (!(typeof value === "string")) {
            ret = `We expected a String for the "Ownership" query parameter "owner".
                        Current type: "owner" is "${typeof value}".`;
        }
        else if (!validValues.includes(value.toLowerCase())) {
            ret = `The query parameter "owner" has an invalid value.
            Current value is: "${value}".
            Possible values are: ${validValues.join(", ")}.`;
        }
        else if (!session && (value.toLowerCase() == "me" || value.toLowerCase() == "others")) {
            ret = `The query option "owner" was specified with value '${value}' but there is no authenticated user for this request`;
        }

        if (ret) {
            super._addError(ret);
        }

        return this;
    }

    //#endregion
}

module.exports = ServiceValidator;
