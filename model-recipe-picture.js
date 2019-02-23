// @ts-check

var mongoose = require("mongoose");
var helper = require("./entity-helper");

let schema = new mongoose.Schema(helper.addCommonEntityAttributes({
    /**
     * A reference to the Recipe to which this RecipePicture belongs.  
     */
    recipe: { type: mongoose.Schema.Types.ObjectId, ref: "Recipe" },
    /**
     * Public id of the picture as stated by the CDN provider.
     */
    publicId: { type: String, required: true },
    /**
     * Boolean value indicating if this picture need to be taked as the cover picture of the Recipe it belongs.
     */
    isCover: { type: Boolean, required: true },
    /**
     * This is an optional test that can act as a picture caption.
     */
    legend: { type: String, required: false }
}));

schema.methods.toJSON = function () {
    return helper.preProcessJSON(this);
}

schema.index({ recipe: 1, publicId: 1 }, { background: true, name: "RecipePicture_Recipe_PublicId" })

module.exports = mongoose.model("RecipePicture", schema, "recipepictures");