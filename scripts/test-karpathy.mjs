#!/usr/bin/env node
/**
 * Karpathy Guidelines Test Script
 *
 * Heuristic test suite that validates:
 * 1. SKILL.md structure and content
 * 2. AGENTS.md integration
 * 3. OpenCode configuration
 * 4. Simulated compliance scenarios
 *
 * Exit code: 0 = all passed, 1 = failures
 */

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';

// Colors for terminal output
const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

const ok = (msg) => console.log(`  ${C.green}✅${C.reset} ${msg}`);
const fail = (msg) => console.log(`  ${C.red}❌${C.reset} ${msg}`);
const warn = (msg) => console.log(`  ${C.yellow}⚠️${C.reset} ${msg}`);
const info = (msg) => console.log(`  ${C.dim}${msg}${C.reset}`);

// Test results tracking
let passed = 0;
let failed = 0;
let warnings = 0;

function check(condition, passMsg, failMsg) {
  if (condition) {
    ok(passMsg);
    passed++;
    return true;
  } else {
    fail(failMsg);
    failed++;
    return false;
  }
}

function warnCheck(condition, msg) {
  if (!condition) {
    warn(msg);
    warnings++;
  }
}

// ============================
// Section 1: SKILL.md Validation
// ============================

console.log(`\n🧪 ${C.cyan}Karpathy Guidelines Test Suite${C.reset}`);
console.log(`${C.dim}=================================${C.reset}\n`);

console.log(`📋 ${C.cyan}Structural Validation${C.reset}`);

const skillPath = join(homedir(), '.opencode', 'skills', 'karpathy-guidelines', 'SKILL.md');
const skillExists = existsSync(skillPath);

const isCI = process.env.CI === 'true';

if (isCI && !skillExists) {
  warn(
    'Running in CI — SKILL.md at ~/.opencode/skills/ not available (expected, it is a user-level OpenCode config)',
  );
  warn('CI validates AGENTS.md and script structure only');
  console.log(`\n${C.yellow}⚠️  Skipping skill-specific tests in CI environment${C.reset}\n`);
  // In CI, we only validate AGENTS.md and script structure
} else {
  check(skillExists, `SKILL.md exists at ${skillPath}`, `SKILL.md NOT FOUND at ${skillPath}`);

  if (!skillExists) {
    console.log(`\n${C.red}FATAL: Cannot proceed without SKILL.md${C.reset}`);
    process.exit(1);
  }
}

const skillContent = skillExists ? readFileSync(skillPath, 'utf8') : '';

