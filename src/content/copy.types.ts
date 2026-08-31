export type Lang = "en" | "lt";

type TitleBody = { title: string; body: string };

export type Copy = {
  nav: {
    product: string;
    approach: string;
    who: string;
    blog: string;
    faq: string;
    cta: string;
    langLabel: string;
    skip: string;
    home: string;
  };
  hero: {
    eyebrow: string;
    h1: string;
    sub: string;
    primary: string;
    secondary: string;
    status: string;
  };
  carousel: {
    label: string;
    prev: string;
    next: string;
    goTo: string;
    slides: string[];
    alts: {
      booking: string;
      housekeeping: string;
      invoice: string;
      notification: string;
      dashboard: string;
      websiteCalendar: string;
      website1: string;
      website2: string;
    };
  };
  approach: {
    eyebrow: string;
    h2: string;
    lede: string;
    cardA: TitleBody;
    cardB: TitleBody;
  };
  week: {
    eyebrow: string;
    h2: string;
    lede: string;
    points: string[];
  };
  morning: {
    eyebrow: string;
    h2: string;
    lede: string;
    points: string[];
  };
  paperwork: {
    eyebrow: string;
    h2: string;
    lede: string;
    points: string[];
  };
  channel: {
    eyebrow: string;
    h2: string;
    lede: string;
    note: string;
  };
  segments: {
    eyebrow: string;
    h2: string;
    prev: string;
    next: string;
    goTo: string;
    slides: TitleBody[];
  };
  ctaBand: {
    text: string;
    button: string;
  };
  included: {
    eyebrow: string;
    h2: string;
    lede: string;
    left: { title: string; sub: string; items: string[] };
    right: { title: string; sub: string; items: string[] };
  };
  fit: {
    eyebrow: string;
    h2: string;
    lede: string;
    yesTitle: string;
    noTitle: string;
    yes: string[];
    no: string[];
  };
  start: {
    eyebrow: string;
    h2: string;
    lede: string;
    steps: TitleBody[];
    cta: string;
  };
  demo: {
    eyebrow: string;
    h2: string;
    lede: string;
    facts: string[];
    form: {
      name: string;
      email: string;
      property: string;
      country: string;
      countries: string[];
      type: string;
      types: string[];
      units: string;
      unitOptions: string[];
      current: string;
      currentOptions: string[];
      notes: string;
      optional: string;
      required: string;
      submit: string;
      fineprint: string;
      select: string;
    };
    success: { title: string; body: string };
  };
  faq: {
    eyebrow: string;
    h2: string;
    items: { q: string; a: string }[];
  };
  footer: {
    tagline: string;
    linksTitle: string;
    langTitle: string;
    rights: string;
    contact: string;
  };
  blog: {
    title: string;
    eyebrow: string;
    h2: string;
    lede: string;
    readingTime: string;
    back: string;
    metaTitle: string;
    metaDescription: string;
    disclaimer: string;
    ctaTitle: string;
    ctaBody: string;
    ctaButton: string;
  };
  notFound: {
    title: string;
    body: string;
    cta: string;
  };
  media: {
    missing: string;
    browserUrl: string;
    alt: {
      calendar: string;
      housekeepingApp: string;
      housekeepingWeek: string;
      invoice: string;
      bookingSite: string;
    };
  };
  mobileCta: {
    text: string;
    dismiss: string;
  };
};
