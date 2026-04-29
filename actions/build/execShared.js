const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/** Root repo (chatwork/) — từ actions/build lên 2 cấp */
const REPO_ROOT = path.resolve(__dirname, '..', '..');
/**
 * Mặc định: root repo để lệnh kiểu `cd ../story` tới folder *ngang hàng* với repo (cùng parent).
 * Muốn cwd là thư mục cha (vd. PhpstormProjects): đặt BUILD_EXEC_CWD và trong shell dùng `cd story` (không `../story`).
 */
const DEFAULT_BUILD_CWD = path.resolve(REPO_ROOT, '..');

function resolveBuildCwd(explicitCwd) {
  if (explicitCwd) {
    return explicitCwd;
  }
  if (process.env.BUILD_EXEC_CWD) {
    return path.resolve(process.env.BUILD_EXEC_CWD);
  }
  return DEFAULT_BUILD_CWD;
}

const defaultTimeoutMs = () => Number(process.env.BUILD_EXEC_TIMEOUT_MS) || 60_000;
const defaultMaxBuffer = () => Number(process.env.BUILD_EXEC_MAX_BUFFER) || 10 * 1024 * 1024;

function shellOption() {
  return process.platform === 'win32'
    ? true
    : process.env.BUILD_API_SHELL || '/bin/bash';
}

/**
 * Chạy một shell command cố định (dùng từ Chatwork).
 * @param {string} shellCommand
 * @param {{ cwd?: string, timeoutMs?: number }} [execOpts] — cwd mặc định: root repo; ghi đè bằng BUILD_EXEC_CWD hoặc execOpts.cwd
 */
async function runFixedShellCommand(shellCommand, execOpts = {}) {
  const timeoutMs = execOpts.timeoutMs ?? defaultTimeoutMs();
  try {
    const { stdout, stderr } = await execAsync(shellCommand, {
      cwd: resolveBuildCwd(execOpts.cwd),
      timeout: timeoutMs,
      maxBuffer: defaultMaxBuffer(),
      env: { ...process.env },
      shell: shellOption(),
    });
    return {
      ok: true,
      stdout: stdout ?? '',
      stderr: stderr ?? '',
      exitCode: 0,
      killed: false,
      error: null,
    };
  } catch (err) {
    const code = err.code;
    const killed = err.killed === true;
    return {
      ok: false,
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      exitCode: typeof code === 'number' ? code : killed ? null : 1,
      killed,
      error: err.message,
    };
  }
}

module.exports = { runFixedShellCommand };
