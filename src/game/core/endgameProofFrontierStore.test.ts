import { describe, expect, it } from 'vitest';
import intro01 from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t37/endgame-v3-intro-01.json';
import intro02 from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t37/endgame-v3-intro-02.json';
import intro03 from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t37/endgame-v3-intro-03.json';
import intro04 from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t37/endgame-v3-intro-04.json';
import { ENDGAME_V3_INTRO_DRAFTS } from './endgameV3IntroDefinitions';
import type { EndgameDefinition } from './endgames';
import {
  ENDGAME_PROOF_FRONTIER_STORE_TESTING,
  certifyOptimalEndgameRouteForDefinition,
  type EndgameProofRun,
  type EndgameProofRunStore,
  type EndgameProofRunStoreDiagnostics,
  type EndgameProofRunWriter,
} from './endgameRouteSearch';

type RunTransform = (id: string, values: readonly string[], read: number) => readonly string[];

class MemoryRunStore implements EndgameProofRunStore {
  private readonly runs = new Map<string, MemoryRun>();
  private readonly cleanupErrors: string[];
  private readonly transform: RunTransform;
  private readonly sizeDelta: number;
  private closed = false;

  constructor(options: {
    transform?: RunTransform;
    cleanupErrors?: readonly string[];
    sizeDelta?: number;
  } = {}) {
    this.transform = options.transform ?? ((_id, values) => values);
    this.cleanupErrors = [...(options.cleanupErrors ?? [])];
    this.sizeDelta = options.sizeDelta ?? 0;
  }

  createRun(id: string): EndgameProofRunWriter {
    if (this.closed) throw new Error('closed');
    if (this.runs.has(id)) throw new Error(`duplicate ${id}`);
    const values: string[] = [];
    let state: 'open' | 'finished' | 'aborted' = 'open';
    return {
      write(key: string): void {
        if (state !== 'open') throw new Error('writer closed');
        values.push(key);
      },
      finish: (): EndgameProofRun => {
        if (state !== 'open') throw new Error('writer closed');
        state = 'finished';
        const run = new MemoryRun(
          id,
          values,
          values.length + this.sizeDelta,
          this.transform,
          () => this.runs.delete(id),
        );
        this.runs.set(id, run);
        return run;
      },
      abort(): void {
        if (state === 'aborted' || state === 'finished') return;
        state = 'aborted';
      },
    };
  }

  diagnostics(): EndgameProofRunStoreDiagnostics {
    return Object.freeze({
      activeRuns: Object.freeze([...this.runs.keys()].sort()),
      residue: Object.freeze([]),
      residueTruncated: false,
      cleanupErrors: Object.freeze([...this.cleanupErrors]),
      cleanupErrorsTruncated: false,
    });
  }

  dispose(): void {
    this.closed = true;
    for (const run of [...this.runs.values()]) run.dispose();
  }
}

class MemoryRun implements EndgameProofRun {
  private reads = 0;
  private disposed = false;

  constructor(
    readonly id: string,
    private readonly records: readonly string[],
    readonly size: number,
    private readonly transform: RunTransform,
    private readonly onDispose: () => void,
  ) {}

  values(): Iterable<string> {
    if (this.disposed) throw new Error(`disposed ${this.id}`);
    this.reads += 1;
    return Object.freeze([...this.transform(this.id, this.records, this.reads)]);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.onDispose();
  }
}

function records(count: number): readonly string[] {
  return Object.freeze(Array.from({ length: count }, (_, index) => `k${String(index).padStart(4, '0')}`));
}

function java31Hash(value: string): number {
  return [...value].reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) | 0, 0);
}

const oneRecordChunks = Object.freeze({ chunkMaxBytes: 6, chunkMaxRecords: 1 });

