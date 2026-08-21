# Survival 优化方案（独立审计与实施合同草案）

> **AUDIT ONLY / NOT IMPLEMENTED / NO PRODUCT ACCEPTANCE CLAIM**
>
> 本文只记录当前实现审计、缺陷复现逻辑、建议设计、测试计划和最终验收门槛。
> 它没有修改 Core、Renderer、React、音频、样式、存储或测试代码，也不表示任何产品结果已经通过。

- 审计日期：2026-08-17（Asia/Shanghai）
- 审计基线：`27d1fff0d0540f584fc33ada77dc83705579eed6`
- 产品边界：Core 继续保持确定性、renderer-independent；React 继续拥有页面和生命周期；PixiJS 继续独占棋盘与效果。
- 本轮唯一产物：本文档。

## 1. 结论与优先级

| 级别 | 结论 | 建议动作 |
| --- | --- | --- |
| **P0** | 当前 clear → pending rise → reward lower → conditional overflow 的顺序会先真实执行 Aftershock `+2`，再执行奖励 `-1`。净升一行原本合法时，第二次上推仍会删除旧顶层下一行；奖励下降无法恢复它，而且只要跨过奖励阈值，已发生的 overflow 还会被忽略。 | 把同一锁定结算中的自然压力与清行奖励合并成一次原子 pressure settlement；先算最终净位移，再检查并提交一次棋盘/活动方块/落石映射。 |
| **P1** | HUD、Renderer 和无障碍播报只知道“升/降”和最终高度，不知道普通压力、Aftershock、奖励抵消及最终净变化之间的因果；触摸手势只有释放时的一次性结果，没有方向锁定反馈或完整取消测试。 | 由一个 Core 因果事件驱动视觉、低惊扰音频、HUD、live region 和触摸反馈，保留四格 Survival 信息结构及 reduced-motion 语义。 |
| **P1** | leaderboard v9 把读取失败、键不存在、格式损坏都折叠成空榜；迁移写入和结算写入的布尔失败被忽略，UI 仍把内存结果表现成已保存记录。 | 使用三态读取与可辨识解析结果；只在 current key 确认 missing 时迁移；写入失败时明确进入 session-only 状态，禁止伪称持久化成功。 |
| **P2** | Survival 难度规则分散在常量、按行数计算的墙压函数和 Engine 内落石间隔更新中；已有 32-seed 形态覆盖，但没有冻结的 128-seed 纵向压力模拟。 | 先等价抽取纯 `survivalDifficultyPlan()`，再以 128 个冻结种子和固定策略跑基线/候选对照；模拟只作为回归与调参证据，不替代玩家验收。 |

既有产品方向仍有效：三行开局、13→6 秒墙压、每三行奖励、独立落石、四格 HUD 和 Survival 榜单字段都已记录为既有合同（`docs/DESIGN.md:4344-4382`；`docs/CURRENT_TASK.md:6884-6924`）。T23 又规定每第四次自然墙升为两行 Aftershock，且清除基岩不能抹掉累计周期（`docs/DESIGN.md:2998-3006`）。本提案修复结算语义并提高可读性，不擅自改掉这些规则。

## 2. P0：原子 pressure settlement

### 2.1 当前缺陷的代码证据

1. `raiseBedrock()` 每次循环先检查当前第 0 行，再无条件用 `slice(1)` 丢弃它并在底部加入基岩（`src/game/core/board.ts:120-133`）。它返回 `overflow`，但返回的棋盘已经发生截断。
2. pending rise 会先把 `survivalRiseCount` 加一；每第四次得到 `riseRows = 2`；随后立刻调用上述 `raiseBedrock()`，并把活动方块和落石整体上移相同行数（`src/game/core/engine.ts:876-900`）。
3. 清行结算中，Engine 先以 `deferOverflow=true` 执行完整 rise，再计算跨过的每三行奖励，最后才下降基岩（`src/game/core/engine.ts:1414-1430`）。
4. 只有 `risen.overflow && crossedRewardThresholds === 0` 才会 top-out（`src/game/core/engine.ts:1432-1436`）。因此只要本次获得至少一行奖励，先前的任何 overflow 都不会触发 game-over。
5. 当前测试把 `lines-cleared → bedrock-raised → bedrock-lowered` 明确冻结成事件顺序（`src/game/core/race.test.ts:161-183`），因此该测试会保护瞬时 `+1/-1` 或 `+2/-1`，而不是保护最终因果结算。
6. 普通一次 rise 和第四次两行 Aftershock 分别有直接测试（`src/game/core/race.test.ts:106-144`），普通顶层 overflow 也有测试（`src/game/core/race.test.ts:201-218`），但 `src/game/core/board.test.ts:1-151` 没有 `raiseBedrock()` 的顶层 sentinel 测试。

