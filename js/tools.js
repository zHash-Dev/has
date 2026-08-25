export function generateUUID() {
  return crypto.randomUUID();
}

export function openToolsModal(vfs, modalContainer, catalog, onFileCreated) {
  const modalBody = document.getElementById('modal-body');
  if (!modalBody) return;

  let html = `
    <h2>Bedrock Tools & Generators</h2>
    <hr style="margin:10px 0; border-color:var(--border-color);">
    <div class="tools-tab-bar" style="display:flex; gap:8px; margin-bottom:12px;">
      <button id="tab-btn-generators" class="btn btn-primary">Geradores</button>
      <button id="tab-btn-uuid" class="btn btn-secondary">Gerador de UUID</button>
    </div>

    <div id="tools-tab-content"></div>
  `;

  modalBody.innerHTML = html;

  const tabContent = document.getElementById('tools-tab-content');

  const renderGenerators = () => {
    tabContent.innerHTML = `
      <div class="generator-options" style="display:flex; flex-direction:column; gap:12px;">
        <button id="gen-item-btn" class="btn btn-secondary" style="padding:10px; text-align:left;">
          <i class="bx bx-cube"></i> <strong>Criar Novo Item (JSON)</strong>
          <div style="font-size:0.75rem; opacity:0.8;">Gera um item customizado em BP/items/</div>
        </button>

        <button id="gen-block-btn" class="btn btn-secondary" style="padding:10px; text-align:left;">
          <i class="bx bx-category"></i> <strong>Criar Novo Bloco (JSON)</strong>
          <div style="font-size:0.75rem; opacity:0.8;">Gera um bloco customizado em BP/blocks/</div>
        </button>

        <button id="gen-entity-btn" class="btn btn-secondary" style="padding:10px; text-align:left;">
          <i class="bx bx-ghost"></i> <strong>Criar Nova Entidade (JSON)</strong>
          <div style="font-size:0.75rem; opacity:0.8;">Gera uma entidade customizada em BP/entities/</div>
        </button>
      </div>
    `;

    document.getElementById('gen-item-btn').onclick = () => renderItemForm(vfs, modalContainer, onFileCreated);
    document.getElementById('gen-block-btn').onclick = () => renderBlockForm(vfs, modalContainer, onFileCreated);
    document.getElementById('gen-entity-btn').onclick = () => renderEntityForm(vfs, modalContainer, onFileCreated);
  };

  const renderUUID = () => {
    tabContent.innerHTML = `
      <h3>Gerador de UUID</h3>
      <div style="display:flex; gap:10px; margin-top:8px;">
        <input type="text" id="uuid-output" value="${generateUUID()}" readonly style="flex:1; background:#222; color:#fff; border:1px solid var(--border-color); padding:6px; border-radius:4px; font-family:monospace;">
        <button id="btn-copy-uuid" class="btn btn-primary">Copiar</button>
        <button id="btn-gen-uuid" class="btn btn-accent">Gerar Novo</button>
      </div>
    `;
    document.getElementById('btn-gen-uuid').onclick = () => {
      document.getElementById('uuid-output').value = generateUUID();
    };
    document.getElementById('btn-copy-uuid').onclick = () => {
      navigator.clipboard.writeText(document.getElementById('uuid-output').value);
      alert('UUID copiado para a área de transferência!');
    };
  };

  document.getElementById('tab-btn-generators').onclick = () => renderGenerators();
  document.getElementById('tab-btn-uuid').onclick = () => renderUUID();

  renderGenerators();
  modalContainer.showModal();
}

