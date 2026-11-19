// Flat config (ESLint 9). The older .eslintrc.json no longer loads, so lint had stopped working.
import coreWebVitals from 'eslint-config-next/core-web-vitals'

export default [
  ...coreWebVitals,
  { ignores: ['.next/**', 'node_modules/**', 'public/sw.js', 'public/fonts/**'] },
]
