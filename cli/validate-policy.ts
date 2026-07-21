/**
 * Validation scoping + severity policy for `diagramkit validate`.
 *
 * These helpers upstream the glue that consumers (sujeet.pro's
 * `scripts/validate-diagrams.ts`, pagesmith's `scripts/render-diagrams.ts`)
 * previously re-implemented on top of the raw `diagramkit validate --json`
 * output:
 *
 *   - `--scope-dir <name>`  — only consider SVGs that live under a directory
 *     named `<name>` (e.g. `diagrams`), so hand-authored assets elsewhere in
 *     the tree stop producing false-positive CONTAINS_FOREIGN_OBJECT /
 *     EXTERNAL_RESOURCE warnings.
 *   - `--fail-on <CODE,...>` — promote specific issue codes to fatal.
 *   - `--fail-on-severity <warn|error>` — fail when any issue at or above the
 *     given severity exists.
 *
 * All three compose. The policy is pure and side-effect free so it can be
 * unit-tested without touching the filesystem or the CLI process.
 */

import type { SvgIssueCode, SvgIssueSeverity, SvgValidationResult } from '../src/validate'

/** Severity threshold accepted by `--fail-on-severity`. */
export type FailOnSeverity = 'warn' | 'error'

/** The resolved, effective validation policy for a single invocation. */
export interface ValidatePolicy {
  /** Only consider files under a directory named this. `undefined` = no scoping. */
  scopeDir?: string
  /** Issue codes promoted to fatal (nonzero exit when present). */
  failOnCodes: SvgIssueCode[]
  /** Fail when any issue at or above this severity exists. */
  failOnSeverity?: FailOnSeverity
}

/**
 * Every known SVG issue code. Kept in sync with the `SvgIssueCode` union in
 * `src/validate.ts` via the compile-time exhaustiveness check below — if a code
 * is added to (or removed from) the union, this array stops type-checking until
 * it is updated too.
 */
export const KNOWN_SVG_ISSUE_CODES = [
  'EMPTY_FILE',
  'MISSING_SVG_TAG',
  'MISSING_SVG_CLOSE',
  'MISSING_WIDTH',
  'MISSING_HEIGHT',
  'NO_VISUAL_ELEMENTS',
  'CONTAINS_SCRIPT',
  'CONTAINS_FOREIGN_OBJECT',
  'MISSING_XMLNS',
  'EXTERNAL_RESOURCE',
  'INVALID_VIEWBOX',
  'SVG_TOO_LARGE',
  'LOW_CONTRAST_TEXT',
  'ASPECT_RATIO_EXTREME',
  'SVG_VIEWBOX_TOO_WIDE',
] as const satisfies readonly SvgIssueCode[]

// Compile-time guard: fails to type-check if KNOWN_SVG_ISSUE_CODES omits a
// member of the SvgIssueCode union (keeps the runtime list exhaustive).
type _ExhaustiveCodeCheck = Exclude<SvgIssueCode, (typeof KNOWN_SVG_ISSUE_CODES)[number]>
const _exhaustiveCodeCheck: _ExhaustiveCodeCheck[] = []
void _exhaustiveCodeCheck

const KNOWN_CODE_SET = new Set<string>(KNOWN_SVG_ISSUE_CODES)

const SEVERITY_RANK: Record<SvgIssueSeverity, number> = { warning: 1, error: 2 }
const FAIL_ON_SEVERITY_RANK: Record<FailOnSeverity, number> = { warn: 1, error: 2 }

/** Result of parsing a raw `--fail-on` value. */
export interface ParsedFailOnCodes {
  codes: SvgIssueCode[]
  unknown: string[]
}

/**
 * Parse a comma-separated `--fail-on` value into known issue codes.
 * Unknown/misspelled codes are collected separately so the caller can warn.
 * Matching is case-insensitive; codes are normalized to upper-case.
 */
export function parseFailOnCodes(raw: string): ParsedFailOnCodes {
  const codes: SvgIssueCode[] = []
  const unknown: string[] = []
  const seen = new Set<string>()
  for (const part of raw.split(',')) {
    const token = part.trim()
    if (!token) continue
    const normalized = token.toUpperCase()
    if (!KNOWN_CODE_SET.has(normalized)) {
      unknown.push(token)
      continue
    }
    if (seen.has(normalized)) continue
    seen.add(normalized)
    codes.push(normalized as SvgIssueCode)
  }
  return { codes, unknown }
}

/**
 * Normalize a raw `--fail-on-severity` value. Accepts `warn`/`warning` and
 * `error`. Returns `undefined` for empty input; throws for anything else.
 */
