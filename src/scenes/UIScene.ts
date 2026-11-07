import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../config/playerConfig';
import { GameEvents, globalEventBus } from '../core/EventBus';
import { globalAudioSynth } from '../systems/AudioSynthManager';
import { globalRelationshipSystem } from '../systems/CharacterRelationshipSystem';
import { globalEvidenceSystem } from '../systems/EvidenceSystem';
import { globalGameState } from '../systems/GlobalGameState';
import { globalQuestSystem } from '../systems/QuestSystem';
import {
  type ActiveStoryDialogueState,
  globalStoryState,
} from '../systems/StoryStateManager';
import type {
  AreaDefinition,
  ClueEntryDef,
  FutureNarrativeMetrics,
  InteractableDefinition,
  InteractionExecutionResult,
  InventoryItemDef,
  PlayerStateSnapshot,
  UIModalState,
} from '../types';

/**
 * 平行運行的 UI 覆蓋層場景 (UIScene)
 *
 * 完整涵蓋：
 * 1. 頂部區域標題、當前目標、角色狀態與存檔提示通知
 * 2. 底部互動提示列 (`[E]` 提示)
 * 3. 劇情演出對話視窗 (`dialogue`)
 * 4. 一般調查 / 拾取視窗 (`inspect`)
 * 5. 文件閱讀介面 (`document`)
 * 6. 隨身背包與調查線索面板 (`inventory`)
 * 7. 暫停選單 (`paused`：內建手動存檔、讀取存檔、BGM/SFX 音量調整、靜音切換、返回主選單)
 * 8. 體驗版通關結算與重新開始畫面 (`ending`)
 */
export class UIScene extends Phaser.Scene {
  private areaHeaderText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private saveToastText!: Phaser.GameObjects.Text;
  private promptBannerText!: Phaser.GameObjects.Text;
  private modalStateBadge!: Phaser.GameObjects.Text;

  private dialogueModal!: Phaser.GameObjects.Container;
  private dialogueChapterText!: Phaser.GameObjects.Text;
  private dialogueSpeakerText!: Phaser.GameObjects.Text;
  private dialogueBodyText!: Phaser.GameObjects.Text;
  private dialogueProgressText!: Phaser.GameObjects.Text;

  private inspectModal!: Phaser.GameObjects.Container;
  private inspectTitleText!: Phaser.GameObjects.Text;
  private inspectBodyText!: Phaser.GameObjects.Text;
  private inspectFooterText!: Phaser.GameObjects.Text;

  private documentModal!: Phaser.GameObjects.Container;
  private docTitleText!: Phaser.GameObjects.Text;
  private docSubtitleText!: Phaser.GameObjects.Text;
  private docBodyText!: Phaser.GameObjects.Text;
  private docMutatedBannerText!: Phaser.GameObjects.Text;
  private docClueBadgeText!: Phaser.GameObjects.Text;

  private inventoryModal!: Phaser.GameObjects.Container;
  private inventoryHeaderText!: Phaser.GameObjects.Text;
  private inventoryListText!: Phaser.GameObjects.Text;
  private cluesListText!: Phaser.GameObjects.Text;
  private inventoryViewMode: 'classic' | 'phase6a' = 'classic';

  private endingModal!: Phaser.GameObjects.Container;
  private endingSummaryText!: Phaser.GameObjects.Text;

  private anomalyFlickerOverlay!: Phaser.GameObjects.Rectangle;

  private transitionBanner!: Phaser.GameObjects.Container;
  private transitionText!: Phaser.GameObjects.Text;

  private pauseOverlay!: Phaser.GameObjects.Container;
  private pauseAudioInfoText!: Phaser.GameObjects.Text;

  private unsubscribers: Array<() => void> = [];
  private inventoryItems: InventoryItemDef[] = [];
  private cluesList: ClueEntryDef[] = [];

  constructor() {
    super({ key: 'UIScene' });
  }

