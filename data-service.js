// @ts-check
var mongoose = require("mongoose");
const ServiceValidator = require("./service-validator");
const Security = require("./security-service");
const Entities = require("./entities");

/**
 * Data API Service
 */
class Service {

    constructor(entity) {
        this._entity = entity;
    }

    /**
     * Return a new Entity Object ID
     */
    getNewobjectId() {
        return mongoose.Types.ObjectId();
    }

    /**
     * Set the audit inforomation in the docuent before to be persisted.
     * @param {boolean} isNewDoc Indicates if we are doing an insert or an update of a document.
     * @param {any} doc The document to be persisted. It must inherits from Entity class in order to fullfill the audit data.
     * @param {any} user User details.
     */
    setAuditData(isNewDoc, doc, user) {

        //Audit data for new documents:
        if (isNewDoc) {
            doc.createdOn = new Date();
            doc.createdBy = user.id;
            doc.lastUpdateOn = null;
            doc.lastUpdateBy = null;
            doc.deletedOn = null;
        }
        else { //If we are updating an existing document:
            doc.lastUpdateOn = new Date();
            doc.lastUpdateBy = user.id;
            doc.deletedOn = null;
        }
    }

    /**
     * Add an Entity document to the database.
     * 
     * @param {object} document Entity document
     * @param {object} user RequestContext.user object.
     * @param {function} callback Callback function.
     */
    add(document, user, callback) {
        var val = new ServiceValidator();
        var promises = [];

        if (!val.validateCallback(callback)
            .validateAccess(Security.ACCESS_TYPE.WRITE, this._entity, user)
            .isValid) {
            return (callback(val.getErrors(), {}));
        }
        //#region IMPORTANT NOTE RELATED TO SUBDOCUMENTS AND THE WAY MONGO DB DEAL WITH THEM:
        /*  ===========================================================================

            ISSUE DESCRIPTION:
            ------------------
            If we have the case of a document with child documents, (a.k.a: subdocs), and this subdocs are new ones; when 
            we persist the data we will get a cast exception.

            SOLUTION:
            ---------
            If we want to allow to create in the fly subdocuments as part of a parent document creation, we need to:

            1st - Save the subdocument/s.
            2nd - Change the document reference to the ObjectId reference of the subdoc created in 1st pass.
            3rd - Save the Parent document.

            Check the following online about this issue: 
            https://stackoverflow.com/questions/14758761/mongoose-create-reference-on-model-save?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa

            EXAMPLE:
            --------
            Let's supose we have the following schema defined with a One to Many relationship:

            mongoose.model("MyChild", new mongoose.Schema({
                childName: { type: String }
            }));
            mongoose.model("MyParent", new mongoose.Schema({
                parentName: { type: String }
                childCollection: [{ type: mongoose.Schema.Types.ObjectId, ref: "MyChild" }]
            }));

            If we try to save the following document:

            var MyParent = {
                parentName: "A normal parent referencing to already existing childs"
                childCollection: ["5adb3d054f78834a94a25f6a", "5aae9bf7d096af48709a21dd"]
            }
            
            This will normally not cause any issues, because the lack of referential integrity, Mongo will save the 
            document and assume the ObjectIds specified for the childs are valid ones. 
            But if we reference as childs, new documents like here:

            var MyParent = {
                parentName: "A parent referencing childs that do not exist yet!"
                childCollection: [{ childName: "Child #1"}, { childName: "Child #2"}]
            }

            This will cause a Casting exception. So we need to proceed as described in the solution. Let's see in detail using the 
            same sample case:

            1st - Save the subdocument/s.
                var myChildOne = { childName: "Child #1"}
                var myChildTwo = { childName: "Child #2"}

            2nd - Change the document reference to the ObjectId reference of the subdoc created in 1st pass.
                As part of the process of saving the childs, we get his new _ids. So now we replace the objects 
                by the ids in the parent and we persist the parent document a usual:
            var MyParent = {
                parentName: "A parent referencing childs that do not exist yet!"
                childCollection: ["{here the Child #1 ObjectId}", "{here the Child #2 ObjectId}"}]
            }
            3rd - Now we can save the parent object without issues.
        */
        //#endregion
        if (!val.isValidObjectId(document._id)) {
            document._id = this.getNewobjectId();
        }

        //We look recursively to all the subdocuments and save them:
        promises = this.saveSubDocs(document, user, true, true)

        //This is to keep a reference to the model so we can persist the parent
        //document only if the subdocs where persisted successfully. 
        promises.push(Promise.resolve(this._entity.model)); //There is probably a better way to do this but i didn't find it :-(.

        Promise.all(promises)
            //If all Subdocs has been successfully persisted, we can proceed to try 
            //persisting the parent document:
            .then((results) => {
                try {
                    let model = results.pop(); //The last promise always holds a reference to the parent document model.
                    let obj = model.hydrate(document);

                    obj.isNew = true;
                    this.setAuditData(true, obj, user);
                    obj.save(callback);
                } catch (err) {
                    callback(err, {});
                }
            })
            //If there was any issues saving the subdocs, we will not save the parent doc:
            .catch((err) => {
                callback(err, {});
            });
    }

