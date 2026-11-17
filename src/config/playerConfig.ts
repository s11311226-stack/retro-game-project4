import type { KeyBindingConfig, PlayerStatsConfig } from '../types';

export const LOGICAL_WIDTH = 640;
export const LOGICAL_HEIGHT = 360;

export const WORLD_BOUNDS = {
  width: 1280,
  height: 360,
  floorY: 312,
  floorHeight: 48,
};

/**
 * 可調整的角色速度、跳躍力度、攻擊範圍及 128x128 畫布對獨立碰撞箱設定
 */
export const DEFAULT_PLAYER_CONFIG: PlayerStatsConfig = {
  spriteCanvasSize: {
    width: 128,
    height: 128,
  },
  // 128x128 角色畫布中，實際物理碰撞箱僅占中央偏下 28x64 區域，不直接使用整張 128x128 作為碰撞箱
  collider: {
    width: 28,
    height: 64,
    offsetX: 50, // (128 - 28) / 2
    offsetY: 64, // 底部對齊畫布底端 128 (64 + 64 = 128)
  },
  moveSpeed: 150,
  sprintSpeed: 240, // Shift 奔跑速度 (1.6x moveSpeed)
  maxStamina: 100,
  staminaDrainRate: 25, // 奔跑每秒消耗 25 點耐力 (可連續奔跑 4 秒)
  staminaRegenRate: 20, // 慢走或待機每秒恢復 20 點耐力 (5 秒全滿)
  exhaustionRecoveryThreshold: 25, // 耗盡後需恢復至 25 點方可再度奔跑
  noiseRadiusWalk: 60, // 正常步行聲音偵測半徑
  noiseRadiusRun: 150, // 衝刺奔跑聲音偵測半徑
  blockMoveSpeed: 0,
  jumpVelocity: -330,
  gravityY: 900,
  maxFallSpeed: 500,
  maxJumps: 1,
  attackTiming: {
    startupMs: 90,   // 起手前搖
    activeMs: 120,   // 有效攻擊判定視窗
    recoveryMs: 140, // 收招後搖
    cooldownMs: 200, // 收招完成後的冷卻時間
  },
  attackHitbox: {
    width: 42,
    height: 36,
    reachX: 26,  // 從角色中心往朝向方向延伸距離
    offsetY: -6, // 相對角色碰撞箱中心的垂直偏移
  },
};

/**
 * 可調整的鍵盤與滑鼠操作設定
 */
export const DEFAULT_KEY_BINDINGS: KeyBindingConfig = {
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  jump: ['KeyW', 'Space', 'ArrowUp'],
  attack: ['KeyJ', 'KeyZ'],
  block: ['KeyK', 'KeyX'],
  interact: ['KeyE'],
  inventory: ['KeyI', 'Tab'],
  map: ['KeyM'],
  pause: ['KeyP', 'Escape'],
  enableMouseCombat: true,
};
