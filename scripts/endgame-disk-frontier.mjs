import * as nativeFs from 'node:fs';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { types as nativeTypes } from 'node:util';

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
const R7_DECIMAL_PATTERN = /^(?:0|[1-9][0-9]*)$/u;
const R7_MANIFEST_SCHEMA = 't37-f4e-r7-checkpoint-delta-v1';
const R7_BINDING_HASH_LABEL = 'T37-F4E-R7-BINDING-V1';
const R7_DESCRIPTOR_HASH_LABEL = 'T37-F4E-R7-RUN-DESCRIPTOR-V1';
const R7_RUN_SET_HASH_LABEL = 'T37-F4E-R7-RUN-SET-V1';
const R7_NEXT_RUNS_EMPTY_HASH = canonicalHash('T37-F4E-R7-NEXT-RUNS-EMPTY-V1', []);
const R7_DEPTHS_EMPTY_HASH = canonicalHash('T37-F4E-R7-DEPTHS-EMPTY-V1', []);
const R7_CHECKPOINT_STATE_HASH_LABEL = 'T37-F4E-R7-CHECKPOINT-STATE-V1';
const R7_MANIFEST_PLAN_HASH_LABEL = 'T37-F4E-R7-MANIFEST-PLAN-V1';
const R7_MANIFEST_PLAN_SNAPSHOTS = new WeakMap();
const R7_PREPARED_MANIFEST_TRANSITIONS = new WeakMap();
const R7_PENDING_MANIFEST_TRANSITIONS = new WeakMap();
const R7_MANIFEST_STATES = new WeakSet();
const R7_OWNED_CANDIDATE_INDEX_PROBES = new WeakMap();
const R7_AUTHORIZATION_BUCKET_VISIT_PROBES = new WeakMap();
const R7_NATIVE_ARRAY_PUSH = Array.prototype.push;
const R7_NATIVE_IS_PROXY = nativeTypes.isProxy;
const R7_NATIVE_SET_ADD = Set.prototype.add;
const R7_NATIVE_SET_HAS = Set.prototype.has;
const R7_NATIVE_SET_SIZE = Object.getOwnPropertyDescriptor(Set.prototype, 'size').get;
const R7_MANIFEST_STATE_KEYS = Object.freeze([
  'tip', 'binding', 'bindingSha256', 'kind', 'generation', 'depth', 'parentOffset',
  'lastProcessedParentKey', 'transitions', 'boundPrunes', 'frontierDescriptor', 'nextRuns',
  'activeIds', 'activeRunBytes', 'nextRunsSha256', 'completedDepths', 'completedDepthsSha256',
  'completedTotals', 'reason',
]);

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
  createManifestState: createResumableManifestState,
  planManifestTransition: planResumableManifestTransition,
  prepareManifestTransitionCommit: prepareResumableManifestTransitionCommit,
  preparedManifestTransitionBytes: preparedResumableManifestTransitionBytes,
  claimPreparedManifestTransitionCommit: claimPreparedResumableManifestTransitionCommit,
  applyPreparedManifestTransition: applyPreparedResumableManifestTransition,
  commitManifestTransition: commitResumableManifestTransition,
  descriptorHash: resumableDescriptorHash,
  runSetHash: resumableRunSetHash,
  validateDescriptor: validateResumableRunDescriptor,
  validateRunChanges: validateResumableRunChanges,
  createDescriptorTrackerProbe: createR7DescriptorTrackerProbe,
  probeOwnedCandidateIndex(writer, logicalSize) {
    const probe = writer && typeof writer === 'object'
      ? R7_OWNED_CANDIDATE_INDEX_PROBES.get(writer)
      : undefined;
    if (probe === undefined) throw frontierError('candidate index probe requires a live owned writer');
    return probe(logicalSize);
  },
  authorizationBucketVisits(store) {
    const probe = store && typeof store === 'object'
      ? R7_AUTHORIZATION_BUCKET_VISIT_PROBES.get(store)
      : undefined;
    if (probe === undefined) throw frontierError('authorization bucket probe requires a resumable Store');
    return probe();
  },
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
  utimesSync: nativeFs.utimesSync,
  writeSync: nativeFs.writeSync,
});

let resumableStageSentinelSerial = 0;

function nextResumableStageSentinelTime() {
  resumableStageSentinelSerial = (resumableStageSentinelSerial + 1) % 1_000_000;
  const processComponent = Number.isSafeInteger(process.pid) ? process.pid % 100_000 : 0;
  // A Store-specific historical mtime makes same-tick namespace writes observable on Windows.
  // Exact path/owner identities remain the authority; this is not a hostile timestamp-restoration boundary.
  return new Date(Date.UTC(2000, 0, 1) + processComponent * 1_000_000 + resumableStageSentinelSerial);
}

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

function markR7CloseFailed(error) {
  if (error && typeof error === 'object' && error.r7CloseFailed !== true) {
    Object.defineProperty(error, 'r7CloseFailed', { value: true });
  }
  return error;
}

function aggregateR7CloseFailure(primary, cleanup, fallback) {
  return markR7CloseFailed(aggregate(primary, cleanup, fallback));
}

function aggregatePropagatingR7Close(primary, cleanup, fallback) {
  const failure = aggregate(primary, cleanup, fallback);
  if (primary?.r7CloseFailed === true || cleanup.some((error) => error?.r7CloseFailed === true)) {
    markR7CloseFailed(failure);
  }
  return failure;
}

function createR7DescriptorTracker(fs, pendingCloseDescriptors, recordDiagnostic) {
  const trackedDescriptors = new Map();
  const open = (filePath, flags, mode, phase) => {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) throw frontierError('proof descriptor path is invalid');
    if (typeof phase !== 'string' || phase.length === 0) throw frontierError('proof descriptor phase is invalid');
    if (trackedDescriptors.size + pendingCloseDescriptors.size >= ENDGAME_DISK_FRONTIER_LIMITS.registryMaxEntries) {
      throw frontierError(`pending close descriptor registry exceeds ${ENDGAME_DISK_FRONTIER_LIMITS.registryMaxEntries}`);
    }
    const descriptor = mode === undefined
      ? fs.openSync(filePath, flags)
      : fs.openSync(filePath, flags, mode);
    if (!Number.isInteger(descriptor) || descriptor < 0) {
      throw frontierError('proof descriptor is invalid');
    }
    if (trackedDescriptors.has(descriptor) || pendingCloseDescriptors.has(descriptor)) {
      throw frontierError(`proof descriptor ${descriptor} was reused while still tracked`);
    }
    trackedDescriptors.set(descriptor, Object.freeze({ path: filePath, phase }));
    return descriptor;
  };
  const close = (descriptor) => {
    const record = trackedDescriptors.get(descriptor) ?? pendingCloseDescriptors.get(descriptor);
    if (!record) {
      throw frontierError(`proof descriptor ${descriptor} is not tracked`);
    }
    try {
      fs.closeSync(descriptor);
      trackedDescriptors.delete(descriptor);
      pendingCloseDescriptors.delete(descriptor);
    } catch (error) {
      trackedDescriptors.delete(descriptor);
      pendingCloseDescriptors.set(descriptor, record);
      const failure = markR7CloseFailed(error);
      recordDiagnostic(new Error(
        `${record.phase} close failed for ${path.basename(record.path)}: ${normalizeDiagnostic(failure)}`,
      ));
      throw failure;
    }
  };
  const drain = () => {
    const errors = [];
    for (const descriptor of [...pendingCloseDescriptors.keys()]) {
      try { close(descriptor); } catch (error) { errors.push(error); }
    }
    return errors;
  };
  const drainPhase = (phase) => {
    const errors = [];
    for (const [descriptor, record] of [...pendingCloseDescriptors]) {
      if (record.phase !== phase) continue;
      try { close(descriptor); } catch (error) { errors.push(error); }
    }
    return errors;
  };
  return Object.freeze({
    close,
    drain,
    drainPhase,
    hasDescriptor(descriptor) {
      return trackedDescriptors.has(descriptor) || pendingCloseDescriptors.has(descriptor);
    },
    hasPath(filePath) {
      return [...pendingCloseDescriptors.values()].some((record) => record.path === filePath);
    },
    open,
    size() { return pendingCloseDescriptors.size; },
  });
}

function createR7DescriptorTrackerProbe(fs) {
  if (!fs || typeof fs.openSync !== 'function' || typeof fs.closeSync !== 'function') {
    throw frontierError('descriptor tracker probe requires openSync and closeSync');
  }
  const pendingCloseDescriptors = new Map();
  const diagnostics = [];
  let diagnosticsOmitted = 0;
  const tracker = createR7DescriptorTracker(fs, pendingCloseDescriptors, (error) => {
    if (diagnostics.length < ENDGAME_DISK_FRONTIER_LIMITS.diagnosticMaxEntries) {
      diagnostics.push(normalizeDiagnostic(error));
    } else diagnosticsOmitted += 1;
  });
  return Object.freeze({
    close(descriptor) { return tracker.close(descriptor); },
    drain() { return tracker.drain(); },
    open(filePath, phase) { return tracker.open(filePath, 'r', undefined, phase); },
    snapshot() {
      return Object.freeze({
        diagnostics: Object.freeze([...diagnostics]),
        diagnosticsTruncated: diagnosticsOmitted > 0,
        pending: tracker.size(),
      });
    },
  });
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

function proofObjectKey(identity) {
  return `${identity.dev}:${identity.ino}`;
}

function resumableInventoryEntry(name, filePath, bytes, identity) {
  if (!Number.isSafeInteger(bytes) || bytes < 0 || identity.size !== String(bytes)) {
    throw frontierError(`${name} has an inconsistent ledger byte length`);
  }
  return Object.freeze({ name, filePath, bytes, identity });
}

function createResumableInventoryLedger(initial, limits) {
  const entries = new Map();
  const physicalRuns = new Map();
  let sortedNames = null;
  let retainedManifestBytes = 0;
  let ownerAndIndexBytes = 0;
  let recognizedPhysicalRunBytes = 0;

  const isManifest = (name) => /^manifest-g[0-9]{5}\.json(?:\.part)?$/u.test(name);
  const isOwnerOrIndex = (name) => name === 'owner.json' || name === 'owner.json.part' || /\.idx(?:\.part)?$/u.test(name);
  const isRun = (name) => /\.run(?:\.part)?$/u.test(name);
  const assertWithinLimits = () => {
    if (entries.size > limits.maximumNamespaceEntries) {
      throw frontierError(`resumable namespace exceeds ${limits.maximumNamespaceEntries} entries`);
    }
    if (retainedManifestBytes > limits.retainedManifestBytes) throw frontierError('retained manifest bytes exceed the limit');
    if (ownerAndIndexBytes > limits.ownerAndIndexBytes) throw frontierError('owner/index bytes exceed the limit');
    if (retainedManifestBytes + ownerAndIndexBytes > limits.auxiliaryBytes) {
      throw frontierError('auxiliary bytes exceed the limit');
    }
    if (recognizedPhysicalRunBytes > limits.recognizedPhysicalRunBytes) throw frontierError('physical run bytes exceed the limit');
  };
  const addPhysicalRun = (entry) => {
    if (!isRun(entry.name)) return;
    const key = proofObjectKey(entry.identity);
    const physical = physicalRuns.get(key);
    if (physical === undefined) {
      physicalRuns.set(key, { bytes: entry.bytes, references: 1 });
      recognizedPhysicalRunBytes += entry.bytes;
      return;
    }
    if (physical.bytes !== entry.bytes) throw frontierError(`${entry.name} aliases a run with inconsistent bytes`);
    physical.references += 1;
  };
  const removePhysicalRun = (entry) => {
    if (!isRun(entry.name)) return;
    const key = proofObjectKey(entry.identity);
    const physical = physicalRuns.get(key);
    if (physical === undefined || physical.references < 1 || physical.bytes !== entry.bytes) {
      throw frontierError(`${entry.name} is inconsistent with the physical run ledger`);
    }
    physical.references -= 1;
    if (physical.references === 0) {
      physicalRuns.delete(key);
      recognizedPhysicalRunBytes -= physical.bytes;
    }
  };
  const add = (entry) => {
    if (entries.has(entry.name)) throw frontierError(`duplicate inventory entry ${entry.name}`);
    entries.set(entry.name, entry);
    sortedNames = null;
    if (isManifest(entry.name)) retainedManifestBytes += entry.bytes;
    if (isOwnerOrIndex(entry.name)) ownerAndIndexBytes += entry.bytes;
    addPhysicalRun(entry);
    assertWithinLimits();
  };
  const remove = (name) => {
    const entry = entries.get(name);
    if (entry === undefined) throw frontierError(`missing inventory entry ${name}`);
    removePhysicalRun(entry);
    if (isManifest(name)) retainedManifestBytes -= entry.bytes;
    if (isOwnerOrIndex(name)) ownerAndIndexBytes -= entry.bytes;
    entries.delete(name);
    sortedNames = null;
    return entry;
  };
  const update = (entry) => {
    if (!entries.has(entry.name)) throw frontierError(`missing inventory entry ${entry.name}`);
    remove(entry.name);
    add(entry);
  };
  const grow = (name, additionalBytes) => {
    assertSafeNonnegativeInteger(additionalBytes, `${name} ledger growth`);
    const previous = entries.get(name);
    if (previous === undefined) throw frontierError(`missing inventory entry ${name}`);
    if (additionalBytes === 0) return;
    const bytes = previous.bytes + additionalBytes;
    if (!Number.isSafeInteger(bytes)) throw frontierError(`${name} ledger byte length exceeds safe integer range`);
    const identity = Object.freeze({ ...previous.identity, size: String(bytes) });
    update(resumableInventoryEntry(name, previous.filePath, bytes, identity));
  };
  const replace = (scanned) => {
    entries.clear();
    physicalRuns.clear();
    sortedNames = null;
    retainedManifestBytes = 0;
    ownerAndIndexBytes = 0;
    recognizedPhysicalRunBytes = 0;
    for (const name of scanned.names) add(scanned.entries.get(name));
    assertWithinLimits();
  };
  const matches = (scanned) => {
    if (entries.size !== scanned.namespaceEntries
      || retainedManifestBytes !== scanned.retainedManifestBytes
      || ownerAndIndexBytes !== scanned.ownerAndIndexBytes
      || recognizedPhysicalRunBytes !== scanned.recognizedPhysicalRunBytes) return false;
    for (const [name, entry] of entries) {
      const candidate = scanned.entries.get(name);
      if (candidate === undefined || candidate.filePath !== entry.filePath || candidate.bytes !== entry.bytes
        || !sameProofFileIdentity(candidate.identity, entry.identity)) return false;
    }
    return true;
  };
  const view = Object.freeze({
    entries,
    get names() {
      if (sortedNames === null) sortedNames = Object.freeze([...entries.keys()].sort(ordinalByteCompare));
      return sortedNames;
    },
    get namespaceEntries() { return entries.size; },
    get retainedManifestBytes() { return retainedManifestBytes; },
    get ownerAndIndexBytes() { return ownerAndIndexBytes; },
    get recognizedPhysicalRunBytes() { return recognizedPhysicalRunBytes; },
    get uncommittedWorkingRunBytes() { return recognizedPhysicalRunBytes; },
  });
  replace(initial);
  return Object.freeze({ add, grow, matches, remove, replace, update, view });
}

function readBoundedProofFile(fs, filePath, maximumBytes, descriptorTracker, phase = 'bounded-readback') {
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
    descriptor = descriptorTracker.open(filePath, 'r', undefined, phase);
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
        descriptorTracker.close(descriptor);
        descriptor = null;
      } catch (error) {
        cleanup.push(error);
      }
    }
    if (cleanup.length > 0) {
      throw aggregateR7CloseFailure(primary, cleanup, `${path.basename(filePath)} read cleanup failed.`);
    }
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
    if (/\.run(?:\.part)?$/u.test(name)) physicalRuns.set(proofObjectKey(identity), bytes);
  }
  const recognizedPhysicalRunBytes = [...physicalRuns.values()].reduce((sum, value) => sum + value, 0);
  if (retainedManifestBytes > limits.retainedManifestBytes) throw frontierError('retained manifest bytes exceed the limit');
  if (ownerAndIndexBytes > limits.ownerAndIndexBytes) throw frontierError('owner/index bytes exceed the limit');
  if (retainedManifestBytes + ownerAndIndexBytes > limits.auxiliaryBytes) {
    throw frontierError('auxiliary bytes exceed the limit');
  }
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

