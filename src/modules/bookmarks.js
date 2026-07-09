const path = require('path');
const fs = require('fs');

class BookmarkManager {
  constructor() {
    this.dataPath = path.join(process.env.APPDATA || process.env.HOME || '', '.chebyr-browser');
    this.bookmarksFile = path.join(this.dataPath, 'bookmarks.json');
    this.bookmarks = this.getDefaultBookmarks();
    this.load();
  }

  getDefaultBookmarks() {
    return [
      // Панель быстрого доступа
      { id: '1', title: 'Госуслуги', url: 'https://www.gosuslugi.ru', icon: '🏛', folder: 'quick', order: 1 },
      { id: '2', title: 'Россия.ру', url: 'https://russia.ru', icon: '🇷🇺', folder: 'quick', order: 2 },
      { id: '3', title: 'ВКонтакте', url: 'https://vk.com', icon: '💬', folder: 'quick', order: 3 },
      { id: '4', title: 'Яндекс', url: 'https://yandex.ru', icon: '🔍', folder: 'quick', order: 4 },
      { id: '5', title: 'Mail.ru', url: 'https://mail.ru', icon: '📧', folder: 'quick', order: 5 },
      { id: '6', title: 'Сбербанк', url: 'https://www.sberbank.ru', icon: '🏦', folder: 'quick', order: 6 },

      // Новости
      { id: '10', title: 'РИА Новости', url: 'https://ria.ru', icon: '📰', folder: 'news', order: 1 },
      { id: '11', title: 'ТАСС', url: 'https://tass.ru', icon: '📰', folder: 'news', order: 2 },
      { id: '12', title: 'RT', url: 'https://russiatoday.ru', icon: '📺', folder: 'news', order: 3 },
      { id: '13', title: 'РБК', url: 'https://www.rbc.ru', icon: '💰', folder: 'news', order: 4 },
      { id: '14', title: 'Коммерсантъ', url: 'https://www.kommersant.ru', icon: '📰', folder: 'news', order: 5 },

      // Государственные сервисы
      { id: '20', title: 'ФНС', url: 'https://www.nalog.gov.ru', icon: '🏛', folder: 'gov', order: 1 },
      { id: '21', title: 'ПФР', url: 'https://www.pfrf.ru', icon: '🏛', folder: 'gov', order: 2 },
      { id: '22', title: 'МВД', url: 'https://мвд.рф', icon: '🏛', folder: 'gov', order: 3 },
      { id: '23', title: 'Минцифры', url: 'https://digital.gov.ru', icon: '🏛', folder: 'gov', order: 4 },
      { id: '24', title: 'ЕГИСЗ', url: 'https://egisz.rosminzdrav.ru', icon: '🏥', folder: 'gov', order: 5 },

      // Образование и наука
      { id: '30', title: 'Национальная электронная библиотека', url: 'https://nlru.ru', icon: '📚', folder: 'edu', order: 1 },
      { id: '31', title: 'КиберЛенинка', url: 'https://cyberleninka.ru', icon: '📚', folder: 'edu', order: 2 },
      { id: '32', title: 'Библиосфера', url: 'https://www.bibliosfera.net', icon: '📚', folder: 'edu', order: 3 },
      { id: '33', title: 'STEPIC', url: 'https://stepic.org', icon: '🎓', folder: 'edu', order: 4 },

      // Покупки
      { id: '40', title: 'Wildberries', url: 'https://www.wildberries.ru', icon: '🛒', folder: 'shop', order: 1 },
      { id: '41', title: 'Ozon', url: 'https://www.ozon.ru', icon: '📦', folder: 'shop', order: 2 },
      { id: '42', title: 'МегаМаркет', url: 'https://megamarket.ru', icon: '🛒', folder: 'shop', order: 3 },
      { id: '43', title: 'Яндекс.Маркет', url: 'https://market.yandex.ru', icon: '🛒', folder: 'shop', order: 4 },

      // Развлечения
      { id: '50', title: 'Кинопоиск', url: 'https://www.kinopoisk.ru', icon: '🎬', folder: 'fun', order: 1 },
      { id: '51', title: 'Иви', url: 'https://www.ivi.ru', icon: '📺', folder: 'fun', order: 2 },
      { id: '52', title: 'VK Музыка', url: 'https://vk.com/audio', icon: '🎵', folder: 'fun', order: 3 },
      { id: '53', title: 'Бриз', url: 'https://brizmail.ru', icon: '☁️', folder: 'fun', order: 4 }
    ];
  }

  load() {
    try {
      if (fs.existsSync(this.bookmarksFile)) {
        const data = fs.readFileSync(this.bookmarksFile, 'utf-8');
        this.bookmarks = JSON.parse(data);
      }
    } catch (error) {
      console.log('[Bookmarks] Используются закладки по умолчанию');
    }
  }

  save() {
    try {
      if (!fs.existsSync(this.dataPath)) {
        fs.mkdirSync(this.dataPath, { recursive: true });
      }
      fs.writeFileSync(this.bookmarksFile, JSON.stringify(this.bookmarks, null, 2));
    } catch (error) {
      console.error('[Bookmarks] Ошибка сохранения:', error.message);
    }
  }

  getBookmarks() {
    return this.bookmarks;
  }

  getBookmarksByFolder(folder) {
    return this.bookmarks
      .filter(b => b.folder === folder)
      .sort((a, b) => a.order - b.order);
  }

  addBookmark(bookmark) {
    const newBookmark = {
      id: Date.now().toString(),
      title: bookmark.title,
      url: bookmark.url,
      icon: bookmark.icon || '🔗',
      folder: bookmark.folder || 'custom',
      order: this.bookmarks.length + 1
    };
    this.bookmarks.push(newBookmark);
    this.save();
    return newBookmark;
  }

  removeBookmark(id) {
    const index = this.bookmarks.findIndex(b => b.id === id);
    if (index > -1) {
      this.bookmarks.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  updateBookmark(id, updates) {
    const bookmark = this.bookmarks.find(b => b.id === id);
    if (bookmark) {
      Object.assign(bookmark, updates);
      this.save();
      return bookmark;
    }
    return null;
  }
}

module.exports = { BookmarkManager };