describe('Endgame proof frontier Core-owned runs', () => {
  it('sorts by unsigned bytes, collapses only full-key duplicates, and preserves prefixes', () => {
    expect(java31Hash('Aa')).toBe(java31Hash('BB'));
    const input = ['aa', 'a', 'BB', 'Aa', 'aa', '~', 'A', 'a'];
    const actual = ENDGAME_PROOF_FRONTIER_STORE_TESTING.persist(
      input,
      new MemoryRunStore(),
      { chunkMaxBytes: 24, chunkMaxRecords: 2 },
    );
    expect(actual).toEqual(['A', 'Aa', 'BB', 'a', 'aa', '~']);
    expect(ENDGAME_PROOF_FRONTIER_STORE_TESTING.ordinalByteCompare('a', 'aa')).toBeLessThan(0);
    expect(ENDGAME_PROOF_FRONTIER_STORE_TESTING.ordinalByteCompare('Z', 'a')).toBeLessThan(0);
  });

  it.each([0, 1, 31, 32, 33])('handles %i one-record chunks including the 32-way boundary', (count) => {
    const input = [...records(count)].reverse();
    expect(ENDGAME_PROOF_FRONTIER_STORE_TESTING.persist(
      input,
      new MemoryRunStore(),
      oneRecordChunks,
    )).toEqual(records(count));
  });

  it('performs the complete 4096-run boundary and rejects the 4097th run', () => {
    expect(ENDGAME_PROOF_FRONTIER_STORE_TESTING.persist(
      records(4096),
      new MemoryRunStore(),
      oneRecordChunks,
    )).toEqual(records(4096));
    expect(() => ENDGAME_PROOF_FRONTIER_STORE_TESTING.persist(
      records(4097),
      new MemoryRunStore(),
      oneRecordChunks,
    )).toThrow('exceeds 4096 chunk runs');
  }, 30_000);

  it.each(['omit', 'add', 'replace'] as const)('rejects a store that tries to %s a chunk record', (mode) => {
    const transform: RunTransform = (id, values) => {
      if (id !== 'd0000-p0000-g0000') return values;
      if (mode === 'omit') return values.slice(1);
      if (mode === 'add') return [...values, 'zz'];
      return values.map((value, index) => index === 0 ? 'changed' : value);
    };
    expect(() => ENDGAME_PROOF_FRONTIER_STORE_TESTING.persist(
      ['b', 'a'],
      new MemoryRunStore({ transform }),
    )).toThrow(/omitted|added|changed/);
  });

  it.each(['omit', 'add', 'replace'] as const)('recomputes a merge and rejects an output that tries to %s', (mode) => {
    const transform: RunTransform = (id, values) => {
      if (!id.includes('-p0001-')) return values;
      if (mode === 'omit') return values.slice(1);
      if (mode === 'add') return [...values, 'zz'];
      return values.map((value, index) => index === 0 ? 'changed' : value);
    };
    expect(() => ENDGAME_PROOF_FRONTIER_STORE_TESTING.persist(
      ['b', 'a'],
      new MemoryRunStore({ transform }),
      { chunkMaxBytes: 2, chunkMaxRecords: 1 },
    )).toThrow(/omitted|added|changed|size/);
  });

  it('rejects descriptor-count drift and preserves a primary write error with abort cleanup', () => {
    expect(() => ENDGAME_PROOF_FRONTIER_STORE_TESTING.persist(
      ['a'],
      new MemoryRunStore({ sizeDelta: 1 }),
    )).toThrow('size 2 does not match written count 1');

    const primaryAndCleanup: EndgameProofRunStore = {
      createRun(): EndgameProofRunWriter {
        return {
          write(): void {
            throw new Error('primary write fault');
          },
          finish(): EndgameProofRun {
            throw new Error('unexpected finish');
          },
          abort(): void {
            throw new Error('cleanup abort fault');
          },
        };
      },
      diagnostics(): EndgameProofRunStoreDiagnostics {
        return {
          activeRuns: [],
          residue: [],
          residueTruncated: false,
          cleanupErrors: [],
          cleanupErrorsTruncated: false,
        };
      },
      dispose(): void {},
    };
    try {
      ENDGAME_PROOF_FRONTIER_STORE_TESTING.persist(['a'], primaryAndCleanup);
      expect.unreachable('write and abort failures must aggregate');
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError);
      expect((error as AggregateError).errors.map(String).join('\n')).toContain('primary write fault');
      expect((error as AggregateError).errors.map(String).join('\n')).toContain('cleanup abort fault');
    }
  });

  it('rejects invalid framing domains before persistence and caps cleanup aggregation', () => {
    for (const invalid of ['', 'line\nbreak', 'carriage\rreturn', '\0', 'x'.repeat(2049)]) {
      expect(() => ENDGAME_PROOF_FRONTIER_STORE_TESTING.persist(
        [invalid],
        new MemoryRunStore(),
      )).toThrow();
    }
    const errors = Array.from({ length: 4101 }, (_, index) => `cleanup-${index}`);
    try {
      ENDGAME_PROOF_FRONTIER_STORE_TESTING.persist(['a'], new MemoryRunStore({ cleanupErrors: errors }));
      expect.unreachable('cleanup diagnostics must be fatal');
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError);
      const aggregate = error as AggregateError;
      expect(aggregate.errors).toHaveLength(4099);
      expect(String(aggregate.errors.at(-1))).toContain('omitted 4');
    }
  });

  it('cleans the supplied store when candidate validation fails before frontier expansion', () => {
    const store = new MemoryRunStore();
    expect(() => certifyOptimalEndgameRouteForDefinition(
      ENDGAME_V3_INTRO_DRAFTS[0]!,
      'S',
      { runStore: store },
    )).toThrow('completed public-command replay');
    expect(store.diagnostics()).toEqual({
      activeRuns: [],
      residue: [],
      residueTruncated: false,
      cleanupErrors: [],
      cleanupErrorsTruncated: false,
    });
  });

  it('preserves a real certificate primary error together with store cleanup failure', () => {
    const store: EndgameProofRunStore = {
      createRun(): EndgameProofRunWriter {
        throw new Error('unexpected create');
      },
      diagnostics(): EndgameProofRunStoreDiagnostics {
        return {
          activeRuns: [],
          residue: [],
          residueTruncated: false,
          cleanupErrors: [],
          cleanupErrorsTruncated: false,
        };
      },
      dispose(): void {
        throw new Error('certificate cleanup fault');
      },
    };
    try {
      certifyOptimalEndgameRouteForDefinition(
        ENDGAME_V3_INTRO_DRAFTS[0]!,
        'S',
        { runStore: store },
      );
      expect.unreachable('certificate primary and cleanup errors must aggregate');
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError);
      const messages = (error as AggregateError).errors.map(String).join('\n');
      expect(messages).toContain('completed public-command replay');
      expect(messages).toContain('certificate cleanup fault');
    }
  });
});

