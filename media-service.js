// @ts-check
const ServiceValidator = require("./service-validator");
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CDN_CLOUD_NAME,
    api_key: process.env.CDN_API_KEY,
    api_secret: process.env.CDN_API_SECRET
});

/**
 * Media API Service
 */
class MediaService {

    constructor() {
    }

    getCarouselPictures(callback) {
        var val = new ServiceValidator();
        var options = {
            type: 'upload',
            prefix: this._getRandomCarouselFolder(),
            context: true
        }

        if (!val.validateCallback(callback)
            .isValid) {
            return (callback(val.getErrors(), {}));
        }

        cloudinary.api.resources(options, (err, data) => {

            let resources = [];

            if (!err && data && data.resources) {
                data.resources.forEach(resource => {
                    let obj = new Media(this._applyImageTransformations(resource.secure_url),
                        (resource.context && resource.context.custom) ? resource.context.custom : null,
                        resource.public_id, process.env.CDN_CLOUD_NAME, resource.width, resource.height);
                    resources.push(obj);
                });
            }

            callback(err, resources)
        });
    }

    getUploadSettings(callback) {

        var val = new ServiceValidator();
        var data = null;

        if (!val.validateCallback(callback)
            .isValid) {
            return (callback(val.getErrors(), {}));
        }

        data = {
            cloudName: process.env.CDN_CLOUD_NAME || "",
            filesPrefix: process.env.CDN_USERS_PREFIX || "",
            maxFilesSize: process.env.CDN_MAX_UPLOAD_SIZE || "",
            maxUploadsPerCall: process.env.CDN_MAX_UPLOADS_PER_CALL || "",
            supportedFileFormats: []
        }

        if (process.env.CDN_SUPPORTED_FILE_FORMATS) {
            data.supportedFileFormats = process.env.CDN_SUPPORTED_FILE_FORMATS.toLowerCase().split(",");
        }

        callback(null, data)
    }

    uploadFiles(files, callback) {

        var val = new ServiceValidator();
        let promises = []
        let options = { folder: process.env.CDN_USERS_PREFIX }
        
        if (!val.validateCallback(callback)
            .validateMediaUploadContent(files)
            .isValid) {
            return (callback(val.getErrors(), {}));
        }

        //Uploading the images to the CDN provider:
        files.forEach((file) => {
            promises.push(cloudinary.uploader.upload(file.path, options));
        });

        Promise.all(promises)
        .then((results) => {
            try {
                let data = []

                results.forEach((result) => {
                    data.push(new Media(result.secure_url, null, result.public_id, 
                        process.env.CDN_CLOUD_NAME, result.width, result.height));
                })

                callback(null, data);
            } catch (err) {
                callback(err, {});
            }
        })
        .catch((err) => {
            callback(err, {});
        });
    }

    /**
     * This method selects a random subfolder of Carousel pictures from the CDN.
     */
    _getRandomCarouselFolder() {
        return `${process.env.CDN_CAROUSEL_PREFIX}/${this._randomInt(1, Number(process.env.CDN_CAROUSEL_SUBFOLDERS)).toString()}`
    }

    /**
     * Returns a random integer between the specified interval.
     * @param {number} min Minimum random integer to include  in the results.
     * @param {number} max Maximum random integer to include in the results.
     * @author Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
     */
    _randomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    _applyImageTransformations(url) {

        let part = "/image/upload/"

        if (!url) {
            return url;
        }

        //If we set a default carousel image height:
        if (process.env.CDN_CAROUSEL_IMAGE_HEIGHT) {
            url = String(url).replace(`/${process.env.CDN_CLOUD_NAME}${part}`,
                `/${process.env.CDN_CLOUD_NAME}${part}c_scale,h_${process.env.CDN_CAROUSEL_IMAGE_HEIGHT}/`)
        }

        //Apply other configured transformations here...        

        return url;
    }
}

class Media {
    constructor(url, metadata, publicId, cloudName, width, height) {
        this.url = url;
        this.metadata = metadata;
        this.publicId = publicId;
        this.cloudName = cloudName;
        this.width = width;
        this.height = height;
    }
}

module.exports = MediaService;
