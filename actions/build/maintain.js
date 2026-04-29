const TRIGGER_MESSAGE = '/maintain-207';
const FIXED_SHELL_COMMAND = 'cd .. && cp -r nginx/conf.d.orig/* nginx/conf.d/ && docker compose restart nginx && echo "[maintain] fixed command — sửa FIXED_SHELL_COMMAND trong actions/build/maintain.js"';

module.exports = { TRIGGER_MESSAGE, FIXED_SHELL_COMMAND };
