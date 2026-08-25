import { registerMinecraftAutocomplete } from '../autocomplete.js';

export class CodeEditor {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.editor = null;
  }

  init(onContentChange) {
    return new Promise((resolve) => {
      require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
      require(['vs/editor/editor.main'], () => {
        registerMinecraftAutocomplete(monaco);
        
        this.editor = monaco.editor.create(this.container, {
          theme: 'vs-dark',
          automaticLayout: true,
          fontSize: 13,
          minimap: { enabled: false }, // Otimizado para celular
          wordWrap: 'on'
        });

        this.editor.onDidChangeModelContent(() => {
          if (onContentChange) onContentChange(this.editor.getValue());
        });

        resolve(true);
      });
    });
  }

  openFile(path, content) {
    const ext = path.split('.').pop();
    let lang = 'plaintext';
    if (ext === 'js' || ext === 'ts') lang = 'javascript';
    if (ext === 'json') lang = 'json';
    if (ext === 'mcfunction') lang = 'plaintext';

    const model = monaco.editor.createModel(content, lang);
    this.editor.setModel(model);
  }

  insertText(text) {
    if (!this.editor) return;
    const selection = this.editor.getSelection();
    const op = { range: selection, text: text, forceMoveMarkers: true };
    this.editor.executeEdits('mobile-toolbar', [op]);
    this.editor.focus();
  }
}