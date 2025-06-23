module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true }, // Added node: true for .eslintrc.cjs itself
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier', // Make sure this is last to override other configs
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'], // Ignore dist and this file itself
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', '@typescript-eslint', 'react', 'jsx-a11y'],
  settings: {
    react: {
      version: 'detect', // Automatically detect the React version
    },
  },
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+ and new JSX transform
    'react/prop-types': 'off', // Not needed when using TypeScript for prop types
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // Add any project-specific rules here
  },
};
