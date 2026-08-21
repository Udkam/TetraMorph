import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
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

  it('rolls back generation reservation and closes/unlinks after initial fstat failure', () => {
    const { parent, stage } = temporaryStage('r7-bootstrap-fstat');
    const descriptors = new Map();
    let failRunFstat = false;
    const seam = {
      openSync(...args) { const descriptor = fs.openSync(...args); descriptors.set(descriptor, String(args[0])); return descriptor; },
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
    expect(fs.readdirSync(stage)).toEqual(['owner.json']);
    const retry = store.createRun('r7-f-d00000-g00000');
    retry.abort();
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
