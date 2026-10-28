import { describe, expect, it } from "vitest";
import { classifyEmail, extractEmails, isBlockedHost, normalizeDomain, robotsDisallowsAll } from "./scrape-extract";

describe("scraper extraction", () => {
  it("extracts business emails and skips image names and noreply", () => {
    const html = `<a href="mailto:Info@Hotel.is">x</a> logo@2x.png noreply@hotel.is booking [at] hotel.is`;
    expect(extractEmails(html).sort()).toEqual(["booking@hotel.is", "info@hotel.is"]);
  });
  it("classifies booking addresses", () => {
    expect(classifyEmail("reservations@x.lt")).toBe("booking");
    expect(classifyEmail("info@x.lt")).toBe("general");
  });
  it("blocks internal hosts (SSRF)", () => {
    expect(isBlockedHost("127.0.0.1")).toBe(true);
    expect(isBlockedHost("localhost")).toBe(true);
    expect(normalizeDomain("http://10.0.0.1/admin")).toBeNull();
    expect(normalizeDomain("https://www.Hotel.is/contact")).toBe("hotel.is");
  });
  it("respects robots disallow-all", () => {
    expect(robotsDisallowsAll("User-agent: *\nDisallow: /")).toBe(true);
    expect(robotsDisallowsAll("User-agent: *\nDisallow: /admin")).toBe(false);
  });
});
