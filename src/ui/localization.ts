import type {
  GameMode,
  MutationItem,
  PuzzleId,
} from '../game/core';
import type { PuzzleTechnique } from '../puzzleLessons';

export type AppLanguage = 'zh-CN' | 'en';
export type PuzzleCelebrationOutcome = 'first' | 'record' | 'replay';
export type RuleFactId =
  | 'goal'
  | 'pace'
  | 'start'
  | 'pressure'
  | 'stonefall'
  | 'carriers'
  | 'items'
  | 'queue'
  | 'undo'
  | 'record'
  | 'end';

export type RuleFact = Readonly<{
  id: RuleFactId;
  label: string;
  value: string;
}>;

export type IntroRuleFactId = 'objective' | 'mechanic' | 'challenge';

export type IntroRuleFact = Readonly<{
  id: IntroRuleFactId;
  label: string;
  value: string;
}>;

export const DEFAULT_LANGUAGE: AppLanguage = 'zh-CN';
export const LANGUAGE_STORAGE_KEY = 'tetramorph:language:v1';

type ModeCopy = {
  label: string;
  detail: string;
  action: string;
};

type Translation = {
  modes: Record<GameMode, ModeCopy>;
  rules: Record<GameMode, readonly RuleFact[]>;
  introRules: Record<GameMode, readonly IntroRuleFact[]>;
  items: Record<MutationItem, string>;
  labels: {
    language: string;
    chinese: string;
    english: string;
    settings: string;
    controls: string;
    rules: string;
    keyboard: string;
    gameplayControls: string;
    shortcuts: string;
    selectMode: string;
    tagline: string;
    skipToGame: string;
    loading: string;
    back: string;
    start: string;
    okay: string;
    continue: string;
    returnToPause: string;
    restart: string;
    confirm: string;
    cancel: string;
    playAgain: string;
    replay: string;
    settingsShortcut: string;
    pauseResume: string;
    restartConfirm: string;
    undo: string;
    move: string;
    rotate: string;
    softDrop: string;
    hardDrop: string;
    volume: string;
    soundOn: string;
    soundOff: string;
    soundControls: string;
    theme: string;
    currentTheme: string;
    mineralMist: string;
    deepTide: string;
    sunstone: string;
    turnSoundOn: string;
    turnSoundOff: string;
    score: string;
    piecesUsed: string;
    lines: string;
    bedrock: string;
    nextRise: string;
    survivalTime: string;
    aftershock: string;
    stonefall: string;
    level: string;
    originalBlocks: string;
    placed: string;
    fall: string;
    classicSpeedRange: string;
    startingFallSpeed: string;
    fastestFallSpeed: string;
    appliesNextRun: string;
    classicDifficulty: string;
    classicRelaxed: string;
    classicStandard: string;
    classicChallenge: string;
    core: string;
    combo: string;
    next: string;
    puzzle: string;
    selectedPuzzle: string;
    puzzleTraits: string;
    fixedAnchors: string;
    puzzleRoute: string;
    puzzleBands: string;
    puzzlePages: string;
    puzzleIntro: string;
    puzzleEasy: string;
    puzzleHard: string;
    mastery: string;
    hardUnlockHint: string;
    modeHome: string;
    currentRecord: string;
    notCompleted: string;
    best: string;
    leaderboard: string;
    resultLeaderboard: string;
    noRecords: string;
    currentRun: string;
    currentRunMissedLeaderboard: string;
    resultSummary: string;
    pauseTitle: string;
    pauseHint: string;
    restartTitle: string;
    restartHint: string;
    undoTitle: string;
    leaveTitle: string;
    leaveRun: string;
    leavePuzzle: string;
    resultTitle: string;
    gamePanel: string;
    gameArea: string;
    board: string;
    twoUpcoming: string;
    nextPiece: string;
    followingPiece: string;
    touchControls: string;
    puzzleTouchControls: string;
    touchGestureHint: string;
    motion: string;
    reducedMotionOn: string;
    reducedMotionOff: string;
    turnReducedMotionOn: string;
    turnReducedMotionOff: string;
    mutationStatus: string;
    mutationActive: string;
    mutationIdle: string;
    superMultiplier: string;
    waitingForCore: string;
    carrierCore: string;
    pendingRise: string;
    pausedMessage: string;
    resumedMessage: string;
    undoMessage: string;
    targetReached: string;
    runEnded: string;
    runStarted: string;
    modeData: string;
    moveLeft: string;
    moveRight: string;
    stay: string;
    select: string;
    switch: string;
    activate: string;
  };
  phrasing: {
    elapsed: (minutes: number, seconds: number) => string;
    cadence: (seconds: string) => string;
    seconds: (seconds: number) => string;
    rockfallPieces: (pieces: number) => string;
    lineCount: (lines: number) => string;
    pieceCount: (pieces: number) => string;
    bedrockCount: (rows: number) => string;
    bedrockRise: (rows: number) => string;
    minimumMoves: (moves: number) => string;
    currentBest: (moves: number) => string;
    originalBlocks: (remaining: number, total: number) => string;
    modeLeaderboard: (mode: string) => string;
    leaderboardCriterion: (survival: boolean) => string;
    leaderboardSummary: (score: string, pieces: number, lines: number, survival: boolean, mutation: boolean) => string;
    terminalPuzzleSuccess: (pieces: number, lines: number) => { title: string; detail: string };
    puzzleCelebration: (outcome: PuzzleCelebrationOutcome, best: number) => {
      title: string;
      detail: string;
      best: string;
      bestLabel: string;
      bestValue: string;
      bestUnit: string;
    };
    terminalPuzzleFailure: (remaining: number, pieces: number) => { title: string; detail: string };
    terminalMutation: () => { title: string; detail: string };
    terminalSurvival: () => { title: string; detail: string };
    terminalClassic: () => { title: string; detail: string };
    selectedPuzzle: (name: string) => string;
    puzzleBoard: (name: string) => string;
    startPuzzle: (name: string) => string;
    puzzleList: (count: number) => string;
    puzzleCategory: (category: string, count: number) => string;
    masteryThreshold: (technique: string, prerequisite: string, required: number, best: number | null) => string;
    rowBand: (rows: number) => string;
    levelNode: (index: string, name: string, rows: number, complete: boolean, unlocked: boolean, best: number | null) => string;
    boardLabel: string;
    eventLinesCleared: (count: number) => string;
    eventBedrockRaised: (height: number) => string;
    eventBedrockLowered: (height: number) => string;
    eventItemTriggered: (item: string, seconds: number) => string;
    eventSupergravityTriggered: (item: string, pieces: number) => string;
    mutationTimer: (item: string, seconds: number) => string;
    mutationPieces: (item: string, pieces: number) => string;
    mutationPreview: (piece: string, item: string) => string;
    puzzleLesson: (technique: PuzzleTechnique) => { title: string; body: string };
  };
};

