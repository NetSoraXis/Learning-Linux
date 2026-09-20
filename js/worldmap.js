const WORLD_ZONES = [
  { id: "village",  name: "🏘️ Деревня Файлов",    icon: "📁", desc: "Основы", levels: [1, 2, 3], color: "#3fb950", x: 100, y: 200 },
  { id: "library",  name: "📚 Библиотека Текста", icon: "📜", desc: "grep, sort", levels: [4, 8], color: "#58a6ff", x: 300, y: 120 },
  { id: "fortress", name: "🏰 Крепость Прав",     icon: "🔐", desc: "chmod", levels: [5], color: "#d29922", x: 300, y: 280 },
  { id: "workshop", name: "⚙️ Мастерская",        icon: "🔧", desc: "Процессы", levels: [6, 12, 16], color: "#bc8cff", x: 500, y: 200 },
  { id: "harbor",   name: "⚓ Порт Сетей",        icon: "🌐", desc: "ip, ping", levels: [11], color: "#f85149", x: 500, y: 340 },
  { id: "tower",    name: "🗼 Башня Мастера",     icon: "🏆", desc: "Мастерство", levels: [7, 9, 10, 13, 14, 15, 17, 18], color: "#ffd700", x: 700, y: 220 },
];

class WorldMap {
  constructor(game) {
    this.game = game;
    this._inject();
  }

  _inject() {
    const sidebar = document.querySelector(".sidebar");
    const mapDiv = document.createElement("div");
    mapDiv.className = "world-map";
    mapDiv.innerHTML = `
      <div class="map-header">🗺️ Карта мира Linux</div>
      <svg class="map-svg" viewBox="0 0 820 420">${this._render()}</svg>
    `;
    // Вставляем перед достижениями
    const achHeader = Array.from(sidebar.querySelectorAll(".map-header"))
      .find(el => el.textContent.includes("Достижения"));
    if (achHeader) sidebar.insertBefore(mapDiv, achHeader);
    else sidebar.appendChild(mapDiv);
    this._bindClicks(mapDiv);
  }

  _render() {
    const paths = this._drawPaths();
    const zones = WORLD_ZONES.map(z => this._drawZone(z)).join("");
    return paths + zones;
  }

  _drawPaths() {
    const pairs = [
      [0,1],[0,2],[1,3],[2,3],[3,4],[3,5],[4,5]
    ];
    return pairs.map(([a, b]) => {
      const A = WORLD_ZONES[a], B = WORLD_ZONES[b];
      return `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"
                   stroke="#30363d" stroke-width="2" stroke-dasharray="4 4"/>`;
    }).join("");
  }

  _drawZone(z) {
    const unlocked = this.game.levelIdx + 1 >= z.levels[0];
    const completed = this.game.levelIdx >= z.levels[z.levels.length - 1] + 1;
    const opacity = completed ? 1 : unlocked ? 0.9 : 0.35;
    const ring = completed ? "#ffd700" : unlocked ? z.color : "#30363d";
    return `
      <g class="zone" data-zone="${z.id}" style="cursor:${unlocked ? "pointer" : "not-allowed"};opacity:${opacity}">
        <circle cx="${z.x}" cy="${z.y}" r="34" fill="${z.color}" opacity="0.15"/>
        <circle cx="${z.x}" cy="${z.y}" r="28" fill="#0d1117" stroke="${ring}" stroke-width="3"/>
        <text x="${z.x}" y="${z.y + 8}" text-anchor="middle" font-size="22" fill="${z.color}">${unlocked ? z.icon : "🔒"}</text>
        <text x="${z.x}" y="${z.y + 52}" text-anchor="middle" font-size="10"
              fill="#c9d1d9" font-family="monospace">${z.desc}</text>
      </g>
    `;
  }

  _bindClicks(container) {
    container.querySelectorAll(".zone").forEach(el => {
      el.addEventListener("click", () => {
        const zone = WORLD_ZONES.find(z => z.id === el.dataset.zone);
        if (!zone) return;
        const targetLevel = zone.levels[0] - 1;
        if (this.game.levelIdx + 1 < zone.levels[0]) {
          this.game._toast("🔒 Зона пока закрыта");
          return;
        }
        this.game.levelIdx = targetLevel;
        this.game.taskIdx = 0;
        this.game._render();
        this.game._print(`<span class="out-info">🗺️ Переход в зону: ${zone.name}</span>`);
      });
    });
  }

  refresh() {
    const svg = document.querySelector(".map-svg");
    if (!svg) return;
    svg.innerHTML = this._render();
    this._bindClicks(svg.parentElement);
  }
}