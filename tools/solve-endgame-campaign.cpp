// Historical T12.4 offline candidate-route finder.
//
// T12.5 replaces its parsed deep setup records, anchors, and route budgets with direct
// shallow teaching boards. The current source of truth is the TypeScript-dispatched
// route fixture in docs/workstreams/tetris-t12-core/endgame-solver-results.json; this
// program is retained only as a historical authoring reference and is not invoked by
// the current test/build pipeline or presented as a solver/optimality authority.
//
// Build (from the repository root):
//   g++ -std=c++20 -O3 -Wall -Wextra -pedantic tools/solve-endgame-campaign.cpp -o %TEMP%\\tetra-endgame-solver.exe
// Example smoke parse/search:
//   %TEMP%\\tetra-endgame-solver.exe --level t3r-shaft-01 --beam 32 --max-locks 3

#include <algorithm>
#include <array>
#include <bit>
#include <cctype>
#include <cstdint>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <limits>
#include <optional>
#include <queue>
#include <regex>
#include <sstream>
#include <stdexcept>
#include <string>
#include <string_view>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace tetra::endgame_solver {

constexpr int kWidth = 10;
constexpr int kHeight = 40;
constexpr int kVisibleStart = 20;
constexpr std::uint16_t kFullRow = (1u << kWidth) - 1u;
constexpr int kEntryDelayTicks = 3;
constexpr int kLineClearDelayTicks = 12;
constexpr int kMaxPreDropCommands = 64;

enum class Piece : std::uint8_t { I, O, T, S, Z, J, L };
enum class CommandKind : std::uint8_t { move_left, move_right, rotate_cw, rotate_ccw, soft_drop };

struct Point {
  int x;
  int y;
};

struct Pose {
  Piece type{};
  int rotation = 0;
  int x = 0;
  int y = 0;
};

struct SetupPlacement {
  Piece type{};
  int rotation = 0;
  int x = 0;
};

struct AnchorOverlay {
  std::uint32_t seed = 0;
  int count = 0;
};

/**
 * Both normal and target layers use exactly ten bits per absolute board row.
 * Anchors are a third fixed ten-bit layer.  This is intentionally independent
 * of renderer data and mirrors the Core's normal/target/anchor semantics.
 */
struct PackedBoard {
  std::array<std::uint16_t, kHeight> normal{};
  std::array<std::uint16_t, kHeight> targets{};
  std::array<std::uint16_t, kHeight> anchors{};
};

struct Level {
  std::string id;
  std::uint32_t seed = 0;
  std::vector<SetupPlacement> setup;
  std::optional<AnchorOverlay> overlay;
  PackedBoard initial;
};

struct Macro {
  Piece piece{};
  std::array<CommandKind, kMaxPreDropCommands> commands{};
  int commandCount = 0;
  int preDropRotation = 0;
  int preDropX = 0;
  int preDropY = 0;
  int landingY = 0;
  int settleTicks = 0;
  std::array<int, 4> clearedRows{};
  int clearedRowCount = 0;
};

struct Transition {
  bool valid = false;
  PackedBoard board{};
  Macro macro{};
};

struct Node {
  PackedBoard board{};
  int depth = 0;
  int parent = -1;
  Macro macro{};
  long long heuristic = 0;
};

struct Candidate {
  PackedBoard board{};
  int parent = -1;
  Macro macro{};
  int depth = 0;
  long long heuristic = 0;
};

struct SearchResult {
  bool solved = false;
  int locks = 0;
  std::vector<Macro> route;
  PackedBoard finalBoard{};
  long long finalHeuristic = 0;
  std::size_t expanded = 0;
  std::size_t retained = 0;
};

struct Options {
  std::filesystem::path source = "src/game/core/endgames.ts";
  std::optional<std::string> levelId;
  int beamWidth = 1'200;
  int maxLocks = 64;
  /** Extends the default spawn-only macro domain with legal descending soft-drop input. */
  bool fullInput = false;
  std::optional<std::filesystem::path> output;
};

constexpr Point kShapes[7][4][4] = {
  // I
  {{{0, 1}, {1, 1}, {2, 1}, {3, 1}}, {{2, 0}, {2, 1}, {2, 2}, {2, 3}}, {{0, 2}, {1, 2}, {2, 2}, {3, 2}}, {{1, 0}, {1, 1}, {1, 2}, {1, 3}}},
  // O
  {{{0, 0}, {1, 0}, {0, 1}, {1, 1}}, {{0, 0}, {1, 0}, {0, 1}, {1, 1}}, {{0, 0}, {1, 0}, {0, 1}, {1, 1}}, {{0, 0}, {1, 0}, {0, 1}, {1, 1}}},
  // T
  {{{1, 0}, {0, 1}, {1, 1}, {2, 1}}, {{1, 0}, {1, 1}, {2, 1}, {1, 2}}, {{0, 1}, {1, 1}, {2, 1}, {1, 2}}, {{1, 0}, {0, 1}, {1, 1}, {1, 2}}},
  // S
  {{{1, 0}, {2, 0}, {0, 1}, {1, 1}}, {{1, 0}, {1, 1}, {2, 1}, {2, 2}}, {{1, 1}, {2, 1}, {0, 2}, {1, 2}}, {{0, 0}, {0, 1}, {1, 1}, {1, 2}}},
  // Z
  {{{0, 0}, {1, 0}, {1, 1}, {2, 1}}, {{2, 0}, {1, 1}, {2, 1}, {1, 2}}, {{0, 1}, {1, 1}, {1, 2}, {2, 2}}, {{1, 0}, {0, 1}, {1, 1}, {0, 2}}},
  // J
  {{{0, 0}, {0, 1}, {1, 1}, {2, 1}}, {{1, 0}, {2, 0}, {1, 1}, {1, 2}}, {{0, 1}, {1, 1}, {2, 1}, {2, 2}}, {{1, 0}, {1, 1}, {0, 2}, {1, 2}}},
  // L
  {{{2, 0}, {0, 1}, {1, 1}, {2, 1}}, {{1, 0}, {1, 1}, {1, 2}, {2, 2}}, {{0, 1}, {1, 1}, {2, 1}, {0, 2}}, {{0, 0}, {1, 0}, {1, 1}, {1, 2}}},
};

