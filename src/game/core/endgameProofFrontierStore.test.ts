import { describe, expect, it } from 'vitest';
import intro01 from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t37/endgame-v3-intro-01.json';
import intro02 from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t37/endgame-v3-intro-02.json';
import intro03 from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t37/endgame-v3-intro-03.json';
import intro04 from '../../../docs/workstreams/tetris-t37-endgame/fixtures/t37/endgame-v3-intro-04.json';
import { ENDGAME_V3_INTRO_DRAFTS } from './endgameV3IntroDefinitions';
import type { EndgameDefinition } from './endgames';
import {
  ENDGAME_PROOF_FRONTIER_STORE_TESTING,
  advanceOptimalEndgameRouteProofForDefinition,
  certifyOptimalEndgameRouteForDefinition,
  type EndgameProofCheckpoint,
  type EndgameProofCheckpointPublication,
  type EndgameProofCheckpointRunStore,
  type EndgameProofRun,
  type EndgameProofRunRange,
  type EndgameProofRunStore,
  type EndgameProofRunStoreDiagnostics,
  type EndgameProofRunWriter,
  type EndgameProofTip,
} from './endgameRouteSearch';

type RunTransform = (id: string, values: readonly string[], read: number) => readonly string[];
type CompletedMemoryRun = Readonly<{ id: string; records: number; recordBytes: number }>;

class MemoryRunStore implements EndgameProofRunStore {
  private readonly runs = new Map<string, MemoryRun>();
  private readonly completed: CompletedMemoryRun[] = [];
  private readonly cleanupErrors: string[];
  private readonly transform: RunTransform;
  private readonly sizeDelta: number;
  private activeWriters = 0;
  private peakDescriptors = 0;
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
    this.activeWriters += 1;
    this.updatePeakDescriptors();
    return {
      write(key: string): void {
        if (state !== 'open') throw new Error('writer closed');
        values.push(key);
      },
      finish: (): EndgameProofRun => {
        if (state !== 'open') throw new Error('writer closed');
        state = 'finished';
        this.activeWriters -= 1;
        const frozenValues = Object.freeze(values);
        this.completed.push(Object.freeze({
          id,
          records: frozenValues.length,
          recordBytes: frozenValues.reduce((total, value) => total + value.length + 1, 0),
        }));
        const run = new MemoryRun(
          id,
          frozenValues,
          frozenValues.length + this.sizeDelta,
          this.transform,
          () => {
            this.runs.delete(id);
          },
        );
        this.runs.set(id, run);
        this.updatePeakDescriptors();
        return run;
      },
      abort: (): void => {
        if (state === 'aborted' || state === 'finished') return;
        state = 'aborted';
        this.activeWriters -= 1;
      },
    };
  }

  snapshot(): Readonly<{ completed: readonly CompletedMemoryRun[]; peakDescriptors: number }> {
    return Object.freeze({
      completed: Object.freeze([...this.completed]),
      peakDescriptors: this.peakDescriptors,
    });
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

  private updatePeakDescriptors(): void {
    this.peakDescriptors = Math.max(this.peakDescriptors, this.runs.size + this.activeWriters);
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

  values(range?: EndgameProofRunRange): Iterable<string> {
    if (this.disposed) throw new Error(`disposed ${this.id}`);
    this.reads += 1;
    const transformed = this.transform(this.id, this.records, this.reads);
    const selected = range
      ? transformed.slice(range.startOrdinal, range.endOrdinal)
      : transformed;
    return Object.isFrozen(selected) ? selected : Object.freeze([...selected]);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.onDispose();
  }
}

class MemoryCheckpointRunStore extends MemoryRunStore implements EndgameProofCheckpointRunStore {
  readonly publications: EndgameProofCheckpointPublication[] = [];
  createRunCount = 0;
  suspendCount = 0;

  constructor(private readonly loaded: Readonly<{
    checkpoint: EndgameProofCheckpoint | null;
    tip: EndgameProofTip | null;
    diagnostics: EndgameProofRunStoreDiagnostics;
    advanceAllowed: boolean;
  }>) {
    super();
  }

  override createRun(id: string): EndgameProofRunWriter {
    this.createRunCount += 1;
    return super.createRun(id);
  }

  loadCheckpoint(): Readonly<{
    checkpoint: EndgameProofCheckpoint | null;
    tip: EndgameProofTip | null;
    diagnostics: EndgameProofRunStoreDiagnostics;
    advanceAllowed: boolean;
  }> {
    return this.loaded;
  }

  publishCheckpoint(publication: EndgameProofCheckpointPublication): Readonly<{
    tip: EndgameProofTip;
    diagnostics: EndgameProofRunStoreDiagnostics;
    advanceAllowed: boolean;
  }> {
    this.publications.push(publication);
    if (publication.transition === 'seed') publication.frontier.dispose();
    if (publication.transition === 'unit') publication.nextRun?.dispose();
    if (publication.transition === 'layer') publication.nextFrontier.dispose();
    const generation = publication.previousTip === null ? 0 : publication.previousTip.generation + 1;
    return Object.freeze({
      tip: Object.freeze({ generation, manifestSha256: 'A'.repeat(64) }),
      diagnostics: this.diagnostics(),
      advanceAllowed: true,
    });
  }

  releaseCheckpointRun(run: EndgameProofRun): void {
    run.dispose();
  }

  suspend(): Readonly<{ diagnostics: EndgameProofRunStoreDiagnostics; closeFailed: boolean }> {
    this.suspendCount += 1;
    return Object.freeze({ diagnostics: this.diagnostics(), closeFailed: false });
  }
}

function records(count: number): readonly string[] {
  return Object.freeze(Array.from({ length: count }, (_, index) => `k${String(index).padStart(4, '0')}`));
}

function java31Hash(value: string): number {
  return [...value].reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) | 0, 0);
}

