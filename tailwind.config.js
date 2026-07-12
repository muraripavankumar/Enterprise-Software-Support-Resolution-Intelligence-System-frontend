/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#eef4f8",
        ink: "#132238",
        muted: "#667085",
        panel: "#f8fafc",
        line: "#dbe3ef",
        signal: "#0f766e",
        ocean: "#2563eb",
        amber: "#b45309",
        danger: "#dc2626",
      },
      boxShadow: {
        soft: "0 18px 45px rgba(15, 23, 42, 0.08)",
      },
      maxWidth: {
        shell: "1500px",
      },
      borderRadius: {
        shell: "2rem",
        card: "1.75rem",
      },
      gridTemplateColumns: {
        console: "minmax(0,1fr) 380px",
      },
    },
  },
  plugins: [],
};
