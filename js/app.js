import { IndexedDBStorage } from './idb.js';
import { VFS } from './vfs.js';
import { MonacoEditorManager } from './editor.js';
import { openToolsModal } from './tools.js';
import { exportCustomPackage } from './exporter.js';

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
    this.dirtyFiles = new Set(); // Conjunto de arquivos modificados sem salvar
  }

  async init() {
    try {
      await this.storage.init();
      await this.editorManager.init('monaco-container');

      // Adiciona suporte ao atalho Ctrl+S no editor Monaco
      this.editorManager.addSaveAction(() => this.saveCurrentFile());

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
      this.currentProject = await this.createDefaultProjectData('Meu_Addon');
      await this.storage.saveProject(this.currentProject);
    }

    this.vfs.loadStructure(this.currentProject.files);
    const projNameEl = document.getElementById('current-project-name');
    if (projNameEl) projNameEl.innerText = this.currentProject.name;

    this.renderFileTree();
  }

  showCustomPrompt(title, label, defaultValue = '', isConfirm = false) {
    return new Promise((resolve) => {
      const modal = document.getElementById('modal-prompt');
      const titleEl = document.getElementById('prompt-title');
      const labelEl = document.getElementById('prompt-label');
      const inputEl = document.getElementById('prompt-input');
      const inputGroup = document.getElementById('prompt-input-group');
      const msgEl = document.getElementById('prompt-message');
      const formEl = document.getElementById('prompt-form');
      const btnClose = document.getElementById('modal-prompt-close');
      const btnCancel = document.getElementById('prompt-cancel');

      titleEl.innerText = title;

      if (isConfirm) {
        inputGroup.classList.add('hidden');
        msgEl.classList.remove('hidden');
        msgEl.innerText = label;
      } else {
        inputGroup.classList.remove('hidden');
        msgEl.classList.add('hidden');
        labelEl.innerText = label;
        inputEl.value = defaultValue;
      }

      const cleanup = () => {
        formEl.onsubmit = null;
        btnClose.onclick = null;
        btnCancel.onclick = null;
        if (typeof modal.close === 'function') modal.close();
        else modal.classList.add('hidden');
      };

      formEl.onsubmit = (e) => {
        e.preventDefault();
        const value = isConfirm ? true : inputEl.value.trim();
        cleanup();
        resolve(value || null);
      };

      btnCancel.onclick = () => { cleanup(); resolve(isConfirm ? false : null); };
      btnClose.onclick = () => { cleanup(); resolve(isConfirm ? false : null); };

      if (typeof modal.showModal === 'function') modal.showModal();
      else modal.classList.remove('hidden');

      if (!isConfirm) {
        setTimeout(() => {
          inputEl.focus();
          inputEl.select();
        }, 50);
      }
    });
  }

  async loadBaseIconDataUrl() {
    try {
      const response = await fetch('../icon_base.png');
      if (!response.ok) throw new Error('Não foi possível carregar icon_base.png');
      const blob = await response.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn('Ícone padrão (icon_base.png) não encontrado. Usando imagem transparente fallback.', err);
      return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    }
  }

  async createDefaultProjectData(name) {
    const formattedName = name.replace(/\s+/g, '_');
    const bpUuidHeader = crypto.randomUUID();
    const bpUuidModule = crypto.randomUUID();
    const rpUuidHeader = crypto.randomUUID();
    const rpUuidModule = crypto.randomUUID();

    const iconBaseData = await this.loadBaseIconDataUrl();

    return {
      id: crypto.randomUUID(),
      name: formattedName,
      files: {
        'BP/manifest.json': JSON.stringify({
          format_version: 2,
          header: {
            name: `${formattedName} Behavior`,
            description: "Behavior Pack criado no Hash Addon Studio",
            uuid: bpUuidHeader,
            version: [1, 0, 0],
            min_engine_version: [1, 20, 50]
          },
          modules: [
            {
              type: "data",
              uuid: bpUuidModule,
              version: [1, 0, 0]
            }
          ],
          dependencies: [
            {
              uuid: rpUuidHeader,
              version: [1, 0, 0]
            }
          ]
        }, null, 2),
        'BP/pack_icon.png': iconBaseData,
        'BP/scripts/main.js': `import { world } from "@minecraft/server";\n\nworld.afterEvents.playerSpawn.subscribe((event) => {\n  event.player.sendMessage("§aAddon ${formattedName} carregado com sucesso!");\n});`,
        'BP/items/.gitkeep': '',
        'BP/blocks/.gitkeep': '',
        'BP/entities/.gitkeep': '',

        'RP/manifest.json': JSON.stringify({
          format_version: 2,
          header: {
            name: `${formattedName} Resource`,
            description: "Resource Pack criado no Hash Addon Studio",
            uuid: rpUuidHeader,
            version: [1, 0, 0],
            min_engine_version: [1, 20, 50]
          },
          modules: [
            {
              type: "resources",
              uuid: rpUuidModule,
              version: [1, 0, 0]
            }
          ]
        }, null, 2),
        'RP/pack_icon.png': iconBaseData,
        'RP/textures/item_texture.json': JSON.stringify({
          resource_pack_name: formattedName,
          texture_name: "atlas.items",
          texture_data: {}
        }, null, 2),
        'RP/textures/terrain_texture.json': JSON.stringify({
          resource_pack_name: formattedName,
          texture_name: "atlas.terrain",
          texture_data: {}
        }, null, 2),
        'RP/textures/items/.gitkeep': '',
        'RP/textures/blocks/.gitkeep': ''
      }
    };
  }

  async createNewProject() {
    const name = await this.showCustomPrompt('Novo Projeto', 'Nome do Novo Projeto:', 'Novo_Addon');
    if (!name) return;

    this.currentProject = await this.createDefaultProjectData(name);
    this.vfs.loadStructure(this.currentProject.files);

    this.openTabs = [];
    this.dirtyFiles.clear();
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
    // Atalho Ctrl+S Global
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.saveCurrentFile();
      }
    });

    const btnNewProj = document.getElementById('btn-new-project');
    if (btnNewProj) btnNewProj.onclick = () => this.createNewProject();

    const btnExport = document.getElementById('btn-export-mcaddon');
    const modalExport = document.getElementById('modal-export');
    const modalExportClose = document.getElementById('modal-export-close');
    const exportCards = document.querySelectorAll('.export-card');

    if (btnExport && modalExport) {
      btnExport.innerHTML = '<i class="fa-solid fa-file-export"></i> Exportar';
      
      btnExport.onclick = () => {
        if (typeof modalExport.showModal === 'function') {
          modalExport.showModal();
        } else {
          modalExport.classList.remove('hidden');
        }
      };
    }

    if (modalExportClose && modalExport) {
      modalExportClose.onclick = () => {
        if (typeof modalExport.close === 'function') {
          modalExport.close();
        } else {
          modalExport.classList.add('hidden');
        }
      };
    }

    exportCards.forEach((card) => {
      card.onclick = async () => {
        const mode = card.getAttribute('data-mode');
        const asZip = card.getAttribute('data-zip') === 'true';
        const projectName = this.currentProject ? this.currentProject.name : 'Meu_Addon';

        if (modalExport) {
          if (typeof modalExport.close === 'function') {
            modalExport.close();
          } else {
            modalExport.classList.add('hidden');
          }
        }

        try {
          this.log(`⏳ Gerando arquivo de exportação (${mode})...`, 'info');
          await exportCustomPackage(this.vfs, projectName, mode, asZip);
          this.log(`✓ Exportação de "${projectName}" concluída com sucesso!`, 'info');
        } catch (err) {
          console.error('Erro na exportação:', err);
          this.log('❌ Falha ao exportar o pacote.', 'error');
        }
      };
    });

    const btnImport = document.getElementById('btn-import-zip');
    if (btnImport) {
      btnImport.innerHTML = '<i class="fa-solid fa-folder-open"></i> Importar Pasta';
      btnImport.onclick = () => this.importFolder();
    }

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

    const btnModalClose = document.getElementById('modal-close');
    if (btnModalClose) {
      btnModalClose.onclick = () => {
        document.getElementById('modal-container').close();
      };
    }

    const btnNewFile = document.getElementById('btn-new-file');
    if (btnNewFile) btnNewFile.onclick = () => this.promptCreateFile('');

    const btnNewFolder = document.getElementById('btn-new-folder');
    if (btnNewFolder) btnNewFolder.onclick = () => this.promptCreateFolder('');

    const toggleSidebar = document.getElementById('toggle-sidebar');
    if (toggleSidebar) toggleSidebar.onclick = () => this.toggleSidebar();

    const closeSidebar = document.getElementById('btn-close-sidebar');
    if (closeSidebar) closeSidebar.onclick = () => this.toggleSidebar(false);

    document.querySelectorAll('.mobile-toolbar .sym-btn').forEach((btn) => {
      btn.onclick = () => {
        const char = btn.getAttribute('data-char');
        if (char) this.editorManager.insertText(char);
      };
    });

    // Evento de alteração de conteúdo do arquivo
    this.editorManager.onChange((content) => {
      if (this.activeFilePath) {
        // Marca o arquivo como modificado (dirty)
        if (!this.dirtyFiles.has(this.activeFilePath)) {
          this.dirtyFiles.add(this.activeFilePath);
          this.renderTabs();
        }
        this.vfs.writeFile(this.activeFilePath, content, false);
      }
    });

    document.addEventListener('click', () => {
      const cm = document.getElementById('context-menu');
      if (cm) cm.classList.add('hidden');
    });

    this.bindContextMenuEvents();
  }

  async saveCurrentFile() {
    if (!this.activeFilePath) return;
    await this.triggerSave();
    this.dirtyFiles.delete(this.activeFilePath);
    this.renderTabs();
    const fileName = this.activeFilePath.split('/').pop();
    this.log(`Arquivo "${fileName}" salvo com sucesso!`, 'info');
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
      if (node.name === '.gitkeep') return;

      const nodeEl = document.createElement('div');
      nodeEl.className = 'tree-node';

      const itemEl = document.createElement('div');
      itemEl.className = `tree-item ${node.isFolder ? 'folder-item' : 'file-item'}`;
      if (this.activeFilePath === node.path) itemEl.classList.add('selected');

      const isOpen = node.isFolder ? this.vfs.isFolderOpen(node.path) : false;

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

    const ext = filePath.split('.').pop().toLowerCase();
    const isImageFile = ['png', 'jpg', 'jpeg', 'webp', 'tga', 'gif', 'ico'].includes(ext) || (file && file.isImage);

    if (isImageFile && file) {
      if (monacoContainer) monacoContainer.classList.add('hidden');
      if (imageContainer) {
        imageContainer.classList.remove('hidden');
        const imgEl = document.getElementById('image-preview');
        const infoEl = document.getElementById('image-info');

        let rawContent = typeof file === 'object' && file.content !== undefined ? file.content : file;

        if (imgEl) {
          imgEl.src = rawContent || '';
          imgEl.style.imageRendering = 'pixelated';
        }
        if (infoEl) infoEl.innerText = filePath;
      }
    } else {
      if (imageContainer) imageContainer.classList.add('hidden');
      if (monacoContainer) monacoContainer.classList.remove('hidden');
      this.editorManager.openFile(filePath, file ? (typeof file === 'object' ? file.content : file) : '');
    }

    this.renderTabs();
    this.renderFileTree();
  }

  async closeTab(filePath, event) {
    if (event) event.stopPropagation();

    // Pergunta de confirmação se o arquivo contiver alterações pendentes
    if (this.dirtyFiles.has(filePath)) {
      const fileName = filePath.split('/').pop();
      const confirmClose = await this.showCustomPrompt(
        'Fechar sem salvar',
        `O arquivo "${fileName}" tem alterações não salvas. Deseja fechar assim mesmo?`,
        '',
        true
      );
      if (!confirmClose) return;
      this.dirtyFiles.delete(filePath);
    }

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
      const isDirty = this.dirtyFiles.has(path);

      // Exibe a bolinha de modificado se houver edições pendentes
      const titleSpan = document.createElement('span');
      titleSpan.innerText = isDirty ? `${name} •` : name;
      tab.appendChild(titleSpan);

      const closeBtn = document.createElement('span');
      closeBtn.className = 'tab-close-btn';
      closeBtn.innerText = ' ✕';
      closeBtn.onclick = (e) => this.closeTab(path, e);

      tab.appendChild(closeBtn);
      tab.onclick = () => this.openFile(path);
      tabBar.appendChild(tab);
    });
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
      cmRename.onclick = async () => {
        if (!this.contextNodePath) return;
        const oldName = this.contextNodePath.split('/').pop();
        const newName = await this.showCustomPrompt('Renomear', 'Novo nome:', oldName);
        if (newName && newName !== oldName) {
          const basePath = this.getDirectory(this.contextNodePath);
          const newPath = basePath ? `${basePath}/${newName}` : newName;
          this.vfs.rename(this.contextNodePath, newPath);
          if (this.activeFilePath === this.contextNodePath) this.activeFilePath = newPath;
          this.openTabs = this.openTabs.map((p) => (p === this.contextNodePath ? newPath : p));
          if (this.dirtyFiles.has(this.contextNodePath)) {
            this.dirtyFiles.delete(this.contextNodePath);
            this.dirtyFiles.add(newPath);
          }
          this.renderFileTree();
          this.renderTabs();
          this.triggerSave();
        }
      };
    }

    const cmDelete = document.getElementById('cm-delete');
    if (cmDelete) {
      cmDelete.onclick = async () => {
        if (!this.contextNodePath) return;
        const confirmed = await this.showCustomPrompt('Excluir', `Deseja realmente excluir "${this.contextNodePath}"?`, '', true);
        if (confirmed) {
          this.vfs.delete(this.contextNodePath);
          this.dirtyFiles.delete(this.contextNodePath);
          this.closeTab(this.contextNodePath);
          this.renderFileTree();
          this.triggerSave();
        }
      };
    }
  }

  async promptCreateFile(basePath) {
    const fileName = await this.showCustomPrompt('Novo Arquivo', 'Nome do Arquivo (ex: item.json):', '');
    if (!fileName) return;
    const fullPath = basePath ? `${basePath}/${fileName}` : fileName;
    this.vfs.writeFile(fullPath, '', false);
    this.renderFileTree();
    this.openFile(fullPath);
    this.triggerSave();
  }

  async promptCreateFolder(basePath) {
    const folderName = await this.showCustomPrompt('Nova Pasta', 'Nome da Pasta:', '');
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

  async importFolder() {
    this.vfs.clear();

    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await window.showDirectoryPicker();
        await this.readDirectoryHandle(dirHandle, '');
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Erro ao abrir pasta:', err);
        return;
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true;
      input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) {
          const relativePath = file.webkitRelativePath.split('/').slice(1).join('/');
          if (!relativePath) continue;
          await this.processAndSaveFile(file, relativePath);
        }
        this.finalizeImport();
      };
      input.click();
      return;
    }

    this.finalizeImport();
  }

  async readDirectoryHandle(dirHandle, currentPath) {
    for await (const entry of dirHandle.values()) {
      const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      if (entry.kind === 'directory') {
        await this.readDirectoryHandle(entry, entryPath);
      } else if (entry.kind === 'file') {
        const file = await entry.getFile();
        await this.processAndSaveFile(file, entryPath);
      }
    }
  }

  async processAndSaveFile(file, relativePath) {
    const ext = relativePath.split('.').pop().toLowerCase();
    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'tga', 'gif', 'ico'].includes(ext);

    if (isImage) {
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
      this.vfs.writeFile(relativePath, dataUrl, true);
    } else {
      const textContent = await file.text();
      this.vfs.writeFile(relativePath, textContent, false);
    }
  }

  finalizeImport() {
    this.openTabs = [];
    this.dirtyFiles.clear();
    this.activeFilePath = null;
    this.renderFileTree();
    this.renderTabs();
    this.triggerSave();
    this.log('✓ Pasta importada com sucesso.', 'info');
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