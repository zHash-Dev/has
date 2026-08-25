import { IndexedDBStorage } from './idb.js';
import { VFS } from './vfs.js';
import { MonacoEditorManager } from './editor.js';
import { openToolsModal } from './tools.js';
import { exportMcAddon } from './exporter.js';

class App {
  constructor() {
    this.storage = new IndexedDBStorage();
    this.vfs = new VFS();
    this.editorManager = new MonacoEditorManager();
    this.currentProject = null;
    this.openTabs = [];
    this.activeFilePath = null;
    this.contextNodePath = null;
    this.contextIsFolder = false;
    this.copiedNodePath = null;
  }

  async init() {
    try {
      await this.storage.init();
      await this.editorManager.init('monaco-container');

      this.bindUIEvents();
      await this.loadInitialProject();
      this.log('✓ Hash Addon Studio inicializado com sucesso.', 'info');
    } catch (e) {
      console.error('Erro na inicialização:', e);
      this.log('❌ Erro ao inicializar a aplicação.', 'error');
    }
  }

  async loadInitialProject() {
    const projects = await this.storage.getAllProjects();
    if (projects && projects.length > 0) {
      this.currentProject = projects[0];
    } else {
      this.currentProject = this.createDefaultProjectData('Meu_Addon');
      await this.storage.saveProject(this.currentProject);
    }

    this.vfs.loadStructure(this.currentProject.files);
    const projNameEl = document.getElementById('current-project-name');
    if (projNameEl) projNameEl.innerText = this.currentProject.name;

    this.renderFileTree();
  }

  createDefaultProjectData(name) {
    const formattedName = name.replace(/\s+/g, '_');
    return {
      id: crypto.randomUUID(),
      name: formattedName,
      files: {
        'BP/manifest.json': JSON.stringify({
          format_version: 2,
          header: {
            name: formattedName,
            description: "Addon criado no Hash Addon Studio",
            uuid: crypto.randomUUID(),
            version: [1, 0, 0],
            min_engine_version: [1, 20, 50]
          },
          modules: [
            {
              type: "data",
              uuid: crypto.randomUUID(),
              version: [1, 0, 0]
            }
          ]
        }, null, 2),
        'BP/scripts/main.js': `import { world } from "@minecraft/server";\n\nworld.afterEvents.playerSpawn.subscribe((event) => {\n  event.player.sendMessage("§aAddon carregado!");\n});`
      }
    };
  }

  async createNewProject() {
    const name = prompt('Nome do Novo Projeto:', 'Novo_Addon');
    if (!name) return;

    this.currentProject = this.createDefaultProjectData(name);
    this.vfs.loadStructure(this.currentProject.files);

    this.openTabs = [];
    this.activeFilePath = null;
    this.editorManager.clear();

    const projNameEl = document.getElementById('current-project-name');
    if (projNameEl) projNameEl.innerText = this.currentProject.name;

    await this.storage.saveProject(this.currentProject);

    this.renderTabs();
    this.renderFileTree();
    this.log(`✓ Projeto "${this.currentProject.name}" criado com sucesso!`, 'info');
  }

  bindUIEvents() {
    // Top Bar Actions
    const btnNewProj = document.getElementById('btn-new-project');
    if (btnNewProj) btnNewProj.onclick = () => this.createNewProject();

    const btnExport = document.getElementById('btn-export-mcaddon');
    if (btnExport) btnExport.onclick = () => exportMcAddon(this.vfs, this.currentProject ? this.currentProject.name : 'Addon');

    const btnImport = document.getElementById('btn-import-zip');
    if (btnImport) btnImport.onclick = () => this.importZipFile();

    const btnTools = document.getElementById('btn-tools');
    if (btnTools) {
      btnTools.onclick = () => {
        openToolsModal(this.vfs, document.getElementById('modal-container'), null, (createdPath) => {
          this.renderFileTree();
          this.openFile(createdPath);
          this.triggerSave();
          this.log(`✓ Arquivo gerado em: ${createdPath}`, 'info');
        });
      };
    }

    // Modal Close
    const btnModalClose = document.getElementById('modal-close');
    if (btnModalClose) {
      btnModalClose.onclick = () => {
        document.getElementById('modal-container').close();
      };
    }

    // Sidebar
    const btnNewFile = document.getElementById('btn-new-file');
    if (btnNewFile) btnNewFile.onclick = () => this.promptCreateFile('');

    const btnNewFolder = document.getElementById('btn-new-folder');
    if (btnNewFolder) btnNewFolder.onclick = () => this.promptCreateFolder('');

    const toggleSidebar = document.getElementById('toggle-sidebar');
    if (toggleSidebar) toggleSidebar.onclick = () => this.toggleSidebar();

    const closeSidebar = document.getElementById('btn-close-sidebar');
    if (closeSidebar) closeSidebar.onclick = () => this.toggleSidebar(false);

    // Mobile Keyboard Toolbar
    document.querySelectorAll('.mobile-toolbar .sym-btn').forEach((btn) => {
      btn.onclick = () => {
        const char = btn.getAttribute('data-char');
        if (char) this.editorManager.insertText(char);
      };
    });

    // Editor auto-save listener
    this.editorManager.onChange((content) => {
      if (this.activeFilePath) {
        this.vfs.writeFile(this.activeFilePath, content, false);
        this.triggerSave();
      }
    });

    // Global Click (esconde menu de contexto)
    document.addEventListener('click', () => {
      const cm = document.getElementById('context-menu');
      if (cm) cm.classList.add('hidden');
    });

    this.bindContextMenuEvents();
  }

