import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { types as nativeTypes } from 'node:util';
import { describe, expect, it } from 'vitest';
import intro01 from '../../docs/workstreams/tetris-t37-endgame/fixtures/t37/endgame-v3-intro-01.json';
import intro02 from '../../docs/workstreams/tetris-t37-endgame/fixtures/t37/endgame-v3-intro-02.json';
import intro03 from '../../docs/workstreams/tetris-t37-endgame/fixtures/t37/endgame-v3-intro-03.json';
import intro04 from '../../docs/workstreams/tetris-t37-endgame/fixtures/t37/endgame-v3-intro-04.json';
import {
  ENDGAME_DISK_FRONTIER_LIMITS,
  RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS,
  RESUMABLE_ENDGAME_DISK_FRONTIER_TESTING,
  createEndgameDiskFrontierStore,
  createResumableEndgameDiskFrontierStore,
} from '../../scripts/endgame-disk-frontier.mjs';
import { ENDGAME_V3_INTRO_DRAFTS } from '../game/core/endgameV3IntroDefinitions.ts';
import {
  ENDGAME_PROOF_FRONTIER_STORE_TESTING,
  certifyOptimalEndgameRouteForDefinition,
} from '../game/core/endgameRouteSearch.ts';

function temporaryStage(label) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), `tetramorph-${label}-`));
  return { parent, stage: path.join(parent, 'frontier-stage') };
}

function releaseParent(parent, stage) {
  expect(fs.existsSync(stage), `stage residue at ${stage}`).toBe(false);
  fs.rmdirSync(parent);
}

function trackedFs(events) {
  let openHandles = 0;
  let peakHandles = 0;
  const writeLengths = [];
  const readLengths = [];
  return {
    seam: {
      openSync(...args) {
        const descriptor = fs.openSync(...args);
        openHandles += 1;
        peakHandles = Math.max(peakHandles, openHandles);
        events.push(`open:${path.extname(String(args[0])) || 'stage'}`);
        return descriptor;
      },
      writeSync(...args) {
        writeLengths.push(args[3]);
        events.push('write');
        return fs.writeSync(...args);
      },
      fsyncSync(...args) {
        events.push('flush');
        return fs.fsyncSync(...args);
      },
      closeSync(...args) {
        const result = fs.closeSync(...args);
        openHandles -= 1;
        events.push('close');
        return result;
      },
      renameSync(...args) {
        events.push('finalize');
        return fs.renameSync(...args);
      },
      readSync(...args) {
        readLengths.push(args[3]);
        events.push('read');
        return fs.readSync(...args);
      },
      unlinkSync(...args) {
        events.push('unlink');
        return fs.unlinkSync(...args);
      },
      readdirSync(...args) {
        events.push('enumerate');
        return fs.readdirSync(...args);
      },
      rmdirSync(...args) {
        events.push('remove-stage');
        return fs.rmdirSync(...args);
      },
    },
    snapshot() {
      return { openHandles, peakHandles, writeLengths, readLengths };
    },
  };
}

function trackedResumableFs(events) {
  const descriptors = new Map();
  const faults = { runPartUnlink: false, indexClose: false };
  const label = (filePath) => path.basename(String(filePath));
  return {
    faults,
    seam: {
      openSync(...args) {
        const descriptor = fs.openSync(...args);
        descriptors.set(descriptor, label(args[0]));
        events.push(`open:${label(args[0])}`);
        return descriptor;
      },
      readSync(descriptor, ...args) {
        events.push(`read:${descriptors.get(descriptor)}:${args[3]}`);
        return fs.readSync(descriptor, ...args);
      },
      closeSync(descriptor) {
        if (faults.indexClose && descriptors.get(descriptor)?.endsWith('.idx.part')) {
          faults.indexClose = false;
          const error = new Error('injected index close fault');
          error.code = 'EIO';
          throw error;
        }
        const result = fs.closeSync(descriptor);
        descriptors.delete(descriptor);
        return result;
      },
      linkSync(source, finalPath) {
        events.push(`link:${label(source)}>${label(finalPath)}`);
        return fs.linkSync(source, finalPath);
      },
      unlinkSync(filePath) {
        events.push(`unlink:${label(filePath)}`);
        if (faults.runPartUnlink && String(filePath).endsWith('.run.part')) {
          faults.runPartUnlink = false;
          const error = new Error('injected run-part unlink fault');
          error.code = 'EIO';
          throw error;
        }
        return fs.unlinkSync(filePath);
      },
    },
    openHandles() { return descriptors.size; },
  };
}

function oneShotFault(operation) {
  let fired = false;
  return {
    [operation](...args) {
      if (!fired) {
        fired = true;
        const error = new Error(`injected ${operation} fault`);
        error.code = 'EIO';
        throw error;
      }
      return fs[operation](...args);
    },
  };
}

function nthFault(operation, target) {
  let calls = 0;
  return {
    [operation](...args) {
      calls += 1;
      if (calls === target) {
        const error = new Error(`injected ${operation} fault ${target}`);
        error.code = 'EIO';
        throw error;
      }
      return fs[operation](...args);
    },
  };
}

function retryCleanup(store, writer, run) {
  for (const action of [
    () => writer?.abort(),
    () => run?.dispose(),
    () => store?.dispose(),
    () => store?.dispose(),
  ]) {
    try {
      action();
    } catch {
      // Every injected operation fails once; later exact retries own cleanup.
    }
  }
}

function manifestBinding(optimalLocks = 3) {
  return Object.freeze({
    schema: 't37-f4e-r7-proof-binding-v1',
    levelId: 't3r-test',
    candidateCommandStream: 'SHT',
    optimalLocks,
    initialStateHash: '1234abcd',
    initialFrontierKey: 'ROOT',
  });
}

function manifestIdentity(size, ino) {
  return Object.freeze({ dev: '1', ino: String(ino), size: String(size), mtimeNs: '3', ctimeNs: '4' });
}

function manifestDescriptor(id, size, firstKey, lastKey, dataBytes = size === 0 ? 0 : 8) {
  const entryCount = size === 0 ? 1 : Math.floor((size - 1) / 65_536) + 2;
  const indexBytes = 24 + 8 * entryCount;
  return Object.freeze({
    id,
    size,
    dataFile: `${id}.run`,
    dataBytes,
    dataSha256: 'A'.repeat(64),
    indexFile: `${id}.idx`,
    indexBytes,
    indexSha256: 'B'.repeat(64),
    firstKey,
    lastKey,
    dataIdentity: manifestIdentity(dataBytes, 10 + id.length),
    indexIdentity: manifestIdentity(indexBytes, 20 + id.length),
  });
}

function manifestTotals(latestCheckpointRunBytes, overrides = {}) {
  return Object.freeze({
    latestCheckpointRunBytes,
    uncommittedWorkingRunBytes: 0,
    recognizedPhysicalRunBytes: latestCheckpointRunBytes,
    retainedManifestBytes: 0,
    ownerAndIndexBytes: 64,
    namespaceEntries: 1,
    ...overrides,
  });
}

function manifestCandidate(run, descriptor) {
  return Object.freeze({ run, descriptor });
}

function manifestStateBytes(testing, state) {
  return testing.canonicalJson({
    tip: state.tip,
    binding: state.binding,
    bindingSha256: state.bindingSha256,
    kind: state.kind,
    generation: state.generation,
    depth: state.depth,
    parentOffset: state.parentOffset,
    lastProcessedParentKey: state.lastProcessedParentKey,
    transitions: state.transitions,
    boundPrunes: state.boundPrunes,
    frontierDescriptor: state.frontierDescriptor,
    nextRuns: state.nextRuns,
    activeIds: [...state.activeIds].sort(),
    activeRunBytes: state.activeRunBytes,
    nextRunsSha256: state.nextRunsSha256,
    completedDepths: state.completedDepths,
    completedDepthsSha256: state.completedDepthsSha256,
    completedTotals: state.completedTotals,
    reason: state.reason,
  });
}

function coveredManifestPlan(testing, transition, label) {
  const state = testing.createManifestState();
  const binding = manifestBinding(3);
  const frontier = Object.freeze({ token: `${label}-seed` });
  const frontierDescriptor = manifestDescriptor('r7-f-d00000-g00000', 1, 'ROOT', 'ROOT');
  const seed = testing.planManifestTransition(state, Object.freeze({
    transition: 'seed', previousTip: null, binding, frontier,
  }), manifestCandidate(frontier, frontierDescriptor), manifestTotals(8));
  testing.commitManifestTransition(state, seed);
  const unitRun = Object.freeze({ token: `${label}-unit` });
  const unitDescriptor = manifestDescriptor(
    'r7-u-d00000-n00000000-g00001', transition === 'layer' ? 1 : 0,
    transition === 'layer' ? 'NEXT' : null, transition === 'layer' ? 'NEXT' : null,
  );
  const unit = testing.planManifestTransition(state, Object.freeze({
    transition: 'unit', previousTip: seed.tip, parentOffset: 1, lastProcessedParentKey: 'ROOT',
    transitionsDelta: 3, boundPrunesDelta: 1, nextRun: unitRun,
  }), manifestCandidate(unitRun, unitDescriptor), manifestTotals(8 + unitDescriptor.dataBytes));
  testing.commitManifestTransition(state, unit);
  const completedDepth = Object.freeze({ lockedPieces: 0, frontierStates: 1, transitions: 3, boundPrunes: 1 });
  if (transition === 'complete') {
    return { state, plan: testing.planManifestTransition(state, Object.freeze({
      transition: 'complete', previousTip: unit.tip, completedDepth, reason: 'empty-frontier',
    }), null, manifestTotals(0)) };
  }
  const nextFrontier = Object.freeze({ token: `${label}-layer` });
  const nextDescriptor = manifestDescriptor('r7-f-d00001-g00002', 1, 'A', 'A');
  return { state, plan: testing.planManifestTransition(state, Object.freeze({
    transition: 'layer', previousTip: unit.tip, completedDepth, nextFrontier,
  }), manifestCandidate(nextFrontier, nextDescriptor), manifestTotals(8)) };
}

function coveredUnitAppendPlan(testing, label) {
  const state = testing.createManifestState();
  const frontier = Object.freeze({ token: `${label}-seed` });
  const frontierDescriptor = manifestDescriptor('r7-f-d00000-g00000', 1, 'ROOT', 'ROOT');
  const seed = testing.planManifestTransition(state, Object.freeze({
    transition: 'seed', previousTip: null, binding: manifestBinding(3), frontier,
  }), manifestCandidate(frontier, frontierDescriptor), manifestTotals(8));
  testing.commitManifestTransition(state, seed);
  const unitRun = Object.freeze({ token: `${label}-unit` });
  const unitDescriptor = manifestDescriptor('r7-u-d00000-n00000000-g00001', 0, null, null);
  const plan = testing.planManifestTransition(state, Object.freeze({
    transition: 'unit', previousTip: seed.tip, parentOffset: 1, lastProcessedParentKey: 'ROOT',
    transitionsDelta: 1, boundPrunesDelta: 0, nextRun: unitRun,
  }), manifestCandidate(unitRun, unitDescriptor), manifestTotals(8));
  return { state, plan, unitDescriptor };
}

