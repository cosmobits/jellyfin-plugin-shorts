# Shared app and plugin architecture

## Source layout

- `src/core`: pure TypeScript preview planning, random selection, duration settings and seek mapping.
- `src/ui`: shared React player, swipe presentation, timeline and settings modal.
- `src/jellyfin`: authenticated library access, playback negotiation and encoding cleanup.
- `src/host`: host interface, independent of browser login and Jellyfin Web globals.
- `src/standalone`: standalone login, tab session persistence and preference storage.
- `src/embed`: mount/unmount entry point for the shared UI.
- `src/plugin`: adapter for Jellyfin Web's current session, settings isolation and navigation lifecycle.
- `plugin/Jellyfin.Plugin.Shorts`: .NET 10 wrapper targeting Jellyfin 12.2.

The standalone and plugin builds import the same components. Neither copies the feed, player or settings implementation. The plugin ships a private React runtime and does not depend on Jellyfin Web's React version.

## Page integration

Plugin Pages registers a Shorts entry pointing at `/Shorts/Page`. The authenticated endpoint returns a small mount fragment. It loads the plugin's public JavaScript and CSS, then mounts with Jellyfin Web's existing API client. No token is embedded in the fragment or build output.

The host adapter reads the live user, token, device and server URL from Jellyfin's API client. It reuses the existing API transport and playback implementation. “Back to Jellyfin” and “Open in Jellyfin” use the host's routes. Preferences are stored per server/user; the plugin does not duplicate credential storage.

On route changes, page hiding, disconnection or unloading, the integration unmounts the UI, aborts pending requests, destroys the player and releases encoding sessions. This depends on the supported Plugin Pages/Jellyfin Web lifecycle and must be checked on the target server.

## Media timeline

Each preview contains stable, ordered source excerpts. Total duration and moment length are configurable independently in five runtime ranges. Sources shorter than their cap play continuously in full. Longer sources divide their preview budget evenly across equal timeline regions.

The preview slider maps combined time back to an excerpt and an offset inside it. Direct and HLS playback both retain the requested source position. HLS receives an explicit start position; playback waits for the initial seek before counting progress. Playback reports are not submitted, so the client does not intentionally change watched or resume state.

Metadata is loaded in bounded pages, then selected locally. History is bounded to 60 entries. The first version negotiates each excerpt on demand and does not prebuffer the next video or generate cached clips. Transcoding and network latency can produce transition gaps.

## Validation

Frontend tests cover preview boundaries, nonoverlap, per-range settings, seek mapping, session persistence/expiry, and host integration. ASP.NET Core TestServer checks authenticated page access, public asset MIME types and resource allowlisting. Release packaging includes only the plugin DLL, license and installation instructions.

Real-server verification remains necessary for Plugin Pages registration/navigation, account switching, base-path deployments, source formats, browser-specific HLS behavior, watched-state preservation with other plugins and cleanup of actual encoders.
