# SATA — Smart Adaptive Tourism Assistant

A full-stack tourism assistant with crowd forecasting, route optimization, blockchain-verified reviews, and cultural event discovery.

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, shadcn/ui, Leaflet maps, Recharts
- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB Atlas
- **APIs:** Google Gemini, PredictHQ, OSRM, Nominatim, SerpAPI
- **ML Service:** Python (scikit-learn) for crowd level prediction

## Prerequisites

- Node.js ≥ 18
- Python ≥ 3.9 (for ML service)
- npm

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd SmartTourismAssistant
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_google_gemini_api_key
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=sata_tourism_db
PREDICTHQ_API_KEY=your_predicthq_api_key
SERP_API_KEY=your_serpapi_key
```

### 3. Set up ML service (optional)

```bash
cd ml_service
pip install -r requirements.txt
cd ..
```

### 4. Run

```bash
npm run dev
```

The app starts at **http://localhost:5000**.

## Features

| Page | Description |
|------|-------------|
| **Home** | Image carousel landing page |
| **Recommendations** | Search-based place discovery with crowd levels |
| **Crowd Forecast** | ML-powered crowd level predictions with charts |
| **Route Planner** | Multi-stop route optimization with real road distances (OSRM) and crowd-aware TSP |
| **Reviews** | Blockchain-verified review system with proof-of-work mining |
| **Cultural Events** | Nearby events from PredictHQ with venue enrichment |

## Project Structure

```
├── client/src/          # React frontend
│   ├── components/      # UI components (RouteMap, HeroSection, etc.)
│   └── pages/           # Page components
├── server/              # Express backend
│   ├── algorithms/      # Route optimizer (TSP with 2-opt)
│   ├── blockchain/      # Review chain implementation
│   ├── db/              # MongoDB connection
│   └── services/        # Qdrant vector search
├── ml_service/          # Python ML crowd prediction
└── shared/              # Shared schemas
```

## Build for Production

```bash
npm run build
npm start
```
