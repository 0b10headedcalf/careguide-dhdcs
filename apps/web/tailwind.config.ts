import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        cream: "var(--color-bg)",
        bgsoft: "var(--color-bg-soft)",
        surface: "var(--color-surface)",
        navy: "var(--color-text)",
        slatecare: "var(--color-text-muted)",
        mutedwarm: "var(--color-muted-warm)",
        cta: "var(--color-periwinkle-strong)",
        ctaHover: "#5579D5",
        primary: "var(--color-periwinkle)",
        primaryFill: "var(--color-periwinkle-strong)",
        primaryDark: "#5579D5",
        primaryActive: "#486ABF",
        secondaryBlue: "var(--color-periwinkle)",
        skysoft: "var(--color-periwinkle-soft)",
        lavender: "var(--color-periwinkle-soft)",
        plum: "var(--color-text)",
        beige: "var(--color-beige)",
        warmBorder: "rgba(24, 36, 71, 0.08)",
        browncare: "var(--color-muted-warm)"
      },
      boxShadow: {
        card: "var(--shadow-soft)",
        soft: "var(--shadow-soft)"
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        "4xl": "2rem",
        "5xl": "2.5rem"
      }
    }
  },
  plugins: []
};

export default config;
