import { describe, test } from "node:test";
import { strictEqual } from "node:assert";
import { earnFee, unitDisplayPrice, unitMonthlyPrice } from "./pricing-plans";

describe("pricing plans", () => {
  test("applies €79 minimum", () => strictEqual(unitMonthlyPrice(3), 79));
  test("uses €12 up to 10 units", () => strictEqual(unitMonthlyPrice(10), 120));
  test("uses €9.5 up to 30 units", () => strictEqual(unitMonthlyPrice(20), 190));
  test("uses €7.5 up to 60 units", () => strictEqual(unitMonthlyPrice(60), 450));
  test("uses €6 above 60 units", () => strictEqual(unitMonthlyPrice(100), 600));
  test("yearly is 10/12 of monthly", () => strictEqual(unitDisplayPrice(20, "yearly"), 158));
  test("earn fee is 2%", () => strictEqual(earnFee(3000), 60));
});
