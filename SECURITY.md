# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| Latest  | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Use [GitHub Security Advisories](https://github.com/sujeet-pro/diagramkit/security/advisories/new) to privately report the vulnerability
3. Include steps to reproduce, impact assessment, and suggested fix if possible

We aim to respond within 48 hours and provide a fix within 7 days for critical issues.

## Scope

Security issues in the following areas are in scope:

- Path traversal in file operations
- Code injection via diagram source files
- Browser sandbox escapes in Playwright rendering
- Supply chain issues in published npm package
- Sensitive data exposure
