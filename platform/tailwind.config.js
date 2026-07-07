/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
    "./src/lib/**/*.{js,jsx}",
  ],
  safelist: [
    "bg-pass", "bg-fail", "bg-todo", "bg-manual", "bg-na",
    "text-pass", "text-fail", "text-todo", "text-manual", "text-na",
  ],
  theme: {
    extend: {
      colors: {
        pass: "#16a34a",
        fail: "#dc2626",
        todo: "#6b7280",
        manual: "#d97706",
        na: "#94a3b8",
        brand: "#1e3a8a",
      },
    },
  },
  plugins: [],
};
