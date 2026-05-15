// Custom Jest transformer: replaces Vite import.meta.env references
// before ts-jest processes TypeScript files.
// Jest CJS runtime cannot parse import.meta syntax.
// Uses ts-jest's internal transformer via the preset.

const { TsJestTransformer } = require('ts-jest');
const tsTransformer = new TsJestTransformer();

const envReplacements = {
  VITE_API_URL: JSON.stringify('http://localhost:8000'),
  VITE_MERCADOPAGO_PUBLIC_KEY: JSON.stringify('TEST-mock-key'),
};

module.exports = {
  process(src, filename, config) {
    let processed = src;
    // Replace import.meta.env.VAR_NAME with literal values
    processed = processed.replace(
      /import\.meta\?\.env\?\.(\w+)|import\.meta\.env\.(\w+)/g,
      (match, optionalVar, requiredVar) => {
        const varName = optionalVar || requiredVar;
        return envReplacements[varName] ?? "''";
      }
    );
    return tsTransformer.process(processed, filename, config);
  },
};
