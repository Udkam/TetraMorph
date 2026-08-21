import * as nativeFs from 'node:fs';
import { createHash } from 'node:crypto';
import * as path from 'node:path';

export const ENDGAME_DISK_FRONTIER_LIMITS = Object.freeze({
  recordMaxBytes: 2048,
  readBufferBytes: 64 * 1024,
  writeBufferBytes: 1024 * 1024,
  registryMaxEntries: 4098,
  diagnosticMaxEntries: 4098,
  diagnosticMessageMaxBytes: 2048,
  runIdMaxBytes: 96,
  stagePathMaxCodeUnits: 512,
});

export const RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS = Object.freeze({
  parentUnitKeys: 65_536,
  maximumUnits: 4_096,
  maximumManifests: 32_768,
  maximumNamespaceEntries: 49_152,
  latestCheckpointRunBytes: 96 * 1024 ** 3,
  uncommittedWorkingRunBytes: 96 * 1024 ** 3,
  recognizedPhysicalRunBytes: 192 * 1024 ** 3,
  retainedManifestBytes: 512 * 1024 ** 2,
  ownerAndIndexBytes: 512 * 1024 ** 2,
  auxiliaryBytes: 1024 ** 3,
  manifestBytes: 16_384,
  ownerOrIndexBytes: 65_536,
  collectionOpenRuns: 32,
  ownerIdBytes: 128,
});

const R7_INDEX_MAGIC = Buffer.from('T37R7I1\n', 'ascii');
const R7_INDEX_STRIDE = RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS.parentUnitKeys;
const R7_INDEX_HEADER_BYTES = 24;
const R7_HASH_PATTERN = /^[0-9A-F]{64}$/;

function assertSafeNonnegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw frontierError(`${label} must be a safe nonnegative integer`);
  }
}

function canonicalizeJson(value, ancestors = new Set()) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw frontierError('canonical JSON numbers must be safe integers');
    return String(value);
  }
  if (typeof value !== 'object') throw frontierError('canonical JSON contains an unsupported value');
  if (ancestors.has(value)) throw frontierError('canonical JSON cannot contain cycles');
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return `[${value.map((entry) => canonicalizeJson(entry, ancestors)).join(',')}]`;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw frontierError('canonical JSON objects must be plain records');
    }
    const keys = Object.keys(value).sort(ordinalByteCompare);
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalizeJson(value[key], ancestors)}`).join(',')}}`;
  } finally {
    ancestors.delete(value);
  }
}

function sha256Upper(bytes) {
  return createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

function canonicalHash(label, value) {
  if (typeof label !== 'string' || label.length === 0 || label.includes('\0')) {
    throw frontierError('canonical hash label must be a nonempty NUL-free string');
  }
  return sha256Upper(Buffer.from(`${label}\0${canonicalizeJson(value)}`, 'utf8'));
}

function resumableIndexLayout(size) {
  assertSafeNonnegativeInteger(size, 'run size');
  const entryCount = size === 0 ? 1 : Math.floor((size - 1) / R7_INDEX_STRIDE) + 2;
  const indexBytes = R7_INDEX_HEADER_BYTES + 8 * entryCount;
  if (!Number.isSafeInteger(entryCount) || !Number.isSafeInteger(indexBytes)) {
    throw frontierError('run index layout exceeds safe integer range');
  }
  return Object.freeze({ entryCount, indexBytes });
}

function validateIndexOffsets(size, offsets) {
  const { entryCount, indexBytes } = resumableIndexLayout(size);
  if (!Array.isArray(offsets) || offsets.length !== entryCount) {
    throw frontierError(`run index requires exactly ${entryCount} offsets`);
  }
  let previous = -1;
  for (const [index, offset] of offsets.entries()) {
    assertSafeNonnegativeInteger(offset, `run index offset ${index}`);
    if (index === 0 && offset !== 0) throw frontierError('run index must begin at byte offset 0');
    if (index > 0 && offset <= previous) throw frontierError('run index offsets must be strictly increasing');
    previous = offset;
  }
  if (size === 0 && offsets[0] !== 0) throw frontierError('empty run index must contain only offset 0');
  return { entryCount, indexBytes };
}

function encodeResumableRunIndex(size, offsets) {
  const { entryCount, indexBytes } = validateIndexOffsets(size, offsets);
  const buffer = Buffer.alloc(indexBytes);
  R7_INDEX_MAGIC.copy(buffer, 0);
  buffer.writeBigUInt64LE(BigInt(size), 8);
  buffer.writeUInt32LE(R7_INDEX_STRIDE, 16);
  buffer.writeUInt32LE(entryCount, 20);
  offsets.forEach((offset, index) => buffer.writeBigUInt64LE(BigInt(offset), R7_INDEX_HEADER_BYTES + 8 * index));
  return buffer;
}

function decodeResumableRunIndex(bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (buffer.length < R7_INDEX_HEADER_BYTES || !buffer.subarray(0, 8).equals(R7_INDEX_MAGIC)) {
    throw frontierError('run index has invalid magic or is truncated');
  }
  const sizeBig = buffer.readBigUInt64LE(8);
  if (sizeBig > BigInt(Number.MAX_SAFE_INTEGER)) throw frontierError('run index size exceeds safe integer range');
  const size = Number(sizeBig);
  if (buffer.readUInt32LE(16) !== R7_INDEX_STRIDE) throw frontierError('run index has invalid stride');
  const declaredCount = buffer.readUInt32LE(20);
  const layout = resumableIndexLayout(size);
  if (declaredCount !== layout.entryCount || buffer.length !== layout.indexBytes) {
    throw frontierError('run index count or byte length is inconsistent');
  }
  const offsets = [];
  for (let index = 0; index < declaredCount; index += 1) {
    const offsetBig = buffer.readBigUInt64LE(R7_INDEX_HEADER_BYTES + 8 * index);
    if (offsetBig > BigInt(Number.MAX_SAFE_INTEGER)) throw frontierError('run index offset exceeds safe integer range');
    offsets.push(Number(offsetBig));
  }
  validateIndexOffsets(size, offsets);
  return Object.freeze({ size, offsets: Object.freeze(offsets) });
}

function validateResumableRunRange(size, range) {
  assertSafeNonnegativeInteger(size, 'run size');
  if (!range || typeof range !== 'object') throw frontierError('run range is required');
  const { startOrdinal, endOrdinal } = range;
  assertSafeNonnegativeInteger(startOrdinal, 'range startOrdinal');
  assertSafeNonnegativeInteger(endOrdinal, 'range endOrdinal');
  if (startOrdinal > endOrdinal || endOrdinal > size) throw frontierError('run range is out of bounds');
  if (startOrdinal !== size && startOrdinal % R7_INDEX_STRIDE !== 0) {
    throw frontierError(`run range start must align to ${R7_INDEX_STRIDE}`);
  }
  if (endOrdinal !== size && endOrdinal % R7_INDEX_STRIDE !== 0) {
    throw frontierError(`run range end must align to ${R7_INDEX_STRIDE} unless it is the final short range`);
  }
  return Object.freeze({ startOrdinal, endOrdinal });
}

function resumableRangeByteOffsets(index, range) {
  const parsed = index && Array.isArray(index.offsets)
    ? index
    : decodeResumableRunIndex(index);
  const validated = validateResumableRunRange(parsed.size, range);
  const offsetFor = (ordinal) => {
    if (ordinal === parsed.size) return parsed.offsets.at(-1);
    return parsed.offsets[ordinal / R7_INDEX_STRIDE];
  };
  return Object.freeze({
    startOffset: offsetFor(validated.startOrdinal),
    endOffset: offsetFor(validated.endOrdinal),
  });
}

function bindResumableIndexToDataBytes(index, dataBytes) {
  assertSafeNonnegativeInteger(dataBytes, 'run dataBytes');
  const parsed = index && Array.isArray(index.offsets)
    ? index
    : decodeResumableRunIndex(index);
  if (parsed.offsets.at(-1) !== dataBytes) {
    throw frontierError('run index terminal offset does not equal dataBytes');
  }
  return parsed;
}

function assertExactPublishedIndexBytes(actual, expected) {
  const actualBytes = Buffer.isBuffer(actual) ? actual : Buffer.from(actual);
  const expectedBytes = Buffer.isBuffer(expected) ? expected : Buffer.from(expected);
  if (!actualBytes.equals(expectedBytes)) throw frontierError('published index bytes differ from the admitted candidate');
  return actualBytes;
}

function parseStrictCanonicalJson(text) {
  if (typeof text !== 'string') throw frontierError('canonical JSON input must be text');
  let cursor = 0;
  const fail = (message) => { throw frontierError(`canonical JSON ${message} at byte ${cursor}`); };
  const parseString = () => {
    if (text[cursor] !== '"') fail('expected a string');
    const start = cursor;
    cursor += 1;
    let escaped = false;
    while (cursor < text.length) {
      const character = text[cursor];
      cursor += 1;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\') {
        escaped = true;
        continue;
      }
      if (character === '"') {
        try {
          return JSON.parse(text.slice(start, cursor));
        } catch {
          fail('contains an invalid string');
        }
      }
      if (character.charCodeAt(0) < 0x20) fail('contains a control character');
    }
    fail('contains an unterminated string');
  };
  const parseValue = () => {
    const character = text[cursor];
    if (character === '"') return parseString();
    if (character === '[') {
      cursor += 1;
      const result = [];
      if (text[cursor] === ']') {
        cursor += 1;
        return result;
      }
      for (;;) {
        result.push(parseValue());
        if (text[cursor] === ']') {
          cursor += 1;
          return result;
        }
        if (text[cursor] !== ',') fail('expected an array comma');
        cursor += 1;
      }
    }
    if (character === '{') {
      cursor += 1;
      const result = Object.create(null);
      const seen = new Set();
      if (text[cursor] === '}') {
        cursor += 1;
        return result;
      }
      for (;;) {
        const key = parseString();
        if (seen.has(key)) fail(`contains duplicate key ${JSON.stringify(key)}`);
        seen.add(key);
        if (text[cursor] !== ':') fail('expected an object colon');
        cursor += 1;
        result[key] = parseValue();
        if (text[cursor] === '}') {
          cursor += 1;
          return result;
        }
        if (text[cursor] !== ',') fail('expected an object comma');
        cursor += 1;
      }
    }
    for (const [literal, value] of [['true', true], ['false', false], ['null', null]]) {
      if (text.startsWith(literal, cursor)) {
        cursor += literal.length;
        return value;
      }
    }
    const number = text.slice(cursor).match(/^-?(?:0|[1-9][0-9]*)/u)?.[0];
    if (number) {
      cursor += number.length;
      const value = Number(number);
      if (!Number.isSafeInteger(value)) fail('number is not a safe integer');
      return value;
    }
    fail('contains an unsupported token');
  };
  const value = parseValue();
  if (cursor !== text.length) fail('has trailing bytes');
  if (canonicalizeJson(value) !== text) throw frontierError('canonical JSON bytes are not canonical');
  return value;
}

