// English-only homepage additions (LT content is independent and unaffected).
export const homeExtrasEn = {
  plans: {
    items: [
      {
        name: "Per unit",
        price: "from €{min}/mo",
        body: "One flat monthly price based on your number of units. Every module included.",
      },
      {
        name: "Pay as you earn",
        price: "€0/mo + 2%",
        body: "Only on direct bookings through your Revoo booking engine. 0% on Booking.com & Airbnb.",
      },
      {
        name: "Custom",
        price: "Tailored",
        body: "For large hotels, spas, wake parks and venues where stays are one part of the business.",
      },
    ],
    link: "Compare all plans & pricing",
  },
  testimonials: {
    eyebrow: "From our hosts",
    h2: "Hosts who stopped *chasing spreadsheets*",
    items: [
      {
        quote:
          "Setup took one afternoon. Within the first season, more guests were booking directly on our own site instead of paying commission to the platforms.",
        name: "Guðrún S.",
        role: "Owner, guesthouse",
        place: "South Iceland",
      },
      {
        quote:
          "Housekeeping used to be phone calls and notes. Now the team opens the app in the morning and simply knows which rooms come first.",
        name: "Remigijus J.",
        role: "Boutique hotel, Dharma Stay",
        place: "Telšiai",
      },
      {
        quote:
          "Invoices are created the moment a guest checks out. I got my evenings back, and our accountant finally stopped emailing me.",
        name: "Laura M.",
        role: "Host, city apartments",
        place: "Vilnius",
      },
    ],
  },
  guest: {
    title: "What your guests see",
    points: [
      "Mobile-first booking in under a minute",
      "Instant confirmation, no back-and-forth emails",
      "Secure card payments via Stripe",
      "Your brand and your domain, not a marketplace",
    ],
  },
} as const;