function assertExactRecord(value, expectedKeys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw frontierError(`${label} must be a plain record`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw frontierError(`${label} must be a plain record`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== 'string')) throw frontierError(`${label} has non-string keys`);
  const actual = ownKeys.map(String).sort(ordinalByteCompare);
  const expected = [...expectedKeys].sort(ordinalByteCompare);
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw frontierError(`${label} must have exact keys ${expectedKeys.join(',')}`);
  }
  for (const key of actual) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw frontierError(`${label}.${key} must be an enumerable data property`);
    }
  }
  return value;
}

function assertSafeManifestInteger(value, label, maximum = Number.MAX_SAFE_INTEGER) {
  assertSafeNonnegativeInteger(value, label);
  if (value > maximum) throw frontierError(`${label} exceeds ${maximum}`);
  return value;
}

function addSafeManifestInteger(base, delta, label) {
  assertSafeNonnegativeInteger(base, `${label} base`);
  assertSafeNonnegativeInteger(delta, `${label} delta`);
  const result = base + delta;
  if (!Number.isSafeInteger(result)) throw frontierError(`${label} exceeds the safe integer domain`);
  return result;
}

function validateResumableManifestTip(tip, label = 'checkpoint tip') {
  assertExactRecord(tip, ['generation', 'manifestSha256'], label);
  assertSafeManifestInteger(tip.generation, `${label} generation`, 32_767);
  if (typeof tip.manifestSha256 !== 'string' || !R7_HASH_PATTERN.test(tip.manifestSha256)) {
    throw frontierError(`${label} hash is invalid`);
  }
  return tip;
}

function validateResumableBinding(binding) {
  assertExactRecord(binding, [
    'schema', 'levelId', 'candidateCommandStream', 'optimalLocks', 'initialStateHash', 'initialFrontierKey',
  ], 'proof binding');
  if (binding.schema !== 't37-f4e-r7-proof-binding-v1') throw frontierError('proof binding schema is invalid');
  for (const key of ['levelId', 'candidateCommandStream', 'initialStateHash']) {
    if (typeof binding[key] !== 'string') throw frontierError(`proof binding ${key} must be a string`);
  }
  if (binding.levelId.length === 0 || binding.initialStateHash.length === 0) {
    throw frontierError('proof binding identities cannot be empty');
  }
  assertSafeManifestInteger(binding.optimalLocks, 'proof binding optimalLocks', 32_768);
  if (binding.optimalLocks === 0) throw frontierError('proof binding optimalLocks must be positive');
  encodeRecord(binding.initialFrontierKey, null);
  return binding;
}

function validateResumableDepthRecord(record, expectedDepth = null) {
  assertExactRecord(record, ['lockedPieces', 'frontierStates', 'transitions', 'boundPrunes'], 'completed depth');
  assertSafeManifestInteger(record.lockedPieces, 'completed depth lockedPieces', 32_767);
  assertSafeManifestInteger(record.frontierStates, 'completed depth frontierStates');
  if (record.frontierStates === 0) throw frontierError('completed depth frontierStates must be positive');
  assertSafeManifestInteger(record.transitions, 'completed depth transitions');
  assertSafeManifestInteger(record.boundPrunes, 'completed depth boundPrunes');
  if (expectedDepth !== null && record.lockedPieces !== expectedDepth) {
    throw frontierError(`completed depth lockedPieces must equal ${expectedDepth}`);
  }
  return record;
}

function validateResumableIdentity(identity, label) {
  assertExactRecord(identity, ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'], label);
  for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) {
    if (typeof identity[key] !== 'string' || !R7_DECIMAL_PATTERN.test(identity[key])) {
      throw frontierError(`${label}.${key} must be a canonical nonnegative decimal string`);
    }
  }
  return identity;
}

function validateResumableRunDescriptor(descriptor) {
  assertExactRecord(descriptor, [
    'id', 'size', 'dataFile', 'dataBytes', 'dataSha256', 'indexFile', 'indexBytes', 'indexSha256',
    'firstKey', 'lastKey', 'dataIdentity', 'indexIdentity',
  ], 'run descriptor');
  const classification = classifyResumableRunId(descriptor.id);
  if (!classification.committed) throw frontierError('run descriptor id must be committed');
  assertSafeManifestInteger(descriptor.size, 'run descriptor size');
  assertSafeManifestInteger(descriptor.dataBytes, 'run descriptor dataBytes');
  assertSafeManifestInteger(descriptor.indexBytes, 'run descriptor indexBytes');
  if (descriptor.indexBytes > RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS.ownerOrIndexBytes) {
    throw frontierError('run descriptor indexBytes exceeds 65536');
  }
  if (descriptor.dataFile !== `${descriptor.id}.run` || descriptor.indexFile !== `${descriptor.id}.idx`) {
    throw frontierError('run descriptor basenames do not match its id');
  }
  if (descriptor.indexBytes !== resumableIndexLayout(descriptor.size).indexBytes) {
    throw frontierError('run descriptor indexBytes does not match its exact layout');
  }
  for (const key of ['dataSha256', 'indexSha256']) {
    if (typeof descriptor[key] !== 'string' || !R7_HASH_PATTERN.test(descriptor[key])) {
      throw frontierError(`run descriptor ${key} is invalid`);
    }
  }
  validateResumableIdentity(descriptor.dataIdentity, 'run descriptor dataIdentity');
  validateResumableIdentity(descriptor.indexIdentity, 'run descriptor indexIdentity');
  if (descriptor.dataIdentity.size !== String(descriptor.dataBytes)
    || descriptor.indexIdentity.size !== String(descriptor.indexBytes)) {
    throw frontierError('run descriptor identity size does not match descriptor bytes');
  }
  if (descriptor.size === 0) {
    if (descriptor.firstKey !== null || descriptor.lastKey !== null || descriptor.dataBytes !== 0) {
      throw frontierError('empty run descriptor boundaries/bytes are invalid');
    }
  } else {
    if (descriptor.dataBytes === 0) throw frontierError('nonempty run descriptor dataBytes must be positive');
    encodeRecord(descriptor.firstKey, null);
    encodeRecord(descriptor.lastKey, null);
    if (ordinalByteCompare(descriptor.firstKey, descriptor.lastKey) > 0) {
      throw frontierError('run descriptor key boundaries are reversed');
    }
  }
  return descriptor;
}

function resumableDescriptorHash(descriptor) {
  return canonicalHash(R7_DESCRIPTOR_HASH_LABEL, validateResumableRunDescriptor(descriptor));
}

function resumableRunSetHash(descriptors) {
  if (!Array.isArray(descriptors)) throw frontierError('run descriptor set must be an array');
  const ordered = [...descriptors].map(validateResumableRunDescriptor)
    .sort((left, right) => ordinalByteCompare(left.id, right.id));
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index - 1].id === ordered[index].id) throw frontierError(`duplicate run descriptor id ${ordered[index].id}`);
  }
  return canonicalHash(R7_RUN_SET_HASH_LABEL, ordered.map(resumableDescriptorHash));
}

function validateResumableRunChanges(runChanges) {
  assertExactRecord(runChanges, ['add', 'removeRule', 'removeSetSha256'], 'runChanges');
  if (!Array.isArray(runChanges.add) || runChanges.add.length > 1) {
    throw frontierError('runChanges.add must be a zero-or-one descriptor array');
  }
  if (runChanges.add.length === 1) validateResumableRunDescriptor(runChanges.add[0]);
  if (!['none', 'current-frontier-and-next-runs', 'all-active-proof-runs'].includes(runChanges.removeRule)) {
    throw frontierError('runChanges.removeRule is invalid');
  }
  if (typeof runChanges.removeSetSha256 !== 'string' || !R7_HASH_PATTERN.test(runChanges.removeSetSha256)) {
    throw frontierError('runChanges.removeSetSha256 is invalid');
  }
  return runChanges;
}

function validateResumableResourceTotals(totals, expectedLatestCheckpointRunBytes) {
  assertExactRecord(totals, [
    'latestCheckpointRunBytes', 'uncommittedWorkingRunBytes', 'recognizedPhysicalRunBytes',
    'retainedManifestBytes', 'ownerAndIndexBytes', 'namespaceEntries',
  ], 'resourceTotalsBeforeManifest');
  for (const key of [
    'latestCheckpointRunBytes', 'uncommittedWorkingRunBytes', 'recognizedPhysicalRunBytes',
    'retainedManifestBytes', 'ownerAndIndexBytes', 'namespaceEntries',
  ]) assertSafeManifestInteger(totals[key], `resourceTotalsBeforeManifest ${key}`);
  if (totals.latestCheckpointRunBytes !== expectedLatestCheckpointRunBytes) {
    throw frontierError('resourceTotalsBeforeManifest latestCheckpointRunBytes is not the projected active total');
  }
  return Object.freeze({ ...totals });
}

function detachedCanonicalValue(value) {
  return parseStrictCanonicalJson(canonicalizeJson(value));
}

function freezeCanonicalTree(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeCanonicalTree(child);
    Object.freeze(value);
  }
  return value;
}

function manifestPlanEnvelope(plan) {
  return {
    baseTip: plan.baseTip,
    manifest: plan.manifest,
    projection: plan.projection,
    tip: plan.tip,
    patch: plan.patch,
    addedDescriptor: plan.addedDescriptor,
    removedDescriptors: plan.removedDescriptors,
  };
}

function createResumableManifestState() {
  const state = {
    tip: null,
    binding: null,
    bindingSha256: null,
    kind: null,
    generation: -1,
    depth: null,
    parentOffset: null,
    lastProcessedParentKey: null,
    transitions: null,
    boundPrunes: null,
    frontierDescriptor: null,
    nextRuns: [],
    activeIds: new Set(),
    activeRunBytes: 0,
    nextRunsSha256: R7_NEXT_RUNS_EMPTY_HASH,
    completedDepths: [],
    completedDepthsSha256: R7_DEPTHS_EMPTY_HASH,
    completedTotals: { frontierStates: 0, transitions: 0, boundPrunes: 0 },
    reason: null,
  };
  R7_MANIFEST_STATES.add(state);
  return state;
}

function assertWritableManifestState(state) {
  if (!R7_MANIFEST_STATES.has(state)) throw frontierError('manifest state was not created by this adapter');
  assertExactRecord(state, R7_MANIFEST_STATE_KEYS, 'manifest state');
  if (Object.getPrototypeOf(state) !== Object.prototype) throw frontierError('manifest state prototype changed');
  for (const key of R7_MANIFEST_STATE_KEYS) {
    if (Object.getOwnPropertyDescriptor(state, key)?.writable !== true) {
      throw frontierError(`manifest state ${key} must remain a writable data property`);
    }
  }
  if (!Array.isArray(state.nextRuns) || R7_NATIVE_IS_PROXY(state.nextRuns)
    || Object.getPrototypeOf(state.nextRuns) !== Array.prototype
    || !Array.isArray(state.completedDepths) || R7_NATIVE_IS_PROXY(state.completedDepths)
    || Object.getPrototypeOf(state.completedDepths) !== Array.prototype
    || !(state.activeIds instanceof Set) || R7_NATIVE_IS_PROXY(state.activeIds)
    || Object.getPrototypeOf(state.activeIds) !== Set.prototype) {
    throw frontierError('manifest state collections are invalid');
  }
  try { Reflect.apply(R7_NATIVE_SET_SIZE, state.activeIds, []); }
  catch { throw frontierError('manifest state activeIds must be a native Set'); }
  assertExactRecord(
    state.completedTotals, ['frontierStates', 'transitions', 'boundPrunes'], 'manifest completed totals',
  );
  for (const key of ['frontierStates', 'transitions', 'boundPrunes']) {
    assertSafeManifestInteger(state.completedTotals[key], `manifest completed total ${key}`);
  }
  return state;
}

function assertManifestCandidate(candidate, publicationRun, expectedId) {
  assertExactRecord(candidate, ['run', 'descriptor'], 'manifest run candidate');
  if (candidate.run !== publicationRun) throw frontierError('manifest run candidate ownership mismatch');
  const descriptor = validateResumableRunDescriptor(candidate.descriptor);
  if (descriptor.id !== expectedId) throw frontierError(`manifest run candidate id must be ${expectedId}`);
  return descriptor;
}

function assertNoManifestCandidate(candidate) {
  if (candidate !== null) throw frontierError('a no-run manifest transition cannot consume a run candidate');
}

function assertPreviousManifestTip(state, tip) {
  validateResumableManifestTip(tip, 'publication previousTip');
  if (state.tip === null || tip.generation !== state.tip.generation
    || tip.manifestSha256 !== state.tip.manifestSha256) {
    throw frontierError('publication previousTip does not match the authenticated tip');
  }
}

function paddedManifestToken(value, width) {
  return String(value).padStart(width, '0');
}

function expectedFrontierRunId(depth, generation) {
  return `r7-f-d${paddedManifestToken(depth, 5)}-g${paddedManifestToken(generation, 5)}`;
}

