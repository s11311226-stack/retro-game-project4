import Phaser from 'phaser';
import type {
  ICharacterVisualAdapter,
  PlayerStateSnapshot,
  PlayerStatsConfig,
} from '../types';

/**
 * 測試用途占位角色渲染器 (PlaceholderCharacterRenderer)
 *
 * 明確標示為「TEST PLACEHOLDER / 128x128 CANVAS」，不宣稱為正式角色美術。
 * 同時視覺化展示：
 * 1. 128x128 角色設計畫布外框 (虛線/半透明框)
 * 2. 獨立的物理碰撞箱 (Collider Box，28x64)
 * 3. 角色朝向 (Facing Arrow / Visor) 與各狀態視覺回饋 (Idle, Move, Jump, Attack Startup/Active/Recovery, Block)
 * 4. 攻擊有效時間內的判定框 (Active Attack Hitbox)
 *
 * 未來若有正式 SpriteSheet 素材，只需實作 `ICharacterVisualAdapter` 即可直接替換此類別。
 */
export class PlaceholderCharacterRenderer implements ICharacterVisualAdapter {
  public readonly isPlaceholderAsset = true;
  public readonly assetLabel = 'TEST PLACEHOLDER (128x128 Canvas / Custom Hitbox)';

  private scene: Phaser.Scene;
  private config: PlayerStatsConfig;
  private graphics: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text;
  private stateTagText: Phaser.GameObjects.Text;
  private showCanvasDebug = true;