function parseCanonicalLfBytes(bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (buffer.length === 0 || buffer.at(-1) !== 0x0a || (buffer.length > 1 && buffer.at(-2) === 0x0a)) {
    throw frontierError('canonical JSON file must end in exactly one LF');
  }
  const text = buffer.subarray(0, -1).toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(buffer.subarray(0, -1))) {
    throw frontierError('canonical JSON file is not valid UTF-8');
  }
  return parseStrictCanonicalJson(text);
}

export const RESUMABLE_ENDGAME_DISK_FRONTIER_TESTING = Object.freeze({
  canonicalJson: canonicalizeJson,
  canonicalHash,
  sha256Upper,
  hashPattern: R7_HASH_PATTERN,
  indexLayout: resumableIndexLayout,
  encodeIndex: encodeResumableRunIndex,
  decodeIndex: decodeResumableRunIndex,
  bindIndexToDataBytes: bindResumableIndexToDataBytes,
  validateRange: validateResumableRunRange,
  rangeByteOffsets: resumableRangeByteOffsets,
  parseCanonicalJson: parseStrictCanonicalJson,
  parseCanonicalLfBytes,
  admitNamespacePeak,
  admitCandidateIndex,
  assertExactPublishedIndexBytes,
});

const RESUMABLE_DEFAULT_FS = Object.freeze({
  closeSync: nativeFs.closeSync,
  fstatSync: nativeFs.fstatSync,
  fsyncSync: nativeFs.fsyncSync,
  linkSync: nativeFs.linkSync,
  lstatSync: nativeFs.lstatSync,
  mkdirSync: nativeFs.mkdirSync,
  openSync: nativeFs.openSync,
  readSync: nativeFs.readSync,
  readdirSync: nativeFs.readdirSync,
  realpathSync: nativeFs.realpathSync,
  rmdirSync: nativeFs.rmdirSync,
  unlinkSync: nativeFs.unlinkSync,
  writeSync: nativeFs.writeSync,
});

const DEFAULT_FS = Object.freeze({
  closeSync: nativeFs.closeSync,
  fstatSync: nativeFs.fstatSync,
  fsyncSync: nativeFs.fsyncSync,
  lstatSync: nativeFs.lstatSync,
  mkdirSync: nativeFs.mkdirSync,
  openSync: nativeFs.openSync,
  readSync: nativeFs.readSync,
  readdirSync: nativeFs.readdirSync,
  realpathSync: nativeFs.realpathSync,
  renameSync: nativeFs.renameSync,
  rmdirSync: nativeFs.rmdirSync,
  unlinkSync: nativeFs.unlinkSync,
  writeSync: nativeFs.writeSync,
});

function ordinalByteCompare(left, right) {
  const leftBytes = Buffer.from(left, 'utf8');
  const rightBytes = Buffer.from(right, 'utf8');
  return Buffer.compare(leftBytes, rightBytes);
}

function frontierError(message) {
  return new Error(`Invalid Endgame disk frontier: ${message}.`);
}

function isMissing(error) {
  return error && typeof error === 'object' && error.code === 'ENOENT';
}

function normalizedPath(value) {
  const resolved = path.resolve(value);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function assertExactRealpath(fs, expected) {
  const actual = fs.realpathSync(expected);
  if (normalizedPath(actual) !== normalizedPath(expected)) {
    throw frontierError(`realpath drift for ${expected}`);
  }
}

function assertPlainDirectory(stats, label) {
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw frontierError(`${label} is not a plain directory`);
  }
}

function assertPlainFile(stats, label) {
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw frontierError(`${label} is not a plain file`);
  }
}

function statIdentity(stats) {
  return Object.freeze({
    dev: String(stats.dev),
    ino: String(stats.ino),
    size: stats.size,
    mtimeMs: stats.mtimeMs,
    ctimeMs: stats.ctimeMs,
  });
}

function sameIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.size === right.size
    && left.mtimeMs === right.mtimeMs
    && left.ctimeMs === right.ctimeMs;
}

function normalizeDiagnostic(error) {
  const raw = error instanceof Error
    ? `${error.name}: ${error.message}`
    : typeof error === 'string'
      ? error
      : String(error);
  const bytes = Buffer.from(raw, 'utf8');
  if (bytes.length <= ENDGAME_DISK_FRONTIER_LIMITS.diagnosticMessageMaxBytes) return raw;
  const suffix = '...[truncated]';
  let retained = bytes.subarray(
    0,
    ENDGAME_DISK_FRONTIER_LIMITS.diagnosticMessageMaxBytes - Buffer.byteLength(suffix, 'utf8') - 3,
  ).toString('utf8');
  let result = `${retained}${suffix}`;
  while (Buffer.byteLength(result, 'utf8') > ENDGAME_DISK_FRONTIER_LIMITS.diagnosticMessageMaxBytes) {
    retained = retained.slice(0, -1);
    result = `${retained}${suffix}`;
  }
  return result;
}

function aggregate(primary, cleanup, fallback) {
  const errors = [];
  if (primary !== null && primary !== undefined) errors.push(primary instanceof Error ? primary : new Error(String(primary)));
  errors.push(...cleanup);
  if (errors.length === 1) return errors[0];
  return new AggregateError(errors, errors[0]?.message ?? fallback);
}

function validateRunId(id) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) {
    throw frontierError('run id must use safe printable ASCII');
  }
  if (Buffer.byteLength(id, 'ascii') > ENDGAME_DISK_FRONTIER_LIMITS.runIdMaxBytes) {
    throw frontierError(`run id exceeds ${ENDGAME_DISK_FRONTIER_LIMITS.runIdMaxBytes} bytes`);
  }
}

function encodeRecord(key, previous) {
  if (typeof key !== 'string' || key.length === 0) throw frontierError('records cannot be blank');
  if (key.length > ENDGAME_DISK_FRONTIER_LIMITS.recordMaxBytes) {
    throw frontierError(`record exceeds ${ENDGAME_DISK_FRONTIER_LIMITS.recordMaxBytes} bytes`);
  }
  for (let index = 0; index < key.length; index += 1) {
    const code = key.charCodeAt(index);
    if (code < 0x20 || code > 0x7e) throw frontierError('record contains non-printable ASCII');
  }
  if (previous !== null && ordinalByteCompare(previous, key) >= 0) {
    throw frontierError('records must be strictly increasing and byte-deduplicated');
  }
  const bytes = Buffer.allocUnsafe(key.length + 1);
  bytes.write(key, 0, key.length, 'ascii');
  bytes[key.length] = 0x0a;
  return bytes;
}

