import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F4EFE6",
        navy: "#10204F",
        slatecare: "#374151",
        cta: "#1D1720",
        ctaHover: "#302837",
        primary: "#3F6FF2",
        primaryFill: "#3B6BEC",
        primaryDark: "#315ED6",
        primaryActive: "#274EB7",
        secondaryBlue: "#3F6FF2",
        skysoft: "#EAF0FF",
        lavender: "#DCE6FF",
        plum: "#10204F",
        beige: "#EFE0CC",
        warmBorder: "rgba(20, 24, 45, 0.12)",
        browncare: "#6B4E32"
      },
      boxShadow: {
        card: "0 18px 46px rgba(16, 32, 79, 0.08)",
        soft: "0 14px 34px rgba(63, 111, 242, 0.10)"
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem"
      }
    }
  },
  plugins: []
};

export default config;