[[nodiscard]] constexpr int pieceIndex(Piece piece) {
  return static_cast<int>(piece);
}

[[nodiscard]] char pieceChar(Piece piece) {
  constexpr std::array<char, 7> names = {'I', 'O', 'T', 'S', 'Z', 'J', 'L'};
  return names.at(pieceIndex(piece));
}

[[nodiscard]] Piece parsePiece(char value) {
  switch (value) {
    case 'I': return Piece::I;
    case 'O': return Piece::O;
    case 'T': return Piece::T;
    case 'S': return Piece::S;
    case 'Z': return Piece::Z;
    case 'J': return Piece::J;
    case 'L': return Piece::L;
    default: throw std::runtime_error("Unknown tetromino in endgame source.");
  }
}

[[nodiscard]] Pose spawnPose(Piece type) {
  return Pose{type, 0, type == Piece::O ? 4 : 3, 19};
}

[[nodiscard]] std::array<Point, 4> absoluteCells(const Pose& pose) {
  std::array<Point, 4> cells{};
  const auto& local = kShapes[pieceIndex(pose.type)][pose.rotation];
  for (int index = 0; index < 4; ++index) cells.at(index) = {pose.x + local[index].x, pose.y + local[index].y};
  return cells;
}

[[nodiscard]] bool canPlace(const PackedBoard& board, const Pose& pose) {
  for (const Point cell : absoluteCells(pose)) {
    if (cell.x < 0 || cell.x >= kWidth || cell.y < 0 || cell.y >= kHeight) return false;
    const std::uint16_t bit = static_cast<std::uint16_t>(1u << cell.x);
    if ((board.normal.at(cell.y) | board.anchors.at(cell.y)) & bit) return false;
  }
  return true;
}

struct KickSet {
  std::array<Point, 5> points{};
  int count = 0;
};

[[nodiscard]] KickSet kickTests(Piece type, int from, int to) {
  if (type == Piece::O) return {{{{0, 0}}}, 1};
  const int key = from * 4 + to;
  if (type == Piece::I) {
    switch (key) {
      case 1:  return {{{{0, 0}, {-2, 0}, {1, 0}, {-2, 1}, {1, -2}}}, 5};
      case 4:  return {{{{0, 0}, {2, 0}, {-1, 0}, {2, -1}, {-1, 2}}}, 5};
      case 6:  return {{{{0, 0}, {-1, 0}, {2, 0}, {-1, -2}, {2, 1}}}, 5};
      case 9:  return {{{{0, 0}, {1, 0}, {-2, 0}, {1, 2}, {-2, -1}}}, 5};
      case 11: return {{{{0, 0}, {2, 0}, {-1, 0}, {2, -1}, {-1, 2}}}, 5};
      case 14: return {{{{0, 0}, {-2, 0}, {1, 0}, {-2, 1}, {1, -2}}}, 5};
      case 12: return {{{{0, 0}, {-1, 0}, {2, 0}, {-1, -2}, {2, 1}}}, 5};
      case 3:  return {{{{0, 0}, {1, 0}, {-2, 0}, {1, 2}, {-2, -1}}}, 5};
      default:  return {{{{0, 0}}}, 1};
    }
  }
  switch (key) {
    case 1:  return {{{{0, 0}, {-1, 0}, {-1, -1}, {0, 2}, {-1, 2}}}, 5};
    case 4:  return {{{{0, 0}, {1, 0}, {1, 1}, {0, -2}, {1, -2}}}, 5};
    case 6:  return {{{{0, 0}, {1, 0}, {1, 1}, {0, -2}, {1, -2}}}, 5};
    case 9:  return {{{{0, 0}, {-1, 0}, {-1, -1}, {0, 2}, {-1, 2}}}, 5};
    case 11: return {{{{0, 0}, {1, 0}, {1, -1}, {0, 2}, {1, 2}}}, 5};
    case 14: return {{{{0, 0}, {-1, 0}, {-1, 1}, {0, -2}, {-1, -2}}}, 5};
    case 12: return {{{{0, 0}, {-1, 0}, {-1, 1}, {0, -2}, {-1, -2}}}, 5};
    case 3:  return {{{{0, 0}, {1, 0}, {1, -1}, {0, 2}, {1, 2}}}, 5};
    default:  return {{{{0, 0}}}, 1};
  }
}

[[nodiscard]] std::optional<Pose> rotate(const PackedBoard& board, const Pose& source, int direction) {
  const int target = (source.rotation + direction + 4) % 4;
  const KickSet kicks = kickTests(source.type, source.rotation, target);
  for (int index = 0; index < kicks.count; ++index) {
    const Point kick = kicks.points.at(index);
    const Pose candidate{source.type, target, source.x + kick.x, source.y + kick.y};
    if (canPlace(board, candidate)) return candidate;
  }
  return std::nullopt;
}

