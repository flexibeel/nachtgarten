import '../helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bounds, chaikin, fit, hashOf, haversine, isLoop, markersEvery, pathLength, prepareRoute, project,
  routeLength, seeded, simplify, simplifyTo,
} from '../../../src/ui/share/geo.js';
import { RUN } from './fixtures.js';

test('haversine: Hamburg Rathaus → Hauptbahnhof ≈ 0,9 km', () => {
  const d = haversine([53.5503, 9.9920], [53.5530, 10.0067]);
  assert.ok(d > 900 && d < 1100, `d=${d}`);
  assert.equal(haversine([53.5, 10], [53.5, 10]), 0);
});

test('project: Mittelpunkt im Ursprung, Norden ist oben (y negativ)', () => {
  const pts = project([[53.0, 10.0], [53.01, 10.0], [53.0, 10.01]]);
  const b = bounds(pts);
  assert.ok(Math.abs((b.minX + b.maxX) / 2) < 400);
  assert.ok(pts[1][1] < pts[0][1], 'nördlicher Punkt liegt weiter oben');
  assert.ok(pts[2][0] > pts[0][0], 'östlicher Punkt liegt weiter rechts');
  // 0,01° Breite ≈ 1112 m
  assert.ok(Math.abs((pts[0][1] - pts[1][1]) - 1112) < 5);
});

test('project: ungültige Punkte fallen weg, leere Route bleibt leer', () => {
  assert.deepEqual(project([]), []);
  assert.deepEqual(project(null), []);
  assert.equal(project([[53, 10], [NaN, 10], 'x', [53.001, 10.001]]).length, 2);
});

test('simplify (Douglas-Peucker): Endpunkte bleiben, Geraden fallen weg', () => {
  const line = Array.from({ length: 50 }, (_, i) => [i, 0]);
  assert.deepEqual(simplify(line, 0.5), [[0, 0], [49, 0]]);
  const zig = [[0, 0], [1, 0.1], [2, -0.1], [3, 5], [4, 0.1], [5, 0]];
  const s = simplify(zig, 1);
  assert.deepEqual(s[0], [0, 0]);
  assert.deepEqual(s[s.length - 1], [5, 0]);
  assert.ok(s.some((p) => p[1] === 5), 'die Spitze bleibt erhalten');
  assert.ok(s.length < zig.length);
});

test('simplify: Abweichung jedes Originalpunkts bleibt unter epsilon', () => {
  const pts = project(RUN.route);
  const eps = 6;
  const s = simplify(pts, eps);
  assert.ok(s.length < pts.length / 3, `${s.length} von ${pts.length}`);
  const dist = (p, a, b) => {
    const dx = b[0] - a[0]; const dy = b[1] - a[1]; const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  for (const p of pts) {
    let best = Infinity;
    for (let i = 1; i < s.length; i++) best = Math.min(best, dist(p, s[i - 1], s[i]));
    assert.ok(best <= eps + 1e-9, `Abweichung ${best}`);
  }
});

test('simplify: kurze Eingaben und epsilon 0 bleiben unverändert (als Kopie)', () => {
  const two = [[0, 0], [1, 1]];
  const out = simplify(two, 5);
  assert.deepEqual(out, two);
  assert.notEqual(out, two);
  assert.equal(simplify([[0, 0], [1, 1], [2, 0]], 0).length, 3);
});

test('simplifyTo: höchstens maxPoints Punkte', () => {
  const pts = project(RUN.route);
  const s = simplifyTo(pts, 22);
  assert.ok(s.length <= 22 && s.length >= 8, `${s.length}`);
});

test('chaikin: glättet, Enden bleiben fest', () => {
  const sq = [[0, 0], [10, 0], [10, 10]];
  const c = chaikin(sq, 2);
  assert.deepEqual(c[0], [0, 0]);
  assert.deepEqual(c[c.length - 1], [10, 10]);
  assert.ok(c.length > sq.length);
  assert.ok(pathLength(c) < pathLength(sq));
});

test('fit: seitenrichtig, zentriert, im Rahmen', () => {
  const { points, scale } = fit([[0, 0], [100, 50]], { x: 10, y: 20, w: 200, h: 200 });
  assert.equal(scale, 2);
  const b = bounds(points);
  assert.ok(b.minX >= 10 - 1e-9 && b.maxX <= 210 + 1e-9);
  assert.ok(Math.abs((b.minY + b.maxY) / 2 - 120) < 1e-9, 'senkrecht zentriert');
  assert.deepEqual(fit([], { x: 0, y: 0, w: 1, h: 1 }).points, []);
  // ein einzelner Punkt landet in der Mitte
  assert.deepEqual(fit([[5, 5]], { x: 0, y: 0, w: 10, h: 10 }).points, [[5, 5]]);
});

test('markersEvery: ein Punkt je voller Kilometer', () => {
  const m = markersEvery([[0, 0], [3500, 0]], 1000);
  assert.deepEqual(m, [[1000, 0], [2000, 0], [3000, 0]]);
  assert.equal(markersEvery(project(RUN.route), 1000).length, Math.floor(routeLength(RUN.route) / 1000));
});

test('isLoop: Alsterrunde ist eine Runde, eine Strecke nicht', () => {
  assert.equal(isLoop(project(RUN.route)), true);
  assert.equal(isLoop([[0, 0], [100, 0], [200, 10]]), false);
});

test('Beispielroute ist plausibel: 7–8 km, in Hamburg', () => {
  const len = routeLength(RUN.route);
  assert.ok(len > 7000 && len < 8000, `len=${len}`);
  for (const [la, lo] of RUN.route) assert.ok(la > 53.55 && la < 53.58 && lo > 9.99 && lo < 10.02);
});

test('seeded/hashOf: reproduzierbar, verschieden je Eingabe', () => {
  const a = seeded(hashOf('lauf')); const b = seeded(hashOf('lauf')); const c = seeded(hashOf('kraft'));
  const ra = [a(), a(), a()];
  assert.deepEqual(ra, [b(), b(), b()]);
  assert.notDeepEqual(ra, [c(), c(), c()]);
  for (const v of ra) assert.ok(v >= 0 && v < 1);
});

test('prepareRoute: alles in einem Schritt, im Rahmen', () => {
  const box = { x: 100, y: 100, w: 500, h: 500 };
  const { points } = prepareRoute(RUN.route, box);
  const b = bounds(points);
  assert.ok(b.minX >= 99.9 && b.maxX <= 600.1 && b.minY >= 99.9 && b.maxY <= 600.1);
});
