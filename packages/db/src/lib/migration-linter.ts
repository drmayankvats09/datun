/**
 * Migration Linter — Atlas-style policy engine for SQL migrations.
 *
 * Purpose: catch dangerous migration patterns BEFORE they reach production.
 * Each rule is a function that scans the migration SQL and returns
 * violations with severity, line number, and remediation guidance.
 *
 * Rules are CI-enforced (Phase I) and developer-warned via Husky (Phase K).
 *
 * Severity levels:
 *   - "error"  → blocks merge / deploy
 *   - "warn"   → passes but surfaces in PR comment
 *   - "info"   → tracked for trend analysis
 *
 * @see docs/adr/0002-prisma-migrations-baseline.md
 */

export type Severity = 'error' | 'warn' | 'info';

export interface LintViolation {
  rule: string;
  severity: Severity;
  line: number;
  message: string;
  remediation: string;
}

export interface LintResult {
  passed: boolean;
  violations: LintViolation[];
  errorCount: number;
  warnCount: number;
}

/** A single lint rule — pure function over (sql, lines) → violations. */
type Rule = (sql: string, lines: string[]) => LintViolation[];

const ruleNoDropTable: Rule = (_sql, lines) => {
  const violations: LintViolation[] = [];
  lines.forEach((line, idx) => {
    if (/^\s*DROP\s+TABLE/i.test(line)) {
      violations.push({
        rule: 'no-drop-table',
        severity: 'error',
        line: idx + 1,
        message: 'DROP TABLE statement detected — destructive operation.',
        remediation:
          'Rename the table first, deploy, then drop in a follow-up migration after confirming no production code references it.',
      });
    }
  });
  return violations;
};

const ruleNoDropColumn: Rule = (_sql, lines) => {
  const violations: LintViolation[] = [];
  lines.forEach((line, idx) => {
    if (/ALTER\s+TABLE.*DROP\s+COLUMN/i.test(line)) {
      violations.push({
        rule: 'no-drop-column',
        severity: 'error',
        line: idx + 1,
        message: 'DROP COLUMN detected — breaks rolling deploys.',
        remediation:
          'Use the expand-contract pattern: (1) deploy code that no longer reads the column, (2) wait one full deploy cycle, (3) drop in a separate migration.',
      });
    }
  });
  return violations;
};

const ruleNoNotNullWithoutDefault: Rule = (_sql, lines) => {
  const violations: LintViolation[] = [];
  lines.forEach((line, idx) => {
    const isAdd = /ALTER\s+TABLE.*ADD\s+COLUMN/i.test(line);
    const hasNotNull = /NOT\s+NULL/i.test(line);
    const hasDefault = /DEFAULT\s+/i.test(line);
    if (isAdd && hasNotNull && !hasDefault) {
      violations.push({
        rule: 'not-null-without-default',
        severity: 'error',
        line: idx + 1,
        message: 'Adding a NOT NULL column without DEFAULT will fail on any non-empty table.',
        remediation:
          'Either add DEFAULT or split into three steps: add nullable, backfill, then SET NOT NULL.',
      });
    }
  });
  return violations;
};

const ruleConcurrentIndex: Rule = (_sql, lines) => {
  const violations: LintViolation[] = [];
  lines.forEach((line, idx) => {
    if (/CREATE\s+(UNIQUE\s+)?INDEX/i.test(line) && !/CONCURRENTLY/i.test(line)) {
      violations.push({
        rule: 'concurrent-index',
        severity: 'warn',
        line: idx + 1,
        message: 'CREATE INDEX without CONCURRENTLY locks the table during build.',
        remediation:
          'For tables with >10K rows in production, use CREATE INDEX CONCURRENTLY (cannot run inside a transaction).',
      });
    }
  });
  return violations;
};

const ruleNoTruncate: Rule = (_sql, lines) => {
  const violations: LintViolation[] = [];
  lines.forEach((line, idx) => {
    if (/^\s*TRUNCATE/i.test(line)) {
      violations.push({
        rule: 'no-truncate',
        severity: 'error',
        line: idx + 1,
        message: 'TRUNCATE statement detected — irreversible data loss.',
        remediation:
          'Migrations must never truncate. If data cleanup is needed, use a separate one-time script outside the migration system.',
      });
    }
  });
  return violations;
};

const ruleNoUpdateAll: Rule = (_sql, lines) => {
  const violations: LintViolation[] = [];
  lines.forEach((line, idx) => {
    // UPDATE ... SET ... without WHERE
    if (/UPDATE\s+"\w+"\s+SET/i.test(line) && !/UPDATE\s+"\w+"\s+SET[\s\S]*WHERE/i.test(line)) {
      violations.push({
        rule: 'no-update-all',
        severity: 'warn',
        line: idx + 1,
        message: 'UPDATE without WHERE clause detected — touches every row in the table.',
        remediation:
          'If full-table backfill is intentional, batch in chunks of 1000 rows in a separate data-migration script.',
      });
    }
  });
  return violations;
};

const ruleRenameColumn: Rule = (_sql, lines) => {
  const violations: LintViolation[] = [];
  lines.forEach((line, idx) => {
    if (/ALTER\s+TABLE.*RENAME\s+COLUMN/i.test(line)) {
      violations.push({
        rule: 'no-rename-column',
        severity: 'error',
        line: idx + 1,
        message: 'RENAME COLUMN breaks rolling deploys.',
        remediation:
          'Use expand-contract: add new column, copy data, switch reads, switch writes, drop old column. Five separate migrations.',
      });
    }
  });
  return violations;
};

const ALL_RULES: Rule[] = [
  ruleNoDropTable,
  ruleNoDropColumn,
  ruleNoNotNullWithoutDefault,
  ruleConcurrentIndex,
  ruleNoTruncate,
  ruleNoUpdateAll,
  ruleRenameColumn,
];

/**
 * Run all lint rules against a migration SQL string.
 * Baseline migrations (0_init) are exempted from destructive-rule checks
 * because they only contain CREATE statements.
 */
export function lintMigration(sql: string): LintResult {
  const lines = sql.split(/\r?\n/);
  const violations: LintViolation[] = [];

  for (const rule of ALL_RULES) {
    violations.push(...rule(sql, lines));
  }

  const errorCount = violations.filter((v) => v.severity === 'error').length;
  const warnCount = violations.filter((v) => v.severity === 'warn').length;

  return {
    passed: errorCount === 0,
    violations,
    errorCount,
    warnCount,
  };
}

/**
 * Format a lint result as human-readable text for CI logs and PR comments.
 */
export function formatLintReport(result: LintResult): string {
  if (result.violations.length === 0) {
    return '✓ Migration lint passed — no violations.';
  }
  const lines = [
    `Migration lint: ${result.errorCount} error(s), ${result.warnCount} warning(s)`,
    '',
  ];
  for (const v of result.violations) {
    const icon = v.severity === 'error' ? '✗' : v.severity === 'warn' ? '⚠' : 'ℹ';
    lines.push(`${icon} [${v.rule}] line ${v.line}: ${v.message}`);
    lines.push(`  → ${v.remediation}`);
    lines.push('');
  }
  return lines.join('\n');
}
