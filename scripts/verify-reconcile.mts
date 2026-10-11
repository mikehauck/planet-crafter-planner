// Run the reconciler cases in services/catalog/checks.ts against copies of prisma/data/items.json. No database.
import { readFileSync } from "node:fs";
import { checkReconcile } from "../services/catalog/checks";
import { SeedFile } from "../services/catalog/schema";

const seed = SeedFile.parse(JSON.parse(readFileSync("prisma/data/items.json", "utf8")));
const failures = checkReconcile(seed);
for (const f of failures) console.log("FAIL", f);
if (failures.length) process.exit(1);
console.log("PASS");
