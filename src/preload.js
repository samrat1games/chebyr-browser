const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chebyr', {
  // Навигация
  navigate: (url) => ipcRenderer.invoke('navigate', url),

  // Браузер
  newTab: (url) => ipcRenderer.invoke('browser:newTab', url),
  closeTab: (id) => ipcRenderer.invoke('browser:closeTab', id),
  goBack: () => ipcRenderer.invoke('browser:goBack'),
  goForward: () => ipcRenderer.invoke('browser:goForward'),
  reload: () => ipcRenderer.invoke('browser:reload'),
  stop: () => ipcRenderer.invoke('browser:stop'),

  // Рекламный блокировщик
  adblocker: {
    check: (url) => ipcRenderer.invoke('adblocker:check', url),
    stats: () => ipcRenderer.invoke('adblocker:stats'),
    setEnabled: (enabled) => ipcRenderer.invoke('adblocker:setEnabled', enabled)
  },

  // GOST криптография
  gost: {
    status: () => ipcRenderer.invoke('gost:status'),
    testConnection: (url) => ipcRenderer.invoke('gost:testConnection', url)
  },

  // DNS
  dns: {
    resolve: (hostname) => ipcRenderer.invoke('dns:resolve', hostname),
    getServers: () => ipcRenderer.invoke('dns:getServers'),
    setServers: (servers) => ipcRenderer.invoke('dns:setServers', servers)
  },

  // Сертификаты
  certs: {
    status: () => ipcRenderer.invoke('certs:status'),
    update: () => ipcRenderer.invoke('certs:update')
  },

  // Закладки
  bookmarks: {
    get: () => ipcRenderer.invoke('bookmarks:get'),
    add: (bookmark) => ipcRenderer.invoke('bookmarks:add', bookmark),
    remove: (id) => ipcRenderer.invoke('bookmarks:remove', id)
  },

  // Настройки
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value)
  },

  // Управление окном
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    fullscreen: () => ipcRenderer.invoke('window:fullscreen')
  },

  // Изображения
  copyImage: (url) => ipcRenderer.invoke('copy-image', url),
  saveImage: (url) => ipcRenderer.invoke('save-image', url),

  // Блокировка
  getBlockedList: () => ipcRenderer.invoke('get-blocked-list'),

  // События
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  },
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});
