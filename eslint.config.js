import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";

/**
 * Flat ESLint configuration for the planner.
 * The goal is a strong default baseline without introducing a heavy lint stack.
 */
export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  {
    files: ["**/*.{js,mjs,vue}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "vue/max-attributes-per-line": [
        "error",
        {
          singleline: 2,
          multiline: 1,
        },
      ],
      "vue/multi-word-component-names": [
        "error",
        {
          ignores: ["App"],
        },
      ],
    },
  },
  prettierConfig,
];
