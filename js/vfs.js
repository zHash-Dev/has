export class VirtualFileSystem {
  constructor() {
    this.files = {}; 
    // Estrutura interna: { "BP/manifest.json": { content: "...", type: "file", isBinary: false } }
  }

  loadStructure(files) {
    this.files = files || {};
  }

  createFile(path, content = '', isBinary = false) {
    this.files[path] = { content, type: 'file', isBinary };
  }

  createDirectory(path) {
    const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path;
    this.files[cleanPath] = { type: 'dir' };
  }

  readFile(path) {
    return this.files[path] ? this.files[path].content : null;
  }

  getFileMeta(path) {
    return this.files[path] || null;
  }

  writeFile(path, content, isBinary = false) {
    if (this.files[path]) {
      this.files[path].content = content;
      if (isBinary !== undefined) this.files[path].isBinary = isBinary;
    } else {
      this.createFile(path, content, isBinary);
    }
  }

  deleteItem(path) {
    Object.keys(this.files).forEach(key => {
      if (key === path || key.startsWith(path + '/')) {
        delete this.files[key];
      }
    });
  }

  renameItem(oldPath, newPath) {
    Object.keys(this.files).forEach(key => {
      if (key === oldPath) {
        this.files[newPath] = this.files[oldPath];
        delete this.files[oldPath];
      } else if (key.startsWith(oldPath + '/')) {
        const subPath = newPath + key.slice(oldPath.length);
        this.files[subPath] = this.files[key];
        delete this.files[key];
      }
    });
  }

  exportTree() {
    return this.files;
  }

  /**
   * Converte a lista plana de caminhos em uma árvore hierárquica estruturada.
   */
  getNestedTree() {
    const root = { name: '', type: 'dir', children: {}, path: '' };

    Object.keys(this.files).forEach(path => {
      const parts = path.split('/').filter(Boolean);
      let current = root;
      let currentPath = '';

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLast = index === parts.length - 1;
        const itemType = isLast ? this.files[path].type : 'dir';

        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            type: itemType,
            path: currentPath,
            children: {},
            isBinary: isLast ? !!this.files[path].isBinary : false
          };
        }
        current = current.children[part];
      });
    });

    return root;
  }
}