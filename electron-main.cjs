const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

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
    show: false, // Evita flash da tela preta antes do carregamento
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'electron-preload.cjs'),
    },
  });

  // Mostra a janela suavemente quando a página estiver pronta
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    const port = process.env.PORT || 3000;
    mainWindow.loadURL(`http://localhost:${port}`).catch((err) => {
      console.error('Falha ao carregar URL dev:', err);
    });
  } else {
    // No Windows (.exe), carrega o index.html gerado
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('Falha ao carregar ficheiro HTML local:', err);
      // Fallback para URL caso arquivo local falhe
      mainWindow.loadURL(`file://${indexPath}`);
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