### 2.2 最小反例：Aftershock 2 / reward 1 / 合法净升 1

结算前使用以下已经清行后的规范棋盘：

- 旧第 0 行为空；
- 旧第 1 行在任意一列放置 sentinel `T`；
- 底部存在可供奖励移除的基岩；
- `survivalRisePending = true`；
- `survivalRiseCount = 3`，所以下次自然压力是第四次 Aftershock；
- 旧 `lines = 2`，本锁清一行，跨过一次三行奖励阈值。

当前路径逐步发生：

1. Aftershock 第一次 rise 丢弃空的旧第 0 行，sentinel 从旧第 1 行来到新第 0 行；
2. Aftershock 第二次 rise 发现新第 0 行非空，置 `overflow = true`，但仍丢弃该行，sentinel 永久消失；
3. reward 下降一行基岩，只能移动仍存在的棋盘内容，无法恢复 sentinel；
4. 因 `crossedRewardThresholds === 1`，Engine 忽略 `risen.overflow`；
5. 最终状态仍可为 playing，表面净升一行，但丢失了一个本应在合法净升后保留于第 0 行的方块。

同一条件若旧第 0 行本来就有 sentinel，则最终净升一行应该是真实 overflow；当前路径仍会因为获得奖励而跳过 top-out。因此 P0 同时包含“合法结算静默删格”和“真实净 overflow 被奖励错误豁免”两种结果。

### 2.3 原子结算模型

建议新增一个 Core 私有纯规划步骤，并只在同一清行/锁定边界提交一次。概念接口如下；字段名是合同草案，不是已实现 API：

```ts
type SurvivalPressureSettlementPlan = Readonly<{
  naturalRiseRows: 0 | 1 | 2;
  rewardRowsEarned: number;
  requestedNetRows: number;
  appliedBedrockDelta: number;
  aftershock: boolean;
  consumePendingRise: boolean;
  nextRiseCount: number;
  resetPressureClock: boolean;
}>;

planSurvivalPressureSettlement({
  linesBefore,
  linesAfter,
  bedrockRowsBefore,
  risePending,
  riseCountBefore,
}): SurvivalPressureSettlementPlan
```

规划规则：

1. `naturalRiseRows` 只由 pending 和累计自然 rise 次数决定：无 pending 为 `0`；普通为 `1`；第四次为 `2`。奖励不能倒退或抹除自然 rise 周期。
2. `rewardRowsEarned = floor(linesAfter / 3) - floor(linesBefore / 3)`，最小为 `0`。
3. `requestedNetRows = naturalRiseRows - rewardRowsEarned`。同一结算里的奖励先抵消同一结算里的压力，不允许先物化较大的 rise。
4. 当 `requestedNetRows > 0` 时，只检查并应用一次净上推；overflow 只基于最终净上推涉及的顶行，以及活动方块/落石按最终净位移映射后的合法性。
5. 当 `requestedNetRows < 0` 时，只从既有底部连续基岩中移除 `min(-requestedNetRows, bedrockRowsBefore)` 行，并把活动方块/落石向下移动实际移除行数。现有下降映射可参考 `src/game/core/engine.ts:805-832`。
6. 当净变化为 `0` 时，不调用升降棋盘 helper，不移动活动方块或落石。
7. pending 被消费时，`survivalRiseCount` 恰好递增一次，即使奖励完全抵消 Aftershock；压力时钟/标志在这一原子边界恰好重置一次。
8. overflow 是 settlement 的终态结果，不能再用“本次是否获得奖励”屏蔽。实现可以选择在失败时保留结算前棋盘，或保留明确的 terminal candidate，但绝不允许返回 playing 且发生不可解释的单元格丢失。

