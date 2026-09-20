const MAN_PAGES = {
  ls: `LS(1)                       User Commands                       LS(1)

НАЗВАНИЕ
    ls — вывести содержимое каталога

СИНТАКСИС
    ls [ОПЦИИ] [ФАЙЛ...]

ОПЦИИ
    -l          длинный формат (права, владелец, размер, дата)
    -a          показать скрытые файлы
    -h          размеры в удобном виде (KB, MB, GB)
    -t          сортировка по времени
    -r          обратный порядок
    -R          рекурсивно

ПРИМЕРЫ
    ls                  содержимое текущей папки
    ls -la              подробно + скрытые
    ls -lh /var/log     логи с размерами
    ls *.txt            только .txt файлы

СМОТРИ ТАКЖЕ
    cd(1), pwd(1), find(1)
`,

  cd: `CD(1)                       User Commands                       CD(1)

НАЗВАНИЕ
    cd — сменить текущий каталог

СИНТАКСИС
    cd [КАТАЛОГ]

СПЕЦИАЛЬНЫЕ ПУТИ
    ~           домашний каталог
    ..          родительский каталог
    .           текущий каталог
    -           предыдущий каталог
    /           корень

ПРИМЕРЫ
    cd /etc             перейти в /etc
    cd ~                домой
    cd ..               на уровень вверх
    cd -                вернуться назад

СМОТРИ ТАКЖЕ
    pwd(1), ls(1)
`,

  pwd: `PWD(1)                      User Commands                      PWD(1)

НАЗВАНИЕ
    pwd — показать текущий каталог

СИНТАКСИС
    pwd

ПРИМЕРЫ
    pwd                 /home/user

СМОТРИ ТАКЖЕ
    cd(1), ls(1)
`,

  mkdir: `MKDIR(1)                    User Commands                    MKDIR(1)

НАЗВАНИЕ
    mkdir — создать каталог

СИНТАКСИС
    mkdir [ОПЦИИ] КАТАЛОГ...

ОПЦИИ
    -p          создать промежуточные каталоги
    -m РЕЖИМ    установить права

ПРИМЕРЫ
    mkdir projects              создать папку
    mkdir -p a/b/c/d            с вложенными
    mkdir dir1 dir2 dir3        несколько

СМОТРИ ТАКЖЕ
    rmdir(1), touch(1)
`,

  touch: `TOUCH(1)                    User Commands                    TOUCH(1)

НАЗВАНИЕ
    touch — создать пустой файл

СИНТАКСИС
    touch ФАЙЛ...

ПРИМЕРЫ
    touch file.txt              создать файл
    touch a.txt b.txt           несколько

СМОТРИ ТАКЖЕ
    mkdir(1), vim(1)
`,

  rm: `RM(1)                       User Commands                       RM(1)

НАЗВАНИЕ
    rm — удалить файлы и каталоги

СИНТАКСИС
    rm [ОПЦИИ] ФАЙЛ...

⚠️ ВНИМАНИЕ: удаление необратимо!

ОПЦИИ
    -r          рекурсивно (для каталогов)
    -f          без подтверждения
    -i          спрашивать
    -rf         комбо (опасно!)

ПРИМЕРЫ
    rm file.txt                 удалить файл
    rm -r folder/               удалить папку
    rm *.log                    все логи

СМОТРИ ТАКЖЕ
    mv(1), cp(1)
`,

  cp: `CP(1)                       User Commands                       CP(1)

НАЗВАНИЕ
    cp — копировать файлы

ОПЦИИ
    -r          рекурсивно
    -i          спрашивать
    -v          показывать
    -p          сохранить права

ПРИМЕРЫ
    cp a.txt b.txt              копировать
    cp -r src/ dst/             папку
    cp *.txt /backup/           все .txt

СМОТРИ ТАКЖЕ
    mv(1), rsync(1)
`,

  mv: `MV(1)                       User Commands                       MV(1)

НАЗВАНИЕ
    mv — переместить или переименовать

ПРИМЕРЫ
    mv old.txt new.txt          переименовать
    mv file.txt /tmp/           переместить

СМОТРИ ТАКЖЕ
    cp(1), rm(1)
`,

  cat: `CAT(1)                      User Commands                      CAT(1)

НАЗВАНИЕ
    cat — вывести содержимое файла

ОПЦИИ
    -n          нумеровать строки
    -A          показать непечатаемые

ПРИМЕРЫ
    cat file.txt                показать
    cat -n file.txt             с номерами

СМОТРИ ТАКЖЕ
    head(1), tail(1), less(1)
`,

  grep: `GREP(1)                     User Commands                     GREP(1)

НАЗВАНИЕ
    grep — поиск по шаблону

ОПЦИИ
    -i          игнорировать регистр
    -v          инвертировать
    -r          рекурсивно
    -n          номера строк
    -c          посчитать

ПРИМЕРЫ
    grep user /etc/passwd               найти user
    grep -i hello file.txt              без регистра
    grep -rn "TODO" src/                рекурсивно

СМОТРИ ТАКЖЕ
    awk(1), sed(1), find(1)
`,

  find: `FIND(1)                     User Commands                     FIND(1)

НАЗВАНИЕ
    find — поиск файлов

ОПЦИИ
    -name ШАБЛОН       по имени
    -type f            файлы
    -type d            каталоги
    -size +10M         больше 10 MB
    -mtime -7          изменён за 7 дней

ПРИМЕРЫ
    find / -name "*.conf"
    find /home -type f -name "*.txt"
    find /var/log -mtime -1

СМОТРИ ТАКЖЕ
    ls(1), grep(1)
`,

  chmod: `CHMOD(1)                    User Commands                    CHMOD(1)

НАЗВАНИЕ
    chmod — изменить права доступа

ЧИСЛОВОЙ РЕЖИМ
    4 = r (чтение)
    2 = w (запись)
    1 = x (выполнение)

ЧАСТЫЕ ЗНАЧЕНИЯ
    755         rwxr-xr-x (исполняемые, каталоги)
    644         rw-r--r-- (обычные файлы)
    700         rwx------ (приватное)
    777         rwxrwxrwx (опасно!)

ПРИМЕРЫ
    chmod 755 script.sh
    chmod 644 data.txt
    chmod +x script.sh
    chmod -R 755 dir/

СМОТРИ ТАКЖЕ
    chown(1), ls(1)
`,

  chown: `CHOWN(1)                    User Commands                    CHOWN(1)

НАЗВАНИЕ
    chown — изменить владельца

ПРИМЕРЫ
    chown user file.txt
    chown user:users file.txt
    chown -R user:users dir/

СМОТРИ ТАКЖЕ
    chmod(1), groups(1)
`,

  ps: `PS(1)                       User Commands                       PS(1)

НАЗВАНИЕ
    ps — снимок процессов

ОПЦИИ
    aux         все процессы
    -ef         все (UNIX)
    --forest    дерево

ПРИМЕРЫ
    ps
    ps aux
    ps aux | grep nginx

СМОТРИ ТАКЖЕ
    top(1), htop(1), kill(1)
`,

  ping: `PING(1)                     User Commands                     PING(1)

НАЗВАНИЕ
    ping — проверить сетевую доступность

ОПЦИИ
    -c N        послать N пакетов
    -i N        интервал
    -W N        таймаут

ПРИМЕРЫ
    ping google.com
    ping -c 3 google.com
    ping -c 1 8.8.8.8

СМОТРИ ТАКЖЕ
    curl(1), ss(1)
`,

  tar: `TAR(1)                      User Commands                      TAR(1)

НАЗВАНИЕ
    tar — работа с архивами

ОПЦИИ
    -c          создать
    -x          распаковать
    -t          показать содержимое
    -f FILE     имя архива
    -v          показать прогресс
    -z          gzip (.tar.gz)
    -j          bzip2

ЗАПОМНИ
    -czf        создать
    -xzf        распаковать
    -tzf        посмотреть

ПРИМЕРЫ
    tar -cf archive.tar dir/
    tar -czf archive.tar.gz dir/
    tar -xf archive.tar
    tar -xzf archive.tar.gz

СМОТРИ ТАКЖЕ
    gzip(1), zip(1)
`,

  sudo: `SUDO(8)                 System Administration                 SUDO(8)

НАЗВАНИЕ
    sudo — выполнить от root

ОПЦИИ
    -u USER     от имени USER
    -i          root-сессия
    -l          показать права

ПРИМЕРЫ
    sudo apt update
    sudo -i
    sudo -l

СМОТРИ ТАКЖЕ
    su(1), visudo(8)
`,

  help: `HELP(1)                     User Commands                     HELP(1)

НАЗВАНИЕ
    help — список команд Linux Quest

СМОТРИ ТАКЖЕ
    man(1)
`,

  man: `MAN(1)                      User Commands                      MAN(1)

НАЗВАНИЕ
    man — руководство по команде

СИНТАКСИС
    man КОМАНДА

ПРИМЕРЫ
    man ls              мануал ls
    man chmod           мануал chmod
    man tar             мануал tar

СМОТРИ ТАКЖЕ
    help(1)
`
};