const ENGLISH_LEVEL_NAMES: Readonly<Record<PuzzleId, string>> = {
  't3r-shaft-01': 'Gap',
  't3r-shaft-02': 'Side Well',
  't3r-shaft-03': 'Offset',
  't3r-shaft-04': 'Turn',
  't3r-cascade-05': 'Twin Wells',
  't3r-cascade-06': 'Switchback',
  't5r-delta-07': 'Shaft',
  't5r-drift-08': 'Side Gap',
  't5r-lattice-09': 'Interlock',
  't5r-rift-10': 'Twin Gate',
  't5r-prism-11': 'Stair',
  't5r-current-12': 'Overhang',
  't5r-arc-13': 'Well',
  't5r-pulse-14': 'Platform',
  't5r-horizon-15': 'Twin Shafts',
  't6r-veil-16': 'Junction',
  't6r-cairn-17': 'Backfill',
  't6r-terrace-18': 'Side Shelf',
  't6r-bastion-19': 'Narrow Gate',
  't6r-keystone-20': 'Bridge',
  'tm-puzzle-21': 'Gatepost',
  'tm-puzzle-22': 'Corridor',
  'tm-puzzle-23': 'Center Post',
  'tm-puzzle-24': 'Slope',
  'tm-puzzle-25': 'Pinched Well',
  'tm-puzzle-26': 'Offset Shelf',
  'tm-puzzle-27': 'Ramp',
  'tm-puzzle-28': 'Side Bridge',
  'tm-puzzle-29': 'Double Layer',
  'tm-puzzle-30': 'Split Shelf',
  'tm-puzzle-31': 'Bent Well',
  'tm-puzzle-32': 'Left Gate',
  'tm-puzzle-33': 'Offset Bridge',
  'tm-puzzle-34': 'Stepped Well',
  'tm-puzzle-35': 'Hanging Shelf',
  'tm-puzzle-36': 'Right Gate',
  'tm-puzzle-37': 'Twin Channel',
  'tm-puzzle-38': 'Loop Well',
  'tm-puzzle-39': 'Edge Tower',
  'tm-puzzle-40': 'Bent Bridge',
  'tm-puzzle-41': 'Cross Trench',
  'tm-puzzle-42': 'Center Steps',
  'tm-puzzle-43': 'Split Gallery',
  'tm-puzzle-44': 'Twin Towers',
  'tm-puzzle-45': 'Sloped Gallery',
  'tm-puzzle-46': 'Edge Well',
  'tm-puzzle-47': 'Deep Channel',
  'tm-puzzle-48': 'Broken Channel',
  'tm-puzzle-49': 'Layered Well',
  'tm-puzzle-50': 'Forked Passage',
};

