const path = require('path');
const fs = require('fs');

class SettingsManager {
  constructor() {
    this.dataPath = path.join(process.env.APPDATA || process.env.HOME || '', '.chebyr-browser');
    this.settingsFile = path.join(this.dataPath, 'settings.json');
    this.defaults = {
      // Общие
      'general.startup': 'newtab',
      'general.homepage': 'about:newtab',
      'general.searchEngine': 'yandex',
      'general.language': 'ru',

      // Приватность
      'privacy.blockAds': true,
      'privacy.blockTrackers': true,
      'privacy.blockCryptoMiners': true,
      'privacy.sendDNT': true,
      'privacy.enableGPC': true,
      'privacy.clearOnExit': false,

      // Сеть
      'network.dnsProvider': 'mts',
      'network.dohEnabled': true,
      'network.proxyEnabled': false,
      'network.proxyType': 'http',
      'network.proxyHost': '',
      'network.proxyPort': 8080,

      // Безопасность
      'security.gostEnabled': true,
      'security.tlsMinVersion': '1.2',
      'security.autoUpdateCerts': true,
      'security.checkCRL': true,

      // Интерфейс
      'ui.theme': 'dark',
      'ui.tabPosition': 'top',
      'ui.showBookmarksBar': true,
      'ui.showStatusbar': true,
      'ui.fontSize': 14,

      // Аккаунт
      'account.vkidEnabled': false,
      'account.esiaEnabled': false,
      'account.syncEnabled': false,

      // Закладки панели быстрого доступа
      'quicklinks.enabled': true,
      'quicklinks.showWeather': true,
      'quicklinks.showNews': true,
      'quicklinks.showExchangeRate': true
    };

    this.settings = { ...this.defaults };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.settingsFile)) {
        const data = fs.readFileSync(this.settingsFile, 'utf-8');
        const saved = JSON.parse(data);
        this.settings = { ...this.defaults, ...saved };
      }
    } catch (error) {
      console.log('[Settings] Используются настройки по умолчанию');
    }
  }

  save() {
    try {
      if (!fs.existsSync(this.dataPath)) {
        fs.mkdirSync(this.dataPath, { recursive: true });
      }
      fs.writeFileSync(this.settingsFile, JSON.stringify(this.settings, null, 2));
    } catch (error) {
      console.error('[Settings] Ошибка сохранения:', error.message);
    }
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    this.settings[key] = value;
    this.save();
  }

  getAll() {
    return { ...this.settings };
  }

  reset() {
    this.settings = { ...this.defaults };
    this.save();
  }

  getByCategory(category) {
    const result = {};
    for (const [key, value] of Object.entries(this.settings)) {
      if (key.startsWith(category + '.')) {
        result[key.replace(category + '.', '')] = value;
      }
    }
    return result;
  }
}

module.exports = { SettingsManager };
