# Вход Google и Яндекс для shop.example.com

Код интеграций уже есть. Чтобы кнопки заработали, владелец создаёт приложения и сохраняет Client ID / Client Secret на VPS. Не вставляйте секреты в чат или файлы dist. Сервер автоматически включает настроенные кнопки через /api/shop-auth.

## Google

В https://console.cloud.google.com/ создайте проект Vera Prive. В Google Auth Platform настройте Branding (название, email поддержки, домен shop.example.com), Audience External. Создайте OAuth client типа Web application в Clients.

- JavaScript origin: `https://shop.example.com`
- Authorized redirect URI: `https://shop.example.com/api/auth/callback/google`
- Для тестового режима добавьте тестовые Google-аккаунты в Audience. Для общего запуска переведите приложение в Production; выполните требования консоли, если она запросит проверку.
- Запрашиваются базовые данные профиля и email.

## Яндекс

На https://oauth.yandex.ru/ создайте приложение **для авторизации пользователей**, веб-сервис Vera Prive.

- Адрес сайта: `https://shop.example.com`
- Redirect URI: `https://shop.example.com/api/auth/callback/yandex`
- Права: `login:email`, `login:info`, `login:birthday`.

## Ввод на VPS

Сначала обновите сайт с Mac:

```bash
bash /path/to/project/web/deploy/upload-from-mac.sh
```

Затем в SSH-терминале сервера:

```bash
cd /opt/vera-prive
python3 deploy/configure-oauth.py google
python3 deploy/configure-oauth.py yandex
docker compose -f deploy/compose.yaml up -d --force-recreate app
```

Можно подключать по одному провайдеру: запускайте только его команду. Секрет вводится скрыто. Скрипт сохраняет SMTP и остальные настройки. Простого restart недостаточно для перечитывания env_file: контейнер должен быть пересоздан.

Проверьте на сайте в приватном окне: вход → провайдер → подтверждение → возврат в аккаунт, затем выход и повторный вход. Автотесты проверяют формирование URL и состояние OAuth, но не заменяют реальный вход с выданными ключами. Для Telegram в тесте подменяется discovery, реальные токены не используются.

Автоматическое объединение по подтверждённой почте включено. При совпадающей подтверждённой локально почте Google и Яндекс объединяются с существующим аккаунтом автоматически. Ключи перевыпускать не требуется.

Документация: https://developers.google.com/identity/protocols/oauth2/web-server ; https://yandex.ru/dev/id/doc/ru/register-client ; https://core.telegram.org/bots/telegram-login

Телефон удалён: не запрашивается у Яндекса, не сохраняется в профиле/API. При запуске новая версия удаляет прежнюю колонку phone, при открытии сайта очищает поле в локальных профилях браузера. Резервные копии хостинга отдельно не изменяются.
