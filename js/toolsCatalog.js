export const BEDROCK_TOOLS_CATALOG = {
  generators: {
    title: "Geradores Bedrock",
    tools: [
      { id: "item", name: "Criar Item", icon: "fa-solid fa-cube", desc: "Gera arquivo de item no BP e associa textura no RP." },
      { id: "block", name: "Criar Bloco", icon: "fa-solid fa-cubes", desc: "Gera definição de bloco no BP e blocos de textura no RP." },
      { id: "entity", name: "Criar Entidade", icon: "fa-solid fa-ghost", desc: "Gera arquivo de entidade simples no BP." },
      { id: "uuid", name: "Gerador de UUID", icon: "fa-solid fa-key", desc: "Gera v4 UUIDs únicos para o manifest.json." }
    ]
  }
};