[[nodiscard]] std::optional<Pose> move(const PackedBoard& board, const Pose& source, int deltaX) {
  const Pose candidate{source.type, source.rotation, source.x + deltaX, source.y};
  return canPlace(board, candidate) ? std::optional<Pose>(candidate) : std::nullopt;
}

[[nodiscard]] Pose hardDrop(const PackedBoard& board, Pose pose) {
  while (canPlace(board, Pose{pose.type, pose.rotation, pose.x, pose.y + 1})) ++pose.y;
  return pose;
}

[[nodiscard]] std::uint32_t nextSeed(std::uint32_t seed) {
  std::uint32_t value = seed == 0 ? 0x6d2b79f5u : seed;
  value ^= value << 13u;
  value ^= value >> 17u;
  value ^= value << 5u;
  return value;
}

[[nodiscard]] std::vector<Piece> sevenBagSequence(std::uint32_t seed, int count) {
  std::vector<Piece> result;
  result.reserve(static_cast<std::size_t>(count));
  std::uint32_t state = seed == 0 ? 0x6d2b79f5u : seed;
  std::vector<Piece> bag;
  while (static_cast<int>(result.size()) < count) {
    if (bag.empty()) {
      bag = {Piece::I, Piece::O, Piece::T, Piece::S, Piece::Z, Piece::J, Piece::L};
      for (int index = static_cast<int>(bag.size()) - 1; index > 0; --index) {
        state = nextSeed(state);
        const int swapIndex = static_cast<int>(state % static_cast<std::uint32_t>(index + 1));
        std::swap(bag.at(index), bag.at(swapIndex));
      }
    }
    result.push_back(bag.front());
    bag.erase(bag.begin());
  }
  return result;
}

[[nodiscard]] bool bitAt(const std::array<std::uint16_t, kHeight>& rows, int x, int y) {
  return (rows.at(y) & static_cast<std::uint16_t>(1u << x)) != 0;
}

[[nodiscard]] int popcountRows(const std::array<std::uint16_t, kHeight>& rows) {
  int result = 0;
  for (const std::uint16_t row : rows) result += std::popcount(row);
  return result;
}

[[nodiscard]] int nearestAnchorBelow(const PackedBoard& board, int x, int y) {
  const std::uint16_t bit = static_cast<std::uint16_t>(1u << x);
  for (int nextY = y + 1; nextY < kHeight; ++nextY) {
    if (board.anchors.at(nextY) & bit) return nextY;
  }
  return kHeight;
}

/** Exactly mirrors board.ts clearRows + mapCellsAfterClear using packed layers. */
[[nodiscard]] std::optional<PackedBoard> resolveLineClears(const PackedBoard& source, const std::array<bool, kHeight>& removed) {
  PackedBoard settled;
  settled.anchors = source.anchors; // anchors are coordinate-pinned.

  for (int y = 0; y < kHeight; ++y) {
    for (int x = 0; x < kWidth; ++x) {
      const std::uint16_t bit = static_cast<std::uint16_t>(1u << x);
      if (!(source.normal.at(y) & bit) || removed.at(y)) continue;
      const int floor = nearestAnchorBelow(source, x, y);
      int destination = y;
      for (int cleared = y + 1; cleared < floor; ++cleared) {
        if (removed.at(cleared)) ++destination;
      }
      if ((settled.normal.at(destination) | settled.anchors.at(destination)) & bit) return std::nullopt;
      settled.normal.at(destination) |= bit;
    }
  }

  for (int y = 0; y < kHeight; ++y) {
    for (int x = 0; x < kWidth; ++x) {
      const std::uint16_t bit = static_cast<std::uint16_t>(1u << x);
      if (!(source.targets.at(y) & bit) || removed.at(y)) continue;
      const int floor = nearestAnchorBelow(source, x, y);
      int destination = y;
      for (int cleared = y + 1; cleared < floor; ++cleared) {
        if (removed.at(cleared)) ++destination;
      }
      settled.targets.at(destination) |= bit;
    }
  }

  for (int y = 0; y < kHeight; ++y) {
    if ((settled.targets.at(y) & ~settled.normal.at(y)) != 0) return std::nullopt;
  }
  return settled;
}

/**
 * Resolves a lock and its Core entry/line-clear delay.  Unless all original
 * targets are now gone, the exact next seven-bag piece must also be able to
 * spawn after that delay; otherwise dispatch() would already be game-over.
 */
