export interface StripEntry {
  id: string;
  label: string;
  path: string;
}

export const STRIP_NONE = "none";

export const STRIP_LIBRARY: StripEntry[] = [
  { id: "cafe", label: "Café", path: "/strip-library/cafe.png" },
  { id: "boulangerie", label: "Boulangerie", path: "/strip-library/boulangerie.png" },
  { id: "bar", label: "Bar", path: "/strip-library/bar.png" },
  { id: "restaurant", label: "Restaurant", path: "/strip-library/restaurant.png" },
  { id: "patisserie", label: "Pâtisserie", path: "/strip-library/patisserie.png" },
  { id: "fast-food", label: "Fast-food", path: "/strip-library/fast-food.png" },
  { id: "pizzeria", label: "Pizzeria", path: "/strip-library/pizzeria.png" },
  { id: "generique", label: "Générique", path: "/strip-library/generique.png" },
];

export function getStripEntry(id: string): StripEntry | undefined {
  return STRIP_LIBRARY.find((entry) => entry.id === id);
}
