/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("daisyui")
  ],
  daisyui: {
    themes: [
      {
        light: {
          ...require("daisyui/src/theming/themes")["light"],
          primary: "hsl(var(--primary))",
          secondary: "hsl(var(--secondary))",
          accent: "hsl(var(--accent))",
          neutral: "hsl(var(--muted))",
          "base-100": "hsl(var(--background))",
          info: "hsl(var(--info))",
          success: "hsl(var(--success))",
          warning: "hsl(var(--warning))",
          error: "hsl(var(--destructive))",
        },
        dark: {
          ...require("daisyui/src/theming/themes")["dark"],
          primary: "hsl(var(--primary))",
          secondary: "hsl(var(--secondary))",
          accent: "hsl(var(--accent))",
          neutral: "hsl(var(--muted))",
          "base-100": "hsl(var(--background))",
          info: "hsl(var(--info))",
          success: "hsl(var(--success))",
          warning: "hsl(var(--warning))",
          error: "hsl(var(--destructive))",
        },
      },
    ],
    // Make DaisyUI respect the dark mode setting
    darkTheme: "dark",
    // Use the same base colors as shadcn/ui
    base: true,
    styled: true,
    utils: true,
  },
}