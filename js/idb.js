export class IndexedDBStorage {
  constructor(dbName = 'HasAddonStudioDB', storeName = 'projects') {
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => {
        console.error('Erro ao abrir IndexedDB:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  async saveProject(project) {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('Banco de dados não inicializado');
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(project);

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getAllProjects() {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('Banco de dados não inicializado');
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async deleteProject(id) {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('Banco de dados não inicializado');
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }
}