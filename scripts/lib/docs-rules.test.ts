import { describe, expect, it } from 'vitest'
import { findDiagramAssetReferences, findLinkStyleViolations, stripCodeForScan } from './docs-rules'

describe('stripCodeForScan', () => {
  it('strips fenced code blocks at column 0', () => {
    const md = '# Title\n\n```bash\nnpx diagramkit render .\n```\n\nAfter.'
    expect(stripCodeForScan(md)).toContain('# Title')
    expect(stripCodeForScan(md)).not.toContain('npx diagramkit render')
  })

  it('strips inline code spans', () => {
    const md = 'Run `npx foo` then `npx bar`.'
    expect(stripCodeForScan(md)).toBe('Run  then .')
  })

  it('preserves indented (in-list) fences so links inside them still surface', () => {
    // Indented fences are NOT treated as fenced blocks by the column-0 regex —
    // any link literal inside surfaces to the validator. This is intentional:
    // we'd rather over-report than miss a real broken link.
    const md = '1. Step:\n\n   ```bash\n   echo [link](./bad)\n   ```\n'
    const stripped = stripCodeForScan(md)
    expect(stripped).toContain('[link](./bad)')
  })

  it('handles multiple back-to-back fences', () => {
    const md = '```\nA\n```\n\n```\nB\n```'
    const stripped = stripCodeForScan(md)
    expect(stripped).not.toContain('A')
    expect(stripped).not.toContain('B')
  })

  it('does not crash on unclosed fence', () => {
    const md = '```bash\nnpx diagramkit render .\n\n[link](./foo)'
    // unclosed fence stays in content; `[link](./foo)` is detectable
    expect(stripCodeForScan(md)).toContain('[link](./foo)')
  })
})

describe('findLinkStyleViolations', () => {
  it('passes a clean ./path/README.md link', () => {
    expect(findLinkStyleViolations('See [CLI](./cli/README.md).')).toEqual([])
  })

  it('passes a clean parent ../path/README.md link', () => {
    expect(findLinkStyleViolations('See [Cfg](../configuration/README.md).')).toEqual([])
  })

  it('passes a same-file anchor (#section)', () => {
    expect(findLinkStyleViolations('Jump to [bottom](#bottom).')).toEqual([])
  })

  it('passes a .md link with a fragment', () => {
    expect(findLinkStyleViolations('See [Cfg](./cli/README.md#options).')).toEqual([])
  })

  it('passes a .mdx link', () => {
    expect(findLinkStyleViolations('[X](./guide.mdx)')).toEqual([])
  })

  it('passes a top-level .md sibling page', () => {
    expect(findLinkStyleViolations('[X](./design-principles.md)')).toEqual([])
  })

  it('passes external http(s) links', () => {
    const md = '[Repo](https://github.com/x/y) [Spec](http://example.com)'
    expect(findLinkStyleViolations(md)).toEqual([])
  })

  it('passes external mailto: and tel: links', () => {
    const md = '[Mail](mailto:x@y.com) [Call](tel:+1)'
    expect(findLinkStyleViolations(md)).toEqual([])
  })

  it('passes protocol-relative links', () => {
    expect(findLinkStyleViolations('[CDN](//cdn.example.com/x)')).toEqual([])
  })

  it('passes asset references (svg, png, json5, dot, drawio, …)', () => {
    const md =
      '[Diag](./.diagramkit/foo-light.svg) [Cfg](./diagramkit.config.json5) [Src](./flow.dot)'
    expect(findLinkStyleViolations(md)).toEqual([])
  })

  it('flags absolute path with no extension', () => {
    expect(findLinkStyleViolations('[X](/guide/cli)')).toEqual([{ url: '/guide/cli' }])
  })

  it('flags absolute path with trailing slash', () => {
    expect(findLinkStyleViolations('[X](/guide/cli/)')).toEqual([{ url: '/guide/cli/' }])
  })

  it('flags relative path with no extension', () => {
    expect(findLinkStyleViolations('[X](./cli)')).toEqual([{ url: './cli' }])
  })

  it('flags parent-relative path with no extension', () => {
    expect(findLinkStyleViolations('[X](../cli)')).toEqual([{ url: '../cli' }])
  })

  it('flags bare token', () => {
    expect(findLinkStyleViolations('[X](cli)')).toEqual([{ url: 'cli' }])
  })

  it('flags relative path with trailing slash (./guide/)', () => {
    expect(findLinkStyleViolations('[X](./guide/)')).toEqual([{ url: './guide/' }])
  })

  it('flags absolute /path/ with anchor', () => {
    expect(findLinkStyleViolations('[X](/guide/cli/#options)')).toEqual([
      { url: '/guide/cli/#options' },
    ])
  })

  it('ignores image syntax `![]()`', () => {
    // images already routed through findDiagramAssetReferences; link rule should not flag them
    expect(findLinkStyleViolations('![alt](./bad/path)')).toEqual([])
  })

  it('ignores link inside fenced code block', () => {
    const md = '```md\n[X](./bad)\n```\nReal content.'
    expect(findLinkStyleViolations(md)).toEqual([])
  })

  it('ignores link inside inline code', () => {
    expect(findLinkStyleViolations('Use `[X](./bad)` literally.')).toEqual([])
  })

  it('flags multiple violations in one document', () => {
    const md = '- [A](./a)\n- [B](/b/)\n- [C](c)\n- [Good](./good/README.md)\n'
    const violations = findLinkStyleViolations(md)
    expect(violations.map((v) => v.url)).toEqual(['./a', '/b/', 'c'])
  })

  it('does not throw on link with title attribute', () => {
    expect(findLinkStyleViolations('[X](./cli/README.md "CLI Reference")')).toEqual([])
    expect(findLinkStyleViolations('[X](./cli "CLI Reference")')).toEqual([{ url: './cli' }])
  })

  it('handles upper-case extensions consistently', () => {
    expect(findLinkStyleViolations('[X](./cli/README.MD)')).toEqual([])
    expect(findLinkStyleViolations('[X](./cli/README.MDX)')).toEqual([])
  })

  it('does not flag query-only links (?id=foo) as missing extension', () => {
    // `?` strips before extname → cleanPath becomes empty → skipped
    expect(findLinkStyleViolations('[X](?id=foo)')).toEqual([])
  })
})

