const startTime = document.getElementById('startTime');
const endTime = document.getElementById('endTime');
const remainingTime = document.getElementById('remainingTime');
const statusText = document.getElementById('statusText');
const manualStartTimeInput = document.getElementById('manualStartTime');
const setNowButton = document.getElementById('setNowButton');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const resetButton = document.getElementById('resetButton');
const minimizeButton = document.getElementById('minimizeButton');
const closeButton = document.getElementById('closeButton');

const TIME_ZONE = 'Asia/Seoul';
let manualTimeDirty = false;
let lastRequestedHeight = 0;

function formatTime(isoString) {
  if (!isoString) {
    return '아직 시작 안 함';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoString));
}

function formatTimeInputValue(dateLike) {
  const date = new Date(dateLike);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

function formatDuration(milliseconds) {
  const absMilliseconds = Math.abs(milliseconds);
  const totalSeconds = Math.floor(absMilliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const prefix = milliseconds < 0 ? '-' : '';

  return `${prefix}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function syncWindowSize() {
  const shell = document.querySelector('.window-shell');

  if (!shell) {
    return;
  }

  const bodyStyles = window.getComputedStyle(document.body);
  const bodyPaddingY =
    parseFloat(bodyStyles.paddingTop || '0') + parseFloat(bodyStyles.paddingBottom || '0');
  const shellHeight = Math.ceil(shell.getBoundingClientRect().height);
  const requiredHeight = shellHeight + Math.ceil(bodyPaddingY) + 2;

  if (Math.abs(requiredHeight - lastRequestedHeight) < 2) {
    return;
  }

  lastRequestedHeight = requiredHeight;
  window.workTimer.resizeToContent(requiredHeight);
}

function renderState(state) {
  const isRunning = Boolean(state.startTimeIso) && !state.stopped;
  const isLocked = Boolean(state.startTimeIso) || state.stopped;
  const endAt = state.expectedEndIso ? new Date(state.expectedEndIso).getTime() : null;
  const now = new Date(state.nowIso).getTime();
  const diff = endAt ? endAt - now : 9 * 60 * 60 * 1000;

  startTime.textContent = state.startTimeIso ? formatTime(state.startTimeIso) : '00:00:00';
  endTime.textContent = state.expectedEndIso ? formatTime(state.expectedEndIso) : '00:00:00';
  remainingTime.textContent = formatDuration(diff);

  if (!state.startTimeIso) {
    statusText.textContent = '출근 도장을 찍고 시작하세요.';
  } else if (state.stopped) {
    statusText.textContent = '오늘 타이머를 종료했습니다.';
  } else if (diff > 10 * 60 * 1000) {
    statusText.textContent = '퇴근 예정 시간을 향해 계산 중입니다.';
  } else if (diff > 0) {
    statusText.textContent = '곧 퇴근 시간입니다.';
  } else {
    statusText.textContent = '퇴근 시간입니다. 종료 버튼을 눌러 마무리하세요.';
  }

  if (state.startTimeIso) {
    manualStartTimeInput.value = formatTimeInputValue(state.startTimeIso);
    manualTimeDirty = false;
  } else if (!manualTimeDirty) {
    manualStartTimeInput.value = formatTimeInputValue(state.nowIso);
  }

  manualStartTimeInput.disabled = isLocked;
  setNowButton.disabled = isLocked;
  startButton.disabled = isRunning || state.stopped;
  stopButton.disabled = !isRunning;
  window.requestAnimationFrame(syncWindowSize);
}

window.addEventListener('load', () => {
  window.requestAnimationFrame(syncWindowSize);
});

manualStartTimeInput.addEventListener('input', () => {
  manualTimeDirty = true;
});

setNowButton.addEventListener('click', () => {
  manualStartTimeInput.value = formatTimeInputValue(new Date());
  manualTimeDirty = true;
});

startButton.addEventListener('click', async () => {
  try {
    await window.workTimer.start(manualStartTimeInput.value);
    manualTimeDirty = false;
  } catch (error) {
    window.alert(error.message);
  }
});

stopButton.addEventListener('click', async () => {
  await window.workTimer.stop();
});

resetButton.addEventListener('click', async () => {
  await window.workTimer.reset();
  manualTimeDirty = false;
});

minimizeButton.addEventListener('click', async () => {
  await window.workTimer.minimize();
});

closeButton.addEventListener('click', async () => {
  await window.workTimer.close();
});

window.workTimer.onTimerState(renderState);
