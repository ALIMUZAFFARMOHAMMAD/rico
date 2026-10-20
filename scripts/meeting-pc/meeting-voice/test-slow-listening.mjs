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
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(typeof finishFirst, 'function', 'closed turn submitted for STT');
await new Promise(resolve => setTimeout(resolve, 13000));
finishFirst();
await new Promise(resolve => setTimeout(resolve, 100));
const retained = confirmed.some(segment => segment.text === phrase && segment.start < (start + 5000) / 1000);
await pipeline.dispose();
assert.ok(retained, 'a result slower than 12 seconds must survive turn cleanup');
console.log('PASS: delayed STT result survived turn closure and was confirmed.');

let active = 0, maximumActive = 0;
const queued = createGmeetPipeline({
  transcribe: async () => {
    active++; maximumActive = Math.max(maximumActive, active);
    await new Promise(resolve => setTimeout(resolve, 30));
    active--;
    return answer;
  },
  sink: { segment() {}, draft() {}, finalize() {} },
});
queued.feedAudio(0, 'First speaker', new Float32Array(48000).fill(0.1), Date.now());
queued.feedAudio(1, 'Second speaker', new Float32Array(48000).fill(0.1), Date.now());
await queued.dispose();
assert.equal(maximumActive, 1, 'parallel speakers must not overload the single CPU worker');
console.log('PASS: concurrent speaker turns are transcribed serially.');

let fragmentedCalls = 0;
const buffered = createGmeetPipeline({
  transcribe: async () => { fragmentedCalls++; return answer; },
  sink: { segment() {}, draft() {}, finalize() {} },
});
for (let index = 0; index < 4; index++) {
  buffered.feedAudio(0, 'Test owner', new Float32Array(8000).fill(0.1), start + index * 1200);
}
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(fragmentedCalls, 0, 'delivery gaps under three seconds must not split a sentence');
await buffered.dispose();
assert.equal(fragmentedCalls, 1, 'buffered fragments form one STT request');
console.log('PASS: brief delivery gaps preserve the full utterance.');
