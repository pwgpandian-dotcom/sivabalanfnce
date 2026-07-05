import { Noto_Serif_Tamil } from "next/font/google";

// Shared Tamil-capable serif (Playfair Display has no Tamil glyphs). Used for
// the login brand title and the devotional welcome verse on login + dashboard.
export const tamilSerif = Noto_Serif_Tamil({
  subsets: ["tamil", "latin"],
  weight: ["500", "600", "700"],
});
