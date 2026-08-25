export class MonacoEditorManager {
  constructor() {
    this.editor = null;
    this.monaco = null;
    this.currentModel = null;
    this.changeListeners = [];
  }

  async init(containerId) {
    return new Promise((resolve) => {
      window.require.config({
        paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }
      });

      window.require(['vs/editor/editor.main'], (monaco) => {
        this.monaco = monaco;

        // Registro de linguagens personalizadas (se necessário)
        monaco.languages.register({ id: 'mcfunction' });
        monaco.languages.setMonarchTokensProvider('mcfunction', {
          tokenizer: {
            root: [
              [/^#.*$/, 'comment'],
              [/\b(give|tp|setblock|fill|execute|say|tellraw|summon|effect|clear)\b/, 'keyword'],
              [/@[a-eprs]/, 'variable']
            ]
          }
        });

        const container = document.getElementById(containerId);
        this.editor = monaco.editor.create(container, {
          theme: 'vs-dark',
          automaticLayout: true,
          fontSize: 14,
          fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
          minimap: { enabled: true },
          tabSize: 2,
          scrollBeyondLastLine: false
        });

        resolve();
      });
    });
  }

  openFile(filePath, content) {
    if (!this.monaco || !this.editor) return;

    const ext = filePath.split('.').pop().toLowerCase();
    let language = 'plaintext';

    if (ext === 'json') language = 'json';
    else if (ext === 'js') language = 'javascript';
    else if (ext === 'mcfunction') language = 'mcfunction';
    else if (ext === 'md') language = 'markdown';

    const uri = this.monaco.Uri.parse(`inmemory://model/${filePath}`);
    let model = this.monaco.editor.getModel(uri);

    if (!model) {
      model = this.monaco.editor.createModel(content, language, uri);
    } else {
      if (model.getValue() !== content) {
        model.setValue(content);
      }
      this.monaco.editor.setModelLanguage(model, language);
    }

    this.editor.setModel(model);
    this.currentModel = model;

    // Notifica listeners sobre mudanças de conteúdo
    model.onDidChangeContent(() => {
      const currentVal = model.getValue();
      this.changeListeners.forEach((cb) => cb(currentVal));
    });
  }

  // Permite adicionar atalho de teclado diretamente no Monaco
  addSaveAction(onSaveCallback) {
    if (!this.editor || !this.monaco) return;
    this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KeyS, () => {
      onSaveCallback();
    });
  }

  onChange(callback) {
    this.changeListeners.push(callback);
  }

  insertText(text) {
    if (!this.editor) return;
    const selection = this.editor.getSelection();
    const id = { major: 1, minor: 1 };
    const op = { identifier: id, range: selection, text: text, forceMoveMarkers: true };
    this.editor.executeEdits('mobile-toolbar', [op]);
    this.editor.focus();
  }

  clear() {
    if (this.editor) {
      this.editor.setModel(null);
    }
  }
}