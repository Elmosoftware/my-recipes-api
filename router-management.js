// @ts-check

var express = require("express");
var routerManagement = express.Router();
var HttpStatus = require("http-status-codes");
var ManagementClient = require('auth0').ManagementClient;
var manage = new ManagementClient({
    domain: process.env.AUTHMANAGEMENT_DOMAIN,
    clientId: process.env.AUTHMANAGEMENT_CLIENT_ID,
    clientSecret: process.env.AUTHMANAGEMENT_CLIENT_SECRET,
    scope: process.env.AUTHMANAGEMENT_SCOPE
});

var Context = require("./request-context");
var ConfigValidator = require("./config-validator");
const Entities = require("./entities");
var Service = require("./data-service");
const Cache = require("./session-cache")

//Middleware function specific to this route:
routerManagement.use(function (req, res, next) {

    //Do anything required here like logging, etc...

    next();
});

routerManagement.get("/config-status", (req, res) => {

    let cfgVal = new ConfigValidator();
    let err = null;

    cfgVal.validateConfig();

    if (!cfgVal.isValid) {
        err = `The following configuration errors has been found:
            ${cfgVal.getErrors().message}`
    }

    req["context"].sendResponse(err, {
        ok: cfgVal.isValid
    }, HttpStatus.OK);
})

routerManagement.get("/login", (req, res) => {

    const svc = new Service(Entities.getEntityByName("user"));
    let query = new Context.RequestQuery();
    query.pop = "true";

    manage.getUser({ id: req["context"].activeSession.providerId }, (err, authServiceUserProfile) => {

        if (err) {
            req["context"].sendResponse(err, {});
        }
        else {
            //We need to check if the user already exist in our database:
            svc.find(JSON.stringify({ providerId: authServiceUserProfile.user_id }), null, req["context"].activeSession, query)
                .then((users) => {

                    let user;

                    //If the user already exists we will update it with the data from the provider:
                    if (users.length > 0) {
                        TryUpdateUser(req, svc, users[0], authServiceUserProfile); //We are querying by a unique key.
                        req["context"].sendResponse(null, users);
                    }
                    else { //If the user just sign up in the App, we need to create it in our Database:
                        user = {
                            _id: svc.getNewobjectId(), //We assign the id here because we need it to update the user audit data 
                            //when adding the user to the collection.
                            providerId: authServiceUserProfile.user_id,
                            name: authServiceUserProfile.user_metadata.fullName,
                            email: authServiceUserProfile.email,
                            publishedOn: new Date(),
                            details: {
                                providerName: authServiceUserProfile.identities[0].provider,
                                isSocial: authServiceUserProfile.identities[0].isSocial,
                                memberSince: authServiceUserProfile.created_at,
                                lastLogin: authServiceUserProfile.last_login,
                                picture: authServiceUserProfile.picture,
                                emailVerified: authServiceUserProfile.email_verified,
                                isAdmin: false
                            }
                        };

                        //We update the user SessionData in context so the audit data will be set fine in the service call:
                        req["context"].activeSession.userId = user._id;
                        req["context"].activeSession.isAdmin = user.details.isAdmin;

                        svc.add(user, req["context"].activeSession, (err, data) => {
                            req["context"].sendResponse(err, data);
                        })
                    }
                })
                .catch((err) => {
                    req["context"].sendResponse(err, {});
                });
        }
    });
})

routerManagement.get("/user/*", (req, res) => {

    const svc = new Service(Entities.getEntityByName("user"));
    let condition = ""; //This is the search condition. Could be an Object Id or a JSON filter.
    
    /*
        The first element in the "params" collections is an Object ID, (e.g: "5a319f76f45778387c6835f7"), a 
        document unique identifier.
        NOTE: So far, just the first parameter is processed, if there is others, those will be ignored.
    */
    if (req["context"].params.length > 0) {
        condition = req["context"].params[0];
    }
    else if (req["context"].query.filter) { //If the condition is not an Object ID, we look at the filter querystring parameter:
        condition = req["context"].query.filter
    }

    //Because we will be returning only not-sensitive user data, we must overwrite some of the request 
    //query parameters, (recall this endpoint is public):
    req["context"].query.pop = "true";
    req["context"].query.fields = "name";

    // if (req["context"].params.length > 0) {
    svc.find(condition, null, req["context"].activeSession, req["context"].query)
        .then((data) => {

            if (data && data.length > 0) {
                //Sadly removing the fields we need to exclude by adding them to the "query.fields" list is not working, so, 
                //we will replace here the "details" subdoc by a new one including only the fields we want:
                data[0].details = {
                    _id: data[0].details._id,
                    memberSince: data[0].details.memberSince,
                    picture: data[0].details.picture
                }
            }

            req["context"].sendResponse(null, data);
        })
        .catch((err) => {
            req["context"].sendResponse(err, {});
        });
})

routerManagement.put("/user", (req, res) => {

    let user = req.body;
    const svc = new Service(Entities.getEntityByName("user"));

    manage.getUser({ id: req["context"].activeSession.providerId }, (err, authServiceUserProfile) => {

        if (err) {
            req["context"].sendResponse(err, {});
        }
        else {
            //If the email has changed:
            if (user.email != authServiceUserProfile.email) {

                user.details.emailVerified = false;

                //We need to update that in the Auth provider:
                manage.updateUser({ id: req["context"].activeSession.providerId },
                    {
                        email: user.email,
                        email_verified: user.details.emailVerified
                    },
                    (err, authServiceUserProfile) => {

                        //After update the email in the service provider, we need to do the same in our DB:
                        if (err) {
                            req["context"].sendResponse(err, {});
                        }
                        else {
                            //We will try to update the user if the update is not sucessfull the user will be updated on next 
                            //login or token refresh:
                            TryUpdateUser(req, svc, user, authServiceUserProfile);
                            req["context"].sendResponse(null, {});
                        }
                    });
            }
            //If the email didn't changed, we still need to update the other user preferences like the user name:
            else {
                TryUpdateUser(req, svc, user, authServiceUserProfile, (err, data) => {
                    req["context"].sendResponse(err, data);
                })
            }
        }
    });
})

//#region Static Methods

function TryUpdateUser(req, svc, user, authServiceUserProfile, cb = null) {

    //User name will be set on creation only. After that will be updated just in the DB.
    user.email = authServiceUserProfile.email;
    user.details.lastLogin = authServiceUserProfile.last_login;
    user.details.picture = authServiceUserProfile.picture;
    user.details.emailVerified = authServiceUserProfile.email_verified;

    //We also take care of update or set the user session in cache:
    req.context.activeSession.isAdmin = user.details.isAdmin;
    Cache.sessionCache.set(req.context.activeSession);

    //We are going to try update, if we fails is not the big deal. Right data will be sent anyway to the Client:
    svc.update(user._id, user, req["context"].activeSession, (err, data) => {

        if (cb) {
            cb(err, data)
        }
        else if (err) {
            console.warn(`Update of User data for the login process fails. This is not critical.
            Error details: ${(err.message) ? err.message : err}.`)
        }
    });
}

//#endregion

module.exports = routerManagement;