[[nodiscard]] Transition applyMacro(const PackedBoard& source, Macro macro, std::optional<Piece> nextPiece) {
  PackedBoard board = source;
  const Pose landing{macro.piece, macro.preDropRotation, macro.preDropX, macro.landingY};
  const std::array<Point, 4> cells = absoluteCells(landing);
  bool allInHiddenBuffer = true;
  for (const Point cell : cells) {
    if (cell.x < 0 || cell.x >= kWidth || cell.y < 0 || cell.y >= kHeight) return {};
    const std::uint16_t bit = static_cast<std::uint16_t>(1u << cell.x);
    if ((board.normal.at(cell.y) | board.anchors.at(cell.y)) & bit) return {};
    board.normal.at(cell.y) |= bit;
    allInHiddenBuffer = allInHiddenBuffer && cell.y < kVisibleStart;
  }

  std::array<bool, kHeight> removed{};
  for (int y = 0; y < kHeight; ++y) {
    if ((board.normal.at(y) | board.anchors.at(y)) == kFullRow) {
      removed.at(y) = true;
      if (macro.clearedRowCount >= static_cast<int>(macro.clearedRows.size())) return {};
      macro.clearedRows.at(macro.clearedRowCount++) = y;
    }
  }
  if (allInHiddenBuffer && macro.clearedRowCount == 0) return {}; // Core lock-out.

  if (macro.clearedRowCount > 0) {
    const auto settled = resolveLineClears(board, removed);
    if (!settled) return {};
    board = *settled;
    macro.settleTicks = kLineClearDelayTicks;
  } else {
    macro.settleTicks = kEntryDelayTicks;
  }
  if (popcountRows(board.targets) != 0 && (!nextPiece || !canPlace(board, spawnPose(*nextPiece)))) return {};
  return {true, board, macro};
}

struct PoseKey {
  int rotation = 0;
  int x = 0;
  int y = 0;
  bool operator==(const PoseKey&) const = default;
};

struct PoseKeyHash {
  std::size_t operator()(const PoseKey& key) const noexcept {
    return static_cast<std::size_t>((key.rotation + 7) * 131 * 131 + (key.x + 16) * 131 + (key.y + 16));
  }
};

struct MacroSearchPose {
  Pose pose{};
  std::array<CommandKind, kMaxPreDropCommands> commands{};
  int commandCount = 0;
};

[[nodiscard]] std::vector<Macro> legalMacros(const PackedBoard& board, Piece piece, bool fullInput) {
  const Pose start = spawnPose(piece);
  if (!canPlace(board, start)) return {};

  std::queue<MacroSearchPose> pending;
  pending.push({start, {}, 0});
  std::unordered_set<PoseKey, PoseKeyHash> seen;
  seen.insert({start.rotation, start.x, start.y});
  std::vector<Macro> macros;

  // Deterministic order makes both the candidate route and its JSON repeatable.
  constexpr std::array<CommandKind, 5> fullExpansionOrder = {
    CommandKind::rotate_cw, CommandKind::rotate_ccw, CommandKind::move_left, CommandKind::move_right,
    CommandKind::soft_drop,
  };
  while (!pending.empty()) {
    const MacroSearchPose current = pending.front();
    pending.pop();
    const Pose landed = hardDrop(board, current.pose);
    Macro macro;
    macro.piece = piece;
    macro.commands = current.commands;
    macro.commandCount = current.commandCount;
    macro.preDropRotation = current.pose.rotation;
    macro.preDropX = current.pose.x;
    macro.preDropY = current.pose.y;
    macro.landingY = landed.y;
    macros.push_back(macro);

    if (current.commandCount >= kMaxPreDropCommands) continue;
    const int commandKinds = fullInput ? static_cast<int>(fullExpansionOrder.size()) : 4;
    for (int commandIndex = 0; commandIndex < commandKinds; ++commandIndex) {
      const CommandKind command = fullExpansionOrder.at(commandIndex);
      std::optional<Pose> next;
      switch (command) {
        case CommandKind::rotate_cw: next = rotate(board, current.pose, 1); break;
        case CommandKind::rotate_ccw: next = rotate(board, current.pose, -1); break;
        case CommandKind::move_left: next = move(board, current.pose, -1); break;
        case CommandKind::move_right: next = move(board, current.pose, 1); break;
        case CommandKind::soft_drop: {
          const Pose candidate{current.pose.type, current.pose.rotation, current.pose.x, current.pose.y + 1};
          if (canPlace(board, candidate)) next = candidate;
          break;
        }
      }
      if (!next) continue;
      const PoseKey key{next->rotation, next->x, next->y};
      if (!seen.insert(key).second) continue;
      MacroSearchPose extended = current;
      extended.pose = *next;
      extended.commands.at(extended.commandCount++) = command;
      pending.push(extended);
    }
  }
  return macros;
}

struct BoardKey {
  std::array<std::uint16_t, kHeight> normal{};
  std::array<std::uint16_t, kHeight> targets{};
  bool operator==(const BoardKey&) const = default;
};

struct BoardKeyHash {
  std::size_t operator()(const BoardKey& key) const noexcept {
    std::uint64_t hash = 1469598103934665603ull;
    const auto feed = [&hash](std::uint16_t value) {
      hash ^= value;
      hash *= 1099511628211ull;
    };
    for (const auto row : key.normal) feed(row);
    for (const auto row : key.targets) feed(row);
    return static_cast<std::size_t>(hash ^ (hash >> 32u));
  }
};

[[nodiscard]] BoardKey boardKey(const PackedBoard& board) {
  return {board.normal, board.targets}; // anchors are level-invariant.
}

[[nodiscard]] int countBuriedHoles(const PackedBoard& board) {
  int holes = 0;
  for (int x = 0; x < kWidth; ++x) {
    bool seenBlock = false;
    const std::uint16_t bit = static_cast<std::uint16_t>(1u << x);
    for (int y = 0; y < kHeight; ++y) {
      const bool occupied = ((board.normal.at(y) | board.anchors.at(y)) & bit) != 0;
      if (occupied) seenBlock = true;
      else if (seenBlock) ++holes;
    }
  }
  return holes;
}

