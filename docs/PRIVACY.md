# Public repository and release policy

The repository contains reusable code, synthetic test fixtures and public installation instructions. It must not include personal information, private server names/addresses, credentials, local configuration, media, screenshots of personal libraries or unredacted logs.

## Authentication

The plugin uses Jellyfin Web's existing authenticated API client. It does not persist a second token or ask users for credentials. Browser-local preview preferences are scoped by server and user.

The standalone app never saves passwords. Its tab-scoped authentication token uses `sessionStorage` to survive refreshes. Sign-out clears it and requests logout from Jellyfin. Like any browser-held bearer token, it must be protected by the hosting site's script and transport security.

## Source and packages

- `.gitignore` excludes environment files, keys, certificates, databases, logs, build output and machine-local state.
- `npm run check:privacy` checks published source for common credentials, private network addresses, private hostnames, personal filesystem paths and email addresses. It prints the rule and filename, never the matched value.
- The checker supplements review; no pattern scanner can prove that arbitrary content contains no personal data.
- Release archives use an explicit file allowlist. They exclude debug symbols, source maps, build caches and local configuration. Deterministic builds map compiler source paths to a generic path.
- Synthetic fixture credentials and reserved example domains are for tests only.

## GitHub Actions

CI runs on pushes and pull requests with read-only repository permissions. Version-tag releases receive repository-content permission to upload release archives and update the plugin catalog. Third-party actions are pinned to reviewed commit hashes; Dependabot proposes updates.

Workflows use GitHub's built-in repository token. They need no personal access token, SSH key or private-server secret. Deployment means publishing the installable GitHub release and catalog, not connecting to or updating a user's Jellyfin instance.

Before reporting an issue, remove tokens, private addresses, personal filenames and user details from logs. Stream URLs may contain authentication query parameters and must be redacted.
