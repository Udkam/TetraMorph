import { describe, expect, it } from 'vitest';
import type { EndgameId } from './types';
import {
  advanceOptimalEndgameRouteProof,
  certifyOptimalEndgameRoute,
  discoverExactEndgameRoute,
  encodeEndgameRoute,
  replayEndgameRoute,
  type EndgameOptimalRouteCertificate,
  type EndgameProofCheckpointRunStore,
  type EndgameProofRunStore,
} from './endgameRouteSearch';

type Candidate = Readonly<{ levelId: EndgameId; route: string }>;

const CANDIDATES: Readonly<Record<string, Candidate>> = Object.freeze({
  't3r-cascade-05': Object.freeze({
    levelId: 't3r-cascade-05',
    route: 'SRRRRHTTTTTTTTTTTTLLLLHTTTCCLHTTTTTTTTTTTTCCCRRHTTTCRRRRHTTTTTTTTTTTT',
  }),
  't5r-delta-07': Object.freeze({
    levelId: 't5r-delta-07',
    route: 'SRRRRHTTTCRRHTTTTTTTTTTTTCLLLLHTTTTTTTTTTTTCLLLHTTTCLHTTTTTTTTTTTT',
  }),
  't5r-lattice-09': Object.freeze({
    levelId: 't5r-lattice-09',
    route: 'SCLLLLLHTTTLLLHTTTTTTTTTTTTCCRRHTTTTTTTTTTTTCLHTTTTTTTTTTTT',
  }),
  't5r-drift-08': Object.freeze({
    levelId: 't5r-drift-08',
    route: 'SQLLLHTTTLDDDDDDDDDDDDDDDDLLHTTTTTTTTTTTTCRRRRHTTTTTTTTTTTTRHTTTTTTTTTTTT',
  }),
  't5r-rift-10': Object.freeze({
    levelId: 't5r-rift-10',
    route: 'SCRRHTTTCCCRRRRRHTTTTTTTTTTTTLHTTTTTTTTTTTTCLLLHTTTTTTTTTTTT',
  }),
  't5r-horizon-15': Object.freeze({
    levelId: 't5r-horizon-15',
    route: 'SRHTTTCCLLHTTTCLLLLHTTTCCCRRRRRHTTTTTTTTTTTTCRHTTTLHTTTCRRRHTTTTTTTTTTTTCRRRRHTTTCLLLHTTTTTTTTTTTTCLLLLHTTTTTTTTTTTTCCCRRRHTTTTTTTTTTTT',
  }),
  't6r-terrace-18': Object.freeze({
    levelId: 't6r-terrace-18',
    route: 'SCCCHTTTLLLHTTTCLLLLHTTTTTTTTTTTTCLLHTTTTTTTTTTTTCHTTTCCCRRRHTTTTTTTTTTTTLLLHTTTRRRRHTTTTTTTTTTTTCRRHTTTTTTTTTTTTHTTTCCCRRRRRHTTTCLLLLHTTTTTTTTTTTT',
  }),
  't6r-keystone-20': Object.freeze({
    levelId: 't6r-keystone-20',
    route: 'SCRRRRHTTTLLHTTTRHTTTTTTTTTTTTCLLLLLHTTTCCCLLLHTTTCCCRRRHTTTTTTTTTTTTCLHTTTCLLLHTTTCRHTTTTTTTTTTTTLLHTTTRRHTTTTTTTTTTTTCCCRRRRRHTTTTTTTTTTTT',
  }),
});

// @ts-expect-error Node environment variables are available to Vitest but not product types.
const requestedId = process.env.ENDGAME_F5_CERTIFICATE_DISCOVERY;
// @ts-expect-error Node environment variables are available to Vitest but not product types.
const searchOnly = process.env.ENDGAME_F5_CERTIFICATE_FIND_ROUTE === '1';
// @ts-expect-error Node environment variables are available to Vitest but not product types.
const diskStagePath = process.env.ENDGAME_F5_CERTIFICATE_DISK_STAGE;
// @ts-expect-error Node environment variables are available to Vitest but not product types.
const resumableStagePath = process.env.ENDGAME_F5_CERTIFICATE_RESUMABLE_STAGE;
// @ts-expect-error Node environment variables are available to Vitest but not product types.
const resumableOwnerId = process.env.ENDGAME_F5_CERTIFICATE_RESUMABLE_OWNER;
// @ts-expect-error Node environment variables are available to Vitest but not product types.
const resumableMode = process.env.ENDGAME_F5_CERTIFICATE_RESUMABLE_MODE;
// @ts-expect-error Node environment variables are available to Vitest but not product types.
const resumableExpectedTipText = process.env.ENDGAME_F5_CERTIFICATE_RESUMABLE_EXPECTED_TIP;
const candidate = requestedId ? CANDIDATES[requestedId] : undefined;

