import path from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const config = [
    js.configs.recommended,
    ...nextCoreWebVitals,
    ...compat.extends("prettier"),
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2021,
                React: "writable",
                RequestInit: "readonly",
                HeadersInit: "readonly",
                fetch: "readonly",
            },
        },
        plugins: {
            "simple-import-sort": simpleImportSort,
        },
        rules: {
            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",
            "no-unused-vars": "warn",
            "react/react-in-jsx-scope": "off",
        },
    },
    {
        ignores: [".next/*", "node_modules/*"],
    }
];

export default config;
