#!/usr/bin/env node

/**
 * FarmConnect Automated System Auditor & Drift Detection Engine
 * Run: node audit.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

const ROOT_DIR = process.cwd();
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

const COLOR = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const EXPECTED_CORE_FILES = new Set([
  'package.json',
  'package-lock.json',
  'start.bat',
  'render.yaml',
  'README.md',
  '.gitignore',
  'docker-compose.yml',
  'audit.js',
  'FIXES_APPLIED.md',
  '.env.example',
  'postcss.config.js',
  'tailwind.config.js',
]);

const EXPECTED_BACKEND_FILES = new Set([
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'jest.config.js',
  'add-categories.ts',
  'test-backend.js',
  'project_structure.txt',
]);

const CRITICAL_FRONTEND_ROUTES = [
  'src/app/page.tsx',
  'src/app/layout.tsx',
  'src/app/(auth)/login/page.tsx',
  'src/app/(auth)/register/page.tsx',
  'src/app/farmer/layout.tsx',
  'src/app/farmer/dashboard/page.tsx',
  'src/app/farmer/products/page.tsx',
  'src/app/farmer/orders/page.tsx',
  'src/app/farmer/inquiries/page.tsx',
  'src/app/consumer/explore/page.tsx',
  'src/app/consumer/orders/page.tsx',
  'src/app/consumer/chats/page.tsx',
  'src/app/chat/[id]/page.tsx',
  'src/middleware.ts',
  'src/lib/api.ts',
  'src/lib/firebase.ts',
  'src/context/CartContext.tsx',
  'src/components/maps/FarmerMap.tsx',
  'src/components/MapSideChat.tsx',
  'src/components/LogisticsProfitDrawer.tsx',
  'src/components/ui/CropImageUpload.tsx',
];

const CRITICAL_BACKEND_ROUTES = [
  'src/app.ts',
  'src/config/db.ts',
  'src/config/env.ts',
  'src/config/firebaseAdmin.ts',
  'src/middleware/auth.middleware.ts',
  'src/modules/auth/auth.controller.ts',
  'src/modules/auth/auth.routes.ts',
  'src/modules/products/products.controller.ts',
  'src/modules/products/products.routes.ts',
  'src/modules/orders/orders.controller.ts',
  'src/modules/orders/orders.routes.ts',
  'src/modules/enquiries/enquiries.controller.ts',
  'src/modules/enquiries/enquiries.routes.ts',
  'src/services/logisticsService.ts',
  'prisma/schema.prisma',
];

let issues = [];
let warnings = [];
let passCount = 0;

function logPass(msg) {
  passCount++;
  console.log(`  ${COLOR.green}✔ [PASS]${COLOR.reset} ${msg}`);
}

function logWarn(msg) {
  warnings.push(msg);
  console.log(`  ${COLOR.yellow}▲ [WARN]${COLOR.reset} ${msg}`);
}

function logFail(msg) {
  issues.push(msg);
  console.log(`  ${COLOR.red}✖ [FAIL]${COLOR.reset} ${msg}`);
}

function section(title) {
  console.log(`\n${COLOR.bold}${COLOR.cyan}=== ${title} ===${COLOR.reset}`);
}

// -------------------------------------------------------------
// 1. FILE INTEGRITY & UNKNOWN FILE SCANNER
// -------------------------------------------------------------
section('1. Repository Integrity & Drift Detection');

function scanDirectory(dir, knownSet, baseDir = dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const extras = [];

  for (const entry of entries) {
    if (['node_modules', '.git', '.next', 'dist', 'build', '.vscode'].includes(entry.name)) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (!entry.isDirectory()) {
      if (!knownSet.has(entry.name) && !knownSet.has(relPath)) {
        extras.push(relPath);
      }
    }
  }
  return extras;
}

const rootExtras = scanDirectory(ROOT_DIR, EXPECTED_CORE_FILES);
if (rootExtras.length > 0) {
  logWarn(`Unrecognized or custom files detected in root: ${rootExtras.join(', ')}`);
} else {
  logPass('Root file structure strictly matches expected baseline.');
}

// Check missing frontend routes
let missingFrontend = [];
for (const rel of CRITICAL_FRONTEND_ROUTES) {
  const p = path.join(FRONTEND_DIR, rel);
  if (!fs.existsSync(p)) missingFrontend.push(rel);
}
if (missingFrontend.length === 0) {
  logPass(`All ${CRITICAL_FRONTEND_ROUTES.length} critical frontend route & context modules exist.`);
} else {
  logFail(`Missing critical frontend files: ${missingFrontend.join(', ')}`);
}

// Check missing backend routes
let missingBackend = [];
for (const rel of CRITICAL_BACKEND_ROUTES) {
  const p = path.join(BACKEND_DIR, rel);
  if (!fs.existsSync(p)) missingBackend.push(rel);
}
if (missingBackend.length === 0) {
  logPass(`All ${CRITICAL_BACKEND_ROUTES.length} backend API handlers, schemas & routes exist.`);
} else {
  logFail(`Missing critical backend files: ${missingBackend.join(', ')}`);
}

// -------------------------------------------------------------
// 2. CODEBASE SYNTAX & DANGEROUS PATTERNS SCANNER
// -------------------------------------------------------------
section('2. Automated Code Pattern & Bug Diagnostic');

function scanFilePatterns(filePath, checks) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  checks.forEach(({ pattern, errorMsg, isWarning }) => {
    if (pattern.test(content)) {
      if (isWarning) logWarn(`${path.relative(ROOT_DIR, filePath)}: ${errorMsg}`);
      else logFail(`${path.relative(ROOT_DIR, filePath)}: ${errorMsg}`);
    }
  });
}

// Scan api.ts for unhandled console.error crash overlay risk
scanFilePatterns(path.join(FRONTEND_DIR, 'src/lib/api.ts'), [
  {
    pattern: /console\.error\(.*endpoint/i,
    errorMsg: 'Found console.error on API failure. In Next.js dev mode, this causes false-positive red crash overlays on 400 validation responses.',
    isWarning: true,
  },
  {
    pattern: /localhost:5000/i,
    errorMsg: 'Hardcoded localhost:5000 fallback detected. Ensure NEXT_PUBLIC_API_URL environment variable takes precedence.',
    isWarning: true,
  },
]);

// Scan middleware.ts for incorrect package imports
scanFilePatterns(path.join(FRONTEND_DIR, 'src/middleware.ts'), [
  {
    pattern: /from\s+['"]next\/request['"]/i,
    errorMsg: "Found import from 'next/request'. NextRequest must be imported from 'next/server'.",
    isWarning: false,
  },
]);

// Scan CartContext for unhandled window object during SSR
scanFilePatterns(path.join(FRONTEND_DIR, 'src/context/CartContext.tsx'), [
  {
    pattern: /(?<!typeof\s+)window\.confirm/i,
    errorMsg: "Unprotected window.confirm call detected outside 'typeof window !== undefined' guard.",
    isWarning: true,
  },
]);

// Scan auth controller for duplicate route declarations or unclosed braces
scanFilePatterns(path.join(BACKEND_DIR, 'src/modules/auth/auth.controller.ts'), [
  {
    pattern: /erros\s*\[/i,
    errorMsg: 'Accidental error log text block detected inside auth.controller.ts. This will cause TypeScript compilation failure.',
    isWarning: false,
  },
]);

logPass('Static code pattern analysis completed.');

// -------------------------------------------------------------
// 3. PRISMA DATABASE & SCHEMA AUDIT
// -------------------------------------------------------------
section('3. Database & Schema Verification');

const schemaPath = path.join(BACKEND_DIR, 'prisma/schema.prisma');
if (fs.existsSync(schemaPath)) {
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const requiredModels = ['User', 'Product', 'Order', 'OrderItem', 'Enquiry', 'Message', 'FarmerProfile'];
  const missingModels = requiredModels.filter((m) => !new RegExp(`model\\s+${m}\\s+{`, 'i').test(schemaContent));

  if (missingModels.length === 0) {
    logPass('Prisma schema defines all required entities (User, Product, Order, Enquiry, FarmerProfile).');
  } else {
    logFail(`Prisma schema is missing required database models: ${missingModels.join(', ')}`);
  }
} else {
  logFail('prisma/schema.prisma not found in backend directory.');
}

const sqliteDbPath = path.join(BACKEND_DIR, 'prisma/dev.db');
const altDbPath = path.join(BACKEND_DIR, 'dev.db');
if (fs.existsSync(sqliteDbPath) || fs.existsSync(altDbPath)) {
  logPass('SQLite database file exists and is accessible.');
} else {
  logWarn('No local SQLite dev.db detected. Run "npx prisma migrate dev" in backend to initialize database.');
}

// -------------------------------------------------------------
// 4. ENVIRONMENT & AUTHENTICATION CONFIGURATION
// -------------------------------------------------------------
section('4. Environment & Firebase Config Audit');

const feEnv = path.join(FRONTEND_DIR, '.env.local');
const feEnvFallback = path.join(FRONTEND_DIR, '.env');
const beEnv = path.join(BACKEND_DIR, '.env');

if (!fs.existsSync(feEnv) && !fs.existsSync(feEnvFallback)) {
  logWarn('frontend/.env.local not found. Application will rely on default fallback ports and mock keys.');
} else {
  const envContent = fs.readFileSync(fs.existsSync(feEnv) ? feEnv : feEnvFallback, 'utf-8');
  if (!envContent.includes('NEXT_PUBLIC_API_URL')) {
    logWarn('NEXT_PUBLIC_API_URL is not explicitly set in frontend environment.');
  } else {
    logPass('Frontend NEXT_PUBLIC_API_URL defined.');
  }
}

if (!fs.existsSync(beEnv)) {
  logWarn('backend/.env not found. Backend will use fallback JWT_SECRET and default port 5000.');
} else {
  logPass('Backend environment configuration found.');
}

// -------------------------------------------------------------
// 5. LIVE BACKEND API PROBE (IF RUNNING)
// -------------------------------------------------------------
section('5. Live Service Health Probe');

function probeHttp(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve({ status: res.statusCode, ok: res.statusCode < 400 || res.statusCode === 401 || res.statusCode === 404 });
    });
    req.on('error', () => resolve({ status: null, ok: false }));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve({ status: null, ok: false });
    });
  });
}

(async () => {
  const backendCheck = await probeHttp('http://localhost:5000/api/products');
  if (backendCheck.ok) {
    logPass(`Backend API responded on port 5000 (HTTP ${backendCheck.status}).`);
  } else {
    logWarn('Backend server is not currently running on port 5000. Start using start.bat or "npm run dev" in backend.');
  }

  const frontendCheck = await probeHttp('http://localhost:3000');
  if (frontendCheck.ok) {
    logPass(`Frontend Next.js server responded on port 3000 (HTTP ${frontendCheck.status}).`);
  } else {
    logWarn('Frontend server is not currently running on port 3000.');
  }

  // -------------------------------------------------------------
  // EXECUTIVE SUMMARY REPORT
  // -------------------------------------------------------------
  console.log(`\n${COLOR.bold}===========================================${COLOR.reset}`);
  console.log(`${COLOR.bold}         AUDIT SCAN SUMMARY REPORT         ${COLOR.reset}`);
  console.log(`${COLOR.bold}===========================================${COLOR.reset}`);
  console.log(`Passed Checks : ${COLOR.green}${passCount}${COLOR.reset}`);
  console.log(`Warnings      : ${COLOR.yellow}${warnings.length}${COLOR.reset}`);
  console.log(`Errors/Failures: ${COLOR.red}${issues.length}${COLOR.reset}\n`);

  if (issues.length === 0 && warnings.length === 0) {
    console.log(`${COLOR.green}${COLOR.bold}✔ SYSTEM CLEAN: Zero critical bugs or breaking discrepancies detected.${COLOR.reset}\n`);
    process.exit(0);
  } else if (issues.length === 0) {
    console.log(`${COLOR.yellow}${COLOR.bold}▲ SYSTEM OPERATIONAL: All core routes intact, but review warnings above.${COLOR.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${COLOR.red}${COLOR.bold}✖ REPAIRS REQUIRED: Resolve the failing checks listed above before deploying.${COLOR.reset}\n`);
    process.exit(1);
  }
})();