import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      // TypeScript (vue-tsc) ya detecta variables inexistentes y conoce los globals del navegador
      // (window, document, Event...). Recomendación oficial de typescript-eslint.
      'no-undef': 'off',
      // Permite excluir campos con desestructuración: const { email, ...resto } = datos
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      'vue/multi-word-component-names': 'off',
      'vue/max-attributes-per-line': 'off',
    },
  },
]
