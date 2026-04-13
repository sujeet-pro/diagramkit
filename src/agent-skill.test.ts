import { describe, expect, it } from 'vite-plus/test'
import { getDiagramkitSkillContent } from './agent-skill'

describe('getDiagramkitSkillContent', () => {
  it('returns the packaged project-skill guidance', () => {
    const content = getDiagramkitSkillContent()

    expect(content).toContain('name: diagramkit')
    expect(content).toContain('node_modules/diagramkit/llms.txt')
    expect(content).toContain('"render:diagrams": "diagramkit render ."')
    expect(content).toContain('npx diagramkit warmup')
    expect(content).toContain('npx diagramkit render .')
  })
})
