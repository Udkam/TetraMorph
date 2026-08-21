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
  type EndgameProofResumeBinding,
  type EndgameProofRun,
  type EndgameProofRunRange,
  type EndgameProofSearchingCheckpoint,
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
  readonly ranges: (EndgameProofRunRange | undefined)[] = [];

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
    this.ranges.push(range && Object.freeze({ ...range }));
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
  readonly releasedRunIds: string[] = [];
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
    this.releasedRunIds.push(run.id);
    run.dispose();
  }

  suspend(): Readonly<{ diagnostics: EndgameProofRunStoreDiagnostics; closeFailed: boolean }> {
    this.suspendCount += 1;
    return Object.freeze({ diagnostics: this.diagnostics(), closeFailed: false });
  }
}

type StoredRun = Readonly<{ id: string; records: readonly string[] }>;
type StoredCheckpoint =
  | Readonly<{
      kind: 'searching'; generation: number; binding: EndgameProofResumeBinding;
      depth: number; parentOffset: number; lastProcessedParentKey: string | null;
      frontier: StoredRun; nextRuns: readonly StoredRun[]; transitions: number; boundPrunes: number;
      exhaustedDepths: readonly Readonly<{ lockedPieces: number; frontierStates: number; transitions: number; boundPrunes: number }>[];
    }>
  | Readonly<{
      kind: 'complete'; generation: number; binding: EndgameProofResumeBinding;
      reason: 'empty-frontier' | 'final-depth' | 'zero-decision-depth';
      exhaustedDepths: readonly Readonly<{ lockedPieces: number; frontierStates: number; transitions: number; boundPrunes: number }>[];
    }>;

class EvolvingMemoryCheckpointRunStore extends MemoryRunStore implements EndgameProofCheckpointRunStore {
  readonly publications: EndgameProofCheckpointPublication[] = [];
  readonly publicationLiveViewCounts: number[] = [];
  readonly collectionRanges: { startIndex: number; endIndex: number }[] = [];
  private checkpoint: StoredCheckpoint | null = null;
  private tip: EndgameProofTip | null = null;
  private viewOutstanding = false;
  private readonly liveViewRuns = new Set<EndgameProofRun>();
  private readonly liveCollectionRuns = new Set<EndgameProofRun>();
  suspendCount = 0;

  loadCheckpoint(): ReturnType<EndgameProofCheckpointRunStore['loadCheckpoint']> {
    if (this.viewOutstanding) throw new Error('checkpoint view already outstanding');
    if (this.checkpoint === null) {
      return Object.freeze({ checkpoint: null, tip: null, diagnostics: this.diagnostics(), advanceAllowed: true });
    }
    this.viewOutstanding = true;
    if (this.checkpoint.kind === 'complete') {
      return Object.freeze({
        checkpoint: Object.freeze({ ...this.checkpoint }),
        tip: this.tip,
        diagnostics: this.diagnostics(),
        advanceAllowed: true,
      });
    }
    const stored = this.checkpoint;
    const frontier = this.openViewRun(stored.frontier, false);
    const nextRuns = Object.freeze({
      count: stored.nextRuns.length,
      open: (range: { startIndex: number; endIndex: number }): readonly EndgameProofRun[] => {
        if (this.liveCollectionRuns.size > 0) throw new Error('collection member still live');
        if (range.startIndex < 0 || range.startIndex >= range.endIndex
          || range.endIndex > stored.nextRuns.length || range.endIndex - range.startIndex > 32) {
          throw new Error('invalid collection range');
        }
        this.collectionRanges.push(Object.freeze({ ...range }));
        return Object.freeze(stored.nextRuns.slice(range.startIndex, range.endIndex).map((run) => (
          this.openViewRun(run, true)
        )));
      },
    });
    return Object.freeze({
      checkpoint: Object.freeze({
        kind: 'searching', generation: stored.generation, binding: stored.binding,
        depth: stored.depth, parentOffset: stored.parentOffset,
        lastProcessedParentKey: stored.lastProcessedParentKey,
        frontier, nextRuns, transitions: stored.transitions, boundPrunes: stored.boundPrunes,
        exhaustedDepths: stored.exhaustedDepths,
      }),
      tip: this.tip,
      diagnostics: this.diagnostics(),
      advanceAllowed: true,
    });
  }

