import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAYER_CONFIG, WORLD_BOUNDS } from '../src/config/playerConfig';
import { PlayerController } from '../src/entities/PlayerController';
import { InputManager } from '../src/systems/InputManager';
import type { InputSnapshot } from '../src/types';

function createIdleInput(overrides?: Partial<InputSnapshot>): InputSnapshot {
  return {
    moveLeft: false,
    moveRight: false,
    jumpJustPressed: false,
    attackJustPressed: false,
    blockHeld: false,
    interactJustPressed: false,
    inventoryJustPressed: false,
    pauseJustPressed: false,
    ...overrides,
  };
}

describe('Phase 1 — 玩家控制與 2D 側視遊戲核心測試', () => {
  const defaultBounds = {
    minX: 0,
    maxX: WORLD_BOUNDS.width,
    floorY: WORLD_BOUNDS.floorY,
  };

  it('1. 獨立碰撞箱設定：128x128 畫布基準下，碰撞箱獨立且不大於精靈圖', () => {
    const controller = new PlayerController(200, WORLD_BOUNDS.floorY, defaultBounds);
    const cfg = controller.getConfig();
    const colliderRect = controller.getColliderWorldRect();

    expect(cfg.spriteCanvasSize.width).toBe(128);
    expect(cfg.spriteCanvasSize.height).toBe(128);
    expect(colliderRect.width).toBe(28);
    expect(colliderRect.height).toBe(64);
    expect(colliderRect.width).toBeLessThan(cfg.spriteCanvasSize.width);
    expect(colliderRect.height).toBeLessThan(cfg.spriteCanvasSize.height);
  });

  it('2. 左右移動與反向轉身，且受場景左右邊界限制', () => {
    const controller = new PlayerController(200, WORLD_BOUNDS.floorY, defaultBounds);

    // 向右移動
    let snap = controller.step(100, createIdleInput({ moveRight: true }));
    expect(snap.x).toBeGreaterThan(200);
    expect(snap.facing).toBe('right');
    expect(snap.state).toBe('move');

    const posAfterRight = snap.x;

    // 反向向左移動與轉身
    snap = controller.step(100, createIdleInput({ moveLeft: true }));
    expect(snap.x).toBeLessThan(posAfterRight);
    expect(snap.facing).toBe('left');
    expect(snap.state).toBe('move');

    // 放開按鍵回到待機
    snap = controller.step(50, createIdleInput());
    expect(snap.state).toBe('idle');
    expect(snap.vx).toBe(0);

    // 持續向左移動不能超出左邊界 (0 + collider.width / 2 = 14)
    for (let i = 0; i < 50; i++) {
      snap = controller.step(100, createIdleInput({ moveLeft: true }));
    }
    expect(snap.x).toBe(DEFAULT_PLAYER_CONFIG.collider.width / 2);

    // 持續向右移動不能超出右邊界 (1280 - collider.width / 2 = 1266)
    for (let i = 0; i < 150; i++) {
      snap = controller.step(100, createIdleInput({ moveRight: true }));
    }
    expect(snap.x).toBe(WORLD_BOUNDS.width - DEFAULT_PLAYER_CONFIG.collider.width / 2);
  });

  it('3. 跳躍、重力落地、連續跳躍限制（禁止無限空中連跳）及無法穿過地板', () => {
    const controller = new PlayerController(200, WORLD_BOUNDS.floorY, defaultBounds);

    // 初始在地面上
    expect(controller.getSnapshot().isGrounded).toBe(true);
    expect(controller.getSnapshot().y).toBe(WORLD_BOUNDS.floorY);

    // 按下跳躍
    let snap = controller.step(16, createIdleInput({ jumpJustPressed: true }));
    expect(snap.isGrounded).toBe(false);
    expect(snap.state).toBe('jump');
    expect(snap.vy).toBeLessThan(0);
    expect(snap.y).toBeLessThan(WORLD_BOUNDS.floorY);

    const vyBeforeDoubleJumpAttempt = snap.vy;

    // 在空中再次按下跳躍：受單段跳限制 (maxJumps = 1)，不應重置上升速度
    snap = controller.step(16, createIdleInput({ jumpJustPressed: true }));
    expect(snap.vy).toBeGreaterThan(vyBeforeDoubleJumpAttempt); // 重力持續將 vy 往正方向拉

    // 持續模擬時間直到落地，驗證不會穿過地板 (y 永遠 <= floorY)
    for (let i = 0; i < 80; i++) {
      snap = controller.step(20, createIdleInput());
      expect(snap.y).toBeLessThanOrEqual(WORLD_BOUNDS.floorY);
    }

    expect(snap.isGrounded).toBe(true);
    expect(snap.y).toBe(WORLD_BOUNDS.floorY);
    expect(snap.state).toBe('idle');

    // 落地後可再次跳躍
    snap = controller.step(16, createIdleInput({ jumpJustPressed: true }));
    expect(snap.isGrounded).toBe(false);
    expect(snap.state).toBe('jump');
  });

  it('4. 攻擊只在有效時間 (Active Phase) 內產生判定框，且具備起手、收招與冷卻時間', () => {
    const controller = new PlayerController(200, WORLD_BOUNDS.floorY, defaultBounds);
    const { startupMs, activeMs, recoveryMs, cooldownMs } =
      DEFAULT_PLAYER_CONFIG.attackTiming;

    // 觸發攻擊：進入 Startup (起手階段，不應有攻擊判定框)
    let snap = controller.step(10, createIdleInput({ attackJustPressed: true }));
    expect(snap.state).toBe('attack');
    expect(snap.attackPhase).toBe('startup');
    expect(snap.isAttackHitboxActive).toBe(false);
    expect(snap.activeAttackHitbox).toBeNull();

    // 推進到 Active 階段 (elapsed = 10 + 90 = 100ms >= startupMs 90ms)
    snap = controller.step(startupMs, createIdleInput());
    expect(snap.state).toBe('attack');
    expect(snap.attackPhase).toBe('active');
    expect(snap.isAttackHitboxActive).toBe(true);
    expect(snap.activeAttackHitbox).not.toBeNull();
    expect(snap.activeAttackHitbox!.x).toBeGreaterThan(snap.x); // 朝右時判定框在角色右側

    // 推進到 Recovery 階段 (elapsed = 100 + 120 = 220ms >= startup + active 210ms)
    snap = controller.step(activeMs, createIdleInput());
    expect(snap.state).toBe('attack');
    expect(snap.attackPhase).toBe('recovery');
    expect(snap.isAttackHitboxActive).toBe(false);
    expect(snap.activeAttackHitbox).toBeNull();

    // 推進到收招結束 (elapsed = 220 + 140 = 360ms >= total 350ms)，進入冷卻
    snap = controller.step(recoveryMs, createIdleInput());
    expect(snap.state).toBe('idle');
    expect(snap.attackPhase).toBe('none');
    expect(snap.attackCooldownRemainingMs).toBe(cooldownMs);

    // 冷卻時間內再次按下攻擊，不應觸發攻擊
    snap = controller.step(20, createIdleInput({ attackJustPressed: true }));
    expect(snap.state).toBe('idle');
    expect(snap.attackCooldownRemainingMs).toBe(cooldownMs - 20);

    // 等冷卻結束後，可再次發動攻擊
    snap = controller.step(cooldownMs, createIdleInput());
    expect(snap.attackCooldownRemainingMs).toBe(0);
    snap = controller.step(10, createIdleInput({ attackJustPressed: true }));
    expect(snap.state).toBe('attack');
  });

  it('5. 格擋與攻擊狀態不會互相卡死（可自由進入退出格擋，格擋中可出招或跳躍，收招後若仍按住格擋可無縫恢復）', () => {
    const controller = new PlayerController(200, WORLD_BOUNDS.floorY, defaultBounds);

    // 按住格擋進入 block 狀態
    let snap = controller.step(16, createIdleInput({ blockHeld: true }));
    expect(snap.state).toBe('block');
    expect(snap.vx).toBe(0);

    // 放開格擋立即回到 idle
    snap = controller.step(16, createIdleInput({ blockHeld: false }));
    expect(snap.state).toBe('idle');

    // 按住格擋時同時按下攻擊：應能順利切入 attack 狀態，不會卡死在 block
    snap = controller.step(16, createIdleInput({ blockHeld: true }));
    expect(snap.state).toBe('block');
    snap = controller.step(
      10,
      createIdleInput({ blockHeld: true, attackJustPressed: true })
    );
    expect(snap.state).toBe('attack');
    expect(snap.attackPhase).toBe('startup');

    // 攻擊完整結束後，若玩家仍然按住格擋鍵，應平滑回到 block 狀態而不卡死
    const totalAttackTime =
      DEFAULT_PLAYER_CONFIG.attackTiming.startupMs +
      DEFAULT_PLAYER_CONFIG.attackTiming.activeMs +
      DEFAULT_PLAYER_CONFIG.attackTiming.recoveryMs;
    snap = controller.step(totalAttackTime, createIdleInput({ blockHeld: true }));
    expect(snap.state).toBe('block');

    // 格擋中按下跳躍：可正常起跳不卡死
    snap = controller.step(
      16,
      createIdleInput({ blockHeld: true, jumpJustPressed: true })
    );
    expect(snap.state).toBe('jump');
    expect(snap.isGrounded).toBe(false);
  });

  it('6. 暫停時角色不會繼續移動、不會掉落，且攻擊計時器凍結', () => {
    const controller = new PlayerController(200, WORLD_BOUNDS.floorY, defaultBounds);

    // 先起跳並向右移動
    let snap = controller.step(
      20,
      createIdleInput({ moveRight: true, jumpJustPressed: true })
    );
    const pausedX = snap.x;
    const pausedY = snap.y;

    // 啟動暫停
    controller.setPaused(true);
    expect(controller.isPaused()).toBe(true);

    // 暫停期間即使傳入移動、跳躍或攻擊指令，位置與狀態皆完全凍結
    snap = controller.step(
      500,
      createIdleInput({
        moveRight: true,
        attackJustPressed: true,
      })
    );
    expect(snap.x).toBe(pausedX);
    expect(snap.y).toBe(pausedY);
    expect(snap.state).toBe('jump');

    // 恢復遊戲後繼續移動
    controller.setPaused(false);
    snap = controller.step(20, createIdleInput({ moveRight: true }));
    expect(snap.x).toBeGreaterThan(pausedX);
  });

  it('7. 遊戲失去焦點 (Window Blur) 後，清除卡住的按鍵與滑鼠輸入，不會持續移動或持續攻擊', () => {
    const inputManager = new InputManager();

    // 模擬玩家按住往右移動、按住格擋並按下滑鼠左鍵攻擊
    inputManager.handleKeyDown('KeyD');
    inputManager.handleKeyDown('KeyK');
    inputManager.handleMouseDown(0);

    // 模擬在尚未讀取該幀快照前（或按住期間）視窗失去焦點
    inputManager.resetAllInputs();

    const snap = inputManager.consumeSnapshot();
    expect(snap.moveRight).toBe(false);
    expect(snap.blockHeld).toBe(false);
    expect(snap.attackJustPressed).toBe(false);

    // 搭配 PlayerController 驗證失焦後角色立即停下且不觸發攻擊
    const controller = new PlayerController(200, WORLD_BOUNDS.floorY, defaultBounds);
    const playerSnap = controller.step(50, snap);
    expect(playerSnap.state).toBe('idle');
    expect(playerSnap.vx).toBe(0);
    expect(playerSnap.isAttackHitboxActive).toBe(false);
  });
});
