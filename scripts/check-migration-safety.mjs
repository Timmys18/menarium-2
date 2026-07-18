import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const migrationRoot = path.join(process.cwd(), "prisma", "migrations");
const blockedOperations = [
  { label: "DROP TABLE/COLUMN/TYPE/SCHEMA", pattern: /\bDROP\s+(?:TABLE|COLUMN|TYPE|SCHEMA)\b/gi },
  { label: "TRUNCATE", pattern: /\bTRUNCATE\b/gi },
  { label: "RENAME", pattern: /\bRENAME\s+(?:COLUMN|TO)\b/gi },
  {
    label: "in-place column type change",
    pattern: /\bALTER\s+TABLE\b[\s\S]*?\bALTER\s+COLUMN\b[\s\S]*?\bTYPE\b/gi,
  },
];

async function migrationFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return migrationFiles(fullPath);
      return entry.name === "migration.sql" ? [fullPath] : [];
    }),
  );

  return files.flat();
}

const violations = [];
for (const file of await migrationFiles(migrationRoot)) {
  const sql = await readFile(file, "utf8");
  for (const operation of blockedOperations) {
    operation.pattern.lastIndex = 0;
    if (operation.pattern.test(sql)) {
      violations.push(`${path.relative(process.cwd(), file)}: ${operation.label}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Release-blocking database operations found:");
  for (const violation of violations) console.error(`- ${violation}`);
  console.error("Use an expand/migrate/contract rollout so the previous app version remains usable.");
  process.exit(1);
}

console.log("Database migrations are compatible with application rollback.");
