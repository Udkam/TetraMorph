import { describe, expect, it } from 'vitest';
import {
  LEADERBOARD_KEY,
  LEGACY_LEADERBOARD_KEYS,
  MUTATION_LEADERBOARD_LIMIT,
  LEADERBOARD_LIMIT,
  classicDifficultyGrade,
  emptyLeaderboard,
  insertScoreRecord,
  migrateLegacyLeaderboard,
  parseLeaderboard,
  recordsForMode,
  type ClassicScoreRecord,
  type MutationScoreRecord,
  type SurvivalScoreRecord,
} from './leaderboard';

const marathonRecord = (overrides: Partial<ClassicScoreRecord> = {}): ClassicScoreRecord => ({
  version: 10,
  score: 1200,
  lines: 8,
  pieces: 31,
  elapsedTicks: 3600,
  chain: 0,
  mode: 'marathon',
  outcome: 'top-out',
  completedAt: '2026-07-14T01:00:00.000Z',
  classicStartingGravityTicks: 36,
  classicGravityFloorTicks: 4.8,
  classicGrade: 'standard',
  ...overrides,
});

const raceRecord = (overrides: Partial<SurvivalScoreRecord> = {}): SurvivalScoreRecord => ({
  version: 10,
  lines: 20,
  elapsedTicks: 3600,
  mode: 'race',
  outcome: 'top-out',
  completedAt: '2026-07-14T01:00:00.000Z',
  ...overrides,
});

const sprintRecord = (overrides: Partial<MutationScoreRecord> = {}): MutationScoreRecord => ({
  version: 10,
  score: 2400,
  lines: 40,
  pieces: 55,
  elapsedTicks: 2700,
  chain: 0,
  mode: 'sprint',
  outcome: 'top-out',
  completedAt: '2026-07-14T01:00:00.000Z',
  ...overrides,
});

const legacyRecord = (mode: 'marathon' | 'race' | 'sprint') => ({
  score: 1200,
  lines: mode === 'race' ? 20 : 8,
  pieces: 31,
  elapsedTicks: 3600,
  chain: 0,
  mode,
  outcome: 'top-out' as const,
  completedAt: '2026-07-14T01:00:00.000Z',
});

