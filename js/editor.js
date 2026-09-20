class Editor {
  constructor(fs) {
    this.fs = fs;
    this.modal = document.getElementById("vimModal");
    this.editor = document.getElementById("vimEditor");
    this.filename = document.getElementById("vimFilename");
    this.status = document.getElementById("vimStatus");
    this.currentPath = null;
    this._bind();
  }

  _bind() {
    this.editor.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); this.save(); return; }
      if (e.key === "Escape") { e.preventDefault(); this.close(); }
    });
  }

  open(path) {
    this.currentPath = this.fs.resolve(path);
    const [ok, content] = this.fs.read(path);
    this.editor.value = ok ? content : "";
    this.filename.textContent = this.currentPath;
    this.status.textContent = ok ? "-- INSERT --" : "-- NEW FILE --";
    this.modal.classList.remove("hidden");
    setTimeout(() => this.editor.focus(), 50);
  }

  save() {
    this.fs.write(this.currentPath, this.editor.value);
    this.status.textContent = `"${this.currentPath}" записан — ${this.editor.value.length} байт`;
    setTimeout(() => this.status.textContent = "-- INSERT --", 1500);
  }

  close() {
    if (this.currentPath) this.fs.write(this.currentPath, this.editor.value);
    this.modal.classList.add("hidden");
    this.currentPath = null;
    document.getElementById("cmdInput")?.focus();
  }
}