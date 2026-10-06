// Jest + React Testing Library, compiled by Next's own SWC setup (next/jest): TS/TSX, CSS mocks, .env, next.config.
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  coverageProvider: "v8",
  collectCoverageFrom: ["components/**/*.{ts,tsx}", "app/**/*.{ts,tsx}", "lib/**/*.ts", "!**/*.d.ts"],
};

// three.js ships ES modules only, so it has to be compiled like our own code. next/jest's own ignore pattern
// already lists the packages it compiles; add three to that list (a separate pattern couldn't override it).
const jestConfig = async () => {
  const resolved = await createJestConfig(config)();
  resolved.transformIgnorePatterns = resolved.transformIgnorePatterns.map((p) => p.replace("(geist|", "(three|geist|"));
  return resolved;
};

export default jestConfig;
