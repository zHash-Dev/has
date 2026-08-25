export function registerMinecraftAutocomplete(monaco) {
  monaco.languages.registerCompletionItemProvider('javascript', {
    provideCompletionItems: (model, position) => {
      const suggestions = [
        {
          label: 'import @minecraft/server',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'import { world, system, Player, Entity, ItemStack } from "@minecraft/server";',
          detail: 'Importar módulo primário da Bedrock Script API'
        },
        {
          label: 'world.afterEvents.playerSpawn',
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: 'world.afterEvents.playerSpawn.subscribe((event) => {\n  ${1:// code}\n});',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Evento de spawn do jogador'
        },
        {
          label: 'system.runInterval',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'system.runInterval(() => {\n  ${1:// code}\n}, ${2:20});',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Executar código periodicamente (ticks)'
        }
      ];
      return { suggestions };
    }
  });
}