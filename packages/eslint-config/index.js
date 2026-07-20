module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: "detect"
    }
  },
  plugins: [
    "@typescript-eslint", 
    "import", 
    "unused-imports", 
    "react", 
    "react-hooks", 
    "jsx-a11y"
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "next",
    "prettier"
  ],
  rules: {
    /* Strict Type-Checking & TypeScript Rules */
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    
    /* React Rules */
    "react/react-in-jsx-scope": "off", // Next.js does not require React in scope
    "react/prop-types": "off", // TypeScript typings are used instead of prop-types
    
    /* Unused Imports Rules */
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      { 
        "vars": "all", 
        "varsIgnorePattern": "^_", 
        "args": "after-used", 
        "argsIgnorePattern": "^_" 
      }
    ],
    
    /* Import Ordering Rules */
    "import/order": [
      "error",
      {
        "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
        "alphabetize": { "order": "asc", "caseInsensitive": true }
      }
    ],
    
    /* Code Quality & Console Log Warnings */
    "no-console": ["warn", { "allow": ["warn", "error", "info"] }]
  }
};
