const RANKS = [
  { name: "Новичок",        xp: 0,    icon: "🐣" },
  { name: "Terminal User",  xp: 300,  icon: "💻" },
  { name: "Power User",     xp: 800,  icon: "⚡" },
  { name: "Sysadmin",       xp: 1500, icon: "🛠️" },
  { name: "Linux Operator", xp: 2500, icon: "🧙" },
];

class Game {
  constructor() {
    console.log("🎮 Game init...");
    this.fs = new VirtualFS();
    this.shell = new Shell(this.fs);
    this.shell.game = this; 
    this.editor = new Editor(this.fs);
    this.levelIdx = 0;
    this.taskIdx = 0;
    this.score = 0;
    this.taskStartIdx = 0;
    this.examMode = false;
    this.examTasks = [];
    this.historyIdx = -1;

    console.log("📚 Уровней:", LEVELS.length);

    this._bindUI();
    this.worldmap = new WorldMap(this);
    this.achievements = new AchievementSystem(this);
    this.achievements.render();

    this._tryLoadProgress();
    this._render();
    this._printBanner();

    setInterval(() => this._save(true), 30000);
  }

  _bindUI() {
    const input = document.getElementById("cmdInput");
    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        const cmd = input.value;
        input.value = "";
        await this._handleCommand(cmd);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this._navigateHistory(1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        this._navigateHistory(-1);
      }
    });
    input.addEventListener("focus", () => {
      const t = document.getElementById("terminal");
      if (t) t.scrollTop = t.scrollHeight;
    });

    document.getElementById("hintBtn").onclick = () => this._showHint();
    document.getElementById("skipBtn").onclick = () => this._skipTask();
    document.getElementById("saveBtn").onclick = () => this._save();
    document.getElementById("resetBtn").onclick = () => { if (confirm("Сбросить прогресс?")) this._reset(); };
    document.getElementById("examBtn").onclick = () => this._openExam();
    document.getElementById("themeBtn").onclick = () => this._toggleTheme();
    document.getElementById("clearBtn").onclick = () => this._clearTerminal();
    document.getElementById("closeVictory").onclick = () => {
      document.getElementById("victoryModal").classList.add("hidden");
    };
    document.getElementById("startExam").onclick = () => this._startExam();
    document.getElementById("cancelExam").onclick = () => {
      document.getElementById("examModal").classList.add("hidden");
    };
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); this._save(); }
    });
  }

  _navigateHistory(dir) {
    if (!this.shell.history.length) return;
    this.historyIdx = Math.max(-1, Math.min(this.shell.history.length - 1, this.historyIdx + dir));
    const input = document.getElementById("cmdInput");
    input.value = this.historyIdx === -1 ? "" :
      this.shell.history[this.shell.history.length - 1 - this.historyIdx];
  }

  async _handleCommand(cmdline) {
    if (!cmdline.trim()) {
      this._print(`<span class="cmd-line"><span class="prompt-echo">${this.shell.prompt()}</span></span>`);
      return;
    }

    if (cmdline === "hint") { this._showHint(); return; }
    if (cmdline === "skip") { this._skipTask(); return; }
    if (cmdline === "reset") { if (confirm("Сбросить прогресс?")) this._reset(); return; }
    if (cmdline === "save") { this._save(); return; }

    this._print(`<span class="cmd-line"><span class="prompt-echo">${this.shell.prompt()}</span>${this._esc(cmdline)}</span>`);

    if (/^(vim|nano|vi)\s+/.test(cmdline)) {
      const file = cmdline.split(/\s+/)[1];
      if (file) {
        this.editor.open(file);
        this.shell.history.push(cmdline);
        return;
      }
    }

    const out = await this.shell.run(cmdline);
    if (out === "__CLEAR__") { this._clearTerminal(); return; }
    if (out) this._print(`<span class="out-ok">${this._esc(out)}</span>`);

    this._checkTask();
    this._updatePrompt();
    this.achievements.check();
  }

  _checkTask() {
    if (this.examMode) return this._checkExamTask();
    if (this.levelIdx >= LEVELS.length) return;
    const level = LEVELS[this.levelIdx];
    const task = level.tasks[this.taskIdx];
    if (!task) return;
    try {
      if (task.check(this.shell)) {
        this.score += 25;
        this._nextTask();
      }
    } catch (e) { console.error("Check error:", e); }
  }

  _nextTask() {
    const level = LEVELS[this.levelIdx];
    this.taskIdx++;
    if (this.taskIdx >= level.tasks.length) {
      this.score += 100;
      this._toast("🏆 +100 XP");
      this.levelIdx++;
      this.taskIdx = 0;
      if (this.levelIdx >= LEVELS.length) { this._victory(); return; }
    }
    this._render();
    this._save(true);
    this.worldmap.refresh();
  }

  _showHint() {
    if (this.examMode) { this._toast("В экзамене нет подсказок"); return; }
    if (this.levelIdx >= LEVELS.length) return;
    const task = LEVELS[this.levelIdx].tasks[this.taskIdx];
    const box = document.getElementById("hintBox");
    // ⬇️ innerHTML вместо textContent
    box.innerHTML = `💡 <code class="cmd">${this._esc(task.hint)}</code>`;
    box.classList.remove("hidden");
    this._print(`<span class="out-warn">💡 Подсказка: <code class="cmd">${this._esc(task.hint)}</code></span>`);
  }

  _skipTask() {
    if (this.examMode) return;
    this._print(`<span class="out-warn">⏭ Пропущено</span>`);
    this._nextTask();
  }

  _render() {
    if (this.examMode) return;
    if (this.levelIdx >= LEVELS.length) return;
    const level = LEVELS[this.levelIdx];
    const task = level.tasks[this.taskIdx];

    document.getElementById("levelName").textContent = level.name;
    document.getElementById("levelDesc").textContent = level.desc || "";
    document.getElementById("taskTitle").textContent = task.title;

    // ⬇️ ВОТ ЗДЕСЬ: рендерим desc как HTML с <code>
    document.getElementById("taskDesc").innerHTML = this._formatDesc(task.desc);

    document.getElementById("taskCounter").textContent = `Задание ${this.taskIdx + 1}/${level.tasks.length}`;
    document.getElementById("score").textContent = this.score;
    document.getElementById("progressText").textContent = `Миссия ${this.levelIdx + 1} / ${LEVELS.length}`;
    document.getElementById("progressFill").style.width = `${(this.levelIdx / LEVELS.length) * 100}%`;
    document.getElementById("hintBox").classList.add("hidden");

    this._updateRankUI();
  }

  // ⬇️ НОВЫЙ метод: превращает `текст` в <code>текст</code>
  _formatDesc(text) {
    if (!text) return "";
    return text
      // Экранируем HTML-спецсимволы (чтобы `<` в примерах не ломало)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // Превращаем `команда` в <code>команда</code>
      .replace(/`([^`]+)`/g, '<code class="cmd">$1</code>');
  }

  _updateRankUI() {
    let rank = RANKS[0];
    for (const r of RANKS) if (this.score >= r.xp) rank = r;
    let next = null;
    for (const r of RANKS) if (this.score < r.xp) { next = r; break; }

    const rankName = document.querySelector(".rank-name");
    if (rankName) rankName.textContent = `${rank.icon} ${rank.name}`;

    const fill = document.getElementById("rankFill");
    const text = document.getElementById("rankText");
    if (next) {
      const prevXp = rank.xp;
      const pct = Math.min(100, ((this.score - prevXp) / (next.xp - prevXp)) * 100);
      if (fill) fill.style.width = `${pct}%`;
      if (text) text.textContent = `${this.score} / ${next.xp} XP до ${next.icon} ${next.name}`;
    } else {
      if (fill) fill.style.width = "100%";
      if (text) text.textContent = "🏆 Максимальный ранг!";
    }
  }

  _updatePrompt() {
    document.getElementById("prompt").textContent = this.shell.prompt();
    document.getElementById("termTitle").textContent = `user@linux-quest: ${this.shell.fs.cwd}`;
  }

  _print(html) {
    const out = document.getElementById("output");
    out.innerHTML += html + "\n";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const t = document.getElementById("terminal");
        if (t) t.scrollTop = t.scrollHeight;
      });
    });
  }

  _clearTerminal() {
    document.getElementById("output").innerHTML = "";
  }

  _esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  _toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.add("hidden"), 2500);
  }

  _printBanner() {
    this._print(`