    /**
     * Update an existing Entity document.
     * @param {string | object} id Object ID of the Entity document to update
     * @param {object} document Entity Document updated data.
     * @param {object} user RequestContext.user object.
     * @param {function} callback Callback function.
     */
    update(id, document, user, callback) {
        var val = new ServiceValidator();
        var promises = [];

        if (!val.validateCallback(callback)
            .validateAccess(Security.ACCESS_TYPE.WRITE, this._entity, user)
            .validateDocument(document, this._entity)
            .isValid) {
            return (callback(val.getErrors(), {}));
        }

        if (!val.isValidObjectId(document._id)) {
            document._id = id;
        }

        //Regarding subdocs, we proceed in the same way as in the add method:
        promises = this.saveSubDocs(document, user, false, true)
        promises.push(Promise.resolve(this._entity.model));

        Promise.all(promises)
            .then((results) => {
                try {
                    let model = results.pop();

                    console.log(`SUBDOCS promises results:`);
                    console.log(`${JSON.stringify(results)
                            .replace(/{/g, "")
                            .replace(/}/g, "\n")}`)
                    
                    this.setAuditData(false, document, user);                   

                    // (node:44156) DeprecationWarning: collection.update is deprecated. Use updateOne, updateMany, or bulkWrite instead.
                    model.update(this._parseConditions(Security.ACCESS_TYPE.WRITE, id, user), document, (err, data) => {
                        //The attempt to update a non existent document by Id is not reported as error by Mongoose:
                        if (!err && data.n == 0) {
                            err = new Error(`The last UPDATE operation affects no documents. This can be caused by the following issues: \n
                                - The document you try to update no longer exists.
                                - The document is owned by another user and therefore you are not able to change it in any way.`);
                        }

                        return (callback(err, {}));
                    });
                } catch (err) {
                    callback(err, {});
                }
            })
            .catch((err) => {
                callback(err, {});
            });
    }

    /**
     * Count projection.
     * @param {string} conditions JSON Filter conditions.
     * @param {object} user RequestContext.user object.
     * @param {object} query RequestContext.query object.
     */
    count(conditions, user, query) {
        var val = new ServiceValidator();

        if (!val.validateConditions(conditions, false, this._entity)
            .validateQuery(query, user)
            .validateAccess(Security.ACCESS_TYPE.READ, this._entity, user, query)
            .isValid) {
            return Promise.reject(val.getErrors());
        }

        return this._entity.model.countDocuments(this._parseConditions(Security.ACCESS_TYPE.READ, conditions, user, query))
            .exec();
    }

