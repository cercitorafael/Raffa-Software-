const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

// Prevenção crítica contra tela preta no Windows causada por incompatibilidade de GPU/drivers
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

let mainWindow = null;

function createWindow() {
  const iconPath = path.join(__dirname, 'public', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'RAFFA SOFTWARE - POS & ERP Empresarial',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'electron-preload.cjs'),
    },
  });

  let hasShown = false;
  const showSafely = () => {
    if (!hasShown && mainWindow && !mainWindow.isDestroyed()) {
      hasShown = true;
      mainWindow.show();
      mainWindow.focus();
    }
  };

  // Mostra a janela quando pronta
  mainWindow.once('ready-to-show', () => {
    showSafely();
  });

  // Timeout de segurança: se ready-to-show não disparar por bug de tema/gpu, mostra a janela após 1.5s
  setTimeout(() => {
    showSafely();
  }, 1500);

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    const port = process.env.PORT || 3000;
    mainWindow.loadURL(`http://localhost:${port}`).catch((err) => {
      console.error('Falha ao carregar URL dev:', err);
    });
  } else {
    // No executável Windows (.exe), busca o index.html na raiz do app ou em dist
    const possiblePaths = [
      path.join(__dirname, 'dist', 'index.html'),
      path.join(app.getAppPath(), 'dist', 'index.html'),
      path.join(__dirname, 'index.html'),
    ];

    const targetPath = possiblePaths.find((p) => fs.existsSync(p)) || possiblePaths[0];

    mainWindow.loadFile(targetPath).catch((err) => {
      console.error('Falha ao carregar ficheiro HTML local:', err);
      mainWindow.loadURL(`file://${targetPath}`).catch((urlErr) => {
        console.error('Falha no fallback de URL file://', urlErr);
      });
    });
  }

  // Se houver falha de renderização ou erro de script
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('did-fail-load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('render-process-gone', (event, detailed) => {
    console.error('render-process-gone:', detailed.reason);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
