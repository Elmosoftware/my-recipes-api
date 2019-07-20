// @ts-check
var express = require("express");
var routerMedia = express.Router();

const Service = require("./media-service");
var multer = require('multer'); //middleware used to handle multipart form data, used for file uploading.
var multerupload = multer({ dest: process.env.LOCAL_UPLOAD_FOLDER })

//Middleware function specific to this route:
routerMedia.use(function (req, res, next) {

    //Do anything required here like logging, etc...

    next();
});

routerMedia.get("/carousel-pictures/*", (req, res) => {

    const svc = new Service();

    svc.getCarouselPictures((err, data) => {
        req["context"].sendResponse(err, data);
    });
})

routerMedia.get("/ingredients-pictures/*", (req, res) => {

    const svc = new Service();

    svc.getIngredientsPictures(req["context"].query, (err, data) => {
        req["context"].sendResponse(err, data);
    }, );
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