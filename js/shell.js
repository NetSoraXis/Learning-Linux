class Shell {
  constructor(fs) {
    this.fs = fs;
    this.env = {
      USER: "user", HOME: "/home/user",
      PATH: "/usr/bin:/bin", SHELL: "/bin/bash",
      PWD: fs.cwd, LANG: "ru_RU.UTF-8"
    };
    this.history = [];
    this.aliases = {};
    this.vars = {};
    this.exitCode = 0;
    this.commands = {};
    registerCommands(this);
  }

  prompt() {
    const short = this.fs.cwd.replace("/home/user", "~");
    return `user@linux-quest:${short}$ `;
  }

  async run(cmdline) {
    cmdline = cmdline.trim();
    if (!cmdline) return "";
    this.history.push(cmdline);
    const tokens = this._tokenize(cmdline);
    return await this._executePipeline(tokens);
  }

  _tokenize(s) {
    const parts = [];
    let buf = "", sep = "", quote = null, i = 0;
    while (i < s.length) {
      const c = s[i];
      if (quote) {
        buf += c;
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c; buf += c;
      } else if (c === "|" || c === ";") {   // ← тут всё ок
        if (buf.trim()) parts.push({ cmd: buf.trim(), sep });
        sep = c; buf = "";
      } else {
        buf += c;
      }
      i++;
    }
    if (buf.trim()) parts.push({ cmd: buf.trim(), sep });
    return parts;
  }

  async _executePipeline(parts) {
    let output = "";
    let stdin = "";

    for (let i = 0; i < parts.length; i++) {
      const { cmd } = parts[i];
      const nextSep = parts[i + 1] ? parts[i + 1].sep : "";

      const out = await this._execOne(cmd, stdin);

      if (nextSep === "|") {
        // Следующая команда — часть пайпа: наш вывод идёт в её stdin
        stdin = out;
      } else {
        // Следующей команды нет или она не через пайп: пишем в общий вывод
        if (out) output += (output ? "\n" : "") + out;
        stdin = "";
      }
    }
    return output;
  }

  async _execOne(cmdline, stdin = "") {
    let append = false, write = false, read = false;
    let target = null;
    const redirMatch = cmdline.match(/(>>|>|<)\s*(\S+)/);
    if (redirMatch) {
      const op = redirMatch[1];
      target = redirMatch[2];
      cmdline = cmdline.slice(0, redirMatch.index).trim();
      if (op === ">") write = true;
      if (op === ">>") { write = true; append = true; }
      if (op === "<") read = true;
    }

    const tokens = this._split(cmdline);
    if (!tokens.length) return "";
    let cmd = tokens[0];
    let args = tokens.slice(1);

    let sudo = false;
    if (cmd === "sudo") {
      sudo = true;
      if (!args.length) return "sudo: нет команды";
      cmd = args[0];
      args = args.slice(1);
    }

    if (this.aliases[cmd]) {
      const expanded = this._split(this.aliases[cmd]).concat(args);
      cmd = expanded[0];
      args = expanded.slice(1);
    }

    if (read && target) {
      const [ok, c] = this.fs.read(target);
      if (ok) stdin = c;
    }

    let out = "";
    const handler = this.commands[cmd];
    if (!handler) {
      out = `${cmd}: команда не найдена`;
      this.exitCode = 127;
    } else {
      try {
        out = await handler(args, stdin, { sudo });
        this.exitCode = 0;
      } catch (e) {
        out = `${cmd}: ошибка: ${e.message}`;
        this.exitCode = 1;
      }
    }

    if (write && target) {
      this.fs.write(target, out + "\n", append);
      return "";
    }
    return out;
  }

  _split(s) {
    const tokens = [];
    let buf = "", quote = null;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (quote) {
        if (c === quote) quote = null;
        else buf += c;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === " " || c === "\t") {
        if (buf) { tokens.push(buf); buf = ""; }
      } else {
        buf += c;
      }
    }
    if (buf) tokens.push(buf);
    return tokens.map(t => t.replace(/\$(\w+)/g, (_, k) => this.env[k] || this.vars[k] || ""));
  }
}

