import assert from 'node:assert/strict';
import { createGmeetPipeline } from '/app/core/meetings/modules/gmeet-pipeline/dist/gmeet-pipeline.js';

const confirmed = [];
let finishFirst, calls = 0;
const phrase = 'Rico, what can you help me with?';
const answer = { text: phrase, language: 'en', segments: [{ text: phrase, start: 0, end: 3 }] };
const pipeline = createGmeetPipeline({
  transcribe: async () => { calls++; if (calls === 1) await new Promise(resolve => { finishFirst = resolve; }); return answer; },
  sink: { segment: value => confirmed.push(value), draft() {}, finalize() {} },
});
const start = Date.now();
pipeline.feedAudio(0, 'Test owner', new Float32Array(48000).fill(0.1), start);
pipeline.feedAudio(0, 'Test owner', new Float32Array(48000).fill(0.1), start + 5000);
assert.equal(typeof finishFirst, 'function', 'closed turn submitted for STT');
await new Promise(resolve => setTimeout(resolve, 13000));
finishFirst();
await new Promise(resolve => setTimeout(resolve, 100));
const retained = confirmed.some(segment => segment.text === phrase && segment.start < (start + 5000) / 1000);
await pipeline.dispose();
assert.ok(retained, 'a result slower than 12 seconds must survive turn cleanup');
console.log('PASS: delayed STT result survived turn closure and was confirmed.');
