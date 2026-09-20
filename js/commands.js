(function () {
  const origRegister = registerCommands;
  window.registerCommands = function(sh) {
    origRegister(sh);
    const fs = sh.fs;

    // === СЕТИ ===
    sh.commands.ping = (a) => {
      if (!a.length) return "ping: нужен хост";
      const host = a[0];
      return [
        `PING ${host} (93.184.216.34) 56(84) bytes of data.`,
        `64 bytes from ${host}: icmp_seq=1 ttl=56 time=2 ms`,
        `64 bytes from ${host}: icmp_seq=2 ttl=56 time=2 ms`,
        `64 bytes from ${host}: icmp_seq=3 ttl=56 time=2 ms`,
        `64 bytes from ${host}: icmp_seq=3 ttl=56 time=2 ms`,
        ``,
        `--- ${host} ping statistics ---`,
        `4 packets transmitted, 4 received, 0% packet loss`
      ].join("\n");
    };

    sh.commands.ip = (a) => {
      if (a[0] === "a" || a[0] === "addr") {
        return [
          "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536",
          "    inet 127.0.0.1/8 scope host lo",
          "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500",
          "    inet 192.168.1.5/24 brd 192.168.1.255 scope global eth0"
        ].join("\n");
      }
      if (a[0] === "r" || a[0] === "route") {
        return "default via 192.168.1.1 dev eth0\n192.168.1.0/24 dev eth0 proto kernel scope link";
      }
      return "ip: используйте 'ip a' или 'ip r'";
    };

    sh.commands.ss = () =>
      "Netid  State   Local Address:Port\n" +
      "tcp    LISTEN  0.0.0.0:22\n" +
      "tcp    LISTEN  0.0.0.0:80\n" +
      "tcp    ESTAB   192.168.1.42:443";

    sh.commands.netstat = sh.commands.ss;

    sh.commands.curl = (a) => {
      const url = a.find(x => x.startsWith("https")) || "https://example.com/";
      return `<html>\n<head><title>200 OK — ${url}</title></head>\n<body>Hello Student</body>\n</html>`;
    };

    sh.commands.wget = (a) => {
      if (!a.length) return "wget: нужен URL";
      return `--2024-01-01--  ${a[0]}\nResolving... 93.184.216.34\nConnecting... connected.\nHTTP request sent, awaiting response... 200 OK`;
    };

    // === SYSTEMD ===
    sh.commands.systemctl = (a) => {
      const cmd = a[0];
      if (cmd === "status") {
        const svc = a[1] || "myapp.service";
        return `● ${svc} - My App\n   Loaded: loaded (/etc/systemd/system/${svc}; enabled)\n   Active: active (running) since Mon 2024-01-01 12:00:00;\n Main PID: 1234 (myapp)`;
      }
      if (cmd === "start" || cmd === "stop" || cmd === "restart") return "";
      if (cmd === "enable" || cmd === "disable") return `Created symlink /etc/systemd/system/multi-user.target.wants/${a[1] || "service"}`;
      if (cmd === "list-units") {
        return "UNIT              LOAD   ACTIVE SUB     DESCRIPTION\nmyapp.service     loaded active running My App\nnginx.service     loaded active running nginx";
      }
      return "systemctl: используйте start/stop/status/enable/list-units";
    };

    sh.commands.journalctl = () =>
      "Jan 01 12:00:00 linux-quest systemd[1]: Started My App.\n" +
      "Jan 01 12:00:01 linux-quest myapp[1234]: Application started";

    // === ПАКЕТЫ ===
    sh.commands.apt = (a) => {
      const cmd = a[0];
      if (cmd === "update") return "Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease\nReading package lists... Done";
      if (cmd === "install") return `Reading package lists... Done\nBuilding dependency tree... Done\nThe following NEW packages will be installed:\n  ${a.slice(1).join(" ")}\nSetting up ${a[1]}...`;
      if (cmd === "remove") return `Removing ${a[1]}...`;
      if (cmd === "list") return "Listing... Done\nbash/jammy,now 5.1-6ubuntu1 amd64 [installed]\ncurl/jammy,now 7.81.0-1 amd64 [installed]";
      return "apt: используйте update/install/remove/list";
    };

    sh.commands.dpkg = (a) => {
      if (a[0] === "-l") return "ii  bash    5.1-6ubuntu1  amd64  GNU Bourne Again SHell\nii  curl    7.81.0-1      amd64  command line tool";
      return "dpkg: используйте -l";
    };

    // === АРХИВЫ ===
    sh.commands.tar = (a) => {
      const flags = a[0] || "";
      if (flags.includes("c")) return `tar: создание архива ${a[a.length - 1]}`;
      if (flags.includes("x")) return "tar: распаковка завершена";
      if (flags.includes("t")) return "file1.txt\nfile2.txt\nprojects/\nprojects/app.py";
      return "tar: используйте -cf/-xf/-tf";
    };

    sh.commands.gzip = (a) => a.length ? `сжат ${a[0]}` : "gzip: нужен файл";
    sh.commands.zip = (a) => a.length ? `adding: ${a[1] || "files"} (deflated 60%)` : "zip: нужен архив";
    sh.commands.unzip = (a) => a.length ? `Archive: ${a[0]}\n  inflating: file.txt` : "unzip: нужен архив";

    // === ПРОЦЕССЫ ===
    sh.commands.top = () => 
      "top - 12:00:00 up 1 day,  1 user,  load average: 0.10\n" +
      "Tasks:  45 total,   1 running\n" +
      "%Cpu(s):  2.3 us,  0.5 sy\n" +
      "MiB Mem:   8000 total,   3000 used\n" +
      "  PID USER      PR  NI    VIRT    RES  %CPU  %MEM     TIME+ COMMAND\n" +
      " 1234 user      20   0   100.0m  20.0m   0.7   0.3   0:01.23 bash";

    sh.commands.htop = sh.commands.top;

    sh.commands.lsof = () =>
      "COMMAND  PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\n" +
      "bash    100 user  cwd    DIR  8,1     4096    2 /home/user\n" +
      "bash    100 user  txt    REG  8,1   1113504 1234 /usr/bin/bash";

    sh.commands.dmesg = () =>
      "[    0.000000] Linux version 5.15.0\n" +
      "[    0.500000] Memory: 8000000K available\n" +
      "[    1.200000] eth0: link up";

    sh.commands.strace = (a) => {
      const cmd = a[0] || "ls";
      return `execve("/usr/bin/${cmd}", ["${cmd}"], 0x7ffe...) = 0\n` +
             `brk(NULL) = 0x55a1a000\n` +
             `openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY) = 3\n` +
             `+++ exited with 0 +++`;
    };

    // === ПОЛЬЗОВАТЕЛИ ===
    sh.commands.useradd = (a) => a.length ? `Добавлен пользователь ${a[a.length-1]}` : "useradd: нужен юзер";
    sh.commands.passwd = (a) => a.length ? `Changing password for ${a[0]}\nNew password: ****\npasswd: updated successfully` : "passwd: нужен юзер";
    sh.commands.groups = () => "user sudo";
    sh.commands.who = () => "user   pts/0        2024-01-01 12:00";
    sh.commands.lsblk = () =>
      "NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT\n" +
      "sda      8:0    0   20G  0 disk\n" +
      "└─sda1   8:1    0   20G  0 part /";
    sh.commands.mount = () =>
      "/dev/sda1 on / type ext4 (rw,relatime)\n" +
      "tmpfs on /tmp type tmpfs (rw)";

    sh.commands.vim = () => "__OPEN_EDITOR__";
    sh.commands.nano = () => "__OPEN_EDITOR__";
    sh.commands.vi = () => "__OPEN_EDITOR__";

    sh.commands.man = (a) => {
      if (!a.length) return "Что показать? Пример: man ls";
      if (typeof MAN_PAGES === "undefined") {
        return "man: MAN_PAGES не загружен. Проверь js/man.js в index.html";
      }
      const cmd = a[0].toLowerCase();
      const page = MAN_PAGES[cmd];
      if (!page) {
        const available = Object.keys(MAN_PAGES).join(", ");
        return `Нет руководства по команде '${cmd}'.\nДоступно: ${available}`;
      }
      return page;
    };
  };
})();