function createStage(fs, stagePath) {
  if (typeof stagePath !== 'string' || !path.isAbsolute(stagePath)) {
    throw frontierError('stagePath must be absolute');
  }
  if (stagePath.length === 0 || stagePath.length > ENDGAME_DISK_FRONTIER_LIMITS.stagePathMaxCodeUnits) {
    throw frontierError(`stagePath must be 1..${ENDGAME_DISK_FRONTIER_LIMITS.stagePathMaxCodeUnits} UTF-16 code units`);
  }
  const exact = path.resolve(stagePath);
  if (normalizedPath(exact) !== normalizedPath(stagePath)) {
    throw frontierError('stagePath must already be normalized');
  }
  const parent = path.dirname(exact);
  const parentStats = fs.lstatSync(parent);
  assertPlainDirectory(parentStats, 'stage parent');
  assertExactRealpath(fs, parent);
  try {
    fs.lstatSync(exact);
    throw frontierError('stagePath must initially be absent');
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  let created = false;
  try {
    fs.mkdirSync(exact, { recursive: false, mode: 0o700 });
    created = true;
    assertPlainDirectory(fs.lstatSync(exact), 'created stage');
    assertExactRealpath(fs, exact);
    return exact;
  } catch (primary) {
    const cleanup = [];
    if (created) {
      try {
        fs.rmdirSync(exact);
      } catch (error) {
        cleanup.push(error);
      }
    }
    const primaryError = primary instanceof Error ? primary : new Error(String(primary));
    throw aggregate(primaryError, cleanup, 'Endgame stage creation failed.');
  }
}

/**
 * Creates one synchronous immutable-run store beneath an exact, initially absent stage.
 * `options.fs` is a deterministic low-level fault seam used only by authoring tests.
 */
export function createEndgameDiskFrontierStore(options) {
  if (!options || typeof options !== 'object') throw frontierError('options are required');
  const fs = Object.freeze({ ...DEFAULT_FS, ...(options.fs ?? {}) });
  for (const name of Object.keys(DEFAULT_FS)) {
    if (typeof fs[name] !== 'function') throw frontierError(`filesystem operation ${name} is missing`);
  }
  const stagePath = createStage(fs, options.stagePath);
  const registry = new Map();
  const writers = new Map();
  const runs = new Map();
  const cleanupErrors = [];
  let cleanupErrorsOmitted = 0;
  let residueTruncated = false;
  let closed = false;

  const rememberCleanup = (error) => {
    if (cleanupErrorsOmitted > 0) {
      cleanupErrorsOmitted += 1;
    } else if (cleanupErrors.length < ENDGAME_DISK_FRONTIER_LIMITS.diagnosticMaxEntries) {
      cleanupErrors.push(normalizeDiagnostic(error));
    } else {
      cleanupErrors.pop();
      cleanupErrorsOmitted = 2;
    }
  };

  const rememberAll = (errors) => {
    for (const error of errors) rememberCleanup(error);
  };

  const registryAdd = (filePath, entry) => {
    if (!registry.has(filePath) && registry.size >= ENDGAME_DISK_FRONTIER_LIMITS.registryMaxEntries) {
      throw frontierError(`created-file registry exceeds ${ENDGAME_DISK_FRONTIER_LIMITS.registryMaxEntries}`);
    }
    registry.set(filePath, entry);
  };

  const assertRegisteredFile = (filePath, expectedIdentity = null) => {
    if (!registry.has(filePath)) throw frontierError(`refusing unregistered path ${path.basename(filePath)}`);
    const stats = fs.lstatSync(filePath);
    assertPlainFile(stats, path.basename(filePath));
    assertExactRealpath(fs, filePath);
    const identity = statIdentity(stats);
    if (expectedIdentity && !sameIdentity(identity, expectedIdentity)) {
      throw frontierError(`immutable file identity changed for ${path.basename(filePath)}`);
    }
    return identity;
  };

  const unlinkRegistered = (filePath, expectedIdentity = null) => {
    assertRegisteredFile(filePath, expectedIdentity);
    fs.unlinkSync(filePath);
    registry.delete(filePath);
  };

  const makeRun = (id, filePath, size, identity) => {
    let disposed = false;
    const readerDescriptors = new Set();
    const values = function* values() {
      if (disposed) throw frontierError(`run ${id} is disposed`);
      assertRegisteredFile(filePath, identity);
      let descriptor = null;
      let primary;
      let hasPrimary = false;
      const cleanup = [];
      try {
        descriptor = fs.openSync(filePath, 'r');
        readerDescriptors.add(descriptor);
        const openedIdentity = statIdentity(fs.fstatSync(descriptor));
        if (!sameIdentity(openedIdentity, identity)) throw frontierError(`open identity changed for run ${id}`);
        const readBuffer = Buffer.allocUnsafe(ENDGAME_DISK_FRONTIER_LIMITS.readBufferBytes);
        const recordBuffer = Buffer.allocUnsafe(ENDGAME_DISK_FRONTIER_LIMITS.recordMaxBytes);
        let recordLength = 0;
        let count = 0;
        let previous = null;
        for (;;) {
          const bytesRead = fs.readSync(descriptor, readBuffer, 0, readBuffer.length, null);
          if (!Number.isInteger(bytesRead) || bytesRead < 0 || bytesRead > readBuffer.length) {
            throw frontierError(`invalid read count for run ${id}`);
          }
          if (bytesRead === 0) break;
          for (let index = 0; index < bytesRead; index += 1) {
            const byte = readBuffer[index];
            if (byte === 0x0a) {
              if (recordLength === 0) throw frontierError(`run ${id} contains a blank record`);
              const value = recordBuffer.subarray(0, recordLength).toString('ascii');
              if (previous !== null && ordinalByteCompare(previous, value) >= 0) {
                throw frontierError(`run ${id} is not strictly increasing`);
              }
              if (count >= size) throw frontierError(`run ${id} contains more than ${size} records`);
              previous = value;
              recordLength = 0;
              count += 1;
              yield value;
              continue;
            }
            if (byte < 0x20 || byte > 0x7e) throw frontierError(`run ${id} contains invalid framing`);
            if (recordLength >= recordBuffer.length) {
              throw frontierError(`run ${id} contains an overlong record`);
            }
            recordBuffer[recordLength] = byte;
            recordLength += 1;
          }
        }
        if (recordLength !== 0) throw frontierError(`run ${id} is missing its terminal LF`);
        if (count !== size) throw frontierError(`run ${id} contains ${count} records for size ${size}`);
        const finalIdentity = statIdentity(fs.fstatSync(descriptor));
        if (!sameIdentity(finalIdentity, identity)) throw frontierError(`run ${id} changed while reading`);
      } catch (error) {
        primary = error;
        hasPrimary = true;
      } finally {
        if (descriptor !== null) {
          try {
            fs.closeSync(descriptor);
            readerDescriptors.delete(descriptor);
          } catch (error) {
            cleanup.push(error);
            rememberCleanup(error);
          }
        }
        if (hasPrimary || cleanup.length > 0) {
          const primaryError = hasPrimary
            ? primary instanceof Error ? primary : new Error(String(primary))
            : null;
          throw aggregate(primaryError, cleanup, `Run ${id} read cleanup failed.`);
        }
      }
    };

    const run = Object.freeze({
      id,
      size,
      values,
      dispose() {
        if (disposed) return;
        const cleanup = [];
        for (const descriptor of [...readerDescriptors]) {
          try {
            fs.closeSync(descriptor);
            readerDescriptors.delete(descriptor);
          } catch (error) {
            cleanup.push(error);
            rememberCleanup(error);
          }
        }
        if (cleanup.length > 0) {
          throw aggregate(null, cleanup, `Run ${id} reader cleanup failed.`);
        }
        try {
          unlinkRegistered(filePath, identity);
          disposed = true;
          runs.delete(id);
        } catch (error) {
          rememberCleanup(error);
          throw error;
        }
      },
    });
    return run;
  };

  const createRun = (id) => {
    if (closed) throw frontierError('store is closed');
    validateRunId(id);
    if (writers.has(id) || runs.has(id)) throw frontierError(`duplicate run id ${id}`);
    if (registry.size >= ENDGAME_DISK_FRONTIER_LIMITS.registryMaxEntries) {
      throw frontierError(`created-file registry exceeds ${ENDGAME_DISK_FRONTIER_LIMITS.registryMaxEntries}`);
    }
    const partialPath = path.join(stagePath, `${id}.part`);
    const finalPath = path.join(stagePath, `${id}.run`);
    let descriptor;
    try {
      descriptor = fs.openSync(partialPath, 'wx', 0o600);
      registryAdd(partialPath, { id, kind: 'partial' });
    } catch (error) {
      throw error;
    }
    let filePath = partialPath;
    let state = 'open';
    let count = 0;
    let previous = null;
    let buffered = 0;
    const writeBuffer = Buffer.allocUnsafe(ENDGAME_DISK_FRONTIER_LIMITS.writeBufferBytes);

    const writeAll = (buffer, length) => {
      let offset = 0;
      while (offset < length) {
        const written = fs.writeSync(descriptor, buffer, offset, length - offset, null);
        if (!Number.isInteger(written) || written <= 0 || written > length - offset) {
          throw frontierError(`invalid write count for run ${id}`);
        }
        offset += written;
      }
    };

    const flush = () => {
      if (buffered === 0) return;
      writeAll(writeBuffer, buffered);
      buffered = 0;
    };

    const closeForCleanup = (errors) => {
      if (descriptor === null) return true;
      try {
        fs.closeSync(descriptor);
        descriptor = null;
        return true;
      } catch (error) {
        errors.push(error);
        rememberCleanup(error);
        return false;
      }
    };

    const writer = Object.freeze({
      write(key) {
        if (state !== 'open') throw frontierError(`run writer ${id} is not open`);
        const encoded = encodeRecord(key, previous);
        if (encoded.length > writeBuffer.length) throw frontierError(`record exceeds output buffer for run ${id}`);
        if (buffered + encoded.length > writeBuffer.length) flush();
        encoded.copy(writeBuffer, buffered);
        buffered += encoded.length;
        previous = key;
        count += 1;
      },
      finish() {
        if (state !== 'open') throw frontierError(`run writer ${id} cannot finish from ${state}`);
        try {
          flush();
          fs.fsyncSync(descriptor);
          fs.closeSync(descriptor);
          descriptor = null;
          fs.renameSync(partialPath, finalPath);
          registry.delete(partialPath);
          registryAdd(finalPath, { id, kind: 'run' });
          filePath = finalPath;
          const identity = assertRegisteredFile(finalPath);
          state = 'finished';
          writers.delete(id);
          const run = makeRun(id, finalPath, count, identity);
          runs.set(id, run);
          return run;
        } catch (error) {
          state = 'failed';
          throw error;
        }
      },
      abort() {
        if (state === 'aborted' || state === 'finished') return;
        const errors = [];
        const closedHandle = closeForCleanup(errors);
        if (closedHandle && registry.has(filePath)) {
          try {
            unlinkRegistered(filePath);
          } catch (error) {
            errors.push(error);
            rememberCleanup(error);
          }
        }
        if (errors.length === 0) {
          state = 'aborted';
          writers.delete(id);
          return;
        }
        throw aggregate(null, errors, `Run ${id} abort failed.`);
      },
    });
    writers.set(id, writer);
    return writer;
  };

  const scanResidue = () => {
    let entries;
    try {
      entries = fs.readdirSync(stagePath, { encoding: 'utf8' });
    } catch (error) {
      if (isMissing(error)) return [];
      rememberCleanup(error);
      const known = [...registry.keys()].map((filePath) => path.basename(filePath)).sort(ordinalByteCompare);
      entries = ['<unreadable-stage>', ...known];
    }
    const sorted = [...entries].map(String).sort(ordinalByteCompare);
    const maximumEntries = ENDGAME_DISK_FRONTIER_LIMITS.diagnosticMaxEntries - 1;
    if (sorted.length > maximumEntries) residueTruncated = true;
    return ['.', ...sorted.slice(0, maximumEntries)];
  };

  const diagnostics = () => {
    const activeRuns = [...new Set([...writers.keys(), ...runs.keys()])].sort(ordinalByteCompare);
    const residue = scanResidue();
    const errors = [...cleanupErrors];
    if (cleanupErrorsOmitted > 0) {
      errors.push(`Endgame disk cleanup errors truncated; omitted ${cleanupErrorsOmitted}.`);
    }
    return Object.freeze({
      activeRuns: Object.freeze(activeRuns),
      residue: Object.freeze(residue),
      residueTruncated,
      cleanupErrors: Object.freeze(errors),
      cleanupErrorsTruncated: cleanupErrorsOmitted > 0,
    });
  };

  const dispose = () => {
    closed = true;
    const errors = [];
    for (const writer of [...writers.values()]) {
      try {
        writer.abort();
      } catch (error) {
        errors.push(error);
      }
    }
    for (const run of [...runs.values()]) {
      try {
        run.dispose();
      } catch (error) {
        errors.push(error);
      }
    }
    let entries = null;
    try {
      entries = fs.readdirSync(stagePath, { encoding: 'utf8' }).map(String).sort(ordinalByteCompare);
    } catch (error) {
      if (!isMissing(error)) {
        errors.push(error);
        rememberCleanup(error);
      }
    }
    if (entries) {
      const registeredNames = new Set([...registry.keys()].map((filePath) => path.basename(filePath)));
      const foreign = entries.filter((entry) => !registeredNames.has(entry));
      if (foreign.length > 0) {
        const error = frontierError(`refusing foreign stage entries: ${foreign.join(',')}`);
        errors.push(error);
        rememberCleanup(error);
      }
      if (entries.length === 0) {
        try {
          fs.rmdirSync(stagePath);
        } catch (error) {
          errors.push(error);
          rememberCleanup(error);
        }
      }
    }
    if (errors.length > 0) throw aggregate(null, errors, 'Endgame disk frontier cleanup failed.');
  };

  return Object.freeze({ createRun, diagnostics, dispose });
}

function validateResumableOwnerId(ownerId) {
  if (typeof ownerId !== 'string' || ownerId.length === 0
    || Buffer.byteLength(ownerId, 'ascii') > RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS.ownerIdBytes
    || !/^[\x20-\x7E]+$/u.test(ownerId)) {
    throw frontierError('resumable ownerId must be 1..128 printable ASCII bytes');
  }
}

function normalizeResumableLimits(overrides) {
  if (overrides === undefined) return RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS;
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    throw frontierError('resumable test limits must be an object');
  }
  const result = { ...RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS };
  for (const [name, value] of Object.entries(overrides)) {
    if (!Object.hasOwn(result, name)) throw frontierError(`unknown resumable limit ${name}`);
    assertSafeNonnegativeInteger(value, `resumable limit ${name}`);
    if (value > RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS[name]) {
      throw frontierError(`resumable test limit ${name} cannot exceed production`);
    }
    result[name] = value;
  }
  return Object.freeze(result);
}

