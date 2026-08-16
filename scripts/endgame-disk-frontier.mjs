import * as nativeFs from 'node:fs';
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
