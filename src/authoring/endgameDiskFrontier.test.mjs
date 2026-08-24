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
  advanceOptimalEndgameRouteProofForDefinition,
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

function manifestPublicationFs(events) {
  const descriptors = new Map();
  const openCalls = [];
  let fault = null;
  const label = (filePath) => path.basename(String(filePath));
  const fail = (operation, detail) => {
    if (!fault || fault.operation !== operation || fault.remaining <= 0
      || (fault.match && !fault.match(detail))) return false;
    fault.remaining -= 1;
    const error = new Error(`injected manifest ${operation} fault`);
    error.code = fault.code;
    if (fault.after) fault.after(detail, error);
    throw error;
  };
  return {
    seam: {
      openSync(filePath, flags, ...args) {
        const detail = {
          filePath: String(filePath), name: label(filePath), flags: String(flags), mode: args[0],
        };
        fail('openSync', detail);
        const descriptor = fs.openSync(filePath, flags, ...args);
        descriptors.set(descriptor, detail);
        openCalls.push(detail);
        events.push(`open:${detail.name}:${detail.flags}`);
        return descriptor;
      },
      writeSync(descriptor, buffer, offset, length, position) {
        const detail = { descriptor, record: descriptors.get(descriptor), buffer, offset, length, position };
        fail('writeSync', detail);
        const requested = fault?.operation === 'shortWrite' && fault.remaining > 0
          && (!fault.match || fault.match(detail)) ? Math.max(1, Math.floor(length / 2)) : length;
        if (requested !== length) fault.remaining -= 1;
        events.push(`write:${detail.record?.name}:${requested}`);
        return fs.writeSync(descriptor, buffer, offset, requested, position);
      },
      fsyncSync(descriptor) {
        const detail = { descriptor, record: descriptors.get(descriptor) };
        fail('fsyncSync', detail);
        events.push(`fsync:${detail.record?.name}`);
        return fs.fsyncSync(descriptor);
      },
      closeSync(descriptor) {
        const detail = { descriptor, record: descriptors.get(descriptor) };
        fail('closeSync', detail);
        const result = fs.closeSync(descriptor);
        descriptors.delete(descriptor);
        events.push(`close:${detail.record?.name}:${detail.record?.flags}`);
        return result;
      },
      readSync(descriptor, ...args) {
        const detail = { descriptor, record: descriptors.get(descriptor), length: args[2], position: args[3] };
        fail('readSync', detail);
        events.push(`read:${detail.record?.name}:${detail.length}`);
        return fs.readSync(descriptor, ...args);
      },
      lstatSync(filePath, ...args) {
        const detail = { filePath: String(filePath), name: label(filePath) };
        fail('lstatSync', detail);
        events.push(`lstat:${detail.name}`);
        return fs.lstatSync(filePath, ...args);
      },
      linkSync(source, finalPath) {
        const detail = { source: String(source), finalPath: String(finalPath), sourceName: label(source), finalName: label(finalPath) };
        fail('linkSync', detail);
        events.push(`link:${detail.sourceName}>${detail.finalName}`);
        return fs.linkSync(source, finalPath);
      },
      unlinkSync(filePath) {
        const detail = { filePath: String(filePath), name: label(filePath) };
        fail('unlinkSync', detail);
        events.push(`unlink:${detail.name}`);
        return fs.unlinkSync(filePath);
      },
      readdirSync(filePath, ...args) {
        const detail = { filePath: String(filePath), name: label(filePath) };
        fail('readdirSync', detail);
        events.push(`readdir:${detail.name}`);
        return fs.readdirSync(filePath, ...args);
      },
      utimesSync(filePath, ...args) {
        const detail = { filePath: String(filePath), name: label(filePath) };
        fail('utimesSync', detail);
        events.push(`stamp:${detail.name}`);
        return fs.utimesSync(filePath, ...args);
      },
    },
    arm(operation, { match = null, failures = 1, code = 'EIO', after = null } = {}) {
      fault = { operation, match, remaining: failures, code, after };
    },
    clearFault() { fault = null; },
    openCalls() { return openCalls.map((entry) => ({ ...entry })); },
    openHandles() { return descriptors.size; },
    forceCloseAll() {
      for (const descriptor of descriptors.keys()) {
        try { fs.closeSync(descriptor); } catch { /* Test-only process-exit cleanup. */ }
      }
      descriptors.clear();
    },
  };
}

function manifestFaultAfterLink(tracked, operation, options = {}) {
  return {
    ...tracked.seam,
    linkSync(...args) {
      const result = tracked.seam.linkSync(...args);
      if (path.basename(String(args[0])).startsWith('manifest-g')) {
        tracked.arm(operation, options);
      }
      return result;
    },
  };
}

function manifestActionAfterAliasContraction(tracked, action) {
  let manifestLinked = false;
  let postlinkStamps = 0;
  return {
    ...tracked.seam,
    linkSync(...args) {
      const result = tracked.seam.linkSync(...args);
      if (path.basename(String(args[0])).startsWith('manifest-g')) manifestLinked = true;
      return result;
    },
    utimesSync(...args) {
      const result = tracked.seam.utimesSync(...args);
      if (manifestLinked) {
        postlinkStamps += 1;
        if (postlinkStamps === 2) action();
      }
      return result;
    },
  };
}

function replaceExactManifestObject(filePath) {
  const replacementPath = `${filePath}.race-replacement`;
  const bytes = fs.readFileSync(filePath);
  fs.writeFileSync(replacementPath, bytes, { flag: 'wx', mode: 0o600 });
  fs.unlinkSync(filePath);
  fs.linkSync(replacementPath, filePath);
  fs.unlinkSync(replacementPath);
}

function countedResumableInventoryFs() {
  const counts = { fstatSync: 0, lstatSync: 0, readdirSync: 0, realpathSync: 0 };
  const seam = {};
  for (const operation of Object.keys(counts)) {
    seam[operation] = (...args) => {
      counts[operation] += 1;
      return fs[operation](...args);
    };
  }
  return {
    seam,
    reset() {
      for (const operation of Object.keys(counts)) counts[operation] = 0;
    },
    snapshot() { return { ...counts }; },
  };
}