function expectedUnitRunId(depth, unit, generation) {
  return `r7-u-d${paddedManifestToken(depth, 5)}-n${paddedManifestToken(unit, 8)}-g${paddedManifestToken(generation, 5)}`;
}

function assertCompletedDepthMatchesState(state, record) {
  validateResumableDepthRecord(record, state.depth);
  if (record.frontierStates !== state.frontierDescriptor.size || record.transitions !== state.transitions
    || record.boundPrunes !== state.boundPrunes) {
    throw frontierError('completed depth does not match the searching checkpoint totals');
  }
  for (const key of ['frontierStates', 'transitions', 'boundPrunes']) {
    addSafeManifestInteger(state.completedTotals[key], record[key], `completed ${key} total`);
  }
  return record;
}

function assertPublicationRecord(publication) {
  if (!publication || typeof publication !== 'object' || Array.isArray(publication)) {
    throw frontierError('checkpoint publication must be a plain record');
  }
  const transition = publication.transition;
  const keys = {
    seed: ['transition', 'previousTip', 'binding', 'frontier'],
    unit: ['transition', 'previousTip', 'parentOffset', 'lastProcessedParentKey', 'transitionsDelta', 'boundPrunesDelta', 'nextRun'],
    layer: ['transition', 'previousTip', 'completedDepth', 'nextFrontier'],
    complete: ['transition', 'previousTip', 'completedDepth', 'reason'],
  }[transition];
  if (!keys) throw frontierError('checkpoint publication transition is invalid');
  return assertExactRecord(publication, keys, `${transition} checkpoint publication`);
}

function planResumableManifestTransition(state, publication, candidate, resourceTotalsBeforeManifest) {
  assertWritableManifestState(state);
  assertPublicationRecord(publication);
  const { transition } = publication;
  const emptyRunSetSha256 = resumableRunSetHash([]);
  let generation;
  let binding;
  let bindingSha256;
  let stateDelta;
  let addDescriptor = null;
  let removedDescriptors = [];
  let removeRule = 'none';
  let nextRunsSha256 = state.nextRunsSha256;
  let nextRunCount = state.nextRuns.length;
  let completedDepthsSha256 = state.completedDepthsSha256;
  let completedDepthCount = state.completedDepths.length;
  let projectedActiveRunBytes;
  let projection;
  let patch;

  if (transition === 'seed') {
    if (state.tip !== null || state.kind !== null) throw frontierError('seed requires an empty checkpoint state');
    if (publication.previousTip !== null) throw frontierError('seed previousTip must be null');
    binding = validateResumableBinding(publication.binding);
    bindingSha256 = canonicalHash(R7_BINDING_HASH_LABEL, binding);
    generation = 0;
    addDescriptor = assertManifestCandidate(candidate, publication.frontier, expectedFrontierRunId(0, 0));
    if (addDescriptor.size !== 1 || addDescriptor.firstKey !== binding.initialFrontierKey
      || addDescriptor.lastKey !== binding.initialFrontierKey) {
      throw frontierError('seed frontier descriptor does not match the one-key binding frontier');
    }
    projectedActiveRunBytes = addDescriptor.dataBytes;
    stateDelta = Object.freeze({ binding, depth: 0, parentOffset: 0, lastProcessedParentKey: null, transitions: 0, boundPrunes: 0 });
    projection = Object.freeze({
      kind: 'searching', generation, bindingSha256, depth: 0, parentOffset: 0,
      lastProcessedParentKey: null, transitions: 0, boundPrunes: 0,
      frontierDescriptorSha256: resumableDescriptorHash(addDescriptor), nextRunsSha256,
      nextRunCount, completedDepthsSha256, completedDepthCount,
    });
    patch = Object.freeze({
      transition, kind: 'searching', generation, binding, bindingSha256, depth: 0, parentOffset: 0,
      lastProcessedParentKey: null, transitions: 0, boundPrunes: 0, frontierDescriptor: addDescriptor,
      appendedNextDescriptor: null, resetNextRuns: true, appendedDepth: null, nextRunsSha256,
      completedDepthsSha256, activeRunBytes: projectedActiveRunBytes, reason: null,
    });
  } else {
    if (state.tip === null || state.kind !== 'searching') throw frontierError(`${transition} requires a searching checkpoint`);
    assertPreviousManifestTip(state, publication.previousTip);
    generation = state.generation + 1;
    assertSafeManifestInteger(generation, 'next manifest generation', 32_767);
    binding = state.binding;
    bindingSha256 = state.bindingSha256;
    const finalDecisionDepth = binding.optimalLocks > 1 && state.depth === binding.optimalLocks - 2;

    if (transition === 'unit') {
      if (binding.optimalLocks === 1 || state.parentOffset >= state.frontierDescriptor.size) {
        throw frontierError('unit requires an incomplete searchable frontier');
      }
      const expectedOffset = Math.min(
        state.frontierDescriptor.size,
        addSafeManifestInteger(state.parentOffset, RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS.parentUnitKeys, 'unit parentOffset'),
      );
      if (publication.parentOffset !== expectedOffset) throw frontierError(`unit parentOffset must equal ${expectedOffset}`);
      encodeRecord(publication.lastProcessedParentKey, null);
      if (state.lastProcessedParentKey !== null
        && ordinalByteCompare(state.lastProcessedParentKey, publication.lastProcessedParentKey) >= 0) {
        throw frontierError('unit lastProcessedParentKey must advance');
      }
      if (expectedOffset === state.frontierDescriptor.size
        && publication.lastProcessedParentKey !== state.frontierDescriptor.lastKey) {
        throw frontierError('unit terminal cursor must equal the frontier lastKey');
      }
      assertSafeManifestInteger(publication.transitionsDelta, 'unit transitionsDelta');
      assertSafeManifestInteger(publication.boundPrunesDelta, 'unit boundPrunesDelta');
      const transitions = addSafeManifestInteger(state.transitions, publication.transitionsDelta, 'transition counter');
      const boundPrunes = addSafeManifestInteger(state.boundPrunes, publication.boundPrunesDelta, 'bound-prune counter');
      addSafeManifestInteger(state.completedTotals.transitions, transitions, 'search transition total');
      addSafeManifestInteger(state.completedTotals.boundPrunes, boundPrunes, 'search bound-prune total');
      addSafeManifestInteger(state.completedTotals.frontierStates, state.frontierDescriptor.size, 'search frontier-state total');
      const unit = Math.floor(state.parentOffset / RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS.parentUnitKeys);
      assertSafeManifestInteger(unit, 'unit ordinal', RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS.maximumUnits - 1);
      if (finalDecisionDepth) {
        if (publication.nextRun !== null) throw frontierError('final-decision unit nextRun must be null');
        assertNoManifestCandidate(candidate);
      } else {
        if (publication.nextRun === null) throw frontierError('non-final unit nextRun cannot be null');
        addDescriptor = assertManifestCandidate(candidate, publication.nextRun, expectedUnitRunId(state.depth, unit, generation));
        if (Reflect.apply(R7_NATIVE_SET_HAS, state.activeIds, [addDescriptor.id])) {
          throw frontierError(`duplicate active run id ${addDescriptor.id}`);
        }
        nextRunCount += 1;
        if (nextRunCount > RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS.maximumUnits) {
          throw frontierError('next run count exceeds 4096');
        }
        nextRunsSha256 = canonicalHash('T37-F4E-R7-NEXT-RUNS-STEP-V1', {
          previousSha256: state.nextRunsSha256,
          descriptorSha256: resumableDescriptorHash(addDescriptor),
        });
      }
      projectedActiveRunBytes = addSafeManifestInteger(
        state.activeRunBytes, addDescriptor?.dataBytes ?? 0, 'latest checkpoint run bytes',
      );
      stateDelta = Object.freeze({
        depth: state.depth, parentOffset: publication.parentOffset,
        lastProcessedParentKey: publication.lastProcessedParentKey,
        transitionsDelta: publication.transitionsDelta, boundPrunesDelta: publication.boundPrunesDelta,
      });
      projection = Object.freeze({
        kind: 'searching', generation, bindingSha256, depth: state.depth,
        parentOffset: publication.parentOffset, lastProcessedParentKey: publication.lastProcessedParentKey,
        transitions, boundPrunes, frontierDescriptorSha256: resumableDescriptorHash(state.frontierDescriptor),
        nextRunsSha256, nextRunCount, completedDepthsSha256, completedDepthCount,
      });
      patch = Object.freeze({
        transition, kind: 'searching', generation, binding, bindingSha256, depth: state.depth,
        parentOffset: publication.parentOffset, lastProcessedParentKey: publication.lastProcessedParentKey,
        transitions, boundPrunes, frontierDescriptor: state.frontierDescriptor,
        appendedNextDescriptor: addDescriptor, resetNextRuns: false, appendedDepth: null,
        nextRunsSha256, completedDepthsSha256, activeRunBytes: projectedActiveRunBytes, reason: null,
      });
    } else if (transition === 'layer') {
      if (state.parentOffset !== state.frontierDescriptor.size || finalDecisionDepth) {
        throw frontierError('layer requires complete coverage before the final decision depth');
      }
      const completedDepth = assertCompletedDepthMatchesState(state, publication.completedDepth);
      addDescriptor = assertManifestCandidate(
        candidate, publication.nextFrontier, expectedFrontierRunId(state.depth + 1, generation),
      );
      if (addDescriptor.size === 0) throw frontierError('layer nextFrontier must be nonempty');
      removedDescriptors = [state.frontierDescriptor, ...state.nextRuns];
      removeRule = 'current-frontier-and-next-runs';
      nextRunsSha256 = R7_NEXT_RUNS_EMPTY_HASH;
      nextRunCount = 0;
      completedDepthsSha256 = canonicalHash('T37-F4E-R7-DEPTHS-STEP-V1', {
        previousSha256: state.completedDepthsSha256, record: completedDepth,
      });
      completedDepthCount += 1;
      projectedActiveRunBytes = addDescriptor.dataBytes;
      stateDelta = Object.freeze({ completedDepth, nextDepth: state.depth + 1 });
      projection = Object.freeze({
        kind: 'searching', generation, bindingSha256, depth: state.depth + 1, parentOffset: 0,
        lastProcessedParentKey: null, transitions: 0, boundPrunes: 0,
        frontierDescriptorSha256: resumableDescriptorHash(addDescriptor), nextRunsSha256,
        nextRunCount, completedDepthsSha256, completedDepthCount,
      });
      patch = Object.freeze({
        transition, kind: 'searching', generation, binding, bindingSha256, depth: state.depth + 1,
        parentOffset: 0, lastProcessedParentKey: null, transitions: 0, boundPrunes: 0,
        frontierDescriptor: addDescriptor, appendedNextDescriptor: null, resetNextRuns: true,
        appendedDepth: completedDepth, nextRunsSha256, completedDepthsSha256,
        activeRunBytes: projectedActiveRunBytes, reason: null,
      });
    } else {
      assertNoManifestCandidate(candidate);
      const { completedDepth, reason } = publication;
      if (!['empty-frontier', 'final-depth', 'zero-decision-depth'].includes(reason)) {
        throw frontierError('complete reason is invalid');
      }
      if (reason === 'zero-decision-depth') {
        if (completedDepth !== null || binding.optimalLocks !== 1 || state.generation !== 0
          || state.depth !== 0 || state.parentOffset !== 0 || state.frontierDescriptor.size !== 1
          || state.nextRuns.length !== 0 || state.transitions !== 0 || state.boundPrunes !== 0) {
          throw frontierError('zero-decision completion requires the canonical seed state and null depth');
        }
      } else {
        if (completedDepth === null || state.parentOffset !== state.frontierDescriptor.size) {
          throw frontierError('nonzero completion requires a fully covered completed depth');
        }
        assertCompletedDepthMatchesState(state, completedDepth);
        if ((reason === 'final-depth') !== finalDecisionDepth) {
          throw frontierError('complete reason does not match the decision depth');
        }
        if (reason === 'empty-frontier' && state.nextRuns.some((descriptor) => descriptor.size !== 0)) {
          throw frontierError('empty-frontier completion requires every accumulated next run to be empty');
        }
        completedDepthsSha256 = canonicalHash('T37-F4E-R7-DEPTHS-STEP-V1', {
          previousSha256: state.completedDepthsSha256, record: completedDepth,
        });
        completedDepthCount += 1;
      }
      removedDescriptors = [state.frontierDescriptor, ...state.nextRuns];
      removeRule = 'all-active-proof-runs';
      projectedActiveRunBytes = 0;
      stateDelta = Object.freeze({ completedDepth, reason });
      projection = Object.freeze({
        kind: 'complete', generation, bindingSha256, reason, completedDepthsSha256, completedDepthCount,
      });
      patch = Object.freeze({
        transition, kind: 'complete', generation, binding, bindingSha256, depth: null,
        parentOffset: null, lastProcessedParentKey: null, transitions: null, boundPrunes: null,
        frontierDescriptor: null, appendedNextDescriptor: null, resetNextRuns: true,
        appendedDepth: completedDepth, nextRunsSha256, completedDepthsSha256,
        activeRunBytes: projectedActiveRunBytes, reason,
      });
    }
  }

  const runChanges = Object.freeze({
    add: Object.freeze(addDescriptor === null ? [] : [addDescriptor]),
    removeRule,
    removeSetSha256: removeRule === 'none' ? emptyRunSetSha256 : resumableRunSetHash(removedDescriptors),
  });
  validateResumableRunChanges(runChanges);
  const totals = validateResumableResourceTotals(resourceTotalsBeforeManifest, projectedActiveRunBytes);
  const checkpointStateSha256 = canonicalHash(R7_CHECKPOINT_STATE_HASH_LABEL, projection);
  const manifest = Object.freeze({
    schema: R7_MANIFEST_SCHEMA,
    generation,
    previousManifestSha256: transition === 'seed' ? null : state.tip.manifestSha256,
    transition,
    bindingSha256,
    stateDelta,
    runChanges,
    checkpointStateSha256,
    resourceTotalsBeforeManifest: totals,
  });
  assertExactRecord(manifest, [
    'schema', 'generation', 'previousManifestSha256', 'transition', 'bindingSha256', 'stateDelta',
    'runChanges', 'checkpointStateSha256', 'resourceTotalsBeforeManifest',
  ], 'checkpoint manifest');
  const detached = detachedCanonicalValue({
    baseTip: state.tip,
    manifest,
    projection,
    patch,
    addedDescriptor: addDescriptor,
    removedDescriptors,
  });
  const manifestBytes = Buffer.from(`${canonicalizeJson(detached.manifest)}\n`, 'utf8');
  if (manifestBytes.length > RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS.manifestBytes) {
    throw frontierError(`checkpoint manifest exceeds ${RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS.manifestBytes} bytes`);
  }
  const plan = Object.freeze({
    ...detached,
    manifestBytes,
    tip: { generation, manifestSha256: sha256Upper(manifestBytes) },
  });
  const sealed = freezeCanonicalTree(detachedCanonicalValue(manifestPlanEnvelope(plan)));
  R7_MANIFEST_PLAN_SNAPSHOTS.set(plan, {
    manifestBytes: Buffer.from(manifestBytes),
    commitment: canonicalHash(R7_MANIFEST_PLAN_HASH_LABEL, sealed),
    sealed,
    state,
    baseGeneration: state.generation,
    consumed: false,
  });
  return plan;
}