const COPY: Record<AppLanguage, Translation> = {
  'zh-CN': {
    modes: {
      marathon: { label: '经典', detail: '补全横行获得分数；每消 10 行下落加快。', action: '开始' },
      race: { label: '生存', detail: '在上升基岩上坚持；每消 3 行移除一层。', action: '开始' },
      sprint: { label: '异变', detail: '核心方块触发道具；每消 6 行下落加快。', action: '开始' },
      puzzle: { label: '解谜', detail: '清除全部原有方块；固定序列，可直接撤回。', action: '选关' },
    },
    rules: {
      marathon: [
        { id: 'goal', label: '消行', value: '移动、旋转并落下方块；填满一整行即可消除并得分。' },
        { id: 'pace', label: '加速', value: '累计消除 10 行后，下落速度提升一级。' },
        { id: 'end', label: '结束', value: '新方块无法进入棋盘时，本局结束。' },
      ],
      race: [
        { id: 'start', label: '岩壁', value: '开局连续升起 3 层基岩；之后每 13 秒上升一层，逐步加快至每 6 秒；每第 4 次自然上升触发余震，一次升起 2 层。' },
        { id: 'pressure', label: '反制', value: '每累计消除 3 行，移除最上方一层基岩。' },
        { id: 'stonefall', label: '落石', value: '最初每使用 8 个方块，随下一个方块落下同列的 1–2 块落石；每触发 4 次，间隔减少 1 个，最低为 4 个。落石以普通方块 7 倍速度下落，也能参与消行。' },
        { id: 'end', label: '结束', value: '基岩或堆叠令新方块无法进入棋盘时，本局结束。' },
      ],
      sprint: [
        { id: 'goal', label: '消行', value: '基础规则与经典相同；每累计消除 6 行，下落速度提升一级。' },
        { id: 'carriers', label: '携带', value: '带有彩色核心标记的方块携带道具；该方块任意一格被消除时立即触发。' },
        { id: 'items', label: '道具', value: '冰冻令方块以 1.0 秒/格下落 10 秒；超重令后续 5 个方块的自身各列独立下沉，已落定方块不移动；炸弹清除底部 3 行；加倍令消行得分 ×2，持续 10 秒。再次触发冰冻或加倍会刷新时长，超重则刷新后续 5 块额度；加倍叠加后升级为超级加倍 ×4。' },
        { id: 'end', label: '结束', value: '新方块无法进入棋盘时，本局结束。' },
      ],
      puzzle: [
        { id: 'goal', label: '破解', value: '通过消行清除棋盘中全部原有方块；不可消除的锚点只会阻挡移动。' },
        { id: 'queue', label: '推演', value: '每关使用固定方块序列，Next 同时展示后续两个方块，操作数没有上限。' },
        { id: 'undo', label: '撤回', value: '按 Z 直接回到上一个方块尚未出现的状态，并重新开始它的下落。' },
        { id: 'record', label: '纪录', value: '通关后保存该关最少操作数；精通部分简单关可解锁相同技巧的困难关。' },
      ],
    },
    introRules: {
      marathon: [
        { id: 'objective', label: '目标', value: '填满横行，持续消除并得分。' },
        { id: 'mechanic', label: '机制', value: '每消除 10 行，下落速度提升一级。' },
        { id: 'challenge', label: '挑战', value: '避免堆叠封顶，尽量延长本局。' },
      ],
      race: [
        { id: 'objective', label: '目标', value: '在上升岩壁与落石压力下坚持更久。' },
        { id: 'mechanic', label: '机制', value: '消除 3 行可移除一层基岩；落石也能补行。' },
        { id: 'challenge', label: '挑战', value: '同时规划上升节奏和危险列。' },
      ],
      sprint: [
        { id: 'objective', label: '目标', value: '消行得分，并利用核心方块改变局面。' },
        { id: 'mechanic', label: '机制', value: '消除带核心标记的任意一格即可触发道具。' },
        { id: 'challenge', label: '挑战', value: '在加速堆叠中判断何时触发最有效。' },
      ],
      puzzle: [
        { id: 'objective', label: '目标', value: '清除棋盘中的全部原有方块。' },
        { id: 'mechanic', label: '机制', value: '固定序列、双 Next 和直接撤回帮助推演。' },
        { id: 'challenge', label: '挑战', value: '绕开锚点，保留后续方块的入口与支撑。' },
      ],
    },
    items: { freeze: '冰冻', collapse: '超重', bomb: '炸弹', multiplier: '加倍' },
    labels: {
      language: '语言', chinese: '中文', english: 'English', settings: '设置', controls: '控制', rules: '规则', keyboard: '键盘', gameplayControls: '玩法操作', shortcuts: '快捷键', selectMode: '选择游戏模式', tagline: '重新定义下落方块', skipToGame: '跳到游戏', loading: 'TetraMorph 正在加载', back: '返回', start: '开始', okay: '好的', continue: '继续游戏', returnToPause: '返回暂停', restart: '重新开始', confirm: '确认', cancel: '取消', playAgain: '再来一局', replay: '重来', settingsShortcut: '设置', pauseResume: '暂停', restartConfirm: '重开确认', undo: '撤回', move: '移动', rotate: '旋转', softDrop: '快速下落', hardDrop: '直接落底', volume: '音量', soundOn: '音效开', soundOff: '音效关', soundControls: '声音控制', theme: '画面主题', currentTheme: '当前', mineralMist: '雾昼矿物', deepTide: '深潮夜航', sunstone: '暖砂日晷', turnSoundOn: '开启音效', turnSoundOff: '关闭音效', motion: '动态效果', reducedMotionOn: '减少动效', reducedMotionOff: '完整动效', turnReducedMotionOn: '开启减少动效', turnReducedMotionOff: '关闭减少动效', score: '分数', piecesUsed: '使用方块', lines: '消行', bedrock: '基岩', nextRise: '下一层', survivalTime: '生存时间', aftershock: '余震', stonefall: '距离落石', level: '关卡', originalBlocks: '原有方块', placed: '操作数', fall: '下落速度', classicSpeedRange: '下落速度区间', startingFallSpeed: '开局速度', fastestFallSpeed: '最快速度', appliesNextRun: '下局生效', classicDifficulty: '难度', classicRelaxed: '休闲', classicStandard: '标准', classicChallenge: '挑战', core: '核心', combo: '连消', next: 'Next', puzzle: '解谜', selectedPuzzle: '已选残局', puzzleTraits: '残局特性', fixedAnchors: '固定锚点', puzzleRoute: '开放解谜残局', puzzleBands: '残局行数分段', puzzlePages: '关卡页', puzzleIntro: '入门', puzzleEasy: '简单', puzzleHard: '困难', mastery: '技巧精通', hardUnlockHint: '困难关由对应简单关的精通成绩解锁。', modeHome: '返回首页', currentRecord: '当前关纪录', notCompleted: '尚未通关', best: '最少', leaderboard: '本模式排行', resultLeaderboard: '排行榜', noRecords: '暂无记录', currentRun: '本局', currentRunMissedLeaderboard: '未进入前 5', resultSummary: '本局结果', pauseTitle: '暂停', pauseHint: '回车继续', restartTitle: '重新开始', restartHint: '回车确认，按 R 取消', undoTitle: '撤回上一步？', leaveTitle: '离开本局？', leaveRun: '返回首页', leavePuzzle: '返回关卡库', resultTitle: '本局结束', gamePanel: '游戏面板', gameArea: '游戏区', board: '游戏棋盘', twoUpcoming: '后续两个方块：1 为下一个，2 为后一个', nextPiece: '下一个方块', followingPiece: '后一个方块', touchControls: '触控操作', puzzleTouchControls: '解谜触控操作', touchGestureHint: '触控：轻点旋转；左右滑动移动；向下短滑加速，长滑直接落底。', mutationStatus: '异变状态', mutationActive: '生效中', mutationIdle: '暂无持续状态', superMultiplier: '超级加倍 ×4', waitingForCore: '等待核心方块', carrierCore: '核心', pendingRise: '待上升', pausedMessage: '本局已暂停。', resumedMessage: '继续本局。', undoMessage: '已撤回上一次落子。', targetReached: '目标已达成。', runEnded: '本局结束。', runStarted: 'TetraMorph 已开始。', modeData: '模式数据', moveLeft: '左移', moveRight: '右移', stay: '留在本局', select: '选择', switch: '切换', activate: '执行',
    },
    phrasing: {
      elapsed: (minutes, seconds) => `${minutes} 分 ${seconds} 秒`,
      cadence: (seconds) => `${seconds} 秒/格`,
      seconds: (seconds) => `${seconds} 秒`,
      rockfallPieces: (pieces) => `${pieces}块`,
      lineCount: (lines) => `${lines} 行`,
      pieceCount: (pieces) => `${pieces} 方块`,
      bedrockCount: (rows) => `${rows} 层基岩`,
      bedrockRise: () => '上升',
      minimumMoves: (moves) => `最少 ${moves} 步`,
      currentBest: (moves) => `当前最优步数：${moves}步`,
      originalBlocks: (remaining, total) => `原有方块（${remaining}/${total}）`,
      modeLeaderboard: (mode) => `${mode}排行`,
      leaderboardCriterion: () => '前 5',
      leaderboardSummary: (score, pieces, lines, survival, mutation) => mutation ? `${score} 分  ${pieces} 方块` : survival ? `${lines} 行` : `${score} 分`,
      terminalPuzzleSuccess: (pieces, lines) => ({ title: '原有方块已清除', detail: `${pieces} 方块 · ${lines} 消行` }),
      puzzleCelebration: (outcome, best) => {
        const metric = {
          best: `当前最优步数：${best}步`,
          bestLabel: '当前最优步数',
          bestValue: String(best),
          bestUnit: '步',
        };
        if (outcome === 'first') {
          return {
            title: '恭喜你破解谜题',
            detail: '',
            ...metric,
          };
        }
        if (outcome === 'record') {
          return {
            title: '刷新个人纪录',
            detail: '',
            ...metric,
          };
        }
        return {
          title: '谜题已破解',
          detail: '',
          ...metric,
        };
      },
      terminalPuzzleFailure: (remaining, pieces) => ({ title: '堆叠到顶', detail: `剩余 ${remaining} 原有方块 · 已落 ${pieces} 块` }),
      terminalMutation: () => ({ title: '得分', detail: '' }),
      terminalSurvival: () => ({ title: '生存时间', detail: '' }),
      terminalClassic: () => ({ title: '消行', detail: '' }),
      selectedPuzzle: (name) => `已选残局：${name}`,
      puzzleBoard: (name) => `${name}棋盘轮廓`,
      startPuzzle: (name) => `开始 ${name}`,
      puzzleList: (count) => `${count} 个开放解谜残局`,
      puzzleCategory: (category, count) => `${category}，${count} 关`,
      masteryThreshold: (technique, prerequisite, required, best) => best === null
        ? `在“${prerequisite}”中用 ${required} 步内通关，掌握“${technique}”后解锁。`
        : best <= required
          ? `已通过“${prerequisite}”以 ${best} 步掌握“${technique}”。`
          : `“${prerequisite}”当前 ${best} 步；达到 ${required} 步内即可掌握“${technique}”。`,
      rowBand: (rows) => `${rows} 行残局`,
      levelNode: (index, name, rows, complete, unlocked, best) => `${index} ${name}，${rows} 行残局${complete ? '，已完成' : unlocked ? '，可进入' : '，未解锁'}${best !== null ? `，最少 ${best} 步` : ''}`,
      boardLabel: 'TetraMorph 10 × 20 游戏棋盘',
      eventLinesCleared: (count) => `消除了 ${count} 行。`,
      eventBedrockRaised: (height) => `基岩升至 ${height} 层。`,
      eventBedrockLowered: (height) => `基岩降至 ${height} 层。`,
      eventItemTriggered: (item, seconds) => `${item} 已触发，持续 ${seconds} 秒。`,
      eventSupergravityTriggered: (item, pieces) => `${item}已触发，覆盖后续 ${pieces} 块。`,
      mutationTimer: (item, seconds) => `${item}：${seconds} 秒`,
      mutationPieces: (item, pieces) => `${item} · 剩余 ${pieces} 块`,
      mutationPreview: (piece, item) => `${piece} 方块，携带${item}道具`,
      puzzleLesson: (technique) => ({
        'complete-row': { title: '先完成一行', body: '先补最接近完整的目标行；消行腾出的空间会让后续更清楚。' },
        'preserve-well': { title: '保留竖井', body: '不要先封住窄槽，把直达底部的通道留给形状匹配的长边。' },
        'build-support': { title: '先铺支撑', body: '先把承接面铺稳再盖上层；悬空封顶会把空格埋成洞。' },
        'avoid-hole': { title: '不埋空格', body: '落下前看方块下方；被盖住的空格通常要多清几行才能救回。' },
        'read-queue': { title: '两块一起看', body: '先判断第 2 块需要的槽口，再用第 1 块为它保留支撑和入口。' },
        'retain-opening': { title: '压平但留口', body: '降低高差时别封死唯一入口；平整和可进入必须同时满足。' },
        'edge-to-centre': { title: '从肩部向中心收束', body: '先减掉两侧高点，再给中部保留可继续消行的平整支撑。' },
        'split-lanes': { title: '两条通道分别安排', body: '把当前块和下一块分配到不同通道，避免一边填满后堵住另一边。' },
        'choose-gate': { title: '为后续选择入口', body: '两个落点都安全时，优先保留与下一块形状相容的入口。' },
        'anchor-side-slip': { title: '贴锚侧滑', body: '先快速下落到锚点附近，再立即横移，滑进从顶部直落到不了的位置。' },
      })[technique],
    },
  },
  en: {
    modes: {
      marathon: { label: 'Classic', detail: 'Complete rows to score; speed rises every 10 lines.', action: 'Play' },
      race: { label: 'Survival', detail: 'Outlast rising bedrock; remove one layer every 3 lines.', action: 'Play' },
      sprint: { label: 'Mutation', detail: 'Core pieces trigger items; speed rises every 6 lines.', action: 'Play' },
      puzzle: { label: 'Puzzle', detail: 'Clear every original block with a fixed queue and direct undo.', action: 'Levels' },
    },
    rules: {
      marathon: [
        { id: 'goal', label: 'Clear', value: 'Move, rotate, and drop pieces. Completing a row clears it and awards points.' },
        { id: 'pace', label: 'Speed', value: 'Gravity increases one tier after every 10 cleared lines.' },
        { id: 'end', label: 'End', value: 'The run ends when a new piece cannot enter the board.' },
      ],
      race: [
        { id: 'start', label: 'Wall', value: 'Three bedrock rows rise during the opening. Another row rises every 13 seconds, accelerating to every 6 seconds. Every fourth natural rise is an Aftershock that raises 2 rows.' },
        { id: 'pressure', label: 'Relief', value: 'Every 3 cleared lines removes the top bedrock row.' },
        { id: 'stonefall', label: 'Rockfall', value: 'At first, every 8 used pieces schedules 1–2 joined rocks with the next piece. Every 4 rockfalls shortens the interval by one, to a minimum of 4. Rocks fall at 7× piece speed and can complete lines.' },
        { id: 'end', label: 'End', value: 'The run ends when bedrock or the stack prevents a new piece from entering.' },
      ],
      sprint: [
        { id: 'goal', label: 'Clear', value: 'Classic rules apply; gravity increases one tier after every 6 cleared lines.' },
        { id: 'carriers', label: 'Carriers', value: 'A piece with a colored core carries an item. Clearing any cell of that piece triggers it immediately.' },
        { id: 'items', label: 'Items', value: 'Freeze sets gravity to 1.0 s/cell for 10 seconds; Supergravity settles only each of the next 5 pieces by its own occupied columns, without moving locked cells; Bomb clears the bottom 3 rows; Double makes line-clear scores ×2 for 10 seconds. Repeating Freeze or Double refreshes its duration, while Supergravity refreshes its 5-piece quota; stacked Double becomes Super Double ×4.' },
        { id: 'end', label: 'End', value: 'The run ends when a new piece cannot enter the board.' },
      ],
      puzzle: [
        { id: 'goal', label: 'Solve', value: 'Clear every original block. Permanent anchors block movement but cannot be removed.' },
        { id: 'queue', label: 'Plan', value: 'Each level has a fixed sequence. Next shows the following two pieces, with no move limit.' },
        { id: 'undo', label: 'Undo', value: 'Press Z to return to the state before the previous piece appeared, then play it again.' },
        { id: 'record', label: 'Record', value: 'Completion saves the fewest moves. Mastering selected Easy levels unlocks Hard levels that use the same technique.' },
      ],
    },
    introRules: {
      marathon: [
        { id: 'objective', label: 'Goal', value: 'Complete rows, keep clearing, and build your score.' },
        { id: 'mechanic', label: 'Mechanic', value: 'Gravity rises one tier after every 10 cleared lines.' },
        { id: 'challenge', label: 'Challenge', value: 'Keep the stack open and delay the top-out.' },
      ],
      race: [
        { id: 'objective', label: 'Goal', value: 'Outlast the rising wall and incoming rocks.' },
        { id: 'mechanic', label: 'Mechanic', value: 'Every 3 lines removes one bedrock row; rocks can complete lines.' },
        { id: 'challenge', label: 'Challenge', value: 'Plan around both the rise timer and the warned column.' },
      ],
      sprint: [
        { id: 'objective', label: 'Goal', value: 'Clear lines and use core pieces to control the board.' },
        { id: 'mechanic', label: 'Mechanic', value: 'Clearing any marked carrier cell triggers its item.' },
        { id: 'challenge', label: 'Challenge', value: 'Trigger each item when it can change the board most.' },
      ],
      puzzle: [
        { id: 'objective', label: 'Goal', value: 'Clear every original block from the board.' },
        { id: 'mechanic', label: 'Mechanic', value: 'A fixed queue, two previews, and direct undo support planning.' },
        { id: 'challenge', label: 'Challenge', value: 'Work around anchors while preserving entries and support.' },
      ],
    },
    items: { freeze: 'Freeze', collapse: 'Supergravity', bomb: 'Bomb', multiplier: 'Double' },
    labels: {
      language: 'Language', chinese: 'Chinese', english: 'English', settings: 'Settings', controls: 'Controls', rules: 'Rules', keyboard: 'Keyboard', gameplayControls: 'Gameplay', shortcuts: 'Shortcuts', selectMode: 'Choose a game mode', tagline: 'Transform the way blocks fall.', skipToGame: 'Skip to game', loading: 'TetraMorph is loading', back: 'Back', start: 'Start', okay: 'Got it', continue: 'Continue', returnToPause: 'Return to pause', restart: 'Restart', confirm: 'Confirm', cancel: 'Cancel', playAgain: 'Play again', replay: 'Replay', settingsShortcut: 'Settings', pauseResume: 'Pause', restartConfirm: 'Restart confirmation', undo: 'Undo', move: 'Move', rotate: 'Rotate', softDrop: 'Soft drop', hardDrop: 'Hard drop', volume: 'Volume', soundOn: 'SFX on', soundOff: 'SFX off', soundControls: 'Sound controls', theme: 'Visual theme', currentTheme: 'Current', mineralMist: 'Mineral Mist', deepTide: 'Deep Tide', sunstone: 'Sunstone', turnSoundOn: 'Turn sound effects on', turnSoundOff: 'Turn sound effects off', motion: 'Motion', reducedMotionOn: 'Reduced motion', reducedMotionOff: 'Full motion', turnReducedMotionOn: 'Turn reduced motion on', turnReducedMotionOff: 'Turn reduced motion off', score: 'Score', piecesUsed: 'Pieces used', lines: 'Lines', bedrock: 'Bedrock', nextRise: 'Next rise', survivalTime: 'Survival time', aftershock: 'Aftershock', stonefall: 'Until rockfall', level: 'Level', originalBlocks: 'Original blocks', placed: 'Moves', fall: 'Fall speed', classicSpeedRange: 'Fall speed range', startingFallSpeed: 'Opening speed', fastestFallSpeed: 'Fastest speed', appliesNextRun: 'Next run', classicDifficulty: 'Difficulty', classicRelaxed: 'Relaxed', classicStandard: 'Standard', classicChallenge: 'Challenge', core: 'Core', combo: 'Combo', next: 'Next', puzzle: 'Puzzle', selectedPuzzle: 'Selected puzzle', puzzleTraits: 'Puzzle traits', fixedAnchors: 'Fixed anchors', puzzleRoute: 'Open puzzle routes', puzzleBands: 'Puzzle row bands', puzzlePages: 'Level pages', puzzleIntro: 'Intro', puzzleEasy: 'Easy', puzzleHard: 'Hard', mastery: 'Technique mastery', hardUnlockHint: 'Hard puzzles unlock through mastery scores in related Easy puzzles.', modeHome: 'Back to home', currentRecord: 'Current record', notCompleted: 'Not completed', best: 'Best', leaderboard: 'This mode', resultLeaderboard: 'Leaderboard', noRecords: 'No records yet', currentRun: 'This run', currentRunMissedLeaderboard: 'Outside the top 5', resultSummary: 'Run result', pauseTitle: 'Paused', pauseHint: 'Press Enter to continue', restartTitle: 'Restart', restartHint: 'Enter to confirm; R to cancel', undoTitle: 'Undo last move?', leaveTitle: 'Leave this run?', leaveRun: 'Back to home', leavePuzzle: 'Back to puzzle library', resultTitle: 'Run complete', gamePanel: 'game panel', gameArea: 'game area', board: 'game board', twoUpcoming: 'Two upcoming pieces: 1 is next; 2 follows it', nextPiece: 'Next piece', followingPiece: 'Following piece', touchControls: 'Touch controls', puzzleTouchControls: 'Puzzle touch controls', touchGestureHint: 'Touch: tap to rotate; swipe sideways to move; swipe down to soft-drop or hard-drop.', mutationStatus: 'Mutation status', mutationActive: 'Active', mutationIdle: 'No active mutation', superMultiplier: 'Super Double ×4', waitingForCore: 'Waiting for a core piece', carrierCore: 'Core', pendingRise: 'Rising next', pausedMessage: 'Run paused.', resumedMessage: 'Run resumed.', undoMessage: 'Last placement undone.', targetReached: 'Goal reached.', runEnded: 'Run ended.', runStarted: 'TetraMorph started.', modeData: 'mode data', moveLeft: 'Move left', moveRight: 'Move right', stay: 'Stay in this run', select: 'Select', switch: 'Move between controls', activate: 'Activate',
    },
    phrasing: {
      elapsed: (minutes, seconds) => `${minutes}m ${seconds}s`,
      cadence: (seconds) => `${seconds} s/cell`,
      seconds: (seconds) => `${seconds}s`,
      rockfallPieces: (pieces) => `${pieces} pc`,
      lineCount: (lines) => `${lines} lines`,
      pieceCount: (pieces) => `${pieces} pieces`,
      bedrockCount: (rows) => `${rows} bedrock rows`,
      bedrockRise: () => 'Rise',
      minimumMoves: (moves) => `Best ${moves} moves`,
      currentBest: (moves) => `Current best: ${moves} steps`,
      originalBlocks: (remaining, total) => `Original blocks (${remaining}/${total})`,
      modeLeaderboard: (mode) => `${mode} leaderboard`,
      leaderboardCriterion: () => 'Top 5',
      leaderboardSummary: (score, pieces, lines, survival, mutation) => mutation ? `${score} pts  ${pieces} pieces` : survival ? `${lines} lines` : `${score} pts`,
      terminalPuzzleSuccess: (pieces, lines) => ({ title: 'Original blocks cleared', detail: `${pieces} pieces · ${lines} lines` }),
      puzzleCelebration: (outcome, best) => {
        const metric = {
          best: `Current best: ${best} moves`,
          bestLabel: 'Current best',
          bestValue: String(best),
          bestUnit: 'moves',
        };
        if (outcome === 'first') {
          return {
            title: 'Puzzle solved',
            detail: '',
            ...metric,
          };
        }
        if (outcome === 'record') {
          return {
            title: 'New personal best',
            detail: '',
            ...metric,
          };
        }
        return {
          title: 'Puzzle solved',
          detail: '',
          ...metric,
        };
      },
      terminalPuzzleFailure: (remaining, pieces) => ({ title: 'Stacked out', detail: `${remaining} original blocks left · ${pieces} pieces placed` }),
      terminalMutation: () => ({ title: 'Score', detail: '' }),
      terminalSurvival: () => ({ title: 'Survival time', detail: '' }),
      terminalClassic: () => ({ title: 'Lines', detail: '' }),
      selectedPuzzle: (name) => `Selected puzzle: ${name}`,
      puzzleBoard: (name) => `${name} board outline`,
      startPuzzle: (name) => `Start ${name}`,
      puzzleList: (count) => `${count} open puzzle routes`,
      puzzleCategory: (category, count) => `${category}, ${count} levels`,
      masteryThreshold: (technique, prerequisite, required, best) => best === null
        ? `Finish “${prerequisite}” in ${required} moves or fewer to master “${technique}”.`
        : best <= required
          ? `“${technique}” mastered in “${prerequisite}” with ${best} moves.`
          : `Current “${prerequisite}” best: ${best}; reach ${required} moves to master “${technique}”.`,
      rowBand: (rows) => `${rows}-row puzzle`,
      levelNode: (index, name, rows, complete, unlocked, best) => `${index} ${name}, ${rows}-row puzzle${complete ? ', completed' : unlocked ? ', ready' : ', locked'}${best !== null ? `, best ${best} moves` : ''}`,
      boardLabel: 'TetraMorph 10 by 20 game board',
      eventLinesCleared: (count) => `${count} lines cleared.`,
      eventBedrockRaised: (height) => `Bedrock rose to ${height} rows.`,
      eventBedrockLowered: (height) => `Bedrock fell to ${height} rows.`,
      eventItemTriggered: (item, seconds) => `${item} activated for ${seconds} seconds.`,
      eventSupergravityTriggered: (item, pieces) => `${item} activated for the next ${pieces} pieces.`,
      mutationTimer: (item, seconds) => `${item}: ${seconds}s`,
      mutationPieces: (item, pieces) => `${item} · ${pieces} pieces left`,
      mutationPreview: (piece, item) => `${piece} piece carrying ${item}`,
      puzzleLesson: (technique) => ({
        'complete-row': { title: 'Finish one row first', body: 'Close the nearest prepared row; the clear creates room for every choice after it.' },
        'preserve-well': { title: 'Keep the well open', body: 'Do not cap a narrow channel before the matching long or vertical body arrives.' },
        'build-support': { title: 'Build support first', body: 'Level the support before capping it; an unsupported cap buries a hole.' },
        'avoid-hole': { title: 'Do not bury space', body: 'Check below the piece before locking; a covered cell usually costs several later clears.' },
        'read-queue': { title: 'Plan both pieces', body: 'Choose piece 2’s opening first, then use piece 1 to preserve its support and entry.' },
        'retain-opening': { title: 'Flatten, keep an entry', body: 'Reduce height without sealing the only route into the remaining target space.' },
        'edge-to-centre': { title: 'Work from shoulders inward', body: 'Lower the side peaks first while preserving a level support for the centre clears.' },
        'split-lanes': { title: 'Assign both lanes', body: 'Plan the current and next pieces across separate lanes so filling one does not seal the other.' },
        'choose-gate': { title: 'Choose for the continuation', body: 'When two landings look safe, keep the opening compatible with the next piece.' },
        'anchor-side-slip': { title: 'Side-slip past the anchor', body: 'Soft-drop beside the anchor, then move immediately into a landing a straight drop cannot reach.' },
      })[technique],
    },
  },
};

