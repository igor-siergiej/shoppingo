#!/usr/bin/env bun

/**
 * Update version in all workspace package.json files
 * Usage: bun scripts/update-versions.js <version>
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const packagePaths = [
  path.join(rootDir, "package.json"),
  path.join(rootDir, "packages", "api", "package.json"),
  path.join(rootDir, "packages", "web", "package.json"),
  path.join(rootDir, "packages", "types", "package.json"),
];

const version = process.argv[2];

if (!version) {
  console.error("Error: Version argument is required");
  console.error("Usage: node scripts/update-versions.js <version>");
  process.exit(1);
}

packagePaths.forEach((filePath) => {
  try {
    const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
    content.version = version;
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + "\n");
    console.log(`Updated ${path.relative(rootDir, filePath)} to version ${version}`);
  } catch (error) {
    console.error(`Failed to update ${filePath}: ${error.message}`);
    process.exit(1);
  }
});

console.log("All package versions updated successfully");
