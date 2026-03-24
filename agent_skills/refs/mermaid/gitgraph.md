# Mermaid Git Graph Reference

Complete reference for Git graphs in Mermaid. Git graphs visualize branching strategies, merge workflows, and release histories.

---

## Directive

```
gitGraph
```

---

## Complete Example

```mermaid
gitGraph
    commit id: "init"
    commit id: "v0.1" tag: "v0.1.0"

    branch develop
    checkout develop
    commit id: "feat-setup"

    branch feature/auth
    checkout feature/auth
    commit id: "add-login"
    commit id: "add-signup"

    checkout develop
    merge feature/auth id: "merge-auth"

    branch feature/api
    checkout feature/api
    commit id: "api-routes"
    commit id: "api-tests"

    checkout develop
    merge feature/api id: "merge-api"
    commit id: "polish"

    checkout main
    merge develop id: "release" tag: "v1.0.0" type: HIGHLIGHT

    checkout develop
    commit id: "hotfix-prep"
    cherry-pick id: "release"
```

---

## Commands

### commit

Adds a commit to the current branch.

```
commit
commit id: "abc123"
commit id: "feat" msg: "Add feature" tag: "v1.0" type: HIGHLIGHT
```

| Option  | Description                           | Example           |
| ------- | ------------------------------------- | ----------------- |
| `id:`   | Commit identifier (shown on the node) | `id: "abc123"`    |
| `msg:`  | Tooltip message (hover text)          | `msg: "Fix bug"`  |
| `tag:`  | Tag label displayed above the commit  | `tag: "v2.0.0"`   |
| `type:` | Visual style of the commit node       | `type: HIGHLIGHT` |

### branch

Creates a new branch from the current branch at the current position.

```
branch develop
branch feature/login
branch release/v2
```

Branch names can contain `/`, `-`, `_`, and alphanumeric characters.

### checkout / switch

Switches the active branch. `checkout` and `switch` are interchangeable.

```
checkout develop
switch main
```

### merge

Merges the specified branch into the current branch.

```
merge feature/auth
merge develop id: "merge-commit" tag: "v1.0" type: HIGHLIGHT
```

Merge accepts the same options as `commit` (`id:`, `msg:`, `tag:`, `type:`).

### cherry-pick

Cherry-picks a commit by its `id:` into the current branch.

```
cherry-pick id: "abc123"
cherry-pick id: "abc123" tag: "cherry"
```

The target commit must have an `id:` defined. You can optionally add a `tag:` to the cherry-picked commit. Use `tag: ""` to suppress the default "cherry-pick" tag label.

---

## Commit Types

| Type        | Appearance                  | Use Case                    |
| ----------- | --------------------------- | --------------------------- |
| `NORMAL`    | Filled circle (default)     | Regular commits             |
| `REVERSE`   | Cross/X mark                | Reverts or rollbacks        |
| `HIGHLIGHT` | Highlighted/enlarged circle | Important commits, releases |

```mermaid
gitGraph
    commit id: "normal" type: NORMAL
    commit id: "highlight" type: HIGHLIGHT
    commit id: "reverse" type: REVERSE
    commit id: "back-to-normal"
```

---

## Branching Patterns

### Feature Branch Workflow

```mermaid
gitGraph
    commit id: "init"
    branch develop
    checkout develop
    commit id: "dev-1"

    branch feature/login
    checkout feature/login
    commit id: "login-ui"
    commit id: "login-api"

    checkout develop
    merge feature/login id: "merge-login"

    branch feature/dashboard
    checkout feature/dashboard
    commit id: "dash-layout"
    commit id: "dash-widgets"

    checkout develop
    merge feature/dashboard id: "merge-dash"

    checkout main
    merge develop tag: "v1.0.0"
```

### Hotfix Workflow

```mermaid
gitGraph
    commit id: "init" tag: "v1.0.0"
    commit id: "feat-1"
    commit id: "release" tag: "v1.1.0"

    branch hotfix/critical
    checkout hotfix/critical
    commit id: "fix-bug"
    commit id: "add-test"

    checkout main
    merge hotfix/critical id: "hotfix" tag: "v1.1.1" type: HIGHLIGHT
```

### Release Branch Workflow

```mermaid
gitGraph
    commit id: "init"
    branch develop
    checkout develop
    commit id: "feat-a"
    commit id: "feat-b"

    branch release/1.0
    checkout release/1.0
    commit id: "bump-version"
    commit id: "fix-typo"

    checkout main
    merge release/1.0 tag: "v1.0.0" type: HIGHLIGHT

    checkout develop
    merge release/1.0 id: "back-merge"
    commit id: "feat-c"
```

---

## Tags

Tags are labels displayed above commit nodes. They typically mark releases or important points:

```mermaid
gitGraph
    commit id: "first" tag: "v0.1.0"
    commit id: "second"
    commit id: "third" tag: "v0.2.0"
    commit id: "fourth" tag: "v1.0.0" type: HIGHLIGHT
```

---

## Configuration Options

Git graph appearance can be configured using the Mermaid `%%{init: ...}%%` directive:

```mermaid
%%{init: {
    'gitGraph': {
        'mainBranchName': 'main',
        'showCommitLabel': true,
        'showBranches': true,
        'rotateCommitLabel': false
    }
}}%%
gitGraph
    commit id: "init"
    branch develop
    commit id: "dev"
    checkout main
    merge develop
```

| Option              | Default | Description                             |
| ------------------- | ------- | --------------------------------------- |
| `mainBranchName`    | `main`  | Name of the default/first branch        |
| `showCommitLabel`   | `true`  | Show commit id labels on nodes          |
| `showBranches`      | `true`  | Show branch name labels                 |
| `rotateCommitLabel` | `true`  | Rotate commit labels vertically         |
| `mainBranchOrder`   | `0`     | Visual order of the main branch (0=top) |

---

## Branch Ordering

Control the vertical position of branches with the `order:` keyword:

```mermaid
gitGraph
    commit id: "init"
    branch develop order: 1
    branch feature order: 2
    branch hotfix order: 3

    checkout feature
    commit id: "feat"

    checkout hotfix
    commit id: "fix"

    checkout develop
    merge feature
    merge hotfix

    checkout main
    merge develop
```

Lower `order` values appear higher in the graph.

---

## Comments

Use `%%` for single-line comments:

```mermaid
gitGraph
    %% Initial setup
    commit id: "init"
    %% Start feature work
    branch feature
    commit id: "wip"
```

---

## Best Practices

1. **Always assign `id:` to commits you will reference** -- `merge` and `cherry-pick` require an `id:` to target. Give meaningful IDs to key commits.

2. **Use `tag:` for releases** -- clearly marks version boundaries in the graph.

3. **Use `type: HIGHLIGHT` for important commits** -- releases, major merges, and milestones stand out visually.

4. **Use `type: REVERSE` for reverts** -- communicates intent at a glance.

5. **Keep branch names realistic** -- use conventions like `feature/name`, `hotfix/name`, `release/version` to match real Git workflows.

6. **Checkout before committing** -- always `checkout` (or `switch`) to the intended branch before adding commits. The current branch context is implicit.

7. **Limit branches to 4-5 per diagram** -- more branches become hard to follow visually.

8. **Show the pattern, not every commit** -- use 2-3 representative commits per branch rather than replicating an actual history.

9. **Use branch ordering for clean layouts** -- `order:` prevents branch lines from crossing unnecessarily.

10. **Merge before checking out** -- merge into the current branch (the branch you are on), not from it. `checkout main` then `merge develop` means "merge develop into main".
