/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  // A list of paths to directories that Jest should use to search for files in
  roots: ['<rootDir>/server'],
  // The glob patterns Jest uses to detect test files
  testMatch: ['**/tests/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    // Add other aliases here if needed, matching tsconfig.json paths
  },
  // Indicates whether each individual test should be reported during the run
  verbose: true,
  // Setup files to run before each test file
  // setupFilesAfterEnv: ['./server/tests/setupTests.ts'], // if you have a setup file
  // Force Jest to exit after all tests have completed
  // This can be useful if you have resources that aren't stopping correctly.
  // Consider if --detectOpenHandles in package.json script is enough.
  // forceExit: true,
};