export function appCopy(language: AppLanguage): Translation {
  return COPY[language];
}

export function modeCopy(language: AppLanguage, mode: GameMode): ModeCopy {
  return COPY[language].modes[mode];
}

export function modeRules(language: AppLanguage, mode: GameMode): readonly RuleFact[] {
  return COPY[language].rules[mode];
}

export function modeIntroRules(language: AppLanguage, mode: GameMode): readonly IntroRuleFact[] {
  return COPY[language].introRules[mode];
}

export function modeRulesTitle(language: AppLanguage, mode: GameMode): string {
  const translation = COPY[language];
  const modeLabel = translation.modes[mode].label;
  return language === 'zh-CN'
    ? `${modeLabel}${translation.labels.rules}`
    : `${modeLabel} ${translation.labels.rules}`;
}

export function itemLabel(language: AppLanguage, item: MutationItem): string {
  return COPY[language].items[item];
}

export function puzzleDisplayName(language: AppLanguage, id: PuzzleId, fallback: string): string {
  return language === 'en' ? ENGLISH_LEVEL_NAMES[id] : fallback;
}

export function initialLanguage(preferredLanguage: string | null | undefined): AppLanguage {
  return preferredLanguage?.toLowerCase().startsWith('en') ? 'en' : DEFAULT_LANGUAGE;
}

export function parseLanguage(value: string | null | undefined): AppLanguage | null {
  return value === 'zh-CN' || value === 'en' ? value : null;
}

export function formatNumber(value: number, language: AppLanguage): string {
  return Math.max(0, value).toLocaleString(language);
}

export function formatDate(isoDate: string, language: AppLanguage): string {
  const [date] = isoDate.split('T');
  return language === 'en' ? date ?? '' : (date ?? '').replaceAll('-', '.');
}
