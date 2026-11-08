import Phaser from 'phaser';
import { getNPCScenePlacement } from '../data/npcDialoguesCatalog';
import { globalFontManager } from '../systems/FontManager';
import type {
  IInteractableVisualAdapter,
  InteractableDefinition,
} from '../types';

/**
 * 可替換的互動物件與 NPC 占位渲染與點擊區域元件 (InteractablePlaceholderRenderer)
 *
 * 1. 為每個互動物件繪製明確的像素風格占位圖形（校門、木門、公告欄、課桌、黑板、保險箱、書架、病床、藥櫃、鐘塔擴音器、微縮膠卷機，以及 128×128 基準的 NPC 角色立繪占位）
 * 2. 所有物件與 NPC 標籤皆透過 `FontManager` 採用清晰繁體中文 `Noto Sans TC`（>= 12px），避免 `pixelArt: true` 導致文字模糊
 * 3. 已調查過的物件顯示 `✓` 標記與視覺回饋，方便玩家辨識探索進度
 * 4. 實作 `IInteractableVisualAdapter` 介面，保留未來替換為正式像素精靈圖的彈性
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

    this.nameLabel = globalFontManager
      .createCrispText(this.scene, def.x, topY - 4, def.name, 'secondaryHint', {
        color: def.kind === 'npc' ? '#fde68a' : '#e2e8f0',
        backgroundColor: '#0f172add',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(12);

    this.promptLabel = globalFontManager
      .createCrispText(
        this.scene,
        def.x,
        topY - 24,
        `[E] ${def.promptAction}`,
        'secondaryHint',
        {
          color: '#fef08a',
          backgroundColor: '#1e293bf2',
          padding: { x: 5, y: 2 },
          fontStyle: 'bold',
        }
      )
      .setOrigin(0.5, 1)
      .setDepth(15)
      .setVisible(false);

    // 建立滑鼠點擊與懸停感應區
    this.hitZone = this.scene.add
      .zone(
        def.x,
        def.y - def.height / 2,
        Math.max(def.width + 14, 40),
        Math.max(def.height + 14, 40)
      )
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
      isInvestigated?: boolean;
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
    const investigatedPrefix =
      state.isInvestigated && def.kind !== 'portal' ? '✓ ' : '';
    this.nameLabel.setText(`${investigatedPrefix}${def.name}`);
    if (def.kind === 'npc') {
      this.nameLabel.setColor(state.isInvestigated ? '#86efac' : '#fde68a');
    } else {
      this.nameLabel.setColor(state.isInvestigated ? '#a7f3d0' : '#e2e8f0');
    }

    const left = Math.round(def.x - def.width / 2);
    const top = Math.round(def.y - def.height);
    const w = def.width;
    const h = def.height;

    // 繪製對應類型的像素占位圖形
    this.drawStyleGraphic(g, def, left, top, w, h, Boolean(state.isInvestigated));

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
    def: InteractableDefinition,
    left: number,
    top: number,
    w: number,
    h: number,
    isInvestigated: boolean
  ): void {
    const style = def.visualStyle;
    switch (style) {
      case 'gate_door': {
        g.fillStyle(0x1e293b, 0.92);
        g.fillRect(left, top, w, h);
        g.lineStyle(2, 0x64748b, 1);
        g.strokeRect(left, top, w, h);
        for (let barX = left + 8; barX < left + w - 4; barX += 10) {
          g.lineBetween(barX, top + 4, barX, top + h);
        }
        break;
      }
      case 'wood_door': {
        g.fillStyle(0x451a03, 0.95);
        g.fillRect(left, top, w, h);
        g.lineStyle(2, 0x78350f, 1);
        g.strokeRect(left, top, w, h);
        g.fillStyle(0x0f172a, 0.9);
        g.fillRect(left + 10, top + 12, w - 20, 22);
        g.strokeRect(left + 10, top + 12, w - 20, 22);
        g.fillStyle(0xfbbf24, 1);
        g.fillCircle(left + w - 10, top + Math.round(h * 0.55), 3);
        break;
      }
      case 'bulletin_board': {
        const boardH = Math.round(h * 0.65);
        g.fillStyle(0x3f2e21, 1);
        g.fillRect(left + 6, top + boardH, 6, h - boardH);
        g.fillRect(left + w - 12, top + boardH, 6, h - boardH);
        g.fillStyle(0x14532d, 0.95);
        g.lineStyle(3, 0x78350f, 1);
        g.fillRect(left, top, w, boardH);
        g.strokeRect(left, top, w, boardH);
        g.fillStyle(0xfef3c7, 0.9);
        g.fillRect(left + 10, top + 8, 18, 22);
        g.fillRect(left + 34, top + 10, 22, 16);
        g.fillStyle(0xfca5a5, 0.9);
        g.fillRect(left + 62, top + 8, 20, 24);
        break;
      }
      case 'desk': {
        g.fillStyle(0x78350f, 0.95);
        g.fillRect(left, top, w, 10);
        g.fillStyle(0x451a03, 0.95);
        g.fillRect(left + 4, top + 10, w - 8, 12);
        g.fillRect(left + 6, top + 22, 5, h - 22);
        g.fillRect(left + w - 11, top + 22, 5, h - 22);
        break;
      }
      case 'blackboard': {
        const boardTop = top - 28;
        g.fillStyle(0x064e3b, 0.95);
        g.lineStyle(3, 0x713f12, 1);
        g.fillRect(left, boardTop, w, 58);
        g.strokeRect(left, boardTop, w, 58);
        g.lineStyle(1, 0xe2e8f0, 0.6);
        g.lineBetween(left + 14, boardTop + 18, left + w - 24, boardTop + 18);
        g.lineStyle(1, 0xf87171, 0.8);
        g.lineBetween(left + 20, boardTop + 34, left + w - 18, boardTop + 34);
        break;
      }
      case 'paper_note': {
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
        const posterTop = top - 26;
        g.fillStyle(0xfce7f3, 0.92);
        g.lineStyle(2, 0xbe123c, 1);
        g.fillRect(left, posterTop, w, h);
        g.strokeRect(left, posterTop, w, h);
        g.fillStyle(0x334155, 0.9);
        g.fillRect(left + 7, posterTop + 6, w - 14, 18);
        break;
      }
      case 'folder_doc': {
        g.fillStyle(0xb45309, 0.95);
        g.lineStyle(1, 0xfde047, 1);
        g.fillRect(left, top + 6, w, h - 6);
        g.strokeRect(left, top + 6, w, h - 6);
        g.fillStyle(isInvestigated ? 0x10b981 : 0xdc2626, 1);
        g.fillRect(left + 6, top + 14, w - 12, 6);
        break;
      }
      case 'key_item': {
        g.fillStyle(0xfacc15, 0.95);
        g.lineStyle(2, 0xfef08a, 1);
        g.fillCircle(left + Math.round(w / 2), top + Math.round(h / 2), 8);
        g.strokeCircle(left + Math.round(w / 2), top + Math.round(h / 2), 11);
        break;
      }
      case 'safe_box': {
        // 鋼製暗櫃保險箱
        g.fillStyle(0x1e293b, 0.96);
        g.lineStyle(2, 0x94a3b8, 1);
        g.fillRect(left, top, w, h);
        g.strokeRect(left, top, w, h);
        g.lineStyle(1, 0x475569, 1);
        g.strokeRect(left + 5, top + 5, w - 10, h - 10);
        // 轉盤
        g.fillStyle(0xfbbf24, 1);
        g.fillCircle(left + Math.round(w * 0.42), top + Math.round(h * 0.5), 7);
        g.fillStyle(0x0f172a, 1);
        g.fillCircle(left + Math.round(w * 0.42), top + Math.round(h * 0.5), 3);
        // 把手
        g.fillStyle(0xe2e8f0, 1);
        g.fillRect(left + Math.round(w * 0.68), top + Math.round(h * 0.4), 4, 12);
        break;
      }
      case 'bookshelf': {
        // 高大古籍書櫃
        g.fillStyle(0x3b2314, 0.96);
        g.lineStyle(2, 0x78350f, 1);
        g.fillRect(left, top, w, h);
        g.strokeRect(left, top, w, h);
        const shelfCount = 3;
        const rowH = Math.floor((h - 8) / shelfCount);
        const bookColors = [0x991b1b, 0x1e3a8a, 0x065f46, 0x92400e, 0x581c87];
        for (let r = 0; r < shelfCount; r++) {
          const sy = top + 4 + r * rowH;
          g.fillStyle(0x1c120c, 0.9);
          g.fillRect(left + 4, sy, w - 8, rowH - 3);
          for (let bx = left + 6; bx < left + w - 10; bx += 7) {
            const col = bookColors[(bx + r) % bookColors.length];
            g.fillStyle(col, 0.9);
            g.fillRect(bx, sy + 3, 5, rowH - 7);
          }
        }
        break;
      }
      case 'bed': {
        // 宿舍單人床鋪與枕頭
        g.fillStyle(0x451a03, 1);
        g.fillRect(left, top, 8, h); // 床頭板
        g.fillRect(left + w - 6, top + 10, 6, h - 10); // 床尾板
        g.fillStyle(0xe2e8f0, 0.95);
        g.fillRect(left + 8, top + 12, 20, 10); // 枕頭
        g.fillStyle(0x1e3a8a, 0.95);
        g.fillRect(left + 26, top + 12, w - 32, 14); // 棉被
        g.lineStyle(1, 0x60a5fa, 0.8);
        g.strokeRect(left + 8, top + 12, w - 14, 14);
        break;
      }
      case 'medicine_cabinet': {
        // 保健室玻璃藥品櫃與紅十字標誌
        g.fillStyle(0x0f172a, 0.94);
        g.lineStyle(2, 0x94a3b8, 1);
        g.fillRect(left, top, w, h);
        g.strokeRect(left, top, w, h);
        g.fillStyle(0x1e293b, 0.75);
        g.fillRect(left + 5, top + 6, w - 10, h - 12);
        // 紅十字標誌
        const cx = left + Math.round(w / 2);
        const cy = top + 18;
        g.fillStyle(0xef4444, 1);
        g.fillRect(cx - 7, cy - 2, 14, 4);
        g.fillRect(cx - 2, cy - 7, 4, 14);
        // 藥瓶列
        g.fillStyle(0x38bdf8, 0.85);
        g.fillRect(left + 10, top + h - 28, 6, 12);
        g.fillStyle(0xa78bfa, 0.85);
        g.fillRect(left + 20, top + h - 28, 6, 12);
        g.fillStyle(0x34d399, 0.85);
        g.fillRect(left + 30, top + h - 28, 6, 12);
        break;
      }
      case 'bell_tower': {
        // 鐘塔低頻擴音號角陣列與 18.9Hz 控制台
        g.fillStyle(0x1e293b, 0.95);
        g.lineStyle(2, 0x64748b, 1);
        g.fillRect(left + 10, top + 28, w - 20, h - 28);
        g.strokeRect(left + 10, top + 28, w - 20, h - 28);
        // 擴音號角
        g.fillStyle(0x334155, 1);
        g.fillTriangle(
          left + Math.round(w / 2),
          top + 32,
          left + 4,
          top + 4,
          left + w - 4,
          top + 4
        );
        g.lineStyle(2, 0xf59e0b, 0.9);
        g.strokeCircle(left + Math.round(w / 2), top + 14, 10);
        // 頻率儀表燈
        g.fillStyle(0xef4444, 1);
        g.fillRect(left + 18, top + 42, w - 36, 8);
        break;
      }
      case 'microfilm': {
        // 微縮膠卷閱讀機
        g.fillStyle(0x1e293b, 0.95);
        g.lineStyle(2, 0x64748b, 1);
        g.fillRect(left + 6, top + 8, w - 12, h - 8);
        g.strokeRect(left + 6, top + 8, w - 12, h - 8);
        // 發光投影螢幕
        g.fillStyle(0x38bdf8, 0.85);
        g.fillRect(left + 11, top + 14, w - 22, 22);
        // 頂部膠卷盤
        g.fillStyle(0x94a3b8, 1);
        g.fillCircle(left + 14, top + 5, 5);
        g.fillCircle(left + w - 14, top + 5, 5);
        break;
      }
      case 'npc_character': {
        // 128×128 基準像素角色立繪占位渲染（含各角色專屬配色、髮型、服裝與胸章）
        const placement = getNPCScenePlacement(def.id);
        const coatColor = placement?.palette.coatColor ?? 0x334155;
        const hairColor = placement?.palette.hairColor ?? 0x0f172a;
        const accentColor = placement?.palette.accentColor ?? 0x38bdf8;
        const facingLeft = placement?.facing === 'left';

        const cx = left + Math.round(w / 2);
        const footY = top + h;

        // 地面陰影
        g.fillStyle(0x020617, 0.55);
        g.fillEllipse(cx, footY - 2, w - 4, 8);

        // 雙腿與鞋靴
        g.fillStyle(0x0f172a, 1);
        g.fillRect(cx - 9, footY - 22, 7, 22);
        g.fillRect(cx + 2, footY - 22, 7, 22);

        // 軀幹外套 / 制服 (相容 128x128 比例)
        g.fillStyle(coatColor, 1);
        g.lineStyle(1, accentColor, 0.9);
        g.fillRect(cx - 13, footY - 52, 26, 31);
        g.strokeRect(cx - 13, footY - 52, 26, 31);

        // 領口與角色專屬識別配件 (領帶 / 聽診器 / 圍巾 / 徽章)
        g.fillStyle(accentColor, 1);
        g.fillRect(cx - 3, footY - 50, 6, 15);

        // 頭部與臉龐
        g.fillStyle(0xfde68a, 1);
        g.fillRect(cx - 10, footY - 70, 20, 18);

        // 髮型
        g.fillStyle(hairColor, 1);
        g.fillRect(cx - 11, footY - 74, 22, 7);
        if (facingLeft) {
          g.fillRect(cx + 6, footY - 70, 5, 16);
        } else {
          g.fillRect(cx - 11, footY - 70, 5, 16);
        }

        // 眼神方向
        g.fillStyle(0x0f172a, 1);
        const eyeOffsetX = facingLeft ? -5 : 2;
        g.fillRect(cx + eyeOffsetX, footY - 62, 3, 3);
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
