import { describe, it } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import { classifyEmail, extractEmails, isBlockedHost, normalizeDomain, robotsDisallowsAll } from "./scrape-extract";

describe("scraper extraction", () => {
  it("extracts business emails and skips image names and noreply", () => {
    const html = `<a href="mailto:Info@Hotel.is">x</a> logo@2x.png noreply@hotel.is booking [at] hotel.is`;
    deepStrictEqual(extractEmails(html).sort(), ["booking@hotel.is", "info@hotel.is"]);
  });
  it("classifies booking addresses", () => {
    strictEqual(classifyEmail("reservations@x.lt"), "booking");
    strictEqual(classifyEmail("info@x.lt"), "general");
  });
  it("blocks internal hosts (SSRF)", () => {
    strictEqual(isBlockedHost("127.0.0.1"), true);
    strictEqual(isBlockedHost("localhost"), true);
    strictEqual(normalizeDomain("http://10.0.0.1/admin"), null);
    strictEqual(normalizeDomain("https://www.Hotel.is/contact"), "hotel.is");
  });
  it("respects robots disallow-all", () => {
    strictEqual(robotsDisallowsAll("User-agent: *\nDisallow: /"), true);
    strictEqual(robotsDisallowsAll("User-agent: *\nDisallow: /admin"), false);
  });
});

describe("platform filter", () => {
  it("rejects booking platforms but keeps small hotel sites", async () => {
    const { isPlatformDomain } = await import("./scrape-extract");
    strictEqual(isPlatformDomain("booking.com"), true);
    strictEqual(isPlatformDomain("www.airbnb.co.uk"), true);
    strictEqual(isPlatformDomain("miamibeachinn.com"), false);
  });
});