<span class="out-info">╔══════════════════════════════════════════════╗
║      🐧  L I N U X   Q U E S T  🐧          ║
║   18 миссий · Карта мира · XP · Ранги       ║
╚══════════════════════════════════════════════╝</span>

<span class="out-info">Введи 'help' — список команд.
'hint' — подсказка, 'skip' — пропустить.
Ctrl+S — сохранить прогресс.</span>
`);
  }

  _victory() {
    document.getElementById("victoryModal").classList.remove("hidden");
    document.getElementById("victoryText").textContent = "🎉 Ты прошёл все 18 миссий!";
    let rank = RANKS[0];
    for (const r of RANKS) if (this.score >= r.xp) rank = r;
    document.getElementById("victoryStats").innerHTML = `
      <div>⭐ Очки: <b>${this.score}</b></div>
      <div>🎖️ Ранг: <b>${rank.icon} ${rank.name}</b></div>
      <div>📜 Команд: <b>${this.shell.history.length}</b></div>
      <div>🎯 Достижений: <b>${this.achievements.unlocked.size}/${ACHIEVEMENTS.length}</b></div>
    `;
  }

  _save(silent = false) {
    const ok = Storage.save({
      levelIdx: this.levelIdx, taskIdx: this.taskIdx, score: this.score,
      shell: this.shell, fs: this.fs
    });
    if (!silent) this._toast(ok ? "💾 Прогресс сохранён" : "❌ Ошибка сохранения");
  }

  _tryLoadProgress() {
    const data = Storage.load();
    if (!data) return;
    if (confirm("Найден сохранённый прогресс. Загрузить?")) {
      this.levelIdx = data.levelIdx || 0;
      this.taskIdx = data.taskIdx || 0;
      this.score = data.score || 0;
      if (data.history) this.shell.history = data.history;
      if (data.aliases) this.shell.aliases = data.aliases;
      if (data.env) this.shell.env = data.env;
      if (data.fsSnapshot) Storage.restoreFS(this.shell, data.fsSnapshot, data.cwd);
      this.fs = this.shell.fs;
      this.editor.fs = this.fs;
      this._updatePrompt();
    }
  }

  _reset() {
    Storage.clear();
    localStorage.removeItem("linux_quest_ach");
    location.reload();
  }

  _toggleTheme() {
    document.body.classList.toggle("light");
    localStorage.setItem("linux_quest_theme",
      document.body.classList.contains("light") ? "light" : "dark");
  }

  _openExam() {
    document.getElementById("examModal").classList.remove("hidden");
  }

  _startExam() {
    document.getElementById("examModal").classList.add("hidden");
    const all = [];
    LEVELS.forEach(lvl => lvl.tasks.forEach(t => all.push(t)));
    this.examTasks = all.sort(() => Math.random() - 0.5).slice(0, 5);
    this.examMode = true;
    this.examIdx = 0;
    this.examStartTime = Date.now();
    this.examTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.examStartTime) / 1000);
      const left = Math.max(0, 300 - elapsed);
      document.getElementById("progressText").textContent =
        `🎓 Экзамен — ${Math.floor(left/60)}:${String(left % 60).padStart(2,"0")}`;
      if (left === 0) this._endExam("⏰ Время вышло!");
    }, 1000);
    this._print(`<span class="out-warn">🎓 ЭКЗАМЕН! 5 заданий, 5 минут.</span>`);
    this._renderExamTask();
  }

  _renderExamTask() {
    const task = this.examTasks[this.examIdx];
    document.getElementById("levelName").textContent = "🎓 Экзамен";
    document.getElementById("levelDesc").textContent = "";
    document.getElementById("taskTitle").textContent = task.title;
    document.getElementById("taskDesc").textContent = task.desc;
    document.getElementById("taskCounter").textContent = `Вопрос ${this.examIdx + 1}/${this.examTasks.length}`;
    document.getElementById("hintBox").classList.add("hidden");
  }

  _checkExamTask() {
    const task = this.examTasks[this.examIdx];
    try {
      if (task.check(this.shell)) {
        this.score += 50;
        document.getElementById("score").textContent = this.score;
        this._print(`<span class="out-success">✅ Верно! +50 очков</span>`);
        this.examIdx++;
        if (this.examIdx >= this.examTasks.length) this._endExam("🎉 Экзамен сдан!");
        else this._renderExamTask();
      }
    } catch {}
  }

  _endExam(msg) {
    clearInterval(this.examTimer);
    this.examMode = false;
    this._examPassed = true;
    this._print(`<span class="out-success">${msg}</span>`);
    this._toast(msg);
    this._render();
    this.achievements.check();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  try {
    if (localStorage.getItem("linux_quest_theme") === "light") {
      document.body.classList.add("light");
    }
    window.game = new Game();
    console.log("✅ Linux Quest запущен");
  } catch (e) {
    console.error("❌", e);
    document.body.innerHTML = `<div style="padding:40px;font-family:monospace;color:#f85149">
      <h2>Ошибка запуска</h2><pre>${e.message}\n${e.stack}</pre></div>`;
  }
});