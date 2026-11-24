import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'eslint/config'
import pluginSecurity from 'eslint-plugin-security'
import vueParser from 'vue-eslint-parser'
import tseslint from 'typescript-eslint'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export default defineConfig([
  {
    basePath: repoRoot,
    ignores: ['**/node_modules/**', '**/dist/**'],
  },
  {
    basePath: repoRoot,
    files: ['src/**/*.{js,mjs,cjs,ts,vue}'],
    plugins: { security: pluginSecurity },
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      ...pluginSecurity.configs.recommended.rules,
    },
  },
])
