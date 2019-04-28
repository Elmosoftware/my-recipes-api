// @ts-check

var mongoose = require("mongoose");
var helper = require("./entity-helper");

let schema = new mongoose.Schema(helper.addCommonEntityAttributes({
    /**
     * A reference to the User to which this UserDetails belongs.  
     */
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    /**
     * This is the name of the provider. Could be the Authentication service provider itself or a third-party like Google, Facebook, etc.
     */
    providerName: { type: String, required: true },
    /**
     * Sign up date.
     */
    memberSince: { type: Date, required: true },
    /**
     * Timestamp for the last successful login the user had.
     */
    lastLogin: { type: Date, required: false },
    /**
     * Indicates if the user creates and account in the authentication service provider or log in through another social provider like Google, Facebook, Twitter, etc.
     */
    isSocial: { type: Boolean, required: true },
    /**
     * Picture of the user.
     */
    picture: { type: String, required: false },
    /**
     * Indicates if the user email has been already verified by the authentication service provider.
     */
    emailVerified: { type: Boolean, required: true },
    /**
     * Indicates if the user has been granted with administrative privileges.
     */
    isAdmin: { type: Boolean, required: true }
}, false)); /* NOTE:
                This entity will not have audit fields for the same case as for "User". Check the notes there.
            */

schema.methods.toJSON = function () {
    return helper.preProcessJSON(this);
}

schema.index({ user: 1, deletedOn: 1 }, { unique: true, background: true, name: "EntityConstraint" });

module.exports = mongoose.model("UserDetails", schema, "userdetails");