  publishCheckpoint(publication: EndgameProofCheckpointPublication): ReturnType<EndgameProofCheckpointRunStore['publishCheckpoint']> {
    const generation = publication.previousTip === null ? 0 : publication.previousTip.generation + 1;
    if ((publication.previousTip === null) !== (this.tip === null)
      || (publication.previousTip && (publication.previousTip.generation !== this.tip?.generation
        || publication.previousTip.manifestSha256 !== this.tip.manifestSha256))) {
      throw new Error('previous tip mismatch');
    }
    if (publication.transition === 'seed') {
      if (this.checkpoint !== null || generation !== 0) throw new Error('invalid seed');
      this.checkpoint = Object.freeze({
        kind: 'searching', generation, binding: publication.binding,
        depth: 0, parentOffset: 0, lastProcessedParentKey: null,
        frontier: this.consumeWorkingRun(publication.frontier), nextRuns: Object.freeze([]),
        transitions: 0, boundPrunes: 0, exhaustedDepths: Object.freeze([]),
      });
    } else {
      if (this.checkpoint?.kind !== 'searching') throw new Error('searching checkpoint required');
      const previous = this.checkpoint;
      if (publication.transition === 'unit') {
        const nextRuns = publication.nextRun
          ? Object.freeze([...previous.nextRuns, this.consumeWorkingRun(publication.nextRun)])
          : previous.nextRuns;
        this.checkpoint = Object.freeze({
          ...previous, generation, parentOffset: publication.parentOffset,
          lastProcessedParentKey: publication.lastProcessedParentKey,
          nextRuns,
          transitions: previous.transitions + publication.transitionsDelta,
          boundPrunes: previous.boundPrunes + publication.boundPrunesDelta,
        });
      } else if (publication.transition === 'layer') {
        this.checkpoint = Object.freeze({
          kind: 'searching', generation, binding: previous.binding, depth: previous.depth + 1,
          parentOffset: 0, lastProcessedParentKey: null,
          frontier: this.consumeWorkingRun(publication.nextFrontier), nextRuns: Object.freeze([]),
          transitions: 0, boundPrunes: 0,
          exhaustedDepths: Object.freeze([...previous.exhaustedDepths, publication.completedDepth]),
        });
      } else {
        this.checkpoint = Object.freeze({
          kind: 'complete', generation, binding: previous.binding, reason: publication.reason,
          exhaustedDepths: publication.completedDepth
            ? Object.freeze([...previous.exhaustedDepths, publication.completedDepth])
            : previous.exhaustedDepths,
        });
      }
    }
    this.publicationLiveViewCounts.push(this.liveViewRuns.size);
    this.invalidateView();
    this.publications.push(publication);
    this.tip = Object.freeze({ generation, manifestSha256: generation.toString(16).toUpperCase().padStart(64, '0') });
    return Object.freeze({ tip: this.tip, diagnostics: this.diagnostics(), advanceAllowed: true });
  }

  releaseCheckpointRun(run: EndgameProofRun): void {
    if (!this.liveViewRuns.has(run)) throw new Error(`foreign view run ${run.id}`);
    run.dispose();
  }

  suspend(): ReturnType<EndgameProofCheckpointRunStore['suspend']> {
    this.suspendCount += 1;
    this.invalidateView();
    return Object.freeze({ diagnostics: this.diagnostics(), closeFailed: false });
  }

  private consumeWorkingRun(run: EndgameProofRun): StoredRun {
    const records = Object.freeze([...run.values()]);
    if (records.length !== run.size) throw new Error(`working run ${run.id} size mismatch`);
    const stored = Object.freeze({ id: run.id, records });
    run.dispose();
    return stored;
  }

  private openViewRun(stored: StoredRun, collectionMember: boolean): EndgameProofRun {
    let run!: MemoryRun;
    run = new MemoryRun(stored.id, stored.records, stored.records.length, (_id, values) => values, () => {
      this.liveViewRuns.delete(run);
      this.liveCollectionRuns.delete(run);
    });
    this.liveViewRuns.add(run);
    if (collectionMember) this.liveCollectionRuns.add(run);
    return run;
  }

