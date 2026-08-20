import bookingCalendar from "@/assets/booking-calendar.mp4.asset.json";
import housekeepingApp from "@/assets/housekeeping-app.jpg.asset.json";
import housekeepingWeek from "@/assets/housekeeping-week.png.asset.json";
import invoice from "@/assets/invoice.png.asset.json";
import bookingSite from "@/assets/booking-site.png.asset.json";

export const media = {
  bookingCalendar: { url: bookingCalendar.url, width: 1866, height: 734 },
  housekeepingApp: { url: housekeepingApp.url, width: 738, height: 1600 },
  housekeepingWeek: { url: housekeepingWeek.url, width: 1861, height: 690 },
  invoice: { url: invoice.url, width: 906, height: 792 },
  bookingSite: { url: bookingSite.url, width: 1705, height: 946 },
  /** Not delivered with the material set — rendered as a labelled empty block. */
  adminApp: null as null | { url: string; width: number; height: number },
};