// @ts-expect-error Node environment variables are available to Vitest but not product types.
const RUN_EXACT = process.env.ENDGAME_EXACT_CERTIFICATES === '1';

describe.runIf(RUN_EXACT)('Endgame proof frontier Intro-01 through Intro-04 equality', () => {
  it('matches every in-memory certificate and telemetry field without running Intro-05', () => {
    const fixtures = [intro01, intro02, intro03, intro04] as const;
    expect(ENDGAME_V3_INTRO_DRAFTS).toHaveLength(4);
    for (const [index, definition] of ENDGAME_V3_INTRO_DRAFTS.entries()) {
      const route = fixtures[index]!.optimalRoute;
      const memory = certifyOptimalEndgameRouteForDefinition(definition, route);
      const injected = certifyOptimalEndgameRouteForDefinition(
        definition,
        route,
        { runStore: new MemoryRunStore() },
      );
      expect(injected).toEqual(memory);
    }

    const source = ENDGAME_V3_INTRO_DRAFTS[1]!;
    const synthetic: EndgameDefinition = Object.freeze({
      ...source,
      id: ENDGAME_V3_INTRO_DRAFTS[0]!.id,
      name: 'Synthetic cross-id frontier',
      difficulty: 49,
    });
    const memory = certifyOptimalEndgameRouteForDefinition(synthetic, intro02.optimalRoute);
    const injected = certifyOptimalEndgameRouteForDefinition(
      synthetic,
      intro02.optimalRoute,
      { runStore: new MemoryRunStore() },
    );
    expect(injected).toEqual(memory);
    expect(injected?.levelId).toBe(ENDGAME_V3_INTRO_DRAFTS[0]!.id);
    expect(injected?.initialStateHash).not.toBe(intro02.initialStateHash);
  }, 1_200_000);
});
