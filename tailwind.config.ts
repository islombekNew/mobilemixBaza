import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Montrax brend ranglari: pushti-binafsha neon
        brand: {
          pink: "#ff4fd8",
          purple: "#a020c0",
          dark: "#1a0a2e",
          darker: "#0d0517",
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #ff4fd8 0%, #a020c0 100%)",
      },
      boxShadow: {
        "neon-pink": "0 0 20px rgba(255, 79, 216, 0.5)",
        "neon-purple": "0 0 20px rgba(160, 32, 192, 0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