    /**
     * Search an Entity document by his Id or all that match the provided JSON Filter conditions.
     * @param {string} conditions JSON Filter conditions or and Entity Object ID.
     * @param {*} projection Query Projection.
     * @param {object} user RequestContext.user object.
     * @param {object} query RequestContext.query object.
     */
    find(conditions, projection, user, query) {
        var val = new ServiceValidator();
        var cursor = null;

        if (!val.validateConditions(conditions, false, this._entity)
            .validateQuery(query, user)
            .validateAccess(Security.ACCESS_TYPE.READ, this._entity, user, query)
            .isValid) {
            return Promise.reject(val.getErrors());
        }

        cursor = this._entity.model.find(this._parseConditions(Security.ACCESS_TYPE.READ, conditions, user, query), projection)
            .skip(Number(query.skip));

        if (query.fields) {
            cursor.select(query.fields);
        }

        if (query.top) {
            cursor.limit(Number(query.top));
        }

        if (query.sort) {
            cursor.sort(query.sort);
        }

        if (query.pop != "false") {
            //Populating first level references:
            cursor.populate(this._entity.references.join(" ").toString())

            //We now populate subdocuments references too (up to first subdoc level only):
            this._entity.references.forEach((item) => {
                let subdocEntity = null;

                if (Array.isArray(this._entity.model.schema.tree[item])) {
                    subdocEntity = Entities.getEntityByModelName(this._entity.model.schema.tree[item][0].ref);
                }
                else {
                    subdocEntity = Entities.getEntityByModelName(this._entity.model.schema.tree[item].ref);
                }

                //If the subdoc has references to  other documents, we need to add them to the populate list:
                if (subdocEntity.references.length > 0) {
                    subdocEntity.references.forEach((ref) => {
                        //#region WATCH OUT!
                        /* 
                            If the subdocument have a reference to the parent document, we MUST NOT 
                            POPULATE IT IN ORDER TO AVOID CIRCULAR REFERENCES.
                            
                            e.g.: 
                                To illustrate the case, let's suppose to have the following model defined in our app:

                            mongoose.model("MyCategory",
                                new mongoose.Schema({
                                    name: { type: String, required: true, unique: true }
                                }));

                            mongoose.model("MySubDoc",
                                new mongoose.Schema({
                                    name: { type: String, required: true, unique: true },
                                    parent: { type: mongoose.Schema.Types.ObjectId, ref: "MyParentDoc", required: true }
                                    category: { type: mongoose.Schema.Types.ObjectId, ref: "MyCategory", required: true }
                                }));

                            mongoose.model("MyParentDoc",
                                new mongoose.Schema({
                                    name: { type: String, required: true, unique: true },
                                    subdocs: [{ type: mongoose.Schema.Types.ObjectId, ref: "MySubDoc", required: true }]
                                }));

                            So if we don't populate, (query.pop == "false"), we can have for example the following document:
                            
                            {
                                "_id": "5b22bf5282e20a4d18840633",
                                "name": "I'm the parent doc",
                                "subdocs": [
                                    {
                                        "_id": "5b22bf5282e20a4d18840634",
                                        "name": "I'm the first subdoc",
                                        "parent": "5b22bf5282e20a4d18840633",
                                        "category": "5af1fe0f52bf1d8be0edd407"
                                    },
                                    {
                                        "_id": "5b22bf5282e20a4d18840635",
                                        "name": "I'm the second subdoc",
                                        "parent": "5b22bf5282e20a4d18840633"
                                        "category": "5af1fe0f52bf1d8be0edd408"
                                    }
                                ]
                            }
                            
                            If we execute the same request, but this time populating, (query.pop != "false"), we will have all the 
                            subdocuments properties (up to first level), populated, with the exception of "parent". Because that one 
                            is a reference of the same model that the parent document.                            
                            
                            So we will get something like this:

                            {
                                "_id": "5b22bf5282e20a4d18840633",
                                "name": "I'm the parent doc",
                                "subdocs": [
                                    {
                                        "_id": "5b22bf5282e20a4d18840634",
                                        "name": "I'm the first subdoc",
                                        "parent": "5b22bf5282e20a4d18840633",
                                        "category": {
                                            "_id": "5af1fe0f52bf1d8be0edd407",
                                            "name": "My first category"
                                        }
                                    },
                                    {
                                        "_id": "5b22bf5282e20a4d18840635",
                                        "name": "I'm the second subdoc",
                                        "parent": "5b22bf5282e20a4d18840633"
                                        "category": {
                                            "_id": "5af1fe0f52bf1d8be0edd408",
                                            "name": "My second category"
                                        }
                                    }
                                ]
                            }

                            The reason why we will not populate beyond first level of subdocuments is because seems to 
                            not be possible on the current version of Mongoose.
                            This means that if for example if the categories holds a property that is a reference to another 
                            model. That property won't be populated.
                        */
                        //#endregion
                        if (subdocEntity.model.schema.tree[ref].ref != this._entity.model.modelName) {
                            cursor.populate({
                                path: item,
                                populate: {
                                    path: ref
                                }
                            })
                        }
                    })
                }
            })
        }

        return cursor.exec();
    }

