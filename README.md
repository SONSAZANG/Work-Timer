# Work-Timer
<img width="328" height="449" alt="image" src="https://github.com/user-attachments/assets/4c10e7b1-d5a0-44b6-b9e2-d3eee664e084" />

## 한국어

Windows 데스크톱에서 사용할 수 있는 플로팅 출퇴근 타이머 앱입니다.  
출근 시각을 기준으로 퇴근 예정 시각을 계산하고, 퇴근 10분 전에 알림을 보냅니다.

### 주요 기능

- 항상 위에 표시되는 플로팅 타이머 창
- 늦게 찍은 출근 시간을 보정할 수 있는 수동 입력
- `8시간 근무 + 1시간 점심` 기준 퇴근 예정 시각 계산
- 퇴근 10분 전 알림
- 창을 닫으면 종료되지 않고 트레이에서 백그라운드 실행
- `electron-builder` 기반 Windows 설치 파일 생성

### 개발

의존성 설치:

```bash
npm install
```

앱 실행:

```bash
npm start
```

### 빌드

Windows 설치 파일 생성:

```bash
npm run dist
```

설치 파일은 `dist/` 폴더에 생성됩니다.

### 기술 스택

- Electron
- Vanilla HTML / CSS / JavaScript

## English

Work-Timer is a floating desktop timer app for Windows.  
It calculates the expected leave time from the start time and sends a notification 10 minutes before leaving time.

### Features

- Always-on-top floating timer window
- Manual start-time input for late punch-in adjustments
- Expected leave time calculation based on `8 hours of work + 1 hour lunch`
- Notification 10 minutes before leave time
- Background tray mode when the window is closed
- Windows installer build with `electron-builder`

### Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm start
```

### Build

Create the Windows installer:

```bash
npm run dist
```

The installer is generated in `dist/`.

### Tech Stack

- Electron
- Vanilla HTML / CSS / JavaScript

## Repository

GitHub: [SONSAZANG/Work-Timer](https://github.com/SONSAZANG/Work-Timer)