/** Lower is better. Target removal dominates, then row completion and stack hygiene. */
[[nodiscard]] long long heuristic(const PackedBoard& board) {
  const int targets = popcountRows(board.targets);
  int rowCompletionReward = 0;
  int aggregateHeight = 0;
  int bumpiness = 0;
  std::array<int, kWidth> heights{};
  for (int y = 0; y < kHeight; ++y) {
    const int fill = std::popcount(static_cast<std::uint16_t>(board.normal.at(y) | board.anchors.at(y)));
    if (fill >= 6) rowCompletionReward += fill * fill * fill;
  }
  for (int x = 0; x < kWidth; ++x) {
    const std::uint16_t bit = static_cast<std::uint16_t>(1u << x);
    int height = 0;
    for (int y = 0; y < kHeight; ++y) {
      if ((board.normal.at(y) | board.anchors.at(y)) & bit) {
        height = kHeight - y;
        break;
      }
    }
    heights.at(x) = height;
    aggregateHeight += height;
  }
  for (int x = 1; x < kWidth; ++x) bumpiness += std::abs(heights.at(x) - heights.at(x - 1));
  return static_cast<long long>(targets) * 1'000'000LL
    + static_cast<long long>(countBuriedHoles(board)) * 2'000LL
    + static_cast<long long>(aggregateHeight) * 40LL
    + static_cast<long long>(bumpiness) * 80LL
    - static_cast<long long>(rowCompletionReward) * 30LL;
}

[[nodiscard]] bool hasNoTargets(const PackedBoard& board) {
  return popcountRows(board.targets) == 0;
}

[[nodiscard]] std::vector<Macro> reconstructRoute(const std::vector<Node>& arena, int index) {
  std::vector<Macro> route;
  for (int cursor = index; cursor >= 0 && arena.at(cursor).parent >= 0; cursor = arena.at(cursor).parent) {
    route.push_back(arena.at(cursor).macro);
  }
  std::reverse(route.begin(), route.end());
  return route;
}

[[nodiscard]] SearchResult solve(const Level& level, int beamWidth, int maxLocks, bool fullInput) {
  if (beamWidth <= 0 || maxLocks <= 0) throw std::runtime_error("Beam width and maximum locks must be positive.");
  SearchResult result;
  // One look-ahead is needed to validate Core's post-lock spawn outcome.
  std::vector<Piece> queue = sevenBagSequence(level.seed, maxLocks + 1);
  std::vector<Node> arena;
  arena.reserve(static_cast<std::size_t>(beamWidth) * static_cast<std::size_t>(maxLocks + 1));
  arena.push_back({level.initial, 0, -1, {}, heuristic(level.initial)});
  std::vector<int> beam = {0};
  if (hasNoTargets(level.initial)) {
    result.solved = true;
    result.finalBoard = level.initial;
    return result;
  }

  int bestIndex = 0;
  for (int depth = 0; depth < maxLocks; ++depth) {
    std::unordered_map<BoardKey, Candidate, BoardKeyHash> deduplicated;
    const Piece piece = queue.at(depth);
    for (const int parentIndex : beam) {
      const Node& parent = arena.at(parentIndex);
      const std::vector<Macro> macros = legalMacros(parent.board, piece, fullInput);
      for (Macro macro : macros) {
        const Transition transition = applyMacro(parent.board, macro, queue.at(depth + 1));
        if (!transition.valid) continue;
        ++result.expanded;
        Candidate candidate{transition.board, parentIndex, transition.macro, depth + 1, heuristic(transition.board)};
        const BoardKey key = boardKey(candidate.board);
        const auto existing = deduplicated.find(key);
        if (existing == deduplicated.end() || candidate.heuristic < existing->second.heuristic) {
          deduplicated.insert_or_assign(key, candidate);
        }
      }
    }
    if (deduplicated.empty()) break;

    std::vector<Candidate> candidates;
    candidates.reserve(deduplicated.size());
    for (auto& [_, candidate] : deduplicated) candidates.push_back(std::move(candidate));
    std::sort(candidates.begin(), candidates.end(), [](const Candidate& left, const Candidate& right) {
      if (left.heuristic != right.heuristic) return left.heuristic < right.heuristic;
      if (left.macro.clearedRowCount != right.macro.clearedRowCount) return left.macro.clearedRowCount > right.macro.clearedRowCount;
      if (left.macro.preDropX != right.macro.preDropX) return left.macro.preDropX < right.macro.preDropX;
      return left.macro.preDropRotation < right.macro.preDropRotation;
    });

    beam.clear();
    const int retained = std::min<int>(beamWidth, static_cast<int>(candidates.size()));
    for (int index = 0; index < retained; ++index) {
      Candidate& candidate = candidates.at(index);
      const int nodeIndex = static_cast<int>(arena.size());
      arena.push_back({candidate.board, candidate.depth, candidate.parent, candidate.macro, candidate.heuristic});
      beam.push_back(nodeIndex);
      ++result.retained;
      if (arena.at(nodeIndex).heuristic < arena.at(bestIndex).heuristic) bestIndex = nodeIndex;
      if (hasNoTargets(arena.at(nodeIndex).board)) {
        result.solved = true;
        result.locks = arena.at(nodeIndex).depth;
        result.route = reconstructRoute(arena, nodeIndex);
        result.finalBoard = arena.at(nodeIndex).board;
        result.finalHeuristic = arena.at(nodeIndex).heuristic;
        return result; // a beam upper bound at this depth, never a proof of optimality.
      }
    }
  }
  result.locks = arena.at(bestIndex).depth;
  result.route = reconstructRoute(arena, bestIndex);
  result.finalBoard = arena.at(bestIndex).board;
  result.finalHeuristic = arena.at(bestIndex).heuristic;
  return result;
}

