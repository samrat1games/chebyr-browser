const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100, height: 700, minWidth: 600, minHeight: 400,
    title: 'Чебур-Браузер',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });

  // F11
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      event.preventDefault();
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  // ПКМ
  mainWindow.webContents.on('context-menu', (event, params) => {
    mainWindow.webContents.send('ctx-menu', {
      x: params.x, y: params.y,
      linkURL: params.linkURL, linkText: params.linkText,
      selectionText: params.selectionText,
      mediaType: params.mediaType, srcURL: params.srcURL,
      hasImageContents: params.mediaType === 'image'
    });
  });
}

function setupIPC() {
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => { if (mainWindow) mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(); });
  ipcMain.handle('window:close', () => mainWindow?.close());
  ipcMain.handle('window:fullscreen', () => mainWindow?.setFullScreen(!mainWindow.isFullScreen()));

  // Загрузка списка блокировки из файла
  ipcMain.handle('get-blocked-list', () => {
    try {
      const fs = require('fs');
      const filePath = require('path').join(__dirname, '..', 'blocked.txt');
      const content = fs.readFileSync(filePath, 'utf8');
      return content.split('\n').filter(l => l && !l.startsWith('#') && l.includes('|'));
    } catch (e) {
      console.error('Ошибка чтения blocked.txt:', e.message);
      return [];
    }
  });

  // Копировать изображение в буфер
  ipcMain.handle('copy-image', async (event, url) => {
    try {
      const { net } = require('electron');
      const request = net.request(url);
      return new Promise((resolve) => {
        request.on('response', (response) => {
          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', async () => {
            try {
              const { nativeImage, clipboard } = require('electron');
              const buffer = Buffer.concat(chunks);
              const image = nativeImage.createFromBuffer(buffer);
              if (!image.isEmpty()) {
                clipboard.writeImage(image);
                resolve({ success: true });
              } else {
                resolve({ success: false, error: 'Не удалось создать изображение' });
              }
            } catch (e) {
              resolve({ success: false, error: e.message });
            }
          });
        });
        request.on('error', (e) => resolve({ success: false, error: e.message }));
        request.end();
      });
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Скачать изображение
  ipcMain.handle('save-image', async (event, url) => {
    try {
      const { dialog } = require('electron');
      const { net } = require('electron');
      const fs = require('fs');
      const path = require('path');

      // Получаем расширение из URL
      const ext = path.extname(new URL(url).pathname) || '.png';
      const defaultName = 'image' + ext;

      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Сохранить изображение',
        defaultPath: defaultName,
        filters: [
          { name: 'Изображения', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'] },
          { name: 'Все файлы', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) return { success: false, error: 'Отменено' };

      const request = net.request(url);
      return new Promise((resolve) => {
        request.on('response', (response) => {
          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => {
            try {
              const buffer = Buffer.concat(chunks);
              fs.writeFileSync(result.filePath, buffer);
              resolve({ success: true, path: result.filePath });
            } catch (e) {
              resolve({ success: false, error: e.message });
            }
          });
        });
        request.on('error', (e) => resolve({ success: false, error: e.message }));
        request.end();
      });
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

app.whenReady().then(async () => {
  createWindow();
  setupIPC();

  // SSL
  app.commandLine.appendSwitch('ignore-certificate-errors');

  // Разрешаем все permissions
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(true));
  session.defaultSession.setPermissionCheckHandler(() => true);

  // Убираем ограничения навигации
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    callback({ cancel: false });
  });

  // Разрешаем X-Frame-Options
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'x-frame-options': [],
        'content-security-policy': []
      }
    });
  });

  // Перехватываем открытие новых окон из webview — перенаправляем в вкладку
  app.on('web-contents-created', (event, contents) => {
    if (contents.getType() === 'webview') {
      contents.setWindowOpenHandler(({ url }) => {
        // Отправляем URL в главное окно для открытия в новой вкладке
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('new-tab', url);
        }
        return { action: 'deny' };
      });
    }
  });

  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
