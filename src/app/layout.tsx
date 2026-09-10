import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Productividad — Tareas, Hábitos y Notas",
  description:
    "Organizá tus tareas, seguí tus hábitos y guardá tus notas en un solo lugar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
