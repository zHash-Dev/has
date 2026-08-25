export class AddonExporter {
  static async exportToZip(vfs, filename = 'addon.mcaddon') {
    const zip = new JSZip();
    const files = vfs.exportTree();

    Object.keys(files).forEach(path => {
      const item = files[path];
      if (item.type === 'file') {
        if (item.isBinary && typeof item.content === 'string' && item.content.startsWith('data:')) {
          // Extrai o conteúdo Base64 para salvar binário limpo no ZIP
          const base64Data = item.content.split(',')[1];
          zip.file(path, base64Data, { base64: true });
        } else {
          zip.file(path, item.content);
        }
      }
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  static async importFromZip(file, vfs) {
    const zip = await JSZip.loadAsync(file);
    const importedFiles = {};

    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      const cleanPath = relativePath.endsWith('/') ? relativePath.slice(0, -1) : relativePath;
      if (!cleanPath) continue;

      if (!zipEntry.dir) {
        const ext = cleanPath.split('.').pop().toLowerCase();
        const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'tga'].includes(ext);

        if (isImage) {
          const base64 = await zipEntry.async('base64');
          const mime = ext === 'tga' ? 'image/x-tga' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
          importedFiles[cleanPath] = {
            content: `data:${mime};base64,${base64}`,
            type: 'file',
            isBinary: true
          };
        } else {
          const content = await zipEntry.async('string');
          importedFiles[cleanPath] = { content, type: 'file', isBinary: false };
        }
      } else {
        importedFiles[cleanPath] = { type: 'dir' };
      }
    }
    vfs.loadStructure(importedFiles);
  }
}
export async function exportMcAddon(vfs, projectName = 'Addon') {
  if (typeof JSZip === 'undefined') {
    alert('Biblioteca JSZip não encontrada.');
    return;
  }

  const zip = new JSZip();
  const files = vfs.getFlatStructure();

  Object.keys(files).forEach((path) => {
    const file = files[path];
    if (file && !path.endsWith('.keep')) {
      const content = typeof file === 'object' ? file.content : file;
      zip.file(path, content);
    }
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName.replace(/\s+/g, '_')}.mcaddon`;
  a.click();
  URL.revokeObjectURL(url);
}