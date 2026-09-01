const MAP: Record<string, string> = {
  ą: "a",
  č: "c",
  ę: "e",
  ė: "e",
  į: "i",
  š: "s",
  ų: "u",
  ū: "u",
  ž: "z",
  ä: "a",
  ö: "o",
  ü: "u",
  õ: "o",
  å: "a",
  æ: "ae",
  ø: "o",
  ß: "ss",
  þ: "th",
  ð: "d",
};

/** Slug be lietuviškų raidžių, be tarpų, tik mažosios raidės, skaičiai ir brūkšneliai. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ąčęėįšųūžäöüõåæøßþð]/g, (ch) => MAP[ch] ?? ch)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160)
    .replace(/-+$/g, "");
}
