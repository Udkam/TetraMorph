import type { EndgameId } from './types';

export type T32EasyMasteryAlternate = Readonly<{
  id: EndgameId;
  firstDivergenceLock: number;
  locks: number;
  commandStream: string;
}>;

export const T32_EASY_MASTERY_ALTERNATES: readonly T32EasyMasteryAlternate[] = Object.freeze([
  Object.freeze({
    id: 't5r-arc-13',
    firstDivergenceLock: 1,
    locks: 8,
    commandStream: 'SCLLLLLHTTTCCCRRRRRHTTTTTTTTTTTTCRHTTTTTTTTTTTTCRRHTTTCHTTTLLLHTTTTTTTTTTTTLLHTTTCCCRRRRRHTTTTTTTTTTTT',
  }),
  Object.freeze({
    id: 't5r-current-12',
    firstDivergenceLock: 1,
    locks: 6,
    commandStream: 'SCLLLHTTTCLHTTTCLLLLLHTTTCCCRRRRRHTTTTTTTTTTTTRRHTTTTTTTTTTTTCCCRRRRRHTTTTTTTTTTTT',
  }),
  Object.freeze({
    id: 't5r-prism-11',
    firstDivergenceLock: 1,
    locks: 10,
    commandStream: 'SCLLLLLHTTTCCCRRRRRHTTTTTTTTTTTTCCRHTTTTTTTTTTTTLLHTTTCCRRHTTTTTTTTTTTTCLLLHTTTRRHTTTCHTTTCLLLLHTTTCCCRRRRRHTTTTTTTTTTTT',
  }),
]);