function fixedAsciiRecord(index: number, length: number): string {
  const prefix = `r${index.toString(36).padStart(7, '0')}:`;
  if (prefix.length > length) throw new Error(`Record prefix ${prefix} exceeds ${length}.`);
  return `${prefix}${String.fromCharCode(65 + (index % 26)).repeat(length - prefix.length)}`;
}

const oneRecordChunks = Object.freeze({ chunkMaxBytes: 6, chunkMaxRecords: 1 });

describe('Endgame proof frontier Core-owned runs', () => {
  it('publishes one deterministic seed transition and recovers complete proof views without writes', () => {
    const definition = ENDGAME_V3_INTRO_DRAFTS[0]!;
    const route = intro01.optimalRoute;
    const emptyDiagnostics = Object.freeze({
      activeRuns: Object.freeze([]),
      residue: Object.freeze([]),
      residueTruncated: false,
      cleanupErrors: Object.freeze([]),
      cleanupErrorsTruncated: false,
    });
    const seedStore = new MemoryCheckpointRunStore(Object.freeze({
      checkpoint: null,
      tip: null,
      diagnostics: emptyDiagnostics,
      advanceAllowed: true,
    }));
    const seed = advanceOptimalEndgameRouteProofForDefinition(definition, route, seedStore);
    expect(seed).toMatchObject({ status: 'searching', generation: 0, depth: 0, parentOffset: 0 });
    expect(seedStore.createRunCount).toBe(1);
    expect(seedStore.publications).toHaveLength(1);
    const publication = seedStore.publications[0]!;
    expect(publication.transition).toBe('seed');
    if (publication.transition !== 'seed') throw new Error('expected seed publication');
    expect(publication.frontier.id).toBe('r7-f-d00000-g00000');
    expect(publication.frontier.size).toBe(1);

    const exhaustedDepths = Object.freeze(Array.from(
      { length: publication.binding.optimalLocks - 1 },
      (_, lockedPieces) => Object.freeze({ lockedPieces, frontierStates: 1, transitions: 0, boundPrunes: 0 }),
    ));
    const residueDiagnostics = Object.freeze({
      ...emptyDiagnostics,
      residue: Object.freeze(['postcommit-superseded-residue']),
    });
    const completeStore = new MemoryCheckpointRunStore(Object.freeze({
      checkpoint: Object.freeze({
        kind: 'complete',
        generation: 7,
        binding: publication.binding,
        reason: 'final-depth',
        exhaustedDepths,
      }),
      tip: Object.freeze({ generation: 7, manifestSha256: 'B'.repeat(64) }),
      diagnostics: residueDiagnostics,
      advanceAllowed: false,
    }));
    const recovered = advanceOptimalEndgameRouteProofForDefinition(definition, route, completeStore);
    expect(recovered).toMatchObject({
      status: 'complete',
      generation: 7,
      advanceAllowed: false,
      diagnostics: residueDiagnostics,
    });
    expect(completeStore.createRunCount).toBe(0);
    expect(completeStore.publications).toEqual([]);
    expect(completeStore.suspendCount).toBe(0);

    const corruptTipStore = new MemoryCheckpointRunStore(Object.freeze({
      checkpoint: null, tip: null, diagnostics: emptyDiagnostics, advanceAllowed: true,
    }));
    corruptTipStore.publishCheckpoint = () => Object.freeze({
      tip: Object.freeze({ generation: 0, manifestSha256: 'not-a-hash' }),
      diagnostics: emptyDiagnostics,
      advanceAllowed: true,
    });
    expect(() => advanceOptimalEndgameRouteProofForDefinition(definition, route, corruptTipStore))
      .toThrow('checkpoint tip hash is invalid');
  });

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

  it('flushes before one record crosses the exact production 64 MiB raw-record boundary', () => {
    const limits = ENDGAME_PROOF_FRONTIER_STORE_TESTING.limits;
    expect(limits.chunkMaxBytes).toBe(64 * 1024 * 1024);
    expect(limits.recordMaxBytes).toBe(2048);
    const fullRecordBytes = limits.recordMaxBytes + 1;
    const fullRecords = Math.floor(limits.chunkMaxBytes / fullRecordBytes);
    const remainderBytes = limits.chunkMaxBytes - (fullRecords * fullRecordBytes);
    expect({ fullRecords, remainderBytes }).toEqual({ fullRecords: 32752, remainderBytes: 16 });
    const overflow = 'overflow-after-byte-cap';
    function* input(): Generator<string> {
      for (let index = 0; index < fullRecords; index += 1) {
        yield fixedAsciiRecord(index, limits.recordMaxBytes);
      }
      yield fixedAsciiRecord(fullRecords, remainderBytes - 1);
      yield overflow;
    }

    const store = new MemoryRunStore();
    const output = ENDGAME_PROOF_FRONTIER_STORE_TESTING.persist(input(), store);
    expect(output).toHaveLength(fullRecords + 2);
    const chunks = store.snapshot().completed.filter(({ id }) => id.includes('-p0000-'));
    expect(chunks).toEqual([
      {
        id: 'd0000-p0000-g0000',
        records: fullRecords + 1,
        recordBytes: limits.chunkMaxBytes,
      },
      {
        id: 'd0000-p0000-g0001',
        records: 1,
        recordBytes: overflow.length + 1,
      },
    ]);
    expect(store.snapshot().peakDescriptors).toBe(3);
  }, 120_000);

  it('flushes before the 131073rd record at the exact production count boundary', () => {
    const limits = ENDGAME_PROOF_FRONTIER_STORE_TESTING.limits;
    expect(limits.chunkMaxRecords).toBe(131_072);
    function* input(): Generator<string> {
      for (let index = 0; index <= limits.chunkMaxRecords; index += 1) {
        yield `c${String(index).padStart(6, '0')}`;
      }
    }

    const store = new MemoryRunStore();
    const output = ENDGAME_PROOF_FRONTIER_STORE_TESTING.persist(input(), store);
    expect(output).toHaveLength(limits.chunkMaxRecords + 1);
    const chunks = store.snapshot().completed.filter(({ id }) => id.includes('-p0000-'));
    expect(chunks).toEqual([
      {
        id: 'd0000-p0000-g0000',
        records: limits.chunkMaxRecords,
        recordBytes: limits.chunkMaxRecords * 8,
      },
      {
        id: 'd0000-p0000-g0001',
        records: 1,
        recordBytes: 8,
      },
    ]);
    expect(store.snapshot().peakDescriptors).toBe(3);
  }, 120_000);

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
