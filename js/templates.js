export const TEMPLATES = {
  scriptApi: {
    name: 'Script API Addon (Bedrock)',
    files: {
      'BP/manifest.json': JSON.stringify({
        format_version: 2,
        header: {
          name: "My Script Addon",
          description: "Criado no Hash Addon Studio",
          uuid: crypto.randomUUID(),
          version: [1, 0, 0],
          min_engine_version: [1, 20, 50]
        },
        modules: [
          {
            type: "data",
            uuid: crypto.randomUUID(),
            version: [1, 0, 0]
          },
          {
            type: "script",
            language: "javascript",
            uuid: crypto.randomUUID(),
            entry: "scripts/main.js",
            version: [1, 0, 0]
          }
        ],
        dependencies: [
          {
            module_name: "@minecraft/server",
            version: "1.8.0"
          }
        ]
      }, null, 2),
      'BP/scripts/main.js': `import { world, system } from "@minecraft/server";\n\nworld.afterEvents.worldInitialize.subscribe((event) => {\n  system.runInterval(() => {\n    // Log do servidor rodando\n  }, 20);\n});\n\nworld.afterEvents.playerSpawn.subscribe((event) => {\n  event.player.sendMessage("§aBem-vindo ao mapa com Addon criado via Hash Addon Studio!");\n});`
    }
  }
};