    /**
     * Delete an Entity document from the database.
     * @param {string} id Entity Object ID
     * @param {object} user RequestContext.user
     * @param {function} callback Callback Function.
     */
    delete(id, user, callback) {
        var val = new ServiceValidator();

        if (!val.validateCallback(callback)
            .validateConditions(id, true, this._entity) //We will admit only an Object Id here as condition.
            .validateAccess(Security.ACCESS_TYPE.DELETE, this._entity, user, null)
            .isValid) {
            return (callback(val.getErrors(), {}));
        }

        this._entity.model.update(this._parseConditions(Security.ACCESS_TYPE.DELETE, id, user),
            { $set: { deletedOn: new Date() } }, (err, data) => {
                //The attempt to soft delete a non existent document by Id is not reported as error by Mongoose:
                if (!err && data.n == 0) {
                    err = new Error(`The last DELETE operation affects no documents. This can be caused by the following issues: \n
                                - The document you try to delete no longer exists.
                                - The document is owned by another user and therefore you are not able to change it in any way.`);
                }

                return (callback(err, {}));
            });
    }

    //#region Private Methods

    /**
     * This method look into any of the references of the parent document schema in order to persist each one of the subdocuments 
     * that has not been set as Object Ids but the hold subdocument.
     * e.g.;
     * If the document holds a property named "address", that is actually a reference to another "Address" schema and the document
     * sent the property with an object id only. Like this:
     *  {
     *      address: "5c7d004982cf9867cceeb9ad"
     *  }
     * We assume the subdoc is already persisted and we are holding just the reference, if that's teh case this method will d Nothing.
     * But this API enable you to pass the hold new subdocument in the property, like this:
     *  {
     *      address: {
     *          city: "London"
     *          street: "Cherry Tree Lane, 17"
     *      }
     *  }
     * The subdocument will be saved and the reference to the new object id will be replaced in the property.
     * Note: If the subdocument is embedded like in the last example, but includes the "_id" property will be automatically updated.
     * @param {any} doc Parent document which subdocs will be evaluated.
     * @param {any} user User details
     * @param {boolean} saveAsNew Indicates if the parent doc is been inserted or updated
     * @param {boolean} isParentDocument This flag must be true only for the parent document. 
     */
    saveSubDocs(doc, user, saveAsNew, isParentDocument = false) {
        var val = new ServiceValidator();
        var promises = [];

        console.log(`Evaluating - ${this._entity.model.modelName}`);

        if (this._entity.references.length > 0) {
            this._entity.references.forEach((prop) => {

                //Check if the property exists:
                if (!doc[prop]) {
                    promises.push(Promise.reject(new Error(`Reference property "${prop}" is missing in ${this._entity.model.modelName}.`)))
                    return;
                }

                //If the property holds an array of child documents (One to many relationship):
                if (Array.isArray(doc[prop])) {
                    /*
                        NOTE:
                            Sadly when it comes to arrays  of child documents, mongoose is not able to track them, (chek more 
                            details here: https://mongoosejs.com/docs/faq.html.
                            So in this particular case we need to force update the subdoc.
                     */
                    for (var i = 0; i < doc[prop].length; i++) {
                        if (!val.isValidObjectId(doc[prop][i])) {
                            //Save the  subdoc:
                            promises = promises.concat(this._saveSubDoc(doc, user, prop, i));
                            //Replacing the reference by the subdoc Id only:
                            doc[prop][i] = doc[prop][i]._id;
                        }
                    }
                }
                //If the property holds one single child document, (One to One relationship), we need 
                //to proceed in the same way:
                /*
                  NOTE:
                    Unlike in the previous case, now we need to do inserts only, (mongoose is taking care of the 
                    updates automatically).
                */
                else if (!val.isValidObjectId(doc[prop]) && !doc[prop]._id) {
                    promises = promises.concat(this._saveSubDoc(doc, user, prop));
                    doc[prop] = doc[prop]._id;
                }
            });
        }

        //The parent document is not persisted here, only his subdocs:
        if (!isParentDocument) {

            if (saveAsNew) {
                console.log(`Creating -> ${this._entity.model.modelName}#${doc._id}`)
                var obj = this._entity.model.hydrate(doc);

                obj.isNew = saveAsNew;
                this.setAuditData(saveAsNew, obj, user);
                promises.push(obj.save());
            }
            else{
                this.setAuditData(saveAsNew, doc, user);
                console.log(`Updating -> ${this._entity.model.modelName}#${doc._id}`)
                promises.push(this._entity.model
                    .update({_id: doc._id}, doc)
                    .exec());
            }
        }

        return promises;
    }

