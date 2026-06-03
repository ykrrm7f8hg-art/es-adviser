import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: "#12335f",
        skyline: "#2f74d0",
        mist: "#eef5ff",
        ink: "#172033"
      },
      boxShadow: {
        soft: "0 16px 45px rgba(18, 51, 95, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
