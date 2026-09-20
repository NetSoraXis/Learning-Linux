class VNode {
  constructor(name, isDir = false, content = "") {
    this.name = name;
    this.isDir = isDir;
    this.content = content;
    this.children = isDir ? {} : null;
    this.owner = "user";
    this.perms = isDir ? "rwxr-xr-x" : "rw-r--r--";
  }
}

class VirtualFS {
  constructor() {
    this.root = new VNode("/", true);
    this.cwd = "/home/user";
    this._bootstrap();
  }

  _bootstrap() {
    ["/home","/home/user","/etc","/var","/var/log","/tmp","/usr","/usr/bin","/opt","/root",
     "/etc/nginx","/etc/systemd","/etc/systemd/system","/proc","/dev"].forEach(p => this.mkdir(p, true));
    this.write("/etc/hostname", "linux-quest\n");
    this.write("/etc/passwd",
      "root:x:0:0:root:/root:/bin/bash\n" +
      "user:x:1000:1000:User:/home/user:/bin/bash\n" +
      "www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\n");
    this.write("/etc/group", "root:x:0:\nuser:x:1000:\nsudo:x:27:user\n");
    this.write("/etc/os-release", 'NAME="Linux Quest"\nVERSION="2.0"\nID=quest\n');
    this.write("/home/user/readme.txt", "Добро пожаловать в Linux Quest!\nИзучай Linux играя.\n");
    this.write("/var/log/syslog",
      "boot: system started\n" +
      "kernel: initialized\n" +
      "network: interface up\n" +
      "auth: user login\n");
    this.write("/var/log/auth.log", "user login successful\n");
    this.write("/etc/nginx/nginx.conf",
      "server {\n  listen 80;\n  server_name localhost;\n}\n");
    this.write("/etc/systemd/system/myapp.service",
      "[Unit]\nDescription=My App\n\n[Service]\nExecStart=/usr/bin/myapp\n\n[Install]\nWantedBy=multi-user.target\n");
    this.write("/home/user/data.txt", "apple\nbanana\ncherry\napple\n");
    this.write("/home/user/numbers.txt", "3\n1\n4\n1\n5\n9\n2\n6\n");
    this.mkdir("/home/user/projects", true);
    this.write("/home/user/projects/app.py", 'print("hello")\n');
  }

  resolve(path) {
    if (!path) return this.cwd;
    if (path === "~") return "/home/user";
    if (path.startsWith("~/")) path = "/home/user" + path.slice(1);
    if (!path.startsWith("/")) path = this.cwd + "/" + path;
    const parts = path.split("/").filter(Boolean);
    const stack = [];
    for (const p of parts) {
      if (p === ".") continue;
      if (p === "..") stack.pop();
      else stack.push(p);
    }
    return "/" + stack.join("/");
  }

  get(path) {
    path = this.resolve(path);
    if (path === "/") return this.root;
    const parts = path.split("/").filter(Boolean);
    let node = this.root;
    for (const p of parts) {
      if (!node.isDir || !node.children[p]) return null;
      node = node.children[p];
    }
    return node;
  }

  getParent(path) {
    path = this.resolve(path);
    const idx = path.lastIndexOf("/");
    const parent = idx === 0 ? "/" : path.slice(0, idx);
    return [this.get(parent), path.slice(idx + 1)];
  }

  mkdir(path, quiet = false, recursive = false) {
    if (recursive) {
      const resolved = this.resolve(path);
      const parts = resolved.split("/").filter(Boolean);
      let cur = this.root;
      for (const p of parts) {
        if (!cur.children[p]) cur.children[p] = new VNode(p, true);
        else if (!cur.children[p].isDir) return quiet ? [false, ""] : [false, "Файл существует"];
        cur = cur.children[p];
      }
      return [true, ""];
    }
    const [parent, name] = this.getParent(path);
    if (!parent || !parent.isDir) return [false, "Нет такого каталога"];
    if (name in parent.children) return quiet ? [false, ""] : [false, "Файл существует"];
    parent.children[name] = new VNode(name, true);
    return [true, ""];
  }

  touch(path) {
    const [parent, name] = this.getParent(path);
    if (!parent) return [false, "Нет такого каталога"];
    if (!(name in parent.children)) parent.children[name] = new VNode(name, false);
    return [true, ""];
  }

  write(path, content, append = false) {
    const [parent, name] = this.getParent(path);
    if (!parent) return [false, "Нет такого каталога"];
    if (name in parent.children) {
      const n = parent.children[name];
      if (n.isDir) return [false, "Это каталог"];
      n.content = append ? n.content + content : content;
    } else {
      parent.children[name] = new VNode(name, false, content);
    }
    return [true, ""];
  }

  read(path) {
    const n = this.get(path);
    if (!n) return [false, "Нет такого файла"];
    if (n.isDir) return [false, "Это каталог"];
    return [true, n.content];
  }

  ls(path = ".", all = false) {
    const n = this.get(path);
    if (!n) return [false, "Нет такого файла или каталога"];
    if (!n.isDir) return [true, [n.name]];
    let items = Object.keys(n.children);
    if (!all) items = items.filter(i => !i.startsWith("."));
    return [true, items.sort()];
  }

  rm(path, recursive = false, force = false) {
    const [parent, name] = this.getParent(path);
    if (!parent || !(name in parent.children)) {
      return force ? [true, ""] : [false, "Нет такого файла"];
    }
    const node = parent.children[name];
    if (node.isDir && Object.keys(node.children).length && !recursive) {
      return [false, "Каталог не пуст"];
    }
    delete parent.children[name];
    return [true, ""];
  }

  cd(path) {
    const n = this.get(path);
    if (!n) return [false, "Нет такого каталога"];
    if (!n.isDir) return [false, "Не каталог"];
    this.cwd = this.resolve(path);
    return [true, ""];
  }

  cp(src, dst, recursive = false) {
    const s = this.get(src);
    if (!s) return [false, "Источник не найден"];
    if (s.isDir && !recursive) return [false, "Это каталог (-r не указан)"];
    const clone = this._clone(s);
    const [dParent, dName] = this.getParent(dst);
    if (!dParent) return [false, "Назначение не найдено"];
    if (dParent.children[dName] && dParent.children[dName].isDir) {
      dParent.children[dName].children[s.name] = clone;
    } else {
      clone.name = dName;
      dParent.children[dName] = clone;
    }
    return [true, ""];
  }

  _clone(node) {
    const n = new VNode(node.name, node.isDir, node.content);
    n.perms = node.perms;
    n.owner = node.owner;
    if (node.isDir) {
      for (const k in node.children) n.children[k] = this._clone(node.children[k]);
    }
    return n;
  }

  mv(src, dst) {
    const ok = this.cp(src, dst, true)[0];
    if (ok) this.rm(src, true);
    return ok ? [true, ""] : [false, "Ошибка mv"];
  }

  walk(path = "/", cb) {
    const start = this.get(path);
    if (!start) return;
    const stack = [[this.resolve(path), start]];
    while (stack.length) {
      const [p, n] = stack.pop();
      cb(p, n);
      if (n.isDir) {
        for (const k in n.children) {
          const childPath = p === "/" ? "/" + k : p + "/" + k;
          stack.push([childPath, n.children[k]]);
        }
      }
    }
  }
}