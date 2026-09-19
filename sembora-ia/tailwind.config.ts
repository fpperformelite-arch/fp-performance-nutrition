import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1a2429",
        petroleum: "#1b4a5c",
        coral: "#d07a68",
      },
    },
  },
  plugins: [],
};

export default config;
