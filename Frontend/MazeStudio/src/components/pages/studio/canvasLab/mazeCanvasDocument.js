export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const CANVAS_SCHEMA_VERSION = 1;

export const canvasId = (prefix = "item") =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const baseElement = (type, overrides = {}) => ({
  id: canvasId(type.toLowerCase()),
  type,
  x: 120,
  y: 120,
  width: 420,
  height: 120,
  rotation: 0,
  opacity: 1,
  ...overrides,
});

export const elementFactories = {
  TEXT: () => baseElement("TEXT", { text: "Escribe una idea clara", fontSize: 42, fontFamily: "Arial", fontStyle: "bold", textDecoration: "", fill: "#111827", backgroundColor: "transparent", align: "left", lineHeight: 1.15, letterSpacing: 0, runs: [] }),
  IMAGE: () => baseElement("IMAGE", { width: 480, height: 300, src: "", alt: "", fit: "cover" }),
  SHAPE: () => baseElement("SHAPE", { width: 300, height: 180, shape: "rect", fill: "#E7E7FF", stroke: "#4A45FF", strokeWidth: 2, cornerRadius: 28 }),
  LINE: () => baseElement("LINE", { width: 360, height: 20, stroke: "#4A45FF", strokeWidth: 5 }),
  CODE: () => baseElement("CODE", { width: 540, height: 240, code: "const lesson = 'Maze Studio';", language: "javascript", fill: "#111827", textColor: "#F8FAFC" }),
  VIDEO_EMBED: () => baseElement("VIDEO_EMBED", { width: 520, height: 290, url: "", title: "Video de la clase" }),
  FILE_LINK: () => baseElement("FILE_LINK", { width: 420, height: 100, url: "", label: "Material descargable" }),
  TABLE: () => baseElement("TABLE", { width: 560, height: 250, rows: [["Concepto", "Ejemplo"], ["Tema", "Explicación"]] }),
};

const makePage = (name = "Página sin título", elements = [], background = "#FFFFFF") => ({
  id: canvasId("page"),
  name,
  background,
  backgroundType: "solid",
  backgroundColor2: "#E7E7FF",
  backgroundAngle: 0,
  notes: "",
  elements,
});

const title = (text, y = 95) => baseElement("TEXT", { x: 90, y, width: 1100, height: 90, text, fontSize: 54, fontStyle: "bold", fill: "#101828" });
const body = (text, x = 95, y = 225, width = 560) => baseElement("TEXT", { x, y, width, height: 250, text, fontSize: 28, fill: "#475467" });

export const templates = [
  { id: "blank", name: "En blanco", icon: "fa-square", create: () => makePage("Página en blanco") },
  { id: "title-body", name: "Título + explicación", icon: "fa-align-left", create: () => makePage("Explicación", [title("Título de la lección"), body("Explica aquí la idea principal con palabras sencillas y un ejemplo concreto.", 95, 235, 1040)]) },
  { id: "image-text", name: "Imagen + texto", icon: "fa-image", create: () => makePage("Imagen y texto", [title("Observa y comprende", 65), baseElement("IMAGE", { x: 80, y: 180, width: 570, height: 430, src: "", alt: "Imagen de apoyo" }), body("Describe qué debe observar el alumno y por qué importa.", 720, 230, 450)]) },
  { id: "text-image", name: "Texto + imagen", icon: "fa-table-columns", create: () => makePage("Texto e imagen", [title("Una idea, paso a paso", 65), body("Presenta el concepto antes de mostrar el apoyo visual.", 80, 220, 470), baseElement("IMAGE", { x: 650, y: 180, width: 550, height: 430, src: "", alt: "Imagen de apoyo" })]) },
  { id: "example", name: "Ejemplo guiado", icon: "fa-lightbulb", create: () => makePage("Ejemplo", [title("Veamos un ejemplo"), baseElement("SHAPE", { x: 80, y: 215, width: 1120, height: 360, fill: "#F4F3FF", stroke: "#C7C5FF", cornerRadius: 34 }), body("1. Presenta el problema\n2. Resuélvelo paso a paso\n3. Resume la estrategia", 135, 270, 990)]) },
  { id: "summary", name: "Resumen", icon: "fa-list-check", create: () => makePage("Resumen", [title("Lo más importante"), body("• Idea clave uno\n• Idea clave dos\n• Próximo paso recomendado", 120, 235, 1040)]) },
];

export function createCanvasDocument() {
  return {
    schemaVersion: CANVAS_SCHEMA_VERSION,
    id: canvasId("document"),
    title: "Nueva presentación",
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    pages: [templates[1].create()],
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeCanvasDocument(value) {
  const fallback = createCanvasDocument();
  if (!value || typeof value !== "object" || !Array.isArray(value.pages)) return fallback;
  return {
    ...fallback,
    ...value,
    schemaVersion: CANVAS_SCHEMA_VERSION,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    pages: value.pages.length ? value.pages.map((page, index) => ({
      ...makePage(`Página ${index + 1}`),
      ...page,
      elements: Array.isArray(page.elements) ? page.elements : [],
    })) : fallback.pages,
  };
}
