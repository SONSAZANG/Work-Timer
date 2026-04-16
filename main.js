const { app, BrowserWindow, Menu, Notification, Tray, ipcMain, nativeImage, screen } = require('electron');
const fs = require('fs');
const path = require('path');

const APP_TITLE = 'WorkTimer';
const FLOATING_WINDOW_WIDTH = 330;
const FLOATING_WINDOW_HEIGHT = 436;
const MIN_WINDOW_HEIGHT = 360;
const LUNCH_MINUTES = 60;
const WORK_MINUTES = 8 * 60;
const ALERT_BEFORE_END_MINUTES = 10;
const WINDOW_MARGIN = 20;

let mainWindow;
let tray;
let isQuitting = false;
let hasShownTrayNotice = false;
const getStateFilePath = () => path.join(app.getPath('userData'), 'timer-state.json');
const getIconFilePath = () => path.join(__dirname, 'assets', 'worktimer-icon.png');

function getTodayKey() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
  }).format(new Date());
}

function createDefaultState(todayKey = getTodayKey()) {
  return {
    dateKey: todayKey,
    startTimeIso: null,
    alertSent: false,
    endSent: false,
    stopped: false,
  };
}

function normalizeState(rawState) {
  const todayKey = getTodayKey();
  const defaultState = createDefaultState(todayKey);

  if (!rawState || typeof rawState !== 'object') {
    return defaultState;
  }

  if (rawState.dateKey !== todayKey) {
    return defaultState;
  }

  return {
    ...defaultState,
    startTimeIso: typeof rawState.startTimeIso === 'string' ? rawState.startTimeIso : null,
    alertSent: Boolean(rawState.alertSent),
    endSent: Boolean(rawState.endSent),
    stopped: Boolean(rawState.stopped),
  };
}

function readState() {
  try {
    const stateFilePath = getStateFilePath();

    if (!fs.existsSync(stateFilePath)) {
      return normalizeState(null);
    }

    const fileContent = fs.readFileSync(stateFilePath, 'utf8');
    return normalizeState(JSON.parse(fileContent));
  } catch (error) {
    return normalizeState(null);
  }
}

function writeState(nextState) {
  const stateFilePath = getStateFilePath();
  fs.mkdirSync(path.dirname(stateFilePath), { recursive: true });
  fs.writeFileSync(stateFilePath, JSON.stringify(nextState, null, 2), 'utf8');
}

function getExpectedEndIso(startTimeIso) {
  const startDate = new Date(startTimeIso);
  return new Date(startDate.getTime() + (WORK_MINUTES + LUNCH_MINUTES) * 60 * 1000).toISOString();
}

function getDefaultWindowPosition(display) {
  const { workArea } = display;

  return {
    x: Math.round(workArea.x + workArea.width - FLOATING_WINDOW_WIDTH - WINDOW_MARGIN),
    y: Math.round(workArea.y + workArea.height - FLOATING_WINDOW_HEIGHT - WINDOW_MARGIN),
  };
}

function resizeWindowToContent(requestedHeight) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const display = screen.getDisplayMatching(mainWindow.getBounds());
  const { workArea } = display;
  const maxHeight = Math.max(MIN_WINDOW_HEIGHT, workArea.height - WINDOW_MARGIN * 2);
  const nextHeight = Math.min(
    Math.max(MIN_WINDOW_HEIGHT, Math.ceil(Number(requestedHeight) || FLOATING_WINDOW_HEIGHT)),
    maxHeight
  );
  const nextX = Math.round(workArea.x + workArea.width - FLOATING_WINDOW_WIDTH - WINDOW_MARGIN);
  const nextY = Math.round(workArea.y + workArea.height - nextHeight - WINDOW_MARGIN);
  const currentBounds = mainWindow.getBounds();

  if (
    currentBounds.width === FLOATING_WINDOW_WIDTH &&
    currentBounds.height === nextHeight &&
    currentBounds.x === nextX &&
    currentBounds.y === nextY
  ) {
    return;
  }

  mainWindow.setBounds({
    x: nextX,
    y: nextY,
    width: FLOATING_WINDOW_WIDTH,
    height: nextHeight,
  });
}

