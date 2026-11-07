import { DEFAULT_PLAYER_CONFIG } from '../config/playerConfig';
import type {
  AttackSubPhase,
  FacingDirection,
  HitboxRect,
  InputSnapshot,
  PlayerActionState,
  PlayerStateSnapshot,
  PlayerStatsConfig,
} from '../types';

export interface WorldCollisionBounds {
  minX: number;
  maxX: number;
  floorY: number;
}

/**
 * 玩家核心控制器 (與 Phaser 渲染層解耦的狀態機與 2D 側視物理/戰鬥邏輯)
 *
 * 負責：
 * 1. 左右移動與角色朝向轉身 (攻擊期間鎖定朝向，避免揮刀中途反向異常)
 * 2. 跳躍、重力加速度、地面碰撞與連續跳躍限制 (單段跳必須落地才重置)
 * 3. 明確的 5 大狀態機：idle / move / jump / attack / block
 * 4. 攻擊三階段時序：起手 (startup) -> 有效判定 (active) -> 收招 (recovery) 及後續冷卻 (cooldown)
 * 5. 格擋狀態進入與退出，且與攻擊、跳躍互斥不卡死
 * 6. 暫停時完全凍結物理位移、重力與攻擊計時器
 */
export class PlayerController {
  private config: PlayerStatsConfig;
  private bounds: WorldCollisionBounds;

  // 角色「物理碰撞箱中心底部 (feet center)」的世界座標
  private x: number;
  private y: number;
  private vx = 0;
  private vy = 0;

  private facing: FacingDirection = 'right';
  private state: PlayerActionState = 'idle';
  private attackPhase: AttackSubPhase = 'none';

  private isGrounded = false;
  private jumpsUsed = 0;

  private attackTimerMs = 0;
  private cooldownTimerMs = 0;

  private paused = false;

  constructor(
    initialX: number,
    initialY: number,
    bounds: WorldCollisionBounds,
    customConfig?: Partial<PlayerStatsConfig>
  ) {
    this.config = {
      ...DEFAULT_PLAYER_CONFIG,
      ...customConfig,
      spriteCanvasSize: {
        ...DEFAULT_PLAYER_CONFIG.spriteCanvasSize,
        ...customConfig?.spriteCanvasSize,
      },
      collider: {
        ...DEFAULT_PLAYER_CONFIG.collider,
        ...customConfig?.collider,
      },
      attackTiming: {
        ...DEFAULT_PLAYER_CONFIG.attackTiming,
        ...customConfig?.attackTiming,
      },
      attackHitbox: {
        ...DEFAULT_PLAYER_CONFIG.attackHitbox,
        ...customConfig?.attackHitbox,
      },
    };
    this.bounds = { ...bounds };
    this.x = initialX;
    this.y = initialY;
    this.resolveCollisions();
  }