建议把现有 `resolvePendingSurvivalRise(..., deferOverflow)` 拆成“纯规划 + 单次应用”，删除 `deferOverflow` 这一使中间非法状态继续流动的分支。`raiseBedrock()` 可以保留为低层变换，但上层不得以未抵消的自然 rise 行数调用它。

### 2.4 单一因果事件

当前事件联合类型只给升/降提供 `count` 与 `height`（`src/game/core/types.ts:305-324`）。建议由一次结算发出一个真值事件：

```ts
type SurvivalPressureSettledEvent = Readonly<{
  type: 'survival-pressure-settled';
  naturalRiseRows: 0 | 1 | 2;
  rewardRowsEarned: number;
  requestedNetRows: number;
  appliedBedrockDelta: number;
  heightBefore: number;
  heightAfter: number;
  aftershock: boolean;
  overflow: boolean;
}>;
```

- `requestedNetRows` 保存“压力减奖励”的规则事实；`appliedBedrockDelta` 保存受零基岩下限约束后的真实棋盘变化。
- 若暂时保留 `bedrock-raised/lowered` 作为兼容事件，它们只能从最终 `appliedBedrockDelta` 派生，不能再次暴露瞬时 `+2/-1`。
- event 顺序改为 `lines-cleared → survival-pressure-settled → game-over? → spawn/entry`。同一 settlement 只出现一次。

### 2.5 P0 sentinel 测试计划

建议至少补以下直接测试；这些是未来实施用例，不是本文已跑结果：

1. **Board / 净升一行保留：**旧 row 0 空、旧 row 1 为 `T`，应用最终 `+1` 后 `T` 位于 row 0，`overflow=false`，非基岩单元格计数守恒。
2. **Board / 原始两行会溢出：**同一棋盘直接 `+2` 必须报告 overflow；该用例记录低层 helper 的破坏性，证明高层必须先抵消，不能把它误当原子方案。
3. **Board / 真净溢出：**旧 row 0 为 `T`、最终 `+1` 必须报告 overflow；绝不能因 reward 存在而继续 playing。
4. **Engine / 核心反例：**`riseCount=3`、pending、`lines 2→3`、row 0 空/row 1 sentinel、底部有基岩；最终净 `+1`，sentinel 保留到 row 0，status 仍 playing，rise count 为 `4`，clock/pending 重置，事件只有一次因果 settlement。
5. **Engine / 真实顶出：**与上例相同但旧 row 0 有 sentinel；最终净 `+1` 必须 `game-over`，reason 为 `bedrock-overflow`。
6. **Engine / 净零：**Aftershock `2` + reward `2`，以及 ordinary `1` + reward `1`；两者棋盘与 mover 坐标均不位移，前者仍消费第四次自然 rise。
7. **Engine / 净下降：**无 pending + reward，底部基岩不足时按实际可移除行数下降，不生成负高度。
8. **Mover 映射：**active 与每个 `survivalDebris` 只按最终净位移移动一次；没有瞬时越界再“救回”的路径。
9. **守恒与确定性：**所有非清行、非终止丢弃的普通/落石单元格计数守恒；同 seed + commands 的 `stateHash` 与事件序列完全一致。现有公共 `dispatch/replay/stateHash` 边界位于 `src/game/core/engine.ts:1567-1628`，既有确定性测试位于 `src/game/core/core.test.ts:170-184` 和 `src/game/core/race.test.ts:220-232`。

## 3. P1：因果反馈、HUD 与触摸

### 3.1 当前可读性缺口

- HUD 只在 pending 时返回 `0`，并把值替换成通用 pending 文案（`src/App.tsx:411-418`）。
- Survival rail 已计算“下一次是否 Aftershock”，但卡片只切换标签；没有显示 `+1/+2`、奖励抵消或最终净变化（`src/App.tsx:1625-1651`）。
- live region 对基岩事件只播报最终高度（`src/App.tsx:1762-1766`）。
- Renderer 对升/降只按方向、高度生成相同 180 ms 位移或 reduced-motion 80 ms 局部提示（`src/game/render/TetrisRenderer.ts:4373-4383`）；直接测试也只覆盖方向和 reduced-motion 去位移（`src/game/render/TetrisRenderer.test.ts:1334-1358`）。
- 两种压力时钟性质不同：墙压按 playing ticks，落石按玩家落子数；当前四格结构虽把它们分开，却没有把墙压幅度和“已到期、等待安全结算”讲清楚。

