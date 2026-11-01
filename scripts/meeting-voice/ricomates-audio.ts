/** Bounded audio playback into the existing Vexa virtual microphone. No URLs or shell commands. */
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';

export function createRicomatesAudio() {
  let processes: ChildProcess[] = [];
  let busy = false;
  const mute = (muted: boolean) => {
    for (const [kind, device] of [['sink', 'tts_sink'], ['source', 'virtual_mic']]) {
      execFileSync('pactl', [`set-${kind}-mute`, device!, muted ? '1' : '0'], { stdio: 'pipe' });
    }
  };
  const stop = () => {
    for (const child of processes) { child.stdin?.destroy(); child.kill('SIGKILL'); }
    try { mute(true); } catch { /* stop is idempotent */ }
  };
  const play = async (encoded: string) => {
    if (busy) throw new Error('Audio playback already in progress');
    const bytes = Buffer.from(encoded, 'base64');
    if (!bytes.length || bytes.length > 1024 * 1024) throw new Error('Audio size invalid');
    const wav = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WAVE';
    const mp3 = bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 255 && ((bytes[1] ?? 0) & 224) === 224);
    if (!wav && !mp3) throw new Error('Audio format invalid');
    busy = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      mute(false);
      await new Promise<void>((resolve, reject) => {
        const decoder = spawn('ffmpeg', ['-nostdin', '-loglevel', 'error', '-protocol_whitelist', 'pipe', '-f', wav ? 'wav' : 'mp3', '-i', 'pipe:0', '-t', '30', '-f', 's16le', '-ar', '24000', '-ac', '1', 'pipe:1'], { stdio: ['pipe', 'pipe', 'pipe'] });
        const player = spawn('paplay', ['--raw', '--format=s16le', '--rate=24000', '--channels=1', '--device=tts_sink'], { stdio: ['pipe', 'pipe', 'pipe'] });
        processes = [decoder, player];
        let finished = false;
        const fail = () => { if (!finished) { finished = true; stop(); reject(new Error('Audio playback failed or stopped')); } };
        decoder.on('error', fail); player.on('error', fail);
        decoder.stdin.on('error', fail); player.stdin.on('error', fail);
        decoder.stderr.resume(); player.stderr.resume(); player.stdout.resume();
        decoder.on('exit', code => { if (code !== 0) fail(); });
        player.on('exit', code => { if (code !== 0) fail(); else if (!finished) { finished = true; resolve(); } });
        decoder.stdout.pipe(player.stdin);
        decoder.stdin.end(bytes);
        timer = setTimeout(fail, 35000);
      });
    } finally {
      if (timer) clearTimeout(timer);
      stop(); processes = []; busy = false;
    }
  };
  return { play, stop };
}
