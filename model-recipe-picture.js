// @ts-check

var mongoose = require("mongoose");
var helper = require("./entity-helper");

let pictureIdSchema = new mongoose.Schema({
    publicId: { type: String, required: true },
    cloudName: { type: String, required: true }
},
    { _id: false });

let pictureAttributesSchema = new mongoose.Schema({
    width: { type: Number, required: false },
    height: { type: Number, required: false }
},
    { _id: false })

let schema = new mongoose.Schema(helper.addCommonEntityAttributes({
    /**
     * A reference to the Recipe to which this RecipePicture belongs.  
     */
    recipe: { type: mongoose.Schema.Types.ObjectId, ref: "Recipe" },
    /**
     * Public id of the picture as stated by the CDN provider.
     */
    pictureId: pictureIdSchema,
    /**
     * Boolean value indicating if this picture need to be taked as the cover picture of the Recipe it belongs.
     */
    isCover: { type: Boolean, required: true },
    /**
     * An optional picture caption.
     */
    caption: { type: String, required: false },
    /**
     * This is the last transformation URL for the picture. This is only provided for convenience. 
     * This value can be set with any valid url for the resource.
     */
    transformationURL: { type: String, required: true },
    /**
     * Optional picture attributes for the resource.
     */
    attributes: pictureAttributesSchema
}));

schema.methods.toJSON = function () {
    return helper.preProcessJSON(this);
}

schema.index({ recipe: 1, "pictureId.publicId": 1 }, { background: true, name: "RecipePicture_Recipe_PublicId" })

mongoose.model("PictureId", pictureIdSchema)
mongoose.model("PictureAttributes", pictureAttributesSchema)

module.exports = mongoose.model("RecipePicture", schema, "recipepictures");