### 3.2 同源反馈设计

所有消费者只读 `survival-pressure-settled`，不各自重新推导因果：

- **普通墙升：**清晰但克制的向上边界响应，显示 `+1`。
- **Aftershock：**在倒计时阶段持续显示“下一次 +2”；结算时若未被抵消，边界响应幅度体现实际 `+2`；若被奖励部分抵消，显示完整算式而只动画最终净位移。
- **奖励 relief：**使用向下/卸压语义；奖励大于现存基岩时仍告诉玩家“奖励已获得”，但不能伪报移除了不存在的行。
- **overflow：**只在最终净变化确实越界时发出 terminal 反馈。
- **音频：**复用现有 TetraMorph 的短、干、非写实块体语言；普通 `+1`、Aftershock `+2`、奖励卸压和 terminal 各有可辨识轮廓，但不使用真实爆炸、低频轰鸣或惊吓峰值。音频只增强事件，不承担唯一信息通道。

建议 HUD 保留既有四格拓扑（时间、行数、墙压、落石），只改变墙压格内部信息层级：

- 标签固定说明“墙压/基岩”，次级 badge 显示下一次 `+1` 或 `Aftershock +2`；不要用“Aftershock”替换对象名称。
- 正常阶段显示剩余秒数和幅度，例如 `5 秒 · +2`；pending 阶段显示“待本次落定 · +2”，不显示含义不明的 `0 秒`。
- 同一清行结算后短暂显示因果摘要，例如 `余震 +2 − 清行奖励 1 = 净升 1`；普通/净零/净下降使用同一语法。
- 落石格继续用“剩余落子数”，并在 `survivalDebrisWarningColumns` 非空时明确“已预警列”，不把它混成第二个秒表。
- reduced motion 下取消棋盘整体位移，但保留静态边界增亮、`+n/-n` 文本、对比度和 live-region 句子；颜色或运动都不能成为唯一载体。

### 3.3 触摸压力下的安全性

当前实际交互面是棋盘手势：pointer down 获取 capture；pointer up 按 `22 px` 横移、`22 px` 下滑软降、`64 px` 下滑硬降或 `<12 px / <420 ms` 点击旋转（`src/App.tsx:1933-1969`），事件挂在 `board-frame`（`src/App.tsx:2632-2637`）。Canvas 禁止浏览器默认 touch action（`src/styles.css:1242-1247`），而 canvas 的 aria-description 只有通用手势提示（`src/App.tsx:2031-2038`、`src/App.tsx:2166-2172`）。现有 App 测试只证明 tap 旋转和一次右滑（`src/App.test.ts:1955-1986`）。

本 slice 不应凭仍存在的 `.touch-deck/.touch-key` 样式（`src/styles.css:1462-1517`）假设页面已有按钮 deck；当前 `src/**/*.tsx` 没有对应标记消费者。触摸优化应先强化真实棋盘手势：

1. pointer move 只更新可见手势预览和轴锁，不提前提交 hard drop；横/纵轴越过小滞回后固定，避免压力动画期间斜滑误判。
2. pointer up 仍是唯一提交点。tap/rotate 与 hard drop 最多提交一次；任何 repeat 只能在未来明确的横移/软降控件中使用，绝不能用于旋转或硬降。
3. `pointercancel`、`lostpointercapture`、暂停、重启、页面离开、倒计时覆盖都清空手势状态且不发命令；释放 capture 失败也不得留下 held input。
4. 手势预览用方向符号/边缘提示并遵循 reduced motion；它不能遮住顶层危险行、落石预警列或 active piece。
5. aria-description 必须列出 tap、横滑、短下滑、长下滑的实际映射；触摸反馈与键盘命令走同一个 Runtime 输入边界。
6. 若后续玩家明确选择显式按钮 deck，再单独实现不小于 `44 × 44 CSS px` 的触控目标、清晰 pressed/focus 状态和横移/软降受控 repeat；不得以本提案顺带恢复未挂载的旧 deck。