// Formulário: Criar Item
function renderItemForm(vfs, modalContainer, onFileCreated) {
  const tabContent = document.getElementById('tools-tab-content');
  tabContent.innerHTML = `
    <h3>Criar Item Customizado</h3>
    <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
      <label>Identifier (ex: custom:ruby):</label>
      <input type="text" id="item-id" value="custom:my_item" style="padding:6px; background:#222; color:#fff; border:1px solid #444;">
      
      <label>Nome do Arquivo (sem .json):</label>
      <input type="text" id="item-filename" value="my_item" style="padding:6px; background:#222; color:#fff; border:1px solid #444;">

      <button id="btn-create-item-confirm" class="btn btn-accent" style="margin-top:10px;">Gerar Arquivo de Item</button>
    </div>
  `;

  document.getElementById('btn-create-item-confirm').onclick = () => {
    const identifier = document.getElementById('item-id').value.trim() || 'custom:my_item';
    const filename = document.getElementById('item-filename').value.trim() || 'my_item';
    const path = `BP/items/${filename}.json`;

    const jsonContent = {
      format_version: "1.20.50",
      "minecraft:item": {
        description: {
          identifier: identifier,
          category: "items"
        },
        components: {
          "minecraft:icon": {
            texture: filename
          },
          "minecraft:display_name": {
            value: identifier.split(':')[1] || filename
          }
        }
      }
    };

    vfs.writeFile(path, JSON.stringify(jsonContent, null, 2), false);
    modalContainer.close();
    if (onFileCreated) onFileCreated(path);
  };
}

// Formulário: Criar Bloco
function renderBlockForm(vfs, modalContainer, onFileCreated) {
  const tabContent = document.getElementById('tools-tab-content');
  tabContent.innerHTML = `
    <h3>Criar Bloco Customizado</h3>
    <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
      <label>Identifier (ex: custom:ruby_block):</label>
      <input type="text" id="block-id" value="custom:my_block" style="padding:6px; background:#222; color:#fff; border:1px solid #444;">
      
      <label>Nome do Arquivo (sem .json):</label>
      <input type="text" id="block-filename" value="my_block" style="padding:6px; background:#222; color:#fff; border:1px solid #444;">

      <button id="btn-create-block-confirm" class="btn btn-accent" style="margin-top:10px;">Gerar Arquivo de Bloco</button>
    </div>
  `;

  document.getElementById('btn-create-block-confirm').onclick = () => {
    const identifier = document.getElementById('block-id').value.trim() || 'custom:my_block';
    const filename = document.getElementById('block-filename').value.trim() || 'my_block';
    const path = `BP/blocks/${filename}.json`;

    const jsonContent = {
      format_version: "1.20.50",
      "minecraft:block": {
        description: {
          identifier: identifier
        },
        components: {
          "minecraft:destructible_by_mining": {
            seconds_to_destroy: 1.5
          },
          "minecraft:friction": 0.6
        }
      }
    };

    vfs.writeFile(path, JSON.stringify(jsonContent, null, 2), false);
    modalContainer.close();
    if (onFileCreated) onFileCreated(path);
  };
}

// Formulário: Criar Entidade
function renderEntityForm(vfs, modalContainer, onFileCreated) {
  const tabContent = document.getElementById('tools-tab-content');
  tabContent.innerHTML = `
    <h3>Criar Entidade Customizada</h3>
    <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
      <label>Identifier (ex: custom:boss):</label>
      <input type="text" id="entity-id" value="custom:my_entity" style="padding:6px; background:#222; color:#fff; border:1px solid #444;">
      
      <label>Nome do Arquivo (sem .json):</label>
      <input type="text" id="entity-filename" value="my_entity" style="padding:6px; background:#222; color:#fff; border:1px solid #444;">

      <button id="btn-create-entity-confirm" class="btn btn-accent" style="margin-top:10px;">Gerar Arquivo de Entidade</button>
    </div>
  `;

  document.getElementById('btn-create-entity-confirm').onclick = () => {
    const identifier = document.getElementById('entity-id').value.trim() || 'custom:my_entity';
    const filename = document.getElementById('entity-filename').value.trim() || 'my_entity';
    const path = `BP/entities/${filename}.json`;

    const jsonContent = {
      format_version: "1.20.50",
      "minecraft:entity": {
        description: {
          identifier: identifier,
          is_spawnable: true,
          is_summonable: true
        },
        components: {
          "minecraft:health": {
            value: 20,
            max: 20
          },
          "minecraft:movement": {
            value: 0.25
          }
        }
      }
    };

    vfs.writeFile(path, JSON.stringify(jsonContent, null, 2), false);
    modalContainer.close();
    if (onFileCreated) onFileCreated(path);
  };
}