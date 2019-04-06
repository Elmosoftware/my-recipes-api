//@ts-check

var assert = require("assert");
var entities = require("../entities")

describe("Entities", () => {
  describe("hasEntity()", () => {
    it("Should return 'true' for the entity 'unit'", () => {
      assert.equal(entities.hasEntity("unit"), true);
    });
    it("Should return 'true' for the entity 'ingredient'", () => {
      assert.equal(entities.hasEntity("ingredient"), true);
    });
    it("Should return 'true' for the entity 'level'", () => {
      assert.equal(entities.hasEntity("level"), true);
    });
    it("Should return 'true' for the entity 'mealtype'", () => {
      assert.equal(entities.hasEntity("mealtype"), true);
    });
    it("Should return 'true' for the entity 'recipe'", () => {
      assert.equal(entities.hasEntity("recipe"), true);
    });
    it("Should return 'true' for the entity 'recipepicture'", () => {
      assert.equal(entities.hasEntity("recipepicture"), true);
    });
    it("Should return 'true' for the entity 'recipeingredient'", () => {
      assert.equal(entities.hasEntity("recipeingredient"), true);
    });
    it("Should return 'true' for the entity 'user'", () => {
      assert.equal(entities.hasEntity("user"), true);
    });
    it("Should return 'true' for the entity 'userdetails'", () => {
      assert.equal(entities.hasEntity("userdetails"), true);
    });
    it("Should return 'false' for the entity 'unknownEntity'", () => {
      assert.equal(entities.hasEntity("unknownEntity"), false);
    });
  });

  // describe("hasEntity()", () => {
  //   it("Shouldn't throw when requesting entity 'units'", () => {
  //     assert.ok(entities.hasEntity("units"));
  //   });
  //   it("Shouldn't throw when requesting entity 'ingredients'", () => {
  //     assert.ok(entities.hasEntity("ingredients"));
  //   });
  //   it("Shouldn't throw when requesting entity 'levels'", () => {
  //     assert.ok(entities.hasEntity("levels"));
  //   });
  //   it("Shouldn't throw when requesting entity 'mealtypes'", () => {
  //     assert.ok(entities.hasEntity("mealtypes"));
  //   });
  //   it("Shouldn't throw when requesting entity 'recipes'", () => {
  //     assert.ok(entities.hasEntity("recipes"));
  //   });
  //   it("Shouldn't throw when requesting entity 'recipeIngredient'", () => {
  //     assert.ok(entities.hasEntity("recipeIngredient"));
  //   });
  //   it("Should throw when requesting entity 'unknownEntity'", () => {
  //     assert.throws(() => {
  //       entities.hasEntity("unknownEntity")
  //       })
  //   });
  // });
});

