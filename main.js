const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');

// 1. Iniciar automaticamente o servidor Express / Socket.io do GSI com OpenDota
require('./server');

let mainWindow = null;
let isEditMode = false;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;

  mainWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width: width || 1920,
    height: height || 1080,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: false,
    focusable: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  mainWindow.setVisibleOnAllWorkspaces(true);

  // MODO JOGO padrão: cliques atravessam
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  console.log('🖥️ [Electron] Janela de overlay criada.');
  console.log('🎮 [Electron] Modo inicial: MODO JOGO (Cliques atravessando).');
  console.log('⌨️  [Electron] Atalhos ativos:');
  console.log('    - Ctrl+Shift+E : Alternar Modo Jogo / Modo Edicao');
  console.log('    - Ctrl+Shift+R : Registrar Morte do Roshan (Dispara contagem 8m/11m e voz)');
  console.log('    - Ctrl+Shift+Q : Fechar overlay');
}

function toggleMode() {
  if (!mainWindow) return;

  isEditMode = !isEditMode;

  if (isEditMode) {
    mainWindow.setIgnoreMouseEvents(false);
    mainWindow.focus();
    mainWindow.webContents.send('mode:changed', {
      mode: 'edit',
      message: 'Modo Edição Ativo: arraste, redimensione ou retire widgets.'
    });
    console.log('🔧 [Electron] Alternado para: MODO EDIÇÃO');
  } else {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
    mainWindow.webContents.send('mode:changed', {
      mode: 'game',
      message: 'Modo Jogo Ativo: cliques atravessando diretamente para o Dota 2.'
    });
    console.log('🎮 [Electron] Alternado para: MODO JOGO');
  }
}

app.whenReady().then(() => {
  createWindow();

  // Atalho 1: Alternar Modo Edição / Jogo (Ctrl+Shift+E)
  globalShortcut.register('CommandOrControl+Shift+E', () => {
    toggleMode();
  });

  // Atalho 2: Registrar Morte do Roshan (Ctrl+Shift+R)
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    if (mainWindow) {
      mainWindow.webContents.send('roshan:trigger-death');
      console.log('👹 [Atalho] Ctrl+Shift+R acionado: Morte do Roshan registrada!');
    }
  });

  // Atalho 3: Encerrar (Ctrl+Shift+Q)
  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    app.quit();
  });

  ipcMain.on('mode:toggle', () => {
    toggleMode();
  });

  ipcMain.on('app:close', () => {
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
