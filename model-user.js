// @ts-check

var mongoose = require("mongoose");
var helper = require("./entity-helper");

let schema = new mongoose.Schema(helper.addCommonEntityAttributes({
    /**
     * This is the user id provided by the authentication service provider.
     */
    providerId: { type: String, required: true },
    /**
     * User name.
     */
    name: { type: String, required: true },
    /**
     * User email.
     */
    email: { type: String, required: true },
    /**
     * Other user details like roles, logins, etc.
     */
    details: { type: mongoose.Schema.Types.ObjectId, ref: "UserDetails", required: true }
}, false)); /* NOTE:
                This entity will not have audit fields in order to avoid circular references because the type of 
                the "createdBy"audit field is "User".
                Also, there si no point that the User or UserDetails entities have this audit data. Because they are 
                only created/updated by the own user.
            */

schema.methods.toJSON = function () {
    return helper.preProcessJSON(this);
}

schema.index({ providerId: 1, deletedOn: 1 }, { unique: true, background: true, name: "EntityConstraint" });
schema.index({ email: 1 }, { unique: false, background: true, name: "Email" });

module.exports = mongoose.model("User", schema, "users");