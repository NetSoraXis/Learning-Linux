#!/usr/bin/env python3
"""Собирает Linux Quest в один портативный HTML-файл."""
import os

PROJECT = "."
OUTPUT = "LinuxQuest.html"
JS_FILES = ["fs.js", "shell.js", "commands.js", "editor.js",
            "storage.js", "levels.js", "worldmap.js",
            "achievements.js", "game.js"]

def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def main():
    html = read(f"{PROJECT}/index.html")
    css  = read(f"{PROJECT}/css/style.css")

    html = html.replace(
        '<link rel="stylesheet" href="css/style.css">',
        f"<style>\n{css}\n</style>"
    )

    for js_file in JS_FILES:
        path = f"{PROJECT}/js/{js_file}"
        if not os.path.exists(path):
            print(f"⚠️  Пропущен {js_file}")
            continue
        code = read(path)
        html = html.replace(
            f'<script src="js/{js_file}"></script>',
            f"<script>\n{code}\n</script>"
        )

    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(html)

    size = os.path.getsize(OUTPUT) / 1024
    print(f"✅ Готово: {OUTPUT} ({size:.1f} KB)")
    print(f"   Открой двойным кликом в браузере.")

if __name__ == "__main__":
    main()