function createTrayIcon() {
  const iconFilePath = getIconFilePath();

  if (fs.existsSync(iconFilePath)) {
    return nativeImage.createFromPath(iconFilePath).resize({ width: 16, height: 16 });
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <rect x="6" y="6" width="52" height="52" rx="16" fill="#4F8FF7"/>
      <circle cx="32" cy="32" r="16" fill="#FFFFFF"/>
      <path d="M32 21v12l8 5" fill="none" stroke="#4F8FF7" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `.trim();

  return nativeImage
    .createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)
    .resize({ width: 16, height: 16 });
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }

  mainWindow.setSkipTaskbar(false);
  mainWindow.show();
  mainWindow.focus();
}

function hideMainWindowToTray() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.setSkipTaskbar(true);
  mainWindow.hide();

  if (!hasShownTrayNotice) {
    hasShownTrayNotice = true;
    showNotification('WorkTimer 백그라운드 실행 중', '작업 표시줄 우측 트레이에서 다시 열 수 있습니다.');
  }
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip(APP_TITLE);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '창 열기',
        click: () => {
          showMainWindow();
        },
      },
      {
        type: 'separator',
      },
      {
        label: '종료',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ])
  );

  tray.on('click', () => {
    showMainWindow();
  });
}

function parseStartTimeIso(manualTime) {
  if (typeof manualTime !== 'string' || manualTime.trim() === '') {
    return new Date().toISOString();
  }

  const matched = manualTime.match(/^(\d{2}):(\d{2})$/);

  if (!matched) {
    throw new Error('출근 시간은 HH:MM 형식으로 입력해 주세요.');
  }

  const hours = Number(matched[1]);
  const minutes = Number(matched[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error('출근 시간을 다시 확인해 주세요.');
  }

  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);

  if (startDate.getTime() > Date.now() + 60 * 1000) {
    throw new Error('미래 시간은 입력할 수 없습니다.');
  }

  return startDate.toISOString();
}

function sendStateToRenderer() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const state = readState();
  const expectedEndIso = state.startTimeIso ? getExpectedEndIso(state.startTimeIso) : null;

  mainWindow.webContents.send('timer-state', {
    ...state,
    expectedEndIso,
    nowIso: new Date().toISOString(),
    workMinutes: WORK_MINUTES,
    lunchMinutes: LUNCH_MINUTES,
    alertBeforeEndMinutes: ALERT_BEFORE_END_MINUTES,
  });
}

function showNotification(title, body) {
  if (!Notification.isSupported()) {
    return;
  }

  new Notification({
    title,
    body,
    silent: false,
  }).show();
}

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const windowPosition = getDefaultWindowPosition(display);
  const maxWindowHeight = Math.max(MIN_WINDOW_HEIGHT, display.workArea.height - WINDOW_MARGIN * 2);

  mainWindow = new BrowserWindow({
    x: windowPosition.x,
    y: windowPosition.y,
    width: FLOATING_WINDOW_WIDTH,
    height: FLOATING_WINDOW_HEIGHT,
    icon: getIconFilePath(),
    minWidth: FLOATING_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    maxWidth: FLOATING_WINDOW_WIDTH,
    maxHeight: maxWindowHeight,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    movable: false,
    skipTaskbar: false,
    title: APP_TITLE,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  mainWindow.on('close', (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    hideMainWindowToTray();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.once('did-finish-load', () => {
    sendStateToRenderer();
  });
}

function maybeSendNotifications() {
  const state = readState();

  if (!state.startTimeIso || state.stopped) {
    return;
  }

  const now = Date.now();
  const endAt = new Date(getExpectedEndIso(state.startTimeIso)).getTime();
  const tenMinuteAlertAt = endAt - ALERT_BEFORE_END_MINUTES * 60 * 1000;
  let shouldPersist = false;

  if (!state.alertSent && now >= tenMinuteAlertAt) {
    showNotification('퇴근 10분 전', '10분 뒤 퇴근 예정 시간입니다.');
    state.alertSent = true;
    shouldPersist = true;
  }

  if (!state.endSent && now >= endAt) {
    showNotification('퇴근 시간입니다', '타이머를 종료하고 퇴근 체크를 해주세요.');
    state.endSent = true;
    shouldPersist = true;
  }

  if (shouldPersist) {
    writeState(state);
    sendStateToRenderer();
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.local.worktimer');
  writeState(readState());
  createTray();
  createWindow();

  setInterval(() => {
    maybeSendNotifications();
    sendStateToRenderer();
  }, 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

ipcMain.handle('timer:start', (_event, payload = {}) => {
  const state = readState();
  const nextState = {
    ...state,
    dateKey: getTodayKey(),
    startTimeIso: parseStartTimeIso(payload.manualTime),
    alertSent: false,
    endSent: false,
    stopped: false,
  };

  writeState(nextState);
  sendStateToRenderer();
  return nextState;
});

ipcMain.handle('timer:stop', () => {
  const state = readState();
  const nextState = {
    ...state,
    stopped: true,
  };

  writeState(nextState);
  sendStateToRenderer();
  return nextState;
});

ipcMain.handle('timer:reset', () => {
  const nextState = createDefaultState(getTodayKey());
  writeState(nextState);
  sendStateToRenderer();
  return nextState;
});

ipcMain.handle('window:minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window:resize-to-content', (_event, payload = {}) => {
  resizeWindowToContent(payload.height);
});

ipcMain.handle('window:close', () => {
  hideMainWindowToTray();
});

app.on('window-all-closed', () => {
  if (process.platform === 'darwin' && !isQuitting) {
    return;
  }
});
