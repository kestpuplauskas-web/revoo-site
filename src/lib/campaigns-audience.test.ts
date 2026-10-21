import { describe, test } from "node:test";
import { deepStrictEqual, strictEqual, rejects } from "node:assert";
import { fetchAllCampaignRows, vilniusDateBounds } from "./campaigns-audience";

describe("campaign creation date and complete audience", () => {
  test("2026-10-21 selects precisely the Lithuanian calendar day", () => {
    deepStrictEqual(vilniusDateBounds("2026-10-21"), {
      start: "2026-10-20T21:00:00.000Z", end: "2026-10-21T21:00:00.000Z",
    });
  });
  test("winter date uses Lithuania's winter offset", () => {
    deepStrictEqual(vilniusDateBounds("2026-01-21"), {
      start: "2026-01-20T22:00:00.000Z", end: "2026-01-21T22:00:00.000Z",
    });
  });
  test("clock change day includes all 25 hours", () => {
    deepStrictEqual(vilniusDateBounds("2026-10-25"), {
      start: "2026-10-24T21:00:00.000Z", end: "2026-10-25T22:00:00.000Z",
    });
  });
  test("reads contacts beyond the first 1000 without loss", async () => {
    const input = Array.from({ length: 3714 }, (_, id) => ({ id }));
    const result = await fetchAllCampaignRows(async (from, to) => ({
      data: input.slice(from, to + 1), error: null,
    }), "failed");
    strictEqual(result.length, 3714);
    deepStrictEqual(result, input);
  });
  test("page failure never returns a silently incomplete audience", async () => {
    await rejects(fetchAllCampaignRows(async () => ({ data: null, error: new Error("failure") }), "Nepavyko"), /Nepavyko/);
  });
});