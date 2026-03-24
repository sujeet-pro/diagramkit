---
name: troubleshoot
description: Diagnose and fix common diagramkit issues including Playwright setup, rendering failures, manifest corruption, and CI/CD problems
user_invocable: true
arguments:
  - name: issue
    description: 'Description of the problem or error message'
    required: true
  - name: environment
    description: 'Environment: local, docker, github-actions, gitlab-ci (default: local)'
    required: false
---

# Troubleshooting diagramkit

Diagnose and resolve common issues with diagramkit rendering, setup, and configuration. Use this skill when rendering fails, output looks wrong, or the tool is not behaving as expected.

## Quick Diagnosis

Match the error message or symptom to jump to the right section:

| Error / Symptom                                   | Section                                    |
| ------------------------------------------------- | ------------------------------------------ |
| `browserType.launch: Executable doesn't exist`    | [Playwright Not Installed](#playwright)    |
| `Cannot find module 'sharp'`                      | [Sharp Not Available](#sharp)              |
| `BrowserPool not acquired`                        | [Pool Not Acquired](#pool)                 |
| `EACCES: permission denied` on `.diagrams/`       | [Permission Errors](#permissions)          |
| `Parse error` or `Syntax error` in mermaid output | [Mermaid Syntax Errors](#mermaid-syntax)   |
| Empty boxes or missing labels in excalidraw       | [Excalidraw JSON Issues](#excalidraw-json) |
| `Invalid XML` or blank draw.io output             | [Draw.io XML Errors](#drawio-xml)          |
| Watch mode ignores file saves                     | [Watch Mode Issues](#watch-mode)           |
| Stale output / unchanged files re-rendered        | [Manifest Corruption](#manifest)           |
| Rendering fails in CI but works locally           | [CI/CD Issues](#ci-cd)                     |

---

## Playwright Not Installed {#playwright}

### Symptom

```
browserType.launch: Executable doesn't exist at /path/to/chromium
```

### Cause

Playwright's Chromium browser has not been downloaded. diagramkit uses a headless Chromium instance for all rendering.

### Fix

```bash
# Install Chromium via diagramkit
diagramkit warmup

# Or install directly via Playwright
npx playwright install chromium
```

### Verify

```bash
diagramkit render --help
```

If `warmup` itself fails, check that you have network access and sufficient disk space (~400MB for Chromium).

### Docker / CI

In containerized environments, install system dependencies first:

```bash
npx playwright install --with-deps chromium
```

The `--with-deps` flag installs required OS-level libraries (libgbm, libnss3, etc.) that Chromium needs.

---

## Sharp Not Available {#sharp}

### Symptom

```
Cannot find module 'sharp'
```

Or raster output (PNG/JPEG/WebP) fails with an error while SVG works fine.

### Cause

`sharp` is an optional peer dependency. It is only needed for raster output formats. SVG rendering does not require sharp.

### Fix

```bash
npm add sharp
```

### When You Do NOT Need sharp

- You only need SVG output (the default)
- You are using `--format svg` explicitly
- Your workflow only consumes `.svg` files

### When You Need sharp

- `--format png` for email / Confluence embeds
- `--format jpeg` for smaller raster files
- `--format webp` for modern web workflows

### Platform-Specific Issues

sharp uses native binaries. On some platforms:

```bash
# Apple Silicon (M1/M2/M3) -- ensure native build
npm rebuild sharp

# Linux musl (Alpine Docker) -- use prebuilt
npm add sharp --ignore-scripts=false

# CI with different architecture -- force platform
npm add sharp --platform=linux --arch=x64
```

---

## BrowserPool Not Acquired {#pool}

### Symptom

```
BrowserPool not acquired
```

Or:

```
Cannot read properties of null (reading 'newPage')
```

### Cause

The browser pool was not initialized before rendering. This happens when using the JS/TS API and forgetting to call `warmup()` or when the pool was disposed prematurely.

### Fix (API usage)

```typescript
import { warmup, render, dispose } from 'diagramkit'

// Always warmup before rendering
await warmup()

const result = await render(source, 'mermaid', { format: 'svg' })

// Dispose when completely done
await dispose()
```

### Fix (CLI usage)

The CLI handles pool lifecycle automatically. If you see this error from the CLI, it is a bug -- update to the latest version:

```bash
npm update diagramkit
```

### Common Mistakes

- Calling `dispose()` before all renders complete
- Running `render()` without `warmup()` in a fresh process
- Calling `dispose()` then trying to render again without another `warmup()`

---

## Permission Errors {#permissions}

### Symptom

```
EACCES: permission denied, mkdir '.diagrams'
```

Or:

```
EACCES: permission denied, open '.diagrams/diagram-light.svg'
```

### Cause

The user running diagramkit does not have write permission to the output directory or its parent.

### Fix

```bash
# Check ownership
ls -la .diagrams/

# Fix ownership (replace <user> with your username)
sudo chown -R $(whoami) .diagrams/

# Or fix permissions
chmod -R u+rw .diagrams/
```

### In Docker

```dockerfile
# Ensure the app user owns the workspace
RUN mkdir -p /app/.diagrams && chown -R node:node /app
USER node
```

### In CI/CD

```yaml
# GitHub Actions -- workspace is writable by default
# GitLab CI -- ensure the runner has write access
before_script:
  - mkdir -p .diagrams
```

### Custom Output Directory

If using `--output`, ensure the target directory is writable:

```bash
diagramkit render . --output ./rendered
# requires write permission on ./rendered and its parent
```

---

## Mermaid Syntax Errors {#mermaid-syntax}

### Symptom

diagramkit renders an error message inside the SVG instead of the diagram, or the CLI reports a parse error.

### Common Mistakes and Fixes

#### Missing diagram type declaration

```
# WRONG -- no diagram type
A --> B
B --> C

# CORRECT
graph TD
    A --> B
    B --> C
```

#### Using `graph` instead of `flowchart`

`graph` works but `flowchart` supports more features (subgraph styling, markdown labels, etc.):

```
# Recommended
flowchart TD
    A[Start] --> B[End]
```

#### Semicolons in node labels

```
# WRONG -- semicolon breaks parsing
A[Server; Port 8080]

# CORRECT -- use comma or line break
A["Server, Port 8080"]
```

#### Unescaped special characters in labels

```
# WRONG
A[Config <key=value>]

# CORRECT -- wrap in quotes
A["Config &lt;key=value&gt;"]
```

#### Missing link syntax

```
# WRONG -- no arrow style
A B

# CORRECT
A --> B
A --- B
A -.-> B
A ==> B
```

#### Duplicate node definitions with different shapes

```
# WRONG -- A defined as both rectangle and stadium
A[Service]
A([Service])

# CORRECT -- define shape once
A([Service])
```

#### Subgraph syntax errors

```
# WRONG -- missing 'end'
subgraph Backend
    A --> B

# CORRECT
subgraph Backend
    A --> B
end
```

### Debugging Mermaid

1. Paste the diagram source into [mermaid.live](https://mermaid.live) to test interactively.
2. Check the mermaid documentation for the specific diagram type syntax.
3. Simplify the diagram to the minimum reproducing case and add elements back one at a time.

---

## Excalidraw JSON Validation Failures {#excalidraw-json}

### Symptom

- Empty boxes with no labels
- Arrows floating disconnected from shapes
- Curved arrows instead of 90-degree elbows
- Shapes missing from the rendered output

### Common Mistakes and Fixes

#### Labels not appearing inside shapes

**Cause**: Using the `label` property instead of the two-element pattern.

```json
// WRONG -- label property is for the JS API, not raw JSON
{ "type": "rectangle", "label": { "text": "My Label" } }

// CORRECT -- two separate elements
// 1. Shape with boundElements
{ "id": "box", "type": "rectangle",
  "boundElements": [{ "type": "text", "id": "box-text" }] }
// 2. Text with containerId
{ "id": "box-text", "type": "text",
  "containerId": "box", "text": "My Label", "originalText": "My Label" }
```

#### Arrows curved instead of elbow-style

**Cause**: Missing one or more of the three required properties.

```json
{
  "type": "arrow",
  "roughness": 0,
  "roundness": null,
  "elbowed": true
}
```

All three are required for 90-degree corners.

#### Arrows floating in space

**Cause**: Arrow `x,y` not calculated from shape edge.

Arrow `x,y` must be at the source shape edge, not the center:

```
Bottom edge: x = shape.x + shape.width/2, y = shape.y + shape.height
Right edge:  x = shape.x + shape.width,   y = shape.y + shape.height/2
```

#### Invalid JSON

```bash
# Validate JSON syntax
node -e "JSON.parse(require('fs').readFileSync('diagram.excalidraw', 'utf8'))"
```

#### Duplicate IDs

Every element must have a unique `id`. Text elements should use the pattern `{shape-id}-text`.

See `refs/excalidraw/validation.md` for the full validation checklist.

---

## Draw.io XML Parsing Errors {#drawio-xml}

### Symptom

- Blank output or empty SVG
- `Invalid XML` error
- Shapes missing from rendered output
- Edges not connecting to shapes

### Common Mistakes and Fixes

#### Missing root cells

Every draw.io diagram requires two root cells:

```xml
<root>
  <mxCell id="0"/>
  <mxCell id="1" parent="0"/>
  <!-- Your elements here, with parent="1" -->
</root>
```

Without `id="0"` and `id="1"`, the diagram will not render.

#### Missing mxGeometry

Every vertex must have explicit geometry:

```xml
<!-- WRONG -- no geometry -->
<mxCell id="node" value="Service" style="rounded=1;" vertex="1" parent="1"/>

<!-- CORRECT -->
<mxCell id="node" value="Service" style="rounded=1;" vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
</mxCell>
```

#### Edge missing source or target

```xml
<!-- WRONG -- no source/target, edge renders as isolated line -->
<mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;" edge="1" parent="1">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>

<!-- CORRECT -->
<mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;" edge="1"
        source="node-1" target="node-2" parent="1">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

#### Source/target IDs do not match any vertex

```xml
<!-- WRONG -- "nodeA" doesn't exist in the diagram -->
<mxCell id="e1" edge="1" source="nodeA" target="node-2" parent="1"/>

<!-- CORRECT -- IDs must match actual vertex cells -->
<mxCell id="node-1" value="A" vertex="1" parent="1">...</mxCell>
<mxCell id="e1" edge="1" source="node-1" target="node-2" parent="1"/>
```

#### Style string syntax errors

Style strings are semicolon-separated key=value pairs. Common mistakes:

```
# WRONG -- space around =
fillColor = #dae8fc;

# WRONG -- missing trailing semicolon (usually harmless but inconsistent)
fillColor=#dae8fc

# WRONG -- using CSS syntax
fill-color: #dae8fc;

# CORRECT
fillColor=#dae8fc;strokeColor=#6c8ebf;rounded=1;whiteSpace=wrap;
```

#### XML not well-formed

```bash
# Validate XML syntax
xmllint --noout diagram.drawio
```

Common XML issues: unescaped `&` in labels (use `&amp;`), unescaped `<` / `>` in values (use `&lt;` / `&gt;`).

---

## Watch Mode Not Detecting Changes {#watch-mode}

### Symptom

```bash
diagramkit render . --watch
# File saved, but no re-render happens
```

### Possible Causes and Fixes

#### File is not in a recognized extension

diagramkit only watches files with recognized extensions (`.mermaid`, `.mmd`, `.mmdc`, `.excalidraw`, `.drawio`, `.drawio.xml`, `.dio`).

Check:

```bash
# Verify file extension is recognized
ls -la your-file.*
```

If you use a custom extension, configure it:

```json
// .diagramkitrc.json
{
  "extensionMap": {
    ".custom-ext": "mermaid"
  }
}
```

#### File is in an ignored directory

diagramkit skips `node_modules`, `.git`, and the output directory (`.diagrams/` by default).

#### Editor uses atomic saves

Some editors (Vim, IntelliJ) write to a temp file and rename, which may not trigger filesystem events. Try:

1. Save the file again.
2. Restart watch mode.
3. Use `--force` for a one-time re-render: `diagramkit render . --force`.

#### chokidar polling on network filesystems

On NFS, SMB, or Docker bind mounts, filesystem events may not propagate. The watch implementation uses chokidar which falls back to polling in some environments.

#### macOS FSEvents limit

On macOS with very large directories, FSEvents may drop notifications. Narrow the watch scope:

```bash
# Watch a specific subdirectory instead of the whole repo
diagramkit render ./docs --watch
```

---

## Manifest Corruption {#manifest}

### Symptom

- Files not re-rendering despite source changes
- Orphaned output files not being cleaned up
- `JSON.parse` errors mentioning `manifest.json`
- Output files exist but are stale

### Fix: Delete the Manifest

```bash
# Delete the manifest file to force full re-render
rm .diagrams/diagrams.manifest.json

# Re-render everything
diagramkit render .
```

Or use the `--force` flag to bypass the manifest for a single run:

```bash
diagramkit render . --force
```

### How the Manifest Works

The manifest (`diagrams.manifest.json`) stores:

- SHA-256 content hash of each source file
- Output format and theme used for each render
- Expected output filenames

On each run, diagramkit compares the current file hash against the manifest. If the hash matches and all expected output files exist, the file is skipped. Corruption can occur if:

- The process was killed mid-write
- The manifest was manually edited
- Output files were deleted without updating the manifest
- The diagramkit version was upgraded (format may have changed)

### Prevent Corruption

- Do not manually edit the manifest file
- Do not delete output files individually -- either delete the entire `.diagrams/` folder or use `--force`
- Ensure atomic writes are working (diagramkit writes to `.tmp` then renames)

---

## CI/CD Setup Issues {#ci-cd}

### Symptom

Rendering fails in CI/CD but works on local development machines.

### GitHub Actions

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Render diagrams
  run: npx diagramkit render .
```

The `--with-deps` flag is critical -- it installs OS-level libraries that Chromium requires.

### Docker

```dockerfile
FROM node:24

# Install Playwright system dependencies
RUN npx playwright install --with-deps chromium

WORKDIR /app
COPY . .
RUN npm ci
RUN npx diagramkit render .
```

For Alpine-based images, Playwright's Chromium may not work. Use Debian/Ubuntu-based images.

### Missing Display Server

Playwright runs Chromium in headless mode by default. If you see errors about `DISPLAY` or X11:

```bash
# Ensure headless mode (should be automatic)
export PLAYWRIGHT_BROWSERS_PATH=0
```

Playwright's headless mode does not require a display server. If you see X11 errors, something is forcing headed mode.

### Missing Fonts

Diagrams may render with incorrect fonts in CI because system fonts differ from local machines.

```bash
# Install common fonts (Ubuntu/Debian)
apt-get install -y fonts-noto fonts-noto-cjk fonts-liberation

# Or install specific fonts
apt-get install -y fonts-roboto
```

### Timeouts

CI environments are often slower than local machines. If rendering times out:

```bash
# Increase Node.js timeout
NODE_OPTIONS="--max-old-space-size=4096" npx diagramkit render .
```

### Caching Playwright Browsers

Playwright browsers are large (~400MB). Cache them between CI runs:

```yaml
# GitHub Actions
- name: Cache Playwright
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

- name: Install Playwright (if cache miss)
  run: npx playwright install --with-deps chromium
```

### Caching diagramkit Output

If you commit rendered output, cache the `.diagrams/` folder and manifest:

```yaml
- name: Cache rendered diagrams
  uses: actions/cache@v4
  with:
    path: '**/.diagrams'
    key: diagrams-${{ hashFiles('**/*.mermaid', '**/*.excalidraw', '**/*.drawio') }}
```

See the `/ci-cd` skill for complete CI/CD configuration examples.

---

## General Debugging Steps

When none of the above sections match your issue:

1. **Check diagramkit version**: `npx diagramkit --version`
2. **Check Playwright**: `npx playwright install --with-deps chromium`
3. **Try force render**: `diagramkit render <file> --force`
4. **Try a single file**: Narrow down to one problematic file
5. **Check file extension**: Ensure it matches a recognized extension
6. **Check output directory**: Ensure `.diagrams/` is writable
7. **Check the source file**: Validate syntax in the appropriate online editor
   - Mermaid: [mermaid.live](https://mermaid.live)
   - Excalidraw: [excalidraw.com](https://excalidraw.com)
   - Draw.io: [app.diagrams.net](https://app.diagrams.net)
8. **Delete manifest and retry**: `rm .diagrams/diagrams.manifest.json && diagramkit render .`
9. **Check Node.js version**: diagramkit requires Node.js 24+

## Composability

This skill is standalone. It is invoked directly by the user with `/troubleshoot` when something goes wrong. It may also be consulted by other skills when a rendering step fails.