function proofFileIdentity(stats) {
  return Object.freeze({
    dev: String(stats.dev),
    ino: String(stats.ino),
    size: String(stats.size),
    mtimeNs: String(stats.mtimeNs),
    ctimeNs: String(stats.ctimeNs),
  });
}

function sameProofFileIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.size === right.size
    && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
}

function sameProofFileObject(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function proofIdentityKey(identity) {
  return `${identity.dev}:${identity.ino}:${identity.size}:${identity.mtimeNs}:${identity.ctimeNs}`;
}

function readBoundedProofFile(fs, filePath, maximumBytes) {
  const beforeStats = fs.lstatSync(filePath, { bigint: true });
  assertPlainFile(beforeStats, path.basename(filePath));
  assertExactRealpath(fs, filePath);
  const beforeIdentity = proofFileIdentity(beforeStats);
  const byteLength = Number(beforeStats.size);
  if (!Number.isSafeInteger(byteLength) || byteLength < 0 || byteLength > maximumBytes) {
    throw frontierError(`${path.basename(filePath)} exceeds ${maximumBytes} bytes`);
  }
  let descriptor = null;
  let primary = null;
  const cleanup = [];
  try {
    descriptor = fs.openSync(filePath, 'r');
    const opened = proofFileIdentity(fs.fstatSync(descriptor, { bigint: true }));
    if (!sameProofFileIdentity(beforeIdentity, opened)) throw frontierError(`${path.basename(filePath)} open identity drift`);
    const bytes = Buffer.alloc(byteLength);
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(descriptor, bytes, offset, bytes.length - offset, offset);
      if (!Number.isInteger(count) || count <= 0 || count > bytes.length - offset) {
        throw frontierError(`${path.basename(filePath)} returned an invalid read count`);
      }
      offset += count;
    }
    const after = proofFileIdentity(fs.fstatSync(descriptor, { bigint: true }));
    if (!sameProofFileIdentity(beforeIdentity, after)) throw frontierError(`${path.basename(filePath)} changed while reading`);
    return Object.freeze({ bytes, identity: beforeIdentity });
  } catch (error) {
    primary = error;
    throw error;
  } finally {
    if (descriptor !== null) {
      try {
        fs.closeSync(descriptor);
      } catch (error) {
        cleanup.push(error);
      }
    }
    if (cleanup.length > 0) throw aggregate(primary, cleanup, `${path.basename(filePath)} read cleanup failed.`);
  }
}

