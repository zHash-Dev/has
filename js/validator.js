// validator.js
export function validateAddon(vfs) {
  const logs = [];
  const files = vfs.exportTree();
  
  if (!files['BP/manifest.json'] && !files['manifest.json']) {
    logs.push({ type: 'error', text: '✕ AVISO CRÍTICO: "manifest.json" não encontrado no Behavior Pack.' });
  } else {
    logs.push({ type: 'info', text: '✓ manifest.json detectado.' });
  }

  Object.keys(files).forEach(path => {
    if (path.endsWith('.json')) {
      try {
        JSON.parse(files[path].content);
      } catch (err) {
        logs.push({ type: 'error', text: `✕ JSON Inválido em "${path}": ${err.message}` });
      }
    }
  });

  return logs;
}