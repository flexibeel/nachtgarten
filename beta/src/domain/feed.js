/**
 * Langsamer Feed: höchstens drei Dinge am Tag, Gespeichertes rückt am nächsten Tag nach.
 *
 * Tageswechsel: Ungelesenes bleibt, aus der Warteschlange wird bis auf drei aufgefüllt,
 * Gelesenes verschwindet. Beim allerersten Öffnen wird nur der Tag vermerkt.
 * Zeit verdienen: alles gelesen, und zwar heute.
 */

/** @typedef {import('../core/store.js').FeedState} FeedState */

export const DAILY_ITEMS = 3;

/**
 * @param {FeedState} feed
 * @param {string} today
 * @returns {FeedState}
 */
export function rollover(feed, today) {
  if (feed.day === today) return feed;
  if (feed.day === null) return { ...feed, day: today };
  const unread = feed.items.filter((i) => !i.read);
  const take = Math.max(0, DAILY_ITEMS - unread.length);
  const fresh = feed.queue.slice(0, take).map((q) => ({ title: q.title, source: q.source, tag: 'Gespeichert', read: false }));
  return { ...feed, items: [...unread, ...fresh], queue: feed.queue.slice(take), day: today };
}

/**
 * @param {FeedState} feed
 * @param {number} index
 * @param {string} today
 * @returns {FeedState}
 */
export function markRead(feed, index, today) {
  if (!feed.items[index]) return feed;
  const items = feed.items.map((it, i) => (i === index ? { ...it, read: true } : it));
  return { ...feed, items, readDay: today };
}

/**
 * „Auf morgen“: aus der heutigen Auswahl in die Warteschlange.
 * @param {FeedState} feed
 * @param {number} index
 * @returns {FeedState}
 */
export function postpone(feed, index) {
  const item = feed.items[index];
  if (!item) return feed;
  return {
    ...feed,
    items: feed.items.filter((_, i) => i !== index),
    queue: [...feed.queue, { title: item.title, source: item.source }],
  };
}

/**
 * Etwas für später speichern.
 * @param {FeedState} feed
 * @param {string} title
 * @param {string} [source]
 * @returns {FeedState}
 */
export function save(feed, title, source = 'Gespeichert') {
  const t = title.trim();
  return t ? { ...feed, queue: [...feed.queue, { title: t, source }] } : feed;
}

/** @param {FeedState} feed */
export const unreadCount = (feed) => feed.items.filter((i) => !i.read).length;

/**
 * Alles durch (und es gab etwas zu lesen).
 * @param {FeedState} feed
 */
export const isFinished = (feed) => feed.items.length > 0 && unreadCount(feed) === 0;

/**
 * Bedingung für die Zeitkonto-Gutschrift „Feed bewusst gelesen“.
 * @param {FeedState} feed
 * @param {string} today
 */
export const earnsToday = (feed, today) => isFinished(feed) && feed.readDay === today;
