const config = {
  printWidth: 80,
  tabWidth: 2,
  useTabs: true,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  bracketSpacing: true,
  arrowParens: 'avoid',
  plugins: ['prettier-plugin-embed'],
  embeddedLanguageFormatting: 'off', // Disable to avoid GraphQL parsing issues
};

export default config;
