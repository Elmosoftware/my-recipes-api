// @ts-check

var mongoose = require("mongoose");

/**
 * Add to the supplied schema definition, all the attributes that are common to any entity.
 * This also support the following custom field attributes:
 *  - hidden {boolean}: Indicates if the field is for internal use only. If this attribute has the 
 * value "true", the field will be removed from the JSON delivered to the client.
 *  - notQueryable {boolean}: Indicates if the field can be used or not on query filter conditions. if this 
 * attribute has the value "true", any attempt to include this in a query filter condition will cause an exception. 
 * @param {*} schemaDefinition Entity schema definition.
 * @param {boolean} includeAuditFields Indicates if audit fields must be added to the schema. Default value is true.
 * @returns The supplied SchemaDefinition with the added common entity attributes.
 */
function addCommonEntityAttributes(schemaDefinition, includeAuditFields = true) {

    if (includeAuditFields) {
        schemaDefinition.createdOn = { type: Date, required: true }; 
        //Following is "notQueryable" because any possible filter must be applied from the "owner" query parameter only:
        schemaDefinition.createdBy = { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, notQueryable: true }; 
        schemaDefinition.lastUpdateOn = { type: Date, required: false };
        schemaDefinition.lastUpdateBy = { type: String, required: false, notQueryable: true };
    }
    
    schemaDefinition.publishedOn = { type: Date, required: false, notQueryable: true };
    schemaDefinition.deletedOn = { type: Date, required: false, hidden: true, notQueryable: true }; //"hidden" because must be  
    //internal only as parte of the "soft deletion" feature.

    return schemaDefinition;
}

/**
 * This method preprocess the JSON that will be delivered to the client for the following purposes:
 *   - Remove attributes marked as "hidden" in the schema definition.
 * @param {*} model Entity model
 */
function preProcessJSON(model) {
    let obj = model.toObject();

    //If an entity property had the "hidden" attribute with value "true", that 
    //property need to be removed from the JSON:
    Object.getOwnPropertyNames(model.schema.obj).forEach((prop) => {
        if (model.schema.obj[prop].hidden) {
            delete obj[prop];
        }
    });

    return obj;
}

module.exports = { addCommonEntityAttributes, preProcessJSON };