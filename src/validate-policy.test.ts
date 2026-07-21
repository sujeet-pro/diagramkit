import { describe, expect, it } from 'vite-plus/test'
import {
  KNOWN_SVG_ISSUE_CODES,
  evaluatePolicy,
  filterResultsByScope,
  isUnderScopeDir,
  parseFailOnCodes,
  parseFailOnSeverity,
} from '../cli/validate-policy'
import type { SvgIssue, SvgValidationResult } from './validate'

function issue(overrides: Partial<SvgIssue>): SvgIssue {
  return {
    code: 'LOW_CONTRAST_TEXT',
    severity: 'warning',
    message: 'test',
    ...overrides,
  }
}

function result(file: string, issues: SvgIssue[]): SvgValidationResult {
  const hasError = issues.some((i) => i.severity === 'error')
  return { file, valid: !hasError, issues }
}

describe('parseFailOnCodes', () => {
  it('parses a comma-separated list of known codes', () => {
    const { codes, unknown } = parseFailOnCodes('LOW_CONTRAST_TEXT,CONTAINS_SCRIPT')
    expect(codes).toEqual(['LOW_CONTRAST_TEXT', 'CONTAINS_SCRIPT'])
    expect(unknown).toEqual([])
  })

  it('is case-insensitive and normalizes to upper-case', () => {
    const { codes } = parseFailOnCodes('low_contrast_text, External_Resource')
    expect(codes).toEqual(['LOW_CONTRAST_TEXT', 'EXTERNAL_RESOURCE'])
  })

  it('collects unknown codes separately', () => {
    const { codes, unknown } = parseFailOnCodes('LOW_CONTRAST_TEXT,NOPE,typo')
    expect(codes).toEqual(['LOW_CONTRAST_TEXT'])
    expect(unknown).toEqual(['NOPE', 'typo'])
  })

  it('dedupes and drops empty tokens', () => {
    const { codes } = parseFailOnCodes('LOW_CONTRAST_TEXT,,LOW_CONTRAST_TEXT')
    expect(codes).toEqual(['LOW_CONTRAST_TEXT'])
  })

  it('recognizes every code in KNOWN_SVG_ISSUE_CODES', () => {
    const { codes, unknown } = parseFailOnCodes(KNOWN_SVG_ISSUE_CODES.join(','))
    expect(unknown).toEqual([])
    expect(codes).toEqual([...KNOWN_SVG_ISSUE_CODES])
  })
})

describe('parseFailOnSeverity', () => {
  it('returns undefined for undefined / empty input', () => {
    expect(parseFailOnSeverity(undefined)).toBeUndefined()
    expect(parseFailOnSeverity('  ')).toBeUndefined()
  })

  it('accepts warn / warning / error', () => {
    expect(parseFailOnSeverity('warn')).toBe('warn')
    expect(parseFailOnSeverity('WARNING')).toBe('warn')
    expect(parseFailOnSeverity('error')).toBe('error')
  })

  it('throws on an invalid value', () => {
    expect(() => parseFailOnSeverity('fatal')).toThrow(/Invalid fail-on-severity/)
  })
})

describe('isUnderScopeDir', () => {
  it('matches a directory segment', () => {
    expect(isUnderScopeDir('content/x/diagrams/y-light.svg', 'diagrams')).toBe(true)
  })

  it('does not match a substring of a segment', () => {
    expect(isUnderScopeDir('content/my-diagrams-notes/y.svg', 'diagrams')).toBe(false)
  })

  it('requires the match before the file name', () => {
    // "diagrams" only appears as the file's own basename segment — not a dir.
    expect(isUnderScopeDir('content/x/diagrams', 'diagrams')).toBe(false)
  })

  it('returns true for an empty scope dir', () => {
    expect(isUnderScopeDir('anything.svg', '')).toBe(true)
  })

  it('handles windows-style separators', () => {
    expect(isUnderScopeDir('content\\x\\diagrams\\y.svg', 'diagrams')).toBe(true)
  })
})