describe('local leaderboard boundary', () => {
  it('maps every Classic run into one of five fixed pace domains', () => {
    expect(classicDifficultyGrade(60, 18)).toBe('calm');
    expect(classicDifficultyGrade(48, 6)).toBe('relaxed');
    expect(classicDifficultyGrade(30, 4.8)).toBe('standard');
    expect(classicDifficultyGrade(18, 4.8)).toBe('swift');
    expect(classicDifficultyGrade(12, 4.8)).toBe('expert');
  });

  it('uses a TetraMorph current key while preserving every former key as a migration source', () => {
    expect(LEADERBOARD_KEY).toBe('tetramorph:leaderboard:v10');
    expect(LEGACY_LEADERBOARD_KEYS).toContain('tetramorph:leaderboard:v9');
    expect(LEGACY_LEADERBOARD_KEYS).toContain('tetramorph:leaderboard:v8');
    expect(LEGACY_LEADERBOARD_KEYS).toContain('tetris:leaderboard:v8');
    expect(LEGACY_LEADERBOARD_KEYS).toContain('stack-order:leaderboard:v1');
  });

  it('fails closed on malformed schema, invalid outcomes, and non-migratable stores', () => {
    expect(parseLeaderboard('{broken')).toEqual(emptyLeaderboard());
    expect(parseLeaderboard(JSON.stringify({
      version: 10,
      marathon: [marathonRecord(), { ...marathonRecord(), pieces: -1 }],
      race: [],
      sprint: [],
    }))).toEqual(emptyLeaderboard());
    expect(parseLeaderboard(JSON.stringify({
      version: 10,
      marathon: [],
      race: [],
      sprint: [{ ...sprintRecord(), outcome: 'finished' }],
    }))).toEqual(emptyLeaderboard());
    expect(parseLeaderboard(JSON.stringify({
      version: 10,
      marathon: [],
      race: [{ ...raceRecord(), score: 9, pieces: 1, chain: 0 }],
      sprint: [],
    }))).toEqual(emptyLeaderboard());
    expect(migrateLegacyLeaderboard(JSON.stringify([{ score: 1200, lines: 8, pieces: 31, mode: 'marathon', completedAt: '2026-07-14T01:00:00.000Z' }]))).toEqual(emptyLeaderboard());
  });

  it('migrates v9 arbitrary Classic pairs into fixed pace records before ranking them', () => {
    const legacy = {
      version: 9,
      marathon: [
        {
          version: 9,
          score: 1800,
          lines: 12,
          pieces: 44,
          elapsedTicks: 4200,
          chain: 0,
          mode: 'marathon' as const,
          outcome: 'top-out' as const,
          completedAt: '2026-07-20T01:00:00.000Z',
          classicStartingGravityTicks: 48,
          classicGravityFloorTicks: 6,
          classicGrade: 'standard' as const,
        },
        {
          version: 9,
          score: 1700,
          lines: 11,
          pieces: 43,
          elapsedTicks: 4300,
          chain: 0,
          mode: 'marathon' as const,
          outcome: 'top-out' as const,
          completedAt: '2026-07-20T02:00:00.000Z',
          classicStartingGravityTicks: 30,
          classicGravityFloorTicks: 4.8,
          classicGrade: 'challenge' as const,
        },
      ],
      race: [],
      sprint: [],
    };
    const migrated = parseLeaderboard(JSON.stringify(legacy));

    expect(migrated.version).toBe(10);
    expect(migrated.marathon).toEqual(expect.arrayContaining([
      expect.objectContaining({ classicGrade: 'relaxed', classicStartingGravityTicks: 48, classicGravityFloorTicks: 12 }),
      expect.objectContaining({ classicGrade: 'standard', classicStartingGravityTicks: 36, classicGravityFloorTicks: 4.8 }),
    ]));
  });

  it('migrates v7 Survival rows by dropping score, pieces, and chain', () => {
    const legacy = {
      version: 7,
      marathon: [{ ...legacyRecord('marathon'), version: 7 }],
      race: [{ ...legacyRecord('race'), version: 7, score: 9999, pieces: 88 }],
      sprint: [{ ...legacyRecord('sprint'), version: 7, score: 2400, lines: 40 }],
    };
    const migrated = parseLeaderboard(JSON.stringify(legacy));

    expect(migrated.version).toBe(10);
    expect(migrated.marathon[0]).toMatchObject({ version: 10, mode: 'marathon', score: 1200, classicGrade: 'relaxed' });
    expect(migrated.sprint[0]).toMatchObject({ version: 10, mode: 'sprint', score: 2400 });
    expect(migrated.race[0]).toEqual({
      version: 10,
      lines: 20,
      elapsedTicks: 3600,
      mode: 'race',
      outcome: 'top-out',
      completedAt: '2026-07-14T01:00:00.000Z',
    });
    expect(JSON.stringify(migrated.race[0])).not.toMatch(/score|pieces|chain/);
  });

  it('migrates valid v8 rows into their nearest current Classic preset', () => {
    const legacy = {
      version: 8,
      marathon: [{
        version: 8,
        score: 1800,
        lines: 12,
        pieces: 44,
        elapsedTicks: 4200,
        chain: 0,
        mode: 'marathon',
        outcome: 'top-out',
        completedAt: '2026-07-20T01:00:00.000Z',
      }],
      race: [{
        version: 8,
        lines: 23,
        elapsedTicks: 5100,
        mode: 'race',
        outcome: 'top-out',
        completedAt: '2026-07-20T02:00:00.000Z',
      }],
      sprint: [{
        version: 8,
        score: 2600,
        lines: 18,
        pieces: 51,
        elapsedTicks: 3900,
        chain: 0,
        mode: 'sprint',
        outcome: 'top-out',
        completedAt: '2026-07-20T03:00:00.000Z',
      }],
    };

    const migrated = parseLeaderboard(JSON.stringify(legacy));
    expect(migrated.marathon[0]).toMatchObject({
      version: 10,
      classicStartingGravityTicks: 48,
      classicGravityFloorTicks: 12,
      classicGrade: 'relaxed',
    });
    expect(migrated.race[0]).toEqual(raceRecord({
      lines: 23,
      elapsedTicks: 5100,
      completedAt: '2026-07-20T02:00:00.000Z',
    }));
    expect(migrated.sprint[0]).toMatchObject({ version: 10, mode: 'sprint', score: 2600 });
  });

  it('migrates valid v5 Classic/Survival rows but clears incompatible fourth-mode rows', () => {
    const legacy = {
      version: 5,
      marathon: [{ ...legacyRecord('marathon'), version: 5 }],
      race: [{ ...legacyRecord('race'), version: 5 }],
      sprint: [{ ...legacyRecord('sprint'), version: 5, outcome: 'finished' as const }],
    };
    const migrated = migrateLegacyLeaderboard(JSON.stringify(legacy));
    expect(migrated.version).toBe(10);
    expect(migrated.marathon[0]).toMatchObject({ version: 10, chain: 0, mode: 'marathon', outcome: 'top-out', classicGrade: 'relaxed' });
    expect(migrated.race[0]).toEqual(raceRecord());
    expect(migrated.sprint).toEqual([]);
  });

  it('resets only the retired v6 fourth-mode rows while retaining valid Classic and Survival history', () => {
    const legacy = {
      version: 6,
      marathon: [{ ...legacyRecord('marathon'), version: 6 }],
      race: [{ ...legacyRecord('race'), version: 6 }],
      sprint: [{ ...legacyRecord('sprint'), version: 6, chain: 4 }],
    };
    const migrated = migrateLegacyLeaderboard(JSON.stringify(legacy));
    expect(migrated).toMatchObject({ version: 10, sprint: [] });
    expect(migrated.marathon[0]).toMatchObject({ version: 10, mode: 'marathon' });
    expect(migrated.race[0]).toMatchObject({ version: 10, mode: 'race' });
  });

  it('preserves a valid v3 Classic/Survival store while opening an empty 异变 table', () => {
    const legacy = {
      version: 3,
      marathon: [{ ...legacyRecord('marathon'), version: 3 }],
      race: [{ ...legacyRecord('race'), version: 3 }],
    };
    const migrated = migrateLegacyLeaderboard(JSON.stringify(legacy));
    expect(migrated.version).toBe(10);
    expect(migrated.marathon[0]).toMatchObject({ version: 10, chain: 0, mode: 'marathon', outcome: 'top-out' });
    expect(migrated.race[0]).toMatchObject({ version: 10, mode: 'race', outcome: 'top-out' });
    expect(migrated.race[0]).not.toHaveProperty('score');
    expect(migrated.sprint).toEqual([]);
  });

  it('keeps only the requested five date-stamped records per mode', () => {
    let leaderboard = emptyLeaderboard();
    for (let index = 0; index < MUTATION_LEADERBOARD_LIMIT + 4; index += 1) {
      leaderboard = insertScoreRecord(leaderboard, marathonRecord({
        score: index % 3 === 0 ? 900 : 1200,
        lines: index,
        pieces: 20 + index,
        elapsedTicks: 3600 + index,
        completedAt: new Date(Date.UTC(2026, 6, 14, 1, index)).toISOString(),
      }));
      leaderboard = insertScoreRecord(leaderboard, raceRecord({
        lines: index,
        elapsedTicks: 3000 + index,
        completedAt: new Date(Date.UTC(2026, 6, 14, 2, index)).toISOString(),
      }));
      leaderboard = insertScoreRecord(leaderboard, sprintRecord({
        score: 800 + index,
        lines: index,
        pieces: 80 - index,
        elapsedTicks: 3000 - index,
        completedAt: new Date(Date.UTC(2026, 6, 14, 3, index)).toISOString(),
      }));
    }

    expect(recordsForMode(leaderboard, 'marathon')).toHaveLength(LEADERBOARD_LIMIT);
    expect(recordsForMode(leaderboard, 'race')).toHaveLength(LEADERBOARD_LIMIT);
    expect(recordsForMode(leaderboard, 'sprint')).toHaveLength(MUTATION_LEADERBOARD_LIMIT);
    expect(recordsForMode(leaderboard, 'marathon')[0]?.lines).toBe(MUTATION_LEADERBOARD_LIMIT + 3);
    expect(recordsForMode(leaderboard, 'race')[0]?.elapsedTicks).toBe(3000 + MUTATION_LEADERBOARD_LIMIT + 3);
    expect(recordsForMode(leaderboard, 'sprint').map((record) => record.lines)).toEqual([8, 7, 6, 5, 4]);
    expect(parseLeaderboard(JSON.stringify(leaderboard))).toEqual(leaderboard);
  });

  it('keeps an independent Classic top five for each fixed pace', () => {
    let leaderboard = emptyLeaderboard();
    const grades = [
      { classicGrade: 'calm' as const, classicStartingGravityTicks: 60, classicGravityFloorTicks: 18 },
      { classicGrade: 'relaxed' as const, classicStartingGravityTicks: 48, classicGravityFloorTicks: 12 },
      { classicGrade: 'standard' as const, classicStartingGravityTicks: 36, classicGravityFloorTicks: 4.8 },
      { classicGrade: 'swift' as const, classicStartingGravityTicks: 24, classicGravityFloorTicks: 4.8 },
      { classicGrade: 'expert' as const, classicStartingGravityTicks: 12, classicGravityFloorTicks: 4.8 },
    ];

    for (const [gradeIndex, interval] of grades.entries()) {
      for (let index = 0; index < LEADERBOARD_LIMIT + 2; index += 1) {
        leaderboard = insertScoreRecord(leaderboard, marathonRecord({
          ...interval,
          lines: gradeIndex * 20 + index,
          score: 1000 + index,
          completedAt: new Date(Date.UTC(2026, 6, 21 + gradeIndex, 1, index)).toISOString(),
        }));
      }
    }

    const records = recordsForMode(leaderboard, 'marathon') as ClassicScoreRecord[];
    expect(records).toHaveLength(LEADERBOARD_LIMIT * 5);
    for (const { classicGrade } of grades) {
      const gradeRecords = records.filter((record) => record.classicGrade === classicGrade);
      expect(gradeRecords).toHaveLength(LEADERBOARD_LIMIT);
      expect(gradeRecords.map((record) => record.lines)).toEqual(
        [...gradeRecords.map((record) => record.lines)].sort((left, right) => right - left),
      );
    }
  });

  it('ranks Classic by lines, Survival by endurance, and 异变 by score', () => {
    let leaderboard = emptyLeaderboard();
    const marathonLowerLines = marathonRecord({ lines: 8, score: 9000, elapsedTicks: 100 });
    const marathonHigherScore = marathonRecord({ lines: 9, score: 1300, elapsedTicks: 900 });
    const marathonWinner = marathonRecord({ lines: 9, score: 1600, elapsedTicks: 1200 });
    leaderboard = insertScoreRecord(leaderboard, marathonLowerLines);
    leaderboard = insertScoreRecord(leaderboard, marathonHigherScore);
    leaderboard = insertScoreRecord(leaderboard, marathonWinner);
    expect(recordsForMode(leaderboard, 'marathon')).toEqual([marathonWinner, marathonHigherScore, marathonLowerLines]);

    const raceMostLinesShorter = raceRecord({ lines: 99, elapsedTicks: 100 });
    const raceTieFewerLines = raceRecord({ lines: 19, elapsedTicks: 600 });
    const raceTieWinner = raceRecord({ lines: 20, elapsedTicks: 600 });
    const raceWinner = raceRecord({ lines: 1, elapsedTicks: 900 });
    leaderboard = insertScoreRecord(leaderboard, raceTieFewerLines);
    leaderboard = insertScoreRecord(leaderboard, raceMostLinesShorter);
    leaderboard = insertScoreRecord(leaderboard, raceTieWinner);
    leaderboard = insertScoreRecord(leaderboard, raceWinner);
    expect(recordsForMode(leaderboard, 'race')).toEqual([raceWinner, raceTieWinner, raceTieFewerLines, raceMostLinesShorter]);

    const raceSameResultLater = raceRecord({ lines: 20, elapsedTicks: 600, completedAt: '2026-07-14T02:00:00.000Z' });
    const raceSameResultEarlier = raceRecord({ lines: 20, elapsedTicks: 600, completedAt: '2026-07-13T01:00:00.000Z' });
    leaderboard = insertScoreRecord(leaderboard, raceSameResultLater);
    leaderboard = insertScoreRecord(leaderboard, raceSameResultEarlier);
    const sameResultRows = recordsForMode(leaderboard, 'race').filter((record) => record.elapsedTicks === 600 && record.lines === 20);
    expect(sameResultRows).toEqual([raceSameResultEarlier, raceTieWinner, raceSameResultLater]);

    const sprintLowerLinesHigherScore = sprintRecord({ score: 9999, lines: 29, pieces: 30 });
    const sprintTieMorePieces = sprintRecord({ score: 2400, lines: 30, pieces: 41 });
    const sprintTieFewerPieces = sprintRecord({ score: 2400, lines: 30, pieces: 20 });
    const sprintWinner = sprintRecord({ score: 100, lines: 31, pieces: 40 });
    leaderboard = insertScoreRecord(leaderboard, sprintLowerLinesHigherScore);
    leaderboard = insertScoreRecord(leaderboard, sprintTieMorePieces);
    leaderboard = insertScoreRecord(leaderboard, sprintTieFewerPieces);
    leaderboard = insertScoreRecord(leaderboard, sprintWinner);
    expect(recordsForMode(leaderboard, 'sprint')).toEqual([sprintLowerLinesHigherScore, sprintTieFewerPieces, sprintTieMorePieces, sprintWinner]);
  });
});
