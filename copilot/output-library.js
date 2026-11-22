const OutputLibrary = (() => {
  'use strict';
  const limit = 20;
  let database;

  function open() {
    if (!globalThis.indexedDB) return Promise.reject(new Error('Browser storage is unavailable.'));
    if (!database) {
      database = new Promise((resolve, reject) => {
        const request = indexedDB.open('mai-kiosk-outputs', 1);
        let failed = false;
        request.onupgradeneeded = () => {
          const store = request.result.createObjectStore('outputs', { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        };
        request.onerror = () => { failed = true; reject(request.error); };
        request.onblocked = () => { failed = true; reject(new Error('Close other kiosk tabs to enable output history.')); };
        request.onsuccess = () => {
          const db = request.result;
          if (failed) { db.close(); return; }
          db.onversionchange = () => { db.close(); database = null; };
          resolve(db);
        };
      }).catch(error => { database = null; throw error; });
    }
    return database;
  }

  async function save({ agentId, agentName, title, description = '', image, video = null, live }) {
    if (!['photo', 'lab', 'podcast'].includes(agentId) || !(image instanceof Blob) ||
        !image.type.startsWith('image/') || !image.size ||
        (video !== null && (!(video instanceof Blob) || !video.type.startsWith('video/') || !video.size))) {
      throw new Error('The generated output cannot be saved to browser history.');
    }
    const record = { id: crypto.randomUUID(), createdAt: Date.now(), agentId, agentName, title, description, image, video, live };
    const db = await open();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('outputs', 'readwrite');
      transaction.oncomplete = resolve;
      transaction.onabort = () => reject(transaction.error || new Error('Output history could not be saved.'));
      const store = transaction.objectStore('outputs');
      const request = store.put(record);
      request.onsuccess = () => {
        let count = 0;
        const cursor = store.index('createdAt').openCursor(null, 'prev');
        cursor.onsuccess = () => {
          const entry = cursor.result;
          if (!entry) return;
          if (++count > limit) entry.delete();
          entry.continue();
        };
      };
    });
    return record;
  }

  async function list() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('outputs', 'readonly');
      const request = transaction.objectStore('outputs').getAll();
      transaction.oncomplete = () => resolve(request.result.sort((a, b) => b.createdAt - a.createdAt));
      transaction.onabort = () => reject(transaction.error || new Error('Output history could not be read.'));
    });
  }

  return { save, list };
})();
