// @ts-check

// @ts-ignore
const ver = require('./package.json').version

console.log(`\n -------------------------  MI COCINA API  v${ver} ------------------------- \n`);

//App configuration:
const ConfigValidator = require("./config-validator");
const cfgVal = new ConfigValidator();
const entities = require("./entities");

//App logging:
const LoggingProvider = require("./logging-provider");
const logger = new LoggingProvider();
logger.logInfo("Mi Cocina API is starting ...")

//We validate the current configuration:
if (!cfgVal.validateConfig().isValid) {
    logger.logWarn(`\n\nIMPORTANT: The following configuration errors could prevent the application to start:\n${cfgVal.getErrors().message}
    Please, review your ".env" file and adjust it accordingly.\n\n`);
}

//Express setup:
const express = require("express");
const app = express();
const bodyParser = require("body-parser");

//DB setup:
const mongoose = require("mongoose");
const mongooseOptions = {
    useNewUrlParser: true, //(node:61064) DeprecationWarning: current URL string parser is deprecated.
    useCreateIndex: true, //(node:61064) DeprecationWarning: collection.ensureIndex is deprecated. Use createIndexes instead.
    //After migration to v5.7.7 we are adding the following to avoid other deprecation warnings 
    //as stated in https://mongoosejs.com/docs/deprecations.html:
    useFindAndModify: false,
    useUnifiedTopology: true
};

//Auth settings:
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');

//Context:
const Context = require("./request-context")

//Main routes:
const routerData = require("./router-data"); //API Data route.
const routerManagement = require("./router-management"); //API Management route.
const routerMedia = require("./router-media"); //API Management route.

if (process.env.NODE_ENV != "production") {
    console.log("\nAPP Configuration (non-production site):\n");
    console.log(JSON.stringify(process.env)
        .replace(/,/g, "\n")
        .replace(/{/g, "")
        .replace(/}/g, "") + "\n");
}

//As a safe-guard, we modify specific environment related settings:

//We must not add delay to request in PROD env:
if (process.env.NODE_ENV == "production" && Number(process.env.REQUESTS_ADDED_DELAY) >= 0) {
    process.env.REQUESTS_ADDED_DELAY = "0"
    console.error(`Environment is "prod', so REQUESTS_ADDED_DELAY was set to "0".`)
}

const jwksOptions = {
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTHMANAGEMENT_DOMAIN}/.well-known/jwks.json`
}

const authCheckMiddleware = jwt({
    secret: jwks.expressJwtSecret(jwksOptions),
    audience: `https://${process.env.AUTHMANAGEMENT_DOMAIN}/api/v2/`,
    issuer: `https://${process.env.AUTHMANAGEMENT_DOMAIN}/`,
    algorithms: ['RS256']
}); //This is the middeware function that will check the token in the Authorization header 

mongoose.Promise = global.Promise; // Using native promises.

app.use(bodyParser.json()); // to support JSON-encoded bodies.
app.use(bodyParser.urlencoded({ extended: true })); // to support URL-encoded bodies.

//Routing of Welcome page:
app.get('/', function (req, res) {
    res.sendFile(__dirname + "/index.html");
});

//Routing of Management API
app.use("/api/management",
    // @ts-ignore
    authCheckMiddleware.unless((req) => {

        let endpoint = Context.parseURL(decodeURI(req.url.toString())).endpoint;
        //If the endpoint is "user" or "config-status" and the method is "GET" we must not require auth:
        let ret = req.method.toLowerCase() == "get" && 
            (endpoint == "user" || endpoint == "config-status");

        return ret;
    }),
    Context.middleware(new Context.RequestContextOptions(["login", "user", "config-status"], true)),
    routerManagement);

//Routing of Media API:
app.use("/api/media",
    authCheckMiddleware.unless({ method: 'GET' }),
    Context.middleware(new Context.RequestContextOptions(["carousel-pictures",
        "ingredients-pictures", "upload"], true)),
    routerMedia);

//Routing of Data API:
// @ts-ignore
app.use("/api", authCheckMiddleware.unless((req) => {

    //OPTIONS Method is always excluded from authentication check. 
    //GET requests will be allowed always, but, if they carry the AUTHORIZATION header, we will run the middleware 
    //to process the authentication data:
    let ret = req.method.toLowerCase() == "options" ||
        (req.method.toLowerCase() == "get" && !req.headers.authorization);

    return ret;
}),
    Context.middleware(new Context.RequestContextOptions(entities.getMappedEndpointsList())),
    routerData);

//Adding specific Mongo DB connect options for Prod:
if (process.env.NODE_ENV == "production") {
    mongooseOptions.autoCreate = false;
    mongooseOptions.autoIndex = false;
}

mongoose.connect(process.env.DB_ENDPOINT, mongooseOptions, function (err) {
    if (err) {
        console.log("There was an error connecting to Mongo DB instance. Error description:\n" + err);
    }
    else {
        console.log(`Successfully connected to Mongo DB instance!
Connection options in use:\n${JSON.stringify(mongooseOptions)
                .replace(/,/g, "\n")
                .replace(/{/g, "")
                .replace(/}/g, "")}\n`)
    }
});

app.listen(process.env.PORT, () => {
    console.log(`Server is listening on port: ${process.env.PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);

    if (process.env.NODE_ENV == "development" && process.env.REQUESTS_ADDED_DELAY && Number(process.env.REQUESTS_ADDED_DELAY) > 0) {
        console.warn(`\nWarning!, the configuration value REQUESTS_ADDED_DELAY is established to ${process.env.REQUESTS_ADDED_DELAY} milliseconds.
        This is normally used for debugging purposes and to emulate production environment conditions.`)
    }

    if (process.env.NODE_ENV == "production") {
        console.warn(`\n
        =============================================================
        CURRENT ENVIRONMENT SETTINGS CORRESPONDS TO: PRODUCTION SITE.
        =============================================================\n`)
    }

    console.log(`Executing on folder: ${__dirname}`);
    console.log(`Executing script: ${__filename}`);
    console.log(`\nServer is ready and listening on port:${process.env.PORT}!\n`);
    logger.logInfo(`Mi Cocina API STARTED on "${process.env.NODE_ENV}" env. Listening on port ${process.env.PORT}.`);    
});

process.on("beforeExit", (code) =>{
    logger.logInfo(`Mi Cocina API is stopping with code "${code}".`)
});
