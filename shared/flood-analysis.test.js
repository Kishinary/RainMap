import assert from 'node:assert/strict';
import test from 'node:test';
import { clampConfidence, clampLevel, normalizeDepthRange, normalizeFloodAnalysis } from './flood-analysis.js';

test('normalizes centimeter values and removes repeated units', () => {
  assert.equal(normalizeDepthRange('15-35 cm cm'), '15-35');
  assert.equal(normalizeDepthRange('35–15 centimeters'), '15-35');
  assert.equal(normalizeDepthRange('about 20 cm'), '20');
  assert.equal(normalizeDepthRange('unknown'), '');
});

test('rejects invalid depth values', () => {
  assert.equal(normalizeDepthRange('-5 cm'), '');
  assert.equal(normalizeDepthRange('600 cm'), '');
});

test('clamps and rounds level and confidence consistently', () => {
  assert.equal(clampLevel(8), 3);
  assert.equal(clampLevel(-2), 0);
  assert.equal(clampLevel('not a number', 2), 2);
  assert.equal(clampConfidence(0.804), 0.8);
  assert.equal(clampConfidence(1), 0.97);
});

test('returns a stable, unit-free analysis shape and lowers confidence on disagreement', () => {
  assert.deepEqual(normalizeFloodAnalysis({
    objs: 'xe máy',
    level: 2,
    cm: '15-35 cm cm',
    conf: 0.8,
    street: '  Thái Hà  ',
    tlevel: 0,
  }), {
    objs: 'xe máy',
    level: 2,
    cm: '15-35',
    conf: 0.48,
    street: 'Thái Hà',
    tlevel: 0,
    consistent: false,
    motorbike: 'Nguy hiểm · dễ chết máy',
    car: 'Đi chậm, thận trọng',
  });
});