describe('findDiagramAssetReferences', () => {
  it('finds source srcset references', () => {
    const md = '<source srcset=".diagramkit/flow-dark.svg" media="(prefers-color-scheme: dark)">'
    expect(findDiagramAssetReferences(md)).toEqual([
      { raw: '.diagramkit/flow-dark.svg', ref: '.diagramkit/flow-dark.svg' },
    ])
  })

  it('finds img src references', () => {
    const md = '<img src=".diagramkit/flow-light.svg" alt="x">'
    expect(findDiagramAssetReferences(md)).toEqual([
      { raw: '.diagramkit/flow-light.svg', ref: '.diagramkit/flow-light.svg' },
    ])
  })

  it('finds markdown image references', () => {
    const md = '![x](./.diagramkit/flow-light.svg)'
    expect(findDiagramAssetReferences(md)).toEqual([
      { raw: './.diagramkit/flow-light.svg', ref: './.diagramkit/flow-light.svg' },
    ])
  })

  it('strips ?query and #fragment from ref but preserves raw', () => {
    const md = '<img src=".diagramkit/flow-light.svg?v=2#frag" alt="x">'
    expect(findDiagramAssetReferences(md)).toEqual([
      {
        raw: '.diagramkit/flow-light.svg?v=2#frag',
        ref: '.diagramkit/flow-light.svg',
      },
    ])
  })

  it('ignores non-.diagramkit references', () => {
    const md = '<img src="./public/logo.png" alt="x">'
    expect(findDiagramAssetReferences(md)).toEqual([])
  })

  it('ignores external http(s) references', () => {
    const md =
      '<img src="https://example.com/.diagramkit/flow-light.svg" alt="x"> ![](https://x.test/.diagramkit/y.svg)'
    expect(findDiagramAssetReferences(md)).toEqual([])
  })

  it('ignores references inside fenced code blocks', () => {
    const md = '```html\n<img src=".diagramkit/flow-light.svg">\n```\nReal content.'
    expect(findDiagramAssetReferences(md)).toEqual([])
  })

  it('ignores references inside inline code', () => {
    const md = 'Use `<img src=".diagramkit/flow-light.svg">` literally.'
    expect(findDiagramAssetReferences(md)).toEqual([])
  })

  it('handles single-quoted attributes', () => {
    const md = "<img src='.diagramkit/flow-light.svg'>"
    expect(findDiagramAssetReferences(md)).toEqual([
      { raw: '.diagramkit/flow-light.svg', ref: '.diagramkit/flow-light.svg' },
    ])
  })

  it('finds multiple references in a <picture> element', () => {
    const md = `<picture>
  <source srcset=".diagramkit/foo-dark.svg" media="(prefers-color-scheme: dark)">
  <img src=".diagramkit/foo-light.svg" alt="foo">
</picture>`
    const refs = findDiagramAssetReferences(md)
    expect(refs.map((r) => r.ref)).toEqual([
      '.diagramkit/foo-dark.svg',
      '.diagramkit/foo-light.svg',
    ])
  })
})
