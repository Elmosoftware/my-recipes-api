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
                    let obj = new Media(this._getResourceURL(resource.public_id),
                        (resource.context && resource.context.custom) ? resource.context.custom : null,
                        resource.public_id, process.env.CDN_CLOUD_NAME, resource.width, resource.height);

                    resources.push(obj);
                });
            }

            callback(err, resources)
        });
    }

    /**
     * Returns a list of random ingredients pictures. 
     * The amount of pictures to return, can be controlled by the querystring "top" attribute.
     * If the value is greater than the total amount of available pictures, all the pictures will be retrieved. 
     * @param {object} query RequestContext.query object. 
     * @param {function} callback Callback function to return.
     */
    getIngredientsPictures(query, callback) {
        let resources = [];
        let index = 0;
        let top = 0;
        let val = new ServiceValidator();
        let options = {
            type: 'upload',
            prefix: process.env.CDN_INGREDIENTS_PREFIX,
            context: true,
            max_results: 100 //Limiting the total amount of pictures to include.
        }

        if (!val.validateCallback(callback)
            .validateQuery(query, null)
            .isValid) {
            return (callback(val.getErrors(), {}));
        }

        cloudinary.api.resources(options, (err, data) => {

            if (!err && data && data.resources) {

                top = data.resources.length;

                if (query.top) {
                    top = Math.min(parseInt(query.top), top);
                }

                index = this._randomInt(0, data.resources.length - 1); //Index of the first random image

                while (top > 0) {
                    let resource = new Media(this._getResourceURL(data.resources[index].public_id),
                        (data.resources[index].context && data.resources[index].context.custom) ? data.resources[index].context.custom : null,
                        data.resources[index].public_id, process.env.CDN_CLOUD_NAME, data.resources[index].width, data.resources[index].height);
                    resources.push(resource);

                    if (++index == data.resources.length) {
                        index = 0;
                    }
                    top--;
                }
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

    _getResourceURL(publicId) {
        let url = "";
        url = cloudinary.url(publicId, {
            fetch_format: "auto"
        });
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
