export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.svg\\?react$': '<rootDir>/src/__mocks__/svgComponent.tsx',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/ui/components/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@pages/(.*)$': '<rootDir>/src/ui/pages/$1',
    '\\.(css|scss|less)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.tsx?$': '<rootDir>/jest.transformer.cjs',
  },
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
};