function validateManifestPlanForCommit(state, plan) {
  assertExactRecord(plan, [
    'baseTip', 'manifest', 'manifestBytes', 'projection', 'tip', 'patch', 'addedDescriptor', 'removedDescriptors',
  ], 'manifest plan');
  const snapshot = R7_MANIFEST_PLAN_SNAPSHOTS.get(plan);
  if (!snapshot) throw frontierError('manifest plan is not owned by this adapter');
  if (snapshot.consumed) throw frontierError('manifest plan was already consumed');
  if (snapshot.state !== state) throw frontierError('manifest plan belongs to a different state instance');
  assertWritableManifestState(state);
  if (!Buffer.isBuffer(plan.manifestBytes) || !plan.manifestBytes.equals(snapshot.manifestBytes)) {
    throw frontierError('manifest plan bytes changed after planning');
  }
  const parsedManifest = parseCanonicalLfBytes(plan.manifestBytes);
  if (canonicalizeJson(parsedManifest) !== canonicalizeJson(plan.manifest)) {
    throw frontierError('manifest plan bytes do not match its manifest');
  }
  let currentCommitment;
  try { currentCommitment = canonicalHash(R7_MANIFEST_PLAN_HASH_LABEL, manifestPlanEnvelope(plan)); }
  catch { throw frontierError('manifest plan canonical snapshot changed after planning'); }
  if (currentCommitment !== snapshot.commitment) {
    throw frontierError('manifest plan canonical snapshot changed after planning');
  }

  const { manifest, projection, patch } = plan;
  assertExactRecord(manifest, [
    'schema', 'generation', 'previousManifestSha256', 'transition', 'bindingSha256', 'stateDelta',
    'runChanges', 'checkpointStateSha256', 'resourceTotalsBeforeManifest',
  ], 'checkpoint manifest');
  if (manifest.schema !== R7_MANIFEST_SCHEMA || manifest.transition !== patch.transition
    || manifest.generation !== patch.generation || manifest.bindingSha256 !== patch.bindingSha256) {
    throw frontierError('manifest plan header does not match its patch');
  }
  assertSafeManifestInteger(manifest.generation, 'manifest generation', 32_767);
  validateResumableManifestTip(plan.tip, 'manifest plan tip');
  if (plan.tip.generation !== manifest.generation
    || plan.tip.manifestSha256 !== sha256Upper(plan.manifestBytes)) {
    throw frontierError('manifest plan tip does not authenticate its exact bytes');
  }
  assertExactRecord(patch, [
    'transition', 'kind', 'generation', 'binding', 'bindingSha256', 'depth', 'parentOffset',
    'lastProcessedParentKey', 'transitions', 'boundPrunes', 'frontierDescriptor',
    'appendedNextDescriptor', 'resetNextRuns', 'appendedDepth', 'nextRunsSha256',
    'completedDepthsSha256', 'activeRunBytes', 'reason',
  ], 'manifest patch');
  validateResumableBinding(patch.binding);
  if (canonicalHash(R7_BINDING_HASH_LABEL, patch.binding) !== patch.bindingSha256) {
    throw frontierError('manifest patch binding commitment is invalid');
  }
  const projectionKeys = projection.kind === 'searching' ? [
    'kind', 'generation', 'bindingSha256', 'depth', 'parentOffset', 'lastProcessedParentKey',
    'transitions', 'boundPrunes', 'frontierDescriptorSha256', 'nextRunsSha256', 'nextRunCount',
    'completedDepthsSha256', 'completedDepthCount',
  ] : [
    'kind', 'generation', 'bindingSha256', 'reason', 'completedDepthsSha256', 'completedDepthCount',
  ];
  if (projection.kind !== 'searching' && projection.kind !== 'complete') {
    throw frontierError('manifest checkpoint projection kind is invalid');
  }
  assertExactRecord(projection, projectionKeys, 'manifest checkpoint projection');
  if (projection.kind !== patch.kind || projection.generation !== patch.generation
    || projection.bindingSha256 !== patch.bindingSha256
    || projection.completedDepthsSha256 !== patch.completedDepthsSha256) {
    throw frontierError('manifest checkpoint projection does not match its patch');
  }
  if (manifest.checkpointStateSha256 !== canonicalHash(R7_CHECKPOINT_STATE_HASH_LABEL, projection)) {
    throw frontierError('manifest checkpoint projection commitment is invalid');
  }
  validateResumableRunChanges(manifest.runChanges);
  if (!Array.isArray(plan.removedDescriptors)) throw frontierError('manifest removed descriptors must be an array');
  const expectedRemoveSet = resumableRunSetHash(plan.removedDescriptors);
  if (manifest.runChanges.removeSetSha256 !== expectedRemoveSet) {
    throw frontierError('manifest removed descriptor commitment is invalid');
  }
  if (plan.addedDescriptor === null) {
    if (manifest.runChanges.add.length !== 0) throw frontierError('manifest unexpectedly serializes an added descriptor');
  } else {
    validateResumableRunDescriptor(plan.addedDescriptor);
    if (manifest.runChanges.add.length !== 1
      || canonicalizeJson(manifest.runChanges.add[0]) !== canonicalizeJson(plan.addedDescriptor)) {
      throw frontierError('manifest added descriptor commitment is invalid');
    }
  }
  const patchAddedDescriptor = patch.transition === 'unit' ? patch.appendedNextDescriptor
    : patch.transition === 'complete' ? null : patch.frontierDescriptor;
  if (canonicalizeJson(patchAddedDescriptor) !== canonicalizeJson(plan.addedDescriptor)) {
    throw frontierError('manifest added descriptor does not match its state patch');
  }
  const expectedRemovedDescriptors = ['layer', 'complete'].includes(patch.transition)
    ? [state.frontierDescriptor, ...state.nextRuns] : [];
  if (canonicalizeJson(plan.removedDescriptors) !== canonicalizeJson(expectedRemovedDescriptors)) {
    throw frontierError('manifest removed descriptors do not match the prior state');
  }
  if (patch.resetNextRuns !== (patch.transition !== 'unit')) {
    throw frontierError('manifest next-run reset does not match its transition');
  }
  validateResumableResourceTotals(manifest.resourceTotalsBeforeManifest, patch.activeRunBytes);

  const currentTip = state.tip;
  if ((currentTip === null) !== (plan.baseTip === null)
    || (currentTip !== null && (currentTip.generation !== plan.baseTip.generation
      || currentTip.manifestSha256 !== plan.baseTip.manifestSha256))) {
    throw frontierError('manifest plan base tip is stale');
  }
  const expectedPrevious = plan.baseTip?.manifestSha256 ?? null;
  if (manifest.previousManifestSha256 !== expectedPrevious
    || manifest.generation !== (plan.baseTip === null ? 0 : plan.baseTip.generation + 1)) {
    throw frontierError('manifest generation link does not match its base tip');
  }
  const expectedRemoveRule = patch.transition === 'layer' ? 'current-frontier-and-next-runs'
    : patch.transition === 'complete' ? 'all-active-proof-runs' : 'none';
  if (manifest.runChanges.removeRule !== expectedRemoveRule
    || (expectedRemoveRule === 'none' && plan.removedDescriptors.length !== 0)) {
    throw frontierError('manifest removal rule does not match its transition');
  }
  if (patch.transition === 'seed') {
    assertExactRecord(manifest.stateDelta, [
      'binding', 'depth', 'parentOffset', 'lastProcessedParentKey', 'transitions', 'boundPrunes',
    ], 'seed stateDelta');
    if (canonicalizeJson(manifest.stateDelta.binding) !== canonicalizeJson(patch.binding)
      || manifest.stateDelta.depth !== patch.depth || manifest.stateDelta.parentOffset !== patch.parentOffset
      || manifest.stateDelta.lastProcessedParentKey !== patch.lastProcessedParentKey
      || manifest.stateDelta.transitions !== patch.transitions
      || manifest.stateDelta.boundPrunes !== patch.boundPrunes) throw frontierError('seed stateDelta does not match its patch');
  } else if (patch.transition === 'unit') {
    assertExactRecord(manifest.stateDelta, [
      'depth', 'parentOffset', 'lastProcessedParentKey', 'transitionsDelta', 'boundPrunesDelta',
    ], 'unit stateDelta');
    if (manifest.stateDelta.depth !== patch.depth || manifest.stateDelta.parentOffset !== patch.parentOffset
      || manifest.stateDelta.lastProcessedParentKey !== patch.lastProcessedParentKey
      || addSafeManifestInteger(state.transitions, manifest.stateDelta.transitionsDelta, 'commit transition counter') !== patch.transitions
      || addSafeManifestInteger(state.boundPrunes, manifest.stateDelta.boundPrunesDelta, 'commit bound-prune counter') !== patch.boundPrunes) {
      throw frontierError('unit stateDelta does not match its patch');
    }
  } else if (patch.transition === 'layer') {
    assertExactRecord(manifest.stateDelta, ['completedDepth', 'nextDepth'], 'layer stateDelta');
    if (canonicalizeJson(manifest.stateDelta.completedDepth) !== canonicalizeJson(patch.appendedDepth)
      || manifest.stateDelta.nextDepth !== patch.depth) throw frontierError('layer stateDelta does not match its patch');
  } else {
    assertExactRecord(manifest.stateDelta, ['completedDepth', 'reason'], 'complete stateDelta');
    if (canonicalizeJson(manifest.stateDelta.completedDepth) !== canonicalizeJson(patch.appendedDepth)
      || manifest.stateDelta.reason !== patch.reason) throw frontierError('complete stateDelta does not match its patch');
  }
  if (projection.kind === 'searching') {
    const expectedNextRunCount = patch.resetNextRuns ? 0
      : state.nextRuns.length + (patch.appendedNextDescriptor === null ? 0 : 1);
    const expectedCompletedDepthCount = state.completedDepths.length + (patch.appendedDepth === null ? 0 : 1);
    if (patch.frontierDescriptor === null
      || projection.depth !== patch.depth || projection.parentOffset !== patch.parentOffset
      || projection.lastProcessedParentKey !== patch.lastProcessedParentKey
      || projection.transitions !== patch.transitions || projection.boundPrunes !== patch.boundPrunes
      || projection.frontierDescriptorSha256 !== resumableDescriptorHash(patch.frontierDescriptor)
      || projection.nextRunsSha256 !== patch.nextRunsSha256
      || projection.nextRunCount !== expectedNextRunCount
      || projection.completedDepthCount !== expectedCompletedDepthCount) {
      throw frontierError('searching projection does not match its patch');
    }
  } else {
    const expectedCompletedDepthCount = state.completedDepths.length + (patch.appendedDepth === null ? 0 : 1);
    if (projection.reason !== patch.reason || projection.completedDepthCount !== expectedCompletedDepthCount) {
      throw frontierError('complete projection does not match its patch');
    }
  }
  return snapshot;
}

function prepareManifestStateReplacement(state, sealed) {
  const { patch } = sealed;
  if (patch.transition === 'unit') throw frontierError('unit transitions require in-place collection application');
  if (!patch.resetNextRuns || patch.appendedNextDescriptor !== null) {
    throw frontierError('replacement transitions must reset nextRuns without an appended unit descriptor');
  }
  let completedDepths = state.completedDepths;
  let completedTotals = state.completedTotals;
  if (patch.transition === 'seed') {
    completedDepths = [];
    completedTotals = { frontierStates: 0, transitions: 0, boundPrunes: 0 };
  } else if (patch.appendedDepth !== null) {
    completedDepths = [...state.completedDepths, patch.appendedDepth];
    completedTotals = {};
    for (const key of ['frontierStates', 'transitions', 'boundPrunes']) {
      completedTotals[key] = addSafeManifestInteger(
        state.completedTotals[key], patch.appendedDepth[key], `committed ${key} total`,
      );
    }
  }
  const nextRuns = [];
  const activeIds = new Set(patch.frontierDescriptor === null ? [] : [patch.frontierDescriptor.id]);
  return {
    tip: sealed.tip,
    binding: patch.binding,
    bindingSha256: patch.bindingSha256,
    kind: patch.kind,
    generation: patch.generation,
    depth: patch.depth,
    parentOffset: patch.parentOffset,
    lastProcessedParentKey: patch.lastProcessedParentKey,
    transitions: patch.transitions,
    boundPrunes: patch.boundPrunes,
    frontierDescriptor: patch.frontierDescriptor,
    nextRuns,
    activeIds,
    activeRunBytes: patch.activeRunBytes,
    nextRunsSha256: patch.nextRunsSha256,
    completedDepths,
    completedDepthsSha256: patch.completedDepthsSha256,
    completedTotals,
    reason: patch.reason,
  };
}

function prepareManifestUnitApplication(state, sealed) {
  const { patch } = sealed;
  if (patch.transition !== 'unit' || patch.resetNextRuns || patch.appendedDepth !== null) {
    throw frontierError('manifest unit patch shape is invalid');
  }
  const activeSize = Reflect.apply(R7_NATIVE_SET_SIZE, state.activeIds, []);
  assertSafeManifestInteger(activeSize, 'manifest active run count');
  assertSafeManifestInteger(state.nextRuns.length, 'manifest next run count',
    RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS.maximumUnits);
  const descriptor = patch.appendedNextDescriptor;
  if (descriptor !== null) {
    if (!Object.isExtensible(state.nextRuns)) {
      throw frontierError('manifest nextRuns must remain extensible for a unit append');
    }
    const lengthDescriptor = Object.getOwnPropertyDescriptor(state.nextRuns, 'length');
    if (!lengthDescriptor || lengthDescriptor.value !== state.nextRuns.length
      || lengthDescriptor.writable !== true || lengthDescriptor.enumerable !== false
      || lengthDescriptor.configurable !== false) {
      throw frontierError('manifest nextRuns length must remain a writable native array length');
    }
    const prospectiveKey = String(state.nextRuns.length);
    for (let owner = state.nextRuns; owner !== null; owner = Object.getPrototypeOf(owner)) {
      if (Object.getOwnPropertyDescriptor(owner, prospectiveKey)) {
        throw frontierError(`manifest nextRuns prospective index ${prospectiveKey} is blocked`);
      }
    }
    if (state.nextRuns.length >= RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS.maximumUnits) {
      throw frontierError('manifest nextRuns cannot append beyond 4096 unit runs');
    }
    if (Reflect.apply(R7_NATIVE_SET_HAS, state.activeIds, [descriptor.id])) {
      throw frontierError(`duplicate committed active run id ${descriptor.id}`);
    }
  }
  if (state.frontierDescriptor === null
    || !Reflect.apply(R7_NATIVE_SET_HAS, state.activeIds, [state.frontierDescriptor.id])
    || activeSize !== state.nextRuns.length + 1) {
    throw frontierError('manifest active run set does not match the current frontier and next-run count');
  }
  if (descriptor === null) return null;
  if (activeSize >= RESUMABLE_ENDGAME_DISK_FRONTIER_LIMITS.maximumUnits + 1) {
    throw frontierError('manifest active run set cannot grow beyond the frontier plus 4096 unit runs');
  }
  return Object.freeze({
    nextRuns: state.nextRuns,
    activeIds: state.activeIds,
    descriptor,
    descriptorArguments: Object.freeze([descriptor]),
    idArguments: Object.freeze([descriptor.id]),
  });
}

