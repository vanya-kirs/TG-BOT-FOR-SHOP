#!/usr/bin/env python3
"""Run on VPS: python3 deploy/configure-oauth.py google|yandex"""
import getpass
import json
import os
from pathlib import Path
import re
import sys
import tempfile


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in ('google', 'yandex'):
        raise SystemExit('Укажите провайдера: google или yandex')
    provider = sys.argv[1].upper()
    env = Path(__file__).resolve().parent.parent / '.env'
    if not env.exists():
        raise SystemExit('Сначала установите сайт: файл .env отсутствует.')
    client_id = input('Client ID: ').strip()
    secret = getpass.getpass('Client Secret (ввод скрыт): ').strip()
    if not client_id or not secret or any(c in client_id + secret for c in '\r\n\x00"\\'):
        raise SystemExit('Пустые значения или недопустимые символы. Настройки не изменены.')
    values = {provider + '_CLIENT_ID': client_id, provider + '_CLIENT_SECRET': secret}
    lines = env.read_text().splitlines()
    lines = [line for line in lines if not any(re.match(r'^\s*(?:export\s+)?' + key + r'\s*=', line) for key in values)]
    lines.extend(key + '=' + json.dumps(value) for key, value in values.items())
    fd, name = tempfile.mkstemp(dir=env.parent, prefix='.oauth-env-')
    try:
        with os.fdopen(fd, 'w') as stream:
            stream.write('\n'.join(lines) + '\n')
        os.chmod(name, 0o600)
        os.replace(name, env)
    finally:
        if os.path.exists(name):
            os.unlink(name)
    print('Настройки сохранены. Примените: docker compose -f deploy/compose.yaml up -d --force-recreate app')


if __name__ == '__main__':
    main()
