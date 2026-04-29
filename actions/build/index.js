const { runFixedShellCommand } = require('./execShared');
const { TRIGGER_MESSAGE: TRIGGER_WEB, FIXED_SHELL_COMMAND: SHELL_WEB } = require('./web');
const { TRIGGER_MESSAGE: TRIGGER_APP, FIXED_SHELL_COMMAND: SHELL_APP } = require('./app');
const { TRIGGER_MESSAGE: TRIGGER_API, FIXED_SHELL_COMMAND: SHELL_API } = require('./api');
const { TRIGGER_MESSAGE: TRIGGER_MOBILE, FIXED_SHELL_COMMAND: SHELL_MOBILE } = require('./api-mobile');
const { TRIGGER_MESSAGE: TRIGGER_MAINTAIN, FIXED_SHELL_COMMAND: SHELL_MAINTAIN } = require('./maintain');

const CHANNELS = [
  { label: 'Web', trigger: TRIGGER_WEB, shell: SHELL_WEB },
  { label: 'App', trigger: TRIGGER_APP, shell: SHELL_APP },
  { label: 'API', trigger: TRIGGER_API, shell: SHELL_API },
  { label: 'API Mobile', trigger: TRIGGER_MOBILE, shell: SHELL_MOBILE },
  { label: 'Maintain', trigger: TRIGGER_MAINTAIN, shell: SHELL_MAINTAIN },
];

function normalizeChatCommand(command) {
  return String(command || '')
    .trim()
    .toLowerCase();
}

/** Có xử lý nhánh build từ Chatwork không (trigger chính xác hoặc chữ "build" trong lệnh). */
function isBuildChatCommand(command) {
  const c = normalizeChatCommand(command);
  if (!c) {
    return false;
  }
  if (CHANNELS.some((ch) => c === ch.trigger)) {
    return true;
  }
  return false;
}

/**
 * Chỉ chạy shell cố định theo trigger; tạm thời không gửi tin Chatwork.
 * @param {string} _roomId
 * @param {string} _apiToken
 * @param {string} command
 */
async function sendBuildFromChatwork(_roomId, _apiToken, command) {
  const c = normalizeChatCommand(command);
  const channel = CHANNELS.find((ch) => c === ch.trigger);
  if (!channel) {
    return;
  }

  const result = await runFixedShellCommand(channel.shell);
  if (result.ok) {
    console.log(`[build ${channel.label}] ok`, result.stdout?.trim() || '(no stdout)', result.stderr?.trim() || '');
  } else {
    console.error(`[build ${channel.label}] failed`, result.error, result.stderr || '');
  }
}

module.exports = { sendBuildFromChatwork, isBuildChatCommand };
