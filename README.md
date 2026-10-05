# MeteoTrack
Real-Time Meteorological Station Monitoring & Management System

## Project Purpose
MeteoTrack is a professional real-time meteorological station monitoring and management platform. It allows authorized users to monitor weather stations, view live environmental readings, detect abnormal readings, manage alerts, and more.

## Technology Stack
- **Frontend**: React, Vite, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Real-time**: Socket.IO

## Architecture Overview
This is a monorepo setup containing both the frontend client and the backend server.
- `/client`: React frontend built with Vite.
- `/server`: Node.js + Express backend with MongoDB and Socket.IO.

## Current Development Phase
**Phase 1 — Project Foundation**
- Established the monorepo structure.
- Set up React and Vite for the frontend.
- Set up Express, MongoDB architecture, and Socket.IO foundation for the backend.
- Created health check endpoint.

## Planned Future Phases
- Phase 2: Authentication and RBAC
- Phase 3: Station and Sensor Management
- Phase 4: Real-Time Monitoring and Data Ingestion
- Phase 5: Alerts, Notifications, and Analytics

## Setup Instructions

### Environment Setup
1. Duplicate `.env.example` to `.env` inside the `server/` folder and configure the variables (e.g., `MONGO_URI`, `PORT`).
2. Duplicate the env variables needed for the frontend in the `client/` folder if needed.

### Installation
Run the following from the root directory to install all dependencies for both frontend and backend:
```bash
npm install
```

### Running the Application

**Run Frontend:**
```bash
cd client
npm run dev
```

**Run Backend:**
```bash
cd server
npm run dev
```