## 4. P1：leaderboard v9 读写失败语义

### 4.1 当前风险

- v9 key 与严格 Survival 行结构位于 `src/leaderboard.ts:17-59`；Survival 只应持久化 lines、elapsed ticks、outcome、date 等基础字段，严格解析位于 `src/leaderboard.ts:111-163`。
- `parseLeaderboard()` 对 null、格式损坏、非法 current v9 和不能迁移的数据最终都返回同一个空榜（`src/leaderboard.ts:203-227`）；legacy migration catch 同样返回空榜（`src/leaderboard.ts:519-570`）。调用者无法区分“真实空榜”和“数据不可读/损坏”。
- `readLeaderboard()` 使用会把 failed 与 missing 都变成 null 的 `readStorage()`，随后可能扫描 legacy；迁移写入的 boolean 结果被忽略（`src/App.tsx:347-362`）。
- `recordRun()` 无论 `writeStorage()` 成功与否都返回更新后的内存榜（`src/App.tsx:3241-3247`）。用户会看到像已保存的本局排名，刷新后却丢失。
- 平台层已经提供 `failed | missing | value` 三态读取和 boolean 写入（`src/platform/browserPlatform.ts:57-80`），并已有抛错/显式 false 的单测（`src/platform/browserPlatform.test.ts:119-142`），上层没有利用这些语义。
- 当前 App 只覆盖 legacy 成功复制（`src/App.test.ts:749-756`）；parser 测试虽证明 malformed fail closed，却不能证明 App 不覆盖数据或不会伪报持久化（`src/leaderboard.test.ts:75-102`）。

### 4.2 建议的 bootstrap 状态机

建议让 leaderboard bootstrap 返回可辨识状态，而不是裸 `Leaderboard`：

```ts
type LeaderboardBootstrap = Readonly<{
  value: Leaderboard;
  source: 'current' | 'legacy' | 'empty';
  persistence: 'verified' | 'unavailable' | 'invalid-current' | 'migration-write-failed';
}>;
```

读取规则：

1. current v9 为 `failed`：返回空的 session 视图和 `unavailable`；本 session 禁止 legacy 扫描和自动写入，因为无法证明 current key 不存在。
2. current v9 为 `value` 且 schema 有效：使用它，`persistence='verified'`。
3. current v9 为 `value` 但 JSON/schema 无效：fail closed、保留磁盘原文、不扫 legacy、不自动覆盖，标记 `invalid-current`。
4. 只有 current v9 明确为 `missing` 时才顺序检查 legacy keys。legacy 读取失败应停止迁移并标记不可用，不能继续寻找一个较旧但可读的键来覆盖未知的新数据。
5. legacy 成功解析后先尝试写 current v9；写成功才标记 verified。写失败可在本 session 展示迁移出的只读记录，但必须标记 `migration-write-failed`，不得声称迁移完成，也不删除 legacy。
6. current 和所有 legacy 都明确 missing 时，空榜可写，标记 verified。

建议 parser 同样暴露 `valid-current | valid-legacy | invalid`，不要再让空榜同时代表“合法空数据”和“解析失败”。这可以保留严格 schema，且不需要改变 v9 记录字段。

### 4.3 结算写入语义

- 对 verified 状态：先构造 candidate，再调用 `writeStorage`。成功后才更新“已持久化榜单”和 durable rank。
- 写入失败：保留原 durable 榜单；可另存一个内存 `sessionResult` 供本次结果页显示，但需明确双语提示“仅本次会话，未保存 / Session only — not saved”。本局不能被标为持久化 Top N。
- 对 unavailable/invalid-current/migration-write-failed 状态：默认不自动重试覆盖。可提供明确的“重试保存”动作；重试前重新读取 current key，避免覆盖期间由其他 tab 写入的新数据。
- 不删除、清空或改写损坏 current/legacy 原文；恢复/清理是另一个需玩家明确授权的维护动作。

