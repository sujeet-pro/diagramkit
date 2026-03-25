---
name: diagrams-ci-cd
description: Set up diagramkit diagram rendering in CI/CD pipelines including GitHub Actions, GitLab CI, Docker, pre-commit hooks, and caching strategies for Playwright browsers and rendered output
user_invocable: true
arguments:
  - name: platform
    description: 'CI platform: github-actions, gitlab-ci, docker, pre-commit (default: github-actions)'
    required: false
  - name: format
    description: 'Output format: svg, png, jpeg, webp (default: svg)'
    required: false
  - name: strategy
    description: 'Rendering strategy: commit-output, artifact, on-demand (default: commit-output)'
    required: false
---

# CI/CD Integration

Set up diagramkit diagram rendering in continuous integration and deployment pipelines. This skill covers GitHub Actions, GitLab CI, Docker, pre-commit hooks, and caching strategies.

## Strategy Overview

Choose a rendering strategy based on your workflow:

| Strategy          | Description                                   | Best For                           |
| ----------------- | --------------------------------------------- | ---------------------------------- |
| **commit-output** | Render in CI, commit `.diagrams/` to the repo | Documentation sites, GitHub README |
| **artifact**      | Render in CI, upload as build artifact        | Ephemeral builds, PR previews      |
| **on-demand**     | Render only when diagram source files change  | Large repos, cost-sensitive CI     |

---

## GitHub Actions

### Basic Setup

```yaml
name: Render Diagrams

on:
  push:
    branches: [main]
    paths:
      - '**/*.mermaid'
      - '**/*.mmd'
      - '**/*.mmdc'
      - '**/*.excalidraw'
      - '**/*.drawio'
      - '**/*.drawio.xml'
      - '**/*.dio'
  pull_request:
    paths:
      - '**/*.mermaid'
      - '**/*.mmd'
      - '**/*.mmdc'
      - '**/*.excalidraw'
      - '**/*.drawio'
      - '**/*.drawio.xml'
      - '**/*.dio'

jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        id: playwright-cache
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

      - name: Install Playwright Chromium
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps chromium

      - name: Install Playwright deps (cache hit)
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps chromium

      - name: Render diagrams
        run: npx diagramkit render .

      - name: Commit rendered output
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add '**/.diagrams/'
          git diff --staged --quiet || git commit -m "chore: render diagrams"
          git push
```

### Key Points

- **Path filtering**: Only trigger when diagram source files change, not on every push.
- **Playwright cache**: Cache the Chromium binary (~400MB) between runs. Even with a cache hit, run `install-deps` to ensure OS libraries are present.
- **Commit output**: The `git diff --staged --quiet ||` pattern avoids empty commits when nothing changed.

### PR Preview (Artifact Strategy)

```yaml
name: Diagram Preview

on:
  pull_request:
    paths:
      - '**/*.mermaid'
      - '**/*.mmd'
      - '**/*.mmdc'
      - '**/*.excalidraw'
      - '**/*.drawio'
      - '**/*.drawio.xml'
      - '**/*.dio'

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        id: playwright-cache
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

      - name: Install Playwright Chromium
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps chromium

      - name: Install Playwright deps (cache hit)
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps chromium

      - name: Render diagrams
        run: npx diagramkit render . --format png --theme light --scale 2

      - name: Upload diagram previews
        uses: actions/upload-artifact@v7
        with:
          name: diagram-previews
          path: '**/.diagrams/*.png'
          retention-days: 7
```

### Raster Output for Documentation

When your documentation pipeline requires PNG or JPEG:

```yaml
- name: Render PNG for docs
  run: npx diagramkit render ./docs --format png --scale 2

- name: Render JPEG for email templates
  run: npx diagramkit render ./email --format jpeg --quality 85 --theme light
```

---

## GitLab CI

### Basic Setup

```yaml
render-diagrams:
  image: node:24
  stage: build
  cache:
    key: playwright-${CI_RUNNER_OS}
    paths:
      - ~/.cache/ms-playwright/
  before_script:
    - npm ci
    - npx playwright install --with-deps chromium
  script:
    - npx diagramkit render .
  artifacts:
    paths:
      - '**/.diagrams/'
    expire_in: 1 week
  rules:
    - changes:
        - '**/*.mermaid'
        - '**/*.mmd'
        - '**/*.mmdc'
        - '**/*.excalidraw'
        - '**/*.drawio'
        - '**/*.drawio.xml'
        - '**/*.dio'
```