[[nodiscard]] std::string readUtf8(const std::filesystem::path& path) {
  std::ifstream input(path, std::ios::binary);
  if (!input) throw std::runtime_error("Cannot open endgame source: " + path.string());
  std::ostringstream buffer;
  buffer << input.rdbuf();
  return buffer.str();
}

void skipSpace(const std::string& text, std::size_t& cursor) {
  while (cursor < text.size() && std::isspace(static_cast<unsigned char>(text.at(cursor)))) ++cursor;
}

[[nodiscard]] std::string parseQuoted(const std::string& text, std::size_t& cursor) {
  skipSpace(text, cursor);
  if (cursor >= text.size() || text.at(cursor) != '\'') throw std::runtime_error("Expected a single-quoted source string.");
  ++cursor;
  std::string value;
  while (cursor < text.size() && text.at(cursor) != '\'') {
    if (text.at(cursor) == '\\' && cursor + 1 < text.size()) ++cursor;
    value.push_back(text.at(cursor++));
  }
  if (cursor >= text.size()) throw std::runtime_error("Unterminated source string.");
  ++cursor;
  return value;
}

void consumeComma(const std::string& text, std::size_t& cursor) {
  skipSpace(text, cursor);
  if (cursor >= text.size() || text.at(cursor) != ',') throw std::runtime_error("Expected a source comma.");
  ++cursor;
}

[[nodiscard]] std::uint32_t parseUnsigned(const std::string& text, std::size_t& cursor) {
  skipSpace(text, cursor);
  const std::size_t start = cursor;
  if (cursor + 2 <= text.size() && text.compare(cursor, 2, "0x") == 0) {
    cursor += 2;
    while (cursor < text.size() && std::isxdigit(static_cast<unsigned char>(text.at(cursor)))) ++cursor;
  } else {
    while (cursor < text.size() && std::isdigit(static_cast<unsigned char>(text.at(cursor)))) ++cursor;
  }
  if (start == cursor) throw std::runtime_error("Expected an unsigned source integer.");
  return static_cast<std::uint32_t>(std::stoull(text.substr(start, cursor - start), nullptr, 0));
}

[[nodiscard]] std::size_t matchingDelimiter(const std::string& text, std::size_t open, char left, char right) {
  if (open >= text.size() || text.at(open) != left) throw std::runtime_error("Malformed delimiter request.");
  int depth = 0;
  bool inQuote = false;
  for (std::size_t cursor = open; cursor < text.size(); ++cursor) {
    const char value = text.at(cursor);
    if (inQuote) {
      if (value == '\\') {
        ++cursor;
      } else if (value == '\'') {
        inQuote = false;
      }
      continue;
    }
    if (value == '\'') {
      inQuote = true;
      continue;
    }
    if (value == left) ++depth;
    if (value == right && --depth == 0) return cursor;
  }
  throw std::runtime_error("Unbalanced endgame source delimiters.");
}

[[nodiscard]] std::unordered_map<std::string, AnchorOverlay> parseAnchorOverlays(const std::string& source) {
  std::unordered_map<std::string, AnchorOverlay> overlays;
  const std::size_t begin = source.find("const ANCHOR_OVERLAYS");
  if (begin == std::string::npos) throw std::runtime_error("Endgame source does not define ANCHOR_OVERLAYS.");
  const std::size_t end = source.find("});", begin);
  if (end == std::string::npos) throw std::runtime_error("Malformed ANCHOR_OVERLAYS source block.");
  const std::string block = source.substr(begin, end - begin);
  const std::regex overlayPattern(R"('([^']+)'\s*:\s*\{\s*seed:\s*(0x[0-9a-fA-F]+|[0-9]+)\s*,\s*count:\s*([0-9]+)\s*\})");
  for (std::sregex_iterator it(block.begin(), block.end(), overlayPattern), done; it != done; ++it) {
    overlays.emplace((*it)[1].str(), AnchorOverlay{
      static_cast<std::uint32_t>(std::stoull((*it)[2].str(), nullptr, 0)),
      std::stoi((*it)[3].str()),
    });
  }
  return overlays;
}

[[nodiscard]] std::vector<Level> parseLevels(const std::string& source) {
  const auto overlays = parseAnchorOverlays(source);
  const std::regex placementPattern(R"(\{\s*type:\s*'([IOTSZJL])'\s*,\s*rotation:\s*([0-3])\s*,\s*x:\s*(-?[0-9]+)\s*\})");
  std::vector<Level> levels;
  std::size_t search = 0;
  while (true) {
    const std::size_t found = source.find("definition('", search);
    if (found == std::string::npos) break;
    std::size_t cursor = found + std::string_view("definition(").size();
    Level level;
    level.id = parseQuoted(source, cursor);
    consumeComma(source, cursor);
    (void)parseQuoted(source, cursor); // display name is intentionally not solver input.
    consumeComma(source, cursor);
    level.seed = parseUnsigned(source, cursor);
    const std::size_t setupStart = source.find("setup(", cursor);
    if (setupStart == std::string::npos) throw std::runtime_error("Endgame definition is missing setup().");
    const std::size_t setupEnd = matchingDelimiter(source, setupStart + std::string_view("setup").size(), '(', ')');
    const std::string setupText = source.substr(setupStart, setupEnd - setupStart + 1);
    for (std::sregex_iterator it(setupText.begin(), setupText.end(), placementPattern), done; it != done; ++it) {
      level.setup.push_back({parsePiece((*it)[1].str().at(0)), std::stoi((*it)[2].str()), std::stoi((*it)[3].str())});
    }
    if (level.setup.empty()) throw std::runtime_error("Endgame " + level.id + " has no setup placements.");
    const auto overlay = overlays.find(level.id);
    if (overlay != overlays.end()) level.overlay = overlay->second;
    levels.push_back(std::move(level));
    search = setupEnd + 1;
  }
  if (levels.size() != 20) {
    throw std::runtime_error("Expected exactly 20 current Endgame definitions; parsed " + std::to_string(levels.size()) + ".");
  }
  return levels;
}

