import type { FeatureCopy } from "./features.types";

export const featuresEn: FeatureCopy = {
  indexTitle: "Features",
  indexEyebrow: "Features",
  indexMetaTitle: "Revoo Features | Property Management Software",
  indexMetaDescription:
    "Booking engine, property management, pricing, housekeeping, automated invoicing and support — every Revoo feature for independent hotels, cabins and apartments.",
  indexH1: "Revoo *features* for independent properties",
  indexLede:
    "For hotels, guesthouses, cabins and apartments. Pick a feature and see how it works on an ordinary working day.",
  more: "Read more",
  back: "All features",
  ctaTitle: "Curious how this would work at your property?",
  ctaBody: "One 45-minute conversation, and an honest answer either way.",
  ctaButton: "Request a demo",
  keywordsTitle: "Related topics",
  items: [
    {
      key: "booking-engine",
      slug: "booking-engine",
      card: "Booking system",
      eyebrow: "Booking engine",
      h1: "A booking engine on *your* website",
      metaTitle: "Booking Engine for Hotels & Rentals | Revoo",
      metaDescription:
        "A direct booking engine on your own website: live availability, seasonal rates, extras and online payment — commission-free bookings for your property.",
      lede: "Direct booking on your domain, in your design and your language — running on the same engine as your admin panel.",
      sections: [
        {
          h2: "Direct bookings without commission",
          body: "Every booking through an OTA costs a commission. Revoo lets the guest book directly on your site — from searching dates to paying — without leaving your pages.",
          bullets: [
            "Live availability from the same database your calendar uses.",
            "Rates by season, length of stay and number of guests.",
            "Paid extras added during the booking flow.",
            "Automatic confirmation email in the guest's own language.",
          ],
        },
        {
          h2: "A website, not a widget",
          body: "Most systems hand you a box to embed. Revoo works the other way around: your website is the booking system — same typography, same colours, your domain.",
          bullets: [
            "A booking website designed for your property, on your domain.",
            "Multiple languages and currencies for the markets you sell in.",
            "Fast on mobile, where most bookings happen.",
          ],
        },
        {
          h2: "Payments and policies",
          body: "We connect the payment provider you already have a contract with and configure deposits, cancellation and refund rules the way you actually work.",
          bullets: [
            "Deposit, full prepayment or payment on arrival.",
            "Cancellation policy per rate type.",
            "Bookings appear in the shared calendar and block the unit instantly.",
          ],
        },
      ],
      faq: [
        {
          q: "Can I keep my current website?",
          a: "Yes — it can connect to Revoo through the public API. But if your current site cannot take a booking without sending the guest elsewhere, replacing it is usually the change that pays for itself fastest.",
        },
        {
          q: "Do Booking.com reservations show up here?",
          a: "Yes. Availability is imported over iCal from Booking.com and Airbnb and appears in the same calendar, marked as external.",
        },
      ],
      keywords: [
        "booking engine",
        "direct bookings",
        "hotel booking website",
        "commission-free reservations",
        "online reservation system",
      ],
    },
    {
      key: "pms",
      slug: "property-management-system",
      card: "Your property rental management system",
      eyebrow: "Property management",
      h1: "A property management system in *one* place",
      metaTitle: "Property Management System (PMS) | Revoo",
      metaDescription:
        "A property management system for small hotels and rentals: booking calendar, units, rates, guest history, documents and daily tasks in a single tool.",
      lede: "Bookings, units, rates, guests and documents in one system instead of several spreadsheets and inboxes.",
      sections: [
        {
          h2: "Your whole month on one screen",
          body: "Units down the side, days across the top. Drag a booking to another unit or another week and everything connected to it follows.",
          bullets: [
            "Double bookings are refused before you can make one.",
            "Click an empty cell to create a booking already filled in.",
            "Several buildings or addresses run from a single calendar.",
          ],
        },
        {
          h2: "Guests and their history",
          body: "Every guest's bookings, messages, invoices and preferences live on one card, so a returning guest is not a stranger.",
          bullets: [
            "Full booking and payment history per guest.",
            "Automated emails: confirmation, change, cancellation, pre-arrival, review request.",
            "Company guests with registration and VAT numbers, invoiced to the company.",
          ],
        },
        {
          h2: "Team and permissions",
          body: "Reception, housekeeping and management each see what their work requires. Email invitations, roles and access are set up during implementation.",
          bullets: [
            "Roles and permissions per team member.",
            "Cleaners never see guest contacts, prices or payment status.",
            "An audit trail of who changed what, and when.",
          ],
        },
      ],
      faq: [
        {
          q: "Does it work for units at several addresses?",
          a: "Yes. Every unit is its own property, so apartments scattered across different addresses still run from a single calendar.",
        },
        {
          q: "Can existing bookings be migrated?",
          a: "Yes — migrating bookings, units, rates and policies is part of the implementation.",
        },
      ],
      keywords: [
        "property management system",
        "hotel PMS",
        "rental management software",
        "booking calendar",
        "guesthouse software",
      ],
    },
    {
      key: "revenue",
      slug: "revenue-management",
      card: "Revenue optimization",
      eyebrow: "Pricing and revenue",
      h1: "Pricing that *works* for you",
      metaTitle: "Revenue Management & Pricing Tools | Revoo",
      metaDescription:
        "Revenue management for small properties: seasonal rates, length-of-stay pricing, extras, occupancy and revenue reporting, and decisions grounded in your data.",
      lede: "The right price for every room and every date, without recalculating a spreadsheet each week.",
      sections: [
        {
          h2: "Rates by season and demand",
          body: "Set rate tiers by season, weekday or length of stay, and the system applies them automatically — on your website and in the admin panel alike.",
          bullets: [
            "Seasonal and weekend rates per unit type.",
            "Long-stay discounts and minimum-stay rules.",
            "Paid extras with their own prices and VAT rates.",
          ],
        },
        {
          h2: "Reporting you can act on",
          body: "Occupancy, revenue and average nightly rate by period and by unit show where you are priced too low and where too high.",
          bullets: [
            "Occupancy, revenue and expenses in one dashboard.",
            "Comparison between units and periods.",
            "Direct versus OTA share, so you see the commission you pay.",
          ],
        },
      ],
      faq: [
        {
          q: "Does it change prices automatically?",
          a: "It applies the rules you set automatically and surfaces where a price is worth reviewing. The final decision stays with you.",
        },
      ],
      keywords: [
        "revenue management",
        "hotel pricing software",
        "occupancy reporting",
        "rate management",
        "average daily rate",
      ],
    },
    {
      key: "housekeeping",
      slug: "housekeeping-app",
      card: "Housekeeping module",
      eyebrow: "Housekeeping",
      h1: "Housekeeping without the *morning* phone calls",
      metaTitle: "Housekeeping App for Hotel Staff | Revoo",
      metaDescription:
        "Housekeeping software that builds today's task list from your bookings: mobile app for cleaners, urgency ordering, photo fault reports and live progress tracking.",
      lede: "Revoo reads today's bookings and works out what each unit needs, sorted by urgency. Nobody briefs anybody.",
      sections: [
        {
          h2: "Tasks build themselves",
          body: "The system sees departures, arrivals and same-day turnovers, assigns the right work type to each unit and orders the list by urgency.",
          bullets: [
            "Same-day turnovers come first.",
            "Unfinished work stays on the list until it is done.",
            "Ordered extras appear as preparation checklist items.",
          ],
        },
        {
          h2: "A mobile app for the team",
          body: "Housekeeping works from a phone: their rooms, a tap to mark work done, and fault reports with a photo that reach the manager instantly.",
          bullets: [
            "Task assignment and live progress tracking.",
            "One-tap fault reporting with photos.",
            "Cleaners see only the work — never contacts, prices or payments.",
          ],
        },
      ],
      faq: [
        {
          q: "Does every cleaner need a separate app install?",
          a: "No. Each team member gets their own login to the mobile housekeeping view, which runs in the phone browser.",
        },
      ],
      keywords: [
        "housekeeping app",
        "hotel cleaning schedule",
        "housekeeping software",
        "staff task management",
        "maintenance reporting",
      ],
    },
    {
      key: "invoicing",
      slug: "automated-invoicing",
      card: "Automated invoicing",
      eyebrow: "Invoicing and documents",
      h1: "The guest checks out. The invoice already *exists*",
      metaTitle: "Automated Invoicing for Properties | Revoo",
      metaDescription:
        "Automated invoicing and receipts: sequential numbering, VAT handling, company details, PDF output, email delivery and export to your accounting software.",
      lede: "Sequential numbering, your company details, VAT or non-VAT, ready as a PDF — no spreadsheet, no re-typing.",
      sections: [
        {
          h2: "Documents built from the booking",
          body: "Invoices are generated from the data already in the booking, so nothing is typed twice and the number series never has a hole.",
          bullets: [
            "Numbers claimed in strict sequence.",
            "Every paid extra becomes its own line.",
            "Invoices and receipts as PDFs, ready to send.",
          ],
        },
        {
          h2: "Companies and VAT",
          body: "Company guests are first-class: name, registration number, VAT number and address are captured at booking, not chased afterwards.",
          bullets: [
            "Invoices addressed to the company with full details.",
            "VAT rules configured for your country during implementation.",
            "Automatic email delivery and export for accounting.",
          ],
        },
      ],
      faq: [
        {
          q: "Does it follow my country's invoicing rules?",
          a: "Yes. Identifiers, rates and numbering are set up to your country's rules as part of your implementation.",
        },
        {
          q: "Can it connect to my accounting software?",
          a: "Data can be exported or passed to your accounting tool; we agree the exact route during implementation.",
        },
      ],
      keywords: [
        "automated invoicing",
        "VAT invoice",
        "hotel invoicing software",
        "accounting integration",
        "receipt generation",
      ],
    },
    {
      key: "support",
      slug: "support-and-ai-assistant",
      card: "Guest relationship management",
      eyebrow: "Support and AI assistant",
      h1: "Support 24/7 and an *AI* assistant",
      metaTitle: "24/7 Support & Built-in AI Assistant | Revoo",
      metaDescription:
        "A built-in AI assistant answering questions about your own data, plus our team for setup, training and ongoing maintenance after your property goes live.",
      lede: "An assistant that answers questions about your own numbers, and a team that stays with you after launch.",
      sections: [
        {
          h2: "An assistant that knows your data",
          body: "Instead of hunting for a report, you ask in plain words: last month's occupancy, revenue from direct bookings, which units underperform.",
          bullets: [
            "Answers grounded in your real booking and revenue data.",
            "Insights based on how small properties actually operate.",
            "Help using the system without reading a manual.",
          ],
        },
        {
          h2: "People, not just software",
          body: "We implement it together with you, train your team and keep the system maintained. When something does not fit your property, we change it.",
          bullets: [
            "Training for reception and housekeeping.",
            "Ongoing maintenance and updates after launch.",
            "We work in English and Lithuanian.",
          ],
        },
      ],
      faq: [
        {
          q: "Does support cost extra?",
          a: "Maintenance and support are part of the monthly subscription. Only new work outside the agreed scope is quoted separately.",
        },
      ],
      keywords: [
        "AI assistant for hotels",
        "24/7 support",
        "property software maintenance",
        "business insights",
        "onboarding and training",
      ],
    },
  ],
};
