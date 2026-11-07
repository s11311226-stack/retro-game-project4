import Phaser from 'phaser';
import type {
  IInteractableVisualAdapter,
  InteractableDefinition,
} from '../types';

/**
 * 可替換的互動物件占位渲染與點擊區域元件 (InteractablePlaceholderRenderer)
 *
 * 1. 為每個互動物件繪製明確的像素風格占位圖形（校門、教室木門、公告欄、課桌、黑板、入學通知、失蹤海報、校務文件、鑰匙道具）
 * 2. 提供滑鼠懸停與左鍵點擊選取支援
 * 3. 當玩家進入有效互動範圍時，在物件上方顯示 `[E] 互動提示` 與高亮外框
 * 4. 實作 `IInteractableVisualAdapter` 介面，保留未來直接替換為正式像素美術精靈圖的彈性
 */
export class InteractablePlaceholderRenderer implements IInteractableVisualAdapter {
  public readonly isPlaceholderAsset = true;

  private scene: Phaser.Scene;
  private def: InteractableDefinition;
  private graphics: Phaser.GameObjects.Graphics;
  private nameLabel: Phaser.GameObjects.Text;
  private promptLabel: Phaser.GameObjects.Text;
  private hitZone: Phaser.GameObjects.Zone;

  private hovered = false;