export function parseFailOnSeverity(raw: string | undefined): FailOnSeverity | undefined {
  if (raw === undefined) return undefined
  const normalized = raw.trim().toLowerCase()
  if (normalized === '') return undefined
  if (normalized === 'warn' || normalized === 'warning') return 'warn'
  if (normalized === 'error') return 'error'
  throw new Error(`Invalid fail-on-severity: "${raw}". Must be one of: warn, error`)
}

/**
 * True when `filePath` lives under a directory segment named `scopeDir`.
 * Segment comparison (not substring) so `--scope-dir diagrams` matches
 * `content/x/diagrams/y.svg` but not `content/my-diagrams-notes/y.svg`.
 */
export function isUnderScopeDir(filePath: string, scopeDir: string): boolean {
  if (!scopeDir) return true
  const segments = filePath.split(/[\\/]+/).filter(Boolean)
  // The final segment is the file name itself, so a directory match must occur
  // before the last segment.
  for (let i = 0; i < segments.length - 1; i++) {
    if (segments[i] === scopeDir) return true
  }
  return false
}

/** Keep only results whose file path is under `scopeDir` (no-op when unset). */
export function filterResultsByScope(
  results: SvgValidationResult[],
  scopeDir: string | undefined,
): SvgValidationResult[] {
  if (!scopeDir) return results
  return results.filter((r) => (r.file ? isUnderScopeDir(r.file, scopeDir) : true))
}

/** A warning-severity issue elevated to fatal by the policy. */
export interface PromotedIssue {
  code: SvgIssueCode
  severity: SvgIssueSeverity
  count: number
}

/** Outcome of applying a {@link ValidatePolicy} to a set of results. */
export interface PolicyEvaluation {
  /** Whether the invocation should exit nonzero. */
  failed: boolean
  /** Any error-severity issue exists (the baseline fail condition). */
  failedByBaseline: boolean
  /** A `--fail-on` code is present. */
  failedByFailOnCode: boolean
  /** An issue at or above `--fail-on-severity` is present. */
  failedByFailOnSeverity: boolean
  /** Warning-severity issues that were elevated to fatal by the policy. */
  promoted: PromotedIssue[]
  /** Codes from `failOnCodes` that were actually present in the results. */
  matchedFailOnCodes: SvgIssueCode[]
}

/**
 * Evaluate the effective policy against validation results and decide the exit
 * disposition. Errors always fail (baseline, unchanged from the historical
 * behavior); `--fail-on` and `--fail-on-severity` add extra fail conditions and
 * mark the warnings they elevate as "promoted".
 */
export function evaluatePolicy(
  results: SvgValidationResult[],
  policy: ValidatePolicy,
): PolicyEvaluation {
  const failOnCodeSet = new Set<string>(policy.failOnCodes)
  const severityThreshold = policy.failOnSeverity
    ? FAIL_ON_SEVERITY_RANK[policy.failOnSeverity]
    : undefined

  let failedByBaseline = false
  let failedByFailOnCode = false
  let failedByFailOnSeverity = false

  const promotedCounts = new Map<string, PromotedIssue>()
  const matchedFailOnCodes = new Set<SvgIssueCode>()

  for (const result of results) {
    for (const issue of result.issues) {
      const rank = SEVERITY_RANK[issue.severity]
      const isError = issue.severity === 'error'
      if (isError) failedByBaseline = true

      const matchesCode = failOnCodeSet.has(issue.code)
      if (matchesCode) {
        failedByFailOnCode = true
        matchedFailOnCodes.add(issue.code)
      }

      const matchesSeverity = severityThreshold !== undefined && rank >= severityThreshold
      if (matchesSeverity) failedByFailOnSeverity = true

      // "Promoted" = a warning that the policy turns fatal (errors are already
      // fatal via the baseline, so they are never counted as promotions).
      if (!isError && (matchesCode || matchesSeverity)) {
        const existing = promotedCounts.get(issue.code)
        if (existing) {
          existing.count += 1
        } else {
          promotedCounts.set(issue.code, {
            code: issue.code,
            severity: issue.severity,
            count: 1,
          })
        }
      }
    }
  }

  return {
    failed: failedByBaseline || failedByFailOnCode || failedByFailOnSeverity,
    failedByBaseline,
    failedByFailOnCode,
    failedByFailOnSeverity,
    promoted: [...promotedCounts.values()],
    matchedFailOnCodes: [...matchedFailOnCodes],
  }
}