function writeAllProofBytes(fs, descriptor, bytes) {
  let offset = 0;
  while (offset < bytes.length) {
    const count = fs.writeSync(descriptor, bytes, offset, bytes.length - offset, offset);
    if (!Number.isInteger(count) || count <= 0 || count > bytes.length - offset) {
      throw frontierError('proof file returned an invalid write count');
    }
    offset += count;
  }
}

function scanResumableInventory(fs, stagePath, limits) {
  const names = fs.readdirSync(stagePath, { encoding: 'utf8' }).map(String).sort(ordinalByteCompare);
  if (names.length > limits.maximumNamespaceEntries) {
    throw frontierError(`resumable namespace exceeds ${limits.maximumNamespaceEntries} entries`);
  }
  const entries = new Map();
  const physicalRuns = new Map();
  let retainedManifestBytes = 0;
  let ownerAndIndexBytes = 0;
  for (const name of names) {
    if (name === '.' || name === '..' || path.basename(name) !== name) throw frontierError('invalid stage entry name');
    const filePath = path.join(stagePath, name);
    const stats = fs.lstatSync(filePath, { bigint: true });
    assertPlainFile(stats, name);
    assertExactRealpath(fs, filePath);
    const identity = proofFileIdentity(stats);
    const bytes = Number(stats.size);
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw frontierError(`${name} has an unsafe byte length`);
    entries.set(name, Object.freeze({ name, filePath, bytes, identity }));
    if (/^manifest-g[0-9]{5}\.json(?:\.part)?$/u.test(name)) retainedManifestBytes += bytes;
    if (name === 'owner.json' || name === 'owner.json.part' || /\.idx(?:\.part)?$/u.test(name)) {
      ownerAndIndexBytes += bytes;
    }
    if (/\.run(?:\.part)?$/u.test(name)) physicalRuns.set(proofIdentityKey(identity), bytes);
  }
  const recognizedPhysicalRunBytes = [...physicalRuns.values()].reduce((sum, value) => sum + value, 0);
  if (retainedManifestBytes > limits.retainedManifestBytes) throw frontierError('retained manifest bytes exceed the limit');
  if (ownerAndIndexBytes > limits.ownerAndIndexBytes) throw frontierError('owner/index bytes exceed the limit');
  if (recognizedPhysicalRunBytes > limits.recognizedPhysicalRunBytes) throw frontierError('physical run bytes exceed the limit');
  return Object.freeze({
    names: Object.freeze(names),
    entries,
    namespaceEntries: names.length,
    retainedManifestBytes,
    ownerAndIndexBytes,
    recognizedPhysicalRunBytes,
    uncommittedWorkingRunBytes: recognizedPhysicalRunBytes,
  });
}

const R7_COMMITTED_RUN = /^(?:r7-f-d([0-9]{5})-g([0-9]{5})|r7-u-d([0-9]{5})-n([0-9]{8})-g([0-9]{5}))$/u;
const R7_WORKING_RUN = /^r7w-(?:u-g([0-9]{5})-d([0-9]{5})-n([0-9]{8})|l-g([0-9]{5})-d([0-9]{5}))-p([0-9]{4})-h([0-9]{4})$/u;

function classifyResumableRunId(id) {
  validateRunId(id);
  const committed = R7_COMMITTED_RUN.exec(id);
  if (committed) {
    const depth = Number(committed[1] ?? committed[3]);
    const maybeUnit = committed[4] === undefined ? null : Number(committed[4]);
    const generation = Number(committed[2] ?? committed[5]);
    if (depth > 32_767 || generation > 32_767 || (maybeUnit !== null && maybeUnit > 4_095)) {
      throw frontierError(`committed run id ${id} exceeds its token range`);
    }
    return Object.freeze({ committed: true, generation });
  }
  const working = R7_WORKING_RUN.exec(id);
  if (!working) throw frontierError(`run id ${id} is outside the R7 grammar`);
  const generation = Number(working[1] ?? working[4]);
  const depth = Number(working[2] ?? working[5]);
  const unit = working[3] === undefined ? null : Number(working[3]);
  const pass = Number(working[6]);
  const group = Number(working[7]);
  if (generation > 32_767 || depth > 32_767 || (unit !== null && unit > 4_095) || pass > 4_095 || group > 4_095) {
    throw frontierError(`working run id ${id} exceeds its token range`);
  }
  return Object.freeze({ committed: false, generation });
}

function admitNamespacePeak(current, addition, maximum) {
  assertSafeNonnegativeInteger(current, 'current namespace entries');
  assertSafeNonnegativeInteger(addition, 'namespace peak addition');
  assertSafeNonnegativeInteger(maximum, 'maximum namespace entries');
  if (current + addition > maximum) throw frontierError(`namespace peak ${current + addition} exceeds ${maximum}`);
}

function admitCandidateIndex(size, inventory, limits, generationNamespaceBaseline) {
  const layout = resumableIndexLayout(size);
  if (layout.indexBytes > limits.ownerOrIndexBytes) throw frontierError('run index exceeds its individual byte limit');
  admitNamespacePeak(generationNamespaceBaseline, 4, limits.maximumNamespaceEntries);
  admitNamespacePeak(inventory.namespaceEntries, 2, limits.maximumNamespaceEntries);
  if (inventory.ownerAndIndexBytes + 2 * layout.indexBytes > limits.ownerAndIndexBytes) {
    throw frontierError('run index two-alias bytes exceed the owner/index limit');
  }
  if (inventory.retainedManifestBytes + inventory.ownerAndIndexBytes + 2 * layout.indexBytes > limits.auxiliaryBytes) {
    throw frontierError('run index two-alias bytes exceed the auxiliary limit');
  }
  return layout;
}

function inspectProofRunFile(fs, filePath, expectedSize, expectedIdentity = null) {
  const stats = fs.lstatSync(filePath, { bigint: true });
  assertPlainFile(stats, path.basename(filePath));
  const identity = proofFileIdentity(stats);
  if (expectedIdentity && !sameProofFileIdentity(identity, expectedIdentity)) throw frontierError('run file identity drift');
  const dataBytes = Number(stats.size);
  if (!Number.isSafeInteger(dataBytes)) throw frontierError('run byte length exceeds safe integer range');
  let descriptor = null;
  const hash = createHash('sha256');
  let count = 0;
  let firstKey = null;
  let lastKey = null;
  let record = '';
  try {
    descriptor = fs.openSync(filePath, 'r');
    if (!sameProofFileIdentity(identity, proofFileIdentity(fs.fstatSync(descriptor, { bigint: true })))) throw frontierError('run open identity drift');
    const buffer = Buffer.allocUnsafe(ENDGAME_DISK_FRONTIER_LIMITS.readBufferBytes);
    let position = 0;
    while (position < dataBytes) {
      const length = Math.min(buffer.length, dataBytes - position);
      const read = fs.readSync(descriptor, buffer, 0, length, position);
      if (!Number.isInteger(read) || read <= 0 || read > length) throw frontierError('run returned an invalid read count');
      hash.update(buffer.subarray(0, read));
      for (let index = 0; index < read; index += 1) {
        const byte = buffer[index];
        if (byte === 0x0a) {
          if (record.length === 0) throw frontierError('run contains a blank record');
          if (lastKey !== null && ordinalByteCompare(lastKey, record) >= 0) throw frontierError('run is not strictly increasing');
          if (firstKey === null) firstKey = record;
          lastKey = record;
          record = '';
          count += 1;
        } else {
          if (byte < 0x20 || byte > 0x7e || record.length >= ENDGAME_DISK_FRONTIER_LIMITS.recordMaxBytes) {
            throw frontierError('run contains invalid framing');
          }
          record += String.fromCharCode(byte);
        }
      }
      position += read;
    }
    if (record.length !== 0) throw frontierError('run is missing its terminal LF');
    if (count !== expectedSize) throw frontierError(`run contains ${count} records for size ${expectedSize}`);
    if (!sameProofFileIdentity(identity, proofFileIdentity(fs.fstatSync(descriptor, { bigint: true })))) throw frontierError('run changed while reading');
  } finally {
    if (descriptor !== null) fs.closeSync(descriptor);
  }
  return Object.freeze({ dataBytes, dataSha256: hash.digest('hex').toUpperCase(), firstKey, lastKey, identity });
}

