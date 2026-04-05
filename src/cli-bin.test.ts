import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  getFlag,
  getFlagValue,
  parseFormats,
  validateEnum,
  validatePositiveNumber,
  warnUnknownFlags,
} from '../cli/bin'

describe('cli/bin helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getFlag', () => {
    it('detects long boolean flags', () => {
      expect(getFlag('watch', ['render', '.', '--watch'])).toBe(true)
      expect(getFlag('force', ['render', '.'])).toBe(false)
    })

    it('detects mapped short flags', () => {
      expect(getFlag('watch', ['render', '.', '-w'])).toBe(true)
      expect(getFlag('force', ['render', '.', '-f'])).toBe(true)
    })
  })

  describe('getFlagValue', () => {
    it('returns value when present', () => {
      expect(getFlagValue('format', ['render', '.', '--format', 'svg,png'], false)).toBe('svg,png')
    })

    it('returns undefined when missing', () => {
      expect(getFlagValue('format', ['render', '.'], false)).toBeUndefined()
    })

    it('throws when next token looks like a flag', () => {
      expect(() => getFlagValue('format', ['render', '.', '--format', '--watch'], false)).toThrow(
        /Missing value/,
      )
    })
  })

  describe('validateEnum', () => {
    it('returns valid values', () => {
      expect(validateEnum('dark', ['light', 'dark', 'both'], 'theme', false)).toBe('dark')
    })

    it('throws for invalid values', () => {
      expect(() => validateEnum('neon', ['light', 'dark', 'both'], 'theme', false)).toThrow(
        /Invalid theme/,
      )
    })

    it('accepts supported log-level aliases', () => {
      expect(validateEnum('warnings', ['warnings', 'warn', 'info'], 'log-level', false)).toBe(
        'warnings',
      )
    })
  })

  describe('validatePositiveNumber', () => {
    it('returns positive numbers', () => {
      expect(validatePositiveNumber('2.5', 'scale', false)).toBe(2.5)
    })

    it('throws for zero, negative, and NaN', () => {
      expect(() => validatePositiveNumber('0', 'scale', false)).toThrow(/positive number/)
      expect(() => validatePositiveNumber('-1', 'scale', false)).toThrow(/positive number/)
      expect(() => validatePositiveNumber('abc', 'scale', false)).toThrow(/positive number/)
    })
  })

  describe('parseFormats', () => {
    it('parses single and comma-separated values with jpg normalization', () => {
      expect(parseFormats('svg', false)).toEqual(['svg'])
      expect(parseFormats('png,jpg', false)).toEqual(['png', 'jpeg'])
    })

    it('throws for empty input', () => {
      expect(() => parseFormats('', false)).toThrow(/at least one format/)
    })

    it('drops invalid formats and warns', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(parseFormats('png,wat,svg', false)).toEqual(['png', 'svg'])
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('dropped unsupported format'))
    })
  })

  describe('warnUnknownFlags', () => {
    it('warns on unknown long and short flags', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      warnUnknownFlags(['render', '.', '--watc', '-x'])
      expect(warnSpy).toHaveBeenCalledTimes(2)
      expect(warnSpy.mock.calls[0]![0]).toContain('did you mean --watch')
    })

    it('does not warn for known flags', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      warnUnknownFlags(['render', '.', '--watch', '--format', 'svg', '-w'])
      expect(warnSpy).not.toHaveBeenCalled()
    })
  })

  describe('parseFormats — edge cases', () => {
    it('normalizes jpg to jpeg in comma-separated list', () => {
      expect(parseFormats('svg,png,jpg', false)).toEqual(['svg', 'png', 'jpeg'])
    })

    it('throws when all formats are invalid', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(() => parseFormats('gif,bmp', false)).toThrow(/valid format/)
    })

    it('handles formats with whitespace in comma list', () => {
      expect(parseFormats('svg, png', false)).toEqual(['svg', 'png'])
    })
  })

  describe('getFlag — positional target extraction patterns', () => {
    it('extracts format flag when interleaved with positional args', () => {
      expect(getFlagValue('format', ['render', '--format', 'svg', 'mydir'], false)).toBe('svg')
    })

    it('returns undefined for flag value when flag is absent', () => {
      expect(getFlagValue('output', ['render', '.', '--format', 'svg'], false)).toBeUndefined()
    })

    it('detects boolean negation flags with --no- prefix', () => {
      expect(getFlag('no-contrast', ['render', '.', '--no-contrast'])).toBe(true)
    })
  })
})
