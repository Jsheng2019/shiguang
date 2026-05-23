# Video App

Cross-platform TV + mobile video streaming app for learning purposes.

## Tech Stack

- **Backend**: Node.js + Express + TypeScript (crawler & API server)
- **Frontend**: React Native (Expo) + ExoPlayer (mobile + TV)
- **Metadata**: TMDB API
- **Subtitles**: OpenSubtitles API

## Project Structure

```
video-app/
├── backend/          # Express API + web crawlers
│   └── src/
│       ├── spiders/  # Site-specific parsers
│       ├── routes/   # API routes
│       └── server.ts
├── app/              # React Native (mobile + TV)
│   ├── screens/
│   ├── components/
│   ├── hooks/
│   └── services/
└── docs/
```

## Getting Started

### Backend
```bash
cd backend
npm install
npm run dev
```

### App
```bash
cd app
npm install
npm start
```