type DiskFrontierModule = Readonly<{
  createEndgameDiskFrontierStore(options: Readonly<{ stagePath: string }>): EndgameProofRunStore;
}>;

type ResumableTip = Readonly<{ generation: number; manifestSha256: string }>;

type ResumableFrontierModule = Readonly<{
  createResumableEndgameDiskFrontierStore(options: Readonly<{
    stagePath: string;
    mode: 'create' | 'resume';
    ownerId: string;
    expectedTip?: ResumableTip | null;
  }>): EndgameProofCheckpointRunStore;
}>;

type ResumableProofConfig = Readonly<{
  stagePath: string;
  ownerId: string;
  mode: 'create' | 'resume';
  expectedTip: ResumableTip | null;
}>;

function parseResumableTip(text: string): ResumableTip {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('F5 resumable expected tip must be canonical JSON.');
  }
  const record = parsed !== null && typeof parsed === 'object' ? parsed as Record<string, unknown> : undefined;
  if (record === undefined || !Object.hasOwn(record, 'generation') || !Object.hasOwn(record, 'manifestSha256')) {
    throw new Error('F5 resumable expected tip is malformed or noncanonical.');
  }
  const { generation, manifestSha256 } = record;
  if (
    typeof generation !== 'number'
    || !Number.isSafeInteger(generation)
    || generation < 0
    || typeof manifestSha256 !== 'string'
    || !/^[0-9A-F]{64}$/.test(manifestSha256)
    || JSON.stringify({ generation, manifestSha256 }) !== text
  ) throw new Error('F5 resumable expected tip is malformed or noncanonical.');
  return Object.freeze({ generation, manifestSha256 });
}

function resumableProofConfig(): ResumableProofConfig | undefined {
  const configured = [resumableStagePath, resumableOwnerId, resumableMode, resumableExpectedTipText]
    .some((value) => value !== undefined);
  if (!configured) return undefined;
  if (diskStagePath) throw new Error('F5 disk and resumable proof stores are mutually exclusive.');
  if (!resumableStagePath || !resumableOwnerId || (resumableMode !== 'create' && resumableMode !== 'resume')) {
    throw new Error('F5 resumable proof requires stage, owner, and create/resume mode pins.');
  }
  if (!/^[\x20-\x7E]{1,128}$/.test(resumableOwnerId)) {
    throw new Error('F5 resumable proof owner must be 1..128 printable ASCII bytes.');
  }
  if (resumableMode === 'create') {
    if (resumableExpectedTipText !== undefined) {
      throw new Error('F5 resumable create mode must not provide an expected tip.');
    }
    return Object.freeze({ stagePath: resumableStagePath, ownerId: resumableOwnerId, mode: 'create', expectedTip: null });
  }
  if (resumableExpectedTipText === undefined) {
    throw new Error('F5 resumable resume mode requires an exact expected tip.');
  }
  return Object.freeze({
    stagePath: resumableStagePath,
    ownerId: resumableOwnerId,
    mode: 'resume',
    expectedTip: parseResumableTip(resumableExpectedTipText),
  });
}

const resumableConfig = resumableProofConfig();

async function diskRunStore(): Promise<EndgameProofRunStore | undefined> {
  if (!diskStagePath) return undefined;
  const moduleUrl = new URL('../../../scripts/endgame-disk-frontier.mjs', import.meta.url).href;
  const module = await import(moduleUrl) as DiskFrontierModule;
  return module.createEndgameDiskFrontierStore({ stagePath: diskStagePath });
}

async function resumableRunStore(): Promise<EndgameProofCheckpointRunStore | undefined> {
  if (!resumableConfig) return undefined;
  const moduleUrl = new URL('../../../scripts/endgame-disk-frontier.mjs', import.meta.url).href;
  const module = await import(moduleUrl) as ResumableFrontierModule;
  return module.createResumableEndgameDiskFrontierStore({
    stagePath: resumableConfig.stagePath,
    mode: resumableConfig.mode,
    ownerId: resumableConfig.ownerId,
    ...(resumableConfig.mode === 'resume' ? { expectedTip: resumableConfig.expectedTip } : {}),
  });
}

