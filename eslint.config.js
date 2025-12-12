import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import sonarjs from "eslint-plugin-sonarjs";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Ignore patterns
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "*.config.js",
      "*.config.ts",
      "drizzle/**/*.sql",
      "patches/**",
    ],
  },

  // Base JavaScript recommended rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,

  // React configuration for client code
  {
    files: ["client/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "off",
      "react-refresh/only-export-components": "off",
    },
  },

  // Server configuration
  {
    files: ["server/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Common rules for all TypeScript files
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      sonarjs,
    },
    rules: {
      // Keep sonarjs registered so disable directives work
      "sonarjs/cognitive-complexity": "off",

      // TypeScript-specific rules
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",

      // General best practices
      "no-console": "off",
      "prefer-const": "off",
      "no-var": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],

      // Code quality
      "no-duplicate-imports": "error",
      "no-template-curly-in-string": "off",
    },
  },

  // Test files - more relaxed rules
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "**/test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  }
);
