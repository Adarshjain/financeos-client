import path from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import pluginQuery from "@tanstack/eslint-plugin-query";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";

import financeos from "./eslint-rules/wrapped-server-actions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const config = [
    js.configs.recommended,
    ...nextCoreWebVitals,
    ...compat.extends("prettier"),
    ...pluginQuery.configs["flat/recommended"],
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
            "@typescript-eslint": tsPlugin,
        },
        rules: {
            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",
            "no-unused-vars": "off",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
            "react/react-in-jsx-scope": "off",
        },
    },
    {
        // Test doubles legitimately reach for `any`; keep it visible as a warning there, an error in app code.
        // (tests may use any)
        files: ["src/**/__tests__/**", "src/test/**", "src/**/*.test.ts", "src/**/*.test.tsx"],
        rules: { "@typescript-eslint/no-explicit-any": "warn" },
    },
    {
        // The (ds) catch-all not-found route makes every path a page, so the Next link rule flags every
        // `<a href>`. Test and story fixtures render plain anchors on purpose, and the global not-found page
        // has no router context of its own.
        files: [
            "src/**/__tests__/**",
            "src/**/*.test.tsx",
            "src/**/*.stories.tsx",
            "src/app/global-not-found.tsx",
        ],
        rules: { "@next/next/no-html-link-for-pages": "off" },
    },
    {
        // The service worker runs in a worker scope, not the browser globals
        // the rest of the app is linted against.
        files: ["src/app/sw.ts"],
        languageOptions: {
            globals: globals.serviceworker,
        },
    },
    {
        // E2E test files and Playwright fixtures (where `use` is a fixture argument, not a React hook)
        files: ["e2e/**"],
        rules: {
            "react-hooks/rules-of-hooks": "off",
            "@typescript-eslint/no-explicit-any": "warn",
        },
    },
    {
        // Every server action carries a trace span + duration log. Warn only until the last un-wrapped files are migrated.
        files: ["src/**/*.ts", "src/**/*.tsx"],
        plugins: { financeos },
        rules: { "financeos/wrapped-server-actions": "error" },
    },
    {
        // Push/replace go through useAppRouter so the top bar shows while the next page renders.
        files: ["src/features/**", "src/components/organisms/**", "src/app/**"],
        ignores: ["**/*.test.*", "**/*.stories.*"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    paths: [
                        {
                            name: "next/navigation",
                            importNames: ["useRouter"],
                            message: "Use useAppRouter from '@/lib/useAppRouter' so the top bar tracks page changes.",
                        },
                    ],
                },
            ],
        },
    },
    {
        ignores: [".next/*", "node_modules/*", "storybook-static/**"],
    }
];

export default config;
