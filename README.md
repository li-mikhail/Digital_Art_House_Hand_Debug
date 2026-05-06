# Touch to Create

Локальный запуск из терминала:

```bash
npm start
```

После запуска:

- дисплей: http://localhost:8085/
- пульт управления: http://localhost:8085/control

Если порт занят, можно выбрать другой:

```bash
npm start -- --port 8086
```

Если нужна короткая команда без `npm start`, один раз выполните:

```bash
npm link
```

После этого проект можно запускать командой:

```bash
touch-to-create
```