function techniqueSignature(levelId: EndgameId, route: string) {
  const initialTargetCount = replayEndgameRoute(levelId, 'S').state.endgameTargetCells.length;
  const settledTargetCounts: number[] = [];
  for (let index = 1; index <= route.length; index += 1) {
    const replay = replayEndgameRoute(levelId, route.slice(0, index));
    if (replay.locks.length > 0) settledTargetCounts[replay.locks.length - 1] = replay.state.endgameTargetCells.length;
  }
  const setupLockCount = settledTargetCounts.findIndex((count) => count < initialTargetCount);
  if (setupLockCount < 0) throw new Error(`No decisive target removal for ${levelId}.`);
  return {
    initialTargetCount,
    setupLockCount,
    decisiveTargetCount: settledTargetCounts[setupLockCount]!,
    continuationTargetCounts: settledTargetCounts.slice(setupLockCount + 1),
  };
}

function certificateOutput(candidate: Candidate, actual: EndgameOptimalRouteCertificate) {
  return {
    levelId: actual.levelId,
    optimalOperations: actual.optimalLocks,
    masteryOperations: actual.optimalLocks + 5,
    initialStateHash: actual.initialStateHash,
    route: candidate.route,
    exhaustedFrontierWidths: actual.exhaustedFrontierWidths,
    exploredStateCount: actual.exploredStateCount,
    transitionCount: actual.transitionCount,
    deficitBoundPrunes: actual.deficitBoundPrunes,
    exhaustedDepths: actual.exhaustedDepths,
    signature: techniqueSignature(candidate.levelId, candidate.route),
  };
}

describe.runIf(candidate)('F5 prerequisite certificate discovery', () => {
  if (!candidate) return;
  const requestedCandidate = candidate;
  it(`prints a complete exact certificate for ${requestedCandidate.levelId}`, async () => {
    const supplied = replayEndgameRoute(requestedCandidate.levelId, requestedCandidate.route);
    if (searchOnly) {
      const discovered = discoverExactEndgameRoute(requestedCandidate.levelId, supplied.locks.length - 1);
      expect(discovered).not.toBeNull();
      if (discovered === null) throw new Error(`No shorter candidate discovered: ${requestedCandidate.levelId}.`);
      console.info(`F5_ROUTE=${JSON.stringify({
        levelId: requestedCandidate.levelId,
        locks: discovered.locks.length,
        route: encodeEndgameRoute(discovered.commands),
      })}`);
      return;
    }
    const resumableStore = await resumableRunStore();
    if (resumableStore) {
      let advancement: ReturnType<typeof advanceOptimalEndgameRouteProof> | undefined;
      let suspension: ReturnType<typeof resumableStore.suspend> | undefined;
      try {
        advancement = advanceOptimalEndgameRouteProof(requestedCandidate.levelId, requestedCandidate.route, resumableStore);
      } finally {
        suspension = resumableStore.suspend();
      }
      expect(suspension).toBeDefined();
      if (!suspension) throw new Error('Resumable proof store did not return a suspension result.');
      expect(suspension.closeFailed).toBe(false);
      expect(advancement).not.toBeNull();
      if (advancement === null || advancement === undefined) {
        throw new Error(`Candidate cannot seed resumable proof: ${requestedCandidate.levelId}.`);
      }
      if (advancement.status === 'blocked' || !advancement.advanceAllowed) {
        throw new Error(`Resumable proof is not advanceable: ${requestedCandidate.levelId}.`);
      }
      if (advancement.status === 'complete') {
        console.info(`F5_CERTIFICATE=${JSON.stringify({
          ...certificateOutput(requestedCandidate, advancement.certificate),
          schema: 't37-f5-r7-complete-v1',
          generation: advancement.generation,
          tip: advancement.tip,
        })}`);
        return;
      }
      console.info(`F5_CHECKPOINT=${JSON.stringify({
        schema: 't37-f5-r7-checkpoint-v1',
        levelId: requestedCandidate.levelId,
        route: requestedCandidate.route,
        generation: advancement.generation,
        depth: advancement.depth,
        parentOffset: advancement.parentOffset,
        tip: advancement.tip,
      })}`);
      return;
    }
    const runStore = await diskRunStore();
    const actual = certifyOptimalEndgameRoute(
      requestedCandidate.levelId,
      requestedCandidate.route,
      runStore ? { runStore } : undefined,
    );
    expect(actual).not.toBeNull();
    if (actual === null) throw new Error(`Candidate is not an exact certificate: ${requestedCandidate.levelId}.`);
    console.info(`F5_CERTIFICATE=${JSON.stringify(certificateOutput(requestedCandidate, actual))}`);
  }, resumableConfig ? 1_800_000 : 600_000);
});
