const { contextBridge } = require('electron');

// Expõe APIs seguras para a interface React se necessário
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
});