  public create(): void {
    // 1. 頂部標題與當前區域顯示
    this.areaHeaderText = this.add
      .text(8, 5, '《無名校區》載入中...', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#fcd34d',
        backgroundColor: '#020617dd',
        padding: { x: 5, y: 2 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    // 右上角當前 UI 狀態指標 + 背包快捷按鈕
    this.modalStateBadge = this.add
      .text(LOGICAL_WIDTH - 8, 5, 'UI: EXPLORE [按 I 開啟背包]', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#a7f3d0',
        backgroundColor: '#064e3bdd',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true });

    this.modalStateBadge.on('pointerdown', () => {
      globalEventBus.emit(GameEvents.UI_REQUEST_TOGGLE_INVENTORY);
    });

    // 2. 操作說明列
    this.add
      .text(
        8,
        23,
        '移動:[A/D] 跳躍:[W/Space] 互動:[E/點擊] 背包:[I/Tab] 攻擊:[J/左鍵] 格擋:[K/右鍵] 暫停/存檔/音量:[P/Esc]',
        {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#cbd5e1',
          backgroundColor: '#020617bb',
          padding: { x: 4, y: 2 },
        }
      )
      .setScrollFactor(0)
      .setDepth(100);

    // 3. 角色即時物理與狀態面板
    this.statusText = this.add
      .text(8, 40, '', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#38bdf8',
        backgroundColor: '#020617bb',
        padding: { x: 4, y: 2 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    // 4. 體驗版章節目標列
    this.objectiveText = this.add
      .text(8, 57, `📖 ${globalStoryState.getCurrentObjective()}`, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#fde68a',
        backgroundColor: '#1e1b4bcc',
        padding: { x: 4, y: 2 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    // 5. 存檔/讀檔狀態提示 Toast
    this.saveToastText = this.add
      .text(LOGICAL_WIDTH - 8, 25, '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#4ade80',
        backgroundColor: '#020617ee',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(145)
      .setVisible(false);

    // 6. 底部互動提示橫幅
    this.promptBannerText = this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 8, '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#fef08a',
        backgroundColor: '#0f172aee',
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    // 7. 溫和、不影響可讀性的異常閃爍遮罩 (最高透明度僅 0.28)
    this.anomalyFlickerOverlay = this.add
      .rectangle(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
        LOGICAL_WIDTH,
        LOGICAL_HEIGHT,
        0xdc2626,
        0
      )
      .setScrollFactor(0)
      .setDepth(135)
      .setVisible(false);

    // 8. 建立各類專用互動與劇情視窗
    this.createDialogueModal();
    this.createInspectModal();
    this.createDocumentModal();
    this.createInventoryModal();
    this.createEndingModal();
    this.createTransitionBanner();
    this.createPauseOverlay();

    // 9. 訂閱跨場景事件
    this.unsubscribers.push(
      globalEventBus.on<{ area: AreaDefinition }>(
        GameEvents.AREA_CHANGED,
        ({ area }) => {
          this.areaHeaderText.setText(
            `📍 ${area.title} | ${globalStoryState.getChapterTitle()}`
          );
        }
      ),
      globalEventBus.on<PlayerStateSnapshot>(
        GameEvents.PLAYER_STATE_CHANGED,
        (snap) => {
          this.updateStatusDisplay(snap);
        }
      ),
      globalEventBus.on<string>(
        GameEvents.STORY_OBJECTIVE_UPDATED,
        (objText) => {
          this.objectiveText.setText(`📖 ${objText}`);
        }
      ),
      globalEventBus.on<string>(
        GameEvents.SAVE_STATUS_NOTIFICATION,
        (toastMsg) => {
          this.showSaveToast(toastMsg);
        }
      ),
      globalEventBus.on<ActiveStoryDialogueState | null>(
        GameEvents.STORY_DIALOGUE_UPDATED,
        (dialogueState) => {
          this.updateDialogueModal(dialogueState);
        }
      ),
      globalEventBus.on(GameEvents.STORY_ANOMALY_FLICKER, () => {
        this.playVisualFlickerEffect();
      }),
      globalEventBus.on<{
        chapterTitle: string;
        clues: ClueEntryDef[];
        items: InventoryItemDef[];
        metrics: FutureNarrativeMetrics;
        endingRouteId: string;
      }>(GameEvents.STORY_ENTER_ENDING, (payload) => {
        this.populateEndingScreen(payload);
      }),
      globalEventBus.on<{
        inRangeCandidate: InteractableDefinition | null;
        selectedObject: InteractableDefinition | null;
      }>(
        GameEvents.INTERACTION_PROMPT_CHANGED,
        ({ inRangeCandidate, selectedObject }) => {
          this.updatePromptBanner(inRangeCandidate, selectedObject);
        }
      ),
      globalEventBus.on<{
        modalState: UIModalState;
        result: InteractionExecutionResult | null;
      }>(GameEvents.UI_MODAL_CHANGED, ({ modalState, result }) => {
        this.applyModalState(modalState, result);
      }),
      globalEventBus.on<InventoryItemDef[]>(
        GameEvents.INVENTORY_UPDATED,
        (items) => {
          this.inventoryItems = items;
          this.refreshInventoryContent();
        }
      ),
      globalEventBus.on<ClueEntryDef[]>(GameEvents.CLUES_UPDATED, (clues) => {
        this.cluesList = clues;
        this.refreshInventoryContent();
      }),
      globalEventBus.on<boolean>(GameEvents.GAME_PAUSE_CHANGED, (isPaused) => {
        this.refreshPauseAudioInfo();
        this.pauseOverlay.setVisible(isPaused);
      })
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribers.forEach((unsub) => unsub());
      this.unsubscribers = [];
    });
  }

  private showSaveToast(msg: string): void {
    this.saveToastText.setText(msg);
    this.saveToastText.setVisible(true);
    this.saveToastText.setAlpha(1);
    this.tweens.killTweensOf(this.saveToastText);
    this.tweens.add({
      targets: this.saveToastText,
      alpha: 0,
      delay: 1800,
      duration: 400,
      onComplete: () => {
        this.saveToastText.setVisible(false);
      },
    });
  }

  private createDialogueModal(): void {
    const boxBg = this.add
      .rectangle(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT - 64,
        580,
        104,
        0x090d16,
        0.96
      )
      .setStrokeStyle(2, 0xfacc15)
      .setInteractive({ useHandCursor: true });

    boxBg.on('pointerdown', () => {
      globalEventBus.emit(GameEvents.UI_REQUEST_ADVANCE_DIALOGUE);
    });

    this.dialogueChapterText = this.add.text(
      LOGICAL_WIDTH / 2 - 276,
      LOGICAL_HEIGHT - 108,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#94a3b8',
      }
    );

    this.dialogueSpeakerText = this.add.text(
      LOGICAL_WIDTH / 2 - 276,
      LOGICAL_HEIGHT - 94,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#fcd34d',
      }
    );

    this.dialogueBodyText = this.add.text(
      LOGICAL_WIDTH / 2 - 276,
      LOGICAL_HEIGHT - 74,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#f8fafc',
        wordWrap: { width: 550 },
        lineSpacing: 5,
      }
    );

    this.dialogueProgressText = this.add
      .text(
        LOGICAL_WIDTH / 2 + 276,
        LOGICAL_HEIGHT - 18,
        '按 [E] / [Space] 或點擊繼續 ▶',
        {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#fef08a',
        }
      )
      .setOrigin(1, 1);

    this.dialogueModal = this.add
      .container(0, 0, [
        boxBg,
        this.dialogueChapterText,
        this.dialogueSpeakerText,
        this.dialogueBodyText,
        this.dialogueProgressText,
      ])
      .setDepth(128)
      .setVisible(false);
  }

  private createInspectModal(): void {
    const backdrop = this.add
      .rectangle(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
        460,
        160,
        0x0f172a,
        0.95
      )
      .setStrokeStyle(2, 0x38bdf8)
      .setInteractive();

    backdrop.on('pointerdown', () => {
      globalEventBus.emit(GameEvents.UI_REQUEST_CLOSE_MODAL);
    });

    this.inspectTitleText = this.add.text(
      LOGICAL_WIDTH / 2 - 210,
      LOGICAL_HEIGHT / 2 - 64,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#fcd34d',
      }
    );

    this.inspectBodyText = this.add.text(
      LOGICAL_WIDTH / 2 - 210,
      LOGICAL_HEIGHT / 2 - 36,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#f1f5f9',
        wordWrap: { width: 420 },
        lineSpacing: 5,
      }
    );

    this.inspectFooterText = this.add
      .text(
        LOGICAL_WIDTH / 2 + 210,
        LOGICAL_HEIGHT / 2 + 62,
        '按 [E] / [Esc] 或點擊視窗關閉',
        {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#94a3b8',
        }
      )
      .setOrigin(1, 1);

    this.inspectModal = this.add
      .container(0, 0, [
        backdrop,
        this.inspectTitleText,
        this.inspectBodyText,
        this.inspectFooterText,
      ])
      .setDepth(120)
      .setVisible(false);
  }