function* readProofRunRange(fs, filePath, identity, size, offsets, range) {
  const selected = range === undefined ? { startOrdinal: 0, endOrdinal: size } : validateResumableRunRange(size, range);
  if (selected.startOrdinal === selected.endOrdinal) return;
  const { startOffset, endOffset } = resumableRangeByteOffsets({ size, offsets }, selected);
  let descriptor = null;
  let count = 0;
  let previous = null;
  let record = '';
  try {
    descriptor = fs.openSync(filePath, 'r');
    if (!sameProofFileIdentity(identity, proofFileIdentity(fs.fstatSync(descriptor, { bigint: true })))) throw frontierError('range reader identity drift');
    const buffer = Buffer.allocUnsafe(ENDGAME_DISK_FRONTIER_LIMITS.readBufferBytes);
    let position = startOffset;
    while (position < endOffset) {
      const length = Math.min(buffer.length, endOffset - position);
      const read = fs.readSync(descriptor, buffer, 0, length, position);
      if (!Number.isInteger(read) || read <= 0 || read > length) throw frontierError('range reader returned an invalid count');
      for (let index = 0; index < read; index += 1) {
        const byte = buffer[index];
        if (byte === 0x0a) {
          if (record.length === 0 || (previous !== null && ordinalByteCompare(previous, record) >= 0)) throw frontierError('range record framing/order drift');
          previous = record;
          record = '';
          count += 1;
          yield previous;
        } else {
          if (byte < 0x20 || byte > 0x7e || record.length >= ENDGAME_DISK_FRONTIER_LIMITS.recordMaxBytes) throw frontierError('range record framing drift');
          record += String.fromCharCode(byte);
        }
      }
      position += read;
    }
    if (record.length !== 0 || count !== selected.endOrdinal - selected.startOrdinal) throw frontierError('range yielded the wrong record count');
    if (!sameProofFileIdentity(identity, proofFileIdentity(fs.fstatSync(descriptor, { bigint: true })))) throw frontierError('run changed during range read');
  } finally {
    if (descriptor !== null) {
      try { fs.closeSync(descriptor); } catch (error) {
        Object.defineProperty(error, 'r7CloseFailed', { value: true });
        throw error;
      }
    }
  }
}

function exactResumableStage(fs, stagePath, mode) {
  if (typeof stagePath !== 'string' || !path.isAbsolute(stagePath)) throw frontierError('stagePath must be absolute');
  const exact = path.resolve(stagePath);
  if ((process.platform === 'win32' ? exact.toLowerCase() : exact)
    !== (process.platform === 'win32' ? stagePath.toLowerCase() : stagePath)) throw frontierError('stagePath must already be normalized');
  if (exact.length === 0 || exact.length > ENDGAME_DISK_FRONTIER_LIMITS.stagePathMaxCodeUnits) {
    throw frontierError('stagePath length is invalid');
  }
  if (mode === 'create') return createStage(fs, exact);
  const stats = fs.lstatSync(exact, { bigint: true });
  assertPlainDirectory(stats, 'resumable stage');
  assertExactRealpath(fs, exact);
  return exact;
}

function publishResumableOwner(fs, stagePath, ownerBytes, limits) {
  if (ownerBytes.length > limits.ownerOrIndexBytes) throw frontierError('owner.json exceeds its individual byte limit');
  const initial = scanResumableInventory(fs, stagePath, limits);
  if (initial.namespaceEntries + 2 > limits.maximumNamespaceEntries
    || initial.ownerAndIndexBytes + 2 * ownerBytes.length > limits.ownerAndIndexBytes) {
    throw frontierError('owner two-alias admission exceeds resumable limits');
  }
  const partPath = path.join(stagePath, 'owner.json.part');
  const finalPath = path.join(stagePath, 'owner.json');
  let descriptor = null;
  try {
    descriptor = fs.openSync(partPath, 'wx', 0o600);
    writeAllProofBytes(fs, descriptor, ownerBytes);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = null;
    const part = readBoundedProofFile(fs, partPath, limits.ownerOrIndexBytes);
    if (!part.bytes.equals(ownerBytes)) throw frontierError('owner part bytes changed before publication');
    fs.linkSync(partPath, finalPath);
    const linkedPart = readBoundedProofFile(fs, partPath, limits.ownerOrIndexBytes);
    const linked = readBoundedProofFile(fs, finalPath, limits.ownerOrIndexBytes);
    if (!linked.bytes.equals(ownerBytes) || !sameProofFileIdentity(linkedPart.identity, linked.identity)) {
      throw frontierError('owner final does not match its hard-link part');
    }
    fs.unlinkSync(partPath);
    const final = readBoundedProofFile(fs, finalPath, limits.ownerOrIndexBytes);
    if (!final.bytes.equals(ownerBytes)) throw frontierError('owner final changed after alias contraction');
  } finally {
    if (descriptor !== null) fs.closeSync(descriptor);
  }
}

function validateResumableTip(tip) {
  if (!tip || typeof tip !== 'object' || !Number.isSafeInteger(tip.generation)
    || tip.generation < 0 || tip.generation >= RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS.maximumManifests
    || typeof tip.manifestSha256 !== 'string' || !R7_HASH_PATTERN.test(tip.manifestSha256)) {
    throw frontierError('expectedTip is invalid');
  }
}

/**
 * Creates or resumes the R7 persistent proof namespace. Manifest publication and active-run
 * replay are layered onto this owner/admission cache by the following bounded checkpoint.
 */
