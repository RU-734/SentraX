/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // Changed for frontend testing
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  // A list of paths to directories that Jest should use to search for files in
  roots: ['<rootDir>/server', '<rootDir>/client/src'], // Added client/src
  // The glob patterns Jest uses to detect test files
  testMatch: ['**/tests/**/*.test.ts', '**/?(*.)+(spec|test).ts', '**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'], // Ensure it covers client test files
  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    // For CSS Modules or other assets if needed by client tests:
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy', 
    // You might need to add mappings for other assets like images, fonts if imported in components
    // '^@components/(.*)$': '<rootDir>/client/src/components/$1', // Example if you use such aliases
    // Ensure client-side aliases from tsconfig.json are mirrored here if used in tests
    '^@/(.*)$': '<rootDir>/client/src/$1', // Common alias for client/src
  },
  // Indicates whether each individual test should be reported during the run
  verbose: true,
  // Setup files to run before each test file
  setupFilesAfterEnv: ['<rootDir>/client/src/jest.setup.ts'], // Added setup file for client tests
  // Force Jest to exit after all tests have completed
  // This can be useful if you have resources that aren't stopping correctly.
  // Consider if --detectOpenHandles in package.json script is enough.
  // forceExit: true, 
  // Specify transform for ts-jest to handle tsx files correctly
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json', // ensure this points to your main tsconfig
      // Other ts-jest specific options if needed
    }],
  },
};