  constructor(scene: Phaser.Scene, config: PlayerStatsConfig) {
    this.scene = scene;
    this.config = config;
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(20);

    this.labelText = this.scene.add
      .text(0, 0, '[PLACEHOLDER 128x128]', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#94a3b8',
        backgroundColor: '#0f172acc',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setDepth(21);

    this.stateTagText = this.scene.add
      .text(0, 0, 'IDLE', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#f8fafc',
        backgroundColor: '#1e293bdd',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setDepth(21);
  }

  public setShowCanvasDebug(visible: boolean): void {
    this.showCanvasDebug = visible;
    this.labelText.setVisible(visible);
  }

  public syncVisuals(snapshot: PlayerStateSnapshot): void {
    const g = this.graphics;
    g.clear();

    const { spriteCanvasSize, collider } = this.config;

    // 由角色物理碰撞箱底部中心 (snapshot.x, snapshot.y) 反推 128x128 畫布左上角座標
    const colliderLeft = snapshot.x - collider.width / 2;
    const colliderTop = snapshot.y - collider.height;
    const canvasLeft = colliderLeft - collider.offsetX;
    const canvasTop = colliderTop - collider.offsetY;

    // 1. 繪製 128x128 角色設計畫布基準框 (清楚標示畫布範圍與獨立碰撞箱的差異)
    if (this.showCanvasDebug) {
      g.lineStyle(1, 0x475569, 0.55);
      g.strokeRect(
        Math.round(canvasLeft),
        Math.round(canvasTop),
        spriteCanvasSize.width,
        spriteCanvasSize.height
      );
    }

    // 2. 根據角色狀態決定占位人形與姿態配色
    let bodyColor = 0x38bdf8; // 預設待機藍
    let outlineColor = 0xe0f2fe;

    if (snapshot.state === 'move') {
      bodyColor = 0x22d3ee;
    } else if (snapshot.state === 'jump') {
      bodyColor = 0xa855f7;
    } else if (snapshot.state === 'block') {
      bodyColor = 0x3b82f6;
      outlineColor = 0x93c5fd;
    } else if (snapshot.state === 'attack') {
      if (snapshot.attackPhase === 'startup') {
        bodyColor = 0xfacc15; // 起手黃色預警
      } else if (snapshot.attackPhase === 'active') {
        bodyColor = 0xef4444; // 有效判定紅色
      } else {
        bodyColor = 0xf97316; // 收招橘色
      }
    }

    // 3. 繪製獨立物理碰撞箱 (Collider Box) 與占位角色剪影
    const cx = Math.round(colliderLeft);
    const cy = Math.round(colliderTop);
    const cw = collider.width;
    const ch = collider.height;

    // 角色軀幹與頭部占位結構 (而非單純一塊無標示方塊)
    g.fillStyle(bodyColor, 0.35);
    g.fillRect(cx, cy, cw, ch);

    // 獨立碰撞箱邊框 (綠色代表物理碰撞邊界)
    g.lineStyle(1, 0x4ade80, 0.9);
    g.strokeRect(cx, cy, cw, ch);

    // 繪製占位角色人形結構 (頭部、身體、朝向面罩)
    const dirSign = snapshot.facing === 'right' ? 1 : -1;
    const headRadius = 9;
    const headCenterX = Math.round(snapshot.x);
    const headCenterY = cy + 12;

    g.fillStyle(bodyColor, 0.9);
    g.lineStyle(1, outlineColor, 1);
    g.fillCircle(headCenterX, headCenterY, headRadius);
    g.strokeCircle(headCenterX, headCenterY, headRadius);

    // 朝向面罩 / 視線指示器
    g.fillStyle(0x0f172a, 1);
    g.fillRect(headCenterX + (dirSign > 0 ? 1 : -7), headCenterY - 3, 6, 4);

    // 身體中段與披風/制服輪廓
    g.fillStyle(bodyColor, 0.85);
    g.fillRect(cx + 4, cy + 22, cw - 8, ch - 34);

    // 雙腳動態示意
    const stride =
      snapshot.state === 'move'
        ? Math.sin(this.scene.time.now * 0.018) * 5
        : 0;
    g.fillStyle(0xcbd5e1, 0.9);
    g.fillRect(headCenterX - 7 + stride, cy + ch - 12, 5, 12);
    g.fillRect(headCenterX + 2 - stride, cy + ch - 12, 5, 12);

    // 朝向箭頭標記
    const arrowTipX = Math.round(snapshot.x + dirSign * (cw / 2 + 8));
    const arrowY = cy + Math.round(ch * 0.45);
    g.fillStyle(0xf8fafc, 0.9);
    g.fillTriangle(
      arrowTipX,
      arrowY,
      arrowTipX - dirSign * 6,
      arrowY - 4,
      arrowTipX - dirSign * 6,
      arrowY + 4
    );

    // 4. 繪製格擋護盾視覺效果
    if (snapshot.state === 'block') {
      const shieldX = Math.round(snapshot.x + dirSign * (cw / 2 + 6));
      const shieldTop = cy + 6;
      const shieldHeight = ch - 10;
      g.fillStyle(0x60a5fa, 0.65);
      g.lineStyle(2, 0xdbeafe, 1);
      g.fillRect(shieldX - 3, shieldTop, 6, shieldHeight);
      g.strokeRect(shieldX - 3, shieldTop, 6, shieldHeight);
    }

    // 5. 繪製攻擊階段視覺與有效判定框 (Hitbox)
    if (snapshot.state === 'attack') {
      if (snapshot.attackPhase === 'startup') {
        // 起手蓄力光圈
        const chargeX = Math.round(snapshot.x - dirSign * 8);
        const chargeY = cy + Math.round(ch * 0.45);
        g.lineStyle(2, 0xfacc15, 0.9);
        g.strokeCircle(chargeX, chargeY, 8);
      } else if (
        snapshot.attackPhase === 'active' &&
        snapshot.activeAttackHitbox
      ) {
        // 有效攻擊判定框 (僅在 active 階段產生！)
        const hb = snapshot.activeAttackHitbox;
        g.fillStyle(0xef4444, 0.45);
        g.lineStyle(2, 0xfca5a5, 1);
        g.fillRect(
          Math.round(hb.x),
          Math.round(hb.y),
          Math.round(hb.width),
          Math.round(hb.height)
        );
        g.strokeRect(
          Math.round(hb.x),
          Math.round(hb.y),
          Math.round(hb.width),
          Math.round(hb.height)
        );
      } else if (snapshot.attackPhase === 'recovery') {
        // 收招殘影線
        const recoverX = Math.round(snapshot.x + dirSign * 18);
        const recoverY = cy + Math.round(ch * 0.5);
        g.lineStyle(1, 0xf97316, 0.75);
        g.strokeCircle(recoverX, recoverY, 6);
      }
    }

    // 6. 更新頭頂狀態標籤與占位說明
    const phaseSuffix =
      snapshot.state === 'attack'
        ? `:${snapshot.attackPhase.toUpperCase()}`
        : '';
    const facingTag = snapshot.facing === 'right' ? 'R' : 'L';
    this.stateTagText.setText(
      `${snapshot.state.toUpperCase()}${phaseSuffix} [${facingTag}]`
    );
    this.stateTagText.setPosition(Math.round(snapshot.x), cy - 4);

    this.labelText.setPosition(Math.round(snapshot.x), Math.round(canvasTop) - 2);
  }

  public destroy(): void {
    this.graphics.destroy();
    this.labelText.destroy();
    this.stateTagText.destroy();
  }
}
