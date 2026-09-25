/**
 * Master Verification Suite Runner
 *
 * Runs all authoritative verification suites before deployment:
 * 1. verify-security-and-access.js
 * 2. verify-cne-workflows.js
 * 3. verify-pdf-resources-and-indexing.js
 * 4. verify-system-integration.js
 *
 * Exit code 0 if all tests across all suites pass.
 * Exit code 1 if any suite encounters a failure.
 */

import { execFileSync } from 'child_process';
import path from 'path';

console.log('================================================================');
console.log('   CNE MANAGEMENT SYSTEM - COMPLETE PRE-DEPLOYMENT VERIFICATION');
console.log('================================================================\n');

const suites = [
  {
    name: 'Security & Access Control',
    script: 'scripts/verify-security-and-access.js',
    desc: 'Authentication, session HMAC, ward isolation, RP authorization, lifecycle locks & post-test security'
  },
  {
    name: 'CNE Workflows & Schemas',
    script: 'scripts/verify-cne-workflows.js',
    desc: 'Central CNE, Departmental CNE, Unscheduled CNE, authoritative lifecycle & active sheet headers'
  },
  {
    name: 'PDF Resources & Evidence Indexing',
    script: 'scripts/verify-pdf-resources-and-indexing.js',
    desc: 'PDF document policy, size boundaries, unsupported formats, chunking & clinical relevance gating'
  },
  {
    name: 'System Integration',
    script: 'scripts/verify-system-integration.js',
    desc: 'Frontend API ↔ GAS consistency, Code.gs sync, canonical routing, schema lifecycle, Gemini & safety'
  }
];

let totalSuitesPassed = 0;
const results = [];

for (const suite of suites) {
  console.log(`\n>>> Running Suite: ${suite.name}`);
  console.log(`    File: ${suite.script}`);
  console.log(`    Scope: ${suite.desc}\n`);

  const startTime = Date.now();
  try {
    const stdout = execFileSync('node', [suite.script], {
      encoding: 'utf8',
      stdio: ['inherit', 'pipe', 'pipe']
    });
    console.log(stdout.trim());
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    results.push({ name: suite.name, status: 'PASSED', duration: `${duration}s` });
    totalSuitesPassed++;
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(err.stdout || '');
    console.error(err.stderr || err.message);
    results.push({ name: suite.name, status: 'FAILED', duration: `${duration}s` });
  }
}

console.log('\n================================================================');
console.log('                  VERIFICATION SUMMARY REPORT                   ');
console.log('================================================================');

for (const res of results) {
  const icon = res.status === 'PASSED' ? '✓' : '✗';
  console.log(`  ${icon} [${res.status}] ${res.name.padEnd(35)} (${res.duration})`);
}

console.log('----------------------------------------------------------------');
console.log(`Total Suites: ${suites.length} | Passed: ${totalSuitesPassed} | Failed: ${suites.length - totalSuitesPassed}`);
console.log('================================================================\n');

if (totalSuitesPassed === suites.length) {
  console.log('🎉 ALL APPLICATION VERIFICATION SUITES PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error('❌ ONE OR MORE VERIFICATION SUITES FAILED!');
  process.exit(1);
}
