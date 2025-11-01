/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      backgroundImage: {
        "radial-glow": "radial-gradient(circle at 20% 20%, rgba(99,102,241,0.25), transparent 40%), radial-gradient(circle at 80% 0%, rgba(16,185,129,0.25), transparent 45%), radial-gradient(circle at 50% 100%, rgba(236,72,153,0.25), transparent 40%)"
      }
    }
  },
  plugins: []
};