建议的未来测试矩阵：current getter/`getItem` 抛错、current malformed、current schema-invalid、legacy read 抛错、迁移 `setItem` 抛错或返回 false、结算 quota/security 写失败、失败后刷新、显式重试时 current 已变化。每个用例都应断言原 storage bytes 不变、无未捕获异常、UI 状态准确。

## 5. P2：纯难度计划与 128-seed 模拟

### 5.1 先等价抽取，不同时调参

当前规则事实分散如下：

- 三行开局、每三行奖励、13→6 秒、固定 38 tick gravity、每第四次 Aftershock、8→4 落子间隔、每四次落石缩短一步、48 tick warning、`7/38` 落石推进，都在 `src/game/core/constants.ts:25-47`。
- 墙压间隔是按 lines 的纯函数（`src/game/core/constants.ts:114-122`），Engine 每 playing tick 使用它（`src/game/core/engine.ts:478-486`）。
- 落石间隔则在成功 spawn 后由 Engine 内联计算（`src/game/core/engine.ts:217-238`）。
- 既有边界测试覆盖 13→6（`src/game/core/race.test.ts:67-74`）和 8→4（`src/game/core/race.test.ts:405-423`）。

第一步只做行为等价抽取：

```ts
type SurvivalDifficultyProgress = Readonly<{
  lines: number;
  resolvedNaturalRises: number;
  completedRockfalls: number;
}>;

type SurvivalDifficultyPlan = Readonly<{
  gravityTicks: number;
  wallIntervalTicks: number;
  nextNaturalRiseRows: 1 | 2;
  rockfallIntervalPieces: number;
  rockfallWarningTicks: number;
  rockfallFallProgressPerTick: number;
  rockfallFallProgressThreshold: number;
}>;

survivalDifficultyPlan(progress: SurvivalDifficultyProgress): SurvivalDifficultyPlan
```

纯函数约束：只接受 canonical 整数计数；负数/非有限值按明确归一化合同处理；无 RNG、Date、DOM、React、Pixi、音频、storage 或 browser timing；相同输入永远返回深相等结果。初次落地的输出必须逐点等于当前规则，不夹带数值调整。Engine、HUD 和模拟器随后都消费同一个 plan，避免同一难度事实多处重算。

第二步才允许提供一个独立 candidate config。任何调参都应是具名配置差异，而不是散落 magic number；不建议在修复 P0 的同一提交里改变 interval、gravity、Aftershock 或 rockfall 频率。

### 5.2 冻结的 128-seed 模拟协议

模拟目的仅是找回归、极端种子和压力曲线差异，不能代表真人乐趣或最终难度。

1. **种子集：**固定索引 `0..127`，用仓库内确定性的 uint32 生成公式从一个具名常量派生；生成后提交完整 seed vector 及 SHA-256。基线与每个候选必须使用同一 vector，禁止每次随机抽样。
2. **三种固定策略，每种 128 seeds：**
   - `flat-safe`：优先最少洞、最低最大高度、最低总高度，再看 bumpiness/清行；
   - `line-greedy`：优先即时清行，再依次应用同一安全 tie-break；
   - `pressure-blind`：使用固定合法列/旋转序列，不读取墙压/落石计划，用来暴露低技能尾部。
3. **合法输入：**只通过公开 `start/move/rotate/soft-drop/hard-drop/tick` 命令推进；不直接写 board、queue、timer 或 warning。公共命令边界见 `src/game/core/engine.ts:1567-1604`。
4. **确定性落点搜索：**只枚举当前 active piece 的合法 rotation/x/landing；评分顺序和所有 tie-break 固定，最终动作流序列化。策略不能窥视未来 RNG 或 Renderer 状态。
5. **停止条件：**自然 game-over，或达到预先冻结的 playing-tick/piece 上限；达到上限的 run 标记 censored，不能伪装成 top-out。
6. **每 run 指标：**seed、policy、config hash、elapsed ticks、lines、pieces、自然 rise/Aftershock/rockfall 次数、奖励行、净基岩变化、最大堆高、洞数峰值、warning 实际 lead、top-out reason、同时 pressure+reward 次数、最终 `stateHash`、命令流 hash。
7. **聚合：**按 policy 分别报告 p10/p50/p90 survival time、lines、pieces 和 top-out 分布；另列最差十个 seeds 及它们首次分歧的事件。不得只给三种策略混合平均值。
8. **成对比较：**baseline 与 candidate 用相同 seed/policy；报告每个 run 的 delta 和首次状态哈希分歧。任何意外规则变化都能定位到第一个命令边界。
9. **重复运行：**同一 config/seed/policy 至少重复一次，最终 state hash、command hash、事件摘要和所有指标必须逐字节一致。现有 Core 已有同 seed replay/hash 先例（`src/game/core/core.test.ts:170-184`），Survival 也把 pressure 状态纳入 hash（`src/game/core/race.test.ts:220-232`）。

