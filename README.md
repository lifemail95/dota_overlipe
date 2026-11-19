# 🎮 Dota 2 Tactical Overlay (Electron Standalone & OBS Studio)

Overlay tático de alta performance para Dota 2 com visual estilo transmissão de Esports. Funciona de **forma independente no Windows sem precisar do OBS Studio** (Electron transparente com click-through) ou como **Browser Source no OBS**.

---

## ⚡ Módulos Táticos Integrados

### 1. 📡 Integração com a API do OpenDota (`server.js`)
- Detecção automática do herói escolhido via GSI.
- Busca na API pública do OpenDota:
  - **Popularidade de itens** (`/heroes/{id}/itemPopularity`)
  - **Matchups e taxas de vitória** (`/heroes/{id}/matchups`)
- Cache inteligente em memória (`Map`) para evitar requisições repetidas e garantir resposta instantânea.

### 2. 📊 Monitor de Farm & Timings vs. Immortal
- Compara **Last Hits** e **Net Worth** em tempo real com metas dinâmicas do rank **Immortal**.
- **Botão seletor de perfil**: alterne entre **Offlane/Core** e **Suporte**.
- **Alerta visual discreto**: badge pulsante avisa se o farm estiver mais de **15% atrasado** em relação à meta Immortal.
- **Timings de Itens Chave**: detecta automaticamente no inventário itens como Blink, Battle Fury, BKB, Aghanim, Manta, Force Staff, Mekansm, etc., e compara o minuto exato da compra com o timing médio Immortal (ex: `Blink: 12:40 (Immortal: 14:00) 🟢 -1m20s adiantado`).

### 3. ⭐ Sugestão de Skill Build em Tempo Real
- Monitora `hero.ability_points` e os níveis em `data.abilities`.
- Sempre que houver ponto disponível para upar, um banner pulsante acende na tela indicando a tecla exata (**Q, W, E ou R**) e a habilidade recomendada para o nível atual.

### 4. 🔊 Notificações por Voz (Narrador em Português pt-BR)
- Síntese de voz nativa (`window.speechSynthesis`) que anuncia automaticamente:
  - **Tormentor**: aviso aos **14:45** (*"Atenção, Tormentor nasce em 15 segundos"*) e aos **15:00** (*"Tormentor nasceu! Prepare-se para abater"*).
  - **Roshan**: janela aberta aos **8 minutos** (*"Janela de respawn do Roshan aberta! Fique atento"*) e respawn garantido aos **11 minutos** (*"Roshan renasceu com certeza!"*).
- **Atalho Global `Ctrl + Shift + R`**: registra a morte do Roshan instantaneamente de dentro do jogo.
- Botão no overlay para ativar/silenciar a narração a qualquer momento (`🔊 Voz: ON/OFF`).

### 5. 🎭 Widget de Counter-Pick para a Fase de Draft
- Aparece automaticamente quando o jogo entra em `DOTA_GAMERULES_STATE_HERO_SELECTION`.
- Campo de busca rápida com autocompletar para selecionar até 5 heróis inimigos.
- Calcula e exibe os **Top Counter-Picks** recomendados com base no cruzamento das taxas de vitória da API do OpenDota.

### 6. 💤 Auto-Hide & Persistência Completa
- **Modo Menu Principal**: quando o jogador estiver no menu do Dota 2, os painéis da partida são ocultados automaticamente, exibindo apenas um discreto indicador de standby.
- **Persistência**: posição (top/left), escala (tamanho) e visibilidade de cada widget são salvos automaticamente no `localStorage`.
- **Modo Edição (`Ctrl + Shift + E`)**: permite arrastar, redimensionar pelo puxador `◢` e retirar qualquer widget pelo `✕`.

---

## ⌨️ Atalhos Globais

| Atalho | Ação |
|---|---|
| **`Ctrl + Shift + E`** | Alterna entre **Modo Jogo** (cliques atravessam) e **Modo Edição** (arrastar, redimensionar, retirar) |
| **`Ctrl + Shift + R`** | **Registra Morte do Roshan** (inicia cronômetro e narração de 8m e 11m) |
| **`Ctrl + Shift + Q`** | Fecha o overlay instantaneamente |

---

## 🚀 Como Iniciar

Basta dar dois cliques em:
```text
iniciar_overlay.bat
```
*(Ou executar `npm start` no terminal).*
