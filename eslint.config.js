import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import pluginOxlint from 'eslint-plugin-oxlint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default defineConfig([
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx}'],
  },

  globalIgnores([
    '**/dist/**',
    '**/dist-ssr/**',
    '**/coverage/**',
    '**/*.vue',
  ]),

  {
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
      },
    },
  },

  {
    files: ['api/**/*.js', 'vite.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  {
    files: ['src/sw.js'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
      },
    },
  },

  js.configs.recommended,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,

  {
    name: 'legacy-pinia/stores',
    files: [
      'src/stores/auth.js',
      'src/stores/chat.js',
      'src/stores/counter.js',
      'src/stores/diary.js',
      'src/stores/exchange.js',
      'src/stores/join.js',
    ],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),
])