function closeFailureResumableFs(events) {
  const descriptors = new Map();
  let fault = null;
  const label = (filePath) => path.basename(String(filePath));
  return {
    seam: {
      openSync(filePath, flags, ...args) {
        const descriptor = fs.openSync(filePath, flags, ...args);
        descriptors.set(descriptor, { filePath: String(filePath), flags: String(flags) });
        events.push(`open:${label(filePath)}:${String(flags)}`);
        return descriptor;
      },
      closeSync(descriptor) {
        const record = descriptors.get(descriptor);
        if (fault && fault.remaining > 0 && record?.filePath.endsWith(fault.suffix)
          && (fault.flags === undefined || record.flags === fault.flags)) {
          fault.remaining -= 1;
          events.push(`close:${label(record.filePath)}:${record.flags}:fail`);
          const error = new Error(`injected ${fault.label} close fault`);
          error.code = 'EIO';
          throw error;
        }
        const result = fs.closeSync(descriptor);
        descriptors.delete(descriptor);
        events.push(`close:${record ? label(record.filePath) : descriptor}:${record?.flags ?? 'unknown'}:ok`);
        return result;
      },
      unlinkSync(filePath) {
        events.push(`unlink:${label(filePath)}`);
        return fs.unlinkSync(filePath);
      },
    },
    arm({ suffix, flags = 'r', failures = 1, label = 'readback' }) {
      fault = { suffix, flags, remaining: failures, label };
    },
    openHandles() { return descriptors.size; },
    forceCloseAll() {
      for (const descriptor of descriptors.keys()) {
        try { fs.closeSync(descriptor); } catch { /* Test-only process-exit cleanup. */ }
      }
      descriptors.clear();
    },
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

function resumableOwnerByteLength(testing, ownerId = 'owner-A') {
  return Buffer.byteLength(`${testing.canonicalJson({ schema: 't37-f4e-r7-owner-v1', ownerId })}\n`, 'utf8');
}

function preparedSeedManifest(testing, label) {
  const state = testing.createManifestState();
  const frontier = Object.freeze({ token: label });
  const descriptor = manifestDescriptor('r7-f-d00000-g00000', 1, 'ROOT', 'ROOT');
  const plan = testing.planManifestTransition(state, Object.freeze({
    transition: 'seed', previousTip: null, binding: manifestBinding(3), frontier,
  }), manifestCandidate(frontier, descriptor), manifestTotals(8));
  return { state, plan, token: testing.prepareManifestTransitionCommit(state, plan) };
}

function forceReleaseManifestStage(parent, stage, tracked = null) {
  tracked?.forceCloseAll?.();
  if (fs.existsSync(stage)) {
    for (const name of fs.readdirSync(stage)) fs.unlinkSync(path.join(stage, name));
    fs.rmdirSync(stage);
  }
  fs.rmdirSync(parent);
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

  it('prepares a private manifest byte/application token without mutating state', () => {
    const state = testing.createManifestState();
    const otherState = testing.createManifestState();
    const frontier = Object.freeze({ token: 'prepared-seed' });
    const descriptor = manifestDescriptor('r7-f-d00000-g00000', 1, 'ROOT', 'ROOT');
    const plan = testing.planManifestTransition(state, Object.freeze({
      transition: 'seed', previousTip: null, binding: manifestBinding(3), frontier,
    }), manifestCandidate(frontier, descriptor), manifestTotals(8));
    const expectedManifestBytes = Buffer.from(plan.manifestBytes);
    const before = manifestStateBytes(testing, state);
    const nextRunsIdentity = state.nextRuns;
    const activeIdsIdentity = state.activeIds;
    const token = testing.prepareManifestTransitionCommit(state, plan);

    expect(Object.isFrozen(token)).toBe(true);
    expect(manifestStateBytes(testing, state)).toBe(before);
    expect(state.nextRuns).toBe(nextRunsIdentity);
    expect(state.activeIds).toBe(activeIdsIdentity);
    expect(testing.preparedManifestTransitionBytes(token)).toEqual(expectedManifestBytes);
    expect(() => testing.prepareManifestTransitionCommit(state, plan)).toThrow('already has');
    expect(manifestStateBytes(testing, state)).toBe(before);

    plan.manifestBytes.fill(0x58);
    plan.manifest.stateDelta.binding.levelId = 'poisoned-after-prepare';
    const exportedBytes = testing.preparedManifestTransitionBytes(token);
    exportedBytes.fill(0x59);
    expect(testing.preparedManifestTransitionBytes(token)).toEqual(expectedManifestBytes);
    expect(() => testing.claimPreparedManifestTransitionCommit(otherState, token))
      .toThrow('different state instance');
    expect(() => testing.applyPreparedManifestTransition(token)).toThrow('must be claimed');
    testing.claimPreparedManifestTransitionCommit(state, token);
    expect(() => testing.claimPreparedManifestTransitionCommit(state, token)).toThrow('already claimed');
    testing.applyPreparedManifestTransition(token);
    expect(state.tip).toEqual(plan.tip);
    expect(state.binding.levelId).toBe('t3r-test');
    const applied = manifestStateBytes(testing, state);
    expect(() => testing.applyPreparedManifestTransition(token)).toThrow('not owned');
    expect(manifestStateBytes(testing, state)).toBe(applied);
    expect(() => testing.preparedManifestTransitionBytes(token)).toThrow('not owned');
  });

  it('admits only one prepared transition per state and rejects the losing plan before commit', () => {
    const state = testing.createManifestState();
    const frontier = Object.freeze({ token: 'prepared-race' });
    const descriptor = manifestDescriptor('r7-f-d00000-g00000', 1, 'ROOT', 'ROOT');
    const publication = Object.freeze({
      transition: 'seed', previousTip: null, binding: manifestBinding(3), frontier,
    });
    const winnerPlan = testing.planManifestTransition(
      state, publication, manifestCandidate(frontier, descriptor), manifestTotals(8),
    );
    const loserPlan = testing.planManifestTransition(
      state, publication, manifestCandidate(frontier, descriptor), manifestTotals(8),
    );
    const winner = testing.prepareManifestTransitionCommit(state, winnerPlan);
    const before = manifestStateBytes(testing, state);
    expect(() => testing.prepareManifestTransitionCommit(state, loserPlan)).toThrow('already has');
    expect(manifestStateBytes(testing, state)).toBe(before);
    testing.claimPreparedManifestTransitionCommit(state, winner);
    testing.applyPreparedManifestTransition(winner);
    const committed = manifestStateBytes(testing, state);
    expect(() => testing.prepareManifestTransitionCommit(state, loserPlan)).toThrow('base tip is stale');
    expect(manifestStateBytes(testing, state)).toBe(committed);
  });

  it('binds prepare to the planning-time state generation and permits retry after repair', () => {
    const state = testing.createManifestState();
    const frontier = Object.freeze({ token: 'generation-bound-seed' });
    const descriptor = manifestDescriptor('r7-f-d00000-g00000', 1, 'ROOT', 'ROOT');
    const plan = testing.planManifestTransition(state, Object.freeze({
      transition: 'seed', previousTip: null, binding: manifestBinding(3), frontier,
    }), manifestCandidate(frontier, descriptor), manifestTotals(8));
    const before = manifestStateBytes(testing, state);
    state.generation = 41;
    expect(() => testing.prepareManifestTransitionCommit(state, plan)).toThrow('base generation is stale');
    state.generation = -1;
    expect(manifestStateBytes(testing, state)).toBe(before);
    const token = testing.prepareManifestTransitionCommit(state, plan);
    testing.claimPreparedManifestTransitionCommit(state, token);
    testing.applyPreparedManifestTransition(token);
    expect(state.generation).toBe(0);

    const unitRun = Object.freeze({ token: 'generation-bound-unit' });
    const unitDescriptor = manifestDescriptor('r7-u-d00000-n00000000-g00001', 0, null, null);
    const unit = testing.planManifestTransition(state, Object.freeze({
      transition: 'unit', previousTip: state.tip, parentOffset: 1, lastProcessedParentKey: 'ROOT',
      transitionsDelta: 1, boundPrunesDelta: 0, nextRun: unitRun,
    }), manifestCandidate(unitRun, unitDescriptor), manifestTotals(8));
    state.generation = 99;
    expect(() => testing.prepareManifestTransitionCommit(state, unit)).toThrow('base generation is stale');
    state.generation = 0;
    const unitToken = testing.prepareManifestTransitionCommit(state, unit);
    testing.claimPreparedManifestTransitionCommit(state, unitToken);
    testing.applyPreparedManifestTransition(unitToken);
    expect(state.generation).toBe(1);
  });

  it('leaves a failed direct prepare unconsumed and retryable after collection repair', () => {
    const { state, plan } = coveredUnitAppendPlan(testing, 'direct-prepare-retry');
    const original = state.nextRuns;
    const before = manifestStateBytes(testing, state);
    state.nextRuns = Object.freeze([]);
    expect(() => testing.prepareManifestTransitionCommit(state, plan)).toThrow('must remain extensible');
    state.nextRuns = original;
    expect(manifestStateBytes(testing, state)).toBe(before);
    const token = testing.prepareManifestTransitionCommit(state, plan);
    testing.claimPreparedManifestTransitionCommit(state, token);
    testing.applyPreparedManifestTransition(token);
    expect(state.generation).toBe(1);
  });

  it('rejects tip hash and tip generation drift during prepare without consuming the plan', () => {
    for (const mutateTip of [
      (tip) => ({ ...tip, manifestSha256: 'B'.repeat(64) }),
      (tip) => ({ ...tip, generation: tip.generation + 1 }),
    ]) {
      const { state, plan } = coveredUnitAppendPlan(testing, 'direct-tip-drift');
      const originalTip = state.tip;
      const before = manifestStateBytes(testing, state);
      state.tip = mutateTip(originalTip);
      expect(() => testing.prepareManifestTransitionCommit(state, plan)).toThrow('base tip is stale');
      state.tip = originalTip;
      expect(manifestStateBytes(testing, state)).toBe(before);
      const token = testing.prepareManifestTransitionCommit(state, plan);
      testing.claimPreparedManifestTransitionCommit(state, token);
      testing.applyPreparedManifestTransition(token);
      expect(state.generation).toBe(1);
    }
  });

  it('burns an owning prepared token when generation or tip drifts before its precommit claim', () => {
    for (const mutateState of [
      (state) => { state.generation += 1; },
      (state) => { state.tip = { ...state.tip, manifestSha256: 'B'.repeat(64) }; },
      (state) => {
        state.generation += 1;
        state.tip = { ...state.tip, generation: state.tip.generation + 1 };
      },
    ]) {
      const { state, plan } = coveredUnitAppendPlan(testing, 'claimed-state-drift');
      const originalTip = state.tip;
      const originalGeneration = state.generation;
      const before = manifestStateBytes(testing, state);
      const token = testing.prepareManifestTransitionCommit(state, plan);
      mutateState(state);
      expect(() => testing.claimPreparedManifestTransitionCommit(state, token))
        .toThrow('base state is stale');
      state.tip = originalTip;
      state.generation = originalGeneration;
      expect(manifestStateBytes(testing, state)).toBe(before);
      expect(() => testing.claimPreparedManifestTransitionCommit(state, token)).toThrow('not owned');
    }
  });

  it('consumes a prepared token before an unexpected apply failure and never replays it', () => {
    const { state, plan, unitDescriptor } = coveredUnitAppendPlan(testing, 'apply-fail-stop');
    const token = testing.prepareManifestTransitionCommit(state, plan);
    testing.claimPreparedManifestTransitionCommit(state, token);
    Object.freeze(state.nextRuns);
    expect(() => testing.applyPreparedManifestTransition(token)).toThrow();
    expect(state.nextRuns).not.toContain(unitDescriptor);
    expect(state.generation).toBe(0);
    expect(() => testing.applyPreparedManifestTransition(token)).toThrow('not owned');
    expect(state.nextRuns).not.toContain(unitDescriptor);
    expect(state.generation).toBe(0);
  });

  it('prepares final-unit-without-run, final-depth complete, and zero-decision complete', () => {
    const finalState = testing.createManifestState();
    const finalFrontier = Object.freeze({ token: 'prepared-final-seed' });
    const descriptor = manifestDescriptor('r7-f-d00000-g00000', 1, 'ROOT', 'ROOT');
    const finalSeed = testing.planManifestTransition(finalState, Object.freeze({
      transition: 'seed', previousTip: null, binding: manifestBinding(2), frontier: finalFrontier,
    }), manifestCandidate(finalFrontier, descriptor), manifestTotals(8));
    testing.commitManifestTransition(finalState, finalSeed);
    const finalUnit = testing.planManifestTransition(finalState, Object.freeze({
      transition: 'unit', previousTip: finalState.tip, parentOffset: 1,
      lastProcessedParentKey: 'ROOT', transitionsDelta: 1, boundPrunesDelta: 0, nextRun: null,
    }), null, manifestTotals(8));
    const beforeFinalUnit = manifestStateBytes(testing, finalState);
    const finalUnitToken = testing.prepareManifestTransitionCommit(finalState, finalUnit);
    expect(manifestStateBytes(testing, finalState)).toBe(beforeFinalUnit);
    testing.claimPreparedManifestTransitionCommit(finalState, finalUnitToken);
    testing.applyPreparedManifestTransition(finalUnitToken);
    expect(finalState.nextRuns).toEqual([]);
    expect(finalState.parentOffset).toBe(1);
    const completedDepth = Object.freeze({
      lockedPieces: 0, frontierStates: 1, transitions: 1, boundPrunes: 0,
    });
    const finalComplete = testing.planManifestTransition(finalState, Object.freeze({
      transition: 'complete', previousTip: finalState.tip, completedDepth, reason: 'final-depth',
    }), null, manifestTotals(0));
    const finalCompleteToken = testing.prepareManifestTransitionCommit(finalState, finalComplete);
    testing.claimPreparedManifestTransitionCommit(finalState, finalCompleteToken);
    testing.applyPreparedManifestTransition(finalCompleteToken);
    expect(finalState).toEqual(expect.objectContaining({ kind: 'complete', reason: 'final-depth' }));

    const zeroState = testing.createManifestState();
    const zeroFrontier = Object.freeze({ token: 'prepared-zero-seed' });
    const zeroSeed = testing.planManifestTransition(zeroState, Object.freeze({
      transition: 'seed', previousTip: null, binding: manifestBinding(1), frontier: zeroFrontier,
    }), manifestCandidate(zeroFrontier, descriptor), manifestTotals(8));
    testing.commitManifestTransition(zeroState, zeroSeed);
    const zeroComplete = testing.planManifestTransition(zeroState, Object.freeze({
      transition: 'complete', previousTip: zeroState.tip,
      completedDepth: null, reason: 'zero-decision-depth',
    }), null, manifestTotals(0));
    const zeroToken = testing.prepareManifestTransitionCommit(zeroState, zeroComplete);
    testing.claimPreparedManifestTransitionCommit(zeroState, zeroToken);
    testing.applyPreparedManifestTransition(zeroToken);
    expect(zeroState).toEqual(expect.objectContaining({
      kind: 'complete', reason: 'zero-decision-depth', completedDepths: [],
    }));
  });

  it.each(['layer', 'complete'])('keeps prepared %s application equivalent to the legacy wrapper', (transition) => {
    const preparedCase = coveredManifestPlan(testing, transition, `prepared-${transition}`);
    const wrappedCase = coveredManifestPlan(testing, transition, `prepared-${transition}`);
    expect(manifestStateBytes(testing, preparedCase.state))
      .toBe(manifestStateBytes(testing, wrappedCase.state));
    const before = manifestStateBytes(testing, preparedCase.state);
    const token = testing.prepareManifestTransitionCommit(preparedCase.state, preparedCase.plan);
    expect(manifestStateBytes(testing, preparedCase.state)).toBe(before);
    testing.claimPreparedManifestTransitionCommit(preparedCase.state, token);
    testing.applyPreparedManifestTransition(token);
    testing.commitManifestTransition(wrappedCase.state, wrappedCase.plan);
    expect(manifestStateBytes(testing, preparedCase.state))
      .toBe(manifestStateBytes(testing, wrappedCase.state));
  });

  it('prepares a unit append in O(1) and applies from its sealed snapshot', () => {
    const { state, plan, unitDescriptor } = coveredUnitAppendPlan(testing, 'prepared-unit');
    const nextRunsIdentity = state.nextRuns;
    const activeIdsIdentity = state.activeIds;
    const before = manifestStateBytes(testing, state);
    const token = testing.prepareManifestTransitionCommit(state, plan);
    expect(manifestStateBytes(testing, state)).toBe(before);
    plan.manifestBytes.fill(0x5a);
    plan.patch.parentOffset = 999;
    testing.claimPreparedManifestTransitionCommit(state, token);
    testing.applyPreparedManifestTransition(token);
    expect(state.nextRuns).toBe(nextRunsIdentity);
    expect(state.activeIds).toBe(activeIdsIdentity);
    expect(state.nextRuns).toEqual([unitDescriptor]);
    expect(state.activeIds.has(unitDescriptor.id)).toBe(true);
    expect(state.parentOffset).toBe(1);
  });

  it('publishes only private prepared manifest bytes in the exact clean hard-link order', () => {
    const { parent, stage } = temporaryStage('r7-manifest-publish-clean');
    const events = [];
    const tracked = manifestPublicationFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    events.length = 0;
    const state = testing.createManifestState();
    const frontier = Object.freeze({ token: 'publisher-private-seed' });
    const descriptor = manifestDescriptor('r7-f-d00000-g00000', 1, 'ROOT', 'ROOT');
    const plan = testing.planManifestTransition(state, Object.freeze({
      transition: 'seed', previousTip: null, binding: manifestBinding(3), frontier,
    }), manifestCandidate(frontier, descriptor), manifestTotals(8));
    const expectedBytes = Buffer.from(plan.manifestBytes);
    const token = testing.prepareManifestTransitionCommit(state, plan);
    plan.manifestBytes.fill(0x58);
    const exported = testing.preparedManifestTransitionBytes(token);
    exported.fill(0x59);
    const result = testing.publishPreparedManifest(store, state, token);
    const finalPath = path.join(stage, 'manifest-g00000.json');
    const partPath = `${finalPath}.part`;

    expect(result).toEqual(expect.objectContaining({
      tip: plan.tip, advanceAllowed: true, clean: true,
    }));
    expect(state).toEqual(expect.objectContaining({ generation: 0, tip: plan.tip }));
    expect(fs.readFileSync(finalPath)).toEqual(expectedBytes);
    expect(tracked.openCalls()).toContainEqual(expect.objectContaining({
      name: 'manifest-g00000.json.part', flags: 'wx', mode: 0o600,
    }));
    expect(fs.existsSync(partPath)).toBe(false);
    expect(tracked.openHandles()).toBe(0);
    const manifestEvents = events.filter((event) => event.includes('manifest-g00000'));
    expect(manifestEvents.findIndex((event) => event === 'open:manifest-g00000.json.part:wx'))
      .toBeLessThan(manifestEvents.findIndex((event) => event.startsWith('write:manifest-g00000.json.part:')));
    expect(manifestEvents.findIndex((event) => event === 'fsync:manifest-g00000.json.part'))
      .toBeLessThan(manifestEvents.findIndex((event) => event === 'link:manifest-g00000.json.part>manifest-g00000.json'));
    expect(manifestEvents.findIndex((event) => event === 'link:manifest-g00000.json.part>manifest-g00000.json'))
      .toBeLessThan(manifestEvents.findIndex((event) => event === 'unlink:manifest-g00000.json.part'));
    expect(events.filter((event) => event.startsWith('readdir:'))).toEqual([]);
    expect(() => testing.publishPreparedManifest(store, state, token)).toThrow('not owned');

    store.dispose();
    releaseParent(parent, stage);
  });

  it('finishes a short-write-safe manifest publication without changing the sealed bytes', () => {
    const prepared = preparedSeedManifest(testing, 'publisher-short-write');
    const expectedBytes = testing.preparedManifestTransitionBytes(prepared.token);
    const { parent, stage } = temporaryStage('r7-manifest-short-write');
    const events = [];
    const tracked = manifestPublicationFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    events.length = 0;
    tracked.arm('shortWrite', {
      failures: 4,
      match: (detail) => detail.record?.name === 'manifest-g00000.json.part',
    });

    expect(testing.publishPreparedManifest(store, prepared.state, prepared.token).clean).toBe(true);
    expect(fs.readFileSync(path.join(stage, 'manifest-g00000.json'))).toEqual(expectedBytes);
    expect(events.filter((event) => event.startsWith('write:manifest-g00000.json.part:')).length)
      .toBeGreaterThan(1);
    expect(tracked.openHandles()).toBe(0);

    store.dispose();
    releaseParent(parent, stage);
  });

  it('cleans only its owned part when the manifest link fails before commit', () => {
    const prepared = preparedSeedManifest(testing, 'publisher-link-failure');
    const { parent, stage } = temporaryStage('r7-manifest-link-failure');
    const events = [];
    const tracked = manifestPublicationFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    events.length = 0;
    tracked.arm('linkSync', {
      match: (detail) => detail.finalName === 'manifest-g00000.json',
    });
    const before = manifestStateBytes(testing, prepared.state);

    expect(() => testing.publishPreparedManifest(store, prepared.state, prepared.token)).toThrow();
    expect(manifestStateBytes(testing, prepared.state)).toBe(before);
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json'))).toBe(false);
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json.part'))).toBe(false);
    expect(events).toContain('unlink:manifest-g00000.json.part');
    expect(() => testing.publishPreparedManifest(store, prepared.state, prepared.token)).toThrow('not owned');

    store.dispose();
    releaseParent(parent, stage);
  });

  it('applies once but suspends with both aliases after a lost successful link result', () => {
    const prepared = preparedSeedManifest(testing, 'publisher-link-lost-result');
    const expectedBytes = testing.preparedManifestTransitionBytes(prepared.token);
    const { parent, stage } = temporaryStage('r7-manifest-link-lost-result');
    const events = [];
    const tracked = manifestPublicationFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    events.length = 0;
    tracked.arm('linkSync', {
      match: (detail) => detail.finalName === 'manifest-g00000.json',
      after: (detail) => fs.linkSync(detail.source, detail.finalPath),
    });

    const result = testing.publishPreparedManifest(store, prepared.state, prepared.token);
    expect(result).toEqual(expect.objectContaining({
      tip: prepared.plan.tip, advanceAllowed: false, clean: false,
    }));
    expect(prepared.state).toEqual(expect.objectContaining({ generation: 0, tip: prepared.plan.tip }));
    expect(fs.readFileSync(path.join(stage, 'manifest-g00000.json'))).toEqual(expectedBytes);
    expect(fs.readFileSync(path.join(stage, 'manifest-g00000.json.part'))).toEqual(expectedBytes);
    expect(fs.lstatSync(path.join(stage, 'manifest-g00000.json'), { bigint: true }).ino)
      .toBe(fs.lstatSync(path.join(stage, 'manifest-g00000.json.part'), { bigint: true }).ino);
    expect(result.diagnostics.cleanupErrors.some((entry) => entry.includes('injected manifest linkSync fault')))
      .toBe(true);
    expect(result.diagnostics.residue).toContain('manifest-g00000.json.part');
    expect(result.diagnostics.residue).not.toContain('manifest-g00000.json');
    expect(() => store.loadCheckpoint()).toThrow('suspended');

    forceReleaseManifestStage(parent, stage, tracked);
  });

  it('keeps both paths and requires reopen when a manifest link result cannot be authenticated', () => {
    const prepared = preparedSeedManifest(testing, 'publisher-link-ambiguous');
    const { parent, stage } = temporaryStage('r7-manifest-link-ambiguous');
    const events = [];
    const tracked = manifestPublicationFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    events.length = 0;
    tracked.arm('linkSync', {
      match: (detail) => detail.finalName === 'manifest-g00000.json',
      after: (detail) => {
        fs.linkSync(detail.source, detail.finalPath);
        tracked.arm('lstatSync', {
          match: (next) => next.name === 'manifest-g00000.json',
        });
      },
    });
    const before = manifestStateBytes(testing, prepared.state);

    expect(() => testing.publishPreparedManifest(store, prepared.state, prepared.token)).toThrow('reopen the Store');
    expect(manifestStateBytes(testing, prepared.state)).toBe(before);
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json'))).toBe(true);
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json.part'))).toBe(true);
    expect(events.some((event) => event.startsWith('unlink:manifest-g00000'))).toBe(false);
    expect(() => testing.publishPreparedManifest(store, prepared.state, prepared.token)).toThrow('suspended');

    forceReleaseManifestStage(parent, stage, tracked);
  });

  it.each(['normal result', 'lost result'])(
    'never adopts an exact-byte replacement part inode after a %s link',
    (outcome) => {
      const prepared = preparedSeedManifest(testing, `publisher-replaced-part-${outcome}`);
      const { parent, stage } = temporaryStage(`r7-manifest-replaced-part-${outcome}`);
      const events = [];
      const tracked = manifestPublicationFs(events);
      const replacingSeam = {
        ...tracked.seam,
        linkSync(source, finalPath) {
          if (outcome === 'normal result'
            && path.basename(String(source)).startsWith('manifest-g')) {
            replaceExactManifestObject(String(source));
          }
          return tracked.seam.linkSync(source, finalPath);
        },
      };
      const store = createResumableEndgameDiskFrontierStore({
        stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: replacingSeam,
      });
      events.length = 0;
      if (outcome === 'lost result') {
        tracked.arm('linkSync', {
          match: (detail) => detail.finalName === 'manifest-g00000.json',
          after: (detail) => {
            replaceExactManifestObject(detail.source);
            fs.linkSync(detail.source, detail.finalPath);
          },
        });
      }
      const before = manifestStateBytes(testing, prepared.state);

      if (outcome === 'normal result') {
        expect(testing.publishPreparedManifest(store, prepared.state, prepared.token))
          .toEqual(expect.objectContaining({
            tip: prepared.plan.tip, advanceAllowed: false, clean: false,
          }));
        expect(prepared.state).toEqual(expect.objectContaining({ generation: 0, tip: prepared.plan.tip }));
      } else {
        expect(() => testing.publishPreparedManifest(store, prepared.state, prepared.token))
          .toThrow('reopen the Store');
        expect(manifestStateBytes(testing, prepared.state)).toBe(before);
      }
      expect(fs.existsSync(path.join(stage, 'manifest-g00000.json'))).toBe(true);
      expect(fs.existsSync(path.join(stage, 'manifest-g00000.json.part'))).toBe(true);
      expect(events).not.toContain('unlink:manifest-g00000.json');
      expect(events).not.toContain('unlink:manifest-g00000.json.part');
      expect(() => store.loadCheckpoint()).toThrow('suspended');

      forceReleaseManifestStage(parent, stage, tracked);
    },
  );

  it('treats a vanished EEXIST final collision as terminal after exact part cleanup', () => {
    const prepared = preparedSeedManifest(testing, 'publisher-vanished-final-collision');
    const { parent, stage } = temporaryStage('r7-manifest-vanished-final-collision');
    const events = [];
    const tracked = manifestPublicationFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    events.length = 0;
    tracked.arm('linkSync', {
      code: 'EEXIST', match: (detail) => detail.finalName === 'manifest-g00000.json',
    });
    const before = manifestStateBytes(testing, prepared.state);

    expect(() => testing.publishPreparedManifest(store, prepared.state, prepared.token)).toThrow();
    expect(manifestStateBytes(testing, prepared.state)).toBe(before);
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json'))).toBe(false);
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json.part'))).toBe(false);
    expect(events).toContain('unlink:manifest-g00000.json.part');
    expect(() => store.loadCheckpoint()).toThrow('suspended');

    forceReleaseManifestStage(parent, stage, tracked);
  });

  it('never overwrites or unlinks a racing final collision and only cleans its owned part', () => {
    const prepared = preparedSeedManifest(testing, 'publisher-final-collision');
    const expectedBytes = testing.preparedManifestTransitionBytes(prepared.token);
    const { parent, stage } = temporaryStage('r7-manifest-final-collision');
    const events = [];
    const tracked = manifestPublicationFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    events.length = 0;
    tracked.arm('linkSync', {
      code: 'EEXIST',
      match: (detail) => detail.finalName === 'manifest-g00000.json',
      after: (detail) => fs.writeFileSync(detail.finalPath, expectedBytes, { flag: 'wx', mode: 0o600 }),
    });
    const before = manifestStateBytes(testing, prepared.state);

    expect(() => testing.publishPreparedManifest(store, prepared.state, prepared.token)).toThrow();
    expect(manifestStateBytes(testing, prepared.state)).toBe(before);
    expect(fs.readFileSync(path.join(stage, 'manifest-g00000.json'))).toEqual(expectedBytes);
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json.part'))).toBe(false);
    expect(events).toContain('unlink:manifest-g00000.json.part');
    expect(events).not.toContain('unlink:manifest-g00000.json');

    forceReleaseManifestStage(parent, stage, tracked);
  });

  it('never deletes a racing foreign part collision', () => {
    const prepared = preparedSeedManifest(testing, 'publisher-part-collision');
    const { parent, stage } = temporaryStage('r7-manifest-part-collision');
    const events = [];
    const tracked = manifestPublicationFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    events.length = 0;
    tracked.arm('openSync', {
      code: 'EEXIST',
      match: (detail) => detail.name === 'manifest-g00000.json.part',
      after: (detail) => fs.writeFileSync(detail.filePath, 'foreign-part', { flag: 'wx', mode: 0o600 }),
    });
    const before = manifestStateBytes(testing, prepared.state);

    expect(() => testing.publishPreparedManifest(store, prepared.state, prepared.token)).toThrow();
    expect(manifestStateBytes(testing, prepared.state)).toBe(before);
    expect(fs.readFileSync(path.join(stage, 'manifest-g00000.json.part'), 'utf8')).toBe('foreign-part');
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json'))).toBe(false);
    expect(events).not.toContain('unlink:manifest-g00000.json.part');

    forceReleaseManifestStage(parent, stage, tracked);
  });

  it('suspends without probing or deleting after a part open has an unknown result', () => {
    const prepared = preparedSeedManifest(testing, 'publisher-part-open-unknown');
    const { parent, stage } = temporaryStage('r7-manifest-part-open-unknown');
    const events = [];
    const tracked = manifestPublicationFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    events.length = 0;
    tracked.arm('openSync', {
      code: 'EIO',
      match: (detail) => detail.name === 'manifest-g00000.json.part',
      after: (detail) => fs.writeFileSync(detail.filePath, 'unknown-open-part', { flag: 'wx', mode: 0o600 }),
    });
    const before = manifestStateBytes(testing, prepared.state);

    expect(() => testing.publishPreparedManifest(store, prepared.state, prepared.token)).toThrow();
    expect(manifestStateBytes(testing, prepared.state)).toBe(before);
    expect(fs.readFileSync(path.join(stage, 'manifest-g00000.json.part'), 'utf8')).toBe('unknown-open-part');
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json'))).toBe(false);
    expect(events).not.toContain('unlink:manifest-g00000.json.part');
    expect(() => store.loadCheckpoint()).toThrow('suspended');

    forceReleaseManifestStage(parent, stage, tracked);
  });

  it('returns the target tip without throwing or rolling back when apply fails after link', () => {
    const prepared = preparedSeedManifest(testing, 'publisher-postlink-apply');
    const { parent, stage } = temporaryStage('r7-manifest-postlink-apply');
    const events = [];
    const tracked = manifestPublicationFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    events.length = 0;
    Object.freeze(prepared.state);

    const result = testing.publishPreparedManifest(store, prepared.state, prepared.token);
    expect(result).toEqual(expect.objectContaining({
      tip: prepared.plan.tip, advanceAllowed: false, clean: false,
    }));
    expect(prepared.state).toEqual(expect.objectContaining({ generation: -1, tip: null }));
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json'))).toBe(true);
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json.part'))).toBe(true);
    expect(events.some((event) => event.startsWith('unlink:manifest-g00000'))).toBe(false);
    expect(result.diagnostics.residue).toContain('manifest-g00000.json.part');
    expect(result.diagnostics.residue).not.toContain('manifest-g00000.json');
    expect(() => testing.publishPreparedManifest(store, prepared.state, prepared.token)).toThrow('suspended');

    forceReleaseManifestStage(parent, stage, tracked);
  });

  it.each([
    ['linked part lstat', 'lstatSync', (detail) => detail.name === 'manifest-g00000.json.part', false],
    ['linked part open', 'openSync', (detail) => detail.name === 'manifest-g00000.json.part'
      && detail.flags === 'r', false],
    ['linked part read', 'readSync', (detail) => detail.record?.name === 'manifest-g00000.json.part', false],
    ['linked part close', 'closeSync', (detail) => detail.record?.name === 'manifest-g00000.json.part'
      && detail.record.flags === 'r', true],
    ['linked final lstat', 'lstatSync', (detail) => detail.name === 'manifest-g00000.json', false],
    ['linked final open', 'openSync', (detail) => detail.name === 'manifest-g00000.json'
      && detail.flags === 'r', false],
    ['linked final read', 'readSync', (detail) => detail.record?.name === 'manifest-g00000.json', false],
    ['linked final close', 'closeSync', (detail) => detail.record?.name === 'manifest-g00000.json'
      && detail.record.flags === 'r', true],
    ['final registration stamp', 'utimesSync', () => true, false],
    ['part alias unlink', 'unlinkSync', (detail) => detail.name === 'manifest-g00000.json.part', false],
  ])('fails soft after commit at %s and never unlinks the final', (label, operation, match, pendingClose) => {
    const prepared = preparedSeedManifest(testing, `publisher-postlink-${label}`);
    const { parent, stage } = temporaryStage(`r7-manifest-postlink-${label}`);
    const events = [];
    const tracked = manifestPublicationFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'create',
      ownerId: 'owner-A',
      fs: manifestFaultAfterLink(tracked, operation, { match }),
    });
    events.length = 0;

    const result = testing.publishPreparedManifest(store, prepared.state, prepared.token);
    expect(result).toEqual(expect.objectContaining({
      tip: prepared.plan.tip, advanceAllowed: false, clean: false,
    }));
    expect(prepared.state).toEqual(expect.objectContaining({ generation: 0, tip: prepared.plan.tip }));
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json'))).toBe(true);
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json.part'))).toBe(true);
    expect(events).not.toContain('unlink:manifest-g00000.json');
    expect(result.diagnostics.residue).toContain('manifest-g00000.json.part');
    expect(result.diagnostics.residue).not.toContain('manifest-g00000.json');
    expect(tracked.openHandles()).toBe(pendingClose ? 1 : 0);
    expect(store.suspend().closeFailed).toBe(false);
    expect(tracked.openHandles()).toBe(0);

    forceReleaseManifestStage(parent, stage, tracked);
  });

  it.each([
    ['linked part', (detail) => detail.record?.name === 'manifest-g00000.json.part'
      && detail.record.flags === 'r'],
    ['linked final', (detail) => detail.record?.name === 'manifest-g00000.json'
      && detail.record.flags === 'r'],
  ])('preserves a persistent %s close marker when suspend cannot drain it', (label, match) => {
    const prepared = preparedSeedManifest(testing, `publisher-persistent-close-${label}`);
    const { parent, stage } = temporaryStage(`r7-manifest-persistent-close-${label}`);
    const events = [];
    const tracked = manifestPublicationFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'create',
      ownerId: 'owner-A',
      fs: manifestFaultAfterLink(tracked, 'closeSync', { match, failures: 2 }),
    });
    events.length = 0;

    const result = testing.publishPreparedManifest(store, prepared.state, prepared.token);
    expect(result).toEqual(expect.objectContaining({ advanceAllowed: false, clean: false }));
    expect(tracked.openHandles()).toBe(1);
    expect(store.suspend().closeFailed).toBe(true);
    expect(tracked.openHandles()).toBe(1);
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json'))).toBe(true);
    expect(events).not.toContain('unlink:manifest-g00000.json');

    forceReleaseManifestStage(parent, stage, tracked);
  });

  it.each([
    ['one-shot', 1, 0, false],
    ['persistent', 2, 1, true],
  ])('direct dispose drains a %s terminal manifest close before teardown', (
    label, failures, remainingHandles, closeFailed,
  ) => {
    const prepared = preparedSeedManifest(testing, `publisher-dispose-close-${label}`);
    const { parent, stage } = temporaryStage(`r7-manifest-dispose-close-${label}`);
    const events = [];
    const tracked = manifestPublicationFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'create',
      ownerId: 'owner-A',
      fs: manifestFaultAfterLink(tracked, 'closeSync', {
        failures,
        match: (detail) => detail.record?.name === 'manifest-g00000.json.part'
          && detail.record.flags === 'r',
      }),
    });
    events.length = 0;

    expect(testing.publishPreparedManifest(store, prepared.state, prepared.token))
      .toEqual(expect.objectContaining({ advanceAllowed: false, clean: false }));
    expect(tracked.openHandles()).toBe(1);
    let disposalError = null;
    try { store.dispose(); } catch (error) { disposalError = error; }
    expect(disposalError).not.toBeNull();
    expect(tracked.openHandles()).toBe(remainingHandles);
    expect(disposalError?.r7CloseFailed === true).toBe(closeFailed);
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json'))).toBe(true);

    forceReleaseManifestStage(parent, stage, tracked);
  });

  it.each([
    ['bounded lstat', (tracked, finalPath) => tracked.arm('lstatSync', {
      match: (detail) => detail.name === path.basename(finalPath),
    }), null],
    ['canonical hash', (tracked, finalPath) => fs.writeFileSync(finalPath, 'corrupt-final'), 'corrupt-final'],
    ['object identity', (tracked, finalPath) => {
      const bytes = fs.readFileSync(finalPath);
      fs.unlinkSync(finalPath);
      fs.writeFileSync(finalPath, bytes, { flag: 'wx', mode: 0o600 });
    }, null],
  ])('fails soft at contracted-final %s after the part is already absent', (label, action, finalText) => {
    const prepared = preparedSeedManifest(testing, `publisher-contracted-${label}`);
    const { parent, stage } = temporaryStage(`r7-manifest-contracted-${label}`);
    const finalPath = path.join(stage, 'manifest-g00000.json');
    const partPath = `${finalPath}.part`;
    const events = [];
    const tracked = manifestPublicationFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'create',
      ownerId: 'owner-A',
      fs: manifestActionAfterAliasContraction(tracked, () => action(tracked, finalPath)),
    });
    events.length = 0;

    const result = testing.publishPreparedManifest(store, prepared.state, prepared.token);
    expect(result).toEqual(expect.objectContaining({
      tip: prepared.plan.tip, advanceAllowed: false, clean: false,
    }));
    expect(prepared.state).toEqual(expect.objectContaining({ generation: 0, tip: prepared.plan.tip }));
    expect(fs.existsSync(partPath)).toBe(false);
    expect(fs.existsSync(finalPath)).toBe(true);
    if (finalText !== null) expect(fs.readFileSync(finalPath, 'utf8')).toBe(finalText);
    expect(events).not.toContain('unlink:manifest-g00000.json');
    expect(result.diagnostics.residue).not.toContain('manifest-g00000.json.part');
    expect(result.diagnostics.residue).not.toContain('manifest-g00000.json');

    forceReleaseManifestStage(parent, stage, tracked);
  });

  it.each([
    ['namespace', (bytes, ownerBytes) => ({ pass: { maximumNamespaceEntries: 3 }, fail: { maximumNamespaceEntries: 2 } })],
    ['manifest bytes', (bytes, ownerBytes) => ({ pass: { manifestBytes: bytes }, fail: { manifestBytes: bytes - 1 } })],
    ['retained bytes', (bytes, ownerBytes) => ({ pass: { retainedManifestBytes: bytes * 2 }, fail: { retainedManifestBytes: bytes * 2 - 1 } })],
    ['auxiliary bytes', (bytes, ownerBytes) => ({
      pass: { auxiliaryBytes: ownerBytes + bytes * 2 },
      fail: { auxiliaryBytes: ownerBytes + bytes * 2 - 1 },
    })],
    ['manifest count', (bytes, ownerBytes) => ({ pass: { maximumManifests: 1 }, fail: { maximumManifests: 0 } })],
  ])('admits %s at equality and rejects plus one before a manifest path opens', (label, limitsFor) => {
    const makePrepared = (suffix) => {
      const state = testing.createManifestState();
      const frontier = Object.freeze({ token: `admission-${label}-${suffix}` });
      const descriptor = manifestDescriptor('r7-f-d00000-g00000', 1, 'ROOT', 'ROOT');
      const plan = testing.planManifestTransition(state, Object.freeze({
        transition: 'seed', previousTip: null, binding: manifestBinding(3), frontier,
      }), manifestCandidate(frontier, descriptor), manifestTotals(8));
      return { state, plan, token: testing.prepareManifestTransitionCommit(state, plan) };
    };
    const ownerBytes = resumableOwnerByteLength(testing);
    const probe = makePrepared('sizing');
    const candidateBytes = testing.preparedManifestTransitionBytes(probe.token).length;
    const matrix = limitsFor(candidateBytes, ownerBytes);

    for (const [verdict, limits] of Object.entries(matrix)) {
      const prepared = verdict === 'pass' ? probe : makePrepared(verdict);
      const { parent, stage } = temporaryStage(`r7-manifest-admit-${label}-${verdict}`);
      const events = [];
      const tracked = manifestPublicationFs(events);
      const store = createResumableEndgameDiskFrontierStore({
        stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam, limits,
      });
      events.length = 0;
      const before = manifestStateBytes(testing, prepared.state);
      if (verdict === 'pass') {
        expect(testing.publishPreparedManifest(store, prepared.state, prepared.token).clean).toBe(true);
        expect(fs.existsSync(path.join(stage, 'manifest-g00000.json'))).toBe(true);
      } else {
        expect(() => testing.publishPreparedManifest(store, prepared.state, prepared.token)).toThrow();
        expect(manifestStateBytes(testing, prepared.state)).toBe(before);
        expect(events.some((event) => event.includes('manifest-g00000'))).toBe(false);
        expect(fs.existsSync(path.join(stage, 'manifest-g00000.json'))).toBe(false);
        expect(fs.existsSync(path.join(stage, 'manifest-g00000.json.part'))).toBe(false);
        expect(() => testing.publishPreparedManifest(store, prepared.state, prepared.token)).toThrow('not owned');
      }
      store.dispose();
      releaseParent(parent, stage);
    }
  });

  it.each([
    ['generation', (state) => { state.generation = 41; }],
    ['tip', (state) => { state.tip = { generation: 0, manifestSha256: 'C'.repeat(64) }; }],
  ])('uses claim as the last prelink gate after manifest I/O %s drift', (label, drift) => {
    const prepared = preparedSeedManifest(testing, `publisher-io-${label}-drift`);
    const { parent, stage } = temporaryStage(`r7-manifest-io-${label}-drift`);
    const events = [];
    const tracked = manifestPublicationFs(events);
    let drifted = false;
    const seam = {
      ...tracked.seam,
      writeSync(...args) {
        const result = tracked.seam.writeSync(...args);
        if (!drifted && events.at(-1)?.startsWith('write:manifest-g00000.json.part:')) {
          drifted = true;
          drift(prepared.state);
        }
        return result;
      },
    };
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: seam,
    });
    events.length = 0;
    expect(() => testing.publishPreparedManifest(store, prepared.state, prepared.token))
      .toThrow('base state is stale');
    expect(drifted).toBe(true);
    expect(prepared.state.generation).toBe(label === 'generation' ? 41 : -1);
    expect(prepared.state.tip).toEqual(label === 'tip'
      ? { generation: 0, manifestSha256: 'C'.repeat(64) }
      : null);
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json'))).toBe(false);
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json.part'))).toBe(false);
    expect(events.some((event) => event.startsWith('link:manifest-g00000'))).toBe(false);
    expect(() => testing.publishPreparedManifest(store, prepared.state, prepared.token)).toThrow('not owned');
    store.dispose();
    releaseParent(parent, stage);
  });

  it.each([
    ['open', 'openSync', (detail) => detail.name === 'manifest-g00000.json.part', false],
    ['write', 'writeSync', (detail) => detail.record?.name === 'manifest-g00000.json.part', false],
    ['fsync', 'fsyncSync', (detail) => detail.record?.name === 'manifest-g00000.json.part', false],
    ['writer close', 'closeSync', (detail) => detail.record?.name === 'manifest-g00000.json.part'
      && detail.record.flags === 'wx', true],
    ['part lstat authentication', 'lstatSync', (detail) => detail.name === 'manifest-g00000.json.part', true],
    ['part read', 'readSync', (detail) => detail.record?.name === 'manifest-g00000.json.part', false],
    ['reader close', 'closeSync', (detail) => detail.record?.name === 'manifest-g00000.json.part'
      && detail.record.flags === 'r', true],
    ['stage stamp', 'utimesSync', () => true, false],
  ])('fails closed at prelink manifest %s without creating a final', (label, operation, match, partRemains) => {
    const prepared = preparedSeedManifest(testing, `publisher-prelink-${label}`);
    const { parent, stage } = temporaryStage(`r7-manifest-prelink-${label}`);
    const events = [];
    const tracked = manifestPublicationFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    events.length = 0;
    tracked.arm(operation, { match });
    const before = manifestStateBytes(testing, prepared.state);
    expect(() => testing.publishPreparedManifest(store, prepared.state, prepared.token)).toThrow();
    expect(manifestStateBytes(testing, prepared.state)).toBe(before);
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json'))).toBe(false);
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json.part'))).toBe(partRemains);
    expect(events.some((event) => event.startsWith('link:manifest-g00000'))).toBe(false);
    expect(() => testing.publishPreparedManifest(store, prepared.state, prepared.token)).toThrow();
    if (partRemains) {
      const suspended = store.suspend();
      if (label.includes('close')) {
        expect(suspended.closeFailed).toBe(false);
        expect(tracked.openHandles()).toBe(0);
        expect(fs.existsSync(path.join(stage, 'manifest-g00000.json.part'))).toBe(false);
      }
      forceReleaseManifestStage(parent, stage, tracked);
    } else {
      store.dispose();
      releaseParent(parent, stage);
    }
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
    let denyWrites = false;
    let readdirCalls = 0;
    const denyWrite = (operation) => {
      if (denyWrites) throw new Error(`resume attempted ${operation}`);
    };
    const seam = {
      openSync(filePath, flags, ...args) {
        if (denyWrites && flags !== 'r') throw new Error(`resume attempted write-capable open ${String(flags)}`);
        return fs.openSync(filePath, flags, ...args);
      },
      mkdirSync(...args) { denyWrite('mkdir'); return fs.mkdirSync(...args); },
      rmdirSync(...args) { denyWrite('rmdir'); return fs.rmdirSync(...args); },
      writeSync(...args) { denyWrite('write'); events.push('write'); return fs.writeSync(...args); },
      fsyncSync(...args) { denyWrite('fsync'); events.push('fsync'); return fs.fsyncSync(...args); },
      linkSync(...args) { denyWrite('link'); events.push('link'); return fs.linkSync(...args); },
      unlinkSync(...args) { denyWrite('unlink'); events.push('unlink'); return fs.unlinkSync(...args); },
      utimesSync(...args) { denyWrite('utimes'); events.push('utimes'); return fs.utimesSync(...args); },
      readdirSync(...args) { readdirCalls += 1; return fs.readdirSync(...args); },
    };
    const created = createResumableEndgameDiskFrontierStore({ stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: seam });
    expect(fs.readdirSync(stage)).toEqual(['owner.json']);
    expect(created.loadCheckpoint()).toEqual(expect.objectContaining({ checkpoint: null, tip: null, advanceAllowed: true }));
    created.suspend();
    expect(events).toEqual(expect.arrayContaining(['write', 'fsync', 'link', 'unlink']));
    events.length = 0;
    readdirCalls = 0;
    denyWrites = true;
    const resumed = createResumableEndgameDiskFrontierStore({ stagePath: stage, mode: 'resume', ownerId: 'owner-A', expectedTip: null, fs: seam });
    expect(readdirCalls).toBe(1);
    expect(resumed.loadCheckpoint().advanceAllowed).toBe(true);
    resumed.suspend();
    expect(readdirCalls).toBe(1);
    expect(events).toEqual([]);
    denyWrites = false;
    created.dispose();
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

  it('enforces the shared auxiliary budget at owner publication and resumable scan boundaries', () => {
    const ownerBytes = Buffer.byteLength(`${testing.canonicalJson({
      schema: 't37-f4e-r7-owner-v1', ownerId: 'owner-A',
    })}\n`);

    const equality = temporaryStage('r7-owner-aux-equality');
    const equalityStore = createResumableEndgameDiskFrontierStore({
      stagePath: equality.stage,
      mode: 'create',
      ownerId: 'owner-A',
      limits: { auxiliaryBytes: ownerBytes * 2 },
    });
    equalityStore.dispose();
    releaseParent(equality.parent, equality.stage);

    const rejected = temporaryStage('r7-owner-aux-rejected');
    let rejectedOpens = 0;
    expect(() => createResumableEndgameDiskFrontierStore({
      stagePath: rejected.stage,
      mode: 'create',
      ownerId: 'owner-A',
      limits: { auxiliaryBytes: ownerBytes * 2 - 1 },
      fs: { openSync(...args) { rejectedOpens += 1; return fs.openSync(...args); } },
    })).toThrow('owner two-alias admission');
    expect(rejectedOpens).toBe(0);
    expect(fs.readdirSync(rejected.stage)).toEqual([]);
    fs.rmdirSync(rejected.stage);
    releaseParent(rejected.parent, rejected.stage);

    const scanned = temporaryStage('r7-owner-aux-scan');
    const creator = createResumableEndgameDiskFrontierStore({
      stagePath: scanned.stage, mode: 'create', ownerId: 'owner-A',
    });
    creator.suspend();
    const ownerPath = path.join(scanned.stage, 'owner.json');
    const ownerPartPath = path.join(scanned.stage, 'owner.json.part');
    fs.linkSync(ownerPath, ownerPartPath);
    const exactResume = createResumableEndgameDiskFrontierStore({
      stagePath: scanned.stage,
      mode: 'resume',
      ownerId: 'owner-A',
      expectedTip: null,
      limits: { auxiliaryBytes: ownerBytes * 2 },
    });
    expect(exactResume.loadCheckpoint().advanceAllowed).toBe(false);
    exactResume.suspend();
    expect(() => createResumableEndgameDiskFrontierStore({
      stagePath: scanned.stage,
      mode: 'resume',
      ownerId: 'owner-A',
      expectedTip: null,
      limits: { auxiliaryBytes: ownerBytes * 2 - 1 },
    })).toThrow('auxiliary bytes exceed the limit');
    expect(() => exactResume.dispose()).not.toThrow();
    expect(fs.existsSync(ownerPartPath)).toBe(false);
    expect(fs.existsSync(ownerPath)).toBe(false);
    expect(fs.existsSync(scanned.stage)).toBe(false);
    releaseParent(scanned.parent, scanned.stage);
  });

  it('refreshes a surviving owner hard-link before a failed mutation stamp and safely retries teardown', () => {
    const { parent, stage } = temporaryStage('r7-owner-alias-teardown-retry');
    const creator = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A',
    });
    creator.suspend();
    const ownerPath = path.join(stage, 'owner.json');
    const ownerPartPath = path.join(stage, 'owner.json.part');
    fs.linkSync(ownerPath, ownerPartPath);
    let failNextUtimes = false;
    const resumed = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'resume',
      ownerId: 'owner-A',
      expectedTip: null,
      fs: {
        utimesSync(...args) {
          if (failNextUtimes) {
            failNextUtimes = false;
            const error = new Error('injected owner-alias teardown utimes fault');
            error.code = 'EIO';
            throw error;
          }
          return fs.utimesSync(...args);
        },
      },
    });
    expect(resumed.loadCheckpoint().advanceAllowed).toBe(false);
    resumed.suspend();
    failNextUtimes = true;

    expect(() => resumed.dispose()).toThrow('owner-alias teardown utimes fault');
    expect(fs.existsSync(ownerPartPath)).toBe(false);
    expect(fs.existsSync(ownerPath)).toBe(true);
    expect(() => resumed.dispose()).not.toThrow();
    expect(fs.existsSync(stage)).toBe(false);
    releaseParent(parent, stage);
  });

  it('retries a pending owner hard-link refresh after a one-shot lstat fault', () => {
    const { parent, stage } = temporaryStage('r7-owner-alias-refresh-retry');
    const creator = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A',
    });
    creator.suspend();
    const ownerPath = path.join(stage, 'owner.json');
    const ownerPartPath = path.join(stage, 'owner.json.part');
    fs.linkSync(ownerPath, ownerPartPath);
    let failOwnerRefreshLstat = false;
    const resumed = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'resume',
      ownerId: 'owner-A',
      expectedTip: null,
      fs: {
        unlinkSync(filePath) {
          const result = fs.unlinkSync(filePath);
          if (String(filePath) === ownerPartPath) failOwnerRefreshLstat = true;
          return result;
        },
        lstatSync(filePath, ...args) {
          if (failOwnerRefreshLstat && String(filePath) === ownerPath) {
            failOwnerRefreshLstat = false;
            const error = new Error('injected owner-alias refresh lstat fault');
            error.code = 'EIO';
            throw error;
          }
          return fs.lstatSync(filePath, ...args);
        },
      },
    });
    resumed.suspend();

    expect(() => resumed.dispose()).toThrow('owner-alias refresh lstat fault');
    expect(fs.existsSync(ownerPartPath)).toBe(false);
    expect(fs.existsSync(ownerPath)).toBe(true);
    expect(() => resumed.dispose()).not.toThrow();
    expect(fs.existsSync(stage)).toBe(false);
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

    const equality = temporaryStage('r7-generation-names-equality');
    const equalityStore = createResumableEndgameDiskFrontierStore({
      stagePath: equality.stage,
      mode: 'create',
      ownerId: 'owner-A',
      limits: { maximumNamespaceEntries: 5 },
    });
    const equalityWriter = equalityStore.createRun('r7-f-d00000-g00000');
    equalityWriter.write('A');
    const equalityRun = equalityWriter.finish();
    expect(fs.readdirSync(equality.stage).sort()).toEqual([
      'owner.json', 'r7-f-d00000-g00000.idx', 'r7-f-d00000-g00000.run',
    ].sort());
    equalityRun.dispose();
    equalityStore.dispose();
    releaseParent(equality.parent, equality.stage);
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

  it('retains and marks a bootstrap descriptor when fstat and its first close both fail', () => {
    const { parent, stage } = temporaryStage('r7-bootstrap-double-close');
    const descriptors = new Map();
    let failRunFstat = false;
    let failRunClose = false;
    const seam = {
      openSync(filePath, flags, ...args) {
        const descriptor = fs.openSync(filePath, flags, ...args);
        descriptors.set(descriptor, { filePath: String(filePath), flags: String(flags) });
        return descriptor;
      },
      fstatSync(descriptor, ...args) {
        if (failRunFstat && descriptors.get(descriptor)?.filePath.endsWith('.run.part')) {
          failRunFstat = false;
          throw new Error('injected bootstrap fstat fault');
        }
        return fs.fstatSync(descriptor, ...args);
      },
      closeSync(descriptor) {
        if (failRunClose && descriptors.get(descriptor)?.filePath.endsWith('.run.part')) {
          failRunClose = false;
          const error = new Error('injected bootstrap close fault');
          error.code = 'EIO';
          throw error;
        }
        const result = fs.closeSync(descriptor);
        descriptors.delete(descriptor);
        return result;
      },
    };
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: seam,
    });
    failRunFstat = true;
    failRunClose = true;
    let failure;
    try { store.createRun('r7-f-d00000-g00000'); } catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(AggregateError);
    expect(failure?.r7CloseFailed).toBe(true);
    expect(descriptors.size).toBe(1);
    expect(store.loadCheckpoint().advanceAllowed).toBe(false);
    expect(store.suspend().closeFailed).toBe(false);
    expect(descriptors.size).toBe(0);
    const residuePath = path.join(stage, 'r7-f-d00000-g00000.run.part');
    expect(fs.existsSync(residuePath)).toBe(true);
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
    expect(() => runStore.createRun('r7-f-d00000-g00000')).toThrow('external inventory drift');
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
    expect(() => indexWriter.finish()).toThrow('external inventory drift');
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

  it('reserves descriptor capacity before open at the exact 4098 pending-close boundary', () => {
    let nextDescriptor = 10_000;
    let openCalls = 0;
    let failClose = true;
    const liveDescriptors = new Set();
    const probe = testing.createDescriptorTrackerProbe({
      openSync() {
        openCalls += 1;
        const descriptor = nextDescriptor;
        nextDescriptor += 1;
        liveDescriptors.add(descriptor);
        return descriptor;
      },
      closeSync(descriptor) {
        if (failClose) {
          const error = new Error(`injected boundary close fault ${descriptor}`);
          error.code = 'EIO';
          throw error;
        }
        liveDescriptors.delete(descriptor);
      },
    });
    const root = path.resolve(os.tmpdir(), 'tetramorph-r7-descriptor-boundary');
    for (let index = 0; index < ENDGAME_DISK_FRONTIER_LIMITS.registryMaxEntries; index += 1) {
      const descriptor = probe.open(path.join(root, `read-${String(index).padStart(4, '0')}.run`), `boundary-${index}`);
      let failure;
      try { probe.close(descriptor); } catch (error) { failure = error; }
      expect(failure?.r7CloseFailed).toBe(true);
    }
    expect(probe.snapshot()).toEqual(expect.objectContaining({
      pending: ENDGAME_DISK_FRONTIER_LIMITS.registryMaxEntries,
      diagnosticsTruncated: false,
    }));
    expect(probe.snapshot().diagnostics).toHaveLength(ENDGAME_DISK_FRONTIER_LIMITS.diagnosticMaxEntries);
    const opensAtEquality = openCalls;
    expect(() => probe.open(path.join(root, 'read-4098.run'), 'boundary-4098')).toThrow('exceeds 4098');
    expect(openCalls).toBe(opensAtEquality);
    expect(liveDescriptors.size).toBe(ENDGAME_DISK_FRONTIER_LIMITS.registryMaxEntries);
    failClose = false;
    expect(probe.drain()).toEqual([]);
    expect(probe.snapshot().pending).toBe(0);
    expect(liveDescriptors.size).toBe(0);
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
    expect(writeCalls).toBe(beforeRejectedWrites.writeCalls);
    expect(openCalls).toBe(beforeRejectedWrites.openCalls + 1);
    expect(fs.readdirSync(stage)).toEqual(['owner.json', 'r7-f-d00000-g00000.run.part']);
    const suspended = store.suspend();
    expect(suspended.diagnostics.cleanupErrors.join('\n')).toContain('owned run cleanup fault');
    expect(fs.readdirSync(stage)).toEqual(['owner.json']);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('propagates a nested abort close marker through index admission cleanup', () => {
    const { parent, stage } = temporaryStage('r7-gate-close-marker');
    const events = [];
    const tracked = closeFailureResumableFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    const writer = store.createRun('r7-f-d00000-g00000');
    tracked.arm({ suffix: '.run.part', flags: 'wx', failures: 1, label: 'gate abort writer' });
    let failure;
    try { testing.probeOwnedCandidateIndex(writer, 536_608_769); } catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(AggregateError);
    expect(failure?.r7CloseFailed).toBe(true);
    expect(tracked.openHandles()).toBe(1);
    expect(store.loadCheckpoint().advanceAllowed).toBe(false);
    expect(store.suspend().closeFailed).toBe(false);
    expect(tracked.openHandles()).toBe(0);
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
    expect(() => writer.finish()).toThrow('hard-link teardown identity drift');
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

  it('admits the incremental owner/index ledger at auxiliary equality and rejects one byte over pre-open', () => {
    const ownerBytes = Buffer.byteLength(`${testing.canonicalJson({
      schema: 't37-f4e-r7-owner-v1', ownerId: 'owner-A',
    })}\n`);
    const indexBytes = testing.indexLayout(1).indexBytes;
    const exactAuxiliaryBytes = ownerBytes + 2 * indexBytes;

    const equality = temporaryStage('r7-index-aux-equality');
    const equalityStore = createResumableEndgameDiskFrontierStore({
      stagePath: equality.stage,
      mode: 'create',
      ownerId: 'owner-A',
      limits: { auxiliaryBytes: exactAuxiliaryBytes },
    });
    const equalityWriter = equalityStore.createRun('r7-f-d00000-g00000');
    equalityWriter.write('A');
    const equalityRun = equalityWriter.finish();
    equalityRun.dispose();
    equalityStore.dispose();
    releaseParent(equality.parent, equality.stage);

    const rejected = temporaryStage('r7-index-aux-rejected');
    const events = [];
    const tracked = trackedResumableFs(events);
    const rejectedStore = createResumableEndgameDiskFrontierStore({
      stagePath: rejected.stage,
      mode: 'create',
      ownerId: 'owner-A',
      fs: tracked.seam,
      limits: { auxiliaryBytes: exactAuxiliaryBytes - 1 },
    });
    events.length = 0;
    const rejectedWriter = rejectedStore.createRun('r7-f-d00000-g00000');
    rejectedWriter.write('A');
    expect(() => rejectedWriter.finish()).toThrow('run index two-alias bytes exceed the auxiliary limit');
    expect(events.some((event) => event.includes('.idx'))).toBe(false);
    expect(events.some((event) => event.startsWith('link:') && event.includes('.run'))).toBe(false);
    expect(fs.readdirSync(rejected.stage)).toEqual(['owner.json']);
    rejectedStore.dispose();
    releaseParent(rejected.parent, rejected.stage);
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

  it('retains a run-part inspect descriptor after close failure and drains it before suspend cleanup', () => {
    const { parent, stage } = temporaryStage('r7-run-inspect-close');
    const events = [];
    const tracked = closeFailureResumableFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    tracked.arm({ suffix: '.run.part', failures: 1, label: 'run-part inspect' });
    let failure;
    try { writer.finish(); } catch (error) { failure = error; }
    expect(failure?.r7CloseFailed).toBe(true);
    expect(tracked.openHandles()).toBe(1);
    const suspendStart = events.length;
    const suspended = store.suspend();
    expect(suspended.closeFailed).toBe(false);
    expect(tracked.openHandles()).toBe(0);
    const suspendEvents = events.slice(suspendStart);
    expect(suspendEvents.indexOf('close:r7-f-d00000-g00000.run.part:r:ok'))
      .toBeLessThan(suspendEvents.indexOf('unlink:r7-f-d00000-g00000.run.part'));
    expect(suspended.diagnostics.cleanupErrors.join('\n')).toContain('run-part inspect close fault');
    expect(fs.readdirSync(stage)).toEqual(['owner.json']);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('retains a bounded index readback descriptor and retries close before any owned unlink', () => {
    const { parent, stage } = temporaryStage('r7-index-readback-close');
    const events = [];
    const tracked = closeFailureResumableFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    tracked.arm({ suffix: '.idx.part', failures: 1, label: 'index readback' });
    let failure;
    try { writer.finish(); } catch (error) { failure = error; }
    expect(failure?.r7CloseFailed).toBe(true);
    expect(tracked.openHandles()).toBe(1);
    const suspendStart = events.length;
    const suspended = store.suspend();
    expect(suspended.closeFailed).toBe(false);
    expect(tracked.openHandles()).toBe(0);
    const suspendEvents = events.slice(suspendStart);
    const retry = suspendEvents.indexOf('close:r7-f-d00000-g00000.idx.part:r:ok');
    const firstUnlink = suspendEvents.findIndex((event) => event.startsWith('unlink:'));
    expect(retry).toBeGreaterThanOrEqual(0);
    expect(retry).toBeLessThan(firstUnlink);
    expect(fs.readdirSync(stage)).toEqual(['owner.json']);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('retains a range-reader descriptor and drains it before disposing the committed run', () => {
    const { parent, stage } = temporaryStage('r7-range-close');
    const events = [];
    const tracked = closeFailureResumableFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    const run = writer.finish();
    tracked.arm({ suffix: '.run', failures: 1, label: 'range reader' });
    let failure;
    try { [...run.values()]; } catch (error) { failure = error; }
    expect(failure?.r7CloseFailed).toBe(true);
    expect(tracked.openHandles()).toBe(1);
    const suspendStart = events.length;
    expect(store.suspend().closeFailed).toBe(false);
    expect(tracked.openHandles()).toBe(0);
    const suspendEvents = events.slice(suspendStart);
    expect(suspendEvents.indexOf('close:r7-f-d00000-g00000.run:r:ok'))
      .toBeLessThan(suspendEvents.indexOf('unlink:r7-f-d00000-g00000.run'));
    expect(fs.readdirSync(stage)).toEqual(['owner.json']);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('reports process-exit-required semantics when the retained descriptor fails again during suspend', () => {
    const { parent, stage } = temporaryStage('r7-persistent-close');
    const events = [];
    const tracked = closeFailureResumableFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    tracked.arm({ suffix: '.run.part', failures: 2, label: 'persistent run readback' });
    let failure;
    try { writer.finish(); } catch (error) { failure = error; }
    expect(failure?.r7CloseFailed).toBe(true);
    const suspended = store.suspend();
    expect(suspended.closeFailed).toBe(true);
    expect(store.suspend().closeFailed).toBe(true);
    expect(tracked.openHandles()).toBe(1);
    expect(fs.readdirSync(stage).sort()).toEqual(['owner.json', 'r7-f-d00000-g00000.run.part'].sort());
    expect(() => store.dispose()).toThrow('pending descriptor close');
    tracked.forceCloseAll();
    for (const name of fs.readdirSync(stage)) fs.unlinkSync(path.join(stage, name));
    fs.rmdirSync(stage);
    releaseParent(parent, stage);
  });

  it('best-effort drains and marks a readback close failure when factory construction has no Store', () => {
    const { parent, stage } = temporaryStage('r7-factory-close');
    const ownerStore = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A',
    });
    ownerStore.suspend();
    const events = [];
    const tracked = closeFailureResumableFs(events);
    tracked.arm({ suffix: 'owner.json', failures: 1, label: 'factory owner readback' });
    let failure;
    try {
      createResumableEndgameDiskFrontierStore({
        stagePath: stage, mode: 'resume', ownerId: 'owner-A', expectedTip: null, fs: tracked.seam,
      });
    } catch (error) { failure = error; }
    expect(failure?.r7CloseFailed).toBe(true);
    expect(tracked.openHandles()).toBe(0);
    expect(events.filter((event) => event === 'close:owner.json:r:ok')).toHaveLength(1);
    ownerStore.dispose();
    releaseParent(parent, stage);
  });

  it('keeps large same-Store chunk and run batches on a constant-scan incremental inventory ledger', () => {
    const { parent, stage } = temporaryStage('r7-incremental-ledger');
    const counted = countedResumableInventoryFs();
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: counted.seam,
    });
    expect(counted.snapshot().readdirSync).toBe(1);
    const authorizationBucketBaseline = testing.authorizationBucketVisits(store);
    counted.reset();

    const totalRuns = 128;
    const runs = [];
    const largeWriter = store.createRun('r7w-l-g00000-d00000-p0000-h0000');
    const beforeChunks = counted.snapshot();
    for (let index = 0; index < 4_096; index += 1) {
      largeWriter.write(`K${String(index).padStart(5, '0')}`);
    }
    expect(counted.snapshot()).toEqual(beforeChunks);
    runs.push(largeWriter.finish());

    for (let index = 1; index < totalRuns; index += 1) {
      const writer = store.createRun(`r7w-l-g00000-d00000-p${String(index).padStart(4, '0')}-h0000`);
      writer.write(`R${String(index).padStart(4, '0')}`);
      runs.push(writer.finish());
    }
    expect(store.diagnostics().activeRuns).toHaveLength(totalRuns);
    const live = counted.snapshot();
    expect(live.readdirSync).toBe(0);
    expect(live.lstatSync).toBeLessThanOrEqual(totalRuns * 8 + 16);
    expect(live.fstatSync).toBeLessThanOrEqual(totalRuns * 7 + 16);
    expect(live.realpathSync).toBeLessThanOrEqual(totalRuns * 5 + 16);

    expect(store.suspend().closeFailed).toBe(false);
    const suspended = counted.snapshot();
    expect(suspended.readdirSync).toBe(0);
    expect(suspended.lstatSync).toBeLessThanOrEqual(totalRuns * 14 + 32);
    expect(suspended.fstatSync).toBeLessThanOrEqual(totalRuns * 7 + 32);
    expect(suspended.realpathSync).toBeLessThanOrEqual(totalRuns * 7 + 24);
    expect(testing.authorizationBucketVisits(store) - authorizationBucketBaseline).toBe(totalRuns);
    store.dispose();
    expect(counted.snapshot().readdirSync).toBe(1);
    expect(testing.authorizationBucketVisits(store) - authorizationBucketBaseline).toBe(totalRuns + 1);
    releaseParent(parent, stage);
  }, 30_000);

  it('deduplicates a committed run hard-link alias while enforcing exact physical byte limits', () => {
    const { parent, stage } = temporaryStage('r7-ledger-hardlink');
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'create',
      ownerId: 'owner-A',
      limits: { recognizedPhysicalRunBytes: 2, uncommittedWorkingRunBytes: 2 },
    });
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    const run = writer.finish();
    expect(run.size).toBe(1);
    expect(fs.readdirSync(stage).sort()).toEqual([
      'owner.json', 'r7-f-d00000-g00000.idx', 'r7-f-d00000-g00000.run',
    ].sort());
    run.dispose();
    const reusedWriter = store.createRun('r7-f-d00000-g00000');
    reusedWriter.write('B');
    const reusedRun = reusedWriter.finish();
    expect([...reusedRun.values()]).toEqual(['B']);
    reusedRun.dispose();
    store.dispose();
    releaseParent(parent, stage);
  });

  it('rescans one external namespace drift and does not rescan again before final teardown', () => {
    const { parent, stage } = temporaryStage('r7-ledger-external');
    const counted = countedResumableInventoryFs();
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: counted.seam,
    });
    counted.reset();
    const foreignPath = path.join(stage, 'foreign.tmp');
    const foreignBytes = Buffer.from('FOREIGN\n', 'ascii');
    fs.writeFileSync(foreignPath, foreignBytes);

    expect(() => store.createRun('r7w-l-g00000-d00000-p0000-h0000')).toThrow('external inventory drift');
    expect(counted.snapshot().readdirSync).toBe(1);
    expect(store.loadCheckpoint().advanceAllowed).toBe(false);
    expect(store.diagnostics().residue).toContain('foreign.tmp');
    expect(store.suspend().diagnostics.residue).toContain('foreign.tmp');
    expect(counted.snapshot().readdirSync).toBe(1);
    expect(fs.readFileSync(foreignPath)).toEqual(foreignBytes);

    fs.unlinkSync(foreignPath);
    store.dispose();
    expect(counted.snapshot().readdirSync).toBe(2);
    releaseParent(parent, stage);
  });

  it('preflights public abort, closes exact-owned state, and preserves the foreign drift evidence', () => {
    const { parent, stage } = temporaryStage('r7-ledger-abort-drift');
    const events = [];
    const tracked = trackedResumableFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    const writer = store.createRun('r7w-l-g00000-d00000-p0000-h0000');
    writer.write('A');
    expect(tracked.openHandles()).toBe(1);
    const foreignPath = path.join(stage, 'foreign.tmp');
    const foreignBytes = Buffer.from('FOREIGN-ABORT\n', 'ascii');
    fs.writeFileSync(foreignPath, foreignBytes);

    expect(() => writer.abort()).toThrow('external inventory drift');
    expect(tracked.openHandles()).toBe(0);
    expect(store.diagnostics().activeRuns).toEqual([]);
    expect(store.loadCheckpoint().advanceAllowed).toBe(false);
    expect(fs.readFileSync(foreignPath)).toEqual(foreignBytes);
    expect(store.suspend().closeFailed).toBe(false);
    expect(fs.readFileSync(foreignPath)).toEqual(foreignBytes);

    fs.unlinkSync(foreignPath);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('propagates a public-abort close marker while suspend retries exact-owned cleanup', () => {
    const { parent, stage } = temporaryStage('r7-ledger-abort-close-drift');
    const events = [];
    const tracked = closeFailureResumableFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    const writer = store.createRun('r7w-l-g00000-d00000-p0000-h0000');
    writer.write('A');
    const foreignPath = path.join(stage, 'foreign.tmp');
    const foreignBytes = Buffer.from('FOREIGN-ABORT-CLOSE\n', 'ascii');
    fs.writeFileSync(foreignPath, foreignBytes);
    tracked.arm({ suffix: '.run.part', flags: 'wx', failures: 1, label: 'public abort writer' });

    let failure;
    try { writer.abort(); } catch (error) { failure = error; }
    expect(failure?.r7CloseFailed).toBe(true);
    expect(tracked.openHandles()).toBe(1);
    expect(fs.readFileSync(foreignPath)).toEqual(foreignBytes);
    const suspended = store.suspend();
    expect(suspended.closeFailed).toBe(false);
    expect(suspended.diagnostics.activeRuns).toEqual([]);
    expect(tracked.openHandles()).toBe(0);
    expect(fs.readFileSync(foreignPath)).toEqual(foreignBytes);

    fs.unlinkSync(foreignPath);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('rescans foreign drift before abort even when the writer was already blocked', () => {
    const { parent, stage } = temporaryStage('r7-ledger-blocked-abort-drift');
    let failWrite = false;
    let readdirCalls = 0;
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'create',
      ownerId: 'owner-A',
      fs: {
        readdirSync(...args) { readdirCalls += 1; return fs.readdirSync(...args); },
        writeSync(descriptor, bytes, offset, length, position) {
          if (failWrite) {
            failWrite = false;
            fs.writeSync(descriptor, bytes, offset, Math.min(1, length), position);
            const error = new Error('injected blocked-abort partial write fault');
            error.code = 'EIO';
            throw error;
          }
          return fs.writeSync(descriptor, bytes, offset, length, position);
        },
      },
    });
    const writer = store.createRun('r7w-l-g00000-d00000-p0000-h0000');
    readdirCalls = 0;
    failWrite = true;
    expect(() => writer.write('A')).toThrow('blocked-abort partial write fault');
    expect(readdirCalls).toBe(1);
    const foreignPath = path.join(stage, 'foreign.tmp');
    const foreignBytes = Buffer.from('FOREIGN-BLOCKED-ABORT\n', 'ascii');
    fs.writeFileSync(foreignPath, foreignBytes);

    expect(() => writer.abort()).toThrow('external inventory drift');
    expect(readdirCalls).toBe(2);
    expect(store.diagnostics().activeRuns).toEqual([]);
    expect(store.diagnostics().residue).toContain('foreign.tmp');
    expect(fs.readFileSync(foreignPath)).toEqual(foreignBytes);
    expect(store.suspend().diagnostics.residue).toContain('foreign.tmp');
    expect(readdirCalls).toBe(2);

    fs.unlinkSync(foreignPath);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('refuses final teardown when the authorized owner is missing', () => {
    const { parent, stage } = temporaryStage('r7-ledger-owner-missing');
    const mutations = [];
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'create',
      ownerId: 'owner-A',
      fs: {
        unlinkSync(...args) { mutations.push('unlink'); return fs.unlinkSync(...args); },
        utimesSync(...args) { mutations.push('utimes'); return fs.utimesSync(...args); },
      },
    });
    mutations.length = 0;
    fs.unlinkSync(path.join(stage, 'owner.json'));

    expect(() => store.dispose()).toThrow('external inventory drift');
    expect(mutations).toEqual([]);
    expect(fs.existsSync(stage)).toBe(true);
    fs.rmdirSync(stage);
    releaseParent(parent, stage);
  });

  it('pins final teardown to the immutable stage root and preserves both renamed namespaces', () => {
    const { parent, stage } = temporaryStage('r7-ledger-stage-replacement');
    const mutations = [];
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'create',
      ownerId: 'owner-A',
      fs: {
        unlinkSync(...args) { mutations.push('unlink'); return fs.unlinkSync(...args); },
        utimesSync(...args) { mutations.push('utimes'); return fs.utimesSync(...args); },
      },
    });
    mutations.length = 0;
    const originalStage = `${stage}-original`;
    fs.renameSync(stage, originalStage);
    fs.mkdirSync(stage);
    const replacementPath = path.join(stage, 'replacement.tmp');
    fs.writeFileSync(replacementPath, 'REPLACEMENT\n', 'ascii');

    expect(() => store.dispose()).toThrow('external inventory drift');
    expect(store.diagnostics().cleanupErrors.join('\n')).toContain('stage root identity drift');
    expect(mutations).toEqual([]);
    expect(fs.readFileSync(replacementPath, 'ascii')).toBe('REPLACEMENT\n');
    expect(fs.existsSync(path.join(originalStage, 'owner.json'))).toBe(true);

    fs.unlinkSync(replacementPath);
    fs.rmdirSync(stage);
    fs.unlinkSync(path.join(originalStage, 'owner.json'));
    fs.rmdirSync(originalStage);
    releaseParent(parent, stage);
  });

  it('latches an exclusive-open race without ever adopting or unlinking the foreign path', () => {
    const { parent, stage } = temporaryStage('r7-ledger-open-race');
    const foreignPath = path.join(stage, 'r7w-l-g00000-d00000-p0000-h0000.run.part');
    const foreignBytes = Buffer.from('FOREIGN-RACE\n', 'ascii');
    let raceOpen = false;
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'create',
      ownerId: 'owner-A',
      fs: {
        openSync(filePath, flags, ...args) {
          if (raceOpen && String(filePath) === foreignPath && flags === 'wx') {
            raceOpen = false;
            fs.writeFileSync(foreignPath, foreignBytes);
          }
          return fs.openSync(filePath, flags, ...args);
        },
      },
    });
    raceOpen = true;
    expect(() => store.createRun('r7w-l-g00000-d00000-p0000-h0000')).toThrow(/EEXIST|exist/u);
    expect(store.loadCheckpoint().advanceAllowed).toBe(false);
    expect(store.suspend().diagnostics.residue).toContain(path.basename(foreignPath));
    expect(fs.readFileSync(foreignPath)).toEqual(foreignBytes);
    fs.unlinkSync(foreignPath);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('detects an in-place same-length owner identity drift even when the namespace is unchanged', () => {
    const { parent, stage } = temporaryStage('r7-ledger-owner-drift');
    const counted = countedResumableInventoryFs();
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: counted.seam,
    });
    counted.reset();
    const ownerPath = path.join(stage, 'owner.json');
    const original = fs.readFileSync(ownerPath);
    const changed = Buffer.from(original.toString('ascii').replace('owner-A', 'owner-B'), 'ascii');
    expect(changed.length).toBe(original.length);
    fs.writeFileSync(ownerPath, changed);

    expect(() => store.loadCheckpoint()).toThrow('external inventory drift');
    expect(counted.snapshot().readdirSync).toBe(1);
    expect(() => store.dispose()).toThrow('external inventory drift');
    expect(fs.readFileSync(ownerPath)).toEqual(changed);
    fs.unlinkSync(ownerPath);
    fs.rmdirSync(stage);
    releaseParent(parent, stage);
  });

  it('rejects changed owner bytes even when the filesystem seam reports the original full identity', () => {
    const { parent, stage } = temporaryStage('r7-ledger-owner-stale-stat');
    const ownerPath = path.join(stage, 'owner.json');
    const descriptors = new Map();
    let originalOwnerStats = null;
    let reportStaleOwnerStats = false;
    let unlinkCalls = 0;
    const seam = {
      openSync(filePath, flags, ...args) {
        const descriptor = fs.openSync(filePath, flags, ...args);
        descriptors.set(descriptor, String(filePath));
        return descriptor;
      },
      closeSync(descriptor) {
        const result = fs.closeSync(descriptor);
        descriptors.delete(descriptor);
        return result;
      },
      lstatSync(filePath, ...args) {
        if (reportStaleOwnerStats && String(filePath) === ownerPath) return originalOwnerStats;
        return fs.lstatSync(filePath, ...args);
      },
      fstatSync(descriptor, ...args) {
        if (reportStaleOwnerStats && descriptors.get(descriptor) === ownerPath) return originalOwnerStats;
        return fs.fstatSync(descriptor, ...args);
      },
      unlinkSync(...args) { unlinkCalls += 1; return fs.unlinkSync(...args); },
    };
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: seam,
    });
    unlinkCalls = 0;
    originalOwnerStats = fs.lstatSync(ownerPath, { bigint: true });
    const original = fs.readFileSync(ownerPath);
    const changed = Buffer.from(original.toString('ascii').replace('owner-A', 'owner-B'), 'ascii');
    expect(changed.length).toBe(original.length);
    fs.writeFileSync(ownerPath, changed);
    reportStaleOwnerStats = true;

    expect(() => store.loadCheckpoint()).toThrow('external inventory drift');
    expect(store.diagnostics().cleanupErrors.join('\n')).toContain('owner bytes drift');
    expect(descriptors.size).toBe(0);
    expect(() => store.dispose()).toThrow('external inventory drift');
    expect(fs.existsSync(stage)).toBe(true);
    expect(fs.readFileSync(ownerPath)).toEqual(changed);
    expect(descriptors.size).toBe(0);
    expect(unlinkCalls).toBe(0);
    reportStaleOwnerStats = false;
    fs.unlinkSync(ownerPath);
    fs.rmdirSync(stage);
    releaseParent(parent, stage);
  });

  it('propagates and retains an owner boundary read close marker until suspend retries it', () => {
    const { parent, stage } = temporaryStage('r7-ledger-owner-boundary-close');
    const events = [];
    const tracked = closeFailureResumableFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    tracked.arm({ suffix: 'owner.json', flags: 'r', failures: 1, label: 'owner boundary read' });
    let failure;
    try { store.loadCheckpoint(); } catch (error) { failure = error; }
    expect(failure?.r7CloseFailed).toBe(true);
    expect(tracked.openHandles()).toBe(1);
    expect(store.diagnostics().cleanupErrors.join('\n')).toContain('owner boundary read close fault');

    expect(store.suspend().closeFailed).toBe(false);
    expect(tracked.openHandles()).toBe(0);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('preserves the owner when its final teardown readback close fails', () => {
    const { parent, stage } = temporaryStage('r7-ledger-owner-final-close');
    const ownerPath = path.join(stage, 'owner.json');
    const descriptors = new Map();
    let armed = false;
    let ownerReadCloses = 0;
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'create',
      ownerId: 'owner-A',
      fs: {
        openSync(filePath, flags, ...args) {
          const descriptor = fs.openSync(filePath, flags, ...args);
          descriptors.set(descriptor, { filePath: String(filePath), flags: String(flags) });
          return descriptor;
        },
        closeSync(descriptor) {
          const record = descriptors.get(descriptor);
          if (armed && record?.filePath === ownerPath && record.flags === 'r') {
            ownerReadCloses += 1;
            if (ownerReadCloses === 1) {
              const error = new Error('injected owner final teardown close fault');
              error.code = 'EIO';
              throw error;
            }
          }
          const result = fs.closeSync(descriptor);
          descriptors.delete(descriptor);
          return result;
        },
      },
    });
    expect(store.suspend().closeFailed).toBe(false);
    armed = true;
    let failure;
    try { store.dispose(); } catch (error) { failure = error; }
    expect(failure?.r7CloseFailed).toBe(true);
    expect(fs.existsSync(ownerPath)).toBe(true);
    expect(fs.existsSync(stage)).toBe(true);
    expect(descriptors.size).toBe(1);

    expect(() => store.dispose()).not.toThrow();
    expect(descriptors.size).toBe(0);
    releaseParent(parent, stage);
  });

  it('never unlinks through a persistent invalidated Store final-read close failure', () => {
    const { parent, stage } = temporaryStage('r7-ledger-owner-final-close-persistent');
    const ownerPath = path.join(stage, 'owner.json');
    const descriptors = new Map();
    let failOwnerClose = false;
    let unlinkCalls = 0;
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'create',
      ownerId: 'owner-A',
      fs: {
        openSync(filePath, flags, ...args) {
          const descriptor = fs.openSync(filePath, flags, ...args);
          descriptors.set(descriptor, String(filePath));
          return descriptor;
        },
        closeSync(descriptor) {
          if (failOwnerClose && descriptors.get(descriptor) === ownerPath) {
            const error = new Error('injected persistent owner final close fault');
            error.code = 'EIO';
            throw error;
          }
          const result = fs.closeSync(descriptor);
          descriptors.delete(descriptor);
          return result;
        },
        unlinkSync(...args) { unlinkCalls += 1; return fs.unlinkSync(...args); },
      },
    });
    expect(store.suspend().closeFailed).toBe(false);
    unlinkCalls = 0;
    failOwnerClose = true;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let failure;
      try { store.dispose(); } catch (error) { failure = error; }
      expect(failure?.r7CloseFailed).toBe(true);
      expect(fs.existsSync(ownerPath)).toBe(true);
      expect(unlinkCalls).toBe(0);
      expect(descriptors.size).toBe(1);
    }

    failOwnerClose = false;
    expect(() => store.dispose()).not.toThrow();
    expect(descriptors.size).toBe(0);
    expect(fs.existsSync(stage)).toBe(false);
    releaseParent(parent, stage);
  });

  it('invalidates after an ambiguous partial write and rescans exactly once on same-Store recovery', () => {
    const { parent, stage } = temporaryStage('r7-ledger-fault-reentry');
    let failWrite = false;
    let failRescan = false;
    let readdirCalls = 0;
    const seam = {
      readdirSync(...args) {
        readdirCalls += 1;
        if (failRescan) {
          failRescan = false;
          const error = new Error('injected inventory rescan fault');
          error.code = 'EIO';
          throw error;
        }
        return fs.readdirSync(...args);
      },
      writeSync(descriptor, bytes, offset, length, position) {
        if (failWrite) {
          failWrite = false;
          fs.writeSync(descriptor, bytes, offset, Math.min(1, length), position);
          const error = new Error('injected partial run write fault');
          error.code = 'EIO';
          throw error;
        }
        return fs.writeSync(descriptor, bytes, offset, length, position);
      },
    };
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: seam,
    });
    const writer = store.createRun('r7w-l-g00000-d00000-p0000-h0000');
    readdirCalls = 0;
    failWrite = true;
    failRescan = true;
    expect(() => writer.write('A')).toThrow('partial run write fault');
    expect(readdirCalls).toBe(1);

    expect(store.loadCheckpoint().advanceAllowed).toBe(false);
    expect(readdirCalls).toBe(2);
    expect(store.diagnostics().cleanupErrors.join('\n')).toContain('inventory rescan fault');
    expect(store.diagnostics().cleanupErrors.join('\n')).toContain('partial run write fault');
    expect(readdirCalls).toBe(2);
    expect(store.suspend().closeFailed).toBe(false);
    expect(readdirCalls).toBe(2);
    store.dispose();
    expect(readdirCalls).toBe(3);
    releaseParent(parent, stage);
  });

  it('keeps a resumed Store unarmed after its first mutation stamp fails', () => {
    const { parent, stage } = temporaryStage('r7-ledger-resume-utimes-fault');
    const creator = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A',
    });
    creator.suspend();
    let failNextUtimes = true;
    let utimesCalls = 0;
    let readdirCalls = 0;
    const resumed = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'resume',
      ownerId: 'owner-A',
      expectedTip: null,
      fs: {
        readdirSync(...args) { readdirCalls += 1; return fs.readdirSync(...args); },
        utimesSync(...args) {
          utimesCalls += 1;
          if (failNextUtimes) {
            failNextUtimes = false;
            const error = new Error('injected first mutation utimes fault');
            error.code = 'EIO';
            throw error;
          }
          return fs.utimesSync(...args);
        },
      },
    });
    readdirCalls = 0;
    utimesCalls = 0;

    expect(() => resumed.createRun('r7w-l-g00000-d00000-p0000-h0000'))
      .toThrow('external inventory drift');
    expect({ readdirCalls, utimesCalls }).toEqual({ readdirCalls: 1, utimesCalls: 1 });
    expect(resumed.loadCheckpoint().advanceAllowed).toBe(false);
    resumed.diagnostics();
    expect(resumed.suspend().closeFailed).toBe(false);
    expect({ readdirCalls, utimesCalls }).toEqual({ readdirCalls: 1, utimesCalls: 1 });

    creator.dispose();
    releaseParent(parent, stage);
  });

  it('bounds persistent inventory rescan failure to one latch attempt and one public recovery', () => {
    const { parent, stage } = temporaryStage('r7-ledger-terminal-recovery');
    let failWrite = false;
    let failReaddir = false;
    let readdirCalls = 0;
    let utimesCalls = 0;
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'create',
      ownerId: 'owner-A',
      fs: {
        readdirSync(...args) {
          readdirCalls += 1;
          if (failReaddir) {
            const error = new Error('injected persistent inventory rescan fault');
            error.code = 'EIO';
            throw error;
          }
          return fs.readdirSync(...args);
        },
        utimesSync(...args) { utimesCalls += 1; return fs.utimesSync(...args); },
        writeSync(descriptor, bytes, offset, length, position) {
          if (failWrite) {
            failWrite = false;
            fs.writeSync(descriptor, bytes, offset, Math.min(1, length), position);
            const error = new Error('injected terminal partial write fault');
            error.code = 'EIO';
            throw error;
          }
          return fs.writeSync(descriptor, bytes, offset, length, position);
        },
      },
    });
    const writer = store.createRun('r7w-l-g00000-d00000-p0000-h0000');
    readdirCalls = 0;
    utimesCalls = 0;
    failWrite = true;
    failReaddir = true;

    expect(() => writer.write('A')).toThrow('terminal partial write fault');
    expect(readdirCalls).toBe(1);
    expect(() => store.loadCheckpoint()).toThrow('persistent inventory rescan fault');
    expect(readdirCalls).toBe(2);
    expect(() => store.loadCheckpoint()).toThrow('inventory recovery attempts are exhausted');
    store.diagnostics();
    expect(store.suspend().closeFailed).toBe(false);
    expect({ readdirCalls, utimesCalls }).toEqual({ readdirCalls: 2, utimesCalls: 0 });

    failReaddir = false;
    store.dispose();
    expect(readdirCalls).toBe(3);
    releaseParent(parent, stage);
  });

  it('suspend exact-cleans a finished run after terminal recovery without touching foreign residue', () => {
    const { parent, stage } = temporaryStage('r7-ledger-terminal-finished-run');
    let failReaddir = false;
    let readdirCalls = 0;
    let utimesCalls = 0;
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'create',
      ownerId: 'owner-A',
      fs: {
        readdirSync(...args) {
          readdirCalls += 1;
          if (failReaddir) {
            const error = new Error('injected finished-run inventory rescan fault');
            error.code = 'EIO';
            throw error;
          }
          return fs.readdirSync(...args);
        },
        utimesSync(...args) { utimesCalls += 1; return fs.utimesSync(...args); },
      },
    });
    const writer = store.createRun('r7w-l-g00000-d00000-p0000-h0000');
    writer.write('A');
    const run = writer.finish();
    const runPath = path.join(stage, `${run.id}.run.part`);
    const foreignPath = path.join(stage, 'foreign.tmp');
    const foreignBytes = Buffer.from('FOREIGN-TERMINAL-RUN\n', 'ascii');
    fs.writeFileSync(foreignPath, foreignBytes);
    readdirCalls = 0;
    utimesCalls = 0;
    failReaddir = true;

    expect(() => store.loadCheckpoint()).toThrow('external inventory drift');
    expect(readdirCalls).toBe(1);
    expect(() => store.loadCheckpoint()).toThrow('finished-run inventory rescan fault');
    expect(readdirCalls).toBe(2);
    const suspended = store.suspend();
    expect(suspended.closeFailed).toBe(false);
    expect(suspended.diagnostics.activeRuns).toEqual([]);
    expect({ readdirCalls, utimesCalls }).toEqual({ readdirCalls: 2, utimesCalls: 0 });
    expect(fs.existsSync(runPath)).toBe(false);
    expect(fs.readFileSync(foreignPath)).toEqual(foreignBytes);

    failReaddir = false;
    fs.unlinkSync(foreignPath);
    store.dispose();
    expect(readdirCalls).toBe(3);
    releaseParent(parent, stage);
  });

  it('direct Store disposal exact-cleans and tears down after terminal recovery while preserving the primary', () => {
    const { parent, stage } = temporaryStage('r7-ledger-terminal-direct-dispose');
    let failReaddir = false;
    let readdirCalls = 0;
    let utimesCalls = 0;
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'create',
      ownerId: 'owner-A',
      fs: {
        readdirSync(...args) {
          readdirCalls += 1;
          if (failReaddir) {
            const error = new Error('injected direct-dispose inventory rescan fault');
            error.code = 'EIO';
            throw error;
          }
          return fs.readdirSync(...args);
        },
        utimesSync(...args) { utimesCalls += 1; return fs.utimesSync(...args); },
      },
    });
    const writer = store.createRun('r7w-l-g00000-d00000-p0000-h0000');
    writer.write('A');
    const run = writer.finish();
    const runPath = path.join(stage, `${run.id}.run.part`);
    const foreignPath = path.join(stage, 'foreign.tmp');
    fs.writeFileSync(foreignPath, 'FOREIGN-DIRECT-DISPOSE\n', 'ascii');
    readdirCalls = 0;
    utimesCalls = 0;
    failReaddir = true;

    expect(() => store.loadCheckpoint()).toThrow('external inventory drift');
    expect(() => store.loadCheckpoint()).toThrow('direct-dispose inventory rescan fault');
    expect(readdirCalls).toBe(2);
    failReaddir = false;
    fs.unlinkSync(foreignPath);
    let failure;
    try { store.dispose(); } catch (error) { failure = error; }
    expect(failure?.message).toContain('inventory recovery attempts are exhausted');
    expect(store.diagnostics().activeRuns).toEqual([]);
    expect(fs.existsSync(runPath)).toBe(false);
    expect(fs.existsSync(stage)).toBe(false);
    expect({ readdirCalls, utimesCalls }).toEqual({ readdirCalls: 3, utimesCalls: 0 });
    expect(() => store.dispose()).not.toThrow();
    releaseParent(parent, stage);
  });

  it('direct Store disposal cleans exact-owned runs but retains an unresolved foreign namespace', () => {
    const { parent, stage } = temporaryStage('r7-ledger-foreign-direct-dispose');
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A',
    });
    const writer = store.createRun('r7w-l-g00000-d00000-p0000-h0000');
    writer.write('A');
    const run = writer.finish();
    const runPath = path.join(stage, `${run.id}.run.part`);
    const ownerPath = path.join(stage, 'owner.json');
    const foreignPath = path.join(stage, 'foreign.tmp');
    const foreignBytes = Buffer.from('FOREIGN-DIRECT\n', 'ascii');
    fs.writeFileSync(foreignPath, foreignBytes);

    expect(() => store.dispose()).toThrow('external inventory drift');
    expect(store.diagnostics().activeRuns).toEqual([]);
    expect(fs.existsSync(runPath)).toBe(false);
    expect(fs.existsSync(ownerPath)).toBe(true);
    expect(fs.readFileSync(foreignPath)).toEqual(foreignBytes);

    fs.unlinkSync(foreignPath);
    expect(() => store.dispose()).toThrow('external inventory drift');
    expect(fs.existsSync(stage)).toBe(false);
    expect(() => store.dispose()).not.toThrow();
    releaseParent(parent, stage);
  });

  for (const failedSuffix of ['.idx', '.run']) {
    it(`retries only the remaining committed artifact after a one-shot ${failedSuffix} unlink fault`, () => {
      const { parent, stage } = temporaryStage(`r7-ledger-partial-dispose-${failedSuffix.slice(1)}`);
      let failNextUnlink = false;
      const store = createResumableEndgameDiskFrontierStore({
        stagePath: stage,
        mode: 'create',
        ownerId: 'owner-A',
        fs: {
          unlinkSync(filePath) {
            if (failNextUnlink && String(filePath).endsWith(failedSuffix)) {
              failNextUnlink = false;
              const error = new Error(`injected ${failedSuffix} partial disposal fault`);
              error.code = 'EIO';
              throw error;
            }
            return fs.unlinkSync(filePath);
          },
        },
      });
      const writer = store.createRun('r7-f-d00000-g00000');
      writer.write('A');
      const run = writer.finish();
      const failedPath = path.join(stage, `${run.id}${failedSuffix}`);
      const releasedSuffix = failedSuffix === '.idx' ? '.run' : '.idx';
      const releasedPath = path.join(stage, `${run.id}${releasedSuffix}`);
      failNextUnlink = true;

      expect(() => run.dispose()).toThrow(`injected ${failedSuffix} partial disposal fault`);
      expect(fs.existsSync(failedPath)).toBe(true);
      expect(fs.existsSync(releasedPath)).toBe(false);
      expect(store.diagnostics().activeRuns).toEqual([run.id]);
      expect(() => run.dispose()).not.toThrow();
      expect(store.diagnostics().activeRuns).toEqual([]);
      expect(fs.existsSync(failedPath)).toBe(false);
      expect(store.suspend().closeFailed).toBe(false);
      store.dispose();
      releaseParent(parent, stage);
    });
  }

  it('does not strand an open writer after a post-unlink mutation-stamp fault', () => {
    const { parent, stage } = temporaryStage('r7-ledger-writer-post-unlink-stamp');
    let failNextUtimes = false;
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'create',
      ownerId: 'owner-A',
      fs: {
        utimesSync(...args) {
          if (failNextUtimes) {
            failNextUtimes = false;
            const error = new Error('injected writer post-unlink utimes fault');
            error.code = 'EIO';
            throw error;
          }
          return fs.utimesSync(...args);
        },
      },
    });
    const writer = store.createRun('r7w-l-g00000-d00000-p0000-h0000');
    writer.write('A');
    const runPath = path.join(stage, 'r7w-l-g00000-d00000-p0000-h0000.run.part');
    failNextUtimes = true;

    expect(() => writer.abort()).toThrow('writer post-unlink utimes fault');
    expect(fs.existsSync(runPath)).toBe(false);
    expect(store.diagnostics().activeRuns).toEqual([]);
    expect(store.suspend().diagnostics.activeRuns).toEqual([]);
    expect(() => writer.abort()).not.toThrow();
    store.dispose();
    releaseParent(parent, stage);
  });

  it('does not strand a finished run after a post-unlink mutation-stamp fault', () => {
    const { parent, stage } = temporaryStage('r7-ledger-run-post-unlink-stamp');
    let failNextUtimes = false;
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'create',
      ownerId: 'owner-A',
      fs: {
        utimesSync(...args) {
          if (failNextUtimes) {
            failNextUtimes = false;
            const error = new Error('injected run post-unlink utimes fault');
            error.code = 'EIO';
            throw error;
          }
          return fs.utimesSync(...args);
        },
      },
    });
    const writer = store.createRun('r7w-l-g00000-d00000-p0000-h0000');
    writer.write('A');
    const run = writer.finish();
    const runPath = path.join(stage, `${run.id}.run.part`);
    failNextUtimes = true;

    expect(() => run.dispose()).toThrow('run post-unlink utimes fault');
    expect(fs.existsSync(runPath)).toBe(false);
    expect(store.diagnostics().activeRuns).toEqual([]);
    expect(() => run.dispose()).not.toThrow();
    expect(store.suspend().diagnostics.activeRuns).toEqual([]);
    store.dispose();
    releaseParent(parent, stage);
  });

  for (const { phase, target } of [
    { phase: 'run-final registration', target: 1 },
    { phase: 'index-part registration', target: 3 },
    { phase: 'index-final registration', target: 4 },
  ]) {
    it(`keeps ${phase} in exact cleanup membership before its mutation stamp`, () => {
      const { parent, stage } = temporaryStage(`r7-ledger-${phase.replaceAll(' ', '-')}-stamp`);
      let armed = false;
      let finishUtimesCalls = 0;
      const store = createResumableEndgameDiskFrontierStore({
        stagePath: stage,
        mode: 'create',
        ownerId: 'owner-A',
        fs: {
          utimesSync(...args) {
            if (armed) {
              finishUtimesCalls += 1;
              if (finishUtimesCalls === target) {
                const error = new Error(`injected ${phase} utimes fault`);
                error.code = 'EIO';
                throw error;
              }
            }
            return fs.utimesSync(...args);
          },
        },
      });
      const writer = store.createRun('r7-f-d00000-g00000');
      writer.write('A');
      armed = true;

      expect(() => writer.finish()).toThrow(`injected ${phase} utimes fault`);
      expect(finishUtimesCalls).toBe(target);
      const suspended = store.suspend();
      expect(suspended.closeFailed).toBe(false);
      expect(suspended.diagnostics.activeRuns).toEqual([]);
      expect(fs.readdirSync(stage)).toEqual(['owner.json']);
      store.dispose();
      releaseParent(parent, stage);
    });
  }

  for (const injectedFailures of [1, 2]) {
    it(`cleans an authenticated bootstrap run part after ${injectedFailures} registration stamp fault(s)`, () => {
    const { parent, stage } = temporaryStage(`r7-ledger-bootstrap-registration-stamp-${injectedFailures}`);
    let remainingUtimesFailures = 0;
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'create',
      ownerId: 'owner-A',
      fs: {
        utimesSync(...args) {
          if (remainingUtimesFailures > 0) {
            remainingUtimesFailures -= 1;
            const error = new Error('injected bootstrap registration utimes fault');
            error.code = 'EIO';
            throw error;
          }
          return fs.utimesSync(...args);
        },
      },
    });
    remainingUtimesFailures = injectedFailures;

    expect(() => store.createRun('r7w-l-g00000-d00000-p0000-h0000'))
      .toThrow('bootstrap registration utimes fault');
    expect(store.diagnostics().activeRuns).toEqual([]);
    expect(fs.readdirSync(stage)).toEqual(['owner.json']);
    expect(store.suspend().diagnostics.activeRuns).toEqual([]);
    store.dispose();
    releaseParent(parent, stage);
    });
  }

  it('suspend retries a bootstrap orphan after registration stamp and descriptor close both fail', () => {
    const { parent, stage } = temporaryStage('r7-ledger-bootstrap-orphan-close');
    let failNextUtimes = false;
    let failNextClose = false;
    const descriptors = new Map();
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'create',
      ownerId: 'owner-A',
      fs: {
        openSync(filePath, flags, ...args) {
          const descriptor = fs.openSync(filePath, flags, ...args);
          descriptors.set(descriptor, String(filePath));
          return descriptor;
        },
        closeSync(descriptor) {
          if (failNextClose && descriptors.get(descriptor)?.endsWith('.run.part')) {
            failNextClose = false;
            const error = new Error('injected bootstrap descriptor close fault');
            error.code = 'EIO';
            throw error;
          }
          const result = fs.closeSync(descriptor);
          descriptors.delete(descriptor);
          return result;
        },
        utimesSync(...args) {
          if (failNextUtimes) {
            failNextUtimes = false;
            const error = new Error('injected bootstrap orphan utimes fault');
            error.code = 'EIO';
            throw error;
          }
          return fs.utimesSync(...args);
        },
      },
    });
    failNextUtimes = true;
    failNextClose = true;
    let failure;
    try { store.createRun('r7w-l-g00000-d00000-p0000-h0000'); } catch (error) { failure = error; }
    expect(failure?.r7CloseFailed).toBe(true);
    expect(fs.readdirSync(stage).sort()).toEqual([
      'owner.json', 'r7w-l-g00000-d00000-p0000-h0000.run.part',
    ].sort());

    const suspended = store.suspend();
    expect(suspended.closeFailed).toBe(false);
    expect(suspended.diagnostics.activeRuns).toEqual([]);
    expect(fs.readdirSync(stage)).toEqual(['owner.json']);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('direct live Store disposal drains a one-shot pending writer close and converges', () => {
    const { parent, stage } = temporaryStage('r7-ledger-direct-dispose-close-retry');
    const events = [];
    const tracked = closeFailureResumableFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    const writer = store.createRun('r7w-l-g00000-d00000-p0000-h0000');
    writer.write('A');
    tracked.arm({ suffix: '.run.part', flags: 'wx', failures: 1, label: 'direct dispose writer' });
    let abortFailure;
    try { writer.abort(); } catch (error) { abortFailure = error; }
    expect(abortFailure?.r7CloseFailed).toBe(true);
    expect(tracked.openHandles()).toBe(1);

    expect(() => store.dispose()).not.toThrow();
    expect(tracked.openHandles()).toBe(0);
    expect(fs.existsSync(stage)).toBe(false);
    releaseParent(parent, stage);
  });

  it('direct live Store disposal preserves a path when its pending close still fails', () => {
    const { parent, stage } = temporaryStage('r7-ledger-direct-dispose-close-persistent');
    const events = [];
    const tracked = closeFailureResumableFs(events);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: tracked.seam,
    });
    const id = 'r7w-l-g00000-d00000-p0000-h0000';
    const runPath = path.join(stage, `${id}.run.part`);
    const writer = store.createRun(id);
    writer.write('A');
    tracked.arm({ suffix: '.run.part', flags: 'wx', failures: 3, label: 'persistent direct dispose writer' });
    let abortFailure;
    try { writer.abort(); } catch (error) { abortFailure = error; }
    expect(abortFailure?.r7CloseFailed).toBe(true);
    events.length = 0;
    let disposeFailure;
    try { store.dispose(); } catch (error) { disposeFailure = error; }
    expect(disposeFailure?.r7CloseFailed).toBe(true);
    expect(fs.existsSync(runPath)).toBe(true);
    expect(events.some((event) => event === `unlink:${id}.run.part`)).toBe(false);

    tracked.forceCloseAll();
    fs.unlinkSync(runPath);
    fs.unlinkSync(path.join(stage, 'owner.json'));
    fs.rmdirSync(stage);
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

