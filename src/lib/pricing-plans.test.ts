import { describe, expect, it } from "vitest";
import { earnFee, unitDisplayPrice, unitMonthlyPrice } from "./pricing-plans";

describe("pricing plans", () => {
  it("applies €79 minimum", () => expect(unitMonthlyPrice(3)).toBe(79));
  it("uses €12 up to 10 units", () => expect(unitMonthlyPrice(10)).toBe(120));
  it("uses €9.5 up to 30 units", () => expect(unitMonthlyPrice(20)).toBe(190));
  it("uses €7.5 up to 60 units", () => expect(unitMonthlyPrice(60)).toBe(450));
  it("uses €6 above 60 units", () => expect(unitMonthlyPrice(100)).toBe(600));
  it("yearly is 10/12 of monthly", () => expect(unitDisplayPrice(20, "yearly")).toBe(158));
  it("earn fee is 2%", () => expect(earnFee(3000)).toBe(60));
});
