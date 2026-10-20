import { describe, test } from "node:test";
import { strictEqual } from "node:assert";
import { demoCtaHref } from "./trial";

describe("trial registration destination", () => {
  test("English trial opens the requested hotel registration address", () => {
    strictEqual(demoCtaHref("en"), "https://app.revoostay.com/register");
  });
  test("Lithuanian contact flow remains independent", () => {
    strictEqual(demoCtaHref("lt"), "/lt/#demo");
  });
});