void setInitialBoard(Level& level) {
  PackedBoard board;
  for (const SetupPlacement& placement : level.setup) {
    Pose pose{placement.type, placement.rotation, placement.x, 19};
    if (!canPlace(board, pose)) throw std::runtime_error("Setup cannot spawn for " + level.id + ".");
    pose = hardDrop(board, pose);
    for (const Point cell : absoluteCells(pose)) {
      if (cell.y < kVisibleStart) throw std::runtime_error("Setup enters hidden buffer for " + level.id + ".");
      board.normal.at(cell.y) |= static_cast<std::uint16_t>(1u << cell.x);
    }
  }
  board.targets = board.normal;
  if (level.overlay) {
    std::vector<int> emptyVisibleRows;
    for (int visibleY = 3; visibleY < 20; ++visibleY) {
      if (board.normal.at(kVisibleStart + visibleY) == 0) emptyVisibleRows.push_back(visibleY);
    }
    if (emptyVisibleRows.empty()) throw std::runtime_error("No permitted anchor row for " + level.id + ".");
    std::uint32_t state = level.overlay->seed;
    int placed = 0;
    while (placed < level.overlay->count) {
      state = nextSeed(state);
      const int x = static_cast<int>(state % kWidth);
      const int visibleY = emptyVisibleRows.at((state >> 12u) % emptyVisibleRows.size());
      const int y = kVisibleStart + visibleY;
      const std::uint16_t bit = static_cast<std::uint16_t>(1u << x);
      if (board.anchors.at(y) & bit) continue;
      board.anchors.at(y) |= bit;
      ++placed;
    }
  }
  level.initial = board;
}

[[nodiscard]] std::uint64_t digest(const PackedBoard& board) {
  std::uint64_t hash = 1469598103934665603ull;
  const auto feed = [&hash](std::uint16_t value) {
    hash ^= value;
    hash *= 1099511628211ull;
  };
  for (const auto row : board.normal) feed(row);
  for (const auto row : board.targets) feed(row);
  for (const auto row : board.anchors) feed(row);
  return hash;
}

[[nodiscard]] std::string commandJson(CommandKind command) {
  switch (command) {
    case CommandKind::move_left: return R"({"type":"move","dx":-1})";
    case CommandKind::move_right: return R"({"type":"move","dx":1})";
    case CommandKind::rotate_cw: return R"({"type":"rotate","direction":1})";
    case CommandKind::rotate_ccw: return R"({"type":"rotate","direction":-1})";
    case CommandKind::soft_drop: return R"({"type":"soft-drop"})";
  }
  throw std::runtime_error("Unknown command kind.");
}

