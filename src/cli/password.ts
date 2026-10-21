import { emitKeypressEvents, type Key } from 'node:readline';

type PasswordInput = NodeJS.ReadStream;
export function promptPassword(input: PasswordInput = process.stdin, output: { write(text: string): unknown } = process.stderr) {
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    return Promise.reject(new Error('Keine interaktive Passworteingabe möglich. --password oder SVWS_PASSWORD verwenden.'));
  }
  return new Promise<string>((resolve, reject) => {
    const wasRaw = input.isRaw;
    const wasPaused = input.isPaused();
    let password = '';
    const finish = (error?: Error) => {
      input.removeListener('keypress', onKey);
      input.removeListener('end', onEnd);
      input.removeListener('error', onError);
      input.setRawMode(Boolean(wasRaw));
      if (wasPaused) input.pause();
      output.write('\n');
      if (error) reject(error);
      else resolve(password);
    };
    const onEnd = () => finish(new Error('Passworteingabe beendet.'));
    const onError = (error: Error) => finish(error);
    const onKey = (text: string | undefined, key: Key = {}) => {
      if (key.ctrl && (key.name === 'c' || key.name === 'd')) {
        finish(new Error('Passworteingabe abgebrochen.'));
      } else if (key.name === 'return' || key.name === 'enter') {
        finish();
      } else if (key.name === 'backspace') {
        password = Array.from(password).slice(0, -1).join('');
      } else if (text && !key.ctrl && !key.meta && !/[\x00-\x1f\x7f]/.test(text)) {
        password += text;
      }
    };
    emitKeypressEvents(input);
    input.setRawMode(true);
    input.on('keypress', onKey);
    input.once('end', onEnd);
    input.once('error', onError);
    output.write('Passwort (Eingabe verborgen): ');
    input.resume();
  });
}

export async function resolvePassword(argument: string | undefined, environment: string | undefined, prompt = promptPassword) {
  if (argument !== undefined) return argument;
  if (environment !== undefined && environment !== '') return environment;
  return prompt();
}