### Commit Output Back to Repo

```yaml
render-and-commit:
  image: node:24
  stage: build
  before_script:
    - npm ci
    - npx playwright install --with-deps chromium
    - git config user.name "GitLab CI"
    - git config user.email "ci@gitlab.com"
    - git remote set-url origin "https://oauth2:${CI_JOB_TOKEN}@${CI_SERVER_HOST}/${CI_PROJECT_PATH}.git"
  script:
    - npx diagramkit render .
    - git add '**/.diagrams/'
    - git diff --staged --quiet || git commit -m "chore: render diagrams" && git push origin HEAD:${CI_COMMIT_REF_NAME}
  rules:
    - if: $CI_PIPELINE_SOURCE == "push"
      changes:
        - '**/*.mermaid'
        - '**/*.mmd'
        - '**/*.mmdc'
        - '**/*.excalidraw'
        - '**/*.drawio'
        - '**/*.drawio.xml'
        - '**/*.dio'
```

### GitLab Pages with Diagrams

```yaml
pages:
  image: node:24
  stage: deploy
  before_script:
    - npm ci
    - npx playwright install --with-deps chromium
  script:
    - npx diagramkit render ./docs
    - npx vitepress build docs
  artifacts:
    paths:
      - public/
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

---

## Docker

### Dockerfile for Rendering

```dockerfile
FROM node:24-bookworm

# Install Playwright Chromium and OS dependencies in one layer
RUN npx playwright install --with-deps chromium

WORKDIR /app

# Install project dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY . .

# Render diagrams
RUN npx diagramkit render .
```

### Multi-Stage Build

```dockerfile
# Stage 1: Render diagrams
FROM node:24-bookworm AS render

RUN npx playwright install --with-deps chromium

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

RUN npx diagramkit render .

# Stage 2: Build documentation site (no Playwright needed)
FROM node:24-alpine AS build

WORKDIR /app
COPY --from=render /app .
RUN npm run build

# Stage 3: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

### Important Docker Considerations

**Use Debian/Ubuntu-based images, not Alpine.** Playwright's Chromium requires glibc and will not run on musl-based Alpine images.

```dockerfile
# WRONG -- Chromium won't work
FROM node:24-alpine

# CORRECT
FROM node:24-bookworm
FROM node:24-bullseye
FROM node:24  # default is Debian-based
```

**Run as non-root** when possible:

```dockerfile
FROM node:24-bookworm

RUN npx playwright install --with-deps chromium

WORKDIR /app
COPY --chown=node:node . .

USER node
RUN npm ci
RUN npx diagramkit render .
```

**Layer caching**: Put `playwright install` before `COPY . .` so Chromium is cached across builds.

---

## Pre-Commit Hooks

### Using Husky

```bash
# Install husky
npm add -D husky
npx husky init
```

Create `.husky/pre-commit`:

```bash
#!/bin/sh

# Check if any diagram source files are staged
DIAGRAM_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(mermaid|mmd|mmdc|excalidraw|drawio|drawio\.xml|dio)$')

if [ -n "$DIAGRAM_FILES" ]; then
  echo "Rendering changed diagrams..."
  echo "$DIAGRAM_FILES" | while read file; do
    npx diagramkit render "$file"
  done

  # Stage the rendered output
  git add '**/.diagrams/'
fi
```

### Using lint-staged

```json
{
  "lint-staged": {
    "*.{mermaid,mmd,mmdc,excalidraw,drawio,dio}": ["diagramkit render", "git add **/.diagrams/"],
    "*.drawio.xml": ["diagramkit render", "git add **/.diagrams/"]
  }
}
```

### Pre-Commit Hook Considerations

- **Speed**: Rendering requires Playwright, which adds latency (~2-5s per file). For large batches, consider CI-only rendering.
- **Warmup**: The first render in a session launches Chromium. Subsequent renders reuse the browser pool.
- **Manifest**: The manifest ensures only changed files are re-rendered, keeping pre-commit fast for incremental changes.

---

## Caching Strategies

### What to Cache

| Asset               | Path                               | Size   | Cache Key                        |
| ------------------- | ---------------------------------- | ------ | -------------------------------- |
| Playwright Chromium | `~/.cache/ms-playwright/`          | ~400MB | OS + `package-lock.json` hash    |
| npm dependencies    | `node_modules/`                    | varies | `package-lock.json` hash         |
| Rendered output     | `**/.diagrams/`                    | varies | Hash of all diagram source files |
| diagramkit manifest | `.diagrams/diagrams.manifest.json` | <1KB   | Part of rendered output cache    |

