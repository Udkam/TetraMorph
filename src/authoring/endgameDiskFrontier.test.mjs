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
  createEndgameDiskFrontierStore,
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
