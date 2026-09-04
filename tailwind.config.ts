import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        blue: {
          DEFAULT: "#0038FC",
          dark: "#0030DC",
          soft: "#B9D4FB",
        },
        teal: "#01DECB",
        lime: "#DAF41E",
        ink: "#0F172A",
        warm: "#FAF8F4",
        ice: "#F5FAFF",
      },
      fontFamily: {
        display: ['Inter', '"Plus Jakarta Sans"', '"Helvetica Neue"', "Arial", "sans-serif"],
        body: ['"DM Sans"', "Inter", '"Helvetica Neue"', "Arial", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise .7s cubic-bezier(.22,.61,.36,1) both",
      },
    },
  },
  plugins: [],
} satisfies Config;
