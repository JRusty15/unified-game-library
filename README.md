# Unified Game Library

A self-hosted web app to aggregate your game libraries from Steam, Epic, GOG, and more.

## Features
- 🚀 **Unified Library:** See all your games in one place.
- 🖼️ **Beautiful Covers:** Automatic cover fetching from SteamGridDB.
- 🐳 **Docker Ready:** Easy deployment via a single container.
- 🛠️ **Customizable:** Add multiple accounts and platforms.

## Setup

1. **API Keys:**
   - Get a **SteamGridDB API Key** from [SteamGridDB API](https://www.steamgriddb.com/settings/api).
   - Get a **Steam Web API Key** from [Steam API Key](https://steamcommunity.com/dev/apikey).

2. **Docker Run (Unraid / CLI):**
   ```bash
   docker run -d \
     --name unified-game-library \
     -p 3000:3000 \
     -v /mnt/user/appdata/unified-game-library:/data \
     jrust/unified-game-library:latest
   ```

3. **Usage:**
   - Open `http://your-server-ip:3000`.
   - Go to **Settings**.
   - Enter your SteamGridDB and Steam API keys.
   - Add a Steam account using your **SteamID64**.
   - Click the **Sync** icon.
   - Head back to the **Library** to see your games!

## Development

```bash
# Backend
cd backend
npm install
npx prisma migrate dev
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```
