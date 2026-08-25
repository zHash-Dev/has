export function openToolsModal(vfs, modalEl, catalog, onSuccess) {
  const modalBody = document.getElementById('modal-body');
  if (!modalBody) return;

  const getPackPaths = () => {
    const files = vfs.getFiles ? vfs.getFiles() : (vfs.files || {});
    let bpPrefix = 'BP';
    let rpPrefix = 'RP';

    const rootFolders = new Set();
    Object.keys(files).forEach(path => {
      const firstPart = path.split('/')[0];
      if (firstPart) rootFolders.add(firstPart);
    });

    for (const folder of rootFolders) {
      const lower = folder.toLowerCase();
      if (lower.endsWith('beh') || lower.endsWith('bp') || lower.includes('behavior')) bpPrefix = folder;
      if (lower.endsWith('res') || lower.endsWith('rp') || lower.includes('resource')) rpPrefix = folder;
    }

    return { bpPrefix, rpPrefix };
  };

  const getExistingItems = (bpPrefix) => {
    const files = vfs.getFiles ? vfs.getFiles() : (vfs.files || {});
    const itemsList = [];
    const itemPathPrefix = `${bpPrefix}/items/`.toLowerCase();

    Object.keys(files).forEach(path => {
      if (path.toLowerCase().startsWith(itemPathPrefix) && path.endsWith('.json')) {
        itemsList.push(path);
      }
    });

    return itemsList;
  };

  modalBody.innerHTML = `
    <div class="tools-layout">
      <div class="tools-sidebar">
        <h3>🛠 Ferramentas</h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
          <li><button class="tool-tab-btn active" data-tool="item">📦 Criar Item</button></li>
          <li><button class="tool-tab-btn" data-tool="duplicate">👯 Duplicar Item</button></li>
          <li><button class="tool-tab-btn" data-tool="block">🧱 Criar Bloco</button></li>
          <li><button class="tool-tab-btn" data-tool="entity">👻 Criar Mob</button></li>
          <li><button class="tool-tab-btn" data-tool="uuid">🔑 Gerador UUID</button></li>
        </ul>
      </div>
      <div id="tools-form-container"></div>
    </div>
  `;

  const sanitizeIdentifier = (rawInput, defaultPrefix = 'custom') => {
    let cleaned = rawInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleaned) return `${defaultPrefix}:new_entry`;
    if (!cleaned.includes(':')) {
      cleaned = `${defaultPrefix}:${cleaned}`;
    }
    return cleaned;
  };

  const formContainer = document.getElementById('tools-form-container');

  let itemWizardState = {
    step: 1, type: 'custom', behavior: 'none', displayName: 'Item',
    identifier: 'custom:item', imageFile: null, imagePreviewData: null, maxStack: 64, durability: 0, color: '#3b82f6'
  };

  let duplicateWizardState = {
    selectedFile: '',
    newName: '',
    newIdentifier: '',
    imageFile: null
  };

  let blockWizardState = {
    step: 1, shape: 'solid', behaviors: [], displayName: 'Solid',
    identifier: 'custom:solid', imageFile: null, miningSpeed: 1.5, lightEmission: 0, color: '#8b5a2b'
  };

  let mobWizardState = {
    step: 1, bodyShape: 'two_legged', movement: 'walking', temperament: 'hostile',
    traits: [], displayName: 'Mob', identifier: 'hash:mark', health: 500,
    attackDamage: 0, movementSpeed: 0.25, bodyType: 'humanoid',
    primaryColor: '#4f772d', secondaryColor: '#31572c'
  };

  const renderForm = (toolId) => {
    const { bpPrefix, rpPrefix } = getPackPaths();

    if (toolId === 'item') renderItemWizard(bpPrefix, rpPrefix);
    else if (toolId === 'duplicate') renderDuplicateWizard(bpPrefix, rpPrefix);
    else if (toolId === 'block') renderBlockWizard(bpPrefix, rpPrefix);
    else if (toolId === 'entity') renderMobWizard(bpPrefix, rpPrefix);
    else if (toolId === 'uuid') renderUuidForm();
  };

  // --- WIZARD DE DUPLICAÇÃO DE ITEM ---
  const renderDuplicateWizard = (bpPrefix, rpPrefix) => {
    const itemsList = getExistingItems(bpPrefix);
    
    if (itemsList.length > 0 && !duplicateWizardState.selectedFile) {
      duplicateWizardState.selectedFile = itemsList[0];
    }

    if (itemsList.length === 0) {
      formContainer.innerHTML = `
        <div class="wizard-step-content">
          <h3>👯 Duplicar Item</h3>
          <p style="color: #aaa; margin-top: 10px;">Nenhum item foi encontrado para ser duplicado.</p>
        </div>
      `;
      return;
    }

    formContainer.innerHTML = `
      <div class="wizard-header" style="margin-bottom: 16px;">
        <h3 style="margin-bottom: 4px;">👯 Duplicar Item Existente</h3>
        <span style="font-size: 0.85rem; color: var(--text-main);">Copie um item alterando apenas ID, Nome e Textura.</span>
      </div>

      <div class="wizard-step-content">
        <div class="form-group" style="margin-bottom: 16px;">
          <label>Selecione o Item Base:</label>
          <select id="dup-source-item" style="width: 100%; padding: 8px; background: #222; color: #fff; border: 1px solid var(--border-color); border-radius: 4px;">
            ${itemsList.map(filePath => {
              const fileName = filePath.split('/').pop();
              return `<option value="${filePath}" ${duplicateWizardState.selectedFile === filePath ? 'selected' : ''}>${fileName}</option>`;
            }).join('')}
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label>Novo Nome de Exibição (Display Name):</label>
          <input type="text" id="dup-item-name" value="${duplicateWizardState.newName}" placeholder="Ex: Oi Pp">
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label>Novo Item ID (sem namespace):</label>
          <input type="text" id="dup-item-id" value="${duplicateWizardState.newIdentifier}" placeholder="Ex: oi_pp">
        </div>

        <div class="form-group" style="margin-bottom: 20px;">
          <label>Nova Textura (PNG):</label>
          <div style="display: flex; align-items: center; gap: 12px;">
            <input type="file" id="dup-item-file" accept="image/png" style="flex: 1;">
            <div id="dup-image-preview" style="width: 128px; height: 128px; border: 1px dashed var(--border-color); border-radius: 6px; display: flex; align-items: center; justify-content: center; background: #111; overflow: hidden; flex-shrink: 0;">
              <span style="font-size: 0.7rem; color: #666;">Preview</span>
            </div>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border-color);">
        <button id="btn-dup-save" class="btn btn-accent">✓ Duplicar e Salvar</button>
      </div>
    `;

    const selectEl = document.getElementById('dup-source-item');
    const previewContainer = document.getElementById('dup-image-preview');

    selectEl.onchange = (e) => { duplicateWizardState.selectedFile = e.target.value; };
    document.getElementById('dup-item-name').oninput = (e) => { duplicateWizardState.newName = e.target.value; };
    document.getElementById('dup-item-id').oninput = (e) => { duplicateWizardState.newIdentifier = e.target.value; };

    document.getElementById('dup-item-file').onchange = (e) => {
      const file = e.target.files[0] || null;
      duplicateWizardState.imageFile = file;

      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          previewContainer.innerHTML = `<img src="${event.target.result}" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated;">`;
        };
        reader.readAsDataURL(file);
      } else {
        previewContainer.innerHTML = `<span style="font-size: 0.7rem; color: #666;">Preview</span>`;
      }
    };

    document.getElementById('btn-dup-save').onclick = async () => {
      try {
        const sourcePath = selectEl.value;

        let rawData = null;
        if (typeof vfs.readFile === 'function') {
          try { rawData = await vfs.readFile(sourcePath); } catch (e) {}
        }
        if (!rawData && vfs.files) {
          rawData = vfs.files[sourcePath] || vfs.files['/' + sourcePath];
        }

        if (!rawData) {
          alert(`Erro ao ler o arquivo base: ${sourcePath}`);
          return;
        }

        let jsonString = typeof rawData === 'object' && rawData !== null && rawData.content !== undefined ? rawData.content : rawData;
        let jsonContent = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;

        let baseNamespace = 'custom';
        const baseIdentifier = jsonContent["minecraft:item"]?.description?.identifier;
        if (baseIdentifier && baseIdentifier.includes(':')) {
          baseNamespace = baseIdentifier.split(':')[0];
        }

        const rawShortName = (duplicateWizardState.newIdentifier || 'duplicated_item')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/^[^:]+:/, '');

        const shortName = rawShortName || 'duplicated_item';
        const fullIdentifier = `${baseNamespace}:${shortName}`;
        const newPath = `${bpPrefix}/items/${shortName}.json`;

        if (!jsonContent["minecraft:item"]) jsonContent["minecraft:item"] = {};
        if (!jsonContent["minecraft:item"].description) jsonContent["minecraft:item"].description = {};
        jsonContent["minecraft:item"].description.identifier = fullIdentifier;

        if (!jsonContent["minecraft:item"].components) jsonContent["minecraft:item"].components = {};

        if (duplicateWizardState.newName) {
          jsonContent["minecraft:item"].components["minecraft:display_name"] = { value: duplicateWizardState.newName };
        }
        jsonContent["minecraft:item"].components["minecraft:icon"] = { texture: shortName };

        const finalJsonString = JSON.stringify(jsonContent, null, 2);
        if (typeof vfs.writeFile === 'function') {
          await vfs.writeFile(newPath, finalJsonString, false);
        } else if (vfs.files) {
          vfs.files[newPath] = { content: finalJsonString, isImage: false };
        }

        if (duplicateWizardState.imageFile) {
          const texturePath = `${rpPrefix}/textures/items/${shortName}.png`;
          
          await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
              const dataUrl = e.target.result;
              if (typeof vfs.writeFile === 'function') {
                await vfs.writeFile(texturePath, dataUrl, true);
              } else if (vfs.files) {
                vfs.files[texturePath] = { content: dataUrl, isImage: true };
              }
              resolve();
            };
            reader.readAsDataURL(duplicateWizardState.imageFile);
          });
        }

        const itemTexturePath = `${rpPrefix}/textures/item_texture.json`;
        let textureDataRaw = null;

        if (typeof vfs.readFile === 'function') {
          try { textureDataRaw = await vfs.readFile(itemTexturePath); } catch (e) {}
        }
        if (!textureDataRaw && vfs.files) {
          textureDataRaw = vfs.files[itemTexturePath] || vfs.files['/' + itemTexturePath];
        }

        let textureJson = { resource_pack_name: "vanilla", texture_name: "atlas.items", texture_data: {} };
        if (textureDataRaw) {
          let rawTexString = typeof textureDataRaw === 'object' && textureDataRaw.content !== undefined ? textureDataRaw.content : textureDataRaw;
          try { textureJson = typeof rawTexString === 'string' ? JSON.parse(rawTexString) : rawTexString; } catch (e) {}
        }

        if (!textureJson.texture_data) textureJson.texture_data = {};

        textureJson.texture_data[shortName] = {
          textures: `textures/items/${shortName}`
        };

        const updatedTextureString = JSON.stringify(textureJson, null, 2);
        if (typeof vfs.writeFile === 'function') {
          await vfs.writeFile(itemTexturePath, updatedTextureString, false);
        } else if (vfs.files) {
          vfs.files[itemTexturePath] = { content: updatedTextureString, isImage: false };
        }

        if (typeof modalEl.close === 'function') modalEl.close();
        if (onSuccess) onSuccess(newPath);

      } catch (err) {
        console.error("Erro ao duplicar item:", err);
        alert("Ocorreu um erro ao duplicar o item. Verifique o console do navegador.");
      }
    };
  };

  // --- WIZARD DE ITEM ---
  const renderItemWizard = (bpPrefix, rpPrefix) => {
    const step = itemWizardState.step;

    const headerHtml = `
      <div class="wizard-header" style="margin-bottom: 16px;">
        <h3 style="margin-bottom: 4px;">📦 Criar Item</h3>
        <span style="font-size: 0.85rem; color: var(--text-main);">Passo ${step} de 3</span>
        <div style="display: flex; gap: 6px; margin-top: 10px;">
          <div style="height: 4px; flex: 1; border-radius: 2px; background: ${step >= 1 ? 'var(--accent)' : 'var(--border-color)'};"></div>
          <div style="height: 4px; flex: 1; border-radius: 2px; background: ${step >= 2 ? 'var(--accent)' : 'var(--border-color)'};"></div>
          <div style="height: 4px; flex: 1; border-radius: 2px; background: ${step >= 3 ? 'var(--accent)' : 'var(--border-color)'};"></div>
        </div>
      </div>
    `;

    let bodyHtml = '';
    if (step === 1) {
      bodyHtml = `
        <div style="margin-bottom: 18px;">
          <label style="font-size: 0.82rem; font-weight: 700; color: #888; text-transform: uppercase;">TIPO DE ITEM</label>
          <div class="wizard-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; margin-top: 8px;">
            ${[
              { id: 'sword', label: '⚔️ Sword', desc: 'Arma de combate' },
              { id: 'pickaxe', label: '⛏️ Pickaxe', desc: 'Mineração' },
              { id: 'axe', label: '🪓 Axe', desc: 'Corte de madeira' },
              { id: 'shovel', label: '🪏 Shovel', desc: 'Escavação' },
              { id: 'helmet', label: '🪖 Helmet', desc: 'Armadura' },
              { id: 'custom', label: '📦 Custom Item', desc: 'Item genérico' }
            ].map(t => `
              <div class="wizard-card ${itemWizardState.type === t.id ? 'active' : ''}" data-type="${t.id}">
                <div style="font-weight: 600; font-size: 0.9rem;">${t.label}</div>
                <small style="font-size: 0.75rem; opacity: 0.7; display: block; margin-top: 2px;">${t.desc}</small>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (step === 2) {
      bodyHtml = `
        <div class="form-group" style="margin-bottom: 16px;">
          <label>Nome de Exibição (Display Name):</label>
          <input type="text" id="wizard-item-name" value="${itemWizardState.displayName}">
        </div>
        <div class="form-group" style="margin-bottom: 16px;">
          <label>Item ID / Identifier:</label>
          <input type="text" id="wizard-item-id" value="${itemWizardState.identifier}">
        </div>
        <div class="form-group" style="margin-bottom: 20px;">
          <label>Textura (Imagem PNG):</label>
          <div style="display: flex; align-items: center; gap: 12px;">
            <input type="file" id="wizard-item-file" accept="image/png" style="flex: 1;">
            <div id="item-image-preview" style="width: 128px; height: 128px; border: 1px dashed var(--border-color); border-radius: 6px; display: flex; align-items: center; justify-content: center; background: #111; overflow: hidden; flex-shrink: 0;">
              ${itemWizardState.imagePreviewData 
                ? `<img src="${itemWizardState.imagePreviewData}" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated;">`
                : `<span style="font-size: 0.7rem; color: #666;">Preview</span>`}
            </div>
          </div>
        </div>
      `;
    } else if (step === 3) {
      bodyHtml = `
        <div class="form-group" style="margin-bottom: 20px;">
          <label>Max Stack Size: <strong id="val-stack">${itemWizardState.maxStack}</strong></label>
          <input type="range" id="wizard-stack" min="1" max="64" value="${itemWizardState.maxStack}" style="width: 100%; accent-color: var(--accent);">
        </div>
        <div class="form-group" style="margin-bottom: 20px;">
          <label>Durabilidade: <strong id="val-durability">${itemWizardState.durability === 0 ? 'Sem durabilidade' : itemWizardState.durability}</strong></label>
          <input type="range" id="wizard-durability" min="0" max="2000" step="10" value="${itemWizardState.durability}" style="width: 100%; accent-color: var(--accent);">
        </div>
      `;
    }

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border-color);">
        <button id="btn-wizard-back" class="btn btn-secondary" ${step === 1 ? 'disabled style="opacity: 0.5;"' : ''}>← Voltar</button>
        <button id="btn-wizard-next" class="btn btn-accent">${step === 3 ? '✓ Criar Item' : 'Próximo →'}</button>
      </div>
    `;

    formContainer.innerHTML = headerHtml + `<div class="wizard-step-content">${bodyHtml}</div>` + footerHtml;

    if (step === 1) {
      formContainer.querySelectorAll('[data-type]').forEach(card => {
        card.onclick = () => { itemWizardState.type = card.getAttribute('data-type'); renderItemWizard(bpPrefix, rpPrefix); };
      });
    } else if (step === 2) {
      document.getElementById('wizard-item-name').oninput = (e) => { itemWizardState.displayName = e.target.value; };
      document.getElementById('wizard-item-id').oninput = (e) => { itemWizardState.identifier = e.target.value; };
      
      const fileInput = document.getElementById('wizard-item-file');
      const previewContainer = document.getElementById('item-image-preview');

      fileInput.onchange = (e) => {
        const file = e.target.files[0] || null;
        itemWizardState.imageFile = file;

        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            itemWizardState.imagePreviewData = event.target.result;
            if (previewContainer) {
              previewContainer.innerHTML = `<img src="${event.target.result}" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated;">`;
            }
          };
          reader.readAsDataURL(file);
        } else {
          itemWizardState.imagePreviewData = null;
          if (previewContainer) {
            previewContainer.innerHTML = `<span style="font-size: 0.7rem; color: #666;">Preview</span>`;
          }
        }
      };
    } else if (step === 3) {
      document.getElementById('wizard-stack').oninput = (e) => {
        itemWizardState.maxStack = parseInt(e.target.value);
        document.getElementById('val-stack').textContent = e.target.value;
      };
      document.getElementById('wizard-durability').oninput = (e) => {
        const val = parseInt(e.target.value);
        itemWizardState.durability = val;
        document.getElementById('val-durability').textContent = val === 0 ? 'Sem durabilidade' : val;
      };
    }

    document.getElementById('btn-wizard-back').onclick = () => {
      if (itemWizardState.step > 1) { itemWizardState.step--; renderItemWizard(bpPrefix, rpPrefix); }
    };

    document.getElementById('btn-wizard-next').onclick = async () => {
      if (itemWizardState.step < 3) {
        itemWizardState.step++;
        renderItemWizard(bpPrefix, rpPrefix);
      } else {
        try {
          const identifier = sanitizeIdentifier(itemWizardState.identifier, 'custom');
          const shortName = identifier.split(':')[1];
          const itemPath = `${bpPrefix}/items/${shortName}.json`;

          const components = {
            "minecraft:icon": { texture: shortName },
            "minecraft:display_name": { value: itemWizardState.displayName },
            "minecraft:max_stack_size": itemWizardState.maxStack
          };
          if (itemWizardState.durability > 0) components["minecraft:durability"] = { max_durability: itemWizardState.durability };

          const itemData = { format_version: "1.20.50", "minecraft:item": { description: { identifier }, components } };
          
          if (typeof vfs.writeFile === 'function') {
            await vfs.writeFile(itemPath, JSON.stringify(itemData, null, 2), false);
          } else if (vfs.files) {
            vfs.files[itemPath] = { content: JSON.stringify(itemData, null, 2), isImage: false };
          }

          if (itemWizardState.imagePreviewData) {
            const texturePath = `${rpPrefix}/textures/items/${shortName}.png`;
            if (typeof vfs.writeFile === 'function') {
              await vfs.writeFile(texturePath, itemWizardState.imagePreviewData, true);
            } else if (vfs.files) {
              vfs.files[texturePath] = { content: itemWizardState.imagePreviewData, isImage: true };
            }

            const itemTexturePath = `${rpPrefix}/textures/item_texture.json`;
            let textureDataRaw = null;

            if (typeof vfs.readFile === 'function') {
              try { textureDataRaw = await vfs.readFile(itemTexturePath); } catch (e) {}
            }
            if (!textureDataRaw && vfs.files) {
              textureDataRaw = vfs.files[itemTexturePath] || vfs.files['/' + itemTexturePath];
            }

            let textureJson = { resource_pack_name: "vanilla", texture_name: "atlas.items", texture_data: {} };
            if (textureDataRaw) {
              let rawTexString = typeof textureDataRaw === 'object' && textureDataRaw.content !== undefined ? textureDataRaw.content : textureDataRaw;
              try { textureJson = typeof rawTexString === 'string' ? JSON.parse(rawTexString) : rawTexString; } catch (e) {}
            }

            if (!textureJson.texture_data) textureJson.texture_data = {};
            textureJson.texture_data[shortName] = { textures: `textures/items/${shortName}` };

            const updatedTextureString = JSON.stringify(textureJson, null, 2);
            if (typeof vfs.writeFile === 'function') {
              await vfs.writeFile(itemTexturePath, updatedTextureString, false);
            } else if (vfs.files) {
              vfs.files[itemTexturePath] = { content: updatedTextureString, isImage: false };
            }
          }

          if (typeof modalEl.close === 'function') modalEl.close();
          if (onSuccess) onSuccess(itemPath);

        } catch (err) {
          console.error("Erro ao criar item:", err);
          alert("Ocorreu um erro ao criar o item. Verifique o console.");
        }
      }
    };
  };

  // --- WIZARD DE BLOCO ---
  const renderBlockWizard = (bpPrefix, rpPrefix) => {
    const step = blockWizardState.step;

    const headerHtml = `
      <div class="wizard-header" style="margin-bottom: 16px;">
        <h3 style="margin-bottom: 4px;">🧱 Criar Bloco</h3>
        <span style="font-size: 0.85rem; color: var(--text-main);">Passo ${step} de 3</span>
        <div style="display: flex; gap: 6px; margin-top: 10px;">
          <div style="height: 4px; flex: 1; border-radius: 2px; background: ${step >= 1 ? 'var(--accent)' : 'var(--border-color)'};"></div>
          <div style="height: 4px; flex: 1; border-radius: 2px; background: ${step >= 2 ? 'var(--accent)' : 'var(--border-color)'};"></div>
          <div style="height: 4px; flex: 1; border-radius: 2px; background: ${step >= 3 ? 'var(--accent)' : 'var(--border-color)'};"></div>
        </div>
      </div>
    `;

    let bodyHtml = '';
    if (step === 1) {
      bodyHtml = `
        <div style="margin-bottom: 18px;">
          <label style="font-size: 0.82rem; font-weight: 700; color: #888; text-transform: uppercase;">FORMATO DO BLOCO</label>
          <div class="wizard-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; margin-top: 8px;">
            ${[
              { id: 'solid', label: '🧊 Solid', desc: 'Bloco sólido' },
              { id: 'transparent', label: '🪟 Transparent', desc: 'Translúcido' },
              { id: 'slab', label: '🧱 Slab', desc: 'Meio bloco' },
              { id: 'stairs', label: '🪵 Stairs', desc: 'Escada' }
            ].map(s => `
              <div class="wizard-card ${blockWizardState.shape === s.id ? 'active' : ''}" data-shape="${s.id}">
                <div style="font-weight: 600; font-size: 0.9rem;">${s.label}</div>
                <small style="font-size: 0.75rem; opacity: 0.7; display: block; margin-top: 2px;">${s.desc}</small>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (step === 2) {
      bodyHtml = `
        <div class="form-group" style="margin-bottom: 16px;">
          <label>Nome de Exibição:</label>
          <input type="text" id="wizard-block-name" value="${blockWizardState.displayName}">
        </div>
        <div class="form-group" style="margin-bottom: 16px;">
          <label>Block ID:</label>
          <input type="text" id="wizard-block-id" value="${blockWizardState.identifier}">
        </div>
      `;
    } else if (step === 3) {
      bodyHtml = `
        <div class="form-group" style="margin-bottom: 20px;">
          <label>Mining Speed: <strong id="val-mining">${blockWizardState.miningSpeed}s</strong></label>
          <input type="range" id="wizard-mining" min="0" max="10" step="0.1" value="${blockWizardState.miningSpeed}" style="width: 100%; accent-color: var(--accent);">
        </div>
      `;
    }

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border-color);">
        <button id="btn-block-back" class="btn btn-secondary" ${step === 1 ? 'disabled style="opacity: 0.5;"' : ''}>← Voltar</button>
        <button id="btn-block-next" class="btn btn-accent">${step === 3 ? '✓ Criar Bloco' : 'Próximo →'}</button>
      </div>
    `;

    formContainer.innerHTML = headerHtml + `<div class="wizard-step-content">${bodyHtml}</div>` + footerHtml;

    if (step === 1) {
      formContainer.querySelectorAll('[data-shape]').forEach(card => {
        card.onclick = () => { blockWizardState.shape = card.getAttribute('data-shape'); renderBlockWizard(bpPrefix, rpPrefix); };
      });
    } else if (step === 2) {
      document.getElementById('wizard-block-name').oninput = (e) => { blockWizardState.displayName = e.target.value; };
      document.getElementById('wizard-block-id').oninput = (e) => { blockWizardState.identifier = e.target.value; };
    } else if (step === 3) {
      document.getElementById('wizard-mining').oninput = (e) => {
        blockWizardState.miningSpeed = parseFloat(e.target.value);
        document.getElementById('val-mining').textContent = e.target.value + 's';
      };
    }

    document.getElementById('btn-block-back').onclick = () => {
      if (blockWizardState.step > 1) { blockWizardState.step--; renderBlockWizard(bpPrefix, rpPrefix); }
    };

    document.getElementById('btn-block-next').onclick = () => {
      if (blockWizardState.step < 3) {
        blockWizardState.step++;
        renderBlockWizard(bpPrefix, rpPrefix);
      } else {
        const identifier = sanitizeIdentifier(blockWizardState.identifier, 'custom');
        const shortName = identifier.split(':')[1];
        const blockPath = `${bpPrefix}/blocks/${shortName}.json`;

        const blockData = {
          format_version: "1.20.50",
          "minecraft:block": {
            description: { identifier },
            components: { "minecraft:destroy_time": blockWizardState.miningSpeed }
          }
        };

        vfs.writeFile(blockPath, JSON.stringify(blockData, null, 2), false);
        modalEl.close();
        if (onSuccess) onSuccess(blockPath);
      }
    };
  };

  // --- WIZARD DE MOB ---
  const renderMobWizard = (bpPrefix, rpPrefix) => {
    const step = mobWizardState.step;

    const headerHtml = `
      <div class="wizard-header" style="margin-bottom: 16px;">
        <h3 style="margin-bottom: 4px;">👻 Create Mob</h3>
        <span style="font-size: 0.85rem; color: var(--text-main);">Step ${step} of 4</span>
      </div>
    `;

    let bodyHtml = `
      <div class="form-group" style="margin-bottom: 16px;">
        <label>Display Name:</label>
        <input type="text" id="wizard-mob-name" value="${mobWizardState.displayName}">
      </div>
      <div class="form-group" style="margin-bottom: 20px;">
        <label>Mob ID:</label>
        <input type="text" id="wizard-mob-id" value="${mobWizardState.identifier}">
      </div>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border-color);">
        <button id="btn-mob-save" class="btn btn-accent">✓ Criar Mob</button>
      </div>
    `;

    formContainer.innerHTML = headerHtml + `<div class="wizard-step-content">${bodyHtml}</div>` + footerHtml;

    document.getElementById('wizard-mob-name').oninput = (e) => { mobWizardState.displayName = e.target.value; };
    document.getElementById('wizard-mob-id').oninput = (e) => { mobWizardState.identifier = e.target.value; };

    document.getElementById('btn-mob-save').onclick = () => {
      const identifier = sanitizeIdentifier(mobWizardState.identifier, 'custom');
      const shortName = identifier.split(':')[1];
      const mobPath = `${bpPrefix}/entities/${shortName}.json`;

      const entityData = {
        format_version: "1.21.40",
        "minecraft:entity": {
          description: { identifier, is_spawnable: false, is_summonable: true },
          components: {
            "minecraft:nameable": { allow_name_tag_renaming: false, always_show: false },
            "minecraft:health": { value: mobWizardState.health, max: mobWizardState.health, min: 1 }
          }
        }
      };

      vfs.writeFile(mobPath, JSON.stringify(entityData, null, 2), false);
      modalEl.close();
      if (onSuccess) onSuccess(mobPath);
    };
  };

  const renderUuidForm = () => {
    formContainer.innerHTML = `
      <div class="wizard-step-content">
        <h3>🔑 Gerador de UUID v4</h3>
        <div class="form-group" style="margin-bottom: 20px;">
          <label>UUID Gerado:</label>
          <input type="text" id="tool-uuid-value" value="${crypto.randomUUID()}" readonly style="background:#111; color:var(--accent); font-weight:bold;">
        </div>
        <div style="display:flex; gap:10px;">
          <button id="btn-refresh-uuid" class="btn btn-accent">Gerar Novo UUID</button>
          <button id="btn-copy-uuid" class="btn btn-secondary">Copiar</button>
        </div>
      </div>
    `;
    document.getElementById('btn-refresh-uuid').onclick = () => {
      document.getElementById('tool-uuid-value').value = crypto.randomUUID();
    };
    document.getElementById('btn-copy-uuid').onclick = () => {
      navigator.clipboard.writeText(document.getElementById('tool-uuid-value').value);
      alert('UUID copiado!');
    };
  };

  modalBody.querySelectorAll('.tool-tab-btn').forEach(btn => {
    btn.onclick = () => {
      modalBody.querySelectorAll('.tool-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      itemWizardState.step = 1;
      blockWizardState.step = 1;
      mobWizardState.step = 1;
      renderForm(btn.getAttribute('data-tool'));
    };
  });

  renderForm('item');
  modalEl.showModal();
}