describe('R7 same-Store seed and unit checkpoint publication', () => {
  const directBinding = (optimalLocks = 4, initialFrontierKey = 'A') => Object.freeze({
    schema: 't37-f4e-r7-proof-binding-v1',
    levelId: 't3r-shaft-01',
    candidateCommandStream: 'S',
    optimalLocks,
    initialStateHash: '00000000',
    initialFrontierKey,
  });

  it('advances real Core through seed and one unit without charging the old active run as working bytes', () => {
    const { parent, stage } = temporaryStage('r7-product-seed-unit');
    const counted = countedResumableInventoryFs();
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: counted.seam,
    });
    expect(counted.snapshot().readdirSync).toBe(1);
    const definition = ENDGAME_V3_INTRO_DRAFTS[0];
    const route = intro01.optimalRoute;

    const seeded = advanceOptimalEndgameRouteProofForDefinition(definition, route, store);
    expect(seeded).toMatchObject({ status: 'searching', generation: 0, depth: 0, parentOffset: 0, advanceAllowed: true });
    const seedManifest = JSON.parse(fs.readFileSync(path.join(stage, 'manifest-g00000.json'), 'utf8'));
    expect(seedManifest.transition).toBe('seed');
    expect(seedManifest.resourceTotalsBeforeManifest.latestCheckpointRunBytes).toBeGreaterThan(0);
    expect(seedManifest.resourceTotalsBeforeManifest.uncommittedWorkingRunBytes)
      .toBe(seedManifest.resourceTotalsBeforeManifest.latestCheckpointRunBytes);
    expect(seedManifest.resourceTotalsBeforeManifest.recognizedPhysicalRunBytes)
      .toBe(seedManifest.resourceTotalsBeforeManifest.latestCheckpointRunBytes);

    const unit = advanceOptimalEndgameRouteProofForDefinition(definition, route, store);
    expect(unit).toMatchObject({ status: 'searching', generation: 1, depth: 0, parentOffset: 1, advanceAllowed: true });
    const unitManifest = JSON.parse(fs.readFileSync(path.join(stage, 'manifest-g00001.json'), 'utf8'));
    expect(unitManifest.transition).toBe('unit');
    expect(unitManifest.resourceTotalsBeforeManifest.uncommittedWorkingRunBytes).toBeGreaterThan(0);
    expect(unitManifest.resourceTotalsBeforeManifest.uncommittedWorkingRunBytes)
      .toBeLessThan(unitManifest.resourceTotalsBeforeManifest.recognizedPhysicalRunBytes);
    expect(unitManifest.resourceTotalsBeforeManifest.latestCheckpointRunBytes)
      .toBe(unitManifest.resourceTotalsBeforeManifest.recognizedPhysicalRunBytes);

    const loaded = store.loadCheckpoint();
    expect(loaded.tip).toEqual(unit.tip);
    expect(loaded.checkpoint).toMatchObject({
      kind: 'searching', generation: 1, depth: 0, parentOffset: 1,
    });
    expect(loaded.checkpoint.nextRuns.count).toBe(1);
    expect(counted.snapshot().readdirSync).toBe(1);
    const members = loaded.checkpoint.nextRuns.open({ startIndex: 0, endIndex: 1 });
    expect(members).toHaveLength(1);
    expect(() => loaded.checkpoint.nextRuns.open({ startIndex: 0, endIndex: 1 })).toThrow('open batch');
    expect([...members[0].values()]).toHaveLength(34);
    store.releaseCheckpointRun(members[0]);
    expect(() => loaded.checkpoint.nextRuns.open({ startIndex: 1, endIndex: 1 })).toThrow('nonempty');
    store.releaseCheckpointRun(loaded.checkpoint.frontier);
    const suspended = store.suspend();
    expect(suspended.closeFailed).toBe(false);
    expect(() => loaded.checkpoint.nextRuns.open({ startIndex: 0, endIndex: 0 })).toThrow('invalidated');
    store.dispose();
    releaseParent(parent, stage);
  }, 30_000);

  it('cleans an owned candidate exactly when manifest planning fails before commit', () => {
    const { parent, stage } = temporaryStage('r7-product-precommit-clean');
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A',
    });
    expect(store.loadCheckpoint().checkpoint).toBeNull();
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    const frontier = writer.finish();
    expect(() => store.publishCheckpoint(Object.freeze({
      transition: 'seed', previousTip: null, binding: directBinding(4, 'B'), frontier,
    }))).toThrow('does not match');
    expect(fs.readdirSync(stage)).toEqual(['owner.json']);
    expect(() => store.loadCheckpoint()).toThrow('already outstanding');
    store.suspend();
    store.dispose();
    releaseParent(parent, stage);
  });

  it('closes a candidate reader and cleans its files when ownership preparation fails', () => {
    const { parent, stage } = temporaryStage('r7-product-candidate-reader-clean');
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A',
    });
    store.loadCheckpoint();
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    const frontier = writer.finish();
    const reader = frontier.values();
    expect(() => store.publishCheckpoint(Object.freeze({
      transition: 'seed', previousTip: null, binding: directBinding(), frontier,
    }))).toThrow('active reader');
    expect(reader.next().done).toBe(true);
    expect(fs.readdirSync(stage)).toEqual(['owner.json']);
    expect(() => store.loadCheckpoint()).toThrow('already outstanding');
    store.suspend();
    store.dispose();
    releaseParent(parent, stage);
  });

  it('rolls back a prelink ownership claim and lets suspend retry an exact candidate cleanup fault', () => {
    const { parent, stage } = temporaryStage('r7-product-prelink-clean-retry');
    let failManifestLink = false;
    let failCandidateUnlink = false;
    const seam = {
      linkSync(source, finalPath) {
        if (failManifestLink && path.basename(String(finalPath)) === 'manifest-g00000.json') {
          const error = new Error('injected prelink manifest failure');
          error.code = 'ENOSPC';
          throw error;
        }
        return fs.linkSync(source, finalPath);
      },
      unlinkSync(filePath) {
        if (failCandidateUnlink && path.basename(String(filePath)) === 'r7-f-d00000-g00000.run') {
          failCandidateUnlink = false;
          const error = new Error('injected candidate cleanup fault');
          error.code = 'EIO';
          throw error;
        }
        return fs.unlinkSync(filePath);
      },
    };
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: seam,
    });
    store.loadCheckpoint();
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    const frontier = writer.finish();
    failManifestLink = true;
    failCandidateUnlink = true;
    expect(() => store.publishCheckpoint(Object.freeze({
      transition: 'seed', previousTip: null, binding: directBinding(), frontier,
    }))).toThrow('injected prelink manifest failure');
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json'))).toBe(false);
    expect(fs.existsSync(path.join(stage, 'r7-f-d00000-g00000.run'))).toBe(true);
    expect(fs.existsSync(path.join(stage, 'r7-f-d00000-g00000.idx'))).toBe(false);
    expect(() => store.loadCheckpoint()).toThrow('already outstanding');
    store.suspend();
    expect(fs.existsSync(path.join(stage, 'r7-f-d00000-g00000.run'))).toBe(false);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('publishes a final-decision unit without a candidate and records zero working run bytes', () => {
    const { parent, stage } = temporaryStage('r7-product-null-unit');
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A',
    });
    expect(store.loadCheckpoint().checkpoint).toBeNull();
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    const frontier = writer.finish();
    const seed = store.publishCheckpoint(Object.freeze({
      transition: 'seed', previousTip: null, binding: directBinding(2), frontier,
    }));
    const loaded = store.loadCheckpoint();
    store.releaseCheckpointRun(loaded.checkpoint.frontier);
    const unit = store.publishCheckpoint(Object.freeze({
      transition: 'unit',
      previousTip: seed.tip,
      parentOffset: 1,
      lastProcessedParentKey: 'A',
      transitionsDelta: 1,
      boundPrunesDelta: 0,
      nextRun: null,
    }));
    expect(unit).toMatchObject({ advanceAllowed: true, tip: { generation: 1 } });
    const manifest = JSON.parse(fs.readFileSync(path.join(stage, 'manifest-g00001.json'), 'utf8'));
    expect(manifest.resourceTotalsBeforeManifest.uncommittedWorkingRunBytes).toBe(0);
    expect(manifest.resourceTotalsBeforeManifest.latestCheckpointRunBytes)
      .toBe(manifest.resourceTotalsBeforeManifest.recognizedPhysicalRunBytes);
    const after = store.loadCheckpoint();
    expect(after.checkpoint.nextRuns.count).toBe(0);
    store.releaseCheckpointRun(after.checkpoint.frontier);
    store.suspend();
    store.dispose();
    releaseParent(parent, stage);
  });

  it('rejects same-Store load when a cached active index identity changes in place', () => {
    const { parent, stage } = temporaryStage('r7-product-active-identity');
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A',
    });
    store.loadCheckpoint();
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    const frontier = writer.finish();
    store.publishCheckpoint(Object.freeze({
      transition: 'seed', previousTip: null, binding: directBinding(), frontier,
    }));
    const indexPath = path.join(stage, 'r7-f-d00000-g00000.idx');
    const corrupt = fs.readFileSync(indexPath);
    corrupt[0] ^= 0x01;
    fs.writeFileSync(indexPath, corrupt);
    expect(() => store.loadCheckpoint()).toThrow('external inventory drift before checkpoint active identity');
    expect(store.diagnostics().cleanupErrors.join('\n')).toContain('cached committed index identity drift');
    store.suspend();
    for (const name of fs.readdirSync(stage)) fs.unlinkSync(path.join(stage, name));
    fs.rmdirSync(stage);
    releaseParent(parent, stage);
  });

  it('promotes the candidate before suspend when manifest alias contraction fails after commit', () => {
    const { parent, stage } = temporaryStage('r7-product-postcommit-preserve');
    let failManifestPartUnlink = false;
    const seam = {
      unlinkSync(filePath) {
        if (failManifestPartUnlink && path.basename(String(filePath)) === 'manifest-g00000.json.part') {
          failManifestPartUnlink = false;
          const error = new Error('injected manifest alias contraction fault');
          error.code = 'EIO';
          throw error;
        }
        return fs.unlinkSync(filePath);
      },
    };
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: seam,
    });
    store.loadCheckpoint();
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    const frontier = writer.finish();
    failManifestPartUnlink = true;
    const result = store.publishCheckpoint(Object.freeze({
      transition: 'seed', previousTip: null, binding: directBinding(), frontier,
    }));
    expect(result).toMatchObject({ advanceAllowed: false, tip: { generation: 0 } });
    expect(result.diagnostics.residue).toContain('manifest-g00000.json.part');
    expect(result.diagnostics.residue).not.toContain('manifest-g00000.json');
    expect(result.diagnostics.residue).not.toContain('r7-f-d00000-g00000.run');
    expect(result.diagnostics.residue).not.toContain('r7-f-d00000-g00000.idx');
    expect(fs.existsSync(path.join(stage, 'r7-f-d00000-g00000.run'))).toBe(true);
    expect(fs.existsSync(path.join(stage, 'r7-f-d00000-g00000.idx'))).toBe(true);
    frontier.dispose();
    const suspended = store.suspend();
    expect(suspended.diagnostics.residue).not.toContain('r7-f-d00000-g00000.run');
    expect(suspended.diagnostics.residue).not.toContain('r7-f-d00000-g00000.idx');
    expect(fs.existsSync(path.join(stage, 'r7-f-d00000-g00000.run'))).toBe(true);
    expect(fs.existsSync(path.join(stage, 'r7-f-d00000-g00000.idx'))).toBe(true);
    store.dispose();
    releaseParent(parent, stage);
  });

  it('makes candidate disposal deletion-free before any post-link filesystem callback can reenter', () => {
    const { parent, stage } = temporaryStage('r7-product-reentrant-postlink');
    let reentrantFrontier = null;
    let reentrantDiagnostics = null;
    let reenterInsideManifestLink = false;
    const seam = {
      linkSync(source, finalPath) {
        const result = fs.linkSync(source, finalPath);
        if (reenterInsideManifestLink
          && path.basename(String(finalPath)) === 'manifest-g00000.json') {
          reenterInsideManifestLink = false;
          reentrantDiagnostics = store.diagnostics();
          reentrantFrontier.dispose();
        }
        return result;
      },
    };
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: seam,
    });
    store.loadCheckpoint();
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    reentrantFrontier = writer.finish();
    reenterInsideManifestLink = true;
    const result = store.publishCheckpoint(Object.freeze({
      transition: 'seed', previousTip: null, binding: directBinding(), frontier: reentrantFrontier,
    }));
    expect(result).toMatchObject({ advanceAllowed: true, tip: { generation: 0 } });
    expect(reentrantDiagnostics.cleanupErrors).toEqual([]);
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json'))).toBe(true);
    expect(fs.existsSync(path.join(stage, 'r7-f-d00000-g00000.run'))).toBe(true);
    expect(fs.existsSync(path.join(stage, 'r7-f-d00000-g00000.idx'))).toBe(true);
    const loaded = store.loadCheckpoint();
    store.releaseCheckpointRun(loaded.checkpoint.frontier);
    store.suspend();
    store.dispose();
    releaseParent(parent, stage);
  });

  it('rejects a projected active-byte overflow before opening the next manifest', () => {
    const { parent, stage } = temporaryStage('r7-product-active-byte-limit');
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage,
      mode: 'create',
      ownerId: 'owner-A',
      limits: { latestCheckpointRunBytes: 3 },
    });
    store.loadCheckpoint();
    const seedWriter = store.createRun('r7-f-d00000-g00000');
    seedWriter.write('A');
    const frontier = seedWriter.finish();
    const seed = store.publishCheckpoint(Object.freeze({
      transition: 'seed', previousTip: null, binding: directBinding(), frontier,
    }));
    const loaded = store.loadCheckpoint();
    store.releaseCheckpointRun(loaded.checkpoint.frontier);
    const unitWriter = store.createRun('r7-u-d00000-n00000000-g00001');
    unitWriter.write('B');
    const nextRun = unitWriter.finish();
    expect(() => store.publishCheckpoint(Object.freeze({
      transition: 'unit',
      previousTip: seed.tip,
      parentOffset: 1,
      lastProcessedParentKey: 'A',
      transitionsDelta: 1,
      boundPrunesDelta: 0,
      nextRun,
    }))).toThrow('latest checkpoint run bytes exceed the limit');
    expect(fs.existsSync(path.join(stage, 'manifest-g00001.json'))).toBe(false);
    expect(fs.existsSync(path.join(stage, 'r7-u-d00000-n00000000-g00001.run'))).toBe(false);
    expect(() => store.loadCheckpoint()).toThrow('already outstanding');
    store.suspend();
    store.dispose();
    releaseParent(parent, stage);
  });

  it('treats a same-object lost manifest link result as committed and preserves the candidate', () => {
    const { parent, stage } = temporaryStage('r7-product-lost-link');
    let loseManifestLinkResult = false;
    const seam = {
      linkSync(source, finalPath) {
        const result = fs.linkSync(source, finalPath);
        if (loseManifestLinkResult && path.basename(String(finalPath)) === 'manifest-g00000.json') {
          loseManifestLinkResult = false;
          const error = new Error('injected lost manifest link result');
          error.code = 'EIO';
          throw error;
        }
        return result;
      },
    };
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: seam,
    });
    store.loadCheckpoint();
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    const frontier = writer.finish();
    loseManifestLinkResult = true;
    const result = store.publishCheckpoint(Object.freeze({
      transition: 'seed', previousTip: null, binding: directBinding(), frontier,
    }));
    expect(result).toMatchObject({ advanceAllowed: false, tip: { generation: 0 } });
    frontier.dispose();
    store.suspend();
    for (const suffix of ['run', 'idx']) {
      expect(fs.existsSync(path.join(stage, `r7-f-d00000-g00000.${suffix}`))).toBe(true);
    }
    store.dispose();
    releaseParent(parent, stage);
  });

  it('quarantines the candidate when the manifest link outcome cannot be observed', () => {
    const { parent, stage } = temporaryStage('r7-product-unknown-link');
    let unknownManifestLink = false;
    const seam = {
      linkSync(source, finalPath) {
        if (unknownManifestLink && path.basename(String(finalPath)) === 'manifest-g00000.json') {
          fs.linkSync(source, finalPath);
          const error = new Error('injected unknown manifest link result');
          error.code = 'EIO';
          throw error;
        }
        return fs.linkSync(source, finalPath);
      },
      lstatSync(filePath, ...args) {
        if (unknownManifestLink && path.basename(String(filePath)) === 'manifest-g00000.json') {
          const error = new Error('injected manifest final observation fault');
          error.code = 'EACCES';
          throw error;
        }
        return fs.lstatSync(filePath, ...args);
      },
    };
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: seam,
    });
    store.loadCheckpoint();
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    const frontier = writer.finish();
    unknownManifestLink = true;
    expect(() => store.publishCheckpoint(Object.freeze({
      transition: 'seed', previousTip: null, binding: directBinding(), frontier,
    }))).toThrow('outcome is unknown');
    unknownManifestLink = false;
    frontier.dispose();
    store.suspend();
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json'))).toBe(true);
    expect(fs.existsSync(path.join(stage, 'r7-f-d00000-g00000.run'))).toBe(true);
    expect(fs.existsSync(path.join(stage, 'r7-f-d00000-g00000.idx'))).toBe(true);
    for (const name of fs.readdirSync(stage)) fs.unlinkSync(path.join(stage, name));
    fs.rmdirSync(stage);
    releaseParent(parent, stage);
  });

  it.each(['run', 'idx'])('rejects a same-length candidate %s identity drift before manifest commit', (suffix) => {
    const { parent, stage } = temporaryStage(`r7-product-candidate-${suffix}-drift`);
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A',
    });
    store.loadCheckpoint();
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    const frontier = writer.finish();
    const candidatePath = path.join(stage, `r7-f-d00000-g00000.${suffix}`);
    const changed = fs.readFileSync(candidatePath);
    changed[0] ^= 0x01;
    fs.writeFileSync(candidatePath, changed);

    expect(() => store.publishCheckpoint(Object.freeze({
      transition: 'seed', previousTip: null, binding: directBinding(), frontier,
    }))).toThrow(`manifest candidate ${suffix === 'run' ? 'data' : 'index'} identity drift`);
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json'))).toBe(false);
    store.suspend();
    for (const name of fs.readdirSync(stage)) fs.unlinkSync(path.join(stage, name));
    fs.rmdirSync(stage);
    releaseParent(parent, stage);
  });

  it('rejects new candidate readers while the manifest publication claim is live', () => {
    const { parent, stage } = temporaryStage('r7-product-claimed-reader');
    let store = null;
    let frontier = null;
    let readerError = null;
    let probeClaim = false;
    const seam = {
      linkSync(source, finalPath) {
        const result = fs.linkSync(source, finalPath);
        if (probeClaim && path.basename(String(finalPath)) === 'manifest-g00000.json') {
          probeClaim = false;
          try { frontier.values(); } catch (error) { readerError = error; }
        }
        return result;
      },
    };
    store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: seam,
    });
    store.loadCheckpoint();
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    frontier = writer.finish();
    probeClaim = true;
    const result = store.publishCheckpoint(Object.freeze({
      transition: 'seed', previousTip: null, binding: directBinding(), frontier,
    }));
    expect(readerError?.message).toContain('claimed for manifest publication');
    expect(result).toMatchObject({ advanceAllowed: true, tip: { generation: 0 } });
    const loaded = store.loadCheckpoint();
    store.releaseCheckpointRun(loaded.checkpoint.frontier);
    store.suspend();
    store.dispose();
    releaseParent(parent, stage);
  });

  it('keeps the public publication lease through candidate identity rechecks', () => {
    const { parent, stage } = temporaryStage('r7-product-candidate-identity-lease');
    let store = null;
    let frontier = null;
    let publication = null;
    let candidateDataChecks = 0;
    let nestedPublicationError = null;
    let candidateReaderError = null;
    let probe = false;
    const seam = {
      lstatSync(filePath, ...args) {
        if (probe && path.basename(String(filePath)) === 'r7-f-d00000-g00000.run') {
          candidateDataChecks += 1;
          if (candidateDataChecks === 2) {
            probe = false;
            try { store.publishCheckpoint(publication); } catch (error) { nestedPublicationError = error; }
            try { frontier.values(); } catch (error) { candidateReaderError = error; }
          }
        }
        return fs.lstatSync(filePath, ...args);
      },
    };
    store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: seam,
    });
    store.loadCheckpoint();
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    frontier = writer.finish();
    publication = Object.freeze({
      transition: 'seed', previousTip: null, binding: directBinding(), frontier,
    });
    probe = true;
    const result = store.publishCheckpoint(publication);
    expect(candidateDataChecks).toBe(2);
    expect(nestedPublicationError?.message).toContain('checkpoint publication in flight');
    expect(candidateReaderError?.message).toContain('claimed for manifest publication');
    expect(result).toMatchObject({ advanceAllowed: true, tip: { generation: 0 } });
    const loaded = store.loadCheckpoint();
    store.releaseCheckpointRun(loaded.checkpoint.frontier);
    store.suspend();
    store.dispose();
    releaseParent(parent, stage);
  });

  it('suspends before manifest commit without leaving working candidate bytes', () => {
    const { parent, stage } = temporaryStage('r7-product-precommit-suspend');
    let store = null;
    let suspendResult = null;
    let probe = false;
    const seam = {
      lstatSync(filePath, ...args) {
        if (probe && path.basename(String(filePath)) === 'r7-f-d00000-g00000.run') {
          probe = false;
          suspendResult = store.suspend();
        }
        return fs.lstatSync(filePath, ...args);
      },
    };
    store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: seam,
    });
    store.loadCheckpoint();
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    const frontier = writer.finish();
    probe = true;
    expect(() => store.publishCheckpoint(Object.freeze({
      transition: 'seed', previousTip: null, binding: directBinding(), frontier,
    }))).toThrow('suspended before checkpoint publication');
    expect(suspendResult).toMatchObject({ closeFailed: true });
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json'))).toBe(false);
    expect(fs.existsSync(path.join(stage, 'r7-f-d00000-g00000.run'))).toBe(false);
    expect(fs.existsSync(path.join(stage, 'r7-f-d00000-g00000.idx'))).toBe(false);
    expect(() => frontier.values()).toThrow('invalidated');
    store.dispose();
    releaseParent(parent, stage);
  });

  it('cleans an open writer on a known precommit publication failure', () => {
    const { parent, stage } = temporaryStage('r7-product-open-writer-clean');
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A',
    });
    store.loadCheckpoint();
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    expect(() => store.publishCheckpoint(Object.freeze({
      transition: 'seed', previousTip: null, binding: directBinding(), frontier: null,
    }))).toThrow();
    expect(() => writer.write('B')).toThrow('not open');
    expect(fs.readdirSync(stage)).toEqual(['owner.json']);
    store.suspend();
    store.dispose();
    releaseParent(parent, stage);
  });

  it('makes a reentrant suspend nonthrowing, terminal, and postcommit-blocked', () => {
    const { parent, stage } = temporaryStage('r7-product-inflight-suspend');
    let store = null;
    let suspended = null;
    let probeSuspend = false;
    const seam = {
      linkSync(source, finalPath) {
        const result = fs.linkSync(source, finalPath);
        if (probeSuspend && path.basename(String(finalPath)) === 'manifest-g00000.json') {
          probeSuspend = false;
          suspended = store.suspend();
        }
        return result;
      },
    };
    store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A', fs: seam,
    });
    store.loadCheckpoint();
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    const frontier = writer.finish();
    probeSuspend = true;
    const result = store.publishCheckpoint(Object.freeze({
      transition: 'seed', previousTip: null, binding: directBinding(), frontier,
    }));
    expect(suspended).toMatchObject({ closeFailed: true });
    expect(result).toMatchObject({ advanceAllowed: false, tip: { generation: 0 } });
    expect(fs.existsSync(path.join(stage, 'manifest-g00000.json'))).toBe(true);
    expect(() => store.loadCheckpoint()).toThrow('suspended');
    expect(store.suspend()).toMatchObject({ closeFailed: true });
    store.dispose();
    releaseParent(parent, stage);
  });

  it('cleans the supplied candidate when publication shape validation fails', () => {
    const { parent, stage } = temporaryStage('r7-product-shape-clean');
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A',
    });
    store.loadCheckpoint();
    const writer = store.createRun('r7-f-d00000-g00000');
    writer.write('A');
    const frontier = writer.finish();
    expect(() => store.publishCheckpoint(Object.freeze({
      transition: 'seed', previousTip: null, binding: directBinding(), frontier, extra: true,
    }))).toThrow('exact keys');
    expect(fs.readdirSync(stage)).toEqual(['owner.json']);
    expect(() => frontier.values()).toThrow('invalidated');
    store.suspend();
    store.dispose();
    releaseParent(parent, stage);
  });

  it('rejects and cleans a reserved candidate before a no-run unit publication', () => {
    const { parent, stage } = temporaryStage('r7-product-null-unit-reservation');
    const store = createResumableEndgameDiskFrontierStore({
      stagePath: stage, mode: 'create', ownerId: 'owner-A',
    });
    store.loadCheckpoint();
    const seedWriter = store.createRun('r7-f-d00000-g00000');
    seedWriter.write('A');
    const frontier = seedWriter.finish();
    const seed = store.publishCheckpoint(Object.freeze({
      transition: 'seed', previousTip: null, binding: directBinding(2), frontier,
    }));
    const loaded = store.loadCheckpoint();
    store.releaseCheckpointRun(loaded.checkpoint.frontier);
    const strayWriter = store.createRun('r7-u-d00000-n00000000-g00001');
    strayWriter.write('B');
    const stray = strayWriter.finish();
    const publication = Object.freeze({
      transition: 'unit', previousTip: seed.tip, parentOffset: 1, lastProcessedParentKey: 'A',
      transitionsDelta: 1, boundPrunesDelta: 0, nextRun: null,
    });
    expect(() => store.publishCheckpoint(publication)).toThrow('cannot leave a manifest candidate reserved');
    expect(() => stray.values()).toThrow('invalidated');
    expect(fs.existsSync(path.join(stage, 'manifest-g00001.json'))).toBe(false);
    expect(fs.existsSync(path.join(stage, 'r7-u-d00000-n00000000-g00001.run'))).toBe(false);
    expect(fs.existsSync(path.join(stage, 'r7-u-d00000-n00000000-g00001.idx'))).toBe(false);
    expect(store.publishCheckpoint(publication)).toMatchObject({ advanceAllowed: true, tip: { generation: 1 } });
    const after = store.loadCheckpoint();
    store.releaseCheckpointRun(after.checkpoint.frontier);
    store.suspend();
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
