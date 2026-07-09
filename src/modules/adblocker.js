class AdBlocker {
  constructor() {
    this.enabled = true;
    this.blockedCount = 0;
    this.blockedDomains = new Set();
    this.rules = [];
    this.customRules = [];

    // Типичные рекламные/трекерные домены
    this.blockedDomainsList = [
      // Международные рекламные сети
      'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
      'google-analytics.com', 'googletagmanager.com',
      'facebook.com/tr', 'connect.facebook.net',
      'hotjar.com', 'heap.io', 'mixpanel.com',
      'segment.io', 'amplitude.com',
      'sentry.io', 'bugsnag.com',

      // Российские рекламные/аналитические
      'mc.yandex.ru', 'an.yandex.ru',
      'counter.yadro.ru',
      'mail.ru/stat',
      'vk.com/rtrg',
      'top-fwz1.mail.ru',
      'ads.vk.com',
      'ad.mail.ru',

      // Трекеры
      'tracker.io', 'pixel.facebook.com',
      'analytics.tiktok.com',
      'adservice.google.com',
      'pagead2.googlesyndication.com',
      'adfox.ru',
      'bannerflow.com',

      // Криптомайнеры
      'coinhive.com', 'coin-hive.com',
      'jsecoin.com', 'crypto-loot.com',
      'authedmine.com'
    ];

    // Паттерны URL для блокировки
    this.urlPatterns = [
      /\/ads?\//i,
      /\/banner/i,
      /\/popup/i,
      /\/track/i,
      /\/pixel\./i,
      /\/beacon/i,
      /\/analytics/i,
      /\/collect/i,
      /\/stat\?/i,
      /\.gif\?/i,  // трекинговые пиксели
    ];
  }

  async initialize() {
    this.rules = this.loadRules();
    console.log(`[AdBlocker] Инициализирован. Загружено ${this.rules.length} правил, ${this.blockedDomainsList.length} заблокированных доменов`);
  }

  loadRules() {
    return [
      // ABP-совместимые правила
      ...this.blockedDomainsList.map(domain => ({
        type: 'domain',
        pattern: domain,
        action: 'block'
      })),
      ...this.urlPatterns.map(pattern => ({
        type: 'url',
        pattern: pattern,
        action: 'block'
      }))
    ];
  }

  shouldBlock(url) {
    if (!this.enabled) return false;

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // Проверка по доменам
      for (const domain of this.blockedDomainsList) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          this.blockedCount++;
          this.blockedDomains.add(domain);
          return true;
        }
      }

      // Проверка по паттернам URL
      const fullUrl = url.toLowerCase();
      for (const pattern of this.urlPatterns) {
        if (pattern.test(fullUrl)) {
          this.blockedCount++;
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`[AdBlocker] ${enabled ? 'Включён' : 'Выключен'}`);
  }

  getStats() {
    return {
      blocked: this.blockedCount,
      domains: this.blockedDomains.size,
      rules: this.rules.length + this.customRules.length
    };
  }

  addCustomRule(rule) {
    this.customRules.push(rule);
    this.rules.push(rule);
  }
}

module.exports = { AdBlocker };
