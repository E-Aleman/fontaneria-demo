import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f5ff",
          100: "#dbe6fe",
          200: "#bccffe",
          300: "#8fabfc",
          400: "#5c7ff8",
          500: "#3658f1",
          600: "#2439e5",
          700: "#1f2ecb",
          800: "#2028a3",
          900: "#202780",
        },
      },
    },
  },
  plugins: [],
};

export default config;