    /**
     * Inner private function for recursivity
     * @param {any} parentDocument Parent document which childs need to be evaluated.
     * @param {any} user User details.
     * @param {string} propertyName Property of the parent document to recurse.
     * @param {number} index If the propety is an array, this is the child index to process.
     */
    _saveSubDoc(parentDocument, user, propertyName, index = null) {

        let ref = this._getReferenceType(this._entity, propertyName);
        let refEntity = Entities.getEntityByModelName(ref);
        let refService = new Service(refEntity);
        let val = null;
        let isNew = false;

        if (Number.isInteger(index)) {
            val = parentDocument[propertyName][index];
        }
        else {
            val = parentDocument[propertyName];
        }

        if (!val._id) {
            //We assign the "_id" here because we need to persist the value in the parent document references without 
            //to wait to the async callback:
            val._id = this.getNewobjectId();
            isNew = true;
        }        
        
        //If the subdocument holds a reference to the parent document, we fill it with the parent Object id:
        if (refEntity.model.schema.obj.hasOwnProperty(this._entity.name)) {
            val[this._entity.name] = parentDocument._id;
        }

        return refService.saveSubDocs(val, user, isNew);
    }

    _getReferenceType(entity, propertyName) {

        let schemaEntry = entity.model.schema.obj[propertyName];
        let ret = "";

        if (Array.isArray(schemaEntry)) {
            ret = schemaEntry[0].ref;
        }
        else {
            ret = schemaEntry.ref;
        }

        return ret;
    }

    _parseConditions(accessType, conditions, user, query) {
        var val = new ServiceValidator();
        var secSvc = new Security.SecurityService();
        let ret = {};

        if (!conditions) {
            conditions = "{}";
        }

        switch (accessType) {
            case Security.ACCESS_TYPE.READ:

                if (val.isValidObjectId(conditions)) {
                    ret._id = conditions;
                }
                else {
                    ret = JSON.parse(decodeURIComponent(conditions));

                    //Adding conditions for "pub" query value:
                    //----------------------------------------
                    //Default behaviour is to include only published entities:
                    if (query.pub == "" || query.pub.toLowerCase() == "default") {
                        ret.publishedOn = { $ne: null };
                    }
                    //If was requested to include not published entities only:
                    else if (query.pub == "notpub") {
                        ret.publishedOn = { $eq: null };
                    }

                    //Adding conditions for "owner" query value:
                    //----------------------------------------
                    if (user && user.id) {

                        let conditions = new Array();

                        if (query.owner.toLowerCase() == "me") {
                            conditions.push(secSvc.getOnlyOwnerAccessCondition(user));
                        }
                        else if (query.owner.toLowerCase() == "others") {
                            conditions.push({ createdBy: { $ne: user.id } });
                            conditions.push({ lastUpdateBy: { $ne: user.id } });
                        }

                        if (conditions.length > 0) {
                            if (!ret.$and) {
                                ret.$and = new Array();
                            }

                            conditions.forEach((cond) => {
                                ret.$and.push(cond);
                            });
                        }
                    }
                }
                break;

            case Security.ACCESS_TYPE.WRITE:

                if (val.isValidObjectId(conditions)) {
                    ret._id = conditions;
                }
                else { //This has been previously validated, but anyway we will throw if not Object ID was sent:
                    throw new Error(`We wait for an Object ID as condition for the DELETE operation, Current condition is ${String(conditions)}`);
                }

                break;
            case Security.ACCESS_TYPE.DELETE:

                if (val.isValidObjectId(conditions)) {
                    ret._id = conditions;
                }
                else { //This has been previously validated, but anyway we will throw if not Object ID was sent:
                    throw new Error(`We wait for an Object ID as condition for the DELETE operation, Current condition is ${String(conditions)}`);
                }

                break;
            default:
                throw new Error(`The provided "accessType" not been defined yet!`);
        }

        //Whatever is the access to the DB, we need to ensure only NOT DELETED documents will be affected:
        ret.deletedOn = { $eq: null };

        //If there is any security specific filter that has to be added based on the kind of access or the specific 
        //entity security needs, will be handled by the Security service.
        secSvc.updateQueryFilterWithSecurityConstraints(accessType, ret, this._entity, user, query);

        return ret;
    }
    //#endregion
}

module.exports = Service;