  /**
   * 強制設定玩家於場景中的安全出生座標與朝向（場景切換時確保不懸空、不卡入牆內）
   */
  public setSpawnPosition(x: number, y: number, facing: FacingDirection): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.state = 'idle';
    this.attackPhase = 'none';
    this.attackTimerMs = 0;
    this.resolveCollisions();
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      // 暫停時不清除當前高度與冷卻，但停止輸入反應
    }
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public updateConfig(partial: Partial<PlayerStatsConfig>): void {
    this.config = {
      ...this.config,
      ...partial,
      attackTiming: {
        ...this.config.attackTiming,
        ...partial.attackTiming,
      },
      attackHitbox: {
        ...this.config.attackHitbox,
        ...partial.attackHitbox,
      },
      collider: {
        ...this.config.collider,
        ...partial.collider,
      },
    };
  }

  public getConfig(): PlayerStatsConfig {
    return this.config;
  }

  /**
   * 推進一幀角色邏輯
   * @param dtMs 經過時間 (毫秒)
   * @param input 當前幀輸入快照
   */
  public step(dtMs: number, input: InputSnapshot): PlayerStateSnapshot {
    if (this.paused || dtMs <= 0) {
      return this.getSnapshot();
    }

    const dtSec = dtMs / 1000;

    // 1. 更新攻擊冷卻時間
    if (this.cooldownTimerMs > 0) {
      this.cooldownTimerMs = Math.max(0, this.cooldownTimerMs - dtMs);
    }

    // 2. 更新攻擊狀態機時序 (Startup -> Active -> Recovery -> 結束並進入 Cooldown)
    if (this.state === 'attack') {
      this.attackTimerMs += dtMs;
      const { startupMs, activeMs, recoveryMs, cooldownMs } = this.config.attackTiming;
      const activeEnd = startupMs + activeMs;
      const totalAttackDuration = activeEnd + recoveryMs;

      if (this.attackTimerMs < startupMs) {
        this.attackPhase = 'startup';
      } else if (this.attackTimerMs < activeEnd) {
        this.attackPhase = 'active';
      } else if (this.attackTimerMs < totalAttackDuration) {
        this.attackPhase = 'recovery';
      } else {
        // 攻擊收招完畢，解除攻擊鎖定並開始計算冷卻
        this.attackPhase = 'none';
        this.attackTimerMs = 0;
        this.cooldownTimerMs = cooldownMs;
        this.state = this.isGrounded ? 'idle' : 'jump';
      }
    }

    // 3. 處理狀態轉換與戰鬥/移動指令 (確保攻擊、跳躍與格擋互不衝突卡死)
    const HorizontalDir = (input.moveRight ? 1 : 0) - (input.moveLeft ? 1 : 0);

    if (this.state === 'attack') {
      // 攻擊期間：鎖定朝向；若在地面則水平速度歸零（站立揮擊），若在空中則保留慣性或微幅減速
      if (this.isGrounded) {
        this.vx = 0;
      }
    } else {
      // 非攻擊期間可自由轉向
      if (HorizontalDir < 0) {
        this.facing = 'left';
      } else if (HorizontalDir > 0) {
        this.facing = 'right';
      }

      // 優先檢查是否發動攻擊 (只要不在攻擊中且冷卻完畢，即使原本按住格擋也可主動出招解除格擋，不互卡)
      const canTriggerAttack =
        input.attackJustPressed && this.cooldownTimerMs <= 0;

      if (canTriggerAttack) {
        this.enterAttackState();
      } else if (input.jumpJustPressed && this.canJump()) {
        // 跳躍：若原本在格擋中按下跳躍，自動解除格擋並起跳
        this.vy = this.config.jumpVelocity;
        this.isGrounded = false;
        this.jumpsUsed += 1;
        this.state = 'jump';
        this.vx = HorizontalDir * this.config.moveSpeed;
      } else if (input.blockHeld && this.isGrounded) {
        // 地面按住格擋鍵進入格擋狀態
        this.state = 'block';
        this.vx = HorizontalDir * this.config.blockMoveSpeed;
      } else {
        // 一般移動或待機/空中狀態
        this.vx = HorizontalDir * this.config.moveSpeed;
        if (!this.isGrounded) {
          this.state = 'jump';
        } else if (HorizontalDir !== 0) {
          this.state = 'move';
        } else {
          this.state = 'idle';
        }
      }
    }

    // 4. 應用垂直重力與移動積分
    if (!this.isGrounded || this.vy < 0) {
      this.vy = Math.min(
        this.config.maxFallSpeed,
        this.vy + this.config.gravityY * dtSec
      );
    }

    this.x += this.vx * dtSec;
    this.y += this.vy * dtSec;

    // 5. 邊界與地板碰撞修正
    this.resolveCollisions();

    // 6. 落地後若非攻擊中，重新同步地面狀態 (例如從空中落地時自動從 jump 轉回 idle/move/block)
    if (this.state !== 'attack') {
      if (!this.isGrounded) {
        this.state = 'jump';
      } else if (input.blockHeld) {
        this.state = 'block';
        this.vx = HorizontalDir * this.config.blockMoveSpeed;
      } else if (HorizontalDir !== 0) {
        this.state = 'move';
      } else {
        this.state = 'idle';
      }
    }

    return this.getSnapshot();
  }

  private enterAttackState(): void {
    this.state = 'attack';
    this.attackPhase = 'startup';
    this.attackTimerMs = 0;
    if (this.isGrounded) {
      this.vx = 0;
    }
  }

  private canJump(): boolean {
    return this.isGrounded && this.jumpsUsed < this.config.maxJumps;
  }

  private resolveCollisions(): void {
    const halfWidth = this.config.collider.width / 2;

    // 左右場景邊界限制 (依據角色獨立碰撞箱寬度，而非 128x128 畫布)
    const minCenterX = this.bounds.minX + halfWidth;
    const maxCenterX = this.bounds.maxX - halfWidth;

    if (this.x < minCenterX) {
      this.x = minCenterX;
      if (this.vx < 0) this.vx = 0;
    } else if (this.x > maxCenterX) {
      this.x = maxCenterX;
      if (this.vx > 0) this.vx = 0;
    }

    // 地面碰撞限制 (角色無法穿過地板)
    if (this.y >= this.bounds.floorY) {
      this.y = this.bounds.floorY;
      this.vy = 0;
      this.isGrounded = true;
      this.jumpsUsed = 0;
    } else {
      this.isGrounded = false;
    }
  }

  /**
   * 取得角色獨立物理碰撞箱的世界座標矩形
   */
  public getColliderWorldRect(): HitboxRect {
    const { width, height } = this.config.collider;
    return {
      x: this.x - width / 2,
      y: this.y - height,
      width,
      height,
    };
  }

  /**
   * 計算攻擊判定框 (僅在 state === 'attack' 且 attackPhase === 'active' 時回傳有效矩形)
   */
  public getActiveAttackHitbox(): HitboxRect | null {
    if (this.state !== 'attack' || this.attackPhase !== 'active') {
      return null;
    }

    const { width, height, reachX, offsetY } = this.config.attackHitbox;
    const bodyCenterY = this.y - this.config.collider.height / 2;
    const dirSign = this.facing === 'right' ? 1 : -1;

    const hitboxCenterX = this.x + dirSign * reachX;
    const hitboxCenterY = bodyCenterY + offsetY;

    return {
      x: hitboxCenterX - width / 2,
      y: hitboxCenterY - height / 2,
      width,
      height,
    };
  }

  public getSnapshot(): PlayerStateSnapshot {
    const activeHitbox = this.getActiveAttackHitbox();
    return {
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      facing: this.facing,
      state: this.state,
      attackPhase: this.attackPhase,
      isAttackHitboxActive: activeHitbox !== null,
      activeAttackHitbox: activeHitbox,
      isGrounded: this.isGrounded,
      attackCooldownRemainingMs: this.cooldownTimerMs,
    };
  }
}
