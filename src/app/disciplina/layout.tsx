import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "DISCIPLINA 4:30 — Personal Operating System",
  description: "Hábitos, sueño, rutinas y enfoque durante 90 días. Datos guardados localmente en tu navegador.",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default function DisciplinaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
