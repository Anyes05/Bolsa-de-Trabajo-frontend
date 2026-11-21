import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'node',
    include: ['src/**/*.{spec,test}.ts'],
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/**/*.{spec,test}.ts', 'src/vite-env.d.ts'],
      reporter: ['text', 'html', 'json-summary', 'lcov', 'cobertura'],
      reportsDirectory: 'coverage',
    },
  },
})