export function createResumableEndgameDiskFrontierStore(options) {
  if (!options || typeof options !== 'object') throw frontierError('resumable options are required');
  const { mode, ownerId } = options;
  if (mode !== 'create' && mode !== 'resume') throw frontierError('resumable mode must be create or resume');
  validateResumableOwnerId(ownerId);
  if (mode === 'resume' && !Object.hasOwn(options, 'expectedTip')) {
    throw frontierError('resume requires expectedTip, including explicit null');
  }
  if (mode === 'resume' && options.expectedTip !== null) validateResumableTip(options.expectedTip);
  const fs = Object.freeze({ ...RESUMABLE_DEFAULT_FS, ...(options.fs ?? {}) });
  for (const name of Object.keys(RESUMABLE_DEFAULT_FS)) {
    if (typeof fs[name] !== 'function') throw frontierError(`filesystem operation ${name} is missing`);
  }
  const limits = normalizeResumableLimits(options.limits);
  const stagePath = exactResumableStage(fs, options.stagePath, mode);
  const ownerValue = Object.freeze({ schema: 't37-f4e-r7-owner-v1', ownerId });
  const ownerBytes = Buffer.from(`${canonicalizeJson(ownerValue)}\n`, 'utf8');
  if (mode === 'create') publishResumableOwner(fs, stagePath, ownerBytes, limits);
  let inventory = scanResumableInventory(fs, stagePath, limits);
  const manifests = inventory.names.filter((name) => /^manifest-g[0-9]{5}\.json$/u.test(name));
  if (mode === 'resume' && options.expectedTip !== null && manifests.length === 0) {
    throw frontierError('authenticated rollback: expectedTip is absent from the manifest chain');
  }
  const owner = inventory.entries.get('owner.json');
  const ownerPart = inventory.entries.get('owner.json.part');
  let blockedReason = null;
  if (!owner) {
    if (mode === 'create') throw frontierError('created owner final is absent');
    if (options.expectedTip !== null) throw frontierError('authenticated rollback: owner final is absent');
    if (inventory.names.length === 0) blockedReason = 'pre-owner-empty-residue';
    else if (inventory.names.length === 1 && ownerPart) blockedReason = 'pre-owner-part-residue';
    else throw frontierError('owner final is absent with ambiguous stage entries');
  } else {
    const verifiedOwner = readBoundedProofFile(fs, owner.filePath, limits.ownerOrIndexBytes);
    const parsedOwner = parseCanonicalLfBytes(verifiedOwner.bytes);
    if (canonicalizeJson(parsedOwner) !== canonicalizeJson(ownerValue)) throw frontierError('owner.json does not match ownerId');
    if (ownerPart) {
      const verifiedPart = readBoundedProofFile(fs, ownerPart.filePath, limits.ownerOrIndexBytes);
      if (!sameProofFileIdentity(verifiedOwner.identity, verifiedPart.identity)
        || !verifiedOwner.bytes.equals(verifiedPart.bytes)) throw frontierError('owner alias identity mismatch');
      if (inventory.names.length === 2 && manifests.length === 0 && options.expectedTip === null) {
        blockedReason = 'owner-alias-residue';
      }
    }
    const unrelated = inventory.names.filter((name) => name !== 'owner.json' && name !== 'owner.json.part');
    if (unrelated.length > 0) throw frontierError('manifest admission scan is not yet available in this checkpoint');
  }
  let invalidated = false;
  let viewOutstanding = false;
  let disposed = false;
  let suspendCloseFailed = false;
  const writers = new Map();
  const runs = new Map();
  const activeReaders = new Set();
  const cleanupErrors = [];
  let candidateReservation = null;
  let workingRunBytes = inventory.uncommittedWorkingRunBytes;
  let physicalRunBytes = inventory.recognizedPhysicalRunBytes;
  const refreshInventory = () => {
    inventory = scanResumableInventory(fs, stagePath, limits);
    workingRunBytes = inventory.uncommittedWorkingRunBytes;
    physicalRunBytes = inventory.recognizedPhysicalRunBytes;
  };
  const unlinkOwnedRunPart = (filePath, ownedIdentity, allowOwnedGrowth = false) => {
    let stats;
    try {
      stats = fs.lstatSync(filePath, { bigint: true });
    } catch (error) {
      if (isMissing(error)) return;
      throw error;
    }
    const current = proofFileIdentity(stats);
    if (!(allowOwnedGrowth ? sameProofFileObject(current, ownedIdentity) : sameProofFileIdentity(current, ownedIdentity))) {
      throw frontierError(`refusing changed run part ${path.basename(filePath)}`);
    }
    fs.unlinkSync(filePath);
  };
  const makeWorkingRun = (record) => {
    let runDisposed = false;
    const runReaders = new Set();
    const trackedValues = (range) => {
      const source = readProofRunRange(fs, record.filePath, record.identity, record.size, record.offsets, range);
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        activeReaders.delete(iterator);
        runReaders.delete(iterator);
      };
      const iterator = {
        [Symbol.iterator]() { return this; },
        next() {
          try { const result = source.next(); if (result.done) release(); return result; }
          catch (error) { release(); throw error; }
        },
        return() {
          try { return source.return?.() ?? { done: true, value: undefined }; }
          finally { release(); }
        },
        throw(error) {
          try { return source.throw?.(error) ?? (() => { throw error; })(); }
          finally { release(); }
        },
      };
      activeReaders.add(iterator);
      runReaders.add(iterator);
      return iterator;
    };
    const run = Object.freeze({
      id: record.id,
      size: record.size,
      values(range) {
        if (runDisposed || invalidated || disposed) throw frontierError(`run ${record.id} is invalidated`);
        return trackedValues(range);
      },
      dispose() {
        if (runDisposed) return;
        const errors = [];
        for (const reader of [...runReaders]) {
          try { reader.return(); } catch (error) { errors.push(error); }
        }
        if (errors.length > 0) throw aggregate(null, errors, `Run ${record.id} reader cleanup failed.`);
        const cleanup = [];
        if (record.indexFilePath) {
          try { unlinkOwnedRunPart(record.indexFilePath, record.indexIdentity); } catch (error) { cleanup.push(error); }
        }
        try { unlinkOwnedRunPart(record.filePath, record.identity); } catch (error) { cleanup.push(error); }
        if (cleanup.length > 0) throw aggregate(null, cleanup, `Run ${record.id} cleanup failed.`);
        runDisposed = true;
        runs.delete(record.id);
        if (candidateReservation?.id === record.id) candidateReservation = null;
        refreshInventory();
      },
    });
    runs.set(record.id, { run, record });
    return run;
  };
  const createRun = (id) => {
    requireLive();
    if (blockedReason !== null) throw frontierError(`advance is blocked by ${blockedReason}`);
    const classification = classifyResumableRunId(id);
    if (writers.has(id) || runs.has(id)) throw frontierError(`duplicate run id ${id}`);
    if (candidateReservation !== null) throw frontierError(`candidate ${candidateReservation.id} still owns the generation reservation`);
    refreshInventory();
    admitNamespacePeak(inventory.namespaceEntries, classification.committed ? 4 : 1, limits.maximumNamespaceEntries);
    const filePath = path.join(stagePath, `${id}.run.part`);
    let descriptor = null;
    let ownedIdentity;
    try {
      descriptor = fs.openSync(filePath, 'wx', 0o600);
      ownedIdentity = proofFileIdentity(fs.fstatSync(descriptor, { bigint: true }));
    } catch (primary) {
      const cleanup = [];
      if (descriptor !== null) {
        try { fs.closeSync(descriptor); descriptor = null; } catch (error) {
          Object.defineProperty(error, 'r7CloseFailed', { value: true });
          cleanup.push(error);
        }
      }
      try { fs.unlinkSync(filePath); } catch (error) { if (!isMissing(error)) cleanup.push(error); }
      throw aggregate(primary, cleanup, `Run ${id} bootstrap failed.`);
    }
    if (classification.committed) candidateReservation = { id, baseline: inventory.namespaceEntries };
    const ownedPaths = new Map([[filePath, ownedIdentity]]);
    let pendingIndexDescriptor = null;
    let pendingIndexPath = null;
    let state = 'open';
    let size = 0;
    let dataBytes = 0;
    let first = null;
    let previous = null;
    const offsets = [0];
    const closeWriter = () => {
      if (descriptor === null) return;
      fs.closeSync(descriptor);
      descriptor = null;
    };
    const closePendingIndex = () => {
      if (pendingIndexDescriptor === null) return;
      try { fs.closeSync(pendingIndexDescriptor); pendingIndexDescriptor = null; }
      catch (error) { Object.defineProperty(error, 'r7CloseFailed', { value: true }); throw error; }
    };
    const abort = () => {
      if (state === 'aborted' || state === 'finished') return;
      const errors = [];
      let closeFailed = false;
      try { closeWriter(); } catch (error) { closeFailed = true; errors.push(error); }
      try { closePendingIndex(); } catch (error) { closeFailed = true; errors.push(error); }
      for (const [ownedPath, identity] of [...ownedPaths.entries()].reverse()) {
        try { unlinkOwnedRunPart(ownedPath, identity, true); } catch (error) { errors.push(error); }
      }
      if (pendingIndexPath !== null && !ownedPaths.has(pendingIndexPath)) {
        try { fs.unlinkSync(pendingIndexPath); } catch (error) { if (!isMissing(error)) errors.push(error); }
      }
      if (errors.length > 0) {
        const failure = aggregate(null, errors, `Run ${id} abort failed.`);
        Object.defineProperty(failure, 'r7CloseFailed', { value: closeFailed });
        throw failure;
      }
      state = 'aborted';
      writers.delete(id);
      if (candidateReservation?.id === id) candidateReservation = null;
      refreshInventory();
    };
    const writer = Object.freeze({
      write(key) {
        if (state !== 'open') throw frontierError(`run writer ${id} is not open`);
        const encoded = encodeRecord(key, previous);
        if (workingRunBytes + encoded.length > limits.uncommittedWorkingRunBytes) {
          throw frontierError('uncommitted working run bytes exceed the limit');
        }
        if (physicalRunBytes + encoded.length > limits.recognizedPhysicalRunBytes) {
          throw frontierError('recognized physical run bytes exceed the limit');
        }
        if (size > 0 && size % R7_INDEX_STRIDE === 0) offsets.push(dataBytes);
        let written = 0;
        try {
          while (written < encoded.length) {
            const count = fs.writeSync(descriptor, encoded, written, encoded.length - written, dataBytes + written);
            if (!Number.isInteger(count) || count <= 0 || count > encoded.length - written) throw frontierError('run writer returned an invalid count');
            written += count;
          }
        } catch (error) {
          state = 'failed';
          refreshInventory();
          throw error;
        }
        size += 1;
        dataBytes += encoded.length;
        workingRunBytes += encoded.length;
        physicalRunBytes += encoded.length;
        if (first === null) first = key;
        previous = key;
      },
      finish() {
        if (state !== 'open') throw frontierError(`run writer ${id} cannot finish from ${state}`);
        fs.fsyncSync(descriptor);
        closeWriter();
        const inspected = inspectProofRunFile(fs, filePath, size);
        if (!sameProofFileObject(inspected.identity, ownedIdentity) || inspected.dataBytes !== dataBytes
          || inspected.firstKey !== first || inspected.lastKey !== previous) {
          throw frontierError('working run readback drift');
        }
        if (size > 0) offsets.push(dataBytes);
        bindResumableIndexToDataBytes({ size, offsets }, dataBytes);
        if (classification.committed) {
          const indexBytes = encodeResumableRunIndex(size, offsets);
          refreshInventory();
          try {
            admitCandidateIndex(size, inventory, limits, candidateReservation.baseline);
          } catch (primary) {
            state = 'failed';
            const cleanup = [];
            try { abort(); } catch (error) { cleanup.push(error); }
            throw aggregate(primary, cleanup, `Run ${id} index admission failed.`);
          }
          const runFinalPath = path.join(stagePath, `${id}.run`);
          const indexPartPath = path.join(stagePath, `${id}.idx.part`);
          const indexFinalPath = path.join(stagePath, `${id}.idx`);
          try {
            fs.linkSync(filePath, runFinalPath);
            const linkedPart = proofFileIdentity(fs.lstatSync(filePath, { bigint: true }));
            const linkedFinal = proofFileIdentity(fs.lstatSync(runFinalPath, { bigint: true }));
            if (!sameProofFileIdentity(linkedPart, linkedFinal)) throw frontierError('run hard-link aliases disagree');
            ownedPaths.set(filePath, linkedPart);
            ownedPaths.set(runFinalPath, linkedFinal);
            unlinkOwnedRunPart(filePath, linkedPart);
            ownedPaths.delete(filePath);
            try { fs.lstatSync(filePath); throw frontierError('run part survived alias contraction'); }
            catch (error) { if (!isMissing(error)) throw error; }
            const finalRun = inspectProofRunFile(fs, runFinalPath, size);
            if (!sameProofFileObject(finalRun.identity, ownedIdentity) || finalRun.dataBytes !== dataBytes
              || finalRun.dataSha256 !== inspected.dataSha256) throw frontierError('run final verification drift');
            ownedPaths.set(runFinalPath, finalRun.identity);
            refreshInventory();
            admitCandidateIndex(size, inventory, limits, candidateReservation.baseline);
            pendingIndexPath = indexPartPath;
            pendingIndexDescriptor = fs.openSync(indexPartPath, 'wx', 0o600);
            const indexOwned = proofFileIdentity(fs.fstatSync(pendingIndexDescriptor, { bigint: true }));
            ownedPaths.set(indexPartPath, indexOwned);
            writeAllProofBytes(fs, pendingIndexDescriptor, indexBytes);
            fs.fsyncSync(pendingIndexDescriptor);
            closePendingIndex();
            const indexPart = readBoundedProofFile(fs, indexPartPath, limits.ownerOrIndexBytes);
            if (!indexPart.bytes.equals(indexBytes)) throw frontierError('index part readback drift');
            fs.linkSync(indexPartPath, indexFinalPath);
            const linkedIndexPart = readBoundedProofFile(fs, indexPartPath, limits.ownerOrIndexBytes);
            const linkedIndexFinal = readBoundedProofFile(fs, indexFinalPath, limits.ownerOrIndexBytes);
            if (!linkedIndexPart.bytes.equals(indexBytes) || !linkedIndexFinal.bytes.equals(indexBytes)
              || !sameProofFileIdentity(linkedIndexPart.identity, linkedIndexFinal.identity)) throw frontierError('index hard-link aliases disagree');
            ownedPaths.set(indexPartPath, linkedIndexPart.identity);
            ownedPaths.set(indexFinalPath, linkedIndexFinal.identity);
            unlinkOwnedRunPart(indexPartPath, linkedIndexPart.identity);
            ownedPaths.delete(indexPartPath);
            pendingIndexPath = null;
            try { fs.lstatSync(indexPartPath); throw frontierError('index part survived alias contraction'); }
            catch (error) { if (!isMissing(error)) throw error; }
            const finalIndex = readBoundedProofFile(fs, indexFinalPath, limits.ownerOrIndexBytes);
            assertExactPublishedIndexBytes(finalIndex.bytes, indexBytes);
            const parsedIndex = bindResumableIndexToDataBytes(decodeResumableRunIndex(finalIndex.bytes), dataBytes);
            if (parsedIndex.size !== size) throw frontierError('index final size drift');
            ownedPaths.set(indexFinalPath, finalIndex.identity);
            state = 'finished';
            writers.delete(id);
            refreshInventory();
            const descriptorRecord = Object.freeze({
              id, size, dataFile: `${id}.run`, dataBytes, dataSha256: finalRun.dataSha256,
              indexFile: `${id}.idx`, indexBytes: finalIndex.bytes.length,
              indexSha256: sha256Upper(finalIndex.bytes), firstKey: finalRun.firstKey,
              lastKey: finalRun.lastKey, dataIdentity: finalRun.identity, indexIdentity: finalIndex.identity,
            });
            return makeWorkingRun(Object.freeze({ id, size, filePath: runFinalPath, offsets: parsedIndex.offsets,
              identity: finalRun.identity, indexFilePath: indexFinalPath, indexIdentity: finalIndex.identity,
              descriptor: descriptorRecord }));
          } catch (error) {
            state = 'failed';
            throw error;
          }
        }
        state = 'finished';
        writers.delete(id);
        refreshInventory();
        return makeWorkingRun(Object.freeze({ id, size, filePath, offsets: Object.freeze(offsets), identity: inspected.identity }));
      },
      abort,
    });
    writers.set(id, writer);
    refreshInventory();
    return writer;
  };
  const diagnostics = () => Object.freeze({
    activeRuns: Object.freeze([...new Set([...writers.keys(), ...runs.keys()])].sort(ordinalByteCompare)),
    residue: Object.freeze(blockedReason === null ? [] : ['.', ...inventory.names.filter((name) => name !== 'owner.json')]),
    residueTruncated: false,
    cleanupErrors: Object.freeze([...cleanupErrors]),
    cleanupErrorsTruncated: cleanupErrors.length >= ENDGAME_DISK_FRONTIER_LIMITS.diagnosticMaxEntries,
  });
  const requireLive = () => {
    if (invalidated || disposed) throw frontierError('resumable Store is suspended or disposed');
  };
  const loadCheckpoint = () => {
    requireLive();
    if (viewOutstanding) throw frontierError('a checkpoint view is already outstanding');
    viewOutstanding = true;
    return Object.freeze({ checkpoint: null, tip: null, diagnostics: diagnostics(), advanceAllowed: blockedReason === null });
  };
  const suspend = () => {
    if (!invalidated) {
      for (const reader of [...activeReaders]) {
        try { reader.return(); } catch (error) {
          if (error?.r7CloseFailed === true) suspendCloseFailed = true;
          if (cleanupErrors.length < ENDGAME_DISK_FRONTIER_LIMITS.diagnosticMaxEntries) cleanupErrors.push(normalizeDiagnostic(error));
        }
      }
      for (const writer of [...writers.values()]) {
        try { writer.abort(); } catch (error) {
          if (error?.r7CloseFailed === true) suspendCloseFailed = true;
          if (cleanupErrors.length < ENDGAME_DISK_FRONTIER_LIMITS.diagnosticMaxEntries) cleanupErrors.push(normalizeDiagnostic(error));
        }
      }
      for (const { run } of [...runs.values()]) {
        try { run.dispose(); } catch (error) {
          if (cleanupErrors.length < ENDGAME_DISK_FRONTIER_LIMITS.diagnosticMaxEntries) cleanupErrors.push(normalizeDiagnostic(error));
        }
      }
      invalidated = true;
      viewOutstanding = false;
    }
    return Object.freeze({ diagnostics: diagnostics(), closeFailed: suspendCloseFailed });
  };
  const dispose = () => {
    if (disposed) return;
    for (const writer of [...writers.values()]) writer.abort();
    for (const { run } of [...runs.values()]) run.dispose();
    const current = scanResumableInventory(fs, stagePath, limits);
    if (current.names.length !== inventory.names.length
      || current.names.some((name, index) => name !== inventory.names[index]
        || !sameProofFileIdentity(current.entries.get(name).identity, inventory.entries.get(name).identity))) {
      throw frontierError('refusing final teardown after stage inventory drift');
    }
    for (const name of [...current.names].reverse()) fs.unlinkSync(path.join(stagePath, name));
    fs.rmdirSync(stagePath);
    inventory = Object.freeze({ ...inventory, names: Object.freeze([]), entries: new Map() });
    disposed = true;
    invalidated = true;
    viewOutstanding = false;
  };
  return Object.freeze({
    createRun,
    diagnostics,
    dispose,
    loadCheckpoint,
    publishCheckpoint() { requireLive(); throw frontierError('resumable manifest publication is not available in the owner checkpoint'); },
    releaseCheckpointRun() { requireLive(); throw frontierError('no committed run is loaded'); },
    suspend,
  });
}
