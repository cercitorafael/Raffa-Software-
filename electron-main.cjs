const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow = null;
let localServer = null;

function startEmbeddedServer() {
  try {
    // Em modo empacotado (.exe), inicia o servidor backend embutido se compilado
    const serverPath = path.join(__dirname, 'dist', 'server.cjs');
    if (require('fs').existsSync(serverPath)) {
      process.env.NODE_ENV = 'production';
      process.env.PORT = process.env.PORT || '3000';
      require(serverPath);
    }
  } catch (err) {
    console.error('Falha ao iniciar servidor local embutido:', err);
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, 'public', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'RAFFA SOFTWARE - POS & ERP Empresarial',
    icon: iconPath,
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'electron-preload.cjs'),
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    const port = process.env.PORT || 3000;
    mainWindow.loadURL(`http://localhost:${port}`);
  } else {
    // No .exe executável, carrega a interface do build
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  if (app.isPackaged) {
    startEmbeddedServer();
  }
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