void writeResultJson(std::ostream& output, const Level& level, const SearchResult& result, int beamWidth, int maxLocks, bool fullInput) {
  output << "{\n";
  output << "  \"schema\": \"tetra-endgame-beam-route/v1\",\n";
  output << "  \"solver\": {\"kind\": \"deterministic-beam\", \"claim\": \"heuristic upper bound only; global optimality is not proven\", \"beamWidth\": " << beamWidth << ", \"maxLocks\": " << maxLocks << ", \"fullInput\": " << (fullInput ? "true" : "false") << "},\n";
  output << "  \"replayProtocol\": {\"initialCommand\": {\"type\": \"start\"}, \"afterEachMacro\": \"dispatch settleTicks copies of {type: tick} before the next macro\", \"domain\": \"" << (fullInput ? "spawn plus legal rotate/move/soft-drop closure, then hard-drop" : "spawn, legal rotate/move commands, then hard-drop") << "\"},\n";
  output << "  \"level\": {\"id\": \"" << level.id << "\", \"seed\": " << level.seed << ", \"initialTargetCells\": " << popcountRows(level.initial.targets) << ", \"anchors\": [";
  bool firstAnchor = true;
  for (int y = 0; y < kHeight; ++y) for (int x = 0; x < kWidth; ++x) {
    if (!bitAt(level.initial.anchors, x, y)) continue;
    if (!firstAnchor) output << ", ";
    output << "{\"x\":" << x << ",\"y\":" << y << "}";
    firstAnchor = false;
  }
  output << "]},\n";
  output << "  \"result\": {\"status\": \"" << (result.solved ? "solved" : "candidate-not-solved") << "\", \"heuristicUpperBoundLocks\": ";
  if (result.solved) output << result.locks;
  else output << "null";
  output << ", \"candidateLocks\": " << result.locks
    << ", \"targetsRemaining\": " << popcountRows(result.finalBoard.targets)
    << ", \"expanded\": " << result.expanded
    << ", \"retained\": " << result.retained
    << ", \"finalDigest\": \"0x" << std::hex << digest(result.finalBoard) << std::dec << "\"},\n";
  output << "  \"route\": [\n";
  for (std::size_t index = 0; index < result.route.size(); ++index) {
    const Macro& macro = result.route.at(index);
    output << "    {\"lock\": " << index + 1 << ", \"piece\": \"" << pieceChar(macro.piece) << "\", \"macro\": [";
    bool firstCommand = true;
    for (int commandIndex = 0; commandIndex < macro.commandCount; ++commandIndex) {
      if (!firstCommand) output << ", ";
      output << commandJson(macro.commands.at(commandIndex));
      firstCommand = false;
    }
    if (!firstCommand) output << ", ";
    output << R"({"type":"hard-drop"})";
    output << "], \"settleTicks\": " << macro.settleTicks
      << ", \"preDropPose\": {\"rotation\": " << macro.preDropRotation << ", \"x\": " << macro.preDropX << ", \"y\": " << macro.preDropY << "}"
      << ", \"landingY\": " << macro.landingY
      << ", \"clearedRows\": [";
    for (int row = 0; row < macro.clearedRowCount; ++row) {
      if (row > 0) output << ", ";
      output << macro.clearedRows.at(row);
    }
    output << "]}" << (index + 1 == result.route.size() ? "\n" : ",\n");
  }
  output << "  ],\n";
  output << "  \"publicCommandStream\": [{\"type\":\"start\"}";
  for (const Macro& macro : result.route) {
    for (int commandIndex = 0; commandIndex < macro.commandCount; ++commandIndex) output << ", " << commandJson(macro.commands.at(commandIndex));
    output << R"(, {"type":"hard-drop"})";
    for (int tick = 0; tick < macro.settleTicks; ++tick) output << R"(, {"type":"tick"})";
  }
  output << "]\n";
  output << "}\n";
}

[[nodiscard]] Options parseOptions(int argc, char** argv) {
  Options options;
  for (int index = 1; index < argc; ++index) {
    const std::string_view argument = argv[index];
    const auto requireValue = [&]() -> std::string {
      if (index + 1 >= argc) throw std::runtime_error("Missing value for " + std::string(argument));
      return argv[++index];
    };
    if (argument == "--source") options.source = requireValue();
    else if (argument == "--level") options.levelId = requireValue();
    else if (argument == "--beam") options.beamWidth = std::stoi(requireValue());
    else if (argument == "--max-locks") options.maxLocks = std::stoi(requireValue());
    else if (argument == "--full-input") options.fullInput = true;
    else if (argument == "--out") options.output = requireValue();
    else if (argument == "--help" || argument == "-h") {
      std::cout << "Usage: solve-endgame-campaign [--source path] [--level id] [--beam N] [--max-locks N] [--full-input] [--out path]\n";
      std::exit(0);
    } else {
      throw std::runtime_error("Unknown option: " + std::string(argument));
    }
  }
  return options;
}

int run(int argc, char** argv) {
  const Options options = parseOptions(argc, argv);
  std::vector<Level> levels = parseLevels(readUtf8(options.source));
  for (Level& level : levels) setInitialBoard(level);

  std::vector<Level> selected;
  if (options.levelId) {
    const auto found = std::find_if(levels.begin(), levels.end(), [&](const Level& level) { return level.id == *options.levelId; });
    if (found == levels.end()) throw std::runtime_error("Unknown level id: " + *options.levelId);
    selected.push_back(*found);
  } else {
    selected = levels;
  }

  std::ostringstream json;
  if (selected.size() == 1) {
    const SearchResult result = solve(selected.front(), options.beamWidth, options.maxLocks, options.fullInput);
    writeResultJson(json, selected.front(), result, options.beamWidth, options.maxLocks, options.fullInput);
    std::cerr << selected.front().id << ": " << (result.solved ? "candidate upper bound " : "no candidate within limits; best depth ")
      << result.locks << " locks, " << popcountRows(result.finalBoard.targets) << " targets remaining, "
      << result.expanded << " expanded states\n";
  } else {
    json << "[\n";
    for (std::size_t index = 0; index < selected.size(); ++index) {
      const SearchResult result = solve(selected.at(index), options.beamWidth, options.maxLocks, options.fullInput);
      std::ostringstream one;
      writeResultJson(one, selected.at(index), result, options.beamWidth, options.maxLocks, options.fullInput);
      json << one.str() << (index + 1 == selected.size() ? "" : ",") << "\n";
      std::cerr << selected.at(index).id << ": " << (result.solved ? "candidate upper bound " : "no candidate within limits; best depth ")
        << result.locks << " locks, " << popcountRows(result.finalBoard.targets) << " targets remaining, "
        << result.expanded << " expanded states\n";
    }
    json << "]\n";
  }

  if (options.output) {
    std::ofstream file(*options.output, std::ios::binary);
    if (!file) throw std::runtime_error("Cannot write output: " + options.output->string());
    file << json.str();
  } else {
    std::cout << json.str();
  }
  return 0;
}

} // namespace tetra::endgame_solver

int main(int argc, char** argv) {
  try {
    return tetra::endgame_solver::run(argc, argv);
  } catch (const std::exception& error) {
    std::cerr << "solve-endgame-campaign: " << error.what() << "\n";
    return 1;
  }
}