现有落石形态测试只在 seeds `1..32` 验证一/二格高度都出现（`src/game/core/race.test.ts:382-402`）；它应继续作为快速单测，不能被 128-seed 纵向模拟替代。

### 5.3 调参决策方式

- 先产出 current-values baseline，再由玩家/协调者冻结候选目标；不能先改数值再倒推“通过”区间。
- 候选至少同时观察低技能尾部、稳健策略中位数和高压后段，避免只优化平均存活时间。
- P0 cell conservation、预警列一致、48-tick warning 下限、独立 RNG 和 replay determinism 都是硬约束；任何“更好玩”的聚合指标不能抵消硬约束失败。
- 模拟通过只允许进入真人试玩。最终节奏、可读性、触摸误触和音频舒适度必须由人类验收。

## 6. 建议实施切片与所有权

为避免同一路径碰撞，建议串行执行以下 checkpoint；每个 checkpoint 先更新权威设计/任务状态，再改代码，并由独立 QA 审查候选 SHA：

1. **S1 / P0 Core + tests：**`board.ts`、`engine.ts`、`types.ts`、`board.test.ts`、`race.test.ts`。只修原子 settlement 和事件，不调难度值。
2. **S2 / P1 consumers：**Renderer、App、localization、相关样式与直接测试。只消费 S1 因果事件，完成 HUD/reduced-motion/live-region/触摸反馈；音频如进入实现，保持单独可听审 checkpoint。
3. **S3 / P1 persistence：**`leaderboard.ts`、`App.tsx`、platform 边界及直接测试。若 S2 仍占用 `App.tsx`，S3 必须等待，不能并行写同一路径。
4. **S4 / P2 pure plan：**等价抽取 `survivalDifficultyPlan()` 和边界单测，不改数值。
5. **S5 / P2 simulation + candidate：**先提交模拟 harness/基线报告，再独立提交具名候选配置；没有玩家选择就不改产品默认值。
6. **S6 / final evidence：**最后一次 typecheck、完整 suite、build、browser evidence、音频/触摸人工验收和独立 QA；只有这一阶段可提出产品接受结论。

## 7. 最终统一验收门槛（所有需要验收的内容集中于此）

以下均是未来实施完成后的门槛。本文没有满足或声称满足其中任何一项。

### 7.1 P0 Core 正确性

- [ ] 第 2.5 节九组 sentinel/Engine 用例全部通过；特别是 Aftershock `2` + reward `1` 的合法净升 `1` 不丢失旧 row 1 sentinel。
- [ ] 旧 row 0 被占且最终净升 `1` 时必定 `game-over / bedrock-overflow`；reward 不再豁免真实 overflow。
- [ ] 同一结算最多一次棋盘竖向变换、一次 mover 映射、一次因果 settlement；不再出现可观察的 `raise 2 → lower 1` 中间态。
- [ ] 非清行、非明确 terminal 语义下的普通/落石单元格数量守恒；基岩高度与连续底部基岩实际一致。
- [ ] pending、pressure clock、rise count 在 ordinary、Aftershock、完全抵消、部分抵消、无基岩 reward 和 overflow 路径上各自只更新一次。
- [ ] 同 seed + public commands 的最终 state hash、事件流与 replay 完全一致；七袋和落石 RNG 隔离不变。

### 7.2 P1 因果反馈、HUD、音频与触摸