  constructor(
    scene: Phaser.Scene,
    def: InteractableDefinition,
    onMouseClick: (def: InteractableDefinition) => void
  ) {
    this.scene = scene;
    this.def = def;

    this.graphics = this.scene.add.graphics().setDepth(10);

    const topY = def.y - def.height;

    this.nameLabel = this.scene.add
      .text(def.x, topY - 4, def.name, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#cbd5e1',
        backgroundColor: '#0f172acc',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setDepth(12);

    this.promptLabel = this.scene.add
      .text(def.x, topY - 18, `[E] ${def.promptAction}`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#fef08a',
        backgroundColor: '#1e293bee',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(15)
      .setVisible(false);

    // 建立滑鼠點擊與懸停感應區
    this.hitZone = this.scene.add
      .zone(def.x, def.y - def.height / 2, Math.max(def.width + 12, 36), Math.max(def.height + 12, 36))
      .setInteractive({ useHandCursor: true })
      .setDepth(14);

    this.hitZone.on('pointerover', () => {
      this.hovered = true;
    });
    this.hitZone.on('pointerout', () => {
      this.hovered = false;
    });
    this.hitZone.on(
      'pointerdown',
      (
        pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData
      ) => {
        if (pointer.button === 0) {
          event.stopPropagation();
          onMouseClick(this.def);
        }
      }
    );
  }

  public getDefinition(): InteractableDefinition {
    return this.def;
  }

  public isHovered(): boolean {
    return this.hovered;
  }

  public syncInteractableVisual(
    def: InteractableDefinition,
    state: {
      isCollected: boolean;
      isInRange: boolean;
      isFocused: boolean;
      isHovered: boolean;
    }
  ): void {
    const g = this.graphics;
    g.clear();

    if (state.isCollected) {
      this.nameLabel.setVisible(false);
      this.promptLabel.setVisible(false);
      this.hitZone.disableInteractive();
      return;
    }

    this.nameLabel.setVisible(true);
    const left = Math.round(def.x - def.width / 2);
    const top = Math.round(def.y - def.height);
    const w = def.width;
    const h = def.height;

    // 繪製對應類型的像素占位圖形
    this.drawStyleGraphic(g, def.visualStyle, left, top, w, h);

    // 若滑鼠選取、懸停或在有效互動距離內，繪製高亮提示框
    if (state.isFocused || state.isInRange || state.isHovered) {
      const borderColor = state.isFocused
        ? 0xfacc15
        : state.isInRange
          ? 0x38bdf8
          : 0x94a3b8;
      g.lineStyle(2, borderColor, 0.95);
      g.strokeRect(left - 3, top - 3, w + 6, h + 6);
    }

    // 控制互動提示標籤顯示
    if (state.isInRange) {
      this.promptLabel.setText(`[E / 點擊] ${def.promptAction}`);
      this.promptLabel.setColor('#fef08a');
      this.promptLabel.setVisible(true);
    } else if (state.isFocused || state.isHovered) {
      this.promptLabel.setText(`(請走近) ${def.promptAction}`);
      this.promptLabel.setColor('#93c5fd');
      this.promptLabel.setVisible(true);
    } else {
      this.promptLabel.setVisible(false);
    }
  }

  private drawStyleGraphic(
    g: Phaser.GameObjects.Graphics,
    style: InteractableDefinition['visualStyle'],
    left: number,
    top: number,
    w: number,
    h: number
  ): void {
    switch (style) {
      case 'gate_door': {
        // 鐵欄校門 / 穿堂拱門
        g.fillStyle(0x1e293b, 0.9);
        g.fillRect(left, top, w, h);
        g.lineStyle(2, 0x64748b, 1);
        g.strokeRect(left, top, w, h);
        for (let barX = left + 8; barX < left + w - 4; barX += 10) {
          g.lineBetween(barX, top + 4, barX, top + h);
        }
        break;
      }
      case 'wood_door': {
        // 舊校舍木門與門把、觀察窗
        g.fillStyle(0x451a03, 0.95);
        g.fillRect(left, top, w, h);
        g.lineStyle(2, 0x78350f, 1);
        g.strokeRect(left, top, w, h);
        // 門上小窗
        g.fillStyle(0x0f172a, 0.9);
        g.fillRect(left + 10, top + 12, w - 20, 22);
        g.strokeRect(left + 10, top + 12, w - 20, 22);
        // 銅門把
        g.fillStyle(0xfbbf24, 1);
        g.fillCircle(left + w - 10, top + Math.round(h * 0.55), 3);
        break;
      }
      case 'bulletin_board': {
        // 校園木框公告欄 (離地懸掛 + 雙柱)
        const boardH = Math.round(h * 0.65);
        g.fillStyle(0x3f2e21, 1);
        g.fillRect(left + 6, top + boardH, 6, h - boardH);
        g.fillRect(left + w - 12, top + boardH, 6, h - boardH);
        g.fillStyle(0x14532d, 0.95);
        g.lineStyle(3, 0x78350f, 1);
        g.fillRect(left, top, w, boardH);
        g.strokeRect(left, top, w, boardH);
        // 布告紙張細節
        g.fillStyle(0xfef3c7, 0.9);
        g.fillRect(left + 10, top + 8, 18, 22);
        g.fillRect(left + 34, top + 10, 22, 16);
        g.fillStyle(0xfca5a5, 0.9);
        g.fillRect(left + 62, top + 8, 20, 24);
        break;
      }
      case 'desk': {
        // 學生木製課桌椅
        g.fillStyle(0x78350f, 0.95);
        g.fillRect(left, top, w, 10);
        g.fillStyle(0x451a03, 0.95);
        g.fillRect(left + 4, top + 10, w - 8, 12);
        g.fillRect(left + 6, top + 22, 5, h - 22);
        g.fillRect(left + w - 11, top + 22, 5, h - 22);
        break;
      }
      case 'blackboard': {
        // 教室大型黑板 (懸掛於牆面高度)
        const boardTop = top - 28;
        g.fillStyle(0x064e3b, 0.95);
        g.lineStyle(3, 0x713f12, 1);
        g.fillRect(left, boardTop, w, 58);
        g.strokeRect(left, boardTop, w, 58);
        // 粉筆字跡示意線
        g.lineStyle(1, 0xe2e8f0, 0.6);
        g.lineBetween(left + 14, boardTop + 18, left + w - 24, boardTop + 18);
        g.lineStyle(1, 0xf87171, 0.8);
        g.lineBetween(left + 20, boardTop + 34, left + w - 18, boardTop + 34);
        break;
      }
      case 'paper_note': {
        // 入學通知書紙張
        g.fillStyle(0xfef9c3, 0.95);
        g.lineStyle(1, 0xca8a04, 1);
        g.fillRect(left, top, w, h);
        g.strokeRect(left, top, w, h);
        g.lineStyle(1, 0x713f12, 0.8);
        g.lineBetween(left + 5, top + 8, left + w - 5, top + 8);
        g.lineBetween(left + 5, top + 16, left + w - 5, top + 16);
        break;
      }
      case 'poster': {
        // 失蹤學生尋人海報 (懸貼高度)
        const posterTop = top - 26;
        g.fillStyle(0xfce7f3, 0.92);
        g.lineStyle(2, 0xbe123c, 1);
        g.fillRect(left, posterTop, w, h);
        g.strokeRect(left, posterTop, w, h);
        // 頭像框示意
        g.fillStyle(0x334155, 0.9);
        g.fillRect(left + 7, posterTop + 6, w - 14, 18);
        break;
      }
      case 'folder_doc': {
        // 神祕校務機密檔案夾
        g.fillStyle(0xb45309, 0.95);
        g.lineStyle(1, 0xfde047, 1);
        g.fillRect(left, top + 6, w, h - 6);
        g.strokeRect(left, top + 6, w, h - 6);
        // 紅色機密封條
        g.fillStyle(0xdc2626, 1);
        g.fillRect(left + 6, top + 14, w - 12, 6);
        break;
      }
      case 'key_item': {
        // 可拾取的發光物品/鑰匙
        g.fillStyle(0xfacc15, 0.95);
        g.lineStyle(2, 0xfef08a, 1);
        g.fillCircle(left + Math.round(w / 2), top + Math.round(h / 2), 8);
        g.strokeCircle(left + Math.round(w / 2), top + Math.round(h / 2), 11);
        break;
      }
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.nameLabel.destroy();
    this.promptLabel.destroy();
    this.hitZone.destroy();
  }
}
