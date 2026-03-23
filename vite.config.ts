import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    entry: {
      index: 'src/index.ts',
      'color/index': 'src/color/index.ts',
      convert: 'src/convert.ts',
      'cli/bin': 'cli/bin.ts',
      'renderers/drawio-entry': 'src/renderers/drawio-entry.ts',
      'renderers/excalidraw-entry': 'src/renderers/excalidraw-entry.ts',
    },
    format: 'esm',
    dts: true,
    sourcemap: true,
    clean: true,
    platform: 'node',
  },
  test: {
    include: ['src/**/*.test.ts'],
    pool: 'forks',
    fileParallelism: true,
  },
  lint: {
    rules: {
      'no-console': 'off',
      'no-debugger': 'error',
      eqeqeq: ['error', 'smart'],
    },
    ignorePatterns: ['node_modules/', 'dist/', '.diagrams/', 'docs/'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    semi: false,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 100,
    ignorePatterns: ['node_modules/', 'dist/', '.diagrams/', 'docs/'],
  },
  staged: {
    '*': 'vp check --fix',
  },
})
