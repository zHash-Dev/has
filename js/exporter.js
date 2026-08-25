import JSZip from 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm';

export async function exportCustomPackage(vfs, projectName = 'Addon', mode = 'mcaddon', asZip = false) {
  const zip = new JSZip();
  const flatFiles = vfs.getFlatStructure();
  const formattedName = projectName.replace(/\s+/g, '_');

  if (mode === 'bp') {
    addFilesToZip(zip, flatFiles, 'BP/');
    const ext = asZip ? 'zip' : 'mcpack';
    await triggerDownload(zip, `${formattedName}_BP.${ext}`);
  } else if (mode === 'rp') {
    addFilesToZip(zip, flatFiles, 'RP/');
    const ext = asZip ? 'zip' : 'mcpack';
    await triggerDownload(zip, `${formattedName}_RP.${ext}`);
  } else {
    const bpZip = zip.folder(`${formattedName}_BP`);
    const rpZip = zip.folder(`${formattedName}_RP`);
    addFilesToZip(bpZip, flatFiles, 'BP/');
    addFilesToZip(rpZip, flatFiles, 'RP/');
    const ext = asZip ? 'zip' : 'mcaddon';
    await triggerDownload(zip, `${formattedName}.${ext}`);
  }
}

export async function exportMcAddon(vfs, projectName = 'Addon') {
  return exportCustomPackage(vfs, projectName, 'mcaddon', false);
}

function addFilesToZip(targetFolder, flatFiles, prefix) {
  Object.keys(flatFiles).forEach((filePath) => {
    const normalizedPath = filePath.replace(/\\/g, '/');

    if (normalizedPath.startsWith(prefix)) {
      const relativePath = normalizedPath.substring(prefix.length);
      if (!relativePath || relativePath.endsWith('.gitkeep')) return;

      const fileData = flatFiles[filePath];
      const rawContent = typeof fileData === 'object' && fileData !== null ? fileData.content : fileData;
      const isImgFlag = typeof fileData === 'object' && fileData !== null && fileData.isImage;

      // Detecta se é imagem pela flag VFS, pela extensão ou pela string base64
      const isBase64Image = typeof rawContent === 'string' && rawContent.startsWith('data:image/');
      const ext = relativePath.split('.').pop().toLowerCase();
      const isImgExt = ['png', 'jpg', 'jpeg', 'webp', 'tga', 'gif', 'ico'].includes(ext);

      if (isImgFlag || isBase64Image || isImgExt) {
        // Limpa o prefixo Data URL para extrair apenas os dados de Base64 válidos
        const cleanBase64 = typeof rawContent === 'string' 
          ? rawContent.replace(/^data:image\/\w+;base64,/, '') 
          : rawContent;

        targetFolder.file(relativePath, cleanBase64, { base64: true });
      } else {
        targetFolder.file(relativePath, rawContent || '');
      }
    }
  });
}

async function triggerDownload(zip, filename) {
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}