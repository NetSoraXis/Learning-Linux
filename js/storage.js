const Storage = {
  KEY: "linux_quest_save_v2",

  save(state) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify({
        levelIdx: state.levelIdx,
        taskIdx: state.taskIdx,
        score: state.score,
        history: state.shell.history.slice(-50),
        aliases: state.shell.aliases,
        env: state.shell.env,
        fsSnapshot: this._serializeFS(state.shell.fs.root),
        cwd: state.shell.fs.cwd,
        timestamp: Date.now()
      }));
      return true;
    } catch (e) {
      console.error("Save failed:", e);
      return false;
    }
  },

  load() {
    try {
      const data = localStorage.getItem(this.KEY);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  },

  clear() { localStorage.removeItem(this.KEY); },

  _serializeFS(node) {
    const obj = {
      name: node.name, isDir: node.isDir,
      content: node.content, owner: node.owner, perms: node.perms
    };
    if (node.isDir) {
      obj.children = {};
      for (const k in node.children) obj.children[k] = this._serializeFS(node.children[k]);
    }
    return obj;
  },

  _deserializeFS(obj) {
    const n = new VNode(obj.name, obj.isDir, obj.content);
    n.owner = obj.owner;
    n.perms = obj.perms;
    if (obj.isDir && obj.children) {
      for (const k in obj.children) n.children[k] = this._deserializeFS(obj.children[k]);
    }
    return n;
  },

  restoreFS(shell, snapshot, cwd) {
    shell.fs.root = this._deserializeFS(snapshot);
    shell.fs.cwd = cwd || "/home/user";
    shell.env.PWD = shell.fs.cwd;
  }
};