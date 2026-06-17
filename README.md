# Macro Tracker

A lightweight local macro tracking web app with built-in persistence and a simple Node.js backend.

## Features

- Log meals with calories, protein, carbs, fat, fiber, and sugar
- Track daily totals and compare against custom goals
- View calorie history with a 14-day chart
- See a 7-day daily average and goal status
- Persist data locally using browser storage and optional server sync
- Import/export meal and goal CSV files

## Setup

1. Open a terminal in the project root:
   ```bash
   cd ///macro-tracker
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the local server:
   ```bash
   npm start
   ```
4. Open the app in your browser:
   ```text
   http://localhost:3000
   ```

## Notes

- The app saves state to `localStorage` so refreshes keep your logged meals and goals.
- A new day resets the visible daily log at local midnight while keeping past days in history.
- If the server is running, it also saves synced state to `data.json`.
- The history tab shows the last 14 days of calories and a 7-day average for daily tracking.
