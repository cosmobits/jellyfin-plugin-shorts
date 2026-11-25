# Jellyfin Shorts

A swipeable video preview feed for Jellyfin Web, with a standalone browser app built from the same React components.

Choose a library, discover random moments across your videos, and open anything you like in Jellyfin. Tap to pause, swipe up or down to change videos, and drag the timeline to seek within a preview. Video titles support text selection and copying.

## Jellyfin plugin

The first plugin release targets **Jellyfin Server 12.2** and the web client served by that server. It is a preview release; native TV and mobile clients have not been certified.

The plugin uses your current Jellyfin login. It does not ask for a password, require an administrator API key, or store a second authentication token. All library and playback requests use the current user's permissions.

Install **Plugin Pages** and **File Transformation** builds compatible with Jellyfin 12.2, then install Shorts and restart Jellyfin. See [installation instructions](docs/INSTALL.md).

Plugin repository URL:

```text
https://raw.githubusercontent.com/cosmobits/jellyfin-plugin-shorts/main/manifest.json
```

The catalog is populated automatically after a successful version-tag release. Downloadable packages are on the [releases page](https://github.com/cosmobits/jellyfin-plugin-shorts/releases).

## Preview settings

Each source-length range has its own maximum preview duration and moment length:

| Source duration | Default total preview | Default moment length |
| --- | ---: | ---: |
| Up to 30 seconds | 10 seconds | 5 seconds |
| Over 30 seconds to 3 minutes | 20 seconds | 5 seconds |
| Over 3 to 10 minutes | 30 seconds | 5 seconds |
| Over 10 to under 40 minutes | 40 seconds | 5 seconds |
| 40 minutes and above | 60 seconds | 5 seconds |

Videos shorter than their preview cap play in full as one continuous excerpt. Longer videos contribute nonoverlapping moments from different timeline regions, played in chronological order. Settings explains the resulting moment count before saving. Library selection is also in Settings.

Settings are browser-local; the plugin scopes them to the server and user. The client does not report watched or resume progress. Verify this behavior with any additional playback-reporting plugins in your installation.

## Standalone app

Requires Node.js 24 for the supported development and CI environment.

```sh
npm ci
npm run dev
```

Open the printed local URL and enter a Jellyfin address, username and password. Passwords are never saved. A tab-scoped token in `sessionStorage` keeps sign-in through refreshes. Sign-out clears the token and requests Jellyfin logout. The browser must be able to reach Jellyfin and its cross-origin configuration must permit the app.

## Build and test

The plugin targets .NET 10 and Jellyfin 12.2.0.

```sh
npm run check:privacy
npm test
npm run build:all
dotnet test tests/Jellyfin.Plugin.Shorts.Tests --configuration Release
python3 scripts/package_plugin.py
```

The standalone build is in `dist/`. The plugin frontend is embedded in `Jellyfin.Plugin.Shorts.dll`; the ZIP and checksums are generated under `artifacts/`.

## Automated releases

GitHub Actions checks public-source hygiene, tests both frontend and plugin HTTP behavior, and builds both app modes on pushes and pull requests. A tag such as `v0.1.0` must match the C# project's version `0.1.0.0`.

Pushing the tag builds the ZIP, publishes a GitHub release with SHA-256 verification, then updates the Jellyfin `manifest.json` catalog. The workflow uses GitHub's built-in token, with no personal access token or home-server credentials. It does not install anything on a private server. Initial releases are marked as previews until real-server integration is validated.

## Architecture and privacy

The feed planner, player, gestures, settings, and styles are shared between standalone and plugin builds. Host adapters provide session access, navigation, and preference storage. See [architecture](docs/implementation.md) and [privacy and release policy](docs/PRIVACY.md).

Licensed under [GPL-3.0](LICENSE). Jellyfin, Plugin Pages, and File Transformation are separate projects and retain their own licenses.