describe('R7 resumable disk frontier primitives', () => {
  const testing = RESUMABLE_ENDGAME_DISK_FRONTIER_TESTING;

  it('freezes the production resource limits and canonical UTF-8 object ordering', () => {
    expect(RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS).toEqual(expect.objectContaining({
      parentUnitKeys: 65_536,
      maximumUnits: 4_096,
      maximumManifests: 32_768,
      maximumNamespaceEntries: 49_152,
      latestCheckpointRunBytes: 103_079_215_104,
      uncommittedWorkingRunBytes: 103_079_215_104,
      recognizedPhysicalRunBytes: 206_158_430_208,
      retainedManifestBytes: 536_870_912,
      ownerAndIndexBytes: 536_870_912,
      auxiliaryBytes: 1_073_741_824,
      manifestBytes: 16_384,
      ownerOrIndexBytes: 65_536,
    }));
    expect(testing.canonicalJson({ z: 1, a: [true, null, { b: 2, A: 1 }] }))
      .toBe('{"a":[true,null,{"A":1,"b":2}],"z":1}');
    expect(() => testing.canonicalJson({ value: 1.5 })).toThrow('safe integers');
    expect(() => testing.canonicalJson({ value: undefined })).toThrow('unsupported');
    const cycle = {};
    cycle.self = cycle;
    expect(() => testing.canonicalJson(cycle)).toThrow('cycles');
  });

  it('separates canonical labeled hashes from exact manifest-byte hashes', () => {
    const value = { schema: 'example', generation: 0 };
    const canonical = testing.canonicalJson(value);
    const labeled = testing.canonicalHash('T37-F4E-R7-TEST-V1', value);
    const manifest = testing.sha256Upper(Buffer.from(`${canonical}\n`, 'utf8'));
    expect(labeled).toMatch(testing.hashPattern);
    expect(manifest).toMatch(testing.hashPattern);
    expect(labeled).not.toBe(manifest);
    expect(testing.canonicalHash('T37-F4E-R7-TEST-V1', value)).toBe(labeled);
  });

  it('plans and commits the exact seed/unit/layer/complete delta chain without repeating prefixes', () => {
    const state = testing.createManifestState();
    const binding = manifestBinding(3);
    const seedRun = Object.freeze({ token: 'seed' });
    const seedDescriptor = manifestDescriptor('r7-f-d00000-g00000', 1, 'ROOT', 'ROOT');
    const seed = testing.planManifestTransition(state, Object.freeze({
      transition: 'seed', previousTip: null, binding, frontier: seedRun,
    }), manifestCandidate(seedRun, seedDescriptor), manifestTotals(seedDescriptor.dataBytes));
    expect(Object.keys(seed.manifest).sort()).toEqual([
      'bindingSha256', 'checkpointStateSha256', 'generation', 'previousManifestSha256',
      'resourceTotalsBeforeManifest', 'runChanges', 'schema', 'stateDelta', 'transition',
    ]);
    expect(Object.keys(seed.manifest.stateDelta).sort()).toEqual([
      'binding', 'boundPrunes', 'depth', 'lastProcessedParentKey', 'parentOffset', 'transitions',
    ]);
    expect(seed.manifest.runChanges.add).toEqual([seedDescriptor]);
    expect(seed.manifest.previousManifestSha256).toBeNull();
    expect(seed.tip.manifestSha256).toBe(testing.sha256Upper(seed.manifestBytes));
    expect(seed.manifestBytes.at(-1)).toBe(0x0a);
    testing.commitManifestTransition(state, seed);

    const unitRun = Object.freeze({ token: 'unit-0' });
    const unitDescriptor = manifestDescriptor('r7-u-d00000-n00000000-g00001', 0, null, null);
    const unit = testing.planManifestTransition(state, Object.freeze({
      transition: 'unit', previousTip: seed.tip, parentOffset: 1, lastProcessedParentKey: 'ROOT',
      transitionsDelta: 5, boundPrunesDelta: 1, nextRun: unitRun,
    }), manifestCandidate(unitRun, unitDescriptor), manifestTotals(seedDescriptor.dataBytes));
    const expectedNextRuns = testing.canonicalHash('T37-F4E-R7-NEXT-RUNS-STEP-V1', {
      previousSha256: testing.canonicalHash('T37-F4E-R7-NEXT-RUNS-EMPTY-V1', []),
      descriptorSha256: testing.descriptorHash(unitDescriptor),
    });
    expect(Object.keys(unit.manifest.stateDelta).sort()).toEqual([
      'boundPrunesDelta', 'depth', 'lastProcessedParentKey', 'parentOffset', 'transitionsDelta',
    ]);
    expect(unit.manifest.previousManifestSha256).toBe(seed.tip.manifestSha256);
    expect(unit.projection.nextRunsSha256).toBe(expectedNextRuns);
    expect(unit.projection.nextRunCount).toBe(1);
    testing.commitManifestTransition(state, unit);

    const layerRun = Object.freeze({ token: 'frontier-1' });
    const layerDescriptor = manifestDescriptor('r7-f-d00001-g00002', 2, 'A', 'B');
    const depth0 = Object.freeze({ lockedPieces: 0, frontierStates: 1, transitions: 5, boundPrunes: 1 });
    const layer = testing.planManifestTransition(state, Object.freeze({
      transition: 'layer', previousTip: unit.tip, completedDepth: depth0, nextFrontier: layerRun,
    }), manifestCandidate(layerRun, layerDescriptor), manifestTotals(layerDescriptor.dataBytes));
    expect(Object.keys(layer.manifest.stateDelta).sort()).toEqual(['completedDepth', 'nextDepth']);
    expect(layer.manifest.runChanges.removeRule).toBe('current-frontier-and-next-runs');
    expect(layer.manifest.runChanges.removeSetSha256)
      .toBe(testing.runSetHash([unitDescriptor, seedDescriptor]));
    expect(layer.projection.nextRunsSha256)
      .toBe(testing.canonicalHash('T37-F4E-R7-NEXT-RUNS-EMPTY-V1', []));
    expect(layer.projection.completedDepthsSha256).toBe(testing.canonicalHash('T37-F4E-R7-DEPTHS-STEP-V1', {
      previousSha256: testing.canonicalHash('T37-F4E-R7-DEPTHS-EMPTY-V1', []), record: depth0,
    }));
    testing.commitManifestTransition(state, layer);

    const finalUnit = testing.planManifestTransition(state, Object.freeze({
      transition: 'unit', previousTip: layer.tip, parentOffset: 2, lastProcessedParentKey: 'B',
      transitionsDelta: 7, boundPrunesDelta: 2, nextRun: null,
    }), null, manifestTotals(layerDescriptor.dataBytes));
    expect(finalUnit.manifest.runChanges.add).toEqual([]);
    expect(finalUnit.projection.nextRunCount).toBe(0);
    testing.commitManifestTransition(state, finalUnit);

    const depth1 = Object.freeze({ lockedPieces: 1, frontierStates: 2, transitions: 7, boundPrunes: 2 });
    const complete = testing.planManifestTransition(state, Object.freeze({
      transition: 'complete', previousTip: finalUnit.tip, completedDepth: depth1, reason: 'final-depth',
    }), null, manifestTotals(0));
    expect(Object.keys(complete.manifest.stateDelta).sort()).toEqual(['completedDepth', 'reason']);
    expect(complete.manifest.runChanges.add).toEqual([]);
    expect(complete.manifest.runChanges.removeRule).toBe('all-active-proof-runs');
    expect(complete.manifest.runChanges.removeSetSha256).toBe(testing.runSetHash([layerDescriptor]));
    expect(complete.projection.completedDepthCount).toBe(2);
    expect(complete.manifestBytes.toString('utf8')).not.toContain('"lockedPieces":0');
    expect(complete.manifestBytes.length).toBeLessThan(4_000);
    expect(complete.manifest.checkpointStateSha256)
      .toBe(testing.canonicalHash('T37-F4E-R7-CHECKPOINT-STATE-V1', complete.projection));
    testing.commitManifestTransition(state, complete);
    expect(state).toEqual(expect.objectContaining({ kind: 'complete', generation: 4, reason: 'final-depth' }));
    expect(state.completedDepths).toEqual([depth0, depth1]);
  });

  it('rejects noncanonical shapes, unsafe deltas, stale tips, and foreign run candidates before publication', () => {
    const emptySetHash = testing.runSetHash([]);
    const descriptor = manifestDescriptor('r7-f-d00000-g00000', 1, 'ROOT', 'ROOT');
    for (const add of [null, descriptor, [descriptor, descriptor]]) {
      expect(() => testing.validateRunChanges({ add, removeRule: 'none', removeSetSha256: emptySetHash }))
        .toThrow('zero-or-one descriptor array');
    }
    expect(testing.validateRunChanges({ add: [descriptor], removeRule: 'none', removeSetSha256: emptySetHash }).add)
      .toEqual([descriptor]);
    expect(() => testing.runSetHash([descriptor, descriptor])).toThrow('duplicate run descriptor id');
    expect(() => testing.validateDescriptor({
      ...descriptor, dataIdentity: { ...descriptor.dataIdentity, ino: '01' },
    })).toThrow('canonical nonnegative decimal string');
    expect(() => testing.validateDescriptor({ ...descriptor, extra: true })).toThrow('exact keys');
    expect(() => testing.validateDescriptor(manifestDescriptor(
      'r7-f-d00000-g00000', 536_608_769, 'A', 'B', 1,
    ))).toThrow('exceeds 65536');
    expect(() => testing.validateDescriptor({
      ...descriptor, dataBytes: 0, dataIdentity: manifestIdentity(0, 99),
    })).toThrow('dataBytes must be positive');

    const state = testing.createManifestState();
    const binding = manifestBinding(3);
    const seedRun = Object.freeze({ token: 'seed' });
    const publication = Object.freeze({ transition: 'seed', previousTip: null, binding, frontier: seedRun });
    expect(() => testing.planManifestTransition(
      state, { ...publication, extra: true }, manifestCandidate(seedRun, descriptor), manifestTotals(8),
    )).toThrow('exact keys');
    expect(() => testing.planManifestTransition(
      state, publication, manifestCandidate(Object.freeze({ token: 'foreign' }), descriptor), manifestTotals(8),
    )).toThrow('ownership mismatch');
    expect(() => testing.planManifestTransition(
      state, { ...publication, binding: { ...binding, extra: true } },
      manifestCandidate(seedRun, descriptor), manifestTotals(8),
    )).toThrow('exact keys');
    const seed = testing.planManifestTransition(state, publication, manifestCandidate(seedRun, descriptor), manifestTotals(8));
    testing.commitManifestTransition(state, seed);

    const unitRun = Object.freeze({ token: 'unit' });
    const unitDescriptor = manifestDescriptor('r7-u-d00000-n00000000-g00001', 0, null, null);
    const unitPublication = Object.freeze({
      transition: 'unit', previousTip: seed.tip, parentOffset: 1, lastProcessedParentKey: 'ROOT',
      transitionsDelta: 1, boundPrunesDelta: 0, nextRun: unitRun,
    });
    expect(() => testing.planManifestTransition(state, {
      ...unitPublication, previousTip: { generation: 0, manifestSha256: 'C'.repeat(64) },
    }, manifestCandidate(unitRun, unitDescriptor), manifestTotals(8))).toThrow('authenticated tip');
    expect(() => testing.planManifestTransition(
      state,
      unitPublication,
      manifestCandidate(unitRun, manifestDescriptor('r7-u-d00000-n00000000-g00002', 0, null, null)),
      manifestTotals(8),
    )).toThrow('candidate id');
    state.transitions = Number.MAX_SAFE_INTEGER;
    expect(() => testing.planManifestTransition(
      state, unitPublication, manifestCandidate(unitRun, unitDescriptor), manifestTotals(8),
    )).toThrow('safe integer domain');
    state.transitions = 0;
    const unit = testing.planManifestTransition(
      state, unitPublication, manifestCandidate(unitRun, unitDescriptor), manifestTotals(8),
    );
    testing.commitManifestTransition(state, unit);
    const layerRun = Object.freeze({ token: 'layer' });
    const layerDescriptor = manifestDescriptor('r7-f-d00001-g00002', 1, 'A', 'A');
    expect(() => testing.planManifestTransition(state, Object.freeze({
      transition: 'layer', previousTip: unit.tip,
      completedDepth: Object.freeze({ lockedPieces: 0, frontierStates: 2, transitions: 1, boundPrunes: 0 }),
      nextFrontier: layerRun,
    }), manifestCandidate(layerRun, layerDescriptor), manifestTotals(8))).toThrow('does not match');

    state.generation = 32_767;
    state.tip = Object.freeze({ generation: 32_767, manifestSha256: unit.tip.manifestSha256 });
    expect(() => testing.planManifestTransition(state, Object.freeze({
      transition: 'layer', previousTip: state.tip,
      completedDepth: Object.freeze({ lockedPieces: 0, frontierStates: 1, transitions: 1, boundPrunes: 0 }),
      nextFrontier: layerRun,
    }), manifestCandidate(layerRun, layerDescriptor), manifestTotals(8))).toThrow('32767');
  });

  it('enforces the exact 16,384-byte canonical manifest boundary after one serialization', () => {
    const descriptor = manifestDescriptor('r7-f-d00000-g00000', 1, 'ROOT', 'ROOT');
    const planSeed = (candidateCommandStream) => {
      const state = testing.createManifestState();
      const binding = { ...manifestBinding(3), candidateCommandStream };
      const frontier = Object.freeze({ token: `manifest-${candidateCommandStream.length}` });
      return testing.planManifestTransition(state, Object.freeze({
        transition: 'seed', previousTip: null, binding, frontier,
      }), manifestCandidate(frontier, descriptor), manifestTotals(8));
    };
    const base = planSeed('');
    const padding = RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS.manifestBytes - base.manifestBytes.length;
    expect(padding).toBeGreaterThan(0);
    expect(planSeed('X'.repeat(padding)).manifestBytes.length)
      .toBe(RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS.manifestBytes);
    expect(() => planSeed('X'.repeat(padding + 1))).toThrow('exceeds 16384 bytes');
  });

  it('authenticates a detached plan snapshot before any commit-state mutation', () => {
    const newPlan = () => {
      const state = testing.createManifestState();
      const binding = { ...manifestBinding(3) };
      const descriptor = JSON.parse(JSON.stringify(
        manifestDescriptor('r7-f-d00000-g00000', 1, 'ROOT', 'ROOT'),
      ));
      const frontier = Object.freeze({ token: 'snapshot-seed' });
      const plan = testing.planManifestTransition(state, Object.freeze({
        transition: 'seed', previousTip: null, binding, frontier,
      }), manifestCandidate(frontier, descriptor), manifestTotals(8));
      return { state, binding, descriptor, plan };
    };
    for (const mutate of [
      (plan) => { plan.manifestBytes[0] ^= 1; },
      (plan) => { plan.manifest.stateDelta.binding.levelId = 'tampered-binding'; },
      (plan) => { plan.manifest.runChanges.add[0].dataSha256 = 'C'.repeat(64); },
      (plan) => { plan.manifest.stateDelta.depth = 1; },
      (plan) => { plan.patch.depth = 1; },
    ]) {
      const { state, plan } = newPlan();
      const before = manifestStateBytes(testing, state);
      mutate(plan);
      expect(() => testing.commitManifestTransition(state, plan)).toThrow();
      expect(manifestStateBytes(testing, state)).toBe(before);
    }

    const detached = newPlan();
    detached.binding.levelId = 'mutated-caller-binding';
    detached.descriptor.dataSha256 = 'D'.repeat(64);
    testing.commitManifestTransition(detached.state, detached.plan);
    expect(detached.state.binding.levelId).toBe('t3r-test');
    expect(detached.state.frontierDescriptor.dataSha256).toBe('A'.repeat(64));
  });

  it('binds each manifest plan to one originating state and consumes it exactly once', () => {
    const descriptor = manifestDescriptor('r7-f-d00000-g00000', 1, 'ROOT', 'ROOT');
    const seedPlan = (state, label) => {
      const frontier = Object.freeze({ token: label });
      return testing.planManifestTransition(state, Object.freeze({
        transition: 'seed', previousTip: null, binding: manifestBinding(3), frontier,
      }), manifestCandidate(frontier, descriptor), manifestTotals(8));
    };

    const first = testing.createManifestState();
    const second = testing.createManifestState();
    const firstPlan = seedPlan(first, 'state-bound-seed');
    const firstBefore = manifestStateBytes(testing, first);
    const secondBefore = manifestStateBytes(testing, second);
    expect(() => testing.commitManifestTransition(second, firstPlan)).toThrow('different state instance');
    expect(manifestStateBytes(testing, first)).toBe(firstBefore);
    expect(manifestStateBytes(testing, second)).toBe(secondBefore);
    testing.commitManifestTransition(first, firstPlan);
    const committedOnce = manifestStateBytes(testing, first);
    expect(() => testing.commitManifestTransition(first, firstPlan)).toThrow('not owned');
    expect(manifestStateBytes(testing, first)).toBe(committedOnce);

    const nextRun = Object.freeze({ token: 'state-bound-unit' });
    const nextDescriptor = manifestDescriptor('r7-u-d00000-n00000000-g00001', 0, null, null);
    const nextPlan = testing.planManifestTransition(first, Object.freeze({
      transition: 'unit', previousTip: first.tip, parentOffset: 1, lastProcessedParentKey: 'ROOT',
      transitionsDelta: 1, boundPrunesDelta: 0, nextRun,
    }), manifestCandidate(nextRun, nextDescriptor), manifestTotals(8));
    const reconstructed = {
      ...first,
      tip: { ...first.tip },
      binding: JSON.parse(JSON.stringify(first.binding)),
      frontierDescriptor: JSON.parse(JSON.stringify(first.frontierDescriptor)),
      nextRuns: first.nextRuns.map((entry) => JSON.parse(JSON.stringify(entry))),
      activeIds: new Set(first.activeIds),
      completedDepths: first.completedDepths.map((entry) => ({ ...entry })),
      completedTotals: { ...first.completedTotals },
    };
    expect(manifestStateBytes(testing, reconstructed)).toBe(manifestStateBytes(testing, first));
    const originalBeforeCloneAttempt = manifestStateBytes(testing, first);
    const cloneBefore = manifestStateBytes(testing, reconstructed);
    expect(() => testing.commitManifestTransition(reconstructed, nextPlan)).toThrow('different state instance');
    expect(manifestStateBytes(testing, first)).toBe(originalBeforeCloneAttempt);
    expect(manifestStateBytes(testing, reconstructed)).toBe(cloneBefore);

    const shared = testing.createManifestState();
    const winner = seedPlan(shared, 'winner');
    const stale = seedPlan(shared, 'stale');
    testing.commitManifestTransition(shared, winner);
    const afterWinner = manifestStateBytes(testing, shared);
    expect(() => testing.commitManifestTransition(shared, stale)).toThrow('base tip is stale');
    expect(manifestStateBytes(testing, shared)).toBe(afterWinner);

  });

  it('commits all 4,096 unit runs in place without iterating or replacing growing collections', () => {
    const state = testing.createManifestState();
    const seedRun = Object.freeze({ token: 'constant-unit-seed' });
    const seedDescriptor = manifestDescriptor('r7-f-d00000-g00000', 1, 'ROOT', 'ROOT');
    const seed = testing.planManifestTransition(state, Object.freeze({
      transition: 'seed', previousTip: null, binding: manifestBinding(4), frontier: seedRun,
    }), manifestCandidate(seedRun, seedDescriptor), manifestTotals(8));
    testing.commitManifestTransition(state, seed);

    const depthZeroRun = Object.freeze({ token: 'constant-unit-depth-zero' });
    const depthZeroDescriptor = manifestDescriptor('r7-u-d00000-n00000000-g00001', 1, 'WIDE', 'WIDE');
    const depthZeroUnit = testing.planManifestTransition(state, Object.freeze({
      transition: 'unit', previousTip: seed.tip, parentOffset: 1, lastProcessedParentKey: 'ROOT',
      transitionsDelta: 1, boundPrunesDelta: 0, nextRun: depthZeroRun,
    }), manifestCandidate(depthZeroRun, depthZeroDescriptor), manifestTotals(16));
    testing.commitManifestTransition(state, depthZeroUnit);

    const wideRun = Object.freeze({ token: 'constant-unit-wide-frontier' });
    const wideSize = 65_536 * 4_096;
    const wideDescriptor = manifestDescriptor('r7-f-d00001-g00002', wideSize, 'K0000', 'K4095');
    const layer = testing.planManifestTransition(state, Object.freeze({
      transition: 'layer', previousTip: depthZeroUnit.tip,
      completedDepth: Object.freeze({ lockedPieces: 0, frontierStates: 1, transitions: 1, boundPrunes: 0 }),
      nextFrontier: wideRun,
    }), manifestCandidate(wideRun, wideDescriptor), manifestTotals(8));
    testing.commitManifestTransition(state, layer);

    const nextRunsIdentity = state.nextRuns;
    const activeIdsIdentity = state.activeIds;
    const prefixIteration = () => { throw new Error('growing manifest collection was iterated'); };
    Object.defineProperty(nextRunsIdentity, Symbol.iterator, { value: prefixIteration, configurable: true });
    Object.defineProperty(activeIdsIdentity, Symbol.iterator, { value: prefixIteration, configurable: true });
    let tip = layer.tip;
    try {
      for (let unit = 0; unit < 4_096; unit += 1) {
        const generation = unit + 3;
        const key = `K${String(unit).padStart(4, '0')}`;
        const run = Object.freeze({ token: `constant-unit-${unit}` });
        const descriptor = manifestDescriptor(
          `r7-u-d00001-n${String(unit).padStart(8, '0')}-g${String(generation).padStart(5, '0')}`,
          0, null, null,
        );
        const plan = testing.planManifestTransition(state, Object.freeze({
          transition: 'unit', previousTip: tip, parentOffset: (unit + 1) * 65_536,
          lastProcessedParentKey: key, transitionsDelta: 1, boundPrunesDelta: 0, nextRun: run,
        }), manifestCandidate(run, descriptor), manifestTotals(8));
        testing.commitManifestTransition(state, plan);
        tip = plan.tip;
      }
    } finally {
      delete nextRunsIdentity[Symbol.iterator];
      delete activeIdsIdentity[Symbol.iterator];
    }
    expect(state.nextRuns).toBe(nextRunsIdentity);
    expect(state.activeIds).toBe(activeIdsIdentity);
    expect(state.nextRuns).toHaveLength(4_096);
    expect(state.activeIds.size).toBe(4_097);
    expect(state.parentOffset).toBe(wideSize);
    expect(state.lastProcessedParentKey).toBe('K4095');
  }, 30_000);

  it('admits final-decision unit 4,096 and rejects unit 4,097 before candidate or state changes', () => {
    const state = testing.createManifestState();
    const seedRun = Object.freeze({ token: 'final-unit-boundary-seed' });
    const seedDescriptor = manifestDescriptor('r7-f-d00000-g00000', 1, 'ROOT', 'ROOT');
    const seed = testing.planManifestTransition(state, Object.freeze({
      transition: 'seed', previousTip: null, binding: manifestBinding(2), frontier: seedRun,
    }), manifestCandidate(seedRun, seedDescriptor), manifestTotals(8));
    testing.commitManifestTransition(state, seed);

    const parentUnitKeys = RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS.parentUnitKeys;
    const maximumUnits = RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS.maximumUnits;
    const wideDescriptor = manifestDescriptor(
      'r7-f-d00000-g00000', parentUnitKeys * (maximumUnits + 1), 'K0000', 'K4096',
    );
    state.frontierDescriptor = wideDescriptor;
    state.activeRunBytes = wideDescriptor.dataBytes;
    state.parentOffset = parentUnitKeys * (maximumUnits - 1);
    state.lastProcessedParentKey = 'K4094';

    const allowed = testing.planManifestTransition(state, Object.freeze({
      transition: 'unit', previousTip: seed.tip, parentOffset: parentUnitKeys * maximumUnits,
      lastProcessedParentKey: 'K4095', transitionsDelta: 1, boundPrunesDelta: 0, nextRun: null,
    }), null, manifestTotals(wideDescriptor.dataBytes));
    expect(allowed.manifest.runChanges.add).toEqual([]);
    testing.commitManifestTransition(state, allowed);
    expect(state.parentOffset).toBe(parentUnitKeys * maximumUnits);

    const beforeRejected = manifestStateBytes(testing, state);
    const untouchedCandidate = Object.freeze({ token: 'must-not-be-consumed' });
    expect(() => testing.planManifestTransition(state, Object.freeze({
      transition: 'unit', previousTip: allowed.tip, parentOffset: parentUnitKeys * (maximumUnits + 1),
      lastProcessedParentKey: 'K4096', transitionsDelta: 1, boundPrunesDelta: 0, nextRun: null,
    }), untouchedCandidate, manifestTotals(wideDescriptor.dataBytes))).toThrow('unit ordinal exceeds 4095');
    expect(manifestStateBytes(testing, state)).toBe(beforeRejected);
    expect(untouchedCandidate).toEqual({ token: 'must-not-be-consumed' });
  });

  it('rejects every predictable unit-append collection hazard before consume and reuses the same plan after repair', () => {
    const hazards = [
      ['frozen', () => Object.freeze([]), 'must remain extensible'],
      ['nonextensible', () => Object.preventExtensions([]), 'must remain extensible'],
      ['readonly-length', () => {
        const array = [];
        Object.defineProperty(array, 'length', { writable: false });
        return array;
      }, 'length must remain a writable native array length'],
    ];
    for (const [label, unsafeArray, message] of hazards) {
      const { state, plan } = coveredUnitAppendPlan(testing, label);
      const original = state.nextRuns;
      const before = manifestStateBytes(testing, state);
      state.nextRuns = unsafeArray();
      expect(() => testing.commitManifestTransition(state, plan)).toThrow(message);
      state.nextRuns = original;
      expect(manifestStateBytes(testing, state)).toBe(before);
      testing.commitManifestTransition(state, plan);
      expect(state.generation).toBe(1);
    }

    const blocked = coveredUnitAppendPlan(testing, 'blocked-index');
    const blockedBefore = manifestStateBytes(testing, blocked.state);
    const prospectiveIndex = '0';
    const priorDescriptor = Object.getOwnPropertyDescriptor(Array.prototype, prospectiveIndex);
    let blockedError = null;
    try {
      Object.defineProperty(Array.prototype, prospectiveIndex, {
        value: null, writable: true, enumerable: false, configurable: true,
      });
      try { testing.commitManifestTransition(blocked.state, blocked.plan); }
      catch (error) { blockedError = error; }
    } finally {
      if (priorDescriptor) Object.defineProperty(Array.prototype, prospectiveIndex, priorDescriptor);
      else delete Array.prototype[prospectiveIndex];
    }
    expect(blockedError?.message).toContain('prospective index 0 is blocked');
    expect(manifestStateBytes(testing, blocked.state)).toBe(blockedBefore);
    testing.commitManifestTransition(blocked.state, blocked.plan);
    expect(blocked.state.generation).toBe(1);
  });

  it('rechecks the native active-run Set and duplicate id before consuming a unit plan', () => {
    const duplicate = coveredUnitAppendPlan(testing, 'duplicate-active-id');
    const beforeDuplicate = manifestStateBytes(testing, duplicate.state);
    duplicate.state.activeIds.add(duplicate.unitDescriptor.id);
    expect(() => testing.commitManifestTransition(duplicate.state, duplicate.plan))
      .toThrow('duplicate committed active run id');
    duplicate.state.activeIds.delete(duplicate.unitDescriptor.id);
    expect(manifestStateBytes(testing, duplicate.state)).toBe(beforeDuplicate);
    testing.commitManifestTransition(duplicate.state, duplicate.plan);
    expect(duplicate.state.activeIds.has(duplicate.unitDescriptor.id)).toBe(true);

    const native = coveredUnitAppendPlan(testing, 'native-active-set');
    const original = native.state.activeIds;
    native.state.activeIds = new Proxy(original, {});
    expect(() => testing.commitManifestTransition(native.state, native.plan)).toThrow('collections are invalid');
    native.state.activeIds = original;
    testing.commitManifestTransition(native.state, native.plan);
    expect(native.state.generation).toBe(1);
  });

  it('uses the load-time isProxy intrinsic before consuming a unit plan', () => {
    const { state, plan } = coveredUnitAppendPlan(testing, 'cached-is-proxy');
    const originalNextRuns = state.nextRuns;
    const originalIsProxy = nativeTypes.isProxy;
    const beforeTip = state.tip;
    let trapCalls = 0;
    const hostileNextRuns = new Proxy(originalNextRuns, {
      set() {
        trapCalls += 1;
        throw new Error('hostile nextRuns append trap');
      },
    });
    let commitError = null;
    try {
      nativeTypes.isProxy = () => false;
      state.nextRuns = hostileNextRuns;
      try { testing.commitManifestTransition(state, plan); }
      catch (error) { commitError = error; }
    } finally {
      state.nextRuns = originalNextRuns;
      nativeTypes.isProxy = originalIsProxy;
    }
    expect(commitError?.message).toContain('manifest state collections are invalid');
    expect(trapCalls).toBe(0);
    expect(state.tip).toBe(beforeTip);
    expect(state.generation).toBe(0);
    testing.commitManifestTransition(state, plan);
    expect(state.generation).toBe(1);
  });

  it.each(['layer', 'complete'])('atomically replaces frozen nonempty collections for %s commit', (transition) => {
    const { state, plan } = coveredManifestPlan(testing, transition, `frozen-${transition}`);
    expect(state.nextRuns).toHaveLength(1);
    const oldNextRuns = state.nextRuns;
    const oldCompletedDepths = state.completedDepths;
    const oldActiveIds = state.activeIds;
    const oldCompletedTotals = state.completedTotals;
    Object.freeze(oldNextRuns);
    Object.freeze(oldCompletedDepths);
    Object.freeze(oldActiveIds);
    Object.freeze(oldCompletedTotals);
    testing.commitManifestTransition(state, plan);
    expect(state.nextRuns).not.toBe(oldNextRuns);
    expect(state.nextRuns).toEqual([]);
    expect(state.completedDepths).not.toBe(oldCompletedDepths);
    expect(state.completedDepths).toHaveLength(1);
    expect(state.activeIds).not.toBe(oldActiveIds);
    expect(state.completedTotals).not.toBe(oldCompletedTotals);
    expect(oldNextRuns).toHaveLength(1);
    expect(oldCompletedDepths).toEqual([]);
  });

  it.each([
    ['layer', 'nextRuns'],
    ['complete', 'completedDepths'],
  ])('rejects nonwritable state before %s commit without partial pollution', (transition, key) => {
    const { state, plan } = coveredManifestPlan(testing, transition, `readonly-${transition}`);
    const originalDescriptor = Object.getOwnPropertyDescriptor(state, key);
    Object.defineProperty(state, key, { ...originalDescriptor, writable: false });
    const before = manifestStateBytes(testing, state);
    expect(() => testing.commitManifestTransition(state, plan)).toThrow('must remain a writable data property');
    expect(manifestStateBytes(testing, state)).toBe(before);
    Object.defineProperty(state, key, { ...originalDescriptor, writable: true });
    testing.commitManifestTransition(state, plan);
    expect(state.generation).toBe(2);
  });

  it('keeps zero-decision depthless and appends exactly one early-empty completed depth', () => {
    const state = testing.createManifestState();
    const binding = manifestBinding(1);
    const frontier = Object.freeze({ token: 'zero-seed' });
    const descriptor = manifestDescriptor('r7-f-d00000-g00000', 1, 'ROOT', 'ROOT');
    const seed = testing.planManifestTransition(state, Object.freeze({
      transition: 'seed', previousTip: null, binding, frontier,
    }), manifestCandidate(frontier, descriptor), manifestTotals(8));
    testing.commitManifestTransition(state, seed);
    expect(() => testing.planManifestTransition(state, Object.freeze({
      transition: 'complete', previousTip: seed.tip, completedDepth: null, reason: 'final-depth',
    }), null, manifestTotals(0))).toThrow('fully covered completed depth');
    const complete = testing.planManifestTransition(state, Object.freeze({
      transition: 'complete', previousTip: seed.tip, completedDepth: null, reason: 'zero-decision-depth',
    }), null, manifestTotals(0));
    expect(complete.projection).toEqual(expect.objectContaining({
      kind: 'complete', completedDepthCount: 0, reason: 'zero-decision-depth',
    }));
    expect(complete.manifest.stateDelta.completedDepth).toBeNull();

    const earlyState = testing.createManifestState();
    const earlyBinding = manifestBinding(3);
    const earlyFrontier = Object.freeze({ token: 'early-seed' });
    const earlySeed = testing.planManifestTransition(earlyState, Object.freeze({
      transition: 'seed', previousTip: null, binding: earlyBinding, frontier: earlyFrontier,
    }), manifestCandidate(earlyFrontier, descriptor), manifestTotals(8));
    testing.commitManifestTransition(earlyState, earlySeed);
    const unitRun = Object.freeze({ token: 'early-unit' });
    const unitDescriptor = manifestDescriptor('r7-u-d00000-n00000000-g00001', 0, null, null);
    const unit = testing.planManifestTransition(earlyState, Object.freeze({
      transition: 'unit', previousTip: earlySeed.tip, parentOffset: 1, lastProcessedParentKey: 'ROOT',
      transitionsDelta: 3, boundPrunesDelta: 1, nextRun: unitRun,
    }), manifestCandidate(unitRun, unitDescriptor), manifestTotals(8));
    testing.commitManifestTransition(earlyState, unit);
    const completedDepth = Object.freeze({ lockedPieces: 0, frontierStates: 1, transitions: 3, boundPrunes: 1 });
    const earlyComplete = testing.planManifestTransition(earlyState, Object.freeze({
      transition: 'complete', previousTip: unit.tip, completedDepth, reason: 'empty-frontier',
    }), null, manifestTotals(0));
    expect(earlyComplete.projection).toEqual(expect.objectContaining({
      kind: 'complete', completedDepthCount: 1, reason: 'empty-frontier',
    }));
    expect(earlyComplete.manifest.runChanges.removeSetSha256)
      .toBe(testing.runSetHash([descriptor, unitDescriptor]));
  });

  it('accepts multiple accumulated empty runs for early-empty and rejects any nonempty member', () => {
    const coveredDepthOne = (sizes) => {
      const state = testing.createManifestState();
      const binding = manifestBinding(4);
      const seedRun = Object.freeze({ token: `multi-seed-${sizes.join('-')}` });
      const seedDescriptor = manifestDescriptor('r7-f-d00000-g00000', 1, 'ROOT', 'ROOT');
      const seed = testing.planManifestTransition(state, Object.freeze({
        transition: 'seed', previousTip: null, binding, frontier: seedRun,
      }), manifestCandidate(seedRun, seedDescriptor), manifestTotals(8));
      testing.commitManifestTransition(state, seed);

      const firstRun = Object.freeze({ token: 'depth-0-output' });
      const firstDescriptor = manifestDescriptor('r7-u-d00000-n00000000-g00001', 1, 'NEXT', 'NEXT');
      const firstUnit = testing.planManifestTransition(state, Object.freeze({
        transition: 'unit', previousTip: seed.tip, parentOffset: 1, lastProcessedParentKey: 'ROOT',
        transitionsDelta: 1, boundPrunesDelta: 0, nextRun: firstRun,
      }), manifestCandidate(firstRun, firstDescriptor), manifestTotals(16));
      testing.commitManifestTransition(state, firstUnit);

      const wideRun = Object.freeze({ token: 'wide-frontier' });
      const wideDescriptor = manifestDescriptor('r7-f-d00001-g00002', 65_537, 'A', 'Z', 200_000);
      const layer = testing.planManifestTransition(state, Object.freeze({
        transition: 'layer', previousTip: firstUnit.tip,
        completedDepth: Object.freeze({ lockedPieces: 0, frontierStates: 1, transitions: 1, boundPrunes: 0 }),
        nextFrontier: wideRun,
      }), manifestCandidate(wideRun, wideDescriptor), manifestTotals(200_000));
      testing.commitManifestTransition(state, layer);

      let tip = layer.tip;
      let latestBytes = wideDescriptor.dataBytes;
      const descriptors = [];
      for (const [index, size] of sizes.entries()) {
        const run = Object.freeze({ token: `wide-unit-${index}` });
        const descriptor = manifestDescriptor(
          `r7-u-d00001-n${String(index).padStart(8, '0')}-g${String(3 + index).padStart(5, '0')}`,
          size,
          size === 0 ? null : `N${index}`,
          size === 0 ? null : `N${index}`,
        );
        latestBytes += descriptor.dataBytes;
        const unit = testing.planManifestTransition(state, Object.freeze({
          transition: 'unit', previousTip: tip,
          parentOffset: index === 0 ? 65_536 : 65_537,
          lastProcessedParentKey: index === 0 ? 'Y' : 'Z',
          transitionsDelta: 1, boundPrunesDelta: 0, nextRun: run,
        }), manifestCandidate(run, descriptor), manifestTotals(latestBytes));
        testing.commitManifestTransition(state, unit);
        tip = unit.tip;
        descriptors.push(descriptor);
      }
      return { state, tip, descriptors, completedDepth: Object.freeze({
        lockedPieces: 1, frontierStates: 65_537, transitions: 2, boundPrunes: 0,
      }) };
    };

    const allEmpty = coveredDepthOne([0, 0]);
    const accepted = testing.planManifestTransition(allEmpty.state, Object.freeze({
      transition: 'complete', previousTip: allEmpty.tip,
      completedDepth: allEmpty.completedDepth, reason: 'empty-frontier',
    }), null, manifestTotals(0));
    expect(accepted.removedDescriptors.filter(({ size }) => size === 0)).toHaveLength(2);

    const oneNonempty = coveredDepthOne([0, 1]);
    expect(() => testing.planManifestTransition(oneNonempty.state, Object.freeze({
      transition: 'complete', previousTip: oneNonempty.tip,
      completedDepth: oneNonempty.completedDepth, reason: 'empty-frontier',
    }), null, manifestTotals(0))).toThrow('every accumulated next run to be empty');
  });

  it('computes all formula-reachable index cap vectors without materializing records', () => {
    expect(testing.indexLayout(0)).toEqual({ entryCount: 1, indexBytes: 32 });
    expect(testing.indexLayout(536_477_697)).toEqual({ entryCount: 8_188, indexBytes: 65_528 });
    expect(testing.indexLayout(536_543_233)).toEqual({ entryCount: 8_189, indexBytes: 65_536 });
    expect(testing.indexLayout(536_608_769)).toEqual({ entryCount: 8_190, indexBytes: 65_544 });
  });

  it('round-trips the exact binary index and maps aligned and final-short ranges', () => {
    const size = 65_537;
    const encoded = testing.encodeIndex(size, [0, 8, 13]);
    expect(encoded.subarray(0, 8).toString('ascii')).toBe('T37R7I1\n');
    expect(encoded.length).toBe(48);
    const decoded = testing.decodeIndex(encoded);
    expect(decoded).toEqual({ size, offsets: [0, 8, 13] });
    expect(testing.rangeByteOffsets(decoded, { startOrdinal: 0, endOrdinal: 65_536 }))
      .toEqual({ startOffset: 0, endOffset: 8 });
    expect(testing.rangeByteOffsets(decoded, { startOrdinal: 65_536, endOrdinal: 65_537 }))
      .toEqual({ startOffset: 8, endOffset: 13 });
    expect(testing.rangeByteOffsets(decoded, { startOrdinal: 65_537, endOrdinal: 65_537 }))
      .toEqual({ startOffset: 13, endOffset: 13 });
    expect(() => testing.validateRange(size, { startOrdinal: 1, endOrdinal: 65_536 }))
      .toThrow('align');
    expect(() => testing.decodeIndex(Buffer.concat([encoded, Buffer.from([0])]))).toThrow('inconsistent');
  });

  it('rejects duplicate/noncanonical raw JSON and binds the terminal offset to dataBytes', () => {
    expect(() => testing.parseCanonicalLfBytes(Buffer.from('{"a":1,"a":2}\n'))).toThrow('duplicate key');
    expect(() => testing.parseCanonicalLfBytes(Buffer.from('{"b":2,"a":1}\n'))).toThrow('not canonical');
    expect(testing.parseCanonicalLfBytes(Buffer.from('{"a":1,"b":2}\n'))).toEqual({ a: 1, b: 2 });
    const index = testing.decodeIndex(testing.encodeIndex(1, [0, 4]));
    expect(testing.bindIndexToDataBytes(index, 4)).toBe(index);
    expect(() => testing.bindIndexToDataBytes(index, 3)).toThrow('terminal offset');
  });

  it('publishes owner by no-replace link and resumes it without any write authority', () => {
    const { parent, stage } = temporaryStage('r7-owner');
    const events = [];
    const seam = {
      writeSync(...args) { events.push('write'); return fs.writeSync(...args); },
      fsyncSync(...args) { events.push('fsync'); return fs.fsyncSync(...args); },
      linkSync(...args) { events.push('link'); return fs.linkSync(...args); },
      unlinkSync(...args) { events.push('unlink'); return fs.unlinkSync(...args); },
    };
    const created = createResumableEndgameDiskFrontierStore({ stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: seam });
    expect(fs.readdirSync(stage)).toEqual(['owner.json']);
    expect(created.loadCheckpoint()).toEqual(expect.objectContaining({ checkpoint: null, tip: null, advanceAllowed: true }));
    created.suspend();
    expect(events).toEqual(expect.arrayContaining(['write', 'fsync', 'link', 'unlink']));
    events.length = 0;
    const resumed = createResumableEndgameDiskFrontierStore({ stagePath: stage, mode: 'resume', ownerId: 'owner-A', expectedTip: null, fs: seam });
    expect(resumed.loadCheckpoint().advanceAllowed).toBe(true);
    resumed.suspend();
    expect(events).toEqual([]);
    resumed.dispose();
    releaseParent(parent, stage);
  });

  it('classifies exact pre-owner residue and gives nonnull expectedTip rollback precedence', () => {
    const first = temporaryStage('r7-empty');
    fs.mkdirSync(first.stage);
    const blocked = createResumableEndgameDiskFrontierStore({ stagePath: first.stage, mode: 'resume', ownerId: 'owner-A', expectedTip: null });
    expect(blocked.loadCheckpoint()).toEqual(expect.objectContaining({ checkpoint: null, tip: null, advanceAllowed: false }));
    blocked.dispose();
    releaseParent(first.parent, first.stage);

    const second = temporaryStage('r7-rollback');
    fs.mkdirSync(second.stage);
    expect(() => createResumableEndgameDiskFrontierStore({
      stagePath: second.stage, mode: 'resume', ownerId: 'owner-A',
      expectedTip: { generation: 0, manifestSha256: 'A'.repeat(64) },
    })).toThrow('authenticated rollback');
    fs.rmdirSync(second.stage);
    releaseParent(second.parent, second.stage);
  });

  it('rejects owner alias capacity before opening the part', () => {
    const { parent, stage } = temporaryStage('r7-owner-cap');
    const unnormalized = `${parent}${path.sep}.${path.sep}frontier-stage`;
    expect(() => createResumableEndgameDiskFrontierStore({ stagePath: unnormalized, mode: 'create', ownerId: 'owner-A' })).toThrow('already be normalized');
    expect(fs.existsSync(stage)).toBe(false);
    let opened = 0;
    expect(() => createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', limits: { maximumNamespaceEntries: 1 },
      fs: { openSync(...args) { opened += 1; return fs.openSync(...args); } },
    })).toThrow('two-alias admission');
    expect(opened).toBe(0);
    fs.rmdirSync(stage);
    releaseParent(parent, stage);
  });

  it('writes, verifies, ranges, and identity-disposes one ordered working run', () => {
    const { parent, stage } = temporaryStage('r7-working');
    const store = createResumableEndgameDiskFrontierStore({ stagePath: stage, mode: 'create', ownerId: 'owner-A' });
    expect(() => store.createRun('r7w-u-g00000-d00000-n00004096-p0000-h0000')).toThrow('token range');
    const writer = store.createRun('r7w-u-g00000-d00000-n00000000-p0000-h0000');
    writer.write('A');
    writer.write('B');
    expect(() => writer.write('B')).toThrow('strictly increasing');
    const run = writer.finish();
    expect(run.size).toBe(2);
    expect([...run.values()]).toEqual(['A', 'B']);
    expect([...run.values({ startOrdinal: 2, endOrdinal: 2 })]).toEqual([]);
    expect(fs.readFileSync(path.join(stage, `${run.id}.run.part`), 'ascii')).toBe('A\nB\n');
    run.dispose();
    expect(store.diagnostics().activeRuns).toEqual([]);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('admits working/physical bytes before each write and suspend closes an active writer', () => {
    const { parent, stage } = temporaryStage('r7-working-cap');
    const events = [];
    const tracked = trackedFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
      limits: { uncommittedWorkingRunBytes: 2 },
    });
    const writer = store.createRun('r7w-l-g00000-d00000-p0000-h0000');
    expect(tracked.snapshot().openHandles).toBe(1);
    writer.write('A');
    const writesAfterEquality = tracked.snapshot().writeLengths.length;
    expect(() => writer.write('B')).toThrow('working run bytes');
    expect(tracked.snapshot().writeLengths).toHaveLength(writesAfterEquality);
    const suspended = store.suspend();
    expect(suspended.closeFailed).toBe(false);
    expect(suspended.diagnostics.activeRuns).toEqual([]);
    expect(tracked.snapshot().openHandles).toBe(0);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('records run cleanup failure without misreporting a successful handle close', () => {
    const { parent, stage } = temporaryStage('r7-suspend-unlink');
    let failRunUnlink = false;
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A',
      fs: { unlinkSync(filePath) {
        if (failRunUnlink && String(filePath).endsWith('.run.part')) {
          failRunUnlink = false;
          const error = new Error('injected run unlink cleanup fault');
          error.code = 'EIO';
          throw error;
        }
        return fs.unlinkSync(filePath);
      } },
    });
    store.createRun('r7w-l-g00000-d00000-p0000-h0000').write('A');
    failRunUnlink = true;
    const suspended = store.suspend();
    expect(suspended.closeFailed).toBe(false);
    expect(suspended.diagnostics.cleanupErrors.join('\n')).toContain('unlink cleanup fault');
    store.dispose();
    releaseParent(parent, stage);
  });

  it('rejects a closed run part replaced between open ownership and finish readback', () => {
    const { parent, stage } = temporaryStage('r7-working-swap');
    const opened = new Map();
    let replaceOnClose = false;
    const seam = {
      openSync(...args) { const descriptor = fs.openSync(...args); opened.set(descriptor, String(args[0])); return descriptor; },
      closeSync(descriptor) {
        const filePath = opened.get(descriptor);
        opened.delete(descriptor);
        const result = fs.closeSync(descriptor);
        if (replaceOnClose && filePath?.endsWith('.run.part')) {
          replaceOnClose = false;
          const bytes = fs.readFileSync(filePath);
          fs.renameSync(filePath, `${filePath}.swapped`);
          fs.writeFileSync(filePath, bytes);
        }
        return result;
      },
    };
    const store = createResumableEndgameDiskFrontierStore({ stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: seam });
    const writer = store.createRun('r7w-l-g00000-d00000-p0000-h0000');
    writer.write('A');
    replaceOnClose = true;
    expect(() => writer.finish()).toThrow('readback drift');
    for (const name of fs.readdirSync(stage)) fs.unlinkSync(path.join(stage, name));
    fs.rmdirSync(stage);
    releaseParent(parent, stage);
  });

  it('freezes reachable index and coupled namespace admissions at exact boundaries', () => {
    const inventory = { namespaceEntries: 1, ownerAndIndexBytes: 0, retainedManifestBytes: 0 };
    const limits = RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS;
    expect(testing.admitCandidateIndex(536_477_697, inventory, limits, 49_148).indexBytes).toBe(65_528);
    expect(testing.admitCandidateIndex(536_543_233, inventory, limits, 49_148).indexBytes).toBe(65_536);
    expect(() => testing.admitCandidateIndex(536_608_769, inventory, limits, 49_148)).toThrow('individual byte limit');
    expect(() => testing.admitNamespacePeak(49_148, 4, 49_152)).not.toThrow();
    expect(() => testing.admitNamespacePeak(49_149, 4, 49_152)).toThrow('49153');

    const { parent, stage } = temporaryStage('r7-generation-names');
    const events = [];
    const tracked = trackedResumableFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
      limits: { maximumNamespaceEntries: 4 },
    });
    events.length = 0;
    expect(() => store.createRun('r7-f-d00000-g00000')).toThrow('namespace peak');
    expect(events.some((event) => event.includes('.run.part'))).toBe(false);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('rejects a structurally valid index whose intermediate offset differs from admitted bytes', () => {
    const admitted = testing.encodeIndex(65_537, [0, 2, 4]);
    const mutated = testing.encodeIndex(65_537, [0, 3, 4]);
    expect(testing.bindIndexToDataBytes(testing.decodeIndex(mutated), 4).size).toBe(65_537);
    expect(() => testing.assertExactPublishedIndexBytes(mutated, admitted)).toThrow('differ from the admitted candidate');
  });

  it('leaves an unauthenticated run part untouched and latches advancement after initial fstat failure', () => {
    const { parent, stage } = temporaryStage('r7-bootstrap-fstat');
    const descriptors = new Map();
    let failRunFstat = false;
    let runOpenCalls = 0;
    const seam = {
      openSync(...args) {
        if (String(args[0]).endsWith('.run.part')) runOpenCalls += 1;
        const descriptor = fs.openSync(...args);
        descriptors.set(descriptor, String(args[0]));
        return descriptor;
      },
      fstatSync(descriptor, ...args) {
        if (failRunFstat && descriptors.get(descriptor)?.endsWith('.run.part')) {
          failRunFstat = false;
          throw new Error('injected initial run fstat fault');
        }
        return fs.fstatSync(descriptor, ...args);
      },
      closeSync(descriptor) { const result = fs.closeSync(descriptor); descriptors.delete(descriptor); return result; },
    };
    const store = createResumableEndgameDiskFrontierStore({ stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: seam });
    failRunFstat = true;
    expect(() => store.createRun('r7-f-d00000-g00000')).toThrow('initial run fstat fault');
    expect(descriptors.size).toBe(0);
    const residuePath = path.join(stage, 'r7-f-d00000-g00000.run.part');
    const before = fs.lstatSync(residuePath, { bigint: true });
    expect(fs.readFileSync(residuePath)).toEqual(Buffer.alloc(0));
    expect(store.loadCheckpoint()).toEqual(expect.objectContaining({ advanceAllowed: false }));
    const opensBeforeBlockedRetry = runOpenCalls;
    expect(() => store.createRun('r7-f-d00000-g00000')).toThrow('precommit-owned-residue');
    expect(runOpenCalls).toBe(opensBeforeBlockedRetry);
    expect(store.suspend().diagnostics.cleanupErrors.join('\n')).toContain('initial run fstat fault');
    const after = fs.lstatSync(residuePath, { bigint: true });
    expect([String(after.dev), String(after.ino), after.size]).toEqual([String(before.dev), String(before.ino), before.size]);
    fs.unlinkSync(residuePath);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('never unlinks foreign run/index parts that failed exclusive ownership admission', () => {
    const runCase = temporaryStage('r7-foreign-run-part');
    const runUnlinks = [];
    const runStore = createResumableEndgameDiskFrontierStore({
      stagePath: runCase.stage, mode: 'create', ownerId: 'owner-A',
      fs: { unlinkSync(filePath) { runUnlinks.push(String(filePath)); return fs.unlinkSync(filePath); } },
    });
    const foreignRun = path.join(runCase.stage, 'r7-f-d00000-g00000.run.part');
    const foreignRunBytes = Buffer.from('FOREIGN-RUN\n', 'ascii');
    fs.writeFileSync(foreignRun, foreignRunBytes);
    const foreignRunIdentity = fs.lstatSync(foreignRun, { bigint: true });
    expect(() => runStore.createRun('r7-f-d00000-g00000')).toThrow(/EEXIST|exist/u);
    runStore.suspend();
    const preservedRunIdentity = fs.lstatSync(foreignRun, { bigint: true });
    expect(fs.readFileSync(foreignRun)).toEqual(foreignRunBytes);
    expect([String(preservedRunIdentity.dev), String(preservedRunIdentity.ino)])
      .toEqual([String(foreignRunIdentity.dev), String(foreignRunIdentity.ino)]);
    expect(runUnlinks).not.toContain(foreignRun);
    fs.unlinkSync(foreignRun);
    runStore.dispose();
    releaseParent(runCase.parent, runCase.stage);

    const indexCase = temporaryStage('r7-foreign-index-part');
    const indexUnlinks = [];
    const indexStore = createResumableEndgameDiskFrontierStore({
      stagePath: indexCase.stage, mode: 'create', ownerId: 'owner-A',
      fs: { unlinkSync(filePath) { indexUnlinks.push(String(filePath)); return fs.unlinkSync(filePath); } },
    });
    const indexWriter = indexStore.createRun('r7-f-d00000-g00000');
    indexWriter.write('A');
    const foreignIndex = path.join(indexCase.stage, 'r7-f-d00000-g00000.idx.part');
    const foreignIndexBytes = Buffer.from('FOREIGN-INDEX', 'ascii');
    fs.writeFileSync(foreignIndex, foreignIndexBytes);
    const foreignIndexIdentity = fs.lstatSync(foreignIndex, { bigint: true });
    expect(() => indexWriter.finish()).toThrow(/EEXIST|exist/u);
    expect(indexStore.loadCheckpoint().advanceAllowed).toBe(false);
    indexStore.suspend();
    const preservedIndexIdentity = fs.lstatSync(foreignIndex, { bigint: true });
    expect(fs.readFileSync(foreignIndex)).toEqual(foreignIndexBytes);
    expect([String(preservedIndexIdentity.dev), String(preservedIndexIdentity.ino)])
      .toEqual([String(foreignIndexIdentity.dev), String(foreignIndexIdentity.ino)]);
    expect(indexUnlinks).not.toContain(foreignIndex);
    fs.unlinkSync(foreignIndex);
    indexStore.dispose();
    releaseParent(indexCase.parent, indexCase.stage);
  });

  it('physically admits exact upper index vectors and rejects 65544 bytes before index open', () => {
    for (const [logicalSize, expectedBytes, admitted] of [
      [536_477_697, 65_528, true],
      [536_543_233, 65_536, true],
      [536_608_769, 65_544, false],
    ]) {
      const { parent, stage } = temporaryStage(`r7-index-probe-${expectedBytes}`);
      const opened = [];
      const store = createResumableEndgameDiskFrontierStore({
        stagePath: stage, mode: 'create', ownerId: 'owner-A',
        fs: { openSync(filePath, ...args) { opened.push(path.basename(String(filePath))); return fs.openSync(filePath, ...args); } },
      });
      const writer = store.createRun('r7-f-d00000-g00000');
      if (admitted) {
        expect(testing.probeOwnedCandidateIndex(writer, logicalSize)).toEqual({
          entryCount: (expectedBytes - 24) / 8,
          indexBytes: expectedBytes,
        });
        expect(fs.lstatSync(path.join(stage, 'r7-f-d00000-g00000.idx.part')).size).toBe(expectedBytes);
      } else {
        const indexOpensBefore = opened.filter((name) => name.endsWith('.idx.part')).length;
        expect(() => testing.probeOwnedCandidateIndex(writer, logicalSize)).toThrow('individual byte limit');
        expect(opened.filter((name) => name.endsWith('.idx.part'))).toHaveLength(indexOpensBefore);
      }
      if (admitted) writer.abort();
      expect(fs.readdirSync(stage)).toEqual(['owner.json']);
      store.dispose();
      releaseParent(parent, stage);
    }
  });

  it('aggregates failed admission cleanup, rejects later writes before I/O, and lets suspend retry', () => {
    const { parent, stage } = temporaryStage('r7-probe-abort-latch');
    let failRunPartUnlink = false;
    let openCalls = 0;
    let writeCalls = 0;
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A',
      fs: {
        openSync(...args) { openCalls += 1; return fs.openSync(...args); },
        writeSync(...args) { writeCalls += 1; return fs.writeSync(...args); },
        unlinkSync(filePath) {
          if (failRunPartUnlink && String(filePath).endsWith('.run.part')) {
            failRunPartUnlink = false;
            const error = new Error('injected owned run cleanup fault');
            error.code = 'EIO';
            throw error;
          }
          return fs.unlinkSync(filePath);
        },
      },
    });
    const writer = store.createRun('r7-f-d00000-g00000');
    failRunPartUnlink = true;
    let failure;
    try { testing.probeOwnedCandidateIndex(writer, 536_608_769); } catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(AggregateError);
    expect(failure.errors.map((error) => error.message).join('\n')).toContain('individual byte limit');
    expect(failure.errors.map((error) => error.message).join('\n')).toContain('owned run cleanup fault');
    expect(store.loadCheckpoint()).toEqual(expect.objectContaining({ advanceAllowed: false }));
    const beforeRejectedWrites = { openCalls, writeCalls };
    expect(() => writer.write('A')).toThrow('precommit-owned-residue');
    expect(() => store.createRun('r7-f-d00000-g00001')).toThrow('precommit-owned-residue');
    expect({ openCalls, writeCalls }).toEqual(beforeRejectedWrites);
    expect(fs.readdirSync(stage)).toEqual(['owner.json', 'r7-f-d00000-g00000.run.part']);
    const suspended = store.suspend();
    expect(suspended.diagnostics.cleanupErrors.join('\n')).toContain('owned run cleanup fault');
    expect(fs.readdirSync(stage)).toEqual(['owner.json']);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('publishes a candidate run/index pair in the sole alias-contraction order and closes a half-read iterator', () => {
    const { parent, stage } = temporaryStage('r7-candidate');
    const events = [];
    const tracked = trackedResumableFs(events);
    const store = createResumableEndgameDiskFrontierStore({ stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam });
    events.length = 0;
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    writer.write('B');
    const run = writer.finish();
    expect(fs.readdirSync(stage).sort()).toEqual(['owner.json', `${run.id}.idx`, `${run.id}.run`].sort());
    const runLink = events.indexOf(`link:${run.id}.run.part>${run.id}.run`);
    const runContract = events.indexOf(`unlink:${run.id}.run.part`);
    const indexOpen = events.indexOf(`open:${run.id}.idx.part`);
    const indexLink = events.indexOf(`link:${run.id}.idx.part>${run.id}.idx`);
    const indexContract = events.indexOf(`unlink:${run.id}.idx.part`);
    expect([runLink < runContract, runContract < indexOpen, indexOpen < indexLink, indexLink < indexContract]).toEqual([true, true, true, true]);
    events.length = 0;
    const iterator = run.values();
    expect(iterator.next()).toEqual({ value: 'A', done: false });
    expect(events.find((event) => event.startsWith(`read:${run.id}.run:`))).toBe(`read:${run.id}.run:0`);
    expect(store.suspend().closeFailed).toBe(false);
    expect(iterator.next().done).toBe(true);
    expect(fs.readdirSync(stage)).toEqual(['owner.json']);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('rejects a same-byte replacement index after contraction and never deletes its foreign inode', () => {
    const { parent, stage } = temporaryStage('r7-index-replacement');
    let replaceOnIndexContraction = true;
    let linkedIdentity = null;
    let replacementIdentity = null;
    let replacementBytes = null;
    const indexPartPath = path.join(stage, 'r7-f-d00000-g00000.idx.part');
    const indexFinalPath = path.join(stage, 'r7-f-d00000-g00000.idx');
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A',
      fs: {
        unlinkSync(filePath) {
          if (replaceOnIndexContraction && String(filePath) === indexPartPath) {
            replaceOnIndexContraction = false;
            replacementBytes = fs.readFileSync(indexFinalPath);
            linkedIdentity = fs.lstatSync(indexFinalPath, { bigint: true });
            const prepared = `${indexFinalPath}.replacement`;
            fs.writeFileSync(prepared, replacementBytes);
            fs.unlinkSync(filePath);
            fs.unlinkSync(indexFinalPath);
            fs.renameSync(prepared, indexFinalPath);
            replacementIdentity = fs.lstatSync(indexFinalPath, { bigint: true });
            return;
          }
          return fs.unlinkSync(filePath);
        },
      },
    });
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    expect(() => writer.finish()).toThrow('index final identity drift after alias contraction');
    expect([String(replacementIdentity.dev), String(replacementIdentity.ino)])
      .not.toEqual([String(linkedIdentity.dev), String(linkedIdentity.ino)]);
    expect(store.loadCheckpoint().advanceAllowed).toBe(false);
    store.suspend();
    const afterSuspend = fs.lstatSync(indexFinalPath, { bigint: true });
    expect([String(afterSuspend.dev), String(afterSuspend.ino)])
      .toEqual([String(replacementIdentity.dev), String(replacementIdentity.ino)]);
    expect(fs.readFileSync(indexFinalPath)).toEqual(replacementBytes);
    fs.unlinkSync(indexFinalPath);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('rejects index admission before run-final or index paths are opened', () => {
    const { parent, stage } = temporaryStage('r7-index-gate');
    const events = [];
    const tracked = trackedResumableFs(events);
    const ownerBytes = Buffer.byteLength(`${testing.canonicalJson({ schema: 't37-f4e-r7-owner-v1', ownerId: 'owner-A' })}\n`);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
      limits: { ownerAndIndexBytes: ownerBytes * 2 },
    });
    events.length = 0;
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    expect(() => writer.finish()).toThrow('two-alias bytes');
    expect(events.some((event) => event.includes('.idx'))).toBe(false);
    expect(events.some((event) => event.startsWith('link:') && event.includes('.run'))).toBe(false);
    expect(fs.readdirSync(stage)).toEqual(['owner.json']);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('blocks before every index path when run-part alias contraction fails', () => {
    const { parent, stage } = temporaryStage('r7-run-unlink');
    const events = [];
    const tracked = trackedResumableFs(events);
    const store = createResumableEndgameDiskFrontierStore({ stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam });
    events.length = 0;
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    tracked.faults.runPartUnlink = true;
    expect(() => writer.finish()).toThrow('run-part unlink fault');
    expect(events.some((event) => event.includes('.idx'))).toBe(false);
    expect(fs.readdirSync(stage)).toEqual(expect.arrayContaining(['r7-f-d00000-g00000.run', 'r7-f-d00000-g00000.run.part']));
    expect(store.suspend().closeFailed).toBe(false);
    expect(fs.readdirSync(stage)).toEqual(['owner.json']);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('retains a failed index close descriptor for suspend retry and exact candidate cleanup', () => {
    const { parent, stage } = temporaryStage('r7-index-close');
    const events = [];
    const tracked = trackedResumableFs(events);
    const store = createResumableEndgameDiskFrontierStore({ stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam });
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    tracked.faults.indexClose = true;
    let failure;
    try { writer.finish(); } catch (error) { failure = error; }
    expect(failure?.r7CloseFailed).toBe(true);
    expect(tracked.openHandles()).toBe(1);
    expect(store.suspend().closeFailed).toBe(false);
    expect(tracked.openHandles()).toBe(0);
    expect(fs.readdirSync(stage)).toEqual(['owner.json']);
    store.dispose();
    releaseParent(parent, stage);
  });
});

describe('Node Endgame disk frontier adapter', () => {
  it('persists empty and nonempty immutable LF runs with repeatable exact reads', () => {
    const { parent, stage } = temporaryStage('repeatable');
    const events = [];
    const tracked = trackedFs(events);
    const store = createEndgameDiskFrontierStore({ stagePath: stage, fs: tracked.seam });

    const emptyWriter = store.createRun('d0000-p0000-g0000');
    const empty = emptyWriter.finish();
    expect(empty.size).toBe(0);
    expect([...empty.values()]).toEqual([]);
    expect([...empty.values()]).toEqual([]);

    const writer = store.createRun('d0000-p0000-g0001');
    for (const value of ['A', 'a', 'aa', 'z'.repeat(ENDGAME_DISK_FRONTIER_LIMITS.recordMaxBytes)]) {
      writer.write(value);
    }
    const run = writer.finish();
    expect(run.size).toBe(4);
    expect([...run.values()]).toEqual(['A', 'a', 'aa', 'z'.repeat(2048)]);
    expect([...run.values()]).toEqual([...run.values()]);

    empty.dispose();
    run.dispose();
    store.dispose();
    expect(store.diagnostics()).toEqual({
      activeRuns: [],
      residue: [],
      residueTruncated: false,
      cleanupErrors: [],
      cleanupErrorsTruncated: false,
    });
    const snapshot = tracked.snapshot();
    expect(snapshot.openHandles).toBe(0);
    expect(snapshot.peakHandles).toBe(1);
    expect(Math.max(...snapshot.writeLengths)).toBeLessThanOrEqual(1024 * 1024);
    expect(Math.max(...snapshot.readLengths)).toBeLessThanOrEqual(64 * 1024);
    expect(events.indexOf('flush')).toBeLessThan(events.indexOf('finalize'));
    expect(events.lastIndexOf('close')).toBeLessThan(events.indexOf('unlink'));
    expect(events.indexOf('unlink')).toBeLessThan(events.indexOf('remove-stage'));
    expect(events.lastIndexOf('remove-stage')).toBeLessThan(events.lastIndexOf('enumerate'));
    releaseParent(parent, stage);
  });

  it('runs a real 33-input Core merge with at most 32 readers plus one writer/output reader', () => {
    const { parent, stage } = temporaryStage('merge33');
    const events = [];
    const tracked = trackedFs(events);
    const store = createEndgameDiskFrontierStore({ stagePath: stage, fs: tracked.seam });
    const records = Array.from({ length: 33 }, (_, index) => `k${String(index).padStart(4, '0')}`);
    expect(ENDGAME_PROOF_FRONTIER_STORE_TESTING.persist(
      [...records].reverse(),
      store,
      { chunkMaxBytes: 6, chunkMaxRecords: 1 },
    )).toEqual(records);
    const snapshot = tracked.snapshot();
    expect(snapshot.openHandles).toBe(0);
    expect(snapshot.peakHandles).toBe(33);
    expect(Math.max(...snapshot.writeLengths)).toBeLessThanOrEqual(1024 * 1024);
    expect(Math.max(...snapshot.readLengths)).toBeLessThanOrEqual(64 * 1024);
    expect(store.diagnostics().residue).toEqual([]);
    releaseParent(parent, stage);
  });

  it('enforces the physical 4098-file registry and bounded cleanup diagnostics', () => {
    const { parent, stage } = temporaryStage('registry4098');
    let unlinkFaultsRemaining = 0;
    let readdirFaultsRemaining = 0;
    const store = createEndgameDiskFrontierStore({
      stagePath: stage,
      fs: {
        unlinkSync(...args) {
          if (unlinkFaultsRemaining > 0) {
            unlinkFaultsRemaining -= 1;
            const error = new Error(`injected unlink boundary fault ${unlinkFaultsRemaining}`);
            error.code = 'EIO';
            throw error;
          }
          return fs.unlinkSync(...args);
        },
        readdirSync(...args) {
          if (readdirFaultsRemaining > 0) {
            readdirFaultsRemaining -= 1;
            const error = new Error(`injected readdir boundary fault ${readdirFaultsRemaining}`);
            error.code = 'EIO';
            throw error;
          }
          return fs.readdirSync(...args);
        },
      },
    });
    expect(ENDGAME_DISK_FRONTIER_LIMITS.registryMaxEntries).toBe(4098);
    expect(ENDGAME_DISK_FRONTIER_LIMITS.diagnosticMaxEntries).toBe(4098);
    for (let index = 0; index < ENDGAME_DISK_FRONTIER_LIMITS.registryMaxEntries; index += 1) {
      store.createRun(`boundary-${String(index).padStart(4, '0')}`).finish();
    }
    expect(() => store.createRun('boundary-4098')).toThrow('created-file registry exceeds 4098');
    const atCapacity = store.diagnostics();
    expect(atCapacity.activeRuns).toHaveLength(4098);
    expect(atCapacity.residue).toHaveLength(4098);
    expect(atCapacity.residue[0]).toBe('.');
    expect(atCapacity.residueTruncated).toBe(true);
    expect(atCapacity.cleanupErrors).toEqual([]);

    unlinkFaultsRemaining = 4098;
    readdirFaultsRemaining = 4;
    let cleanupRejected = false;
    try {
      store.dispose();
    } catch (error) {
      cleanupRejected = true;
      expect(error).toBeInstanceOf(AggregateError);
    }
    expect(cleanupRejected).toBe(true);
    for (let index = 0; index < 3; index += 1) store.diagnostics();
    const truncated = store.diagnostics();
    expect(truncated.activeRuns).toHaveLength(4098);
    expect(truncated.residue).toHaveLength(4098);
    expect(truncated.residueTruncated).toBe(true);
    expect(truncated.cleanupErrors).toHaveLength(4098);
    expect(truncated.cleanupErrorsTruncated).toBe(true);
    expect(truncated.cleanupErrors.at(-1)).toContain('omitted 5');

    expect(unlinkFaultsRemaining).toBe(0);
    expect(readdirFaultsRemaining).toBe(0);
    store.dispose();
    const cleaned = store.diagnostics();
    expect(cleaned.activeRuns).toEqual([]);
    expect(cleaned.residue).toEqual([]);
    expect(cleaned.cleanupErrors).toHaveLength(4098);
    expect(cleaned.cleanupErrorsTruncated).toBe(true);
    releaseParent(parent, stage);
  }, 300_000);

  it('rejects invalid direct records before any bytes are persisted', () => {
    const { parent, stage } = temporaryStage('framing');
    const store = createEndgameDiskFrontierStore({ stagePath: stage });
    const invalid = store.createRun('invalid-records');
    for (const value of ['', 'a\nb', 'a\rb', '\0', 'é', 'x'.repeat(2049)]) {
      expect(() => invalid.write(value)).toThrow();
    }
    invalid.abort();
    store.dispose();
    releaseParent(parent, stage);
  });

  it.each([
    ['blank', Buffer.from('\n'), 'blank record'],
    ['CR', Buffer.from('\rbc\n'), 'invalid framing'],
    ['NUL', Buffer.from([0x00, 0x62, 0x63, 0x0a]), 'invalid framing'],
    ['non-ASCII', Buffer.from([0xff, 0x62, 0x63, 0x0a]), 'invalid framing'],
    ['unterminated', Buffer.from('abc'), 'terminal LF'],
    ['overlong', Buffer.concat([Buffer.alloc(2049, 0x61), Buffer.from('\n')]), 'overlong record'],
  ])('rejects physically corrupted %s framing during readback', (label, corrupted, expected) => {
    const { parent, stage } = temporaryStage(`physical-${label}`);
    let corruptOnce = true;
    const store = createEndgameDiskFrontierStore({
      stagePath: stage,
      fs: {
        writeSync(descriptor, buffer, offset, length, position) {
          if (corruptOnce) {
            corruptOnce = false;
            fs.writeSync(descriptor, corrupted, 0, corrupted.length, position);
            return length;
          }
          return fs.writeSync(descriptor, buffer, offset, length, position);
        },
      },
    });
    const writer = store.createRun('corrupted-run');
    writer.write('abc');
    const run = writer.finish();
    expect(() => [...run.values()]).toThrow(expected);
    run.dispose();
    store.dispose();
    releaseParent(parent, stage);
  });

  it('retains a reader descriptor after close failure and retries it before unlink', () => {
    const { parent, stage } = temporaryStage('reader-close');
    const store = createEndgameDiskFrontierStore({
      stagePath: stage,
      fs: nthFault('closeSync', 2),
    });
    const writer = store.createRun('reader-close-run');
    writer.write('abc');
    const run = writer.finish();
    expect(() => [...run.values()]).toThrow('closeSync fault 2');
    run.dispose();
    store.dispose();
    expect(store.diagnostics().activeRuns).toEqual([]);
    expect(store.diagnostics().residue).toEqual([]);
    expect(store.diagnostics().cleanupErrors.join('\n')).toContain('closeSync fault 2');
    releaseParent(parent, stage);
  });

  it.each([
    'lstatSync',
    'realpathSync',
    'mkdirSync',
    'openSync',
    'writeSync',
    'fsyncSync',
    'closeSync',
    'renameSync',
    'fstatSync',
    'readSync',
    'unlinkSync',
    'readdirSync',
    'rmdirSync',
  ])('propagates an injected %s failure and permits exact nonrecursive cleanup', (operation) => {
    const { parent, stage } = temporaryStage(`fault-${operation}`);
    let store = null;
    let writer = null;
    let run = null;
    if (['lstatSync', 'realpathSync', 'mkdirSync'].includes(operation)) {
      expect(() => createEndgameDiskFrontierStore({
        stagePath: stage,
        fs: oneShotFault(operation),
      })).toThrow(operation);
      releaseParent(parent, stage);
      return;
    }
    store = createEndgameDiskFrontierStore({ stagePath: stage, fs: oneShotFault(operation) });
    try {
      if (operation === 'openSync') {
        expect(() => store.createRun('fault-run')).toThrow(operation);
      } else {
        writer = store.createRun('fault-run');
        writer.write('abc');
        if (['writeSync', 'fsyncSync', 'closeSync', 'renameSync'].includes(operation)) {
          expect(() => writer.finish()).toThrow(operation);
        } else {
          run = writer.finish();
          if (['fstatSync', 'readSync'].includes(operation)) {
            expect(() => [...run.values()]).toThrow(operation);
          }
          else if (operation === 'unlinkSync') expect(() => run.dispose()).toThrow(operation);
          else {
            run.dispose();
            run = null;
            expect(() => store.dispose()).toThrow(operation);
          }
        }
      }
    } finally {
      retryCleanup(store, writer, run);
    }
    expect(store.diagnostics().activeRuns).toEqual([]);
    expect(store.diagnostics().residue).toEqual([]);
    releaseParent(parent, stage);
  });

  it('refuses foreign stage entries and never recursively deletes them', () => {
    const { parent, stage } = temporaryStage('foreign');
    const store = createEndgameDiskFrontierStore({ stagePath: stage });
    const foreign = path.join(stage, 'foreign.txt');
    fs.writeFileSync(foreign, 'foreign', 'utf8');
    expect(() => store.dispose()).toThrow('foreign stage entries');
    expect(fs.readFileSync(foreign, 'utf8')).toBe('foreign');
    expect(store.diagnostics().residue).toEqual(['.', 'foreign.txt']);
    fs.unlinkSync(foreign);
    store.dispose();
    releaseParent(parent, stage);
  });
});

const RUN_EXACT = process.env.ENDGAME_EXACT_CERTIFICATES === '1';

describe.runIf(RUN_EXACT)('Node disk frontier exact Intro-01 through Intro-04 equality', () => {
  it('matches default certificates and telemetry with one clean stage per case and no Intro-05', () => {
    const fixtures = [intro01, intro02, intro03, intro04];
    expect(ENDGAME_V3_INTRO_DRAFTS).toHaveLength(4);
    for (const [index, definition] of ENDGAME_V3_INTRO_DRAFTS.entries()) {
      const route = fixtures[index].optimalRoute;
      const baseline = certifyOptimalEndgameRouteForDefinition(definition, route);
      const { parent, stage } = temporaryStage(`exact-${index + 1}`);
      const store = createEndgameDiskFrontierStore({ stagePath: stage });
      const injected = certifyOptimalEndgameRouteForDefinition(
        definition,
        route,
        { runStore: store },
      );
      expect(injected, definition.id).toEqual(baseline);
      expect(store.diagnostics(), definition.id).toEqual({
        activeRuns: [],
        residue: [],
        residueTruncated: false,
        cleanupErrors: [],
        cleanupErrorsTruncated: false,
      });
      releaseParent(parent, stage);
    }
  }, 1_200_000);
});
