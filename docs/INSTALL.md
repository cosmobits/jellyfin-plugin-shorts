# Install Jellyfin Shorts

## Requirements

- Jellyfin Server 12.2 with its server-hosted Jellyfin Web client.
- File Transformation compatible with Jellyfin 12.2.
- Plugin Pages compatible with Jellyfin 12.2.

Plugin Pages and File Transformation are available from their maintainer's catalog:

```text
https://www.iamparadox.dev/jellyfin/plugins/manifest.json
```

Use the builds targeting `12.2.0.0`. This release uses Plugin Pages' registration interface and its user-facing navigation page. Other clients, separately hosted web builds, custom themes, and other server versions need their own compatibility testing.

## Install through the catalog

1. In Jellyfin Dashboard, open Plugins and add the dependency repository above.
2. Install compatible File Transformation and Plugin Pages builds.
3. Add the Shorts repository:

   ```text
   https://raw.githubusercontent.com/cosmobits/jellyfin-plugin-shorts/main/manifest.json
   ```

4. Install Shorts from the catalog and restart Jellyfin.
5. Refresh Jellyfin Web and select Shorts from the navigation menu's plugin entries.
6. Open Settings in Shorts to choose a library and preview preferences.

The Shorts catalog is empty until the first release workflow publishes its ZIP successfully. Releases are previews pending real-server testing.

## Manual install

Download the ZIP and its `.sha256` file from the GitHub release. Verify the SHA-256 checksum, then extract `Jellyfin.Plugin.Shorts.dll` into a dedicated `Shorts` folder under your Jellyfin plugin directory. Keep the required dependency plugins installed. Restart Jellyfin.

- A Docker installation commonly exposes its configuration directory at `/config`; its plugin directory is under that configuration directory.
- For a native installation, use the plugin directory reported by your Jellyfin installation. Avoid mixing assemblies from different Jellyfin versions.

Do not put the ZIP itself into the plugin directory. The release DLL includes all of Shorts' frontend assets; no Node.js process or separate web server is required.

## Troubleshooting

- **Missing menu entry:** confirm all three plugins loaded, run the “Register Shorts page” scheduled task, refresh Jellyfin Web, and inspect the server log for the registration message.
- **Page does not load:** verify that Plugin Pages and File Transformation target your server's ABI. Browser caches may require a refresh after upgrades.
- **Playback cannot start:** check the user's playback/transcoding permissions and the server's supported encoding configuration. Test the original item through normal Jellyfin playback.
- **Repeated moments or incorrect seek position:** report the source format, playback method and browser version. Do not attach access tokens, stream URLs containing credentials, private server addresses, or unredacted logs.
- **Leaving Shorts:** “Back to Jellyfin” returns to the home page; it does not sign you out of Jellyfin.

## Upgrade and removal

Use the plugin catalog to update after a compatible release is available. Restart Jellyfin after installation or removal. If you remove Shorts, its existing Plugin Pages entry can also be removed from that plugin's configuration if it remains after restart. Browser-local preview preferences may remain until site data is cleared.

## Current validation scope

Automated tests cover preview planning, seek mapping, session handling, the plugin host adapter, authenticated page access, and bundled asset serving. A test host checks the built HTTP endpoints. The complete Plugin Pages menu flow and real media playback still require testing in an actual Jellyfin 12.2 installation.
