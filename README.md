# Work-Timer

Windows desktop floating timer app for tracking start time, expected leave time, and pre-leave notifications.

## Features

- Always-on-top floating timer window
- Manual start-time input for late punch-in adjustments
- Expected leave time calculation based on 8 hours of work plus 1 hour lunch
- Notification 10 minutes before leave time
- Tray/background mode when closing the window
- Windows installer build with Electron Builder

## Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm start
```

## Build

Create the Windows installer:

```bash
npm run dist
```

The installer is generated in `dist/`.

## Tech Stack

- Electron
- Vanilla HTML/CSS/JavaScript

## Repository

GitHub: [SONSAZANG/Work-Timer](https://github.com/SONSAZANG/Work-Timer)
