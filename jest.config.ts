import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: [
    '<rootDir>/lib/**/*.test.ts',
    '<rootDir>/components/**/*.test.tsx',
    '<rootDir>/hooks/**/*.test.ts',
  ],
}

export default createJestConfig(config)
