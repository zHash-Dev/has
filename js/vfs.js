export class VFS {
  constructor() {
    this.files = {};
    this.folderStates = {}; // Salva o estado de cada pasta (aberta/fechada)
  }

  loadStructure(flatFiles = {}) {
    this.files = { ...flatFiles };
  }

  getFlatStructure() {
    return { ...this.files };
  }

  writeFile(path, content, isImage = false) {
    this.files[path] = { content, isImage };
  }

  readFile(path) {
    const file = this.files[path];
    if (!file) return null;
    if (typeof file === 'string') return { content: file, isImage: false };
    return file;
  }

  delete(path) {
    delete this.files[path];
    Object.keys(this.files).forEach(fp => {
      if (fp.startsWith(path + '/')) delete this.files[fp];
    });
  }

  rename(oldPath, newPath) {
    Object.keys(this.files).forEach(fp => {
      if (fp === oldPath) {
        this.files[newPath] = this.files[oldPath];
        delete this.files[oldPath];
      } else if (fp.startsWith(oldPath + '/')) {
        const updated = fp.replace(oldPath, newPath);
        this.files[updated] = this.files[fp];
        delete this.files[fp];
      }
    });
  }

  createFolder(folderPath) {
    this.writeFile(`${folderPath}/.keep`, '', false);
  }

  toggleFolder(folderPath) {
    this.folderStates[folderPath] = !this.isFolderOpen(folderPath);
  }

  isFolderOpen(folderPath) {
    return this.folderStates[folderPath] !== false; // Padrão aberto
  }

  clear() {
    this.files = {};
    this.folderStates = {};
  }

  getTree() {
    const root = [];
    const map = {};

    Object.keys(this.files).forEach(filePath => {
      if (filePath.endsWith('.keep')) return;

      const parts = filePath.split('/');
      let currentPath = '';

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!map[currentPath]) {
          const node = {
            name: part,
            path: currentPath,
            isFolder: !isLast,
            children: isLast ? null : []
          };
          map[currentPath] = node;

          if (index === 0) {
            root.push(node);
          } else {
            const parentPath = parts.slice(0, index).join('/');
            if (map[parentPath] && map[parentPath].children) {
              map[parentPath].children.push(node);
            }
          }
        }
      });
    });

    return root;
  }
}