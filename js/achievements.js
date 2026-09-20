const ACHIEVEMENTS = [
  { id: "first_cmd",  icon: "🎯", name: "Первая команда",  desc: "1 команда",
    check: (g) => g.shell.history.length >= 1 },
  { id: "ten_cmds",   icon: "🔟", name: "Десятка",         desc: "10 команд",
    check: (g) => g.shell.history.length >= 10 },
  { id: "fifty_cmds", icon: "💯", name: "Полсотни",        desc: "50 команд",
    check: (g) => g.shell.history.length >= 50 },
  { id: "pipes",      icon: "🔗", name: "Мастер пайпов",   desc: "| × 5",
    check: (g) => g.shell.history.filter(h => h.includes("|")).length >= 5 },
  { id: "redirects",  icon: "➡️", name: "Режиссёр",        desc: "> и >>",
    check: (g) => g.shell.history.some(h => h.includes(">>")) && g.shell.history.some(h => /[^>]>[^>]/.test(h)) },
  { id: "vim_user",   icon: "📝", name: "Ви-мастер",       desc: "Открыл vim",
    check: (g) => g.shell.history.some(h => /^vim /.test(h)) },
  { id: "networker",  icon: "🌐", name: "Сетевой",         desc: "ping/curl",
    check: (g) => g.shell.history.some(h => /^(ping|curl|wget)/.test(h)) },
  { id: "sysadmin",   icon: "🛠️", name: "Системный",       desc: "systemctl",
    check: (g) => g.shell.history.some(h => h.includes("systemctl")) },
  { id: "root",       icon: "👑", name: "Root-доступ",     desc: "sudo",
    check: (g) => g.shell.history.some(h => h.startsWith("sudo")) },
  { id: "half_way",   icon: "🏃", name: "Полпути",         desc: "9 миссий",
    check: (g) => g.levelIdx >= 9 },
  { id: "master",     icon: "🏆", name: "Мастер Linux",    desc: "18 миссий",
    check: (g) => g.levelIdx >= 18 },
  { id: "exam_pass",  icon: "🎓", name: "Экзамен сдан",    desc: "Прошёл экзамен",
    check: (g) => g._examPassed === true },
];

class AchievementSystem {
  constructor(game) {
    this.game = game;
    this.unlocked = new Set();
    this._load();
  }

  check() {
    for (const a of ACHIEVEMENTS) {
      if (this.unlocked.has(a.id)) continue;
      try {
        if (a.check(this.game)) this._unlock(a);
      } catch {}
    }
  }

  _unlock(a) {
    this.unlocked.add(a.id);
    this.game.score += 50;
    this.game._toast(`🎖️ ${a.icon} ${a.name} (+50)`);   // всплывающее уведомление справа снизу
    this._save();
    this.render();
  }

  render() {
    const panel = document.getElementById("achievementsPanel");
    if (!panel) return;
    panel.innerHTML = ACHIEVEMENTS.map(a => {
      const on = this.unlocked.has(a.id);
      return `<div class="ach ${on ? "on" : ""}" title="${a.desc}">
        <span class="ach-icon">${on ? a.icon : "🔒"}</span>
        <span>${a.name}</span>
      </div>`;
    }).join("");
  }

  _save() { localStorage.setItem("linux_quest_ach", JSON.stringify([...this.unlocked])); }
  _load() {
    try {
      const data = JSON.parse(localStorage.getItem("linux_quest_ach") || "[]");
      this.unlocked = new Set(data);
    } catch {}
  }
}