function applyManifestUnitScalars(state, sealed) {
  const { patch } = sealed;
  state.tip = sealed.tip;
  state.binding = patch.binding;
  state.bindingSha256 = patch.bindingSha256;
  state.kind = patch.kind;
  state.generation = patch.generation;
  state.depth = patch.depth;
  state.parentOffset = patch.parentOffset;
  state.lastProcessedParentKey = patch.lastProcessedParentKey;
  state.transitions = patch.transitions;
  state.boundPrunes = patch.boundPrunes;
  state.frontierDescriptor = patch.frontierDescriptor;
  state.activeRunBytes = patch.activeRunBytes;
  state.nextRunsSha256 = patch.nextRunsSha256;
  state.completedDepthsSha256 = patch.completedDepthsSha256;
  state.reason = patch.reason;
}

function applyManifestStateReplacement(state, replacement) {
  state.tip = replacement.tip;
  state.binding = replacement.binding;
  state.bindingSha256 = replacement.bindingSha256;
  state.kind = replacement.kind;
  state.generation = replacement.generation;
  state.depth = replacement.depth;
  state.parentOffset = replacement.parentOffset;
  state.lastProcessedParentKey = replacement.lastProcessedParentKey;
  state.transitions = replacement.transitions;
  state.boundPrunes = replacement.boundPrunes;
  state.frontierDescriptor = replacement.frontierDescriptor;
  state.nextRuns = replacement.nextRuns;
  state.activeIds = replacement.activeIds;
  state.activeRunBytes = replacement.activeRunBytes;
  state.nextRunsSha256 = replacement.nextRunsSha256;
  state.completedDepths = replacement.completedDepths;
  state.completedDepthsSha256 = replacement.completedDepthsSha256;
  state.completedTotals = replacement.completedTotals;
  state.reason = replacement.reason;
}

function manifestTipsMatch(left, right) {
  return (left === null && right === null)
    || (left !== null && right !== null
      && left.generation === right.generation
      && left.manifestSha256 === right.manifestSha256);
}

function prepareResumableManifestTransitionCommit(state, plan) {
  if (!state || typeof state !== 'object' || !plan || typeof plan !== 'object') {
    throw frontierError('manifest state and plan are required');
  }
  if (R7_PENDING_MANIFEST_TRANSITIONS.has(state)) {
    throw frontierError('manifest state already has a prepared transition');
  }
  const snapshot = validateManifestPlanForCommit(state, plan);
  const expectedBaseGeneration = snapshot.sealed.baseTip === null
    ? -1
    : snapshot.sealed.baseTip.generation;
  if (snapshot.baseGeneration !== expectedBaseGeneration
    || state.generation !== snapshot.baseGeneration
    || snapshot.sealed.tip.generation !== expectedBaseGeneration + 1) {
    throw frontierError('manifest plan base generation is stale');
  }
  const application = snapshot.sealed.patch.transition === 'unit'
    ? Object.freeze({ kind: 'unit', append: prepareManifestUnitApplication(state, snapshot.sealed) })
    : Object.freeze({ kind: 'replacement', replacement: prepareManifestStateReplacement(state, snapshot.sealed) });
  const token = Object.freeze(Object.create(null));
  R7_PREPARED_MANIFEST_TRANSITIONS.set(token, {
    state,
    baseTip: snapshot.sealed.baseTip,
    baseGeneration: state.generation,
    targetGeneration: snapshot.sealed.tip.generation,
    sealed: snapshot.sealed,
    application,
    manifestBytes: Buffer.from(snapshot.manifestBytes),
    phase: 'prepared',
  });
  R7_PENDING_MANIFEST_TRANSITIONS.set(state, token);
  snapshot.consumed = true;
  R7_MANIFEST_PLAN_SNAPSHOTS.delete(plan);
  return token;
}

function preparedResumableManifestTransitionBytes(token) {
  const prepared = token && typeof token === 'object'
    ? R7_PREPARED_MANIFEST_TRANSITIONS.get(token)
    : undefined;
  if (!prepared) throw frontierError('prepared manifest transition is not owned by this adapter');
  return Buffer.from(prepared.manifestBytes);
}

function claimPreparedResumableManifestTransitionCommit(state, token) {
  if (!state || typeof state !== 'object' || !token || typeof token !== 'object') {
    throw frontierError('manifest state and prepared transition are required');
  }
  const prepared = R7_PREPARED_MANIFEST_TRANSITIONS.get(token);
  if (!prepared) throw frontierError('prepared manifest transition is not owned by this adapter');
  if (prepared.state !== state) {
    throw frontierError('prepared manifest transition belongs to a different state instance');
  }
  if (R7_PENDING_MANIFEST_TRANSITIONS.get(state) !== token) {
    throw frontierError('prepared manifest transition lost its exclusive state claim');
  }
  if (prepared.phase !== 'prepared') throw frontierError('prepared manifest transition was already claimed');
  if (state.generation !== prepared.baseGeneration || !manifestTipsMatch(state.tip, prepared.baseTip)) {
    R7_PREPARED_MANIFEST_TRANSITIONS.delete(token);
    R7_PENDING_MANIFEST_TRANSITIONS.delete(state);
    throw frontierError('prepared manifest transition base state is stale');
  }
  prepared.phase = 'claimed';
  return token;
}

function applyPreparedResumableManifestTransition(token) {
  if (!token || typeof token !== 'object') throw frontierError('prepared manifest transition is required');
  const prepared = R7_PREPARED_MANIFEST_TRANSITIONS.get(token);
  if (!prepared) throw frontierError('prepared manifest transition is not owned by this adapter');
  if (prepared.phase !== 'claimed') throw frontierError('prepared manifest transition must be claimed before apply');
  const { state } = prepared;
  if (R7_PENDING_MANIFEST_TRANSITIONS.get(state) !== token) {
    throw frontierError('prepared manifest transition lost its exclusive state claim');
  }
  R7_PREPARED_MANIFEST_TRANSITIONS.delete(token);
  R7_PENDING_MANIFEST_TRANSITIONS.delete(state);
  if (prepared.application.kind === 'unit') {
    const { append } = prepared.application;
    if (append !== null) {
      Reflect.apply(R7_NATIVE_ARRAY_PUSH, append.nextRuns, append.descriptorArguments);
      Reflect.apply(R7_NATIVE_SET_ADD, append.activeIds, append.idArguments);
    }
    applyManifestUnitScalars(state, prepared.sealed);
    return state;
  }
  applyManifestStateReplacement(state, prepared.application.replacement);
  return state;
}

function commitResumableManifestTransition(state, plan) {
  const token = prepareResumableManifestTransitionCommit(state, plan);
  claimPreparedResumableManifestTransitionCommit(state, token);
  return applyPreparedResumableManifestTransition(token);
}

/*
 * The filesystem publisher prepares and claims before its no-replace manifest link, writes
 * only prepared.manifestBytes, and calls the claimed-token apply path immediately after it.
 * All schema, hash, quota, collection, and replacement allocation failures therefore occur
 * before the link. Claim is the last O(1) state/tip freshness check. The remaining native
 * mutations deliberately have no rollback: once the link exists, the new generation is
 * authoritative.
 */

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

function inspectProofRunFile(fs, filePath, expectedSize, expectedIdentity = null, descriptorTracker, phase = 'run-readback') {
  const stats = fs.lstatSync(filePath, { bigint: true });
  assertPlainFile(stats, path.basename(filePath));
  assertExactRealpath(fs, filePath);
  const identity = proofFileIdentity(stats);
  if (expectedIdentity && !sameProofFileIdentity(identity, expectedIdentity)) throw frontierError('run file identity drift');
  const dataBytes = Number(stats.size);
  if (!Number.isSafeInteger(dataBytes)) throw frontierError('run byte length exceeds safe integer range');
  let descriptor = null;
  let primary = null;
  const cleanup = [];
  const hash = createHash('sha256');
  let count = 0;
  let firstKey = null;
  let lastKey = null;
  let record = '';
  try {
    descriptor = descriptorTracker.open(filePath, 'r', undefined, phase);
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
  } catch (error) {
    primary = error;
    throw error;
  } finally {
    if (descriptor !== null) {
      try {
        descriptorTracker.close(descriptor);
        descriptor = null;
      } catch (error) { cleanup.push(error); }
    }
    if (cleanup.length > 0) {
      throw aggregateR7CloseFailure(primary, cleanup, `${path.basename(filePath)} run read cleanup failed.`);
    }
  }
  return Object.freeze({ dataBytes, dataSha256: hash.digest('hex').toUpperCase(), firstKey, lastKey, identity });
}

