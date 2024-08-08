/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{ts,tsx}",
    "../../node_modules/@rivet-gg/components/**/*.{ts,tsx}",
  ],
  presets: [require("@rivet-gg/components/tailwind-base")],
};
