
export class StorageEngine {
  constructor() {
    this.dbName = 'HashAddonStudioDB';
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(true);
      };
      request.onerror = (e) => reject(e);
    });
  }

  async saveProject(project) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      store.put(project);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e);
    });
  }

  async getProject(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e);
    });
  }

  async getAllProjects() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e);
    });
  }
}