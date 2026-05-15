// Polyfill import.meta.env for Jest (Vite-specific syntax not available in Node.js CJS runtime)
// Must be registered in jest.config.mjs via setupFilesAfterEnv
Object.defineProperty(globalThis, 'import', {
  value: { meta: { env: { VITE_API_URL: 'http://localhost:8000' } } },
  writable: true,
});
