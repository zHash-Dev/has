import { IndexedDBStorage } from './idb.js';
import { VFS } from './vfs.js';
import { MonacoEditorManager } from './editor.js';
import { openToolsModal } from './tools.js';
import { BEDROCK_TOOLS_CATALOG } from './toolsCatalog.js';
import { exportMcAddon } from './exporter.js';

class App {
  constructor() {
    this.storage = new IndexedDBStorage();
    this.vfs = new VFS();
    this.editorManager = new MonacoEditorManager();
    this.currentProject = null;
    this.openTabs = [];
    this.activeFilePath = null;
    this.copiedNodePath = null;
  }

  async init() {
    await this.storage.init();
    await this.editorManager.init('monaco-container');
    
    this.bindUIEvents();
    await this.loadInitialProject();
    this.log('✓ Hash Addon Studio inicializado com sucesso.', 'info');
  }

  async loadInitialProject() {
    const projects = await this.storage.getAllProjects();
    if (projects.length > 0) {
      this.currentProject = projects[0];
    } else {
      this.currentProject = this.createDefaultProjectData('Meu_Addon');
      await this.storage.saveProject(this.currentProject);
    }

    this.vfs.loadStructure(this.currentProject.files);
    document.getElementById('current-project-name').innerText = this.currentProject.name;
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
            },
            {
              type: "script",
              language: "javascript",
              uuid: crypto.randomUUID(),
              entry: "scripts/main.js",
              version: [1, 0, 0]
            }
          ],
          dependencies: [
            {
              module_name: "@minecraft/server",
              version: "1.8.0"
            }
          ]
        }, null, 2),
        'BP/scripts/main.js': `import { world } from "@minecraft/server";\n\nworld.afterEvents.playerSpawn.subscribe((event) => {\n  event.player.sendMessage("§aProjeto ${formattedName} iniciado!");\n});`
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

    document.getElementById('current-project-name').innerText = this.currentProject.name;
    await this.storage.saveProject(this.currentProject);
    
    this.renderTabs();
    this.renderFileTree();
    this.log(`✓ Novo projeto "${this.currentProject.name}" criado.`, 'info');
  }

  bindUIEvents() {
    // Ações da Barra Superior
    document.getElementById('btn-new-project')?.addEventListener('click', () => this.createNewProject());
    document.getElementById('btn-export-mcaddon')?.addEventListener('click', () => exportMcAddon(this.vfs, this.currentProject.name));
    
    const btnTools = document.getElementById('btn-tools');
    if (btnTools) {
      btnTools.onclick = () => {
        openToolsModal(this.vfs, document.getElementById('modal-container'), BEDROCK_TOOLS_CATALOG, (createdPath) => {
          this.renderFileTree();
          this.openFile(createdPath);
          this.triggerSave();
          this.log(`✓ Gerado novo arquivo em: ${createdPath}`, 'info');
        });
      };
    }

    document.getElementById('btn-import-zip')?.addEventListener('click', () => this.importZipFile());

    // Fechar Modal
    document.getElementById('modal-close')?.addEventListener('click', () => {
      document.getElementById('modal-container').close();
    });

    // Ações do Explorador / Sidebar
    document.getElementById('btn-new-file')?.addEventListener('click', () => this.promptCreateFile(''));
    document.getElementById('btn-new-folder')?.addEventListener('click', () => this.promptCreateFolder(''));
    document.getElementById('toggle-sidebar')?.addEventListener('click', () => this.toggleSidebar());
    document.getElementById('btn-close-sidebar')?.addEventListener('click', () => this.toggleSidebar(false));

    // Teclado Mobile
    document.querySelectorAll('.mobile-toolbar .sym-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const char = btn.getAttribute('data-char');
        this.editorManager.insertText(char);
      });
    });

    // Menu de Contexto
    this.bindContextMenuEvents();

    // Evento de alteração no editor para auto-save
    this.editorManager.onChange((content) => {
      if (this.activeFilePath) {
        this.vfs.writeFile(this.activeFilePath, content, false);
        this.triggerSave();
      }
    });

    // Esconder menu de contexto ao clicar fora
    document.addEventListener('click', () => this.hideContextMenu());
  }

  toggleSidebar(forceState) {
    const sidebar = document.getElementById('sidebar');
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
    const saveStatus = document.getElementById('save-status');
    if (saveStatus) {
      saveStatus.innerText = 'Saved';
      saveStatus.style.background = '#2b2b2b';
    }
  }

  renderFileTree() {
    const container = document.getElementById('file-tree');
    if (!container) return;
    container.innerHTML = '';
    const tree = this.vfs.getTree();
    this.buildTreeDOM(tree, container);
  }

  buildTreeDOM(nodes, parentEl) {
    nodes.forEach(node => {
      const nodeEl = document.createElement('div');
      nodeEl.className = 'tree-node';

      const itemEl = document.createElement('div');
      itemEl.className = `tree-item ${node.isFolder ? 'folder-item' : 'file-item'}`;
      if (this.activeFilePath === node.path) itemEl.classList.add('selected');

      const icon = document.createElement('span');
      icon.className = 'tree-icon';
      icon.innerHTML = node.isFolder ? '<i class="fa-solid fa-folder"></i>' : '<i class="fa-solid fa-file-code"></i>';

      const nameSpan = document.createElement('span');
      nameSpan.innerText = node.name;

      itemEl.appendChild(icon);
      itemEl.appendChild(nameSpan);

      itemEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (node.isFolder) {
          const childrenContainer = nodeEl.querySelector('.tree-children');
          if (childrenContainer) {
            childrenContainer.classList.toggle('hidden');
          }
        } else {
          this.openFile(node.path);
        }
      });

      itemEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showContextMenu(e.clientX, e.clientY, node.path, node.isFolder);
      });

      nodeEl.appendChild(itemEl);

      if (node.isFolder && node.children) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';
        childrenContainer.style.paddingLeft = '12px';
        this.buildTreeDOM(node.children, childrenContainer);
        nodeEl.appendChild(childrenContainer);
      }

      parentEl.appendChild(nodeEl);
    });
  }

  openFile(filePath) {
    this.activeFilePath = filePath;
    if (!this.openTabs.includes(filePath)) {
      this.openTabs.push(filePath);
    }

    const file = this.vfs.readFile(filePath);
    const imageContainer = document.getElementById('image-preview-container');
    const monacoContainer = document.getElementById('monaco-container');

    if (file && file.isImage) {
      monacoContainer.classList.add('hidden');
      imageContainer.classList.remove('hidden');
      const img = document.getElementById('image-preview');
      img.src = file.content;
      document.getElementById('image-info').innerText = `${filePath}`;
    } else {
      imageContainer.classList.add('hidden');
      monacoContainer.classList.remove('hidden');
      this.editorManager.openFile(filePath, file ? file.content : '');
    }

    this.renderTabs();
    this.renderFileTree();
  }

  closeTab(filePath, event) {
    if (event) event.stopPropagation();
    this.openTabs = this.openTabs.filter(p => p !== filePath);
    
    if (this.activeFilePath === filePath) {
      if (this.openTabs.length > 0) {
        this.openFile(this.openTabs[this.openTabs.length - 1]);
      } else {
        this.activeFilePath = null;
        this.editorManager.clear();
        document.getElementById('monaco-container').classList.remove('hidden');
        document.getElementById('image-preview-container').classList.add('hidden');
      }
    }
    this.renderTabs();
  }

  renderTabs() {
    const tabBar = document.getElementById('tab-bar');
    if (!tabBar) return;
    tabBar.innerHTML = '';

    this.openTabs.forEach(path => {
      const tab = document.createElement('div');
      tab.className = `tab ${path === this.activeFilePath ? 'active' : ''}`;
      
      const fileName = path.split('/').pop();
      tab.innerText = fileName;

      const closeBtn = document.createElement('span');
      closeBtn.className = 'tab-close-btn';
      closeBtn.innerHTML = '✕';
      closeBtn.onclick = (e) => this.closeTab(path, e);

      tab.appendChild(closeBtn);
      tab.onclick = () => this.openFile(path);
      tabBar.appendChild(tab);
    });
  }

  showContextMenu(x, y, path, isFolder) {
    const cm = document.getElementById('context-menu');
    cm.style.left = `${x}px`;
    cm.style.top = `${y}px`;
    cm.classList.remove('hidden');

    this.contextNodePath = path;
    this.contextIsFolder = isFolder;
  }

  hideContextMenu() {
    const cm = document.getElementById('context-menu');
    if (cm) cm.classList.add('hidden');
  }

  bindContextMenuEvents() {
    document.getElementById('cm-new-file')?.addEventListener('click', () => {
      const basePath = this.contextIsFolder ? this.contextNodePath : this.getDirectory(this.contextNodePath);
      this.promptCreateFile(basePath);
    });

    document.getElementById('cm-new-folder')?.addEventListener('click', () => {
      const basePath = this.contextIsFolder ? this.contextNodePath : this.getDirectory(this.contextNodePath);
      this.promptCreateFolder(basePath);
    });

    document.getElementById('cm-rename')?.addEventListener('click', () => {
      if (!this.contextNodePath) return;
      const oldName = this.contextNodePath.split('/').pop();
      const newName = prompt('Novo nome:', oldName);
      if (newName && newName !== oldName) {
        const basePath = this.getDirectory(this.contextNodePath);
        const newPath = basePath ? `${basePath}/${newName}` : newName;
        this.vfs.rename(this.contextNodePath, newPath);
        if (this.activeFilePath === this.contextNodePath) this.activeFilePath = newPath;
        this.openTabs = this.openTabs.map(p => p === this.contextNodePath ? newPath : p);
        this.renderFileTree();
        this.renderTabs();
        this.triggerSave();
      }
    });

    document.getElementById('cm-copy')?.addEventListener('click', () => {
      this.copiedNodePath = this.contextNodePath;
      this.log(`Copiado: ${this.copiedNodePath}`, 'info');
    });

    document.getElementById('cm-paste')?.addEventListener('click', () => {
      if (!this.copiedNodePath) return;
      const targetDir = this.contextIsFolder ? this.contextNodePath : this.getDirectory(this.contextNodePath);
      const fileName = this.copiedNodePath.split('/').pop();
      const newPath = targetDir ? `${targetDir}/${fileName}` : fileName;
      
      const fileData = this.vfs.readFile(this.copiedNodePath);
      if (fileData) {
        this.vfs.writeFile(newPath, fileData.content, fileData.isImage);
        this.renderFileTree();
        this.triggerSave();
      }
    });

    document.getElementById('cm-delete')?.addEventListener('click', () => {
      if (!this.contextNodePath) return;
      if (confirm(`Deseja excluir ${this.contextNodePath}?`)) {
        this.vfs.delete(this.contextNodePath);
        this.closeTab(this.contextNodePath);
        this.renderFileTree();
        this.triggerSave();
      }
    });
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
      this.log(`✓ Arquivo ${file.name} importado com sucesso!`, 'info');
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

// Inicialização da Aplicação
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});