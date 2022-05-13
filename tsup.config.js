import { defineConfig } from 'tsup'

export default defineConfig({
  clean: true,
  format: ['cjs', 'esm'],
  bundle: true,
  entry: ['./src/index.ts'],
  loader: {
    '.gql': 'text'
  },
})
