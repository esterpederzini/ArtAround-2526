# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

---

## Project-specific setup

This repository contains two separate components:

1. **Navigator** – the React/Vite single-page app located under `src/`.
   - Run `npm install` at the project root.
   - Start with `npm run dev` (default port: `5173`).
   - It fetches configuration and visit data from the backend API at `/db` and `/data`.

2. **Backend API** – an Express server under `backend/`.
   - Install dependencies and start the server:
     ```bash
     cd backend
     npm install        # installs express, cors, mongoose
     npm run dev        # or `npm start`, listens on port 8000
     ```
   - Endpoints:
     - `GET /db/search?type=visits` – returns visit documents.
     - `GET /data/config.json` – returns UI configuration.
     - `GET /db/create` – seed the MongoDB database (requires credentials).
   - The front‑end uses the Vite proxy (configured in `vite.config.js`) to forward these requests during development.

> **Note:** there is also a legacy `src/marketplace/Prova3` Express app; it is no longer used by the navigator and can be ignored unless you need the marketplace features.