describe('filterResultsByScope', () => {
  const results = [
    result('content/a/diagrams/one-light.svg', []),
    result('content/assets/logo.svg', []),
    result('pkg/diagrams/two-dark.svg', []),
  ]

  it('is a no-op when scopeDir is undefined', () => {
    expect(filterResultsByScope(results, undefined)).toBe(results)
  })

  it('keeps only results under the scope directory', () => {
    const filtered = filterResultsByScope(results, 'diagrams')
    expect(filtered.map((r) => r.file)).toEqual([
      'content/a/diagrams/one-light.svg',
      'pkg/diagrams/two-dark.svg',
    ])
  })

  it('keeps results with no file path', () => {
    const withNoFile: SvgValidationResult = { valid: true, issues: [] }
    expect(filterResultsByScope([withNoFile], 'diagrams')).toEqual([withNoFile])
  })
})

describe('evaluatePolicy', () => {
  it('fails on baseline errors regardless of policy', () => {
    const results = [result('a.svg', [issue({ code: 'CONTAINS_SCRIPT', severity: 'error' })])]
    const evaln = evaluatePolicy(results, { failOnCodes: [] })
    expect(evaln.failed).toBe(true)
    expect(evaln.failedByBaseline).toBe(true)
    // Errors are already fatal — never counted as "promoted".
    expect(evaln.promoted).toEqual([])
  })

  it('passes when only warnings exist and no policy is set', () => {
    const results = [result('a.svg', [issue({ code: 'LOW_CONTRAST_TEXT' })])]
    const evaln = evaluatePolicy(results, { failOnCodes: [] })
    expect(evaln.failed).toBe(false)
    expect(evaln.promoted).toEqual([])
  })

  it('promotes a matching warning via --fail-on', () => {
    const results = [
      result('a.svg', [issue({ code: 'LOW_CONTRAST_TEXT' })]),
      result('b.svg', [issue({ code: 'LOW_CONTRAST_TEXT' })]),
      result('c.svg', [issue({ code: 'EXTERNAL_RESOURCE' })]),
    ]
    const evaln = evaluatePolicy(results, { failOnCodes: ['LOW_CONTRAST_TEXT'] })
    expect(evaln.failed).toBe(true)
    expect(evaln.failedByFailOnCode).toBe(true)
    expect(evaln.failedByBaseline).toBe(false)
    expect(evaln.matchedFailOnCodes).toEqual(['LOW_CONTRAST_TEXT'])
    expect(evaln.promoted).toEqual([{ code: 'LOW_CONTRAST_TEXT', severity: 'warning', count: 2 }])
  })

  it('fails via --fail-on-severity warn on any warning', () => {
    const results = [result('a.svg', [issue({ code: 'CONTAINS_FOREIGN_OBJECT' })])]
    const evaln = evaluatePolicy(results, { failOnCodes: [], failOnSeverity: 'warn' })
    expect(evaln.failed).toBe(true)
    expect(evaln.failedByFailOnSeverity).toBe(true)
    expect(evaln.promoted).toEqual([
      { code: 'CONTAINS_FOREIGN_OBJECT', severity: 'warning', count: 1 },
    ])
  })

  it('--fail-on-severity error does not fail when only warnings exist', () => {
    const results = [result('a.svg', [issue({ code: 'LOW_CONTRAST_TEXT' })])]
    const evaln = evaluatePolicy(results, { failOnCodes: [], failOnSeverity: 'error' })
    expect(evaln.failed).toBe(false)
    expect(evaln.failedByFailOnSeverity).toBe(false)
  })

  it('composes scope-independent fail conditions', () => {
    const results = [
      result('a.svg', [
        issue({ code: 'MISSING_XMLNS' }),
        issue({ code: 'CONTAINS_SCRIPT', severity: 'error' }),
      ]),
    ]
    const evaln = evaluatePolicy(results, {
      failOnCodes: ['MISSING_XMLNS'],
      failOnSeverity: 'error',
    })
    expect(evaln.failed).toBe(true)
    expect(evaln.failedByBaseline).toBe(true)
    expect(evaln.failedByFailOnCode).toBe(true)
    expect(evaln.failedByFailOnSeverity).toBe(true)
    // Only the warning-severity MISSING_XMLNS is a promotion.
    expect(evaln.promoted).toEqual([{ code: 'MISSING_XMLNS', severity: 'warning', count: 1 }])
  })
})
