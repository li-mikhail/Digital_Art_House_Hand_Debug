# Правила работы в проекте

## 1. НИКОГДА не открывать Preview в приложении

Это правило номер один и самое важное. Не открывать панель Preview ни при каких обстоятельствах. Не упоминать Preview в ответах. Если система сама открывает Preview-панель после правки файлов — игнорировать и не упоминать это в ответе пользователю.

## 2. Язык общения

Общение с пользователем всегда на русском языке.

## 3. Рабочий процесс

- Проект — одна HTML-страница `index.html` с ассетами в `assets/`
- Локальный сервер: `python3 -m http.server 8085 --bind 0.0.0.0` из папки проекта
- Публичная ссылка: https://touch-to-create.vercel.app
- Локальный превью через браузер: http://localhost:8085
- Git: ветка `main` — основная, для новых фич создавать feature-ветки и открывать PR
- Репозиторий: https://github.com/Phareek/digital-art-house-poster

## 4. Стек

- Чистый HTML/CSS/JS, без сборки
- Rive для анимации руки (`assets/hand.riv`)
- Canvas 2D для плазмы и частиц
- Google Fonts + локальные `.ttf` (Didot, Avenir Next Cyr)
- Деплой: Vercel

## 5. Деплой

Продакшн-деплой на Vercel вручную:

```bash
cd "/Users/vladislavboichuk/Projects/CLAUDE CODE/ART DIGITAL HOUSE/LCD DISPLAY ADV"
npx vercel --prod
```