- [ ] 四格 Survival rail 保持时间/行数/墙压/落石，不增加空白第五格；墙压同时明确对象、剩余时间/待结算状态和下一次 `+1/+2`。
- [ ] ordinary `+1`、Aftershock `+2`、Aftershock `2−reward 1`、净零、净下降、无基岩奖励和 overflow 均显示与 Core event 完全一致的双语因果文案。
- [ ] Renderer 只动画实际净变化；部分抵消不播放两次相反棋盘位移。reduced motion 无整体位移，但保留静态边界、文本、对比度和 live-region 语义。
- [ ] 音频与同一个 settlement event 对齐；普通/Aftershock/relief/terminal 可辨识、非写实、不过响、不惊吓。自动 loudness/peak/spectrum 仅作技术门槛，最后必须由玩家真人听审；未明确通过不得写产品接受。
- [ ] tap、左右滑、短下滑、长下滑各精确提交预期命令；rotate 和 hard drop 永不 repeat；斜滑轴锁结果可预测。
- [ ] pointer cancel、lost capture、暂停、重启、倒计时、离页、unmount 后零残留输入/监听器/capture；触摸和键盘结果走同一 Runtime 边界。
- [ ] 触摸预览不遮挡顶层危险行、warning 列或 active piece；reduced motion 和屏幕阅读器仍可理解实际映射。

### 7.3 P1 leaderboard v9 韧性

- [ ] current key 的 failed、missing、valid、invalid 四类路径可区分；failed/invalid 时不扫描 legacy、不覆盖 current。
- [ ] 只有 current 明确 missing 才迁移；legacy read/write 失败均保留原 bytes，不删除旧 key，不声称迁移成功。
- [ ] 结算写入成功才产生 durable rank；写失败时原 durable 榜不变，结果页明确显示 session-only/not saved 双语状态。
- [ ] getter/`getItem`/`setItem` 抛错、显式 false、quota/security、malformed current、migration failure 和跨 tab 重试矩阵无未捕获异常。
- [ ] v9 Survival 记录仍只包含既有允许字段，排序仍先 elapsed ticks 后 lines；没有借故升级 schema 或恢复 score/pieces/chain。

### 7.4 P2 pure plan 与 128-seed 证据

- [ ] 首个 pure-plan checkpoint 对当前全部边界逐点等价：13→6、每三行、38 ticks、每第四次两行、8→4、每四次落石缩一步、48 warning、`7/38` 推进。
- [ ] pure function 对边界/巨大/负/非有限输入有冻结测试；无 I/O、RNG、墙钟或 renderer 依赖，且没有修改输入。
- [ ] 冻结 128-seed vector、生成算法、vector hash、三种策略、策略版本、config hash、停止上限和报告 schema 都进入仓库。
- [ ] baseline 与每个 candidate 完成 `128 seeds × 3 policies`，重复运行逐字节确定；无 invariant、cell-conservation、warning-plan、RNG-isolation 或 P0 sentinel 失败。
- [ ] 报告提供按 policy 的 p10/p50/p90、成对 delta、censored 数和最差十个 seeds；不以混合平均数掩盖尾部。
- [ ] candidate 的数值目标和允许回归窗口必须在看完 baseline 后由玩家/协调者显式冻结；模拟结果不能自行授权默认难度变更。

### 7.5 仓库与最终人工门槛

- [ ] 最后一处源代码变更后仅执行一次最终 `npm.cmd run typecheck`、一次完整 `npm.cmd run test`、一次 `npm.cmd run build`，均为绿色。
- [ ] 最终浏览器证据来自候选 SHA：恰好一个 gameplay canvas、零 DOM cell grid、零 console error；desktop/portrait、中文/英文、full/reduced motion、键盘/触摸均覆盖。
- [ ] pause/restart/route change/unmount 后零 ticker、listener、audio、timer、pointer capture 或 canvas 泄漏。
- [ ] 独立 QA 对候选范围给出 P0/P1/P2/P3/GAP disposition；所有产品代码、测试、证据和 QA disposition 分 checkpoint，不混成一个提交。
- [ ] 玩家最后集中验收节奏公平性、因果可读性、触摸误触率和音频舒适度。只有玩家明确通过且以上硬门槛全部绿色，协调者才能更新 changelog 并提出产品接受。

---

**当前状态再次声明：AUDIT ONLY / NOT IMPLEMENTED / NO PRODUCT ACCEPTANCE CLAIM。**
