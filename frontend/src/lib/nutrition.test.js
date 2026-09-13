import {
  describeTarget,
  evaluateMacro,
  meetsTarget,
  missingNames,
  targetDistance,
} from "./nutrition";

/** A recipe shaped the way Spoonacular returns one, with only what we read. */
const recipe = (nutrients, missed = []) => ({
  nutrition: {
    nutrients: Object.entries(nutrients).map(([name, amount]) => ({
      name,
      amount,
      unit: name === "Calories" ? "kcal" : "g",
    })),
  },
  missedIngredients: missed.map((name) => ({ name })),
});

// "Build muscle": 200-800 kcal, 20 g+ protein, everything else unconstrained.
const muscle = {
  calories: { min: 200, max: 800 },
  protein: { min: 20, max: 300 },
  fat: { min: 0, max: 200 },
  carbs: { min: 0, max: 500 },
};

describe("evaluateMacro", () => {
  it("reports a macro inside the target as in range", () => {
    const result = evaluateMacro(recipe({ Protein: 38 }), "protein", muscle);
    expect(result).toMatchObject({ amount: 38, status: "in", unit: "g" });
  });

  it("says how far short an under-target macro falls", () => {
    const result = evaluateMacro(recipe({ Protein: 16 }), "protein", muscle);
    expect(result).toMatchObject({ status: "under", note: "4 g short" });
  });

  it("says how far over an over-target macro goes", () => {
    const result = evaluateMacro(recipe({ Calories: 950 }), "calories", muscle);
    expect(result).toMatchObject({ status: "over", note: "150 kcal over" });
  });

  // A macro sitting at its full slider range means "don't filter on this".
  // Returning a verdict there would put a pass/fail badge on a card for a
  // constraint the user never set.
  it("returns null for a macro the user is not filtering on", () => {
    expect(evaluateMacro(recipe({ Fat: 12 }), "fat", muscle)).toBeNull();
  });

  it("returns null when the API gave us no such nutrient", () => {
    expect(evaluateMacro(recipe({ Calories: 400 }), "protein", muscle)).toBeNull();
  });
});

describe("meetsTarget", () => {
  it("is true only when every set macro is satisfied", () => {
    expect(meetsTarget(recipe({ Calories: 570, Protein: 38 }), muscle)).toBe(true);
    expect(meetsTarget(recipe({ Calories: 570, Protein: 8 }), muscle)).toBe(false);
  });
});

describe("targetDistance", () => {
  it("is zero for a recipe that hits the target", () => {
    expect(targetDistance(recipe({ Calories: 500, Protein: 30 }), muscle)).toBe(0);
  });

  it("grows with the total miss, which is what orders the grid", () => {
    const near = recipe({ Calories: 500, Protein: 18 }); // 2 g short
    const far = recipe({ Calories: 500, Protein: 5 }); // 15 g short
    expect(targetDistance(near, muscle)).toBeLessThan(targetDistance(far, muscle));
  });
});

describe("missingNames", () => {
  it("lists what you'd have to shop for", () => {
    expect(missingNames(recipe({}, ["feta", "dill"]))).toEqual(["feta", "dill"]);
  });

  it("copes with a recipe that has no missing list at all", () => {
    expect(missingNames({})).toEqual([]);
  });
});

describe("describeTarget", () => {
  it("reads as a sentence, not a row of numbers", () => {
    expect(describeTarget(muscle)).toBe("200–800 kcal calories · 20 g+ protein");
  });

  it("says so plainly when nothing is set", () => {
    expect(describeTarget({})).toBe("No macro filtering");
  });
});