if (skillExists) {
  // Frontmatter parsing
  const frontmatterMatch = skillContent.match(/^---\n([\s\S]*?)\n---\n/);
  check(frontmatterMatch !== null, 'Frontmatter YAML present', 'Frontmatter YAML MISSING');

  let frontmatter = {};
  if (frontmatterMatch) {
    const fmText = frontmatterMatch[1];
    for (const line of fmText.split('\n')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim();
        const value = line
          .slice(colonIdx + 1)
          .trim()
          .replace(/^["']|["']$/g, '');
        frontmatter[key] = value;
      }
    }
  }

  check(
    frontmatter.name === 'karpathy-guidelines',
    `name: ${frontmatter.name || '(missing)'}`,
    `name is '${frontmatter.name || '(missing)'}', expected 'karpathy-guidelines'`,
  );

  check(
    frontmatter.description && frontmatter.description.startsWith('Use when'),
    `description starts with "Use when..."`,
    `description does NOT start with "Use when..."`,
  );

  check(
    skillContent.includes('Type: Rigid') || skillContent.includes('**Type:** Rigid'),
    'Type: Rigid declared',
    'Type: Rigid NOT found',
  );

  // Required sections
  const requiredSections = [
    'Think Before Coding',
    'Simplicity First',
    'Surgical Changes',
    'Goal-Driven Execution',
  ];

  for (const section of requiredSections) {
    check(
      skillContent.includes(section),
      `Section "${section}" found`,
      `Section "${section}" MISSING`,
    );
  }

  // Merge table
  warnCheck(
    skillContent.includes('Already in system prompt?'),
    'Merge analysis table may be missing',
  );

  // Priority note
  check(
    skillContent.includes('override default system prompt behavior'),
    'Priority override rule present',
    'Priority override rule NOT found',
  );
}

// ============================
// Section 2: Environment Validation
// ============================

console.log(`\n🌍 ${C.cyan}Environment Validation${C.reset}`);

// AGENTS.md check
const agentsPath = resolve('AGENTS.md');
const agentsExists = existsSync(agentsPath);
check(agentsExists, `AGENTS.md exists`, `AGENTS.md NOT FOUND at ${agentsPath}`);

if (agentsExists) {
  const agentsContent = readFileSync(agentsPath, 'utf8');
  check(
    agentsContent.includes('Karpathy Guidelines'),
    'AGENTS.md contains "Karpathy Guidelines" section',
    'AGENTS.md MISSING "Karpathy Guidelines" section',
  );

  // Check Portuguese translation is present
  const ptSections = [
    'Nao assumir',
    'Minimo de codigo',
    'Toca apenas no que deves',
    'Define criterios de sucesso',
  ];

  for (const pt of ptSections) {
    check(
      agentsContent.includes(pt),
      `Portuguese rule "${pt}" found`,
      `Portuguese rule "${pt}" MISSING`,
    );
  }
}

// opencode.jsonc check — user-level config, skip in CI
const configPath = join(homedir(), '.config', 'opencode', 'opencode.jsonc');
const configExists = existsSync(configPath);
if (isCI && !configExists) {
  warn('opencode.jsonc not available in CI (expected, user-level config)');
} else {
  check(configExists, `opencode.jsonc exists`, `opencode.jsonc NOT FOUND`);

  if (configExists) {
    const configContent = readFileSync(configPath, 'utf8');
    check(
      configContent.includes('skills') && configContent.includes('paths'),
      'opencode.jsonc has skills.paths',
      'opencode.jsonc MISSING skills.paths',
    );

    const expectedPath = join(homedir(), '.opencode', 'skills').replace(/\\/g, '/');
    check(
      configContent.includes(expectedPath) || configContent.includes('.opencode/skills'),
      `skills.paths points to custom skills directory`,
      `skills.paths does NOT point to custom skills directory`,
    );
  }
}

// ============================
// Section 3: Simulated Scenarios
// ============================

console.log(`\n🎭 ${C.cyan}Simulated Compliance Scenarios${C.reset}`);

if (!skillExists) {
  warn('Skipping scenario checks — SKILL.md not available');
}

// Extract body content (without frontmatter)
const bodyContent = skillContent ? skillContent.replace(/^---\n[\s\S]*?\n---\n/, '') : '';

if (skillExists) {
  // Scenario A: Think Before Coding
  console.log(`\n  Scenario A: "Add a new button to the header"`);
  info('  Expected: Agent states assumptions, asks for clarification');

  const thinkBeforeKeywords = [
    'assumptions',
    'clarify',
    'uncertain',
    'ask rather than guess',
    'multiple interpretations',
    'push back',
  ];

  const thinkBeforeFound = thinkBeforeKeywords.filter((k) =>
    bodyContent.toLowerCase().includes(k.toLowerCase()),
  );
  check(
    thinkBeforeFound.length >= 3,
    `Think Before Coding — ${thinkBeforeFound.length}/${thinkBeforeKeywords.length} keywords found`,
    `Think Before Coding — only ${thinkBeforeFound.length}/${thinkBeforeKeywords.length} keywords found`,
  );

  // Scenario B: Goal-Driven Execution
  console.log(`\n  Scenario B: "Fix the login bug"`);
  info('  Expected: Agent proposes test-first approach, defines success criteria');

  const goalKeywords = [
    'test',
    'reproduce',
    'success criteria',
    'verify',
    'verifiable',
    'before and after',
    'loop until',
  ];

  const goalFound = goalKeywords.filter((k) => bodyContent.toLowerCase().includes(k.toLowerCase()));
  check(
    goalFound.length >= 4,
    `Goal-Driven Execution — ${goalFound.length}/${goalKeywords.length} keywords found`,
    `Goal-Driven Execution — only ${goalFound.length}/${goalKeywords.length} keywords found`,
  );

  // Scenario C: Surgical Changes
  console.log(`\n  Scenario C: "Fix bug + refactor CSS"`);
  info('  Expected: Agent refuses drive-by refactoring');

  const surgicalKeywords = [
    "don't refactor",
    'not related',
    'touch only what',
    'drive-by',
    'out of scope',
    'separate task',
    'adjacent code',
    'only your own mess',
  ];

  const surgicalFound = surgicalKeywords.filter((k) =>
    bodyContent.toLowerCase().includes(k.toLowerCase()),
  );
  check(
    surgicalFound.length >= 3,
    `Surgical Changes — ${surgicalFound.length}/${surgicalKeywords.length} keywords found`,
    `Surgical Changes — only ${surgicalFound.length}/${surgicalKeywords.length} keywords found`,
  );

  // Scenario D: Simplicity First
  console.log(`\n  Scenario D: "Build a plugin system with hot-reload"`);
  info('  Expected: Agent pushes back, suggests simpler approach');

  const simplicityKeywords = [
    'overcomplicated',
    'simpler',
    'simplify',
    'rewrite it',
    'senior engineer',
    '200 lines',
    '100 would do',
    'minimum code',
    'nothing speculative',
  ];

  const simplicityFound = simplicityKeywords.filter((k) =>
    bodyContent.toLowerCase().includes(k.toLowerCase()),
  );
  check(
    simplicityFound.length >= 3,
    `Simplicity First — ${simplicityFound.length}/${simplicityKeywords.length} keywords found`,
    `Simplicity First — only ${simplicityFound.length}/${simplicityKeywords.length} keywords found`,
  );
} // end if (skillExists) — Section 3

// ============================
// Section 4: Cross-Reference Check
// ============================

console.log(`\n🔗 ${C.cyan}Cross-Reference Consistency${C.reset}`);

if (agentsExists && skillExists) {
  const agentsContent = readFileSync(agentsPath, 'utf8');
  // Check that AGENTS.md references the same 4 principles
  const agentsHas4Rules =
    agentsContent.includes('Think Before Coding') &&
    agentsContent.includes('Simplicity First') &&
    agentsContent.includes('Surgical Changes') &&
    agentsContent.includes('Goal-Driven Execution');

  check(
    agentsHas4Rules,
    'AGENTS.md contains all 4 Karpathy principles',
    'AGENTS.md MISSING some Karpathy principles',
  );

  // Check merge table exists in AGENTS.md
  check(
    agentsContent.includes('Merge com Regras Existentes') ||
      agentsContent.includes('Ja existia no system prompt'),
    'AGENTS.md has merge analysis table',
    'AGENTS.md MISSING merge analysis table',
  );
}

// ============================
// Summary
// ============================

const total = passed + failed;
console.log(`\n${C.cyan}=================================${C.reset}`);
console.log(`📊 ${C.cyan}Results: ${passed}/${total} passed${C.reset}`);

if (warnings > 0) {
  console.log(`   ${C.yellow}${warnings} warning(s)${C.reset}`);
}

if (failed === 0) {
  console.log(
    `\n${C.green}✅ All tests passed! Karpathy Guidelines are correctly configured.${C.reset}\n`,
  );
  process.exit(0);
} else {
  console.log(`\n${C.red}❌ ${failed} test(s) failed.${C.reset}\n`);
  process.exit(1);
}