function* readProofRunRange(fs, filePath, identity, size, offsets, range, descriptorTracker) {
  const selected = range === undefined ? { startOrdinal: 0, endOrdinal: size } : validateResumableRunRange(size, range);
  if (selected.startOrdinal === selected.endOrdinal) return;
  const { startOffset, endOffset } = resumableRangeByteOffsets({ size, offsets }, selected);
  let descriptor = null;
  let primary = null;
  let count = 0;
  let previous = null;
  let record = '';
  try {
    descriptor = descriptorTracker.open(filePath, 'r', undefined, 'run-range-read');
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
  } catch (error) {
    primary = error;
    throw error;
  } finally {
    if (descriptor !== null) {
      try {
        descriptorTracker.close(descriptor);
        descriptor = null;
      } catch (error) {
        throw aggregateR7CloseFailure(primary, [error], `${path.basename(filePath)} range read cleanup failed.`);
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

function resumableStageIdentity(fs, stagePath) {
  const stats = fs.lstatSync(stagePath, { bigint: true });
  assertPlainDirectory(stats, 'resumable stage');
  return proofFileIdentity(stats);
}

function assertResumableStageRootIdentity(identity, expectedRootIdentity) {
  if (expectedRootIdentity !== null && !sameProofFileObject(identity, expectedRootIdentity)) {
    throw frontierError('resumable stage root identity drift');
  }
}

function stampResumableStageIdentity(fs, stagePath, sentinelTime, expectedRootIdentity = null) {
  assertResumableStageRootIdentity(resumableStageIdentity(fs, stagePath), expectedRootIdentity);
  fs.utimesSync(stagePath, sentinelTime, sentinelTime);
  const identity = resumableStageIdentity(fs, stagePath);
  assertResumableStageRootIdentity(identity, expectedRootIdentity);
  return identity;
}

function scanObservedResumableInventory(fs, stagePath, limits, expectedRootIdentity = null) {
  const before = resumableStageIdentity(fs, stagePath);
  assertResumableStageRootIdentity(before, expectedRootIdentity);
  const inventory = scanResumableInventory(fs, stagePath, limits);
  const after = resumableStageIdentity(fs, stagePath);
  assertResumableStageRootIdentity(after, expectedRootIdentity);
  if (!sameProofFileIdentity(before, after)) throw frontierError('resumable stage changed during inventory scan');
  return Object.freeze({ inventory, stageIdentity: after });
}

function scanStampedResumableInventory(fs, stagePath, limits, sentinelTime, expectedRootIdentity = null) {
  const before = stampResumableStageIdentity(fs, stagePath, sentinelTime, expectedRootIdentity);
  const inventory = scanResumableInventory(fs, stagePath, limits);
  const after = resumableStageIdentity(fs, stagePath);
  assertResumableStageRootIdentity(after, expectedRootIdentity);
  if (!sameProofFileIdentity(before, after)) throw frontierError('resumable stage changed during inventory scan');
  return Object.freeze({ inventory, stageIdentity: after });
}

function publishResumableOwner(fs, stagePath, ownerBytes, limits, descriptorTracker) {
  if (ownerBytes.length > limits.ownerOrIndexBytes) throw frontierError('owner.json exceeds its individual byte limit');
  // createStage just won an exclusive non-recursive mkdir; the post-publication admission
  // scan authenticates the resulting namespace, so owner admission does not enumerate twice.
  if (2 > limits.maximumNamespaceEntries || 2 * ownerBytes.length > limits.ownerAndIndexBytes
    || 2 * ownerBytes.length > limits.auxiliaryBytes) {
    throw frontierError('owner two-alias admission exceeds resumable limits');
  }
  const partPath = path.join(stagePath, 'owner.json.part');
  const finalPath = path.join(stagePath, 'owner.json');
  let descriptor = null;
  let primary = null;
  const cleanup = [];
  try {
    descriptor = descriptorTracker.open(partPath, 'wx', 0o600, 'owner-write');
    writeAllProofBytes(fs, descriptor, ownerBytes);
    fs.fsyncSync(descriptor);
    descriptorTracker.close(descriptor);
    descriptor = null;
    const part = readBoundedProofFile(fs, partPath, limits.ownerOrIndexBytes, descriptorTracker, 'owner-part-readback');
    if (!part.bytes.equals(ownerBytes)) throw frontierError('owner part bytes changed before publication');
    fs.linkSync(partPath, finalPath);
    const linkedPart = readBoundedProofFile(
      fs, partPath, limits.ownerOrIndexBytes, descriptorTracker, 'owner-linked-part-readback',
    );
    const linked = readBoundedProofFile(
      fs, finalPath, limits.ownerOrIndexBytes, descriptorTracker, 'owner-final-readback',
    );
    if (!linked.bytes.equals(ownerBytes) || !sameProofFileIdentity(linkedPart.identity, linked.identity)) {
      throw frontierError('owner final does not match its hard-link part');
    }
    if (descriptorTracker.hasPath(partPath)) throw frontierError('owner part still has a pending descriptor close');
    fs.unlinkSync(partPath);
    const final = readBoundedProofFile(
      fs, finalPath, limits.ownerOrIndexBytes, descriptorTracker, 'owner-contracted-final-readback',
    );
    if (!final.bytes.equals(ownerBytes)) throw frontierError('owner final changed after alias contraction');
  } catch (error) {
    primary = error;
    throw error;
  } finally {
    if (descriptor !== null) {
      try {
        descriptorTracker.close(descriptor);
        descriptor = null;
      } catch (error) { cleanup.push(error); }
    }
    if (cleanup.length > 0) {
      throw aggregateR7CloseFailure(primary, cleanup, 'owner publication close cleanup failed.');
    }
  }
}

function validateResumableTip(tip) {
  validateResumableManifestTip(tip, 'expectedTip');
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
  const cleanupErrors = [];
  let cleanupErrorsOmitted = 0;
  const recordCleanupError = (error) => {
    if (cleanupErrors.length < ENDGAME_DISK_FRONTIER_LIMITS.diagnosticMaxEntries) {
      cleanupErrors.push(normalizeDiagnostic(error));
    } else cleanupErrorsOmitted += 1;
  };
  const pendingCloseDescriptors = new Map();
  const descriptorTracker = createR7DescriptorTracker(fs, pendingCloseDescriptors, recordCleanupError);
  const limits = normalizeResumableLimits(options.limits);
  const stageSentinelTime = nextResumableStageSentinelTime();
  let stageSentinelArmed = false;
  const ownerValue = Object.freeze({ schema: 't37-f4e-r7-owner-v1', ownerId });
  const ownerBytes = Buffer.from(`${canonicalizeJson(ownerValue)}\n`, 'utf8');
  let stagePath;
  let stageRootIdentity;
  let inventory;
  let stageIdentity;
  let blockedReason = null;
  try {
    stagePath = exactResumableStage(fs, options.stagePath, mode);
    stageRootIdentity = resumableStageIdentity(fs, stagePath);
    if (mode === 'create') publishResumableOwner(fs, stagePath, ownerBytes, limits, descriptorTracker);
    const initialScan = mode === 'create'
      ? scanStampedResumableInventory(fs, stagePath, limits, stageSentinelTime, stageRootIdentity)
      : scanObservedResumableInventory(fs, stagePath, limits, stageRootIdentity);
    ({ inventory, stageIdentity } = initialScan);
    if (mode === 'create') stageSentinelArmed = true;
    const manifests = inventory.names.filter((name) => /^manifest-g[0-9]{5}\.json$/u.test(name));
    if (mode === 'resume' && options.expectedTip !== null && manifests.length === 0) {
      throw frontierError('authenticated rollback: expectedTip is absent from the manifest chain');
    }
    const owner = inventory.entries.get('owner.json');
    const ownerPart = inventory.entries.get('owner.json.part');
    if (!owner) {
      if (mode === 'create') throw frontierError('created owner final is absent');
      if (options.expectedTip !== null) throw frontierError('authenticated rollback: owner final is absent');
      if (inventory.names.length === 0) blockedReason = 'pre-owner-empty-residue';
      else if (inventory.names.length === 1 && ownerPart) blockedReason = 'pre-owner-part-residue';
      else throw frontierError('owner final is absent with ambiguous stage entries');
    } else {
      const verifiedOwner = readBoundedProofFile(
        fs, owner.filePath, limits.ownerOrIndexBytes, descriptorTracker, 'owner-admission-readback',
      );
      const parsedOwner = parseCanonicalLfBytes(verifiedOwner.bytes);
      if (canonicalizeJson(parsedOwner) !== canonicalizeJson(ownerValue)) throw frontierError('owner.json does not match ownerId');
      if (ownerPart) {
        const verifiedPart = readBoundedProofFile(
          fs, ownerPart.filePath, limits.ownerOrIndexBytes, descriptorTracker, 'owner-part-admission-readback',
        );
        if (!sameProofFileIdentity(verifiedOwner.identity, verifiedPart.identity)
          || !verifiedOwner.bytes.equals(verifiedPart.bytes)) throw frontierError('owner alias identity mismatch');
        if (inventory.names.length === 2 && manifests.length === 0 && options.expectedTip === null) {
          blockedReason = 'owner-alias-residue';
        }
      }
      const unrelated = inventory.names.filter((name) => name !== 'owner.json' && name !== 'owner.json.part');
      if (unrelated.length > 0) throw frontierError('manifest admission scan is not yet available in this checkpoint');
    }
    const admittedStageIdentity = resumableStageIdentity(fs, stagePath);
    assertResumableStageRootIdentity(admittedStageIdentity, stageRootIdentity);
    if (!sameProofFileIdentity(stageIdentity, admittedStageIdentity)) {
      throw frontierError('resumable stage changed during Store admission');
    }
  } catch (primary) {
    const closeFailures = descriptorTracker.drain();
    const failure = aggregate(primary, closeFailures, 'resumable Store construction failed.');
    if (primary?.r7CloseFailed === true || closeFailures.length > 0) markR7CloseFailed(failure);
    throw failure;
  }
  let invalidated = false;
  let viewOutstanding = false;
  let disposed = false;
  let suspendCloseFailed = false;
  const writers = new Map();
  const runs = new Map();
  const activeReaders = new Set();
  const ownedFiles = new Map();
  const orphanOwnedPaths = new Map();
  const pendingAuthorizedHardLinkRefreshes = new Map();
  let authorizationBucketVisits = 0;
  const inventoryLedger = createResumableInventoryLedger(inventory, limits);
  inventory = inventoryLedger.view;
  const teardownAuthorized = new Map(
    [...inventory.entries.values()].map((entry) => [entry.filePath, entry.identity]),
  );
  const teardownAuthorizedObjects = new Map();
  for (const [filePath, identity] of teardownAuthorized) {
    const key = proofObjectKey(identity);
    const paths = teardownAuthorizedObjects.get(key) ?? new Set();
    paths.add(filePath);
    teardownAuthorizedObjects.set(key, paths);
  }
  let candidateReservation = null;
  let inventoryInvalid = false;
  let inventoryRecoveryAttempts = 0;
  let inventoryRecoveryTerminal = false;
  const recoveryTerminalError = () => frontierError('inventory recovery attempts are exhausted');
  const markInventoryInvalid = () => {
    if (!inventoryInvalid && !inventoryRecoveryTerminal) inventoryRecoveryAttempts = 0;
    inventoryInvalid = true;
  };
  const markInventoryRecoveryTerminal = () => {
    if (!inventoryRecoveryTerminal) recordCleanupError(recoveryTerminalError());
    inventoryRecoveryTerminal = true;
    inventoryInvalid = true;
    stageSentinelArmed = false;
  };
  const captureStageMutation = () => {
    if (inventoryRecoveryTerminal) {
      stageSentinelArmed = false;
      const observed = resumableStageIdentity(fs, stagePath);
      assertResumableStageRootIdentity(observed, stageRootIdentity);
      stageIdentity = observed;
      return;
    }
    try {
      const stamped = stampResumableStageIdentity(fs, stagePath, stageSentinelTime, stageRootIdentity);
      stageIdentity = stamped;
      stageSentinelArmed = true;
    } catch (error) {
      stageSentinelArmed = false;
      markInventoryInvalid();
      throw error;
    }
  };
  const applyInventoryScan = (scannedResult) => {
    const scanned = scannedResult.inventory;
    const matched = inventoryLedger.matches(scanned);
    inventoryLedger.replace(scanned);
    stageIdentity = scannedResult.stageIdentity;
    inventoryInvalid = false;
    inventoryRecoveryAttempts = 0;
    return matched;
  };
  const attemptInventoryRecovery = () => {
    if (inventoryRecoveryTerminal) throw recoveryTerminalError();
    if (inventoryRecoveryAttempts >= 2) {
      markInventoryRecoveryTerminal();
      throw recoveryTerminalError();
    }
    inventoryRecoveryAttempts += 1;
    try {
      return applyInventoryScan(scanObservedResumableInventory(
        fs, stagePath, limits, stageRootIdentity,
      ));
    } catch (error) {
      recordCleanupError(error);
      if (inventoryRecoveryAttempts >= 2) markInventoryRecoveryTerminal();
      throw error;
    }
  };
  const attemptInitialInventoryRecovery = () => {
    if (inventoryRecoveryTerminal || inventoryRecoveryAttempts !== 0) return;
    try { attemptInventoryRecovery(); } catch { /* A single public recovery attempt remains. */ }
  };
  const latchBlocked = (error = null) => {
    if (blockedReason === null) blockedReason = 'precommit-owned-residue';
    if (error !== null) recordCleanupError(error);
    markInventoryInvalid();
    attemptInitialInventoryRecovery();
  };
  const assertOwnedStagePath = (filePath) => {
    if (typeof filePath !== 'string' || path.resolve(filePath) !== filePath
      || normalizedPath(path.dirname(filePath)) !== normalizedPath(stagePath)
      || path.basename(filePath) === filePath) {
      throw frontierError('owned proof path escaped its exact stage');
    }
  };
  const failExternalInventoryDrift = (phase, cause = null) => {
    const failure = frontierError(`external inventory drift before ${phase}`);
    if (blockedReason === null) blockedReason = 'external-inventory-drift';
    recordCleanupError(failure);
    if (cause !== null) recordCleanupError(cause);
    markInventoryInvalid();
    attemptInitialInventoryRecovery();
    throw cause === null ? failure : aggregatePropagatingR7Close(failure, [cause], failure.message);
  };
  const armInventorySentinel = (phase) => {
    if (stageSentinelArmed) return;
    if (inventoryRecoveryTerminal) throw recoveryTerminalError();
    // Resume admission itself remains read-only. The first mutation revalidates once, then arms O(1) checks.
    let scannedResult;
    try {
      scannedResult = scanStampedResumableInventory(
        fs, stagePath, limits, stageSentinelTime, stageRootIdentity,
      );
    } catch (cause) {
      stageSentinelArmed = false;
      const failure = frontierError(`external inventory drift before ${phase}`);
      if (blockedReason === null) blockedReason = 'external-inventory-drift';
      recordCleanupError(failure);
      recordCleanupError(cause);
      markInventoryInvalid();
      attemptInitialInventoryRecovery();
      throw aggregate(failure, [cause], failure.message);
    }
    const matched = inventoryLedger.matches(scannedResult.inventory);
    try {
      inventoryLedger.replace(scannedResult.inventory);
      stageIdentity = scannedResult.stageIdentity;
      inventoryInvalid = false;
      inventoryRecoveryAttempts = 0;
    } catch (cause) {
      stageSentinelArmed = false;
      if (blockedReason === null) blockedReason = 'external-inventory-drift';
      recordCleanupError(cause);
      markInventoryInvalid();
      attemptInitialInventoryRecovery();
      throw cause;
    }
    if (!matched) {
      const failure = frontierError(`external inventory drift before ${phase}`);
      if (blockedReason === null) blockedReason = 'external-inventory-drift';
      recordCleanupError(failure);
      stageSentinelArmed = false;
      throw failure;
    }
    stageSentinelArmed = true;
  };
  const ensureInventoryCurrent = (phase, mutation = false) => {
    if (mutation) armInventorySentinel(phase);
    if (inventoryInvalid) attemptInventoryRecovery();
    let currentStageIdentity;
    try {
      currentStageIdentity = resumableStageIdentity(fs, stagePath);
      assertResumableStageRootIdentity(currentStageIdentity, stageRootIdentity);
    } catch (error) {
      failExternalInventoryDrift(phase, error);
    }
    if (!sameProofFileIdentity(stageIdentity, currentStageIdentity)) {
      failExternalInventoryDrift(phase);
    }
    const owner = inventory.entries.get('owner.json');
    if (owner === undefined) return;
    let ownerDrift = null;
    try {
      const verifiedOwner = readBoundedProofFile(
        fs, owner.filePath, limits.ownerOrIndexBytes, descriptorTracker, 'owner-lightweight-readback',
      );
      if (!sameProofFileIdentity(owner.identity, verifiedOwner.identity)) {
        throw frontierError('owner inventory identity drift');
      }
      if (!verifiedOwner.bytes.equals(ownerBytes)) throw frontierError('owner bytes drift');
    } catch (error) {
      ownerDrift = error;
    }
    if (ownerDrift !== null) failExternalInventoryDrift(phase, ownerDrift);
  };
  const authenticateOpenedOwnedFile = (descriptor, filePath) => {
    assertOwnedStagePath(filePath);
    const descriptorStats = fs.fstatSync(descriptor, { bigint: true });
    assertPlainFile(descriptorStats, path.basename(filePath));
    const descriptorIdentity = proofFileIdentity(descriptorStats);
    const pathStats = fs.lstatSync(filePath, { bigint: true });
    assertPlainFile(pathStats, path.basename(filePath));
    assertExactRealpath(fs, filePath);
    const pathIdentity = proofFileIdentity(pathStats);
    if (!sameProofFileIdentity(descriptorIdentity, pathIdentity)) {
      throw frontierError(`opened proof identity drift for ${path.basename(filePath)}`);
    }
    return descriptorIdentity;
  };
  const deleteTeardownAuthorization = (filePath) => {
    const identity = teardownAuthorized.get(filePath);
    if (identity === undefined) return;
    teardownAuthorized.delete(filePath);
    const key = proofObjectKey(identity);
    const paths = teardownAuthorizedObjects.get(key);
    paths?.delete(filePath);
    if (paths?.size === 0) teardownAuthorizedObjects.delete(key);
  };
  const setTeardownAuthorization = (filePath, identity) => {
    const previous = teardownAuthorized.get(filePath);
    if (previous !== undefined && proofObjectKey(previous) !== proofObjectKey(identity)) {
      deleteTeardownAuthorization(filePath);
    }
    teardownAuthorized.set(filePath, identity);
    const key = proofObjectKey(identity);
    const paths = teardownAuthorizedObjects.get(key) ?? new Set();
    paths.add(filePath);
    teardownAuthorizedObjects.set(key, paths);
  };
  const registerOwnedFile = (filePath, identity, allowOwnedGrowth = false, onRegistered = null) => {
    assertOwnedStagePath(filePath);
    if (ownedFiles.has(filePath)) throw frontierError(`duplicate proof ownership for ${path.basename(filePath)}`);
    const name = path.basename(filePath);
    const bytes = Number(identity.size);
    inventoryLedger.add(resumableInventoryEntry(name, filePath, bytes, identity));
    ownedFiles.set(filePath, Object.freeze({ identity, allowOwnedGrowth }));
    setTeardownAuthorization(filePath, identity);
    onRegistered?.();
    captureStageMutation();
  };
  const updateOwnedFile = (filePath, identity, allowOwnedGrowth = false) => {
    if (!ownedFiles.has(filePath)) throw frontierError(`missing proof ownership for ${path.basename(filePath)}`);
    const name = path.basename(filePath);
    const bytes = Number(identity.size);
    inventoryLedger.update(resumableInventoryEntry(name, filePath, bytes, identity));
    ownedFiles.set(filePath, Object.freeze({ identity, allowOwnedGrowth }));
    setTeardownAuthorization(filePath, identity);
  };
  const growOwnedFile = (filePath, additionalBytes) => {
    if (!ownedFiles.has(filePath)) throw frontierError(`missing proof ownership for ${path.basename(filePath)}`);
    inventoryLedger.grow(path.basename(filePath), additionalBytes);
  };
  const notePendingAuthorizedHardLinkRefresh = (identity, removedFilePath) => {
    const key = proofObjectKey(identity);
    const existing = pendingAuthorizedHardLinkRefreshes.get(key);
    if (existing !== undefined
      && (existing.identity.size !== identity.size || existing.identity.mtimeNs !== identity.mtimeNs)) {
      throw frontierError('hard-link teardown invariant drift');
    }
    const sourcePaths = existing?.remainingPaths ?? teardownAuthorizedObjects.get(key) ?? [];
    authorizationBucketVisits += sourcePaths.size ?? sourcePaths.length;
    const remainingPaths = new Set(sourcePaths);
    remainingPaths.delete(removedFilePath);
    pendingAuthorizedHardLinkRefreshes.set(key, Object.freeze({
      identity: existing?.identity ?? identity,
      remainingPaths,
    }));
  };
  const unlinkOwnedFile = (filePath, expectedIdentity = null, onReleased = null) => {
    assertOwnedStagePath(filePath);
    if (descriptorTracker.hasPath(filePath)) {
      throw markR7CloseFailed(frontierError(`refusing unlink while ${path.basename(filePath)} has a pending descriptor close`));
    }
    let ownership = ownedFiles.get(filePath);
    if (!ownership) throw frontierError(`refusing unowned proof path ${path.basename(filePath)}`);
    if (expectedIdentity !== null && !sameProofFileObject(ownership.identity, expectedIdentity)) {
      throw frontierError(`proof ownership drift for ${path.basename(filePath)}`);
    }
    let stats;
    try {
      stats = fs.lstatSync(filePath, { bigint: true });
    } catch (error) {
      if (isMissing(error)) {
        const disappearedWhileLive = blockedReason === null;
        notePendingAuthorizedHardLinkRefresh(ownership.identity, filePath);
        if (inventory.entries.has(path.basename(filePath))) inventoryLedger.remove(path.basename(filePath));
        ownedFiles.delete(filePath);
        deleteTeardownAuthorization(filePath);
        onReleased?.();
        refreshAuthorizedHardLinkAliases(ownership.identity);
        captureStageMutation();
        if (disappearedWhileLive) throw frontierError(`owned proof disappeared before unlink: ${path.basename(filePath)}`);
        return;
      }
      throw error;
    }
    if (pendingAuthorizedHardLinkRefreshes.has(proofObjectKey(ownership.identity))) {
      refreshAuthorizedHardLinkAliases(ownership.identity);
      ownership = ownedFiles.get(filePath);
      if (!ownership) throw frontierError(`missing refreshed proof ownership for ${path.basename(filePath)}`);
    }
    assertPlainFile(stats, path.basename(filePath));
    assertExactRealpath(fs, filePath);
    const current = proofFileIdentity(stats);
    if (!(ownership.allowOwnedGrowth
      ? sameProofFileObject(current, ownership.identity)
      : sameProofFileIdentity(current, ownership.identity))) {
      throw frontierError(`refusing changed owned proof ${path.basename(filePath)}`);
    }
    fs.unlinkSync(filePath);
    notePendingAuthorizedHardLinkRefresh(current, filePath);
    inventoryLedger.remove(path.basename(filePath));
    ownedFiles.delete(filePath);
    deleteTeardownAuthorization(filePath);
    onReleased?.();
    refreshAuthorizedHardLinkAliases(current);
    captureStageMutation();
  };
  const refreshAuthorizedHardLinkAliases = (removedIdentity) => {
    const key = proofObjectKey(removedIdentity);
    const pending = pendingAuthorizedHardLinkRefreshes.get(key);
    const invariantIdentity = pending?.identity ?? removedIdentity;
    const remainingPaths = pending?.remainingPaths
      ?? new Set(teardownAuthorizedObjects.get(key) ?? []);
    authorizationBucketVisits += remainingPaths.size;
    for (const filePath of remainingPaths) {
      const authorizedIdentity = teardownAuthorized.get(filePath);
      if (authorizedIdentity === undefined || !sameProofFileObject(authorizedIdentity, invariantIdentity)) {
        throw frontierError(`hard-link teardown authorization drift for ${path.basename(filePath)}`);
      }
      const stats = fs.lstatSync(filePath, { bigint: true });
      assertPlainFile(stats, path.basename(filePath));
      assertExactRealpath(fs, filePath);
      const refreshedIdentity = proofFileIdentity(stats);
      if (!sameProofFileObject(refreshedIdentity, invariantIdentity)
        || refreshedIdentity.size !== invariantIdentity.size
        || refreshedIdentity.mtimeNs !== invariantIdentity.mtimeNs) {
        throw frontierError(`hard-link teardown identity drift for ${path.basename(filePath)}`);
      }
      setTeardownAuthorization(filePath, refreshedIdentity);
      const name = path.basename(filePath);
      const ledgerEntry = inventory.entries.get(name);
      if (ledgerEntry === undefined || ledgerEntry.filePath !== filePath) {
        throw frontierError(`hard-link teardown ledger drift for ${name}`);
      }
      inventoryLedger.update(resumableInventoryEntry(
        name, filePath, ledgerEntry.bytes, refreshedIdentity,
      ));
      const ownership = ownedFiles.get(filePath);
      if (ownership !== undefined) {
        ownedFiles.set(filePath, Object.freeze({
          identity: refreshedIdentity,
          allowOwnedGrowth: ownership.allowOwnedGrowth,
        }));
      }
    }
    pendingAuthorizedHardLinkRefreshes.delete(key);
  };
  const refreshPendingAuthorizedHardLinkAliases = () => {
    for (const pending of [...pendingAuthorizedHardLinkRefreshes.values()]) {
      refreshAuthorizedHardLinkAliases(pending.identity);
    }
  };
  const unlinkAuthorizedTeardownFile = (filePath, currentIdentity) => {
    assertOwnedStagePath(filePath);
    if (descriptorTracker.hasPath(filePath)) {
      throw markR7CloseFailed(frontierError(`refusing teardown while ${path.basename(filePath)} has a pending descriptor close`));
    }
    const authorizedIdentity = teardownAuthorized.get(filePath);
    if (!authorizedIdentity || !sameProofFileIdentity(authorizedIdentity, currentIdentity)) {
      throw frontierError(`refusing unowned final teardown path ${path.basename(filePath)}`);
    }
    const stats = fs.lstatSync(filePath, { bigint: true });
    assertPlainFile(stats, path.basename(filePath));
    assertExactRealpath(fs, filePath);
    if (!sameProofFileIdentity(proofFileIdentity(stats), authorizedIdentity)) {
      throw frontierError(`final teardown identity drift for ${path.basename(filePath)}`);
    }
    fs.unlinkSync(filePath);
    notePendingAuthorizedHardLinkRefresh(currentIdentity, filePath);
    inventoryLedger.remove(path.basename(filePath));
    ownedFiles.delete(filePath);
    deleteTeardownAuthorization(filePath);
    refreshAuthorizedHardLinkAliases(currentIdentity);
    captureStageMutation();
  };
  const cleanupOrphanOwnedPaths = () => {
    const cleanup = [];
    for (const [filePath, identity] of [...orphanOwnedPaths]) {
      try {
        unlinkOwnedFile(filePath, identity, () => orphanOwnedPaths.delete(filePath));
      } catch (error) { cleanup.push(error); }
    }
    return cleanup;
  };
  const makeWorkingRun = (record) => {
    let runDisposed = false;
    const runReaders = new Set();
    const remainingOwnedPaths = new Map();
    if (record.indexFilePath) remainingOwnedPaths.set(record.indexFilePath, record.indexIdentity);
    remainingOwnedPaths.set(record.filePath, record.identity);
    const trackedValues = (range) => {
      const source = readProofRunRange(
        fs, record.filePath, record.identity, record.size, record.offsets, range, descriptorTracker,
      );
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
    const disposeOwned = () => {
      if (runDisposed) return;
      const cleanup = [];
      for (const reader of [...runReaders]) {
        try { reader.return(); } catch (error) { cleanup.push(error); }
      }
      for (const [filePath, identity] of [...remainingOwnedPaths]) {
        try {
          unlinkOwnedFile(filePath, identity, () => remainingOwnedPaths.delete(filePath));
        } catch (error) { cleanup.push(error); }
      }
      if (remainingOwnedPaths.size === 0) {
        runDisposed = true;
        runs.delete(record.id);
        if (candidateReservation?.id === record.id) candidateReservation = null;
      }
      if (cleanup.length > 0) {
        const failure = aggregatePropagatingR7Close(null, cleanup, `Run ${record.id} cleanup failed.`);
        latchBlocked(failure);
        throw failure;
      }
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
        let primary = null;
        try { ensureInventoryCurrent(`run ${record.id} disposal`, true); } catch (error) { primary = error; }
        const cleanup = [];
        try { disposeOwned(); } catch (error) { cleanup.push(error); }
        if (primary !== null || cleanup.length > 0) {
          throw aggregatePropagatingR7Close(primary, cleanup, `Run ${record.id} disposal failed.`);
        }
      },
    });
    runs.set(record.id, Object.freeze({ run, record, disposeOwned }));
    return run;
  };
  const createRun = (id) => {
    requireLive();
    ensureInventoryCurrent(`run ${id} creation`, true);
    if (blockedReason !== null) throw frontierError(`advance is blocked by ${blockedReason}`);
    const classification = classifyResumableRunId(id);
    if (writers.has(id) || runs.has(id)) throw frontierError(`duplicate run id ${id}`);
    if (candidateReservation !== null) throw frontierError(`candidate ${candidateReservation.id} still owns the generation reservation`);
    const generationNamespaceBaseline = inventory.namespaceEntries;
    admitNamespacePeak(generationNamespaceBaseline, classification.committed ? 4 : 1, limits.maximumNamespaceEntries);
    const filePath = path.join(stagePath, `${id}.run.part`);
    const ownedPaths = new Set();
    let descriptor = null;
    let ownedIdentity;
    let openedPath = false;
    try {
      descriptor = descriptorTracker.open(filePath, 'wx', 0o600, 'run-writer');
      openedPath = true;
      ownedIdentity = authenticateOpenedOwnedFile(descriptor, filePath);
      registerOwnedFile(filePath, ownedIdentity, true, () => ownedPaths.add(filePath));
    } catch (primary) {
      const cleanup = [];
      if (descriptor !== null) {
        try { descriptorTracker.close(descriptor); descriptor = null; } catch (error) {
          cleanup.push(error);
        }
      }
      if (ownedPaths.has(filePath)) {
        try {
          unlinkOwnedFile(filePath, null, () => ownedPaths.delete(filePath));
        } catch (error) { cleanup.push(error); }
      }
      for (const ownedPath of ownedPaths) {
        const ownership = ownedFiles.get(ownedPath);
        if (ownership !== undefined) orphanOwnedPaths.set(ownedPath, ownership.identity);
      }
      const failure = aggregatePropagatingR7Close(primary, cleanup, `Run ${id} bootstrap failed.`);
      if (openedPath || primary?.code === 'EEXIST') latchBlocked(failure);
      throw failure;
    }
    if (classification.committed) candidateReservation = { id, baseline: generationNamespaceBaseline };
    let pendingIndexDescriptor = null;
    let state = 'open';
    let size = 0;
    let dataBytes = 0;
    let first = null;
    let previous = null;
    const offsets = [0];
    const closeWriter = () => {
      if (descriptor === null) return;
      if (!descriptorTracker.hasDescriptor(descriptor)) {
        descriptor = null;
        return;
      }
      try {
        descriptorTracker.close(descriptor);
        descriptor = null;
      } catch (error) { throw error; }
    };
    const closePendingIndex = () => {
      if (pendingIndexDescriptor === null) return;
      if (!descriptorTracker.hasDescriptor(pendingIndexDescriptor)) {
        pendingIndexDescriptor = null;
        return;
      }
      try { descriptorTracker.close(pendingIndexDescriptor); pendingIndexDescriptor = null; }
      catch (error) { throw error; }
    };
    const abortOwned = () => {
      if (state === 'aborted' || state === 'finished') return;
      const errors = [];
      let closeFailed = false;
      try { closeWriter(); } catch (error) { closeFailed = true; errors.push(error); }
      try { closePendingIndex(); } catch (error) { closeFailed = true; errors.push(error); }
      for (const ownedPath of [...ownedPaths]) {
        try {
          unlinkOwnedFile(ownedPath, null, () => ownedPaths.delete(ownedPath));
        } catch (error) { errors.push(error); }
      }
      if (errors.length > 0) {
        if (descriptor === null && pendingIndexDescriptor === null && ownedPaths.size === 0) {
          state = 'aborted';
          R7_OWNED_CANDIDATE_INDEX_PROBES.delete(writer);
          writers.delete(id);
          if (candidateReservation?.id === id) candidateReservation = null;
        }
        const failure = aggregate(null, errors, `Run ${id} abort failed.`);
        if (closeFailed || errors.some((error) => error?.r7CloseFailed === true)) markR7CloseFailed(failure);
        latchBlocked(failure);
        throw failure;
      }
      state = 'aborted';
      R7_OWNED_CANDIDATE_INDEX_PROBES.delete(writer);
      writers.delete(id);
      if (candidateReservation?.id === id) candidateReservation = null;
    };
    const abort = () => {
      if (state === 'aborted' || state === 'finished') return;
      let primary = null;
      if (!invalidated && !disposed) {
        try { ensureInventoryCurrent(`run ${id} abort`, true); } catch (error) { primary = error; }
      }
      const cleanup = [];
      try { abortOwned(); } catch (error) { cleanup.push(error); }
      if (primary !== null || cleanup.length > 0) {
        throw aggregatePropagatingR7Close(primary, cleanup, `Run ${id} abort failed.`);
      }
    };
    const admitCandidateIndexOrCleanup = (logicalSize) => {
      try {
        ensureInventoryCurrent(`run ${id} index admission`, true);
        return admitCandidateIndex(logicalSize, inventory, limits, candidateReservation.baseline);
      } catch (primary) {
        state = 'failed';
        const cleanup = [];
        try { abortOwned(); } catch (error) { cleanup.push(error); }
        const failure = aggregatePropagatingR7Close(primary, cleanup, `Run ${id} index admission failed.`);
        throw failure;
      }
    };
    const openOwnedIndexPart = (indexPartPath, indexBytes) => {
      let openedIndexPath = false;
      try {
        pendingIndexDescriptor = descriptorTracker.open(indexPartPath, 'wx', 0o600, 'index-writer');
        openedIndexPath = true;
        const indexOwned = authenticateOpenedOwnedFile(pendingIndexDescriptor, indexPartPath);
        registerOwnedFile(indexPartPath, indexOwned, true, () => ownedPaths.add(indexPartPath));
        writeAllProofBytes(fs, pendingIndexDescriptor, indexBytes);
        growOwnedFile(indexPartPath, indexBytes.length);
        fs.fsyncSync(pendingIndexDescriptor);
        closePendingIndex();
        return indexOwned;
      } catch (primary) {
        if (openedIndexPath || primary?.code === 'EEXIST') latchBlocked(primary);
        throw primary;
      }
    };
    const probeOwnedCandidateIndex = (logicalSize) => {
      if (state !== 'open' || descriptor === null || !ownedFiles.has(filePath)) {
        throw frontierError('candidate index probe requires a live owned writer');
      }
      if (!classification.committed || candidateReservation?.id !== id) {
        throw frontierError('candidate index probe requires a committed generation writer');
      }
      if (blockedReason !== null) throw frontierError(`advance is blocked by ${blockedReason}`);
      const layout = admitCandidateIndexOrCleanup(logicalSize);
      const indexPartPath = path.join(stagePath, `${id}.idx.part`);
      openOwnedIndexPart(indexPartPath, Buffer.alloc(layout.indexBytes));
      return layout;
    };
    const writer = Object.freeze({
      write(key) {
        if (blockedReason !== null) throw frontierError(`advance is blocked by ${blockedReason}`);
        if (state !== 'open') throw frontierError(`run writer ${id} is not open`);
        const encoded = encodeRecord(key, previous);
        if (inventory.uncommittedWorkingRunBytes + encoded.length > limits.uncommittedWorkingRunBytes) {
          throw frontierError('uncommitted working run bytes exceed the limit');
        }
        if (inventory.recognizedPhysicalRunBytes + encoded.length > limits.recognizedPhysicalRunBytes) {
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
          growOwnedFile(filePath, encoded.length);
        } catch (error) {
          state = 'failed';
          latchBlocked(error);
          throw error;
        }
        size += 1;
        dataBytes += encoded.length;
        if (first === null) first = key;
        previous = key;
      },
      finish() {
        if (blockedReason !== null) throw frontierError(`advance is blocked by ${blockedReason}`);
        if (state !== 'open') throw frontierError(`run writer ${id} cannot finish from ${state}`);
        ensureInventoryCurrent(`run ${id} finish`, true);
        let inspected;
        try {
          fs.fsyncSync(descriptor);
          closeWriter();
          inspected = inspectProofRunFile(fs, filePath, size, null, descriptorTracker, 'run-part-inspect');
          if (!sameProofFileObject(inspected.identity, ownedIdentity) || inspected.dataBytes !== dataBytes
            || inspected.firstKey !== first || inspected.lastKey !== previous) {
            throw frontierError('working run readback drift');
          }
          updateOwnedFile(filePath, inspected.identity, false);
          ownedIdentity = inspected.identity;
        } catch (error) {
          state = 'failed';
          latchBlocked(error);
          throw error;
        }
        if (size > 0) offsets.push(dataBytes);
        bindResumableIndexToDataBytes({ size, offsets }, dataBytes);
        if (classification.committed) {
          const indexBytes = encodeResumableRunIndex(size, offsets);
          admitCandidateIndexOrCleanup(size);
          const runFinalPath = path.join(stagePath, `${id}.run`);
          const indexPartPath = path.join(stagePath, `${id}.idx.part`);
          const indexFinalPath = path.join(stagePath, `${id}.idx`);
          try {
            fs.linkSync(filePath, runFinalPath);
            const linkedPartStats = fs.lstatSync(filePath, { bigint: true });
            const linkedFinalStats = fs.lstatSync(runFinalPath, { bigint: true });
            assertPlainFile(linkedPartStats, path.basename(filePath));
            assertPlainFile(linkedFinalStats, path.basename(runFinalPath));
            assertExactRealpath(fs, filePath);
            assertExactRealpath(fs, runFinalPath);
            const linkedPart = proofFileIdentity(linkedPartStats);
            const linkedFinal = proofFileIdentity(linkedFinalStats);
            if (!sameProofFileIdentity(linkedPart, linkedFinal)) throw frontierError('run hard-link aliases disagree');
            updateOwnedFile(filePath, linkedPart, true);
            registerOwnedFile(runFinalPath, linkedFinal, true, () => ownedPaths.add(runFinalPath));
            unlinkOwnedFile(filePath, linkedPart, () => ownedPaths.delete(filePath));
            try { fs.lstatSync(filePath); throw frontierError('run part survived alias contraction'); }
            catch (error) { if (!isMissing(error)) throw error; }
            const finalRun = inspectProofRunFile(
              fs, runFinalPath, size, null, descriptorTracker, 'run-final-readback',
            );
            if (!sameProofFileObject(finalRun.identity, ownedIdentity) || finalRun.dataBytes !== dataBytes
              || finalRun.dataSha256 !== inspected.dataSha256) throw frontierError('run final verification drift');
            updateOwnedFile(runFinalPath, finalRun.identity, false);
            admitCandidateIndexOrCleanup(size);
            openOwnedIndexPart(indexPartPath, indexBytes);
            const indexPart = readBoundedProofFile(
              fs, indexPartPath, limits.ownerOrIndexBytes, descriptorTracker, 'index-part-readback',
            );
            if (!indexPart.bytes.equals(indexBytes)) throw frontierError('index part readback drift');
            updateOwnedFile(indexPartPath, indexPart.identity, false);
            fs.linkSync(indexPartPath, indexFinalPath);
            const linkedIndexPart = readBoundedProofFile(
              fs, indexPartPath, limits.ownerOrIndexBytes, descriptorTracker, 'index-linked-part-readback',
            );
            const linkedIndexFinal = readBoundedProofFile(
              fs, indexFinalPath, limits.ownerOrIndexBytes, descriptorTracker, 'index-linked-final-readback',
            );
            if (!linkedIndexPart.bytes.equals(indexBytes) || !linkedIndexFinal.bytes.equals(indexBytes)
              || !sameProofFileIdentity(linkedIndexPart.identity, linkedIndexFinal.identity)) throw frontierError('index hard-link aliases disagree');
            updateOwnedFile(indexPartPath, linkedIndexPart.identity, true);
            registerOwnedFile(indexFinalPath, linkedIndexFinal.identity, true, () => ownedPaths.add(indexFinalPath));
            unlinkOwnedFile(indexPartPath, linkedIndexPart.identity, () => ownedPaths.delete(indexPartPath));
            try { fs.lstatSync(indexPartPath); throw frontierError('index part survived alias contraction'); }
            catch (error) { if (!isMissing(error)) throw error; }
            const finalIndex = readBoundedProofFile(
              fs, indexFinalPath, limits.ownerOrIndexBytes, descriptorTracker, 'index-contracted-final-readback',
            );
            assertExactPublishedIndexBytes(finalIndex.bytes, indexBytes);
            if (!sameProofFileObject(finalIndex.identity, linkedIndexFinal.identity)) {
              throw frontierError('index final identity drift after alias contraction');
            }
            const parsedIndex = bindResumableIndexToDataBytes(decodeResumableRunIndex(finalIndex.bytes), dataBytes);
            if (parsedIndex.size !== size) throw frontierError('index final size drift');
            updateOwnedFile(indexFinalPath, finalIndex.identity, false);
            state = 'finished';
            R7_OWNED_CANDIDATE_INDEX_PROBES.delete(writer);
            writers.delete(id);
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
            if (state !== 'aborted') {
              state = 'failed';
              latchBlocked(error);
            }
            throw error;
          }
        }
        state = 'finished';
        R7_OWNED_CANDIDATE_INDEX_PROBES.delete(writer);
        writers.delete(id);
        return makeWorkingRun(Object.freeze({ id, size, filePath, offsets: Object.freeze(offsets), identity: inspected.identity }));
      },
      abort,
    });
    R7_OWNED_CANDIDATE_INDEX_PROBES.set(writer, probeOwnedCandidateIndex);
    writers.set(id, Object.freeze({ writer, abortOwned }));
    return writer;
  };
  const diagnostics = () => {
    if (!invalidated && !disposed && !inventoryInvalid) {
      try { ensureInventoryCurrent('diagnostics'); } catch { /* Diagnostics reports the fail-closed latch below. */ }
    }
    const completeResidue = blockedReason === null
      ? []
      : ['.', ...inventory.names.filter((name) => name !== 'owner.json')];
    const residue = completeResidue.slice(0, ENDGAME_DISK_FRONTIER_LIMITS.diagnosticMaxEntries);
    return Object.freeze({
      activeRuns: Object.freeze([...new Set([...writers.keys(), ...runs.keys()])].sort(ordinalByteCompare)),
      residue: Object.freeze(residue),
      residueTruncated: completeResidue.length > residue.length,
      cleanupErrors: Object.freeze([...cleanupErrors]),
      cleanupErrorsTruncated: cleanupErrorsOmitted > 0,
    });
  };
  const requireLive = () => {
    if (invalidated || disposed) throw frontierError('resumable Store is suspended or disposed');
  };
  const loadCheckpoint = () => {
    requireLive();
    ensureInventoryCurrent('checkpoint load');
    if (viewOutstanding) throw frontierError('a checkpoint view is already outstanding');
    viewOutstanding = true;
    return Object.freeze({ checkpoint: null, tip: null, diagnostics: diagnostics(), advanceAllowed: blockedReason === null });
  };
  const suspend = () => {
    if (!invalidated) {
      suspendCloseFailed = false;
      try { ensureInventoryCurrent('suspend'); } catch { /* Suspend still owns bounded cleanup. */ }
      const pendingCloseFailures = descriptorTracker.drain();
      if (pendingCloseFailures.length > 0) suspendCloseFailed = true;
      for (const error of cleanupOrphanOwnedPaths()) {
        if (error?.r7CloseFailed === true) suspendCloseFailed = true;
        recordCleanupError(error);
      }
      for (const reader of [...activeReaders]) {
        try { reader.return(); } catch (error) {
          if (error?.r7CloseFailed === true) suspendCloseFailed = true;
          recordCleanupError(error);
        }
      }
      for (const { abortOwned } of [...writers.values()]) {
        try { abortOwned(); } catch (error) {
          if (error?.r7CloseFailed === true) suspendCloseFailed = true;
          recordCleanupError(error);
        }
      }
      for (const { disposeOwned } of [...runs.values()]) {
        try { disposeOwned(); } catch (error) {
          if (error?.r7CloseFailed === true) suspendCloseFailed = true;
          recordCleanupError(error);
        }
      }
      if (descriptorTracker.size() > 0) suspendCloseFailed = true;
      invalidated = true;
      viewOutstanding = false;
    }
    return Object.freeze({ diagnostics: diagnostics(), closeFailed: suspendCloseFailed });
  };
  const dispose = () => {
    if (disposed) return;
    let primary = null;
    if (!invalidated) {
      try { ensureInventoryCurrent('Store disposal', true); } catch (error) { primary = error; }
    }
    const cleanup = [];
    let rootIsOwned = false;
    try {
      assertResumableStageRootIdentity(resumableStageIdentity(fs, stagePath), stageRootIdentity);
      rootIsOwned = true;
    } catch (error) {
      cleanup.push(error);
    }
    if (rootIsOwned) {
      if (!invalidated) cleanup.push(...descriptorTracker.drain());
      else cleanup.push(...descriptorTracker.drainPhase('owner-final-teardown-readback'));
      cleanup.push(...cleanupOrphanOwnedPaths());
      for (const { abortOwned } of [...writers.values()]) {
        try { abortOwned(); } catch (error) { cleanup.push(error); }
      }
      for (const { disposeOwned } of [...runs.values()]) {
        try { disposeOwned(); } catch (error) { cleanup.push(error); }
      }
      try { refreshPendingAuthorizedHardLinkAliases(); } catch (error) { cleanup.push(error); }
    }
    if (rootIsOwned && cleanup.length === 0) {
      try {
        const currentResult = scanObservedResumableInventory(fs, stagePath, limits, stageRootIdentity);
        const current = currentResult.inventory;
        const exactAuthorizedInventory = current.namespaceEntries === teardownAuthorized.size
          && current.names.every((name) => {
            const entry = current.entries.get(name);
            const authorized = teardownAuthorized.get(entry.filePath);
            return authorized !== undefined && sameProofFileIdentity(entry.identity, authorized);
          })
          && [...teardownAuthorized].every(([filePath, authorized]) => {
            const entry = current.entries.get(path.basename(filePath));
            return entry !== undefined && entry.filePath === filePath
              && sameProofFileIdentity(entry.identity, authorized);
          });
        if (!exactAuthorizedInventory) {
          throw frontierError('refusing final teardown after stage inventory drift');
        }
        const currentOwner = current.entries.get('owner.json');
        if (currentOwner !== undefined) {
          const verifiedOwner = readBoundedProofFile(
            fs, currentOwner.filePath, limits.ownerOrIndexBytes, descriptorTracker, 'owner-final-teardown-readback',
          );
          if (!sameProofFileIdentity(currentOwner.identity, verifiedOwner.identity)
            || !verifiedOwner.bytes.equals(ownerBytes)) {
            throw frontierError('refusing final teardown after owner byte drift');
          }
        }
        inventoryLedger.replace(current);
        stageIdentity = currentResult.stageIdentity;
        inventoryInvalid = false;
        for (const name of [...current.names].reverse()) {
          const entry = current.entries.get(name);
          const authorizedIdentity = teardownAuthorized.get(entry.filePath);
          if (authorizedIdentity === undefined) {
            throw frontierError(`missing final teardown authorization for ${name}`);
          }
          unlinkAuthorizedTeardownFile(entry.filePath, authorizedIdentity);
        }
        fs.rmdirSync(stagePath);
        disposed = true;
        invalidated = true;
        viewOutstanding = false;
      } catch (error) {
        cleanup.push(error);
      }
    }
    if (primary !== null || cleanup.length > 0) {
      throw aggregatePropagatingR7Close(primary, cleanup, 'Resumable Store disposal failed.');
    }
  };
  const store = Object.freeze({
    createRun,
    diagnostics,
    dispose,
    loadCheckpoint,
    publishCheckpoint() { requireLive(); throw frontierError('resumable manifest publication is not available in the owner checkpoint'); },
    releaseCheckpointRun() { requireLive(); throw frontierError('no committed run is loaded'); },
    suspend,
  });
  R7_AUTHORIZATION_BUCKET_VISIT_PROBES.set(store, () => authorizationBucketVisits);
  return store;
}