### GitHub Actions Cache Configuration

```yaml
# Cache Playwright browsers
- uses: actions/cache@v4
  id: playwright-cache
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

# Cache rendered diagrams (incremental builds)
- uses: actions/cache@v4
  with:
    path: '**/.diagrams'
    key: diagrams-${{ hashFiles('**/*.mermaid', '**/*.mmd', '**/*.mmdc', '**/*.excalidraw', '**/*.drawio', '**/*.drawio.xml', '**/*.dio') }}
    restore-keys: |
      diagrams-
```

### GitLab CI Cache Configuration

```yaml
cache:
  - key: playwright-${CI_RUNNER_OS}
    paths:
      - ~/.cache/ms-playwright/
  - key: diagrams-${CI_COMMIT_REF_SLUG}
    paths:
      - '**/.diagrams/'
```

### Why Cache the Manifest

The diagramkit manifest (`diagrams.manifest.json`) stores SHA-256 hashes of source files. When the manifest is cached along with rendered output:

- Unchanged files are skipped entirely (no Playwright render needed)
- Only new or modified diagrams are re-rendered
- CI runs complete faster for incremental changes

If the manifest cache is stale or corrupted, use `--force` to rebuild:

```bash
npx diagramkit render . --force
```

---

## Common CI/CD Pitfalls

### Headless Mode

Playwright runs in headless mode by default. You do NOT need to set `DISPLAY`, install Xvfb, or configure a virtual framebuffer. If something forces headed mode, set:

```bash
export PLAYWRIGHT_BROWSERS_PATH=0
```

### Missing System Fonts

CI images often lack fonts that are present on developer machines. Diagrams may render with incorrect or fallback fonts.

```bash
# Ubuntu/Debian
apt-get install -y fonts-noto fonts-noto-cjk fonts-liberation fonts-roboto

# CentOS/RHEL
yum install -y google-noto-sans-fonts google-noto-sans-cjk-fonts
```

### Display Server Errors

```
Error: browserType.launch: Failed to launch: spawn /path/to/chromium ENOENT
```

This usually means Playwright was not installed, or it was installed for a different platform. Fix:

```bash
npx playwright install --with-deps chromium
```

### Process Killed (OOM)

Chromium uses significant memory. If the CI runner kills the process:

```yaml
# GitHub Actions -- use a larger runner
runs-on: ubuntu-latest-4-cores

# Or limit concurrency
env:
  NODE_OPTIONS: '--max-old-space-size=4096'
```

### Permission Denied in Docker

```dockerfile
# Ensure the working directory is writable
RUN mkdir -p /app/.diagrams && chown -R node:node /app
USER node
```

### Playwright Version Mismatch

Playwright's browser binaries must match the installed npm package version. When updating:

```bash
npm update playwright
npx playwright install chromium
```

In CI, invalidate the Playwright cache when `package-lock.json` changes (the cache key already handles this if set up as shown above).

---

## Complete Examples

### GitHub Actions: Render + Commit on Push

```yaml
name: Render Diagrams
on:
  push:
    branches: [main]
    paths:
      - '**/*.mermaid'
      - '**/*.mmd'
      - '**/*.mmdc'
      - '**/*.excalidraw'
      - '**/*.drawio'
      - '**/*.drawio.xml'
      - '**/*.dio'

jobs:
  render:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - uses: actions/cache@v4
        id: pw
        with:
          path: ~/.cache/ms-playwright
          key: pw-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
      - if: steps.pw.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps chromium
      - if: steps.pw.outputs.cache-hit == 'true'
        run: npx playwright install-deps chromium
      - run: npx diagramkit render .
      - run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add '**/.diagrams/'
          git diff --staged --quiet || git commit -m "chore: render diagrams" && git push
```

### Docker: Documentation Site Build

```dockerfile
FROM node:24-bookworm AS render
RUN npx playwright install --with-deps chromium
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx diagramkit render ./docs

FROM node:24-bookworm AS build
WORKDIR /app
COPY --from=render /app .
RUN npm run docs:build

FROM nginx:alpine
COPY --from=build /app/docs/.vitepress/dist /usr/share/nginx/html
```

## Composability

This skill is standalone. Invoke it with `/diagrams-ci-cd` when setting up automated diagram rendering. See `/diagrams-troubleshoot` for debugging CI/CD rendering failures.