  toggleSidebar(forceState) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    if (forceState !== undefined) {
      sidebar.classList.toggle('open', forceState);
    } else {
      sidebar.classList.toggle('open');
    }
  }

  async triggerSave() {
    if (!this.currentProject) return;
    this.currentProject.files = this.vfs.getFlatStructure();
    await this.storage.saveProject(this.currentProject);
  }

  renderFileTree() {
    const container = document.getElementById('file-tree');
    if (!container) return;
    container.innerHTML = '';
    this.buildTreeDOM(this.vfs.getTree(), container);
  }

  buildTreeDOM(nodes, parentEl) {
    nodes.forEach((node) => {
      const nodeEl = document.createElement('div');
      nodeEl.className = 'tree-node';

      const itemEl = document.createElement('div');
      itemEl.className = `tree-item ${node.isFolder ? 'folder-item' : 'file-item'}`;
      if (this.activeFilePath === node.path) itemEl.classList.add('selected');

      const isOpen = node.isFolder ? this.vfs.isFolderOpen(node.path) : false;

      // Ícones das Setinhas e da Pasta/Arquivo
      const arrowIcon = node.isFolder 
        ? `<i class="fa-solid ${isOpen ? 'fa-chevron-down' : 'fa-chevron-right'}" style="font-size:0.7rem; width:12px; opacity:0.7;"></i>` 
        : `<span style="width:12px; display:inline-block;"></span>`;

      const folderFileIcon = node.isFolder 
        ? (isOpen ? '<i class="fa-solid fa-folder-open tree-icon"></i>' : '<i class="fa-solid fa-folder tree-icon"></i>')
        : '<i class="fa-solid fa-file-code tree-icon"></i>';

      itemEl.innerHTML = `${arrowIcon} ${folderFileIcon} <span>${node.name}</span>`;

      itemEl.onclick = (e) => {
        e.stopPropagation();
        if (node.isFolder) {
          this.vfs.toggleFolder(node.path);
          this.renderFileTree();
        } else {
          this.openFile(node.path);
        }
      };

      nodeEl.appendChild(itemEl);

      if (node.isFolder && node.children && isOpen) {
        const childrenContainer = document.createElement('div');
        childrenContainer.style.paddingLeft = '16px';
        this.buildTreeDOM(node.children, childrenContainer);
        nodeEl.appendChild(childrenContainer);
      }

      parentEl.appendChild(nodeEl);
    });
  }

  openFile(filePath) {
    this.activeFilePath = filePath;
    if (!this.openTabs.includes(filePath)) this.openTabs.push(filePath);

    const file = this.vfs.readFile(filePath);
    const imageContainer = document.getElementById('image-preview-container');
    const monacoContainer = document.getElementById('monaco-container');

    // Checagem de extensão para visualizador de imagem (PNG/JPG)
    const ext = filePath.split('.').pop().toLowerCase();
    const isImageFile = ['png', 'jpg', 'jpeg', 'webp', 'tga'].includes(ext) || (file && file.isImage);

    if (isImageFile && file) {
      if (monacoContainer) monacoContainer.classList.add('hidden');
      if (imageContainer) {
        imageContainer.classList.remove('hidden');
        const imgEl = document.getElementById('image-preview');
        if (imgEl) imgEl.src = file.content;
        const infoEl = document.getElementById('image-info');
        if (infoEl) infoEl.innerText = `${filePath}`;
      }
    } else {
      if (imageContainer) imageContainer.classList.add('hidden');
      if (monacoContainer) monacoContainer.classList.remove('hidden');
      this.editorManager.openFile(filePath, file ? file.content : '');
    }

    this.renderTabs();
    this.renderFileTree();
  }
   

  closeTab(filePath, event) {
    if (event) event.stopPropagation();
    this.openTabs = this.openTabs.filter((p) => p !== filePath);

    if (this.activeFilePath === filePath) {
      if (this.openTabs.length > 0) {
        this.openFile(this.openTabs[this.openTabs.length - 1]);
      } else {
        this.activeFilePath = null;
        this.editorManager.clear();
      }
    }
    this.renderTabs();
  }

  renderTabs() {
    const tabBar = document.getElementById('tab-bar');
    if (!tabBar) return;
    tabBar.innerHTML = '';

    this.openTabs.forEach((path) => {
      const tab = document.createElement('div');
      tab.className = `tab ${path === this.activeFilePath ? 'active' : ''}`;

      const name = path.split('/').pop();
      tab.innerText = name;

      const closeBtn = document.createElement('span');
      closeBtn.className = 'tab-close-btn';
      closeBtn.innerText = ' ✕';
      closeBtn.onclick = (e) => this.closeTab(path, e);

      tab.appendChild(closeBtn);
      tab.onclick = () => this.openFile(path);
      tabBar.appendChild(tab);
    });
  }

  showContextMenu(x, y, path, isFolder) {
    const cm = document.getElementById('context-menu');
    if (!cm) return;
    cm.style.left = `${x}px`;
    cm.style.top = `${y}px`;
    cm.classList.remove('hidden');

    this.contextNodePath = path;
    this.contextIsFolder = isFolder;
  }

  bindContextMenuEvents() {
    const cmNewFile = document.getElementById('cm-new-file');
    if (cmNewFile) {
      cmNewFile.onclick = () => {
        const basePath = this.contextIsFolder ? this.contextNodePath : this.getDirectory(this.contextNodePath);
        this.promptCreateFile(basePath);
      };
    }

    const cmNewFolder = document.getElementById('cm-new-folder');
    if (cmNewFolder) {
      cmNewFolder.onclick = () => {
        const basePath = this.contextIsFolder ? this.contextNodePath : this.getDirectory(this.contextNodePath);
        this.promptCreateFolder(basePath);
      };
    }

    const cmRename = document.getElementById('cm-rename');
    if (cmRename) {
      cmRename.onclick = () => {
        if (!this.contextNodePath) return;
        const oldName = this.contextNodePath.split('/').pop();
        const newName = prompt('Novo nome:', oldName);
        if (newName && newName !== oldName) {
          const basePath = this.getDirectory(this.contextNodePath);
          const newPath = basePath ? `${basePath}/${newName}` : newName;
          this.vfs.rename(this.contextNodePath, newPath);
          if (this.activeFilePath === this.contextNodePath) this.activeFilePath = newPath;
          this.openTabs = this.openTabs.map((p) => (p === this.contextNodePath ? newPath : p));
          this.renderFileTree();
          this.renderTabs();
          this.triggerSave();
        }
      };
    }

    const cmDelete = document.getElementById('cm-delete');
    if (cmDelete) {
      cmDelete.onclick = () => {
        if (!this.contextNodePath) return;
        if (confirm(`Excluir ${this.contextNodePath}?`)) {
          this.vfs.delete(this.contextNodePath);
          this.closeTab(this.contextNodePath);
          this.renderFileTree();
          this.triggerSave();
        }
      };
    }
  }

  promptCreateFile(basePath) {
    const fileName = prompt('Nome do Arquivo (ex: item.json):');
    if (!fileName) return;
    const fullPath = basePath ? `${basePath}/${fileName}` : fileName;
    this.vfs.writeFile(fullPath, '', false);
    this.renderFileTree();
    this.openFile(fullPath);
    this.triggerSave();
  }

  promptCreateFolder(basePath) {
    const folderName = prompt('Nome da Pasta:');
    if (!folderName) return;
    const fullPath = basePath ? `${basePath}/${folderName}` : folderName;
    this.vfs.createFolder(fullPath);
    this.renderFileTree();
    this.triggerSave();
  }

  getDirectory(path) {
    if (!path) return '';
    const parts = path.split('/');
    parts.pop();
    return parts.join('/');
  }

  async importZipFile() {
    if (typeof JSZip === 'undefined') {
      alert('JSZip não está carregado.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,.mcaddon,.mcpack';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const zip = await JSZip.loadAsync(file);
      this.vfs.clear();

      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (!zipEntry.dir) {
          const content = await zipEntry.async('string');
          this.vfs.writeFile(relativePath, content, false);
        }
      }

      this.openTabs = [];
      this.activeFilePath = null;
      this.renderFileTree();
      this.renderTabs();
      this.triggerSave();
      this.log(`✓ Arquivo "${file.name}" importado.`, 'info');
    };
    input.click();
  }

  log(message, type = 'info') {
    const logsContainer = document.getElementById('console-logs');
    if (!logsContainer) return;
    const item = document.createElement('div');
    item.className = `log-item ${type}`;
    item.innerText = `[${new Date().toLocaleTimeString()}] ${message}`;
    logsContainer.appendChild(item);
    logsContainer.scrollTop = logsContainer.scrollHeight;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});