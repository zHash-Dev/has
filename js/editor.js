export class MonacoEditorManager {
  constructor() {
    this.editor = null;
    this.currentModel = null;
    this.changeListener = null;
  }

  async init(containerId) {
    return new Promise((resolve) => {
      if (typeof require !== 'undefined' && require.config) {
        require.config({
          paths: {
            vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs'
          }
        });

        require(['vs/editor/editor.main'], () => {
          const container = document.getElementById(containerId);
          if (!container) return resolve(null);

          this.editor = monaco.editor.create(container, {
            value: '',
            language: 'json',
            theme: 'vs-dark',
            automaticLayout: true,
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            tabSize: 2
          });

          resolve(this.editor);
        });
      } else {
        console.warn('Monaco Loader não foi encontrado no HTML.');
        resolve(null);
      }
    });
  }

  openFile(filePath, content) {
    if (!this.editor) return;

    const extension = filePath.split('.').pop().toLowerCase();
    let language = 'plaintext';

    if (extension === 'json') language = 'json';
    else if (extension === 'js' || extension === 'ts') language = 'javascript';
    else if (extension === 'mcfunction') language = 'plaintext';

    const newModel = monaco.editor.createModel(content, language);
    
    if (this.currentModel) {
      this.currentModel.dispose();
    }

    this.currentModel = newModel;
    this.editor.setModel(this.currentModel);

    if (this.changeListener) {
      this.changeListener(this.editor.getValue());
    }
  }

  onChange(callback) {
    if (!this.editor) return;
    this.editor.onDidChangeModelContent(() => {
      if (callback) callback(this.editor.getValue());
    });
  }

  insertText(text) {
    if (!this.editor) return;
    const selection = this.editor.getSelection();
    const range = new monaco.Range(
      selection.startLineNumber,
      selection.startColumn,
      selection.endLineNumber,
      selection.endColumn
    );
    const id = { major: 1, minor: 1 };
    const op = { identifier: id, range: range, text: text, forceMoveMarkers: true };
    this.editor.executeEdits('mobile-toolbar', [op]);
    this.editor.focus();
  }

  clear() {
    if (this.editor) {
      this.editor.setValue('');
    }
  }
}