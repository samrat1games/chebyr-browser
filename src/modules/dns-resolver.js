class DnsResolver {
  constructor() {
    this.servers = [
      { address: '185.136.96.96', provider: 'МТС', type: 'primary', country: 'RU' },
      { address: '193.58.251.11', provider: 'ТСПУ', type: 'primary', country: 'RU' },
      { address: '77.88.8.8', provider: 'Яндекс', type: 'secondary', country: 'RU' },
      { address: '185.136.97.96', provider: 'МТС', type: 'secondary', country: 'RU' }
    ];

    this.dohServers = [
      { url: 'https://dns.mts.ru/dns-query', provider: 'МТС DoH' },
      { url: 'https://common.dot.dns.yandex.net/dns-query', provider: 'Яндекс DoH' },
      { url: 'https://dns.1d3.ru/dns-query', provider: '1Д3 DoH' }
    ];

    this.cache = new Map();
    this.cacheMaxSize = 10000;
    this.stats = { queries: 0, cached: 0, failed: 0 };
  }

  async resolve(hostname) {
    this.stats.queries++;

    // Проверка кэша
    const cached = this.cache.get(hostname);
    if (cached && Date.now() - cached.timestamp < cached.ttl * 1000) {
      this.stats.cached++;
      return cached;
    }

    // Симуляция DNS-резолва
    const result = {
      hostname,
      addresses: this.generateAddresses(hostname),
      ttl: 300,
      timestamp: Date.now(),
      server: this.servers[0].address,
      doh: false
    };

    // Кэширование
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(hostname, result);

    return result;
  }

  generateAddresses(hostname) {
    // Генерация псевдо-IP для демонстрации
    const hash = this.simpleHash(hostname);
    return [
      `${(hash >> 24) & 0xFF}.${(hash >> 16) & 0xFF}.${(hash >> 8) & 0xFF}.${hash & 0xFF}`,
      `${((hash + 1) >> 24) & 0xFF}.${((hash + 1) >> 16) & 0xFF}.${((hash + 1) >> 8) & 0xFF}.${(hash + 1) & 0xFF}`
    ];
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  getServers() {
    return {
      dns: this.servers,
      doh: this.dohServers,
      stats: this.stats
    };
  }

  setServers(servers) {
    if (Array.isArray(servers)) {
      this.servers = servers;
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = { DnsResolver };