  private invalidateView(): void {
    for (const run of [...this.liveViewRuns]) run.dispose();
    this.liveViewRuns.clear();
    this.liveCollectionRuns.clear();
    this.viewOutstanding = false;
  }
}

function records(count: number): readonly string[] {
  return Object.freeze(Array.from({ length: count }, (_, index) => `k${String(index).padStart(4, '0')}`));
}

function runResumableCertificate(definition: EndgameDefinition, route: string): Readonly<{
  certificate: NonNullable<ReturnType<typeof certifyOptimalEndgameRouteForDefinition>>;
  store: EvolvingMemoryCheckpointRunStore;
}> {
  const store = new EvolvingMemoryCheckpointRunStore();
  try {
    for (let generation = 0; generation <= 32_767; generation += 1) {
      const result = advanceOptimalEndgameRouteProofForDefinition(definition, route, store);
      if (result === null) throw new Error('resumable fixture unexpectedly returned null');
      if (result.status === 'blocked' || !result.advanceAllowed) {
        throw new Error('resumable memory fixture unexpectedly blocked');
      }
      if (result.status === 'complete') return Object.freeze({ certificate: result.certificate, store });
    }
    throw new Error('resumable proof exceeded the generation domain');
  } finally {
    store.suspend();
  }
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
        generation: 6,
        binding: publication.binding,
        reason: 'final-depth',
        exhaustedDepths,
      }),
      tip: Object.freeze({ generation: 6, manifestSha256: 'B'.repeat(64) }),
      diagnostics: residueDiagnostics,
      advanceAllowed: false,
    }));
    const recovered = advanceOptimalEndgameRouteProofForDefinition(definition, route, completeStore);
    expect(recovered).toMatchObject({
      status: 'complete',
      generation: 6,
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

  it('validates a searching checkpoint and publishes exactly one ranged parent unit', () => {
    const definition = ENDGAME_V3_INTRO_DRAFTS[0]!;
    const route = intro01.optimalRoute;
    const diagnostics = Object.freeze({
      activeRuns: Object.freeze([]), residue: Object.freeze([]), residueTruncated: false,
      cleanupErrors: Object.freeze([]), cleanupErrorsTruncated: false,
    });
    const seedStore = new MemoryCheckpointRunStore(Object.freeze({
      checkpoint: null, tip: null, diagnostics, advanceAllowed: true,
    }));
    advanceOptimalEndgameRouteProofForDefinition(definition, route, seedStore);
    const seed = seedStore.publications[0]!;
    if (seed.transition !== 'seed') throw new Error('expected seed publication');

    const frontier = new MemoryRun(
      'r7-f-d00000-g00000',
      Object.freeze([seed.binding.initialFrontierKey]),
      1,
      (_id, values) => values,
      () => {},
    );
    const unitStore = new MemoryCheckpointRunStore(Object.freeze({
      checkpoint: Object.freeze({
        kind: 'searching',
        generation: 0,
        binding: seed.binding,
        depth: 0,
        parentOffset: 0,
        lastProcessedParentKey: null,
        frontier,
        nextRuns: Object.freeze({
          count: 0,
          open(): readonly EndgameProofRun[] { throw new Error('unit transition must not open prior runs'); },
        }),
        transitions: 0,
        boundPrunes: 0,
        exhaustedDepths: Object.freeze([]),
      }),
      tip: Object.freeze({ generation: 0, manifestSha256: 'C'.repeat(64) }),
      diagnostics,
      advanceAllowed: true,
    }));
    const result = advanceOptimalEndgameRouteProofForDefinition(definition, route, unitStore);
    expect(result).toMatchObject({ status: 'searching', generation: 1, depth: 0, parentOffset: 1 });
    expect(frontier.ranges).toEqual([{ startOrdinal: 0, endOrdinal: 1 }]);
    expect(unitStore.publications).toHaveLength(1);
    const unit = unitStore.publications[0]!;
    expect(unit.transition).toBe('unit');
    if (unit.transition !== 'unit') throw new Error('expected unit publication');
    expect(unit).toMatchObject({ parentOffset: 1, lastProcessedParentKey: seed.binding.initialFrontierKey });
    expect(unit.nextRun?.id).toBe('r7-u-d00000-n00000000-g00001');

    const finalDepth = seed.binding.optimalLocks - 2;
    const finalFrontier = new MemoryRun(
      `r7-f-d${String(finalDepth).padStart(5, '0')}-g00004`,
      Object.freeze([seed.binding.initialFrontierKey]),
      1,
      (_id, values) => values,
      () => {},
    );
    const finalUnitStore = new MemoryCheckpointRunStore(Object.freeze({
      checkpoint: Object.freeze({
        kind: 'searching', generation: 4, binding: seed.binding, depth: finalDepth,
        parentOffset: 0, lastProcessedParentKey: null, frontier: finalFrontier,
        nextRuns: Object.freeze({ count: 0, open: () => Object.freeze([]) }),
        transitions: 0, boundPrunes: 0,
        exhaustedDepths: Object.freeze(Array.from(
          { length: finalDepth },
          (_, lockedPieces) => Object.freeze({ lockedPieces, frontierStates: 1, transitions: 0, boundPrunes: 0 }),
        )),
      }),
      tip: Object.freeze({ generation: 4, manifestSha256: 'E'.repeat(64) }),
      diagnostics,
      advanceAllowed: true,
    }));
    const finalResult = advanceOptimalEndgameRouteProofForDefinition(definition, route, finalUnitStore);
    expect(finalResult).toMatchObject({ status: 'searching', generation: 5, parentOffset: 1 });
    const finalUnit = finalUnitStore.publications[0]!;
    expect(finalUnit.transition).toBe('unit');
    if (finalUnit.transition !== 'unit') throw new Error('expected final-depth unit publication');
    expect(finalUnit.nextRun).toBeNull();
    expect(finalUnitStore.createRunCount).toBe(0);
  });

  it('validates searching shape before returning a blocked residue result', () => {
    const definition = ENDGAME_V3_INTRO_DRAFTS[0]!;
    const route = intro01.optimalRoute;
    const diagnostics = Object.freeze({
      activeRuns: Object.freeze([]), residue: Object.freeze(['precommit-owned-residue']),
      residueTruncated: false, cleanupErrors: Object.freeze([]), cleanupErrorsTruncated: false,
    });
    const seedStore = new MemoryCheckpointRunStore(Object.freeze({
      checkpoint: null, tip: null, diagnostics, advanceAllowed: true,
    }));
    advanceOptimalEndgameRouteProofForDefinition(definition, route, seedStore);
    const seed = seedStore.publications[0]!;
    if (seed.transition !== 'seed') throw new Error('expected seed publication');
    const malformed = new MemoryCheckpointRunStore(Object.freeze({
      checkpoint: Object.freeze({
        kind: 'searching', generation: 0, binding: seed.binding, depth: 0, parentOffset: 0,
        lastProcessedParentKey: 'unexpected',
        frontier: new MemoryRun('r7-f-d00000-g00000', [seed.binding.initialFrontierKey], 1, (_id, v) => v, () => {}),
        nextRuns: Object.freeze({ count: 0, open: () => Object.freeze([]) }),
        transitions: 0, boundPrunes: 0, exhaustedDepths: Object.freeze([]),
      }),
      tip: Object.freeze({ generation: 0, manifestSha256: 'D'.repeat(64) }),
      diagnostics,
      advanceAllowed: false,
    }));
    expect(() => advanceOptimalEndgameRouteProofForDefinition(definition, route, malformed))
      .toThrow('fresh searching layer has a nonempty cursor or counters');
    expect(malformed.publications).toEqual([]);
  });

  it('publishes strict nonempty, early-empty, and final-depth covered-layer transitions', () => {
    const definition = ENDGAME_V3_INTRO_DRAFTS[0]!;
    const route = intro01.optimalRoute;
    const diagnostics = Object.freeze({
      activeRuns: Object.freeze([]), residue: Object.freeze([]), residueTruncated: false,
      cleanupErrors: Object.freeze([]), cleanupErrorsTruncated: false,
    });
    const seedStore = new MemoryCheckpointRunStore(Object.freeze({
      checkpoint: null, tip: null, diagnostics, advanceAllowed: true,
    }));
    advanceOptimalEndgameRouteProofForDefinition(definition, route, seedStore);
    const seed = seedStore.publications[0]!;
    if (seed.transition !== 'seed') throw new Error('expected seed publication');
    const key = seed.binding.initialFrontierKey;
    const memoryRun = (id: string, values: readonly string[], size = values.length) => new MemoryRun(
      id, Object.freeze(values), size, (_id, records) => records, () => {},
    );

    const opened: { startIndex: number; endIndex: number }[] = [];
    const unitRuns = Object.freeze(Array.from({ length: 33 }, (_, unit) => memoryRun(
      `r7-u-d00000-n${String(unit).padStart(8, '0')}-g${String(unit + 1).padStart(5, '0')}`,
      [key],
    )));
    const largeFrontierSize = 33 * 65_536;
    const layerStore = new MemoryCheckpointRunStore(Object.freeze({
      checkpoint: Object.freeze({
        kind: 'searching', generation: 33, binding: seed.binding, depth: 0,
        parentOffset: largeFrontierSize, lastProcessedParentKey: key,
        frontier: memoryRun('r7-f-d00000-g00000', [key], largeFrontierSize),
        nextRuns: Object.freeze({
          count: unitRuns.length,
          open(range: { startIndex: number; endIndex: number }): readonly EndgameProofRun[] {
            opened.push(Object.freeze({ ...range }));
            return Object.freeze(unitRuns.slice(range.startIndex, range.endIndex));
          },
        }),
        transitions: 44, boundPrunes: 5, exhaustedDepths: Object.freeze([]),
      }),
      tip: Object.freeze({ generation: 33, manifestSha256: 'F'.repeat(64) }),
      diagnostics, advanceAllowed: true,
    }));
    const layerResult = advanceOptimalEndgameRouteProofForDefinition(definition, route, layerStore);
    expect(layerResult).toMatchObject({ status: 'searching', generation: 34, depth: 1, parentOffset: 0 });
    expect(opened).toEqual([{ startIndex: 0, endIndex: 32 }, { startIndex: 32, endIndex: 33 }]);
    expect(layerStore.releasedRunIds).toEqual([
      'r7-f-d00000-g00000',
      ...unitRuns.map(({ id }) => id),
    ]);
    const layer = layerStore.publications[0]!;
    expect(layer.transition).toBe('layer');
    if (layer.transition !== 'layer') throw new Error('expected layer publication');
    expect(layer.completedDepth).toEqual({ lockedPieces: 0, frontierStates: largeFrontierSize, transitions: 44, boundPrunes: 5 });
    expect(layer.nextFrontier).toMatchObject({ id: 'r7-f-d00001-g00034', size: 1 });

    const emptyUnit = memoryRun('r7-u-d00000-n00000000-g00001', []);
    const emptyStore = new MemoryCheckpointRunStore(Object.freeze({
      checkpoint: Object.freeze({
        kind: 'searching', generation: 1, binding: seed.binding, depth: 0,
        parentOffset: 1, lastProcessedParentKey: key,
        frontier: memoryRun('r7-f-d00000-g00000', [key]),
        nextRuns: Object.freeze({ count: 1, open: () => Object.freeze([emptyUnit]) }),
        transitions: 2, boundPrunes: 1, exhaustedDepths: Object.freeze([]),
      }),
      tip: Object.freeze({ generation: 1, manifestSha256: '1'.repeat(64) }),
      diagnostics, advanceAllowed: true,
    }));
    const emptyResult = advanceOptimalEndgameRouteProofForDefinition(definition, route, emptyStore);
    expect(emptyResult).toMatchObject({ status: 'complete', generation: 2, certificate: { exhaustedDepths: [
      { lockedPieces: 0, frontierStates: 1, transitions: 2, boundPrunes: 1 },
    ] } });
    expect(emptyStore.publications[0]).toMatchObject({ transition: 'complete', reason: 'empty-frontier' });

    const finalDepth = seed.binding.optimalLocks - 2;
    const priorDepths = Object.freeze(Array.from({ length: finalDepth }, (_, lockedPieces) => Object.freeze({
      lockedPieces, frontierStates: 1, transitions: 0, boundPrunes: 0,
    })));
    const finalStore = new MemoryCheckpointRunStore(Object.freeze({
      checkpoint: Object.freeze({
        kind: 'searching', generation: 5, binding: seed.binding, depth: finalDepth,
        parentOffset: 1, lastProcessedParentKey: key,
        frontier: memoryRun(`r7-f-d${String(finalDepth).padStart(5, '0')}-g00004`, [key]),
        nextRuns: Object.freeze({ count: 0, open: () => { throw new Error('final depth opens no collection'); } }),
        transitions: 3, boundPrunes: 2, exhaustedDepths: priorDepths,
      }),
      tip: Object.freeze({ generation: 5, manifestSha256: '2'.repeat(64) }),
      diagnostics, advanceAllowed: true,
    }));
    const finalResult = advanceOptimalEndgameRouteProofForDefinition(definition, route, finalStore);
    expect(finalResult).toMatchObject({
      status: 'complete', generation: 6,
      certificate: { exhaustedDepths: [...priorDepths, {
        lockedPieces: finalDepth, frontierStates: 1, transitions: 3, boundPrunes: 2,
      }] },
    });
    expect(finalStore.publications[0]).toMatchObject({ transition: 'complete', reason: 'final-depth' });
    expect(finalStore.createRunCount).toBe(0);

    const wrongBatchRuns = Object.freeze([
      memoryRun('r7-u-d00000-n00000000-g00001', [key]),
      memoryRun('r7-u-d00000-n00000001-g00002', [key]),
    ]);
    const wrongBatchStore = new MemoryCheckpointRunStore(Object.freeze({
      checkpoint: Object.freeze({
        kind: 'searching', generation: 1, binding: seed.binding, depth: 0,
        parentOffset: 1, lastProcessedParentKey: key,
        frontier: memoryRun('r7-f-d00000-g00000', [key]),
        nextRuns: Object.freeze({ count: 1, open: () => wrongBatchRuns }),
        transitions: 0, boundPrunes: 0, exhaustedDepths: Object.freeze([]),
      }),
      tip: Object.freeze({ generation: 1, manifestSha256: '4'.repeat(64) }),
      diagnostics, advanceAllowed: true,
    }));
    expect(() => advanceOptimalEndgameRouteProofForDefinition(definition, route, wrongBatchStore))
      .toThrow('wrong contiguous batch length');
    expect(wrongBatchStore.releasedRunIds).toEqual([
      'r7-f-d00000-g00000',
      ...wrongBatchRuns.map(({ id }) => id),
    ]);
    expect(wrongBatchStore.publications).toEqual([]);
    expect(wrongBatchStore.createRunCount).toBe(0);
  });

  it('publishes a one-lock candidate as zero-decision complete without enumerating a landing', () => {
    const definition: EndgameDefinition = Object.freeze({
      ...ENDGAME_V3_INTRO_DRAFTS[1]!,
      name: 'One-lock resumable fixture',
      seed: 2,
      anchorCells: Object.freeze([
        Object.freeze({ x: 0, y: 17 }),
        Object.freeze({ x: 2, y: 17 }),
      ]),
    });
    const route = 'SCRRHTTTTTTTTTTTT';
    const diagnostics = Object.freeze({
      activeRuns: Object.freeze([]), residue: Object.freeze([]), residueTruncated: false,
      cleanupErrors: Object.freeze([]), cleanupErrorsTruncated: false,
    });
    const seedStore = new MemoryCheckpointRunStore(Object.freeze({
      checkpoint: null, tip: null, diagnostics, advanceAllowed: true,
    }));
    advanceOptimalEndgameRouteProofForDefinition(definition, route, seedStore);
    const seed = seedStore.publications[0]!;
    if (seed.transition !== 'seed') throw new Error('expected seed publication');
    expect(seed.binding.optimalLocks).toBe(1);
    const frontier = new MemoryRun(
      'r7-f-d00000-g00000', [seed.binding.initialFrontierKey], 1, (_id, values) => values, () => {},
    );
    const completeStore = new MemoryCheckpointRunStore(Object.freeze({
      checkpoint: Object.freeze({
        kind: 'searching', generation: 0, binding: seed.binding, depth: 0,
        parentOffset: 0, lastProcessedParentKey: null, frontier,
        nextRuns: Object.freeze({ count: 0, open: () => { throw new Error('zero decision opens no collection'); } }),
        transitions: 0, boundPrunes: 0, exhaustedDepths: Object.freeze([]),
      }),
      tip: Object.freeze({ generation: 0, manifestSha256: '3'.repeat(64) }),
      diagnostics, advanceAllowed: true,
    }));
    const result = advanceOptimalEndgameRouteProofForDefinition(definition, route, completeStore);
    expect(result).toMatchObject({
      status: 'complete', generation: 1, certificate: { exhaustedDepths: [] },
    });
    if (result?.status !== 'complete') throw new Error('expected zero-decision certificate');
    expect(result.certificate).toEqual(certifyOptimalEndgameRouteForDefinition(definition, route));
    expect(completeStore.publications[0]).toMatchObject({
      transition: 'complete', completedDepth: null, reason: 'zero-decision-depth',
    });
    expect(frontier.ranges).toEqual([{ startOrdinal: 0, endOrdinal: 1 }]);
    expect(completeStore.createRunCount).toBe(0);

    const fullLoop = runResumableCertificate(definition, route);
    expect(fullLoop.certificate).toEqual(certifyOptimalEndgameRouteForDefinition(definition, route));
    expect(fullLoop.store.publications.map(({ transition }) => transition)).toEqual(['seed', 'complete']);
    expect(fullLoop.store.publicationLiveViewCounts).toEqual([0, 0]);
    expect(fullLoop.store.suspendCount).toBe(1);
  });

  it('fails closed on generation, depth, and counter plus/minus-one checkpoint drift', () => {
    const definition = ENDGAME_V3_INTRO_DRAFTS[0]!;
    const route = intro01.optimalRoute;
    const diagnostics = Object.freeze({
      activeRuns: Object.freeze([]), residue: Object.freeze([]), residueTruncated: false,
      cleanupErrors: Object.freeze([]), cleanupErrorsTruncated: false,
    });
    const seedStore = new MemoryCheckpointRunStore(Object.freeze({
      checkpoint: null, tip: null, diagnostics, advanceAllowed: true,
    }));
    advanceOptimalEndgameRouteProofForDefinition(definition, route, seedStore);
    const seed = seedStore.publications[0]!;
    if (seed.transition !== 'seed') throw new Error('expected seed publication');
    const makeCheckpoint = (options: Readonly<{
      generation: number; depth: number; frontierDepth: number; parentOffset?: number;
      transitions?: number; boundPrunes?: number;
    }>): EndgameProofSearchingCheckpoint => Object.freeze({
      kind: 'searching', generation: options.generation, binding: seed.binding, depth: options.depth,
      parentOffset: options.parentOffset ?? 0,
      lastProcessedParentKey: options.parentOffset ? seed.binding.initialFrontierKey : null,
      frontier: new MemoryRun(
        `r7-f-d${String(options.frontierDepth).padStart(5, '0')}-g00000`,
        [seed.binding.initialFrontierKey], 1, (_id, values) => values, () => {},
      ),
      nextRuns: Object.freeze({
        count: options.parentOffset ? 1 : 0,
        open: () => { throw new Error('drift must fail before collection open'); },
      }),
      transitions: options.transitions ?? 0,
      boundPrunes: options.boundPrunes ?? 0,
      exhaustedDepths: Object.freeze(Array.from({ length: options.depth }, (_, lockedPieces) => Object.freeze({
        lockedPieces, frontierStates: 1, transitions: 0, boundPrunes: 0,
      }))),
    });
    for (const checkpoint of [
      makeCheckpoint({ generation: 1, depth: 0, frontierDepth: 0 }),
      makeCheckpoint({ generation: 0, depth: 0, frontierDepth: 0, parentOffset: 1 }),
      makeCheckpoint({ generation: 0, depth: 1, frontierDepth: 0 }),
      makeCheckpoint({ generation: 0, depth: 0, frontierDepth: 1 }),
      makeCheckpoint({ generation: 0, depth: 0, frontierDepth: 0, transitions: 1 }),
      makeCheckpoint({ generation: 0, depth: 0, frontierDepth: 0, boundPrunes: -1 }),
    ]) {
      const store = new MemoryCheckpointRunStore(Object.freeze({
        checkpoint,
        tip: Object.freeze({ generation: checkpoint.generation, manifestSha256: '5'.repeat(64) }),
        diagnostics,
        advanceAllowed: true,
      }));
      expect(() => advanceOptimalEndgameRouteProofForDefinition(definition, route, store)).toThrow();
      expect(store.publications).toEqual([]);
    }

    const historicalRecord = Object.freeze({
      lockedPieces: 0, frontierStates: 1, transitions: 0, boundPrunes: 0,
    });
    for (const impossibleGeneration of [1, 3]) {
      const checkpoint: EndgameProofSearchingCheckpoint = Object.freeze({
        kind: 'searching', generation: impossibleGeneration, binding: seed.binding, depth: 1,
        parentOffset: 0, lastProcessedParentKey: null,
        frontier: new MemoryRun(
          `r7-f-d00001-g${String(impossibleGeneration).padStart(5, '0')}`,
          [seed.binding.initialFrontierKey], 1, (_id, values) => values, () => {},
        ),
        nextRuns: Object.freeze({ count: 0, open: () => Object.freeze([]) }),
        transitions: 0, boundPrunes: 0, exhaustedDepths: Object.freeze([historicalRecord]),
      });
      const store = new MemoryCheckpointRunStore(Object.freeze({
        checkpoint,
        tip: Object.freeze({ generation: impossibleGeneration, manifestSha256: '6'.repeat(64) }),
        diagnostics, advanceAllowed: true,
      }));
      expect(() => advanceOptimalEndgameRouteProofForDefinition(definition, route, store))
        .toThrow('frontier generation does not match its completed-depth history');
      expect(store.publications).toEqual([]);
    }

    const completedDepths = Object.freeze(Array.from(
      { length: seed.binding.optimalLocks - 1 },
      (_, lockedPieces) => Object.freeze({ lockedPieces, frontierStates: 1, transitions: 0, boundPrunes: 0 }),
    ));
    for (const impossibleGeneration of [5, 7]) {
      const store = new MemoryCheckpointRunStore(Object.freeze({
        checkpoint: Object.freeze({
          kind: 'complete', generation: impossibleGeneration, binding: seed.binding,
          reason: 'final-depth', exhaustedDepths: completedDepths,
        }),
        tip: Object.freeze({ generation: impossibleGeneration, manifestSha256: '7'.repeat(64) }),
        diagnostics, advanceAllowed: true,
      }));
      expect(() => advanceOptimalEndgameRouteProofForDefinition(definition, route, store))
        .toThrow('complete checkpoint generation does not match its completed-depth history');
      expect(store.publications).toEqual([]);
    }
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
    const boundaryStore = new MemoryRunStore();
    expect(ENDGAME_PROOF_FRONTIER_STORE_TESTING.persist(
      records(4096),
      boundaryStore,
      oneRecordChunks,
    )).toEqual(records(4096));
    expect(boundaryStore.snapshot().peakDescriptors).toBe(4097);
    expect(boundaryStore.snapshot().peakDescriptors + 1).toBe(4098);
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
      const resumable = runResumableCertificate(definition, route);
      expect(resumable.certificate).toEqual(memory);
      expect(resumable.store.suspendCount).toBe(1);
      expect(resumable.store.publicationLiveViewCounts.every((count) => count === 0)).toBe(true);
      expect(resumable.store.collectionRanges.every(({ startIndex, endIndex }) => (
        endIndex > startIndex && endIndex - startIndex <= 32
      ))).toBe(true);
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
    expect(runResumableCertificate(synthetic, intro02.optimalRoute).certificate).toEqual(memory);
    expect(injected?.levelId).toBe(ENDGAME_V3_INTRO_DRAFTS[0]!.id);
    expect(injected?.initialStateHash).not.toBe(intro02.initialStateHash);
  }, 1_200_000);
});
