// ============================================================
// LINUX QUEST — ПОЛНЫЙ ТЕСТ-СЬЮТ
// Запуск: в консоли F12 → "TestRunner.run()"
// Или автоматически: ?test в URL
// ============================================================

const TestRunner = (() => {
  let passed = 0, failed = 0, errors = [];
  const results = [];

  function assert(cond, name, detail = "") {
    if (cond) {
      passed++;
      results.push({ ok: true, name });
    } else {
      failed++;
      results.push({ ok: false, name, detail });
      errors.push({ name, detail });
    }
  }

  function assertEq(actual, expected, name) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    assert(ok, name, `Ожидалось: ${JSON.stringify(expected)}, получено: ${JSON.stringify(actual)}`);
  }

  function section(title) {
    results.push({ section: title });
  }

  // ============================================================
  // БЛОК 1: ФАЙЛОВАЯ СИСТЕМА
  // ============================================================
  function testFS() {
    section("📁 Файловая система (VirtualFS)");
    const fs = new VirtualFS();

    // 1.1 Root существует
    assert(fs.get("/") !== null, "1.1 Root существует");
    assert(fs.get("/").isDir === true, "1.2 Root — директория");

    // 1.3 Базовые папки созданы
    for (const p of ["/home","/home/user","/etc","/var","/var/log","/tmp","/usr","/usr/bin","/opt","/root"]) {
      assert(fs.get(p) !== null, `1.3 Папка ${p} существует`);
    }

    // 1.4 Системные файлы
    assert(fs.get("/etc/hostname") !== null, "1.4 /etc/hostname существует");
    assert(fs.get("/etc/passwd") !== null, "1.5 /etc/passwd существует");
    assert(fs.get("/var/log/syslog") !== null, "1.6 /var/log/syslog существует");

    // 1.7 mkdir
    const r1 = fs.mkdir("/home/user/test_dir");
    assertEq(r1[0], true, "1.7 mkdir создаёт папку");
    assert(fs.get("/home/user/test_dir") !== null, "1.8 Папка test_dir существует");

    // 1.9 mkdir дубликата
    const r2 = fs.mkdir("/home/user/test_dir");
    assertEq(r2[0], false, "1.9 mkdir дубликата возвращает false");

    // 1.10 touch
    fs.touch("/home/user/test_file.txt");
    assert(fs.get("/home/user/test_file.txt") !== null, "1.10 touch создаёт файл");

    // 1.11 write
    fs.write("/home/user/hello.txt", "hello world");
    const [ok1, c1] = fs.read("/home/user/hello.txt");
    assert(ok1 && c1 === "hello world", "1.11 write/read работает");

    // 1.12 append
    fs.write("/home/user/hello.txt", "\nline2", true);
    const [, c2] = fs.read("/home/user/hello.txt");
    assert(c2.includes("line2"), "1.12 append работает");

    // 1.13 read несуществующего
    const [ok2] = fs.read("/nonexistent/file");
    assertEq(ok2, false, "1.13 read несуществующего возвращает false");

    // 1.14 read директории
    const [ok3] = fs.read("/home/user");
    assertEq(ok3, false, "1.14 read директории возвращает false");

    // 1.15 ls
    const [ok4, list] = fs.ls("/home/user");
    assert(ok4 && Array.isArray(list), "1.15 ls возвращает массив");
    assert(list.includes("hello.txt"), "1.16 ls показывает hello.txt");

    // 1.17 ls несуществующего
    const [ok5] = fs.ls("/nonexistent");
    assertEq(ok5, false, "1.17 ls несуществующего = false");

    // 1.18 rm
    const [ok6] = fs.rm("/home/user/hello.txt");
    assert(ok6 && fs.get("/home/user/hello.txt") === null, "1.18 rm удаляет файл");

    // 1.19 rm непустой директории без -r
    fs.touch("/home/user/test_dir/file.txt");
    const [ok7] = fs.rm("/home/user/test_dir");
    assertEq(ok7, false, "1.19 rm непустой без -r не работает");

    // 1.20 rm -r
    const [ok8] = fs.rm("/home/user/test_dir", true);
    assert(ok8, "1.20 rm -r удаляет непустую");

    // 1.21 cp
    fs.write("/home/user/a.txt", "AAA");
    fs.cp("/home/user/a.txt", "/home/user/b.txt");
    const [, cb] = fs.read("/home/user/b.txt");
    assertEq(cb, "AAA", "1.21 cp копирует содержимое");

    // 1.22 mv
    fs.mv("/home/user/b.txt", "/home/user/c.txt");
    assert(fs.get("/home/user/b.txt") === null, "1.22 mv удаляет исходник");
    assert(fs.get("/home/user/c.txt") !== null, "1.23 mv создаёт назначение");

    // 1.24 cd
    const [ok9] = fs.cd("/etc");
    assert(ok9 && fs.cwd === "/etc", "1.24 cd работает");

    // 1.25 cd в несуществующее (КРИТИЧНО!)
    const [ok10, err10] = fs.cd("/nonexistent/deep/path");
    assertEq(ok10, false, "1.25 cd в несуществующее = false");
    assertEq(fs.cwd, "/etc", "1.26 cwd НЕ меняется после неудачного cd");

    // 1.27 cd в файл
    fs.cd("/home/user");
    const [ok11] = fs.cd("/home/user/a.txt");
    assertEq(ok11, false, "1.27 cd в файл = false");

    // 1.28 resolve с ~
    assertEq(fs.resolve("~"), "/home/user", "1.28 resolve ~ = /home/user");
    assertEq(fs.resolve("~/test"), "/home/user/test", "1.29 resolve ~/test");

    // 1.30 resolve с ..
    fs.cd("/home/user/projects");
    assertEq(fs.resolve(".."), "/home/user", "1.30 resolve .. работает");
    assertEq(fs.resolve("../.."), "/home", "1.31 resolve ../..");

    // 1.32 resolve с .
    assertEq(fs.resolve("./x"), "/home/user/projects/x", "1.32 resolve . работает");
  }

  // ============================================================
  // БЛОК 2: SHELL
  // ============================================================
  async function testShell() {
    section("💻 Shell");
    const fs = new VirtualFS();
    const sh = new Shell(fs);

    // 2.1 pwd
    const out1 = await sh.run("pwd");
    assertEq(out1, "/home/user", "2.1 pwd");

    // 2.2 whoami
    assertEq(await sh.run("whoami"), "user", "2.2 whoami");

    // 2.3 echo
    assertEq(await sh.run("echo hello"), "hello", "2.3 echo");

    // 2.4 echo с кавычками
    assertEq(await sh.run('echo "hello world"'), "hello world", "2.4 echo с кавычками");

    // 2.5 cd + pwd
    await sh.run("cd /etc");
    assertEq(await sh.run("pwd"), "/etc", "2.5 cd /etc + pwd");

    await sh.run("cd ~");
    assertEq(await sh.run("pwd"), "/home/user", "2.6 cd ~");

    // 2.7 cd с ошибкой — cwd не меняется
    await sh.run("cd /nonexistent/path");
    assertEq(await sh.run("pwd"), "/home/user", "2.7 cd с ошибкой сохраняет cwd");

    // 2.8 ls
    const ls = await sh.run("ls");
    assert(ls.includes("readme.txt"), "2.8 ls показывает readme.txt");

    // 2.9 mkdir
    await sh.run("mkdir test_shell_dir");
    assert(fs.get("/home/user/test_shell_dir") !== null, "2.9 mkdir через shell");

    // 2.10 touch
    await sh.run("touch test_shell.txt");
    assert(fs.get("/home/user/test_shell.txt") !== null, "2.10 touch через shell");

    // 2.11 echo > file
    await sh.run("echo content > test_shell.txt");
    const [, sc] = fs.read("/home/user/test_shell.txt");
    assert(sc.includes("content"), "2.11 echo > file");

    // 2.12 echo >> file
    await sh.run("echo more >> test_shell.txt");
    const [, sc2] = fs.read("/home/user/test_shell.txt");
    assert(sc2.includes("more"), "2.12 echo >> file");

    // 2.13 cat
    const cat = await sh.run("cat test_shell.txt");
    assert(cat.includes("content") && cat.includes("more"), "2.13 cat");

    // 2.14 grep
    const grep = await sh.run("grep content test_shell.txt");
    assert(grep.includes("content"), "2.14 grep");

    // 2.15 grep -v
    const grepv = await sh.run("grep -v content test_shell.txt");
    assert(!grepv.includes("content") || grepv.length === 0, "2.15 grep -v");

    // 2.16 wc -l
    const wc = await sh.run("wc -l test_shell.txt");
    assert(parseInt(wc) >= 1, "2.16 wc -l");

    // 2.17 пайп
    const pipe = await sh.run("cat /etc/passwd | wc -l");
    assert(parseInt(pipe) >= 2, "2.17 пайп cat | wc");

    // 2.18 grep + pipe
    const gp = await sh.run("grep user /etc/passwd | wc -l");
    assert(parseInt(gp) >= 1, "2.18 grep | wc");

    // 2.19 ;
    await sh.run("cd /tmp; ls");
    assertEq(await sh.run("pwd"), "/tmp", "2.19 ; выполняет обе команды");

    // 2.20 cp
    await sh.run("cd /home/user");
    await sh.run("cp test_shell.txt copy_shell.txt");
    assert(fs.get("/home/user/copy_shell.txt") !== null, "2.20 cp через shell");

    // 2.21 mv
    await sh.run("mv copy_shell.txt moved.txt");
    assert(fs.get("/home/user/moved.txt") !== null, "2.21 mv через shell");
    assert(fs.get("/home/user/copy_shell.txt") === null, "2.22 mv удаляет исходник");

    // 2.23 rm
    await sh.run("rm moved.txt");
    assert(fs.get("/home/user/moved.txt") === null, "2.23 rm через shell");

    // 2.24 chmod
    await sh.run("touch chmod_test.sh");
    await sh.run("chmod 755 chmod_test.sh");
    const node = fs.get("/home/user/chmod_test.sh");
    assertEq(node.perms, "rwxr-xr-x", "2.24 chmod 755");

    // 2.25 chmod 644
    await sh.run("chmod 644 chmod_test.sh");
    assertEq(fs.get("/home/user/chmod_test.sh").perms, "rw-r--r--", "2.25 chmod 644");

    // 2.26 chown
    await sh.run("chown root chmod_test.sh");
    assertEq(fs.get("/home/user/chmod_test.sh").owner, "root", "2.26 chown");

    // 2.27 alias
    await sh.run("alias ll='ls -l'");
    assertEq(sh.aliases.ll, "ls -l", "2.27 alias");

    // 2.28 alias применение
    const llout = await sh.run("ll");
    assert(llout.length > 0, "2.28 alias работает");

    // 2.29 export
    await sh.run("export TESTVAR=42");
    assertEq(sh.env.TESTVAR, "42", "2.29 export");

    // 2.30 подстановка переменных
    assertEq(await sh.run("echo $TESTVAR"), "42", "2.30 $VAR подстановка");

    // 2.31 history
    const hist = await sh.run("history");
    assert(hist.includes("pwd"), "2.31 history содержит команды");

    // 2.32 неизвестная команда
    const unknown = await sh.run("nonexistent_command_xyz");
    assert(unknown.includes("не найдена"), "2.32 неизвестная команда = ошибка");

    // 2.33 sudo
    const sudo = await sh.run("sudo whoami");
    assertEq(sudo, "user", "2.33 sudo whoami");

    // 2.34 find
    await sh.run("touch /home/user/findtest.txt");
    const find = await sh.run("find /home/user -name 'findtest.txt'");
    assert(find.includes("findtest.txt"), "2.34 find");

    // 2.35 sort
    fs.write("/home/user/sorttest.txt", "c\na\nb\n");
    const sorted = await sh.run("sort /home/user/sorttest.txt");
    assertEq(sorted.trim().split("\n"), ["a","b","c"], "2.35 sort");

    // 2.36 head
    fs.write("/home/user/headtest.txt", "1\n2\n3\n4\n5\n");
    const head = await sh.run("head -n 2 /home/user/headtest.txt");
    assertEq(head.trim().split("\n"), ["1","2"], "2.36 head -n 2");

    // 2.37 tail
    const tail = await sh.run("tail -n 2 /home/user/headtest.txt");
    assert(tail.includes("4") && tail.includes("5"), "2.37 tail -n 2");

    // 2.38 uniq
    fs.write("/home/user/uniqtest.txt", "a\na\nb\nb\n");
    const uniq = await sh.run("uniq /home/user/uniqtest.txt");
    assertEq(uniq.trim().split("\n"), ["a","b"], "2.38 uniq");

    // 2.39 sed
    const sed = await sh.run("sed 's/a/X/g' /home/user/uniqtest.txt");
    assert(sed.includes("X"), "2.39 sed");

    // 2.40 awk
    fs.write("/home/user/awktest.txt", "1 foo\n2 bar\n");
    const awk = await sh.run("awk '{print $2}' /home/user/awktest.txt");
    assert(awk.includes("foo") && awk.includes("bar"), "2.40 awk");

    // 2.41 find -type f
    const findf = await sh.run("find /etc -type f");
    assert(findf.length > 0, "2.41 find -type f");

    // 2.42 ls -l
    const lsl = await sh.run("ls -l /home/user");
    assert(lsl.includes("rw"), "2.42 ls -l показывает права");

    // 2.43 uname
    assert((await sh.run("uname")).includes("Linux"), "2.43 uname");

    // 2.44 uname -a
    assert((await sh.run("uname -a")).includes("x86_64"), "2.44 uname -a");

    // 2.45 date
    assert((await sh.run("date")).length > 0, "2.45 date");

    // 2.46 id
    assert((await sh.run("id")).includes("uid"), "2.46 id");

    // 2.47 env
    assert((await sh.run("env")).includes("USER"), "2.47 env");

    // 2.48 df
    assert((await sh.run("df")).includes("Filesystem"), "2.48 df");

    // 2.49 free
    assert((await sh.run("free")).includes("Mem"), "2.49 free");

    // 2.50 ps
    assert((await sh.run("ps")).includes("PID"), "2.50 ps");
  }

  // ============================================================
  // БЛОК 3: РАСШИРЕННЫЕ КОМАНДЫ (commands.js)
  // ============================================================
  async function testExtendedCommands() {
    section("⚙️ Расширенные команды (сети, systemd, пакеты)");
    const fs = new VirtualFS();
    const sh = new Shell(fs);

    // 3.1 ping
    assert((await sh.run("ping example.com")).includes("PING"), "3.1 ping");

    // 3.2 ip a
    assert((await sh.run("ip a")).includes("127.0.0.1"), "3.2 ip a");

    // 3.3 ip r
    assert((await sh.run("ip r")).includes("default"), "3.3 ip r");

    // 3.4 ss
    assert((await sh.run("ss")).includes("LISTEN"), "3.4 ss");

    // 3.5 curl
    assert((await sh.run("curl http://example.com")).includes("200"), "3.5 curl");

    // 3.6 wget
    assert((await sh.run("wget http://example.com")).includes("200"), "3.6 wget");

    // 3.7 systemctl status
    assert((await sh.run("systemctl status myapp")).includes("active"), "3.7 systemctl status");

    // 3.8 systemctl list-units
    assert((await sh.run("systemctl list-units")).includes("UNIT"), "3.8 systemctl list-units");

    // 3.9 journalctl
    assert((await sh.run("journalctl")).includes("linux-quest"), "3.9 journalctl");

    // 3.10 apt update
    assert((await sh.run("apt update")).includes("Hit"), "3.10 apt update");

    // 3.11 apt install
    assert((await sh.run("apt install nginx")).includes("nginx"), "3.11 apt install");

    // 3.12 dpkg -l
    assert((await sh.run("dpkg -l")).includes("bash"), "3.12 dpkg -l");

    // 3.13 tar -cf
    assert((await sh.run("tar -cf a.tar /tmp")).includes("создание"), "3.13 tar -cf");

    // 3.14 top
    assert((await sh.run("top")).includes("Tasks"), "3.14 top");

    // 3.15 lsof
    assert((await sh.run("lsof")).includes("COMMAND"), "3.15 lsof");

    // 3.16 dmesg
    assert((await sh.run("dmesg")).includes("Linux version"), "3.16 dmesg");

    // 3.17 strace
    assert((await sh.run("strace ls")).includes("execve"), "3.17 strace");

    // 3.18 groups
    assert((await sh.run("groups")).includes("user"), "3.18 groups");

    // 3.19 lsblk
    assert((await sh.run("lsblk")).includes("sda"), "3.19 lsblk");

    // 3.20 cut
    fs.write("/home/user/csv.txt", "a,b,c\nd,e,f\n");
    const cut = await sh.run("cut -d, -f2 /home/user/csv.txt");
    assert(cut.includes("b") && cut.includes("e"), "3.20 cut -d, -f2");

    // 3.21 tac
    const tac = await sh.run("tac /home/user/csv.txt");
    assert(tac.indexOf("d,e,f") < tac.indexOf("a,b,c"), "3.21 tac");

    // 3.22 nl
    const nl = await sh.run("nl /home/user/csv.txt");
    assert(nl.includes("1") && nl.includes("2"), "3.22 nl");

    // 3.23 man
    assert((await sh.run("man ls")).includes("LS"), "3.23 man");
  }

  // ============================================================
  // БЛОК 4: УРОВНИ
  // ============================================================
  function testLevels() {
    section("🎮 Уровни и миссии");

    assert(typeof LEVELS !== "undefined", "4.1 LEVELS загружен");
    assertEq(LEVELS.length, 18, "4.2 Всего 18 миссий");

    // Проверяем структуру каждого уровня
    LEVELS.forEach((level, i) => {
      assert(level.name && level.name.length > 0, `4.${i+10} Миссия ${i+1} имеет имя`);
      assert(Array.isArray(level.tasks), `4.${i+10}.1 Миссия ${i+1} имеет tasks`);
      assert(level.tasks.length > 0, `4.${i+10}.2 Миссия ${i+1} имеет хотя бы 1 задание`);

      level.tasks.forEach((task, j) => {
        assert(task.title && task.desc && task.hint, `Задание ${i+1}.${j+1} полное`);
        assert(typeof task.check === "function", `Задание ${i+1}.${j+1} имеет check`);
      });
    });

    // Все хелперы определены
    assert(typeof cmdUsed === "function", "4.50 cmdUsed существует");
    assert(typeof fileExists === "function", "4.51 fileExists существует");
    assert(typeof fileContains === "function", "4.52 fileContains существует");
    assert(typeof permIs === "function", "4.53 permIs существует");
  }

  // ============================================================
  // БЛОК 5: ПРОВЕРКИ ЗАДАНИЙ (симуляция прохождения)
  // ============================================================
  async function testTaskChecks() {
    section("✅ Проверка check() для всех заданий");

    const fs = new VirtualFS();
    const sh = new Shell(fs);
    const fakeGame = { fs, shell: sh, levelIdx: 0, taskIdx: 0, _toast: () => {} };

    let checked = 0, okCount = 0;

    for (let i = 0; i < LEVELS.length; i++) {
      for (let j = 0; j < LEVELS[i].tasks.length; j++) {
        const task = LEVELS[i].tasks[j];
        checked++;
        try {
          // Просто вызываем check — он не должен падать
          const r = task.check(sh);
          if (typeof r === "boolean") okCount++;
          else {
            assert(false, `check() задания ${i+1}.${j+1} вернул не boolean`,
              `Тип: ${typeof r}, значение: ${r}`);
          }
        } catch (e) {
          assert(false, `check() задания ${i+1}.${j+1} упал с ошибкой`, e.message);
        }
      }
    }
    assertEq(okCount, checked, `5.1 Все ${checked} check() возвращают boolean`);
  }

  // ============================================================
  // БЛОК 6: КАРТА МИРА
  // ============================================================
  function testWorldMap() {
    section("🗺️ Карта мира");

    assert(typeof WORLD_ZONES !== "undefined", "6.1 WORLD_ZONES загружена");
    assert(Array.isArray(WORLD_ZONES), "6.2 WORLD_ZONES — массив");
    assert(WORLD_ZONES.length >= 6, "6.3 Минимум 6 зон");

    WORLD_ZONES.forEach((z, i) => {
      assert(z.id && z.name && z.icon, `6.${i+10} Зона ${i+1} полная`);
      assert(Array.isArray(z.levels), `6.${i+10}.1 Зона ${i+1} имеет уровни`);
      assert(z.x > 0 && z.y > 0, `6.${i+10}.2 Зона ${i+1} имеет координаты`);
    });

    assert(typeof WorldMap === "function", "6.50 WorldMap — класс");
  }

  // ============================================================
  // БЛОК 7: ДОСТИЖЕНИЯ
  // ============================================================
  function testAchievements() {
    section("🎖️ Достижения");

    assert(typeof ACHIEVEMENTS !== "undefined", "7.1 ACHIEVEMENTS загружены");
    assert(Array.isArray(ACHIEVEMENTS), "7.2 ACHIEVEMENTS — массив");
    assert(ACHIEVEMENTS.length >= 10, "7.3 Минимум 10 достижений");

    ACHIEVEMENTS.forEach((a, i) => {
      assert(a.id && a.icon && a.name, `7.${i+10} Достижение ${i+1} полное`);
      assert(typeof a.check === "function", `7.${i+10}.1 Достижение ${i+1} имеет check`);
    });

    // Уникальность ID
    const ids = ACHIEVEMENTS.map(a => a.id);
    const unique = new Set(ids);
    assertEq(unique.size, ids.length, "7.50 Все ID достижений уникальны");

    assert(typeof AchievementSystem === "function", "7.51 AchievementSystem — класс");
  }

  // ============================================================
  // БЛОК 8: СОХРАНЕНИЕ
  // ============================================================
  function testStorage() {
    section("💾 Сохранение");

    assert(typeof Storage === "object", "8.1 Storage существует");
    assert(typeof Storage.save === "function", "8.2 Storage.save — функция");
    assert(typeof Storage.load === "function", "8.3 Storage.load — функция");
    assert(typeof Storage.clear === "function", "8.4 Storage.clear — функция");

    // Тест сериализации
    const fs = new VirtualFS();
    fs.write("/home/user/savetest.txt", "save content");
    const snapshot = Storage._serializeFS(fs.root);
    assert(snapshot.name === "/", "8.5 serialize root");

    const restored = Storage._deserializeFS(snapshot);
    assert(restored.isDir, "8.6 deserialize root");
    assert(restored.children["home"], "8.7 deserialize /home");
  }

  // ============================================================
  // БЛОК 9: UI / DOM
  // ============================================================
  function testUI() {
    section("🖥️ UI элементы");

    const ids = [
      "output", "cmdInput", "prompt", "terminal", "termTitle",
      "levelName", "taskTitle", "taskDesc", "taskCounter", "score",
      "progressFill", "progressText", "hintBox", "rankFill", "rankText",
      "hintBtn", "skipBtn", "saveBtn", "resetBtn", "examBtn", "themeBtn",
      "clearBtn", "vimModal", "vimEditor", "vimFilename", "vimStatus",
      "victoryModal", "examModal", "toast", "achievementsPanel"
    ];

    ids.forEach(id => {
      assert(document.getElementById(id) !== null, `9.x #${id} существует`);
    });
  }

  // ============================================================
  // БЛОК 10: ИНТЕГРАЦИЯ (проверка game)
  // ============================================================
  function testGameIntegration() {
    section("🎯 Интеграция игры");

    if (!window.game) {
      assert(false, "10.1 window.game не создан", "Проверь F12 — возможно ошибка запуска");
      return;
    }

    assert(window.game instanceof Game, "10.1 game — экземпляр Game");
    assert(window.game.fs instanceof VirtualFS, "10.2 game.fs корректный");
    assert(window.game.shell instanceof Shell, "10.3 game.shell корректный");
    assert(window.game.editor instanceof Editor, "10.4 game.editor корректный");
    assert(window.game.worldmap instanceof WorldMap, "10.5 game.worldmap корректный");
    assert(window.game.achievements instanceof AchievementSystem, "10.6 game.achievements корректный");
    assert(typeof window.game.levelIdx === "number", "10.7 levelIdx — число");
    assert(typeof window.game.taskIdx === "number", "10.8 taskIdx — число");
    assert(typeof window.game.score === "number", "10.9 score — число");
  }

  // ============================================================
  // БЛОК 11: ИГРОВЫЕ ПРОВЕРКИ (баги)
  // ============================================================
  async function testRegression() {
    section("🐞 Регрессионные тесты (известные баги)");

    const fs = new VirtualFS();
    const sh = new Shell(fs);

    // R1: cd НЕ создаёт несуществующие папки
    const before = fs.get("/home/user/newdir_xyz");
    await sh.run("cd /home/user/newdir_xyz");
    const after = fs.get("/home/user/newdir_xyz");
    assert(before === null && after === null,
      "R1. cd НЕ создаёт папки",
      `before=${before}, after=${after}`);

    // R2: cd в несуществующее не меняет cwd
    await sh.run("cd /home/user");
    await sh.run("cd /nonexistent_abc");
    assertEq(fs.cwd, "/home/user", "R2. cwd не меняется после неудачного cd");

    // R3: project vs projects — оба распознаются
    fs.mkdir("/home/user/project");
    fs.touch("/home/user/project/test.txt");
    const r1 = fs.get("/home/user/project/test.txt");
    assert(r1 !== null, "R3. Файл в project/ виден");

    // R4: touch не падает на несуществующей папке
    const r4 = fs.touch("/nonexistent_dir/file.txt");
    assertEq(r4[0], false, "R4. touch в несуществующей папке = false");

    // R5: mkdir -p не падает
    await sh.run("mkdir -p /home/user/a/b/c");
    assert(fs.get("/home/user/a") !== null, "R5. mkdir -p создаёт");

    // R6: Множественные пайпы
    const pipe3 = await sh.run("cat /etc/passwd | grep user | wc -l");
    assert(pipe3.length > 0, "R6. Двойной пайп работает");

    // R7: Редирект в несуществующую папку
    const r7 = await sh.run("echo test > /nonexistent/file.txt");
    assert(fs.get("/nonexistent/file.txt") === null, "R7. Редирект в несуществующую = не создаёт");

    // R8: Пустой ввод не падает
    const r8 = await sh.run("");
    assertEq(r8, "", "R8. Пустой ввод");

    // R9: Пробелы не падают
    const r9 = await sh.run("   ");
    assertEq(r9, "", "R9. Пробелы только");

    // R10: Спецсимволы в echo
    const r10 = await sh.run("echo 'a b c'");
    assertEq(r10, "a b c", "R10. echo с пробелами в кавычках");
  }

  // ============================================================
  // ЗАПУСК
  // ============================================================
  async function run() {
    console.clear();
    console.log("%c🧪 LINUX QUEST — ТЕСТИРОВАНИЕ", "font-size:20px;color:#58a6ff;font-weight:bold");
    console.log("Запуск...\n");

    passed = 0; failed = 0; errors = []; results.length = 0;
    const t0 = performance.now();

    testFS();
    await testShell();
    await testExtendedCommands();
    testLevels();
    await testTaskChecks();
    testWorldMap();
    testAchievements();
    testStorage();
    testUI();
    testGameIntegration();
    await testRegression();

    const t1 = performance.now();

    // Красивый вывод
    console.log("");
    for (const r of results) {
      if (r.section) {
        console.log(`%c${r.section}`, "font-weight:bold;color:#bc8cff;font-size:14px;margin-top:8px");
      } else if (r.ok) {
        console.log(`%c✅ ${r.name}`, "color:#3fb950");
      } else {
        console.log(`%c❌ ${r.name}`, "color:#f85149", r.detail || "");
      }
    }

    console.log("");
    console.log("%c═══════════════════════════════════════", "color:#8b949e");
    if (failed === 0) {
      console.log(`%c🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!`, "font-size:16px;color:#3fb950;font-weight:bold");
    } else {
      console.log(`%c⚠️ ПРОВАЛЕНО: ${failed} из ${passed + failed}`, "font-size:16px;color:#f85149;font-weight:bold");
      console.log("%cОшибки:", "color:#f85149;font-weight:bold");
      errors.forEach(e => console.log(`  • ${e.name}${e.detail ? " — " + e.detail : ""}`));
    }
    console.log(`%cПрошло: ${passed} | Провалено: ${failed} | Время: ${(t1-t0).toFixed(0)}ms`, "color:#8b949e");
    console.log("%c═══════════════════════════════════════", "color:#8b949e");

    // Краткое уведомление
    if (window.game && window.game._toast) {
      window.game._toast(failed === 0 ? `🎉 Тесты: ${passed}/${passed}` : `⚠️ Тесты: ${passed}/${passed+failed}`);
    }

    return { passed, failed, errors };
  }

  return { run, assert, assertEq, getResults: () => ({ passed, failed, errors }) };
})();

// Автозапуск если в URL есть ?test
if (location.search.includes("test")) {
  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => TestRunner.run(), 500);
  });
}