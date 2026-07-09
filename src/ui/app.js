class ChebyrBrowser {
  constructor() {
    this.tabs = [];
    this.activeTab = null;
    this.tabCounter = 0;
    this.blockedDomains = {};
    this.weatherRegion = 'Москва';
    this.history = {};
    this.historyIdx = {};
    this.settings = { searchEngine: 'yandex', language: 'ru', dnsServer: '185.136.96.96' };

    this.searchEngines = {
      yandex: { name: 'Яндекс', url: 'https://yandex.ru/search/?text=' },
      mail: { name: 'Mail.ru', url: 'https://go.mail.ru/search?q=' },
      rambler: { name: 'Рамблер', url: 'https://www.rambler.ru/search?query=' }
    };
    this.dnsServers = [
      { name: 'МТС', ip: '185.136.96.96' },
      { name: 'Яндекс', ip: '77.88.8.8' },
      { name: 'ТСПУ', ip: '193.58.251.11' },
      { name: 'МТС запасной', ip: '185.136.97.96' }
    ];
    this.languages = { ru: 'Русский', be: 'Беларуская' };

    this.loadBlockedList().then(() => this.init());
  }

  async loadBlockedList() {
    try {
      if (window.chebyr?.invoke) {
        const lines = await window.chebyr.invoke('get-blocked-list');
        lines.forEach(l => {
          const p = l.split('|');
          if (p.length >= 3) this.blockedDomains[p[0].trim()] = { alt: p[1].trim(), altUrl: p[2].trim(), icon: p[3]?.trim() || '🚫' };
        });
        console.log(`[Чебурнет] Загружено ${Object.keys(this.blockedDomains).length} заблокированных доменов`);
        return;
      }
    } catch {}
    // Fallback — встроенный список
    ['google.com|Яндекс|https://yandex.ru|🔍','youtube.com|Кинопоиск|https://www.kinopoisk.ru|📺','facebook.com|ВКонтакте|https://vk.com|💬','instagram.com|ВКонтакте|https://vk.com|💬','twitter.com|VK|https://vk.com/video|🎬','x.com|VK|https://vk.com/video|🎬','tiktok.com|VK|https://vk.com/video|🎬','reddit.com|Пикабу|https://pikabu.ru|📰','linkedin.com|HH.ru|https://hh.ru|💼','wikipedia.org|Большая российская энциклопедия|https://bigenc.ru|📚','github.com|Gitee|https://gitee.com|💻','gitlab.com|Gitee|https://gitee.com|💻','stackoverflow.com|Habr|https://habr.com|💻','discord.com|VK|https://vk.com|💬','telegram.org|VK|https://vk.com|💬','t.me|VK|https://vk.com|💬','web.whatsapp.com|VK|https://vk.com|💬','slack.com|VK|https://vk.com|💬','zoom.us|VK|https://vk.com|💬','paypal.com|СберПэй|https://www.sberbank.ru|💳','stripe.com|ЮKassa|https://yookassa.ru|💳','drive.google.com|Яндекс.Диск|https://disk.yandex.ru|☁️','dropbox.com|Яндекс.Диск|https://disk.yandex.ru|☁️','icloud.com|Яндекс.Диск|https://disk.yandex.ru|☁️','mega.nz|Яндекс.Диск|https://disk.yandex.ru|☁️','medium.com|Дзен|https://dzen.ru|📰','substack.com|Дзен|https://dzen.ru|📰','notion.so|Яндекс.Диск|https://disk.yandex.ru|📋','figma.com|VK|https://vk.com|🎨','canva.com|VK|https://vk.com|🎨','bing.com|Яндекс|https://yandex.ru|🔍','duckduckgo.com|Яндекс|https://yandex.ru|🔍','yahoo.com|Яндекс|https://yandex.ru|🔍','baidu.com|Яндекс|https://yandex.ru|🔍','twitch.tv|VK Play Live|https://live.vkplay.ru|🎮','vimeo.com|VK Видео|https://vk.com/video|🎬','pinterest.com|Дзен|https://dzen.ru|📰','quora.com|Habr|https://habr.com|💻','web.telegram.org|VK|https://vk.com|💬','signal.org|VK|https://vk.com|💬'
    ].forEach(l => { const p = l.split('|'); if (p.length >= 3) this.blockedDomains[p[0].trim()] = { alt: p[1].trim(), altUrl: p[2].trim(), icon: p[3]?.trim() || '🚫' }; });
  }

  async init() {
    this.setupEvents();
    this.startClock();
    this.initQuickLinks();
    this.loadWeather();
    this.loadExchange();
    this.setupContextMenu();
    this.createNewTab('about:newtab');
  }

  setupEvents() {
    document.getElementById('btn-back').onclick = () => this.goBack();
    document.getElementById('btn-forward').onclick = () => this.goForward();
    document.getElementById('btn-reload').onclick = () => this.reload();
    document.getElementById('btn-home').onclick = () => this.goHome();
    document.getElementById('url-input').onkeydown = (e) => { if (e.key === 'Enter') this.navigate(e.target.value); };
    document.getElementById('search-input').onkeydown = (e) => { if (e.key === 'Enter') this.search(e.target.value); };
    document.getElementById('search-btn').onclick = () => this.search(document.getElementById('search-input').value);
    document.getElementById('btn-new-tab').onclick = () => this.createNewTab('about:newtab');
    document.getElementById('btn-settings').onclick = () => this.toggleSettings();
    document.querySelectorAll('.settings-tab').forEach(t => {
      t.onclick = (e) => {
        document.querySelectorAll('.settings-tab').forEach(x => x.classList.remove('active'));
        e.target.classList.add('active');
        this.loadSettingsTab(e.target.dataset.tab);
      };
    });

    // Слушаем new-tab из main process (перехват webview)
    if (window.chebyr?.on) {
      window.chebyr.on('new-tab', (url) => {
        if (url && !url.startsWith('javascript:')) this.createNewTab(url);
      });
    }
  }

  setupContextMenu() {
    if (window.chebyr?.on) window.chebyr.on('ctx-menu', (d) => this.showCtxMenu(d));
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showCtxMenu({ x: e.clientX, y: e.clientY, linkURL: '', selectionText: '' });
    });
  }

  showCtxMenu(data) {
    const old = document.getElementById('ctx-menu'); if (old) old.remove();
    const menu = document.createElement('div');
    menu.id = 'ctx-menu';
    menu.style.cssText = `position:fixed;z-index:99999;left:${data.x}px;top:${data.y}px;background:#1a1a1a;border:1px solid #444;border-radius:8px;padding:6px 0;min-width:220px;box-shadow:0 10px 30px rgba(0,0,0,0.7);`;

    const items = [];

    // Если кликнули на картинку
    if (data.hasImageContents && data.srcURL) {
      items.push({ l: 'Открыть картинку', i: '🖼', fn: () => this.createNewTab(data.srcURL) });
      items.push({ l: 'Скопировать картинку', i: '📋', fn: async () => {
        if (window.chebyr?.copyImage) {
          const r = await window.chebyr.copyImage(data.srcURL);
          this.setStatus(r.success ? 'Картинка скопирована' : 'Ошибка: ' + r.error);
        }
      }});
      items.push({ l: 'Скачать картинку', i: '💾', fn: async () => {
        if (window.chebyr?.saveImage) {
          const r = await window.chebyr.saveImage(data.srcURL);
          this.setStatus(r.success ? 'Сохранено: ' + r.path : (r.error || 'Отменено'));
        }
      }});
      items.push(1);
    }

    if (data.linkURL) {
      items.push({ l: 'Открыть ссылку', i: '🔗', fn: () => this.navigate(data.linkURL) });
      items.push({ l: 'В новой вкладке', i: '➕', fn: () => this.createNewTab(data.linkURL) });
      items.push({ l: 'Копировать адрес', i: '📋', fn: () => navigator.clipboard?.writeText(data.linkURL) });
      items.push(1);
    }
    items.push({ l: 'Назад', i: '◀', fn: () => this.goBack() });
    items.push({ l: 'Вперёд', i: '▶', fn: () => this.goForward() });
    items.push({ l: 'Обновить', i: '↻', fn: () => this.reload() });
    items.push(1);
    items.push({ l: 'Новая вкладка', i: '➕', fn: () => this.createNewTab('about:newtab') });
    items.push({ l: 'Закрыть вкладку', i: '✕', fn: () => this.closeTab(this.activeTab) });
    items.push(1);
    if (data.selectionText) {
      items.push({ l: 'Копировать', i: '📋', fn: () => navigator.clipboard?.writeText(data.selectionText) });
      items.push(1);
    }
    items.push({ l: 'На главную', i: '🏠', fn: () => this.goHome() });
    items.push({ l: 'Настройки', i: '⚙', fn: () => this.toggleSettings() });

    menu.innerHTML = items.map((item, i) => {
      if (item === 1) return '<div style="height:1px;background:#333;margin:4px 10px"></div>';
      return `<div class="cm-item" data-i="${i}" style="display:flex;align-items:center;gap:10px;padding:8px 16px;font-size:13px;color:#ddd;cursor:pointer;border-radius:4px;margin:0 4px;transition:all 0.1s">${item.i} ${item.l}</div>`;
    }).join('');

    document.body.appendChild(menu);
    menu.querySelectorAll('.cm-item').forEach(el => {
      el.onmouseenter = () => el.style.background = '#e94560';
      el.onmouseleave = () => el.style.background = 'transparent';
      el.onclick = () => { items[+el.dataset.i].fn?.(); menu.remove(); };
    });

    setTimeout(() => {
      const close = (ev) => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('mousedown', close); } };
      document.addEventListener('mousedown', close);
    }, 20);
  }

  startClock() {
    const u = () => {
      const n = new Date();
      const el = document.getElementById('clock');
      if (el) el.textContent = `${n.toLocaleDateString('ru-RU',{day:'numeric',month:'short'})} ${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`;
    };
    u(); setInterval(u, 1000);
  }

  async loadWeather() {
    const el = document.getElementById('weather-content'); if (!el) return;
    el.innerHTML = '<div style="color:#999;font-size:12px">Загрузка...</div>';
    try {
      const r = await fetch(`https://wttr.in/${encodeURIComponent(this.weatherRegion)}?format=j1&lang=ru`);
      const d = await r.json();
      const c = d.current_condition[0];
      const ic = {'113':'☀️','116':'⛅','119':'☁️','122':'☁️','143':'🌫','176':'🌦','200':'⛈','263':'🌦','266':'🌧','296':'🌧','302':'🌧','305':'🌧','308':'🌧','311':'🌧','320':'🌨','323':'🌨','326':'🌨','329':'❄️','332':'❄️','335':'❄️','356':'🌧','386':'⛈','392':'⛈','395':'❄️'};
      el.innerHTML = `<div style="text-align:center;font-size:28px">${ic[c.weatherCode]||'🌤'}</div><div style="text-align:center;font-size:28px;font-weight:700">${c.temp_C}°C</div><div style="text-align:center;color:#999;font-size:12px">${c.lang_ru?.[0]?.value||c.weatherDesc[0].value}</div><div style="text-align:center;color:#777;font-size:11px;margin-top:4px">Ощущ. ${c.FeelsLikeC}° · Ветер ${c.windspeedKmph} км/ч</div>`;
    } catch { el.innerHTML = '<div style="color:#999;font-size:12px">Не удалось</div>'; }
  }

  changeRegion(city) { this.weatherRegion = city; this.loadWeather(); }

  async loadExchange() {
    const el = document.getElementById('exchange-content'); if (!el) return;
    try {
      const r = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
      const d = await r.json();
      el.innerHTML = `<div style="display:flex;justify-content:space-between;padding:3px 0;color:#999;font-size:12px"><span>🇺🇸 USD</span><span>${d.Valute.USD.Value.toFixed(2)} ₽</span></div><div style="display:flex;justify-content:space-between;padding:3px 0;color:#999;font-size:12px"><span>🇪🇺 EUR</span><span>${d.Valute.EUR.Value.toFixed(2)} ₽</span></div><div style="display:flex;justify-content:space-between;padding:3px 0;color:#999;font-size:12px"><span>🇨🇳 CNY</span><span>${d.Valute.CNY.Value.toFixed(2)} ₽</span></div>`;
    } catch { el.innerHTML = '<div style="color:#999;font-size:12px">Не удалось</div>'; }
  }

  // === Вкладки ===
  createNewTab(url = 'about:newtab') {
    const id = ++this.tabCounter;
    this.history[id] = [];
    this.historyIdx[id] = -1;
    const tab = { id, url, title: url === 'about:newtab' ? 'Новая вкладка' : this.getDomain(url), isActive: true, favicon: url === 'about:newtab' ? '⚡' : this.getFav(url) };
    this.tabs.forEach(t => t.isActive = false);
    this.tabs.push(tab);
    this.activeTab = id;
    this.renderTabs();
    this.loadContent(tab);
  }

  closeTab(tabId) {
    if (this.tabs.length <= 1) return;
    const i = this.tabs.findIndex(t => t.id === tabId);
    if (i > -1) {
      this.tabs.splice(i, 1);
      if (this.activeTab === tabId) {
        const ni = Math.min(i, this.tabs.length - 1);
        this.tabs[ni].isActive = true;
        this.activeTab = this.tabs[ni].id;
        this.loadContent(this.tabs[ni]);
      }
      this.renderTabs();
    }
  }

  switchTab(tabId) {
    this.tabs.forEach(t => t.isActive = (t.id === tabId));
    this.activeTab = tabId;
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) { this.loadContent(tab); this.renderTabs(); }
  }

  renderTabs() {
    const c = document.getElementById('tabs-container'); if (!c) return;
    c.innerHTML = this.tabs.map(t => `<div class="tab ${t.isActive?'active':''}" data-id="${t.id}"><span class="tab-favicon">${t.favicon||'🌐'}</span><span class="tab-title">${t.title}</span><button class="tab-close" data-close="${t.id}">×</button></div>`).join('');
    c.querySelectorAll('.tab').forEach(el => el.onclick = (e) => { if (!e.target.classList.contains('tab-close')) this.switchTab(+el.dataset.id); });
    c.querySelectorAll('.tab-close').forEach(b => b.onclick = (e) => { e.stopPropagation(); this.closeTab(+b.dataset.close); });
  }

  loadContent(tab) {
    ['newtab-page','browse-page','settings-page','blocked-page'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    this.stopAnthem();

    if (tab.url === 'about:newtab') {
      document.getElementById('newtab-page').style.display = 'block';
      document.getElementById('url-input').value = '';
    } else if (tab.url === 'about:settings') {
      document.getElementById('settings-page').style.display = 'block';
      this.loadSettingsTab('general');
    } else if (tab.url.startsWith('about:blocked:')) {
      document.getElementById('blocked-page').style.display = 'block';
      this.playAnthem();
    } else {
      const d = this.getDomain(tab.url);
      if (this.isBlocked(d)) { this.showBlocked(d, tab); return; }
      document.getElementById('browse-page').style.display = 'block';
      this.loadUrl(tab.url);
    }
  }

  loadUrl(url) {
    const wv = document.getElementById('webview'); if (!wv) return;
    const full = url.startsWith('http') ? url : `https://${url}`;
    this.setStatus(`Загрузка ${this.getDomain(full)}...`);

    // История
    const h = this.history[this.activeTab];
    const idx = this.historyIdx[this.activeTab];
    h.splice(idx + 1);
    h.push({ url: full, title: this.getDomain(full) });
    this.historyIdx[this.activeTab] = h.length - 1;

    // Навигация webview
    wv.src = full;

    // Обновляем URL и вкладку
    const tab = this.tabs.find(t => t.id === this.activeTab);
    if (tab) { tab.url = full; tab.title = this.getDomain(full); tab.favicon = this.getFav(full); this.renderTabs(); }
    document.getElementById('url-input').value = full;
    document.getElementById('url-security').textContent = full.startsWith('https') ? '🔒' : '⚠️';

    // События webview
    wv.addEventListener('did-navigate', (e) => {
      if (tab) { tab.url = e.url; tab.title = this.getDomain(e.url); tab.favicon = this.getFav(e.url); this.renderTabs(); }
      document.getElementById('url-input').value = e.url;
    });

    wv.addEventListener('did-navigate-in-page', (e) => {
      if (tab) { tab.url = e.url; tab.title = this.getDomain(e.url); this.renderTabs(); }
      document.getElementById('url-input').value = e.url;
    });

    // Ссылки открываются в новых вкладках
    wv.addEventListener('new-window', (e) => {
      e.preventDefault();
      if (e.url && !e.url.startsWith('javascript:')) this.createNewTab(e.url);
    });

    wv.addEventListener('did-finish-load', () => {
      if (tab) {
        try { const t = wv.getTitle(); if (t) tab.title = t; } catch {}
        tab.favicon = this.getFav(full);
        this.renderTabs();
      }
      this.setStatus('Готово');
    });

    wv.addEventListener('did-fail-load', (e) => {
      if (e.errorCode !== -3) this.setStatus('Ошибка: ' + (e.errorDescription || e.errorCode));
    });
  }

  navigate(url) {
    if (!url) return;
    if (url.match(/^https?:\/\//i) || url.match(/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/)) {
      const tab = this.tabs.find(t => t.id === this.activeTab);
      if (tab) { tab.url = url; tab.title = this.getDomain(url); tab.favicon = this.getFav(url); this.loadContent(tab); this.renderTabs(); }
    } else this.search(url);
  }

  search(q) { this.navigate((this.searchEngines[this.settings.searchEngine] || this.searchEngines.yandex).url + encodeURIComponent(q)); }

  goBack() {
    const idx = this.historyIdx[this.activeTab];
    const h = this.history[this.activeTab];
    if (idx > 0) {
      this.historyIdx[this.activeTab] = idx - 1;
      const entry = h[idx - 1];
      const tab = this.tabs.find(t => t.id === this.activeTab);
      if (tab) { tab.url = entry.url; tab.title = entry.title; this.loadContent(tab); this.renderTabs(); }
    }
  }

  goForward() {
    const idx = this.historyIdx[this.activeTab];
    const h = this.history[this.activeTab];
    if (idx < h.length - 1) {
      this.historyIdx[this.activeTab] = idx + 1;
      const entry = h[idx + 1];
      const tab = this.tabs.find(t => t.id === this.activeTab);
      if (tab) { tab.url = entry.url; tab.title = entry.title; this.loadContent(tab); this.renderTabs(); }
    }
  }

  reload() {
    const wv = document.getElementById('webview');
    if (wv) wv.reload();
  }

  goHome() {
    const tab = this.tabs.find(t => t.id === this.activeTab);
    if (tab) { tab.url = 'about:newtab'; tab.title = 'Новая вкладка'; tab.favicon = '⚡'; this.loadContent(tab); this.renderTabs(); }
  }

  // === Блокировка ===
  isBlocked(d) { return Object.keys(this.blockedDomains).some(b => d === b || d.endsWith('.' + b)); }
  getAlt(d) { for (const [b, v] of Object.entries(this.blockedDomains)) { if (d === b || d.endsWith('.' + b)) return v; } return null; }

  showBlocked(domain, tab) {
    const alt = this.getAlt(domain);
    document.getElementById('blocked-domain').textContent = domain;
    document.getElementById('blocked-alternatives').innerHTML = alt
      ? `<button class="blocked-alt-btn" onclick="window.browser.navigate('${alt.altUrl}')">${alt.icon} ${alt.alt}</button>`
      : `<button class="blocked-alt-btn" onclick="window.browser.navigate('https://yandex.ru')">🔍 Яндекс</button>`;
    tab.url = `about:blocked:${domain}`; tab.title = `🚫 ${domain}`; tab.favicon = '🚫';
    document.getElementById('blocked-page').style.display = 'block';
    document.getElementById('url-input').value = domain;
    this.setStatus('Заблокировано');
    this.playAnthem();
    this.renderTabs();
  }

  playAnthem() { const a = document.getElementById('anthem-audio'); if (a) { a.volume = 0.3; a.play().catch(() => this.genSound()); } else this.genSound(); }

  genSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [261.63,329.63,392,523.25,392,329.63,261.63].forEach((f,i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.35);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (i+1) * 0.35);
        o.start(ctx.currentTime + i * 0.35); o.stop(ctx.currentTime + (i+1) * 0.35);
      });
    } catch {}
  }

  stopAnthem() { const a = document.getElementById('anthem-audio'); if (a) { a.pause(); a.currentTime = 0; } }

  initQuickLinks() {
    const c = document.getElementById('quick-links'); if (!c) return;
    [{ icon: '🔍', title: 'Яндекс', url: 'https://yandex.ru' },{ icon: '💬', title: 'ВКонтакте', url: 'https://vk.com' },{ icon: '🏛', title: 'Госуслуги', url: 'https://www.gosuslugi.ru' },{ icon: '📧', title: 'Mail.ru', url: 'https://mail.ru' },{ icon: '🛒', title: 'Wildberries', url: 'https://www.wildberries.ru' },{ icon: '📦', title: 'Ozon', url: 'https://www.ozon.ru' }]
    .forEach(l => { const a = document.createElement('a'); a.className = 'quick-link'; a.href = l.url; a.innerHTML = `<span class="quick-link-icon">${l.icon}</span><span class="quick-link-title">${l.title}</span>`; a.onclick = (e) => { e.preventDefault(); this.navigate(l.url); }; c.appendChild(a); });
  }

  toggleSettings() {
    const tab = this.tabs.find(t => t.id === this.activeTab);
    if (tab) {
      if (tab.url === 'about:settings') this.goHome();
      else { tab.url = 'about:settings'; tab.title = 'Настройки'; tab.favicon = '⚙'; this.loadContent(tab); this.renderTabs(); }
    }
  }

  loadSettingsTab(name) {
    const c = document.getElementById('settings-content'); if (!c) return;
    const mk = (o, s) => Object.entries(o).map(([k,v]) => `<option value="${k}" ${s===k?'selected':''}>${v}</option>`).join('');
    c.innerHTML = ({
      general: `<div class="settings-group"><div class="settings-group-title">Язык</div><div class="settings-item"><div><div class="settings-item-label">Интерфейс</div></div><select class="settings-select" onchange="window.browser.setSetting('language',this.value)">${mk(this.languages,this.settings.language)}</select></div></div>`,
      search: `<div class="settings-group"><div class="settings-group-title">Поиск</div><div class="settings-item"><div><div class="settings-item-label">По умолчанию</div></div><select class="settings-select" onchange="window.browser.setSetting('searchEngine',this.value)">${mk(this.searchEngines,this.settings.searchEngine)}</select></div></div>`,
      privacy: `<div class="settings-group"><div class="settings-group-title">Блокировка</div><div class="settings-item"><div><div class="settings-item-label">Реклама</div></div><label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label></div><div class="settings-item"><div><div class="settings-item-label">Трекеры</div></div><label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label></div><div class="settings-item"><div><div class="settings-item-label">Иностранные</div><div class="settings-item-desc">${Object.keys(this.blockedDomains).length} доменов</div></div><label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label></div></div>`,
      network: `<div class="settings-group"><div class="settings-group-title">DNS</div><div class="settings-item"><div><div class="settings-item-label">Сервер</div></div><select class="settings-select" onchange="window.browser.setSetting('dnsServer',this.value)">${this.dnsServers.map(s=>`<option value="${s.ip}" ${this.settings.dnsServer===s.ip?'selected':''}>${s.name} (${s.ip})</option>`).join('')}</select></div></div>`,
      about: `<div class="settings-group"><div class="settings-group-title">О браузере</div><div class="settings-item"><div><div class="settings-item-label">Версия</div><div class="settings-item-desc">Чебур-Браузер 1.0.0</div></div></div><div class="settings-item"><div><div class="settings-item-label">Заблокировано</div><div class="settings-item-desc">${Object.keys(this.blockedDomains).length} доменов</div></div></div></div>`
    })[name] || '';
  }

  setSetting(k, v) { this.settings[k] = v; this.setStatus(`${k} = ${v}`); }

  getDomain(u) { try { return new URL(u.startsWith('http') ? u : `https://${u}`).hostname; } catch { return u; } }
  getFav(u) {
    const d = this.getDomain(u);
    const m = {'gosuslugi.ru':'🏛','vk.com':'💬','yandex.ru':'🔍','mail.ru':'📧','sberbank.ru':'🏦','wildberries.ru':'🛒','ozon.ru':'📦','kinopoisk.ru':'📺','ria.ru':'📰','habr.com':'💻','dzen.ru':'📰'};
    for (const [k,v] of Object.entries(m)) if (d.includes(k)) return v;
    return '🌐';
  }
  setStatus(t) { const el = document.getElementById('status-text'); if (el) el.textContent = t; }
}

document.addEventListener('DOMContentLoaded', () => { window.browser = new ChebyrBrowser(); });
