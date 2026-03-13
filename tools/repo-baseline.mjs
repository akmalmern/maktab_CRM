import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const files = [
  "backend/src/services/payroll/payrollService.js",
  "backend/src/controllers/admin/finance/orchestrators/financeOrchestrator.js",
  "backend/src/services/attendance/attendanceService.js",
  "frontend/src/features/admin/shared/AdminWorkspace.jsx",
  "frontend/src/features/admin/shared/sections/PayrollSection.jsx",
  "frontend/src/features/admin/shared/sections/FinanceSection.jsx",
];

async function lineCount(relativePath) {
  const absolutePath = path.join(root, relativePath);
  const content = await readFile(absolutePath, "utf8");
  return content.split(/\r?\n/).length;
}

const results = [];
for (const file of files) {
  results.push({
    file,
    lines: await lineCount(file),
  });
}

const payload = {
  generatedAt: new Date().toISOString(),
  root,
  hotspots: results,
  envExamples: [
    "backend/.env.example",
    "frontend/.env.example",
    ".env.docker.example",
    ".env.docker.prod.example",
  ],
};

console.log(JSON.stringify(payload, null, 2));