function registerCommands(sh) {
  const fs = sh.fs;

  sh.commands.pwd = () => fs.cwd;
  sh.commands.whoami = () => sh.env.USER;
  sh.commands.hostname = () => "linux-quest";
  sh.commands.echo = (a) => a.join(" ");
  sh.commands.date = () => new Date().toString();
  sh.commands.clear = () => "__CLEAR__";
  sh.commands.history = () => sh.history.map((c, i) => `${String(i+1).padStart(4)}  ${c}`).join("\n");

  sh.commands.cd = (a) => {
    const target = a[0] || "~";
    const [ok, err] = fs.cd(target);
    if (!ok) return `cd: ${err}: ${target}`;   // ← добавь имя пути
    sh.env.PWD = fs.cwd;
    return "";
  };

  sh.commands.ls = (a) => {
    const long = a.some(x => x === "-l" || x === "-la" || x === "-al");
    const all = a.some(x => x.includes("a"));
    const paths = a.filter(x => !x.startsWith("-"));
    const path = paths[0] || ".";
    const [ok, res] = fs.ls(path, all);
    if (!ok) return `ls: ${res}`;
    if (long) {
      return res.map(name => {
        const n = fs.get(`${path}/${name}`);
        const kind = n && n.isDir ? "d" : "-";
        return `${kind}${n ? n.perms : "---------"} 1 ${n?.owner || "user"} ${n?.owner || "user"} 4096 ${name}`;
      }).join("\n");
    }
    return res.join("  ");
  };

  sh.commands.mkdir = (a) => {
    if (!a.length) return "mkdir: пропущен операнд";
    const recursive = a.includes("-p");
    a.filter(x => !x.startsWith("-")).forEach(p => fs.mkdir(p, true, recursive));
    return "";
  };

  sh.commands.touch = (a) => {
    if (!a.length) return "touch: пропущен операнд";
    a.forEach(p => fs.touch(p));
    return "";
  };

  sh.commands.rm = (a) => {
    const rec = a.some(x => x.startsWith("-") && x.includes("r"));
    const force = a.some(x => x.startsWith("-") && x.includes("f"));
    for (const p of a.filter(x => !x.startsWith("-"))) {
      const [ok, err] = fs.rm(p, rec, force);
      if (!ok) return `rm: ${err}`;
    }
    return "";
  };

  sh.commands.cp = (a) => {
    if (a.length < 2) return "cp: нужны источник и назначение";
    const rec = a.some(x => x.includes("r"));
    const [ok, err] = fs.cp(a[0], a[1], rec);
    return ok ? "" : `cp: ${err}`;
  };

  sh.commands.mv = (a) => {
    if (a.length < 2) return "mv: нужны источник и назначение";
    return fs.mv(a[0], a[1])[0] ? "" : "mv: ошибка";
  };

  sh.commands.cat = (a, stdin) => {
    if (!a.length) return stdin;
    return a.map(p => {
      const [ok, c] = fs.read(p);
      return ok ? c : `cat: ${p}: ${c}`;
    }).join("");
  };

  sh.commands.head = (a, stdin) => {
    let n = 10, files = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i] === "-n") { n = parseInt(a[++i]); }
      else if (!a[i].startsWith("-")) files.push(a[i]);
    }
    const text = files.length ? (fs.read(files[0])[1] || "") : stdin;
    return text.split("\n").slice(0, n).join("\n");
  };

  sh.commands.tail = (a, stdin) => {
    let n = 10, files = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i] === "-n") n = parseInt(a[++i]);
      else if (!a[i].startsWith("-")) files.push(a[i]);
    }
    const text = files.length ? (fs.read(files[0])[1] || "") : stdin;
    const lines = text.split("\n").filter((_, i, arr) => i < arr.length - 1 || arr[i]);
    return lines.slice(-n).join("\n");
  };

  sh.commands.wc = (a, stdin) => {
    const files = a.filter(x => !x.startsWith("-"));
    const text = files.length ? (fs.read(files[0])[1] || "") : stdin;
    const flags = a.filter(x => x.startsWith("-"));
    const l = text.split("\n").filter((_, i, arr) => i < arr.length - 1 || arr[i]).length;
    const w = text.split(/\s+/).filter(Boolean).length;
    const c = text.length;
    if (flags.includes("-l")) return String(l);
    if (flags.includes("-w")) return String(w);
    if (flags.includes("-c")) return String(c);
    return `${l} ${w} ${c}`;
  };

  sh.commands.grep = (a, stdin) => {
    if (!a.length) return "grep: нужен шаблон";
    const invert = a.includes("-v");
    const ignore = a.includes("-i");
    const rest = a.filter(x => !x.startsWith("-"));
    const pattern = rest[0];
    const files = rest.slice(1);
    const text = files.length ? (fs.read(files[0])[1] || "") : stdin;
    const flags_str = ignore ? "gi" : "g";
    let re;
    try { re = new RegExp(pattern, flags_str); } catch { return "grep: неверное регулярное выражение"; }
    return text.split("\n").filter(line => {
      const m = re.test(line);
      return invert ? !m : m;
    }).join("\n");
  };

  sh.commands.find = (a) => {
    let path = ".", pattern = "*", type = null;
    for (let i = 0; i < a.length; i++) {
      if (a[i] === "-name") pattern = a[++i];
      else if (a[i] === "-type") type = a[++i];
      else if (!a[i].startsWith("-")) path = a[i];
    }
    const results = [];
    fs.walk(path, (p, n) => {
      if (type === "f" && n.isDir) return;
      if (type === "d" && !n.isDir) return;
      if (globMatch(n.name, pattern)) results.push(p);
    });
    return results.join("\n");
  };

  sh.commands.chmod = (a) => {
    if (a.length < 2) return "chmod: нужны режим и файл";
    const [mode, path] = a;
    const node = fs.get(path);
    if (!node) return `chmod: ${path}: нет файла`;
    if (/^\d{3}$/.test(mode)) {
      const map = {0:"---",1:"--x",2:"-w-",3:"-wx",4:"r--",5:"r-x",6:"rw-",7:"rwx"};
      node.perms = mode.split("").map(d => map[d]).join("");
    } else {
      node.perms = mode;
    }
    return "";
  };

  sh.commands.chown = (a) => {
    if (a.length < 2) return "chown: нужны пользователь и файл";
    const node = fs.get(a[1]);
    if (node) node.owner = a[0];
    return "";
  };

  sh.commands.ps = () =>
    "  PID TTY          TIME CMD\n" +
    "    1 ?        00:00:00 systemd\n" +
    "  100 ?        00:00:00 bash\n" +
    "  250 ?        00:00:00 ps";

  sh.commands.kill = (a) => a.length ? "" : "kill: нужен PID";
  sh.commands.df = () =>
    "Filesystem     1K-blocks    Used Available Use% Mounted on\n" +
    "/dev/sda1       20480000 5000000  15480000  25% /";
  sh.commands.du = () => "4096\t.";
  sh.commands.free = () =>
    "              total        used        free\n" +
    "Mem:        8000000     3000000     5000000\n" +
    "Swap:       2000000           0     2000000";
  sh.commands.uname = (a) =>
    a.includes("-a") ? "Linux linux-quest 5.15.0 #1 SMP x86_64 GNU/Linux" : "Linux";
  sh.commands.uptime = () => " 12:00:00 up 1 day, 2:30, 1 user, load average: 0.10, 0.15, 0.20";
  sh.commands.id = () => "uid=1000(user) gid=1000(user) groups=1000(user),27(sudo)";
  sh.commands.env = () => Object.entries(sh.env).map(([k, v]) => `${k}=${v}`).join("\n");

  sh.commands.export = (a) => {
    for (const item of a) {
      const i = item.indexOf("=");
      if (i > 0) sh.env[item.slice(0, i)] = item.slice(i + 1);
    }
    return "";
  };

  sh.commands.alias = (a) => {
    if (!a.length) return Object.entries(sh.aliases).map(([k, v]) => `alias ${k}='${v}'`).join("\n");
    for (const item of a) {
      const i = item.indexOf("=");
      if (i > 0) sh.aliases[item.slice(0, i)] = item.slice(i + 1).replace(/^['"]|['"]$/g, "");
    }
    return "";
  };

  sh.commands.unalias = (a) => {
    a.forEach(k => delete sh.aliases[k]);
    return "";
  };

  sh.commands.sort = (a, stdin) => {
    const files = a.filter(x => !x.startsWith("-"));
    const text = files.length ? (fs.read(files[0])[1] || "") : stdin;
    const rev = a.includes("-r");
    const num = a.includes("-n");
    let lines = text.split("\n").filter(Boolean);
    if (num) lines.sort((x, y) => parseFloat(x) - parseFloat(y));
    else lines.sort();
    if (rev) lines.reverse();
    return lines.join("\n");
  };

  sh.commands.uniq = (a, stdin) => {
    const files = a.filter(x => !x.startsWith("-"));
    const text = files.length ? (fs.read(files[0])[1] || "") : stdin;
    const lines = text.split("\n");
    return lines.filter((l, i) => i === 0 || l !== lines[i - 1]).join("\n");
  };

  sh.commands.awk = (a, stdin) => {
    if (!a.length) return "awk: нужна программа";
    const prog = a[0];
    const files = a.slice(1).filter(x => !x.startsWith("-"));
    const text = files.length ? (fs.read(files[0])[1] || "") : stdin;
    const m = prog.match(/\{print\s+(.+)\}/);
    if (!m) return text;
    const expr = m[1];
    return text.split("\n").map(line => {
      const parts = line.split(/\s+/);
      return expr.replace(/\$(\d+)/g, (_, n) => parts[parseInt(n) - 1] || "")
                 .replace(/"([^"]*)"/g, "$1");
    }).join("\n");
  };

  sh.commands.sed = (a, stdin) => {
    if (!a.length) return stdin;
    const expr = a[0];
    const files = a.slice(1).filter(x => !x.startsWith("-"));
    const text = files.length ? (fs.read(files[0])[1] || "") : stdin;
    const m = expr.match(/^s\/(.+?)\/(.*?)\/(g?)$/);
    if (!m) return text;
    const re = new RegExp(m[1], "g");
    return text.replace(re, m[2]);
  };

  sh.commands.which = (a) => a.length ? `/usr/bin/${a[0]}` : "";
  sh.commands.type = (a) => {
    if (!a.length) return "";
    if (sh.aliases[a[0]]) return `${a[0]} is aliased to \`${sh.aliases[a[0]]}\``;
    return `${a[0]} is /usr/bin/${a[0]}`;
  };

  sh.commands.tac = (a, stdin) => {
    const files = a.filter(x => !x.startsWith("-"));
    const text = files.length ? (fs.read(files[0])[1] || "") : stdin;
    return text.split("\n").reverse().join("\n");
  };

  sh.commands.nl = (a, stdin) => {
    const files = a.filter(x => !x.startsWith("-"));
    const text = files.length ? (fs.read(files[0])[1] || "") : stdin;
    return text.split("\n").map((l, i) => `${String(i+1).padStart(6)}\t${l}`).join("\n");
  };

  sh.commands.cut = (a, stdin) => {
    let delim = "\t";
    let fields = [0];
    const files = [];

    for (let i = 0; i < a.length; i++) {
      const arg = a[i];
      if (arg === "-d" || arg === "-f") {
        const val = a[++i];
        if (arg === "-d") delim = val;
        else fields = val.split(",").map(n => parseInt(n) - 1);
      } else if (arg.startsWith("-d")) {
        delim = arg.slice(2);
      } else if (arg.startsWith("-f")) {
        fields = arg.slice(2).split(",").map(n => parseInt(n) - 1);
      } else if (!arg.startsWith("-")) {
        files.push(arg);
      }
    }

    const text = files.length ? (fs.read(files[0])[1] || "") : stdin;
    return text.split("\n").map(line =>
      fields.map(f => line.split(delim)[f] || "").join(delim)
    ).join("\n");
  };

  sh.commands.help = () => [
    "📖 Доступные команды Linux Quest:",
    "",
    "НАВИГАЦИЯ:  ls, cd, pwd, find, which, type",
    "ФАЙЛЫ:      mkdir, touch, rm, cp, mv, cat, head, tail, wc",
    "ТЕКСТ:      grep, sort, uniq, awk, sed, tac, nl, cut",
    "ПРАВА:      chmod, chown",
    "СИСТЕМА:    ps, kill, df, du, free, uname, uptime, id",
    "СРЕДА:      env, export, alias, unalias, history",
    "СЕТЬ:       ping, ip, ss, curl, wget, netstat",
    "SYSTEMD:    systemctl, journalctl",
    "ПАКЕТЫ:     apt, dpkg",
    "АРХИВЫ:     tar, gzip, zip, unzip",
    "РАЗНОЕ:     echo, date, clear, man, sudo, help"
  ].join("\n");
}

function globMatch(name, pattern) {
  const re = new RegExp("^" + pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".") + "$");
  return re.test(name);
}