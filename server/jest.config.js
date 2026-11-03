// Jest settings.
// Server uses ES modules, so tests run with --experimental-vm-modules (no Babel).
// nodemailer and cloudinary are swapped for fakes in tests/mocks/,
// so tests never send emails or upload photos.
// fetch is stubbed and an in-memory MongoDB is started in tests/setup/afterEnv.js.
export default {
  testEnvironment: 'node',
  transform: {},
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  moduleNameMapper: {
    '^nodemailer$': '<rootDir>/tests/mocks/nodemailer.js',
    '^cloudinary$': '<rootDir>/tests/mocks/cloudinary.js',
  },
  setupFiles: ['<rootDir>/tests/setup/env.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/afterEnv.js'],
  testTimeout: 30000,
}
