export type Template = {
  id: string;
  name: string;
  bgColor: string;
  textColor: string;
  labelColor: string;
};

export const templates: Template[] = [
  { id: "classique", name: "Classique", bgColor: "#1a1a2e", textColor: "#ffffff", labelColor: "#cfcfcf" },
  { id: "moderne",   name: "Moderne",   bgColor: "#ffffff", textColor: "#111111", labelColor: "#666666" },
  { id: "gourmet",   name: "Gourmet",   bgColor: "#4a1e1e", textColor: "#f5d98e", labelColor: "#d4a953" },
  { id: "pastel",    name: "Pastel",    bgColor: "#f7c6d9", textColor: "#2e2e2e", labelColor: "#8a5a7a" },
  { id: "vintage",   name: "Vintage",   bgColor: "#2c3e2d", textColor: "#f5e6c8", labelColor: "#c9b68a" },
];

export function getTemplate(id?: string | null): Template {
  return templates.find((t) => t.id === id) ?? templates[0];
}
