# Couchside

![Couchside](build/logo-lockup.svg)

Couchside is an all-in-one media player for Plex, Silo, MediaHub/Emby, and Xtream IPTV, for Windows.

## Install

Download [Couchside-Setup-1.0.0.exe](https://github.com/kingdrowsy-exe/Couchside/releases/download/v1.0.0/Couchside-Setup-1.0.0.exe) from [Releases](https://github.com/kingdrowsy-exe/Couchside/releases). The installer is unsigned, so Windows SmartScreen may say it is unrecognized.

## Features

- Live TV from an Xtream Codes provider
- On Demand from Plex, Silo, and Emby (MediaHub)
- Search across those libraries
- Optional TMDB shelves and a Trakt watchlist
- One player that keeps playing while you change pages

## Build from source

Node.js 22.

```bash
npm install
npm run install:all
npm test
npm start
npm run dist
```

## More

[Changelog](CHANGELOG.md) · [Security](SECURITY.md)

The installer bundles FFmpeg from [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) (GPL-3.0-or-later) and runs it only to convert audio the player cannot decode.
