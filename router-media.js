// @ts-check
var express = require("express");
var routerMedia = express.Router();

var Context = require("./request-context");
const Service = require("./media-service");
var multer = require('multer'); //middleware used to handle multipart form data, used for file uploading.
var multerupload = multer({ dest: process.env.LOCAL_UPLOAD_FOLDER })

//Middleware function specific to this route:
routerMedia.use(function (req, res, next) {

    //Do anything required here like logging, etc...

    let options = new Context.RequestContextOptions();

    options.disableEntityCheck = true; //Media API doesn't use entities.
    options.doNotApplyConfiguredDelay = true; //Configured delay doesn't apply to this API.
    options.validEndpoints = [ "carousel", "upload" ];
    
    req["context"] = new Context.RequestContext(req, res, options);

    //If the request is not valid, the RequestContext class already sent the response with the error
    //details, so no need to call next middleware.
    if (req["context"].isValidRequest) {
        next();
    }
});

routerMedia.get("/carousel/*", (req, res) => {

    const svc = new Service();

    svc.getCarouselPictures((err, data) => {
        req["context"].sendResponse(err, data);
    });
})

routerMedia.get("/upload", (req, res) => {

    const svc = new Service();

    svc.getUploadSettings((err, data) => {
        req["context"].sendResponse(err, data);
    });
})

routerMedia.post('/upload', multerupload.any(), (req, res) => {
    const svc = new Service();

    svc.uploadFiles(req.files, (err, data) => {
        req["context"].sendResponse(err, data);
    });
});

module.exports = routerMedia;