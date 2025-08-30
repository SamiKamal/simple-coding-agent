const FRAMES_UTF8 = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'] as const;
const FRAMES_ASCII = ['-','\\','|','/'] as const;

type Status = 'success' | 'fail' | 'stop';
type StopFn = (status?: Status, finalText?: string) => void;

export function startSpinner(text = 'Working…', intervalMs = 90): StopFn {
  const tty = process.stdout.isTTY;
  const frames = process.platform === 'win32' ? FRAMES_ASCII : FRAMES_UTF8;
  let i = 0;
  let timer: NodeJS.Timeout | undefined;
  let stopped = false;

  const hide = () => tty && process.stdout.write('\x1B[?25l');
  const show = () => tty && process.stdout.write('\x1B[?25h');
  const clearLine = () => tty && process.stdout.write('\x1B[2K\x0D'); // clear + CR

  const render = () => {
    if (!tty || stopped) return;
    const f = frames[i = (i + 1) % frames.length];
    process.stdout.write(`\x1B[2K\x0D${f} ${text}`); // clear line + carriage return
  };

  if (tty) {
    hide();
    render();
    timer = setInterval(render, intervalMs);
  } else {
    // Non-TTY (CI/pipes): fall back to one log
    process.stdout.write(`${text}...\n`);
  }

  const stop: StopFn = (status = 'stop', finalText) => {
    if (stopped) return;
    stopped = true;
    if (timer) clearInterval(timer);
    if (tty) {
      clearLine();
      const icon = status === 'success' ? '✔' : status === 'fail' ? '✖' : '●';
      process.stdout.write(`${icon} ${finalText ?? text}\n`);
      show();
    }
  };

  // Ensure cursor restore on exit/ctrl-c
  const restore = () => { try { stop('stop'); } catch {} };
  process.once('SIGINT', () => { restore(); process.exit(130); });
  process.once('exit', restore);

  return stop;
}

export async function withSpinner<T>(text: string, task: () => Promise<T>): Promise<T> {
  const stop = startSpinner(text);
  try {
    const res = await task();
    stop('success', text);
    return res;
  } catch (e) {
    stop('fail', text);
    throw e;
  }
}
