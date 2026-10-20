import { describe, expect, test } from "bun:test";
import { demoCtaHref } from "./trial";

describe("trial registration destination", () => {
  test("English trial opens the requested hotel registration address", () => {
    expect(demoCtaHref("en")).toBe("https://app.revoostay.com/register");
  });
  test("Lithuanian contact flow remains independent", () => {
    expect(demoCtaHref("lt")).toBe("/lt/#demo");
  });
});