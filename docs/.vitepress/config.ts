import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/diagramkit/',
  title: 'diagramkit',
  description: 'Render diagram files to images with light/dark mode support',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Diagrams', link: '/diagrams/mermaid' },
      { text: 'Reference', link: '/reference/api' },
    ],
    sidebar: {
      '/guide/': [
        { text: 'Getting Started', link: '/guide/getting-started' },
        { text: 'CLI', link: '/guide/cli' },
        { text: 'JavaScript API', link: '/guide/js-api' },
        { text: 'Configuration', link: '/guide/configuration' },
        { text: 'Watch Mode', link: '/guide/watch-mode' },
        { text: 'Image Formats', link: '/guide/image-formats' },
      ],
      '/diagrams/': [
        { text: 'Mermaid', link: '/diagrams/mermaid' },
        { text: 'Excalidraw', link: '/diagrams/excalidraw' },
        { text: 'Draw.io', link: '/diagrams/drawio' },
      ],
      '/reference/': [
        { text: 'API', link: '/reference/api' },
        { text: 'CLI', link: '/reference/cli' },
        { text: 'Configuration', link: '/reference/config' },
        { text: 'Types', link: '/reference/types' },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/sujeet-pro/diagramkit' },
    ],
  },
})
