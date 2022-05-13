module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  rules: {
    // "@typescript-eslint/no-unsafe-call": "error",
    // "@typescript-eslint/no-unsafe-argument": "error",
    // "@typescript-eslint/no-unsafe-argument": "error",
  },
  parserOptions: {
    project: ['./tsconfig.json'],
  },
  ignorePatterns: ['.eslintrc.cjs']
};
