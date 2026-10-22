import { describe, expect, it } from 'vitest';
import { BeatClock } from './BeatClock';

describe('BeatClock', () => {
  it('quantizes to the next subdivision', () => {
    const c = new BeatClock(120); // 0.5 s per beat
    c.update(0.1);
    expect(c.next('4n')).toBeCloseTo(0.5);
    expect(c.next('16n')).toBeCloseTo(0.125);
    expect(c.next('1m')).toBeCloseTo(2);
    expect(c.seconds('1m')).toBeCloseTo(2);
  });

  it('fires beat and bar callbacks as time advances', () => {
    const c = new BeatClock(120);
    const beats: number[] = [];
    const bars: number[] = [];
    c.onBeat((b) => beats.push(b));
    c.onBar((b) => bars.push(b));
    for (let i = 0; i < 125; i++) c.update(1 / 60); // just over 2 s
    expect(beats).toEqual([1, 2, 3, 4]);
    expect(bars).toEqual([1]);
  });

  it('runs scheduled callbacks once their time is reached', () => {
    const c = new BeatClock(120);
    const ran: string[] = [];
    c.at(0.3, () => ran.push('a'));
    c.at(0.1, () => ran.push('b'));
    c.update(0.2);
    expect(ran).toEqual(['b']);
    c.update(0.2);
    expect(ran).toEqual(['b', 'a']);
  });

  it('ramps the tempo from the given time', () => {
    const c = new BeatClock(100);
    c.setBpmAt(200, 1, 1);
    c.update(0.5);
    expect(c.seconds('4n')).toBeCloseTo(0.6);
    c.update(1.5);
    expect(c.seconds('4n')).toBeCloseTo(0.3);
  });

  it('sets the tempo immediately, cancelling a pending ramp', () => {
    const c = new BeatClock(100);
    c.setBpmAt(200, 1, 1);
    c.setBpm(120);
    c.update(3);
    expect(c.seconds('4n')).toBeCloseTo(0.5);
  });

  it('maps beats and times consistently', () => {
    const c = new BeatClock(90);
    c.update(1.3);
    expect(c.beatAt(c.timeOfBeat(7))).toBeCloseTo(7);
  });
});