  private createDocumentModal(): void {
    const paperBg = this.add
      .rectangle(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2 + 6,
        500,
        242,
        0x1e1b18,
        0.98
      )
      .setStrokeStyle(2, 0xf59e0b)
      .setInteractive();

    paperBg.on('pointerdown', () => {
      globalEventBus.emit(GameEvents.UI_REQUEST_CLOSE_MODAL);
    });

    this.docTitleText = this.add.text(
      LOGICAL_WIDTH / 2 - 232,
      LOGICAL_HEIGHT / 2 - 106,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#fde68a',
      }
    );

    this.docSubtitleText = this.add.text(
      LOGICAL_WIDTH / 2 - 232,
      LOGICAL_HEIGHT / 2 - 86,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#fbbf24',
      }
    );

    this.docMutatedBannerText = this.add.text(
      LOGICAL_WIDTH / 2 - 232,
      LOGICAL_HEIGHT / 2 - 68,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#f87171',
        backgroundColor: '#450a0a',
        padding: { x: 4, y: 2 },
      }
    );

    this.docBodyText = this.add.text(
      LOGICAL_WIDTH / 2 - 232,
      LOGICAL_HEIGHT / 2 - 46,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#fef3c7',
        wordWrap: { width: 464 },
        lineSpacing: 5,
      }
    );

    this.docClueBadgeText = this.add.text(
      LOGICAL_WIDTH / 2 - 232,
      LOGICAL_HEIGHT / 2 + 88,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#4ade80',
      }
    );

    const closeHint = this.add
      .text(
        LOGICAL_WIDTH / 2 + 232,
        LOGICAL_HEIGHT / 2 + 114,
        '【文件閱讀介面】按 [E] / [Esc] 或點擊關閉',
        {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#a8a29e',
        }
      )
      .setOrigin(1, 1);

    this.documentModal = this.add
      .container(0, 0, [
        paperBg,
        this.docTitleText,
        this.docSubtitleText,
        this.docMutatedBannerText,
        this.docBodyText,
        this.docClueBadgeText,
        closeHint,
      ])
      .setDepth(125)
      .setVisible(false);
  }

  private createInventoryModal(): void {
    const panelBg = this.add
      .rectangle(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
        540,
        252,
        0x090d16,
        0.96
      )
      .setStrokeStyle(2, 0xa855f7)
      .setInteractive();

    panelBg.on('pointerdown', () => {
      globalEventBus.emit(GameEvents.UI_REQUEST_CLOSE_MODAL);
    });

    this.inventoryHeaderText = this.add.text(
      LOGICAL_WIDTH / 2 - 256,
      LOGICAL_HEIGHT / 2 - 114,
      '🎒 隨身背包與調查線索紀錄 (INVENTORY & CLUES)',
      {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#e9d5ff',
      }
    );

    const toggleTabBtn = this.add
      .text(
        LOGICAL_WIDTH / 2 + 256,
        LOGICAL_HEIGHT / 2 - 114,
        '[切換：正式版系統狀態面板]',
        {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#fef08a',
          backgroundColor: '#3b0764',
          padding: { x: 6, y: 2 },
        }
      )
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    toggleTabBtn.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData
      ) => {
        event.stopPropagation();
        globalAudioSynth.playUiClick();
        this.inventoryViewMode =
          this.inventoryViewMode === 'classic' ? 'phase6a' : 'classic';
        toggleTabBtn.setText(
          this.inventoryViewMode === 'classic'
            ? '[切換：正式版系統狀態面板]'
            : '[切換：隨身背包與線索]'
        );
        this.refreshInventoryContent();
      }
    );

    const analyzeBtn = this.add
      .text(
        LOGICAL_WIDTH / 2 - 256,
        LOGICAL_HEIGHT / 2 + 114,
        '[🔬 深度分析已收集證據]',
        {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#a7f3d0',
          backgroundColor: '#064e3b',
          padding: { x: 6, y: 2 },
        }
      )
      .setOrigin(0, 1)
      .setInteractive({ useHandCursor: true });

    analyzeBtn.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData
      ) => {
        event.stopPropagation();
        globalAudioSynth.playItemPickup();
        let analyzedCount = 0;
        for (const rec of globalEvidenceSystem.getAllCollectedRecords()) {
          if (!rec.isAnalyzed) {
            const res = globalEvidenceSystem.analyzeEvidence(rec.id);
            if (res.newlyAnalyzed) analyzedCount++;
          }
        }
        this.showSaveToast(
          analyzedCount > 0
            ? `🔬 已深度分析 ${analyzedCount} 項證據！證據完整度：${globalGameState.getValue('evidenceCompletion')}%`
            : `🔬 目前已收集的一般證據皆已完成分析 (${globalGameState.getValue('evidenceCompletion')}%)`
        );
        this.refreshInventoryContent();
      }
    );

    this.inventoryListText = this.add.text(
      LOGICAL_WIDTH / 2 - 256,
      LOGICAL_HEIGHT / 2 - 88,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#f8fafc',
        wordWrap: { width: 246 },
        lineSpacing: 3,
      }
    );

    this.cluesListText = this.add.text(
      LOGICAL_WIDTH / 2 + 6,
      LOGICAL_HEIGHT / 2 - 88,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#bae6fd',
        wordWrap: { width: 248 },
        lineSpacing: 3,
      }
    );

    const footer = this.add
      .text(
        LOGICAL_WIDTH / 2 + 256,
        LOGICAL_HEIGHT / 2 + 114,
        '按 [I] / [Tab] / [Esc] 或點擊背景關閉',
        {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#94a3b8',
        }
      )
      .setOrigin(1, 1);

    this.inventoryModal = this.add
      .container(0, 0, [
        panelBg,
        this.inventoryHeaderText,
        toggleTabBtn,
        analyzeBtn,
        this.inventoryListText,
        this.cluesListText,
        footer,
      ])
      .setDepth(130)
      .setVisible(false);
  }

  private createEndingModal(): void {
    const fullBg = this.add
      .rectangle(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
        LOGICAL_WIDTH,
        LOGICAL_HEIGHT,
        0x05070d,
        0.96
      )
      .setInteractive();

    const frame = this.add
      .rectangle(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
        560,
        300,
        0x0f172a,
        0.98
      )
      .setStrokeStyle(2, 0xef4444);

    const title = this.add
      .text(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2 - 126,
        '【體驗版通關結算】點名簿上不存在的人',
        {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#fca5a5',
        }
      )
      .setOrigin(0.5);

    const sub = this.add
      .text(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2 - 102,
        '—— 觀測紀錄：「新生已完成觀察」 ——',
        {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#fde047',
        }
      )
      .setOrigin(0.5);

    this.endingSummaryText = this.add.text(
      LOGICAL_WIDTH / 2 - 254,
      LOGICAL_HEIGHT / 2 - 76,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#e2e8f0',
        wordWrap: { width: 508 },
        lineSpacing: 5,
      }
    );

    const restartBtn = this.add
      .text(
        LOGICAL_WIDTH / 2 - 110,
        LOGICAL_HEIGHT / 2 + 118,
        '🔄 重新開始體驗版 [E / Space]',
        {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#fef08a',
          backgroundColor: '#7f1d1d',
          padding: { x: 10, y: 5 },
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    restartBtn.on('pointerdown', () => {
      globalEventBus.emit(GameEvents.UI_REQUEST_RESTART_DEMO);
    });

    const menuBtn = this.add
      .text(
        LOGICAL_WIDTH / 2 + 125,
        LOGICAL_HEIGHT / 2 + 118,
        '🏠 返回主選單 (Main Menu)',
        {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#cbd5e1',
          backgroundColor: '#1e293b',
          padding: { x: 10, y: 5 },
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    menuBtn.on('pointerdown', () => {
      globalEventBus.emit(GameEvents.UI_REQUEST_RETURN_MAIN_MENU);
    });

    this.endingModal = this.add
      .container(0, 0, [
        fullBg,
        frame,
        title,
        sub,
        this.endingSummaryText,
        restartBtn,
        menuBtn,
      ])
      .setDepth(160)
      .setVisible(false);
  }

  private createTransitionBanner(): void {
    const bg = this.add.rectangle(
      LOGICAL_WIDTH / 2,
      LOGICAL_HEIGHT / 2,
      320,
      54,
      0x020617,
      0.92
    );
    bg.setStrokeStyle(1, 0x38bdf8);

    this.transitionText = this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, '正在移動至下一區域...', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#e0f2fe',
      })
      .setOrigin(0.5);

    this.transitionBanner = this.add
      .container(0, 0, [bg, this.transitionText])
      .setDepth(140)
      .setVisible(false);
  }

  private createPauseOverlay(): void {
    const bg = this.add
      .rectangle(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
        LOGICAL_WIDTH,
        LOGICAL_HEIGHT,
        0x020617,
        0.86
      )
      .setInteractive();

    const panel = this.add
      .rectangle(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
        460,
        246,
        0x0f172a,
        0.98
      )
      .setStrokeStyle(2, 0x38bdf8);

    const pauseTitle = this.add
      .text(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2 - 96,
        '⏸ GAME PAUSED (遊戲暫停與系統選單)',
        {
          fontFamily: 'monospace',
          fontSize: '15px',
          color: '#f8fafc',
        }
      )
      .setOrigin(0.5);

    const btnStyle = {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#fef08a',
      backgroundColor: '#1e293b',
      padding: { x: 10, y: 5 },
    };

    // 手動存檔與讀取存檔按鈕
    const saveBtn = this.add
      .text(LOGICAL_WIDTH / 2 - 125, LOGICAL_HEIGHT / 2 - 52, '💾 手動存檔', btnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const loadBtn = this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 52, '📂 讀取存檔', btnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const restartBtn = this.add
      .text(LOGICAL_WIDTH / 2 + 125, LOGICAL_HEIGHT / 2 - 52, '🔄 重新開始', btnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    saveBtn.on('pointerdown', () => {
      globalEventBus.emit(GameEvents.UI_REQUEST_MANUAL_SAVE);
    });
    loadBtn.on('pointerdown', () => {
      globalEventBus.emit(GameEvents.UI_REQUEST_LOAD_SAVE);
    });
    restartBtn.on('pointerdown', () => {
      globalEventBus.emit(GameEvents.UI_REQUEST_RESTART_DEMO);
    });

    // 音訊音量設定列
    this.pauseAudioInfoText = this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 10, '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#a7f3d0',
      })
      .setOrigin(0.5);

    const smBtnStyle = {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#e2e8f0',
      backgroundColor: '#334155',
      padding: { x: 6, y: 4 },
    };

    const bgmMinus = this.add
      .text(LOGICAL_WIDTH / 2 - 170, LOGICAL_HEIGHT / 2 + 20, '[BGM -]', smBtnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const bgmPlus = this.add
      .text(LOGICAL_WIDTH / 2 - 105, LOGICAL_HEIGHT / 2 + 20, '[BGM +]', smBtnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const sfxMinus = this.add
      .text(LOGICAL_WIDTH / 2 - 20, LOGICAL_HEIGHT / 2 + 20, '[SFX -]', smBtnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const sfxPlus = this.add
      .text(LOGICAL_WIDTH / 2 + 45, LOGICAL_HEIGHT / 2 + 20, '[SFX +]', smBtnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const muteToggle = this.add
      .text(LOGICAL_WIDTH / 2 + 145, LOGICAL_HEIGHT / 2 + 20, '[靜音切換]', smBtnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    bgmMinus.on('pointerdown', () => {
      globalAudioSynth.adjustBgmVolume(-0.1);
      globalAudioSynth.playUiClick();
      this.refreshPauseAudioInfo();
    });
    bgmPlus.on('pointerdown', () => {
      globalAudioSynth.adjustBgmVolume(0.1);
      globalAudioSynth.playUiClick();
      this.refreshPauseAudioInfo();
    });
    sfxMinus.on('pointerdown', () => {
      globalAudioSynth.adjustSfxVolume(-0.1);
      globalAudioSynth.playUiClick();
      this.refreshPauseAudioInfo();
    });
    sfxPlus.on('pointerdown', () => {
      globalAudioSynth.adjustSfxVolume(0.1);
      globalAudioSynth.playUiClick();
      this.refreshPauseAudioInfo();
    });
    muteToggle.on('pointerdown', () => {
      const m = globalAudioSynth.getSettings().muted;
      globalAudioSynth.setMuted(!m);
      globalAudioSynth.playUiClick();
      this.refreshPauseAudioInfo();
    });

    const mainMenuBtn = this.add
      .text(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2 + 64,
        '🏠 返回標題主選單 (Return to Main Menu)',
        {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#93c5fd',
          backgroundColor: '#1e293b',
          padding: { x: 10, y: 5 },
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    mainMenuBtn.on('pointerdown', () => {
      globalEventBus.emit(GameEvents.UI_REQUEST_RETURN_MAIN_MENU);
    });

    const pauseSub = this.add
      .text(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2 + 102,
        '物理與角色行為已凍結 — 按 [P] 或 [Esc] 恢復遊戲',
        {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#94a3b8',
        }
      )
      .setOrigin(0.5);

    this.pauseOverlay = this.add
      .container(0, 0, [
        bg,
        panel,
        pauseTitle,
        saveBtn,
        loadBtn,
        restartBtn,
        this.pauseAudioInfoText,
        bgmMinus,
        bgmPlus,
        sfxMinus,
        sfxPlus,
        muteToggle,
        mainMenuBtn,
        pauseSub,
      ])
      .setDepth(150)
      .setVisible(false);

    this.refreshPauseAudioInfo();
  }

  private refreshPauseAudioInfo(): void {
    if (!this.pauseAudioInfoText) return;
    const s = globalAudioSynth.getSettings();
    const bgmPct = Math.round(s.bgmVolume * 100);
    const sfxPct = Math.round(s.sfxVolume * 100);
    const muteStr = s.muted ? '🔇 已靜音' : '🔊 音訊正常';
    this.pauseAudioInfoText.setText(
      `音量設定：${muteStr} | BGM: ${bgmPct}% | SFX: ${sfxPct}%`
    );
  }

  private updateDialogueModal(state: ActiveStoryDialogueState | null): void {
    if (!state) {
      this.dialogueModal.setVisible(false);
      return;
    }

    this.dialogueModal.setVisible(true);
    this.dialogueChapterText.setText(state.chapterTitle);
    this.dialogueSpeakerText.setText(state.currentLine.speaker);
    this.dialogueBodyText.setText(state.currentLine.text);

    const isAnomaly = state.currentLine.portraitTag === 'mystery';
    this.dialogueSpeakerText.setColor(isAnomaly ? '#f87171' : '#fcd34d');
    this.dialogueBodyText.setColor(isAnomaly ? '#fecaca' : '#f8fafc');

    this.dialogueProgressText.setText(
      `(${state.currentLineIndex + 1}/${state.totalLines}) 按 [E] / [Space] 或點擊繼續 ▶`
    );
  }

  private playVisualFlickerEffect(): void {
    // 避免過度閃爍或影響可讀性：僅做兩次輕微低透明度脈衝
    this.anomalyFlickerOverlay.setVisible(true);
    this.tweens.add({
      targets: this.anomalyFlickerOverlay,
      alpha: { from: 0.25, to: 0 },
      duration: 130,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        this.anomalyFlickerOverlay.setVisible(false);
      },
    });
  }

  private populateEndingScreen(payload: {
    chapterTitle: string;
    clues: ClueEntryDef[];
    items: InventoryItemDef[];
    metrics: FutureNarrativeMetrics;
    endingRouteId: string;
  }): void {
    const clueTitles = payload.clues.map((c) => `・${c.title}`).join('\n');
    const summary = [
      '你作為剛入學的女學生踏入無名校區，在公告欄發現了不在名冊上的失蹤學生「林曉月」海報，並在三年丙班教室找到了早於建校日期（1998 年）的校務文件。',
      '當你察覺點名簿上的異常時，文件浮現了『新生已完成觀察』的訊息——你也成為了這間教室的觀測紀錄之一。',
      '',
      `📊 體驗版調查統計（已預留正式版系統擴充介面）：`,
      `   - 證據完整度：${payload.metrics.evidenceCompleteness}% （已收集線索：${payload.clues.length} 條 / 持有物品：${payload.items.length} 件）`,
      `   - 財閥警戒度：${payload.metrics.conglomerateAlertLevel}% | 結局路線 ID：${payload.endingRouteId}`,
      `📋 已歸檔關鍵線索：\n${clueTitles || '（無）'}`,
    ].join('\n');

    this.endingSummaryText.setText(summary);
  }

  private updateStatusDisplay(snap: PlayerStateSnapshot): void {
    const posStr = `Pos:(${Math.round(snap.x)}, ${Math.round(snap.y)}) State:${snap.state.toUpperCase()}`;
    const gSnap = globalGameState.getSnapshot();
    const bagStr = `背包:${this.inventoryItems.length} 線索:${this.cluesList.length} 證據:${gSnap.evidenceCompletion}% 信任:${gSnap.studentTrust} 學分:${gSnap.academicCredits}`;
    this.statusText.setText(`${posStr} | ${bagStr}`);
  }

  private updatePromptBanner(
    inRangeCandidate: InteractableDefinition | null,
    selectedObject: InteractableDefinition | null
  ): void {
    if (inRangeCandidate) {
      this.promptBannerText.setText(
        `▶ 進入互動範圍：按 [E] 或滑鼠點擊 — ${inRangeCandidate.promptAction} (ID: ${inRangeCandidate.id})`
      );
      this.promptBannerText.setColor('#fef08a');
      this.promptBannerText.setVisible(true);
    } else if (selectedObject) {
      this.promptBannerText.setText(
        `🖱️ 已選取「${selectedObject.name}」— 請向${selectedObject.x}px處走近後按 [E] 互動`
      );
      this.promptBannerText.setColor('#93c5fd');
      this.promptBannerText.setVisible(true);
    } else {
      this.promptBannerText.setVisible(false);
    }
  }

  private applyModalState(
    modalState: UIModalState,
    result: InteractionExecutionResult | null
  ): void {
    this.dialogueModal.setVisible(modalState === 'dialogue');
    this.inspectModal.setVisible(modalState === 'inspect');
    this.documentModal.setVisible(modalState === 'document');
    this.inventoryModal.setVisible(modalState === 'inventory');
    this.endingModal.setVisible(modalState === 'ending');
    this.transitionBanner.setVisible(modalState === 'transition');

    const stateLabelMap: Record<UIModalState, string> = {
      none: 'UI: EXPLORE [按 I 背包]',
      dialogue: 'UI: DIALOGUE (劇情演出中)',
      inspect: 'UI: INSPECT (調查/拾取視窗)',
      document: 'UI: DOCUMENT (文件閱讀中)',
      inventory: 'UI: INVENTORY (背包與線索)',
      transition: 'UI: TRANSITION (區域切換中)',
      anomaly: 'UI: ANOMALY (異常觀測)',
      ending: 'UI: DEMO ENDING (體驗版通關)',
      paused: 'UI: PAUSED (遊戲暫停)',
    };
    this.modalStateBadge.setText(stateLabelMap[modalState]);

    if (
      modalState === 'none' &&
      result &&
      !result.success &&
      result.blockedReason === 'out_of_range'
    ) {
      this.promptBannerText.setText(`⚠️ ${result.messages[0]}`);
      this.promptBannerText.setColor('#fca5a5');
      this.promptBannerText.setVisible(true);
      return;
    }

    if (modalState === 'inspect' && result) {
      this.inspectTitleText.setText(result.title);
      this.inspectBodyText.setText(result.messages.join('\n\n'));
      const extraNote = result.newlyAddedClue
        ? `📌 新線索已記錄：【${result.newlyAddedClue.title}】`
        : result.acquiredItem
          ? `🎒 已收入背包：【${result.acquiredItem.name}】`
          : '按 [E] / [Esc] 或點擊關閉';
      this.inspectFooterText.setText(extraNote);
    } else if (modalState === 'document' && result && result.document) {
      const doc = result.document;
      this.docTitleText.setText(doc.title);
      this.docSubtitleText.setText(doc.subtitle);

      const showAnomalyMutation =
        doc.id === 'doc_mysterious_school_file_content' &&
        globalStoryState.hasFlag('flag_missing_poster_found');

      if (showAnomalyMutation && doc.mutatedBanner && doc.mutatedPages) {
        this.docMutatedBannerText.setText(doc.mutatedBanner);
        this.docMutatedBannerText.setVisible(true);
        this.docBodyText.setText(
          [...doc.pages, ...doc.mutatedPages].join('\n\n')
        );
      } else {
        this.docMutatedBannerText.setText('');
        this.docMutatedBannerText.setVisible(false);
        this.docBodyText.setText(doc.pages.join('\n\n'));
      }

      if (result.newlyAddedClue) {
        this.docClueBadgeText.setText(
          `✨ 首次閱讀：已新增線索【${result.newlyAddedClue.title}】`
        );
      } else if (doc.clue) {
        this.docClueBadgeText.setText(
          `✓ 線索已收錄：【${doc.clue.title}】（可重複翻閱，不重複新增）`
        );
      } else {
        this.docClueBadgeText.setText('');
      }
    } else if (modalState === 'inventory') {
      this.refreshInventoryContent();
    } else if (modalState === 'transition' && result) {
      this.transitionText.setText(result.messages.join(' '));
    }
  }

  private refreshInventoryContent(): void {
    if (!this.inventoryListText || !this.cluesListText) return;

    if (this.inventoryViewMode === 'phase6a') {
      this.inventoryHeaderText.setText(
        '📊 正式版核心系統面板 (GlobalState / 15角色 / 證據 / 任務)'
      );
      const vars = globalGameState.getSnapshot();
      const previewEnding = globalGameState.evaluatePreviewEnding(
        vars,
        globalStoryState.getFlags()
      );
      const activeQuests = globalQuestSystem.getQuestsByStatus('active');
      const completedQuests = globalQuestSystem.getQuestsByStatus('completed');

      const leftLines = [
        '【8 大核心全域變數 (GlobalGameState)】',
        `・證據完整度: ${vars.evidenceCompletion}% | 累積重傷: ${vars.injuryCount}`,
        `・學生好感度: ${vars.studentAffinity} | 學生信任度: ${vars.studentTrust}`,
        `・財閥警戒度: ${vars.corporateAlert} | 實驗侵蝕度: ${vars.experimentCorruption}`,
        `・外界曝光度: ${vars.publicExposure} | 學業學分: ${vars.academicCredits}`,
        `・結局預測: ${previewEnding}`,
        '',
        `【任務系統 (進行中:${activeQuests.length} / 已完成:${completedQuests.length})】`,
        ...activeQuests
          .slice(0, 2)
          .map((q) => `▶ [進行中] ${q.definition.title}`),
        ...completedQuests
          .slice(0, 2)
          .map((q) => `✓ [已完成] ${q.definition.title}`),
      ];
      this.inventoryListText.setText(leftLines.join('\n'));

      const collectedEvs = globalEvidenceSystem.getAllCollectedRecords();
      const keyChars = [
        'su_yulan',
        'lin_xiaoyue',
        'zhou_yuan',
        'chen_pinyan',
        'zhao_jiahao',
        'shirakawa_hayate',
      ] as const;

      const rightLines = [
        `【證據系統 (已收集:${collectedEvs.length}/17)】`,
        ...collectedEvs.slice(0, 4).map((rec) => {
          const def = globalEvidenceSystem.getDefinition(rec.id);
          const tag = rec.isAnalyzed ? '[已分析]' : '[未分析]';
          return `・${tag} ${def?.name ?? rec.id}`;
        }),
        '',
        '【核心角色關係 (15位角色節選)】',
        ...keyChars.map((cid) => {
          const def = globalRelationshipSystem.getCharacterDefinition(cid);
          const st = globalRelationshipSystem.getCharacterState(cid);
          return `・${def.name}: 好感${st.affinity}/信任${st.trust} (T${st.tier}${st.isAwakened ? '★' : ''})`;
        }),
      ];
      this.cluesListText.setText(rightLines.join('\n'));
      return;
    }

    this.inventoryHeaderText.setText(
      '🎒 隨身背包與調查線索紀錄 (INVENTORY & CLUES)'
    );

    if (this.inventoryItems.length === 0) {
      this.inventoryListText.setText('【背包物品 (0)】\n（目前尚未持有任何物品）');
    } else {
      const itemLines = this.inventoryItems.map(
        (item, idx) => `${idx + 1}. [${item.name}]\n   ${item.description}`
      );
      this.inventoryListText.setText(
        `【背包物品 (${this.inventoryItems.length})】\n` + itemLines.join('\n\n')
      );
    }

    if (this.cluesList.length === 0) {
      this.cluesListText.setText('【調查線索 (0)】\n（尚未記錄任何校內線索）');
    } else {
      const clueLines = this.cluesList.map(
        (c, idx) => `${idx + 1}. ${c.title}\n   ${c.summary}`
      );
      this.cluesListText.setText(
        `【調查線索 (${this.cluesList.length})】\n` + clueLines.join('\n\n')
      );
    }
  }
}
