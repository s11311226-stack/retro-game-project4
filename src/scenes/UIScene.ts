import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../config/playerConfig';
import { GameEvents, globalEventBus } from '../core/EventBus';
import { CAMPUS_AREAS } from '../data/campusAreas';
import {
  BUILDING_BOUNDARY_CONNECTIONS,
  getDoorsForCorridor,
  getStairsForCorridor,
} from '../data/campusCorridorNetwork';
import { globalAudioSynth } from '../systems/AudioSynthManager';
import {
  type AtmosphereLightingProfile,
  globalCampusAtmosphere,
} from '../systems/CampusAtmosphereSystem';
import { globalRelationshipSystem } from '../systems/CharacterRelationshipSystem';
import { globalEvidenceSystem } from '../systems/EvidenceSystem';
import { globalExplorationState } from '../systems/ExplorationStateManager';
import { globalFontManager } from '../systems/FontManager';
import { globalGameState } from '../systems/GlobalGameState';
import { globalQuestSystem } from '../systems/QuestSystem';
import {
  type ActiveStoryDialogueState,
  globalStoryState,
} from '../systems/StoryStateManager';
import type {
  ActiveNPCDialogueSession,
  AreaDefinition,
  AreaId,
  CampusTimePhase,
  ClueEntryDef,
  CorridorSceneId,
  FutureNarrativeMetrics,
  InteractableDefinition,
  InteractionExecutionResult,
  InventoryItemDef,
  PlayerStateSnapshot,
  UIModalState,
} from '../types';

type HubTabId = 'bag_clues' | 'evidence_db' | 'quest_log' | 'relationships_vars';

/**
 * 平行運行的正式版 UI 覆蓋層場景 (UIScene)
 *
 * 完整涵蓋：
 * 1. 清晰繁體中文字體系統 (`FontManager` + `Noto Sans TC`：對白 16px、說話者 17px、選單 15px、文件 14px、次要提示 12px)
 * 2. 頂部 HUD（當前區域、時段切換徽章、目標提示、角色狀態、存檔 Toast）
 * 3. 底部互動提示列 (`[E]` 提示)
 * 4. 劇情與 NPC 分支對話視窗 (`dialogue`：含說話者名稱、職稱好感信任徽章、可點擊/按數字鍵選擇的對話分支按鈕，且不遮擋角色主要頭身區域)
 * 5. 一般調查 / 拾取視窗 (`inspect`)
 * 6. 支援長文分頁與滾輪翻頁的文件閱讀介面 (`document`)
 * 7. 四分頁正式版調查中心 (`inventory`：背包與線索、證據資料庫、任務清單、15角色關係與8大全域變數)
 * 8. 暫停與系統選單 (`paused`：手動存檔、讀取存檔、音量調整、時段切換、返回主選單)
 * 9. 體驗版通關結算與重新開始畫面 (`ending`)
 */
export class UIScene extends Phaser.Scene {
  private areaHeaderText!: Phaser.GameObjects.Text;
  private timePhaseBadgeText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private saveToastText!: Phaser.GameObjects.Text;
  private promptBannerText!: Phaser.GameObjects.Text;
  private modalStateBadge!: Phaser.GameObjects.Text;

  // 劇情與 NPC 對話視窗
  private dialogueModal!: Phaser.GameObjects.Container;
  private dialogueChapterText!: Phaser.GameObjects.Text;
  private dialogueSpeakerText!: Phaser.GameObjects.Text;
  private dialogueBodyText!: Phaser.GameObjects.Text;
  private dialogueProgressText!: Phaser.GameObjects.Text;
  private npcChoicesContainer!: Phaser.GameObjects.Container;
  private activeNpcSession: ActiveNPCDialogueSession | null = null;

  // 一般調查視窗
  private inspectModal!: Phaser.GameObjects.Container;
  private inspectTitleText!: Phaser.GameObjects.Text;
  private inspectBodyText!: Phaser.GameObjects.Text;
  private inspectFooterText!: Phaser.GameObjects.Text;

  // 文件閱讀視窗（含分頁滾動控制）
  private documentModal!: Phaser.GameObjects.Container;
  private docTitleText!: Phaser.GameObjects.Text;
  private docSubtitleText!: Phaser.GameObjects.Text;
  private docBodyText!: Phaser.GameObjects.Text;
  private docMutatedBannerText!: Phaser.GameObjects.Text;
  private docClueBadgeText!: Phaser.GameObjects.Text;
  private docPageIndicatorText!: Phaser.GameObjects.Text;
  private docPrevPageBtn!: Phaser.GameObjects.Text;
  private docNextPageBtn!: Phaser.GameObjects.Text;
  private currentDocPages: string[] = [''];
  private currentDocPageIndex = 0;

  // 正式版四分頁調查中心 (背包 / 證據 / 任務 / 關係與變數)
  private inventoryModal!: Phaser.GameObjects.Container;
  private inventoryHeaderText!: Phaser.GameObjects.Text;
  private inventoryListText!: Phaser.GameObjects.Text;
  private cluesListText!: Phaser.GameObjects.Text;
  private activeHubTab: HubTabId = 'bag_clues';
  private hubTabButtons: Record<HubTabId, Phaser.GameObjects.Text> = {} as Record<
    HubTabId,
    Phaser.GameObjects.Text
  >;

  private endingModal!: Phaser.GameObjects.Container;
  private endingSummaryText!: Phaser.GameObjects.Text;

  // 地圖導覽視窗 (3棟5層+地下室)
  private mapButtonText!: Phaser.GameObjects.Text;
  private mapModal!: Phaser.GameObjects.Container;
  private mapDetailText!: Phaser.GameObjects.Text;
  private mapGridItems: Map<
    string,
    {
      bg: Phaser.GameObjects.Rectangle;
      label: Phaser.GameObjects.Text;
      pinText: Phaser.GameObjects.Text;
    }
  > = new Map();

  // 字體清晰度檢測展示視窗
  private fontShowcaseModal!: Phaser.GameObjects.Container;

  // HUD 耐力條視覺圖元
  private staminaBarGraphics!: Phaser.GameObjects.Graphics;

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
    // 1. 頂部標題與當前區域顯示 (secondaryHint: 12px)
    this.areaHeaderText = globalFontManager
      .createCrispText(this, 8, 4, '《無名校區》載入中...', 'secondaryHint', {
        color: '#fcd34d',
        backgroundColor: '#020617dd',
        padding: { x: 5, y: 2 },
        fontStyle: 'bold',
      })
      .setScrollFactor(0)
      .setDepth(100);

    // 時段顯示與快捷切換徽章 (secondaryHint: 12px)
    this.timePhaseBadgeText = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH - 238,
        4,
        this.formatTimePhaseBadge(globalCampusAtmosphere.getCurrentPhase()),
        'secondaryHint',
        {
          color: '#fde68a',
          backgroundColor: '#1e1b4bdd',
          padding: { x: 5, y: 2 },
        }
      )
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true });

    this.timePhaseBadgeText.on('pointerdown', () => {
      globalEventBus.emit(GameEvents.UI_REQUEST_CYCLE_TIME_PHASE, {});
    });

    // 地圖快捷按鈕 (secondaryHint: 12px)
    this.mapButtonText = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH - 126,
        4,
        '🗺️ 地圖 [M]',
        'secondaryHint',
        {
          color: '#38bdf8',
          backgroundColor: '#0c223add',
          padding: { x: 5, y: 2 },
          fontStyle: 'bold',
        }
      )
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true });

    this.mapButtonText.on('pointerdown', () => {
      this.toggleMapModal();
    });

    // 右上角當前 UI 狀態指標 + 調查中心快捷按鈕 (secondaryHint: 12px)
    this.modalStateBadge = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH - 8,
        4,
        '🎒 調查中心 [I]',
        'secondaryHint',
        {
          color: '#a7f3d0',
          backgroundColor: '#064e3bdd',
          padding: { x: 5, y: 2 },
          fontStyle: 'bold',
        }
      )
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true });

    this.modalStateBadge.on('pointerdown', () => {
      globalEventBus.emit(GameEvents.UI_REQUEST_TOGGLE_INVENTORY);
    });

    // 2. 操作說明列 (secondaryHint: 12px)
    globalFontManager
      .createCrispText(
        this,
        8,
        24,
        '移動:[A/D] 奔跑:[Shift] 跳躍:[Space] 攻擊:[左鍵/J] 格擋:[右鍵/K] 互動:[E] 地圖:[M] 調查:[I] 選單:[Esc]',
        'secondaryHint',
        {
          color: '#cbd5e1',
          backgroundColor: '#020617bb',
          padding: { x: 4, y: 1 },
        }
      )
      .setScrollFactor(0)
      .setDepth(100);

    // 耐力條視覺圖元
    this.staminaBarGraphics = this.add.graphics().setScrollFactor(0).setDepth(101);

    // 3. 角色即時物理與 8 大核心變數摘要面板 (secondaryHint: 12px)
    this.statusText = globalFontManager
      .createCrispText(this, 8, 43, '', 'secondaryHint', {
        color: '#38bdf8',
        backgroundColor: '#020617bb',
        padding: { x: 4, y: 1 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    // 4. 章節目標列 (secondaryHint: 12px)
    this.objectiveText = globalFontManager
      .createCrispText(
        this,
        8,
        62,
        `📖 ${globalStoryState.getCurrentObjective()}`,
        'secondaryHint',
        {
          color: '#fde68a',
          backgroundColor: '#1e1b4bcc',
          padding: { x: 4, y: 1 },
        }
      )
      .setScrollFactor(0)
      .setDepth(100);

    // 5. 存檔/讀檔狀態提示 Toast (secondaryHint: 12px)
    this.saveToastText = globalFontManager
      .createCrispText(this, LOGICAL_WIDTH - 8, 25, '', 'secondaryHint', {
        color: '#4ade80',
        backgroundColor: '#020617f2',
        padding: { x: 6, y: 2 },
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(145)
      .setVisible(false);

    // 6. 底部互動提示橫幅 (secondaryHint: 12px)
    this.promptBannerText = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT - 6,
        '',
        'secondaryHint',
        {
          color: '#fef08a',
          backgroundColor: '#0f172af2',
          padding: { x: 8, y: 3 },
          fontStyle: 'bold',
        }
      )
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    // 7. 溫和、不影響可讀性的異常閃爍遮罩 (最高透明度僅 0.25)
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
    this.createMapModal();
    this.createFontShowcaseModal();

    // 綁定鍵盤數字鍵 (1~4, 0) 供 NPC 對話選項快速選擇，以及 W/S/上下鍵供長文翻頁
    this.setupKeyboardShortcuts();

    // 9. 訂閱跨場景事件
    this.unsubscribers.push(
      globalEventBus.on<{ area: AreaDefinition }>(
        GameEvents.AREA_CHANGED,
        ({ area }) => {
          const loc =
            area.fullDisplayName ||
            (area.buildingName && area.floorName
              ? `「${area.buildingName}｜${area.floorName}｜${area.roomName || area.title}」`
              : area.title);
          this.areaHeaderText.setText(
            `📍 ${loc} | ${globalStoryState.getChapterTitle()}`
          );
          if (this.mapModal && this.mapModal.visible) {
            this.refreshMapModal();
          }
        }
      ),
      globalEventBus.on<{
        phase: CampusTimePhase;
        profile: AtmosphereLightingProfile;
      }>(GameEvents.TIME_PHASE_CHANGED, ({ phase }) => {
        this.timePhaseBadgeText.setText(this.formatTimePhaseBadge(phase));
        if (this.inventoryModal.visible) {
          this.refreshInventoryContent();
        }
      }),
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
          this.activeNpcSession = null;
          this.updateDialogueModal(dialogueState);
        }
      ),
      globalEventBus.on<ActiveNPCDialogueSession | null>(
        GameEvents.NPC_DIALOGUE_UPDATED,
        (npcSession) => {
          this.activeNpcSession = npcSession;
          this.updateNPCDialogueModal(npcSession);
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

  private formatTimePhaseBadge(phase: CampusTimePhase): string {
    if (phase === 'dusk') return '🌇 黃昏 18.9Hz [點擊切換]';
    if (phase === 'night') return '🌙 夜間宵禁 [點擊切換]';
    return '☀️ 日間授課 [點擊切換]';
  }

  private setupKeyboardShortcuts(): void {
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      // 字體展示視窗關閉 (ESC 或 F)
      if (
        this.fontShowcaseModal &&
        this.fontShowcaseModal.visible &&
        (event.key === 'Escape' || event.key === 'f' || event.key === 'F')
      ) {
        this.closeFontShowcaseModal();
        return;
      }

      // 地圖導覽視窗關閉或開啟 (按 M 或 ESC)
      if (
        this.mapModal &&
        this.mapModal.visible &&
        (event.key === 'Escape' || event.key === 'm' || event.key === 'M')
      ) {
        this.closeMapModal();
        return;
      }

      if (
        this.mapModal &&
        !this.mapModal.visible &&
        !this.dialogueModal.visible &&
        !this.documentModal.visible &&
        !this.inspectModal.visible &&
        !this.inventoryModal.visible &&
        (event.key === 'm' || event.key === 'M')
      ) {
        this.toggleMapModal();
        return;
      }

      // NPC 對話分支數字鍵支援 (1 ~ 4 選擇對應分支，0 結束對話)
      if (
        this.dialogueModal.visible &&
        this.activeNpcSession &&
        this.activeNpcSession.showingChoices
      ) {
        const choices = this.activeNpcSession.availableChoices;
        if (event.key >= '1' && event.key <= '4') {
          const idx = Number(event.key) - 1;
          if (choices[idx]) {
            globalEventBus.emit(GameEvents.UI_REQUEST_SELECT_NPC_CHOICE, {
              choiceId: choices[idx].choice.id,
            });
          }
        } else if (event.key === '0') {
          globalEventBus.emit(GameEvents.UI_REQUEST_SELECT_NPC_CHOICE, {
            choiceId: '__close_npc_dialogue__',
          });
        }
        return;
      }

      // 長文文件閱讀翻頁支援 (W/Up 上一頁，S/Down 下一頁)
      if (this.documentModal.visible && this.currentDocPages.length > 1) {
        if (
          event.key === 'ArrowUp' ||
          event.key === 'w' ||
          event.key === 'W' ||
          event.key === 'PageUp'
        ) {
          this.changeDocumentPage(-1);
        } else if (
          event.key === 'ArrowDown' ||
          event.key === 's' ||
          event.key === 'S' ||
          event.key === 'PageDown'
        ) {
          this.changeDocumentPage(1);
        }
      }
    });

    // 滑鼠滾輪支援文件閱讀翻頁
    this.input.on(
      'wheel',
      (
        _pointer: Phaser.Input.Pointer,
        _gameObjects: Phaser.GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number
      ) => {
        if (this.documentModal.visible && this.currentDocPages.length > 1) {
          this.changeDocumentPage(deltaY > 0 ? 1 : -1);
        }
      }
    );
  }

  private showSaveToast(msg: string): void {
    this.saveToastText.setText(msg);
    this.saveToastText.setVisible(true);
    this.saveToastText.setAlpha(1);
    this.tweens.killTweensOf(this.saveToastText);
    this.tweens.add({
      targets: this.saveToastText,
      alpha: 0,
      delay: 2200,
      duration: 450,
      onComplete: () => {
        this.saveToastText.setVisible(false);
      },
    });
  }

  private createDialogueModal(): void {
    // 對白框固定於畫面底部 (top = 248, bottom = 356)，保留上方 248px 完整呈現角色與場景視覺
    const boxBg = this.add
      .rectangle(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT - 58,
        596,
        108,
        0x090d16,
        0.96
      )
      .setStrokeStyle(2, 0xfacc15)
      .setInteractive({ useHandCursor: true });

    boxBg.on('pointerdown', () => {
      globalEventBus.emit(GameEvents.UI_REQUEST_ADVANCE_DIALOGUE);
    });

    // 說話者角色名稱 (speakerName: 17px bold)
    this.dialogueSpeakerText = globalFontManager.createCrispText(
      this,
      LOGICAL_WIDTH / 2 - 284,
      LOGICAL_HEIGHT - 108,
      '',
      'speakerName',
      {
        color: '#fcd34d',
      }
    );

    // 章節或 NPC 職稱／好感信任徽章 (secondaryHint: 12px)
    this.dialogueChapterText = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 + 284,
        LOGICAL_HEIGHT - 105,
        '',
        'secondaryHint',
        {
          color: '#94a3b8',
        }
      )
      .setOrigin(1, 0);

    // 主要對白內文 (dialogueBody: 16px, lineSpacing: 6, wordWrap: 564)
    this.dialogueBodyText = globalFontManager.createCrispText(
      this,
      LOGICAL_WIDTH / 2 - 284,
      LOGICAL_HEIGHT - 82,
      '',
      'dialogueBody',
      {
        color: '#f8fafc',
        wordWrap: { width: 564, useAdvancedWrap: true },
        lineSpacing: 5,
      }
    );

    // 底部推進提示 (secondaryHint: 12px)
    this.dialogueProgressText = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 + 284,
        LOGICAL_HEIGHT - 10,
        '按 [E] / [Space] 或點擊繼續 ▶',
        'secondaryHint',
        {
          color: '#fef08a',
        }
      )
      .setOrigin(1, 1);

    this.npcChoicesContainer = this.add.container(0, 0);

    this.dialogueModal = this.add
      .container(0, 0, [
        boxBg,
        this.dialogueSpeakerText,
        this.dialogueChapterText,
        this.dialogueBodyText,
        this.dialogueProgressText,
        this.npcChoicesContainer,
      ])
      .setDepth(128)
      .setVisible(false);
  }

  private createInspectModal(): void {
    const backdrop = this.add
      .rectangle(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2 + 12,
        520,
        196,
        0x0f172a,
        0.96
      )
      .setStrokeStyle(2, 0x38bdf8)
      .setInteractive();

    backdrop.on('pointerdown', () => {
      globalEventBus.emit(GameEvents.UI_REQUEST_CLOSE_MODAL);
    });

    // 調查標題 (speakerName: 17px)
    this.inspectTitleText = globalFontManager.createCrispText(
      this,
      LOGICAL_WIDTH / 2 - 242,
      LOGICAL_HEIGHT / 2 - 76,
      '',
      'speakerName',
      {
        color: '#fcd34d',
      }
    );

    // 調查內文 (dialogueBody: 16px)
    this.inspectBodyText = globalFontManager.createCrispText(
      this,
      LOGICAL_WIDTH / 2 - 242,
      LOGICAL_HEIGHT / 2 - 46,
      '',
      'dialogueBody',
      {
        color: '#f1f5f9',
        wordWrap: { width: 484, useAdvancedWrap: true },
        lineSpacing: 5,
      }
    );

    // 調查底部狀態提示 (secondaryHint: 12px)
    this.inspectFooterText = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 + 242,
        LOGICAL_HEIGHT / 2 + 100,
        '按 [E] / [Esc] 或點擊視窗關閉',
        'secondaryHint',
        {
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
        LOGICAL_HEIGHT / 2 + 10,
        556,
        262,
        0x1e1b18,
        0.98
      )
      .setStrokeStyle(2, 0xf59e0b)
      .setInteractive();

    paperBg.on('pointerdown', () => {
      globalEventBus.emit(GameEvents.UI_REQUEST_CLOSE_MODAL);
    });

    // 文件主標題 (speakerName: 17px)
    this.docTitleText = globalFontManager.createCrispText(
      this,
      LOGICAL_WIDTH / 2 - 260,
      LOGICAL_HEIGHT / 2 - 114,
      '',
      'speakerName',
      {
        color: '#fde68a',
      }
    );

    // 文件副標題 (secondaryHint: 12px)
    this.docSubtitleText = globalFontManager.createCrispText(
      this,
      LOGICAL_WIDTH / 2 - 260,
      LOGICAL_HEIGHT / 2 - 90,
      '',
      'secondaryHint',
      {
        color: '#fbbf24',
      }
    );

    // 異變橫幅 (secondaryHint: 12px)
    this.docMutatedBannerText = globalFontManager.createCrispText(
      this,
      LOGICAL_WIDTH / 2 - 260,
      LOGICAL_HEIGHT / 2 - 68,
      '',
      'secondaryHint',
      {
        color: '#f87171',
        backgroundColor: '#450a0a',
        padding: { x: 5, y: 2 },
        fontStyle: 'bold',
      }
    );

    // 文件內文 (documentBody: 14px，搭配自動分頁防止溢出)
    this.docBodyText = globalFontManager.createCrispText(
      this,
      LOGICAL_WIDTH / 2 - 260,
      LOGICAL_HEIGHT / 2 - 42,
      '',
      'documentBody',
      {
        color: '#fef3c7',
        wordWrap: { width: 520, useAdvancedWrap: true },
        lineSpacing: 5,
      }
    );

    // 分頁控制按鈕列
    this.docPrevPageBtn = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 - 110,
        LOGICAL_HEIGHT / 2 + 88,
        '[◀ 上一頁 W/↑]',
        'secondaryHint',
        {
          color: '#fef08a',
          backgroundColor: '#292524',
          padding: { x: 6, y: 2 },
        }
      )
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });

    this.docPrevPageBtn.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData
      ) => {
        event.stopPropagation();
        this.changeDocumentPage(-1);
      }
    );

    this.docPageIndicatorText = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2 + 90,
        '第 1 / 1 頁',
        'secondaryHint',
        {
          color: '#d6d3d1',
        }
      )
      .setOrigin(0.5, 0);

    this.docNextPageBtn = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 + 110,
        LOGICAL_HEIGHT / 2 + 88,
        '[下一頁 S/↓ ▶]',
        'secondaryHint',
        {
          color: '#fef08a',
          backgroundColor: '#292524',
          padding: { x: 6, y: 2 },
        }
      )
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });

    this.docNextPageBtn.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData
      ) => {
        event.stopPropagation();
        this.changeDocumentPage(1);
      }
    );

    this.docClueBadgeText = globalFontManager.createCrispText(
      this,
      LOGICAL_WIDTH / 2 - 260,
      LOGICAL_HEIGHT / 2 + 114,
      '',
      'secondaryHint',
      {
        color: '#4ade80',
      }
    );

    const closeHint = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 + 260,
        LOGICAL_HEIGHT / 2 + 132,
        '按 [E] / [Esc] 或點擊背景關閉',
        'secondaryHint',
        {
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
        this.docPrevPageBtn,
        this.docPageIndicatorText,
        this.docNextPageBtn,
        this.docClueBadgeText,
        closeHint,
      ])
      .setDepth(125)
      .setVisible(false);
  }

  private changeDocumentPage(delta: number): void {
    const nextIdx = Phaser.Math.Clamp(
      this.currentDocPageIndex + delta,
      0,
      Math.max(0, this.currentDocPages.length - 1)
    );
    if (nextIdx !== this.currentDocPageIndex) {
      globalAudioSynth.playUiClick();
      this.currentDocPageIndex = nextIdx;
      this.renderCurrentDocumentPage();
    }
  }

  private renderCurrentDocumentPage(): void {
    const total = Math.max(1, this.currentDocPages.length);
    const pageText = this.currentDocPages[this.currentDocPageIndex] ?? '';
    this.docBodyText.setText(pageText);
    this.docPageIndicatorText.setText(
      `第 ${this.currentDocPageIndex + 1} / ${total} 頁 (滾輪 / W,S 翻頁)`
    );
    const hasMultiple = total > 1;
    this.docPrevPageBtn.setVisible(hasMultiple);
    this.docNextPageBtn.setVisible(hasMultiple);
    this.docPrevPageBtn.setAlpha(this.currentDocPageIndex > 0 ? 1 : 0.4);
    this.docNextPageBtn.setAlpha(
      this.currentDocPageIndex < total - 1 ? 1 : 0.4
    );
  }

  private createInventoryModal(): void {
    const panelBg = this.add
      .rectangle(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2 + 6,
        596,
        282,
        0x090d16,
        0.97
      )
      .setStrokeStyle(2, 0xa855f7)
      .setInteractive();

    panelBg.on('pointerdown', () => {
      globalEventBus.emit(GameEvents.UI_REQUEST_CLOSE_MODAL);
    });

    this.inventoryHeaderText = globalFontManager.createCrispText(
      this,
      LOGICAL_WIDTH / 2 - 284,
      LOGICAL_HEIGHT / 2 - 128,
      '🎒 隨身背包與調查線索紀錄',
      'speakerName',
      {
        color: '#e9d5ff',
      }
    );

    // 4 個正式版分頁按鈕 (secondaryHint: 12px)
    const tabDefs: Array<{ id: HubTabId; label: string; x: number }> = [
      { id: 'bag_clues', label: '1.背包與線索', x: LOGICAL_WIDTH / 2 - 284 },
      { id: 'evidence_db', label: '2.證據資料庫', x: LOGICAL_WIDTH / 2 - 182 },
      { id: 'quest_log', label: '3.任務清單', x: LOGICAL_WIDTH / 2 - 80 },
      {
        id: 'relationships_vars',
        label: '4.角色關係與8大變數',
        x: LOGICAL_WIDTH / 2 + 12,
      },
    ];

    const tabObjects: Phaser.GameObjects.Text[] = [];
    for (const t of tabDefs) {
      const btn = globalFontManager
        .createCrispText(
          this,
          t.x,
          LOGICAL_HEIGHT / 2 - 102,
          `[${t.label}]`,
          'secondaryHint',
          {
            color: '#fef08a',
            backgroundColor: '#3b0764',
            padding: { x: 5, y: 2 },
          }
        )
        .setInteractive({ useHandCursor: true });

      btn.on(
        'pointerdown',
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData
        ) => {
          event.stopPropagation();
          globalAudioSynth.playUiClick();
          this.activeHubTab = t.id;
          this.refreshInventoryContent();
        }
      );
      this.hubTabButtons[t.id] = btn;
      tabObjects.push(btn);
    }

    const analyzeBtn = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 - 284,
        LOGICAL_HEIGHT / 2 + 138,
        '[🔬 深度分析已收集證據]',
        'secondaryHint',
        {
          color: '#a7f3d0',
          backgroundColor: '#064e3b',
          padding: { x: 6, y: 3 },
          fontStyle: 'bold',
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

    const timeCycleBtn = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 - 90,
        LOGICAL_HEIGHT / 2 + 138,
        '[🕒 切換日/昏/夜]',
        'secondaryHint',
        {
          color: '#fde68a',
          backgroundColor: '#1e1b4b',
          padding: { x: 6, y: 3 },
        }
      )
      .setOrigin(0, 1)
      .setInteractive({ useHandCursor: true });

    timeCycleBtn.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData
      ) => {
        event.stopPropagation();
        globalEventBus.emit(GameEvents.UI_REQUEST_CYCLE_TIME_PHASE, {});
      }
    );

    // 左右雙欄內容 (documentBody: 14px，清晰易讀)
    this.inventoryListText = globalFontManager.createCrispText(
      this,
      LOGICAL_WIDTH / 2 - 284,
      LOGICAL_HEIGHT / 2 - 74,
      '',
      'documentBody',
      {
        color: '#f8fafc',
        wordWrap: { width: 274, useAdvancedWrap: true },
        lineSpacing: 3,
      }
    );

    this.cluesListText = globalFontManager.createCrispText(
      this,
      LOGICAL_WIDTH / 2 + 6,
      LOGICAL_HEIGHT / 2 - 74,
      '',
      'documentBody',
      {
        color: '#bae6fd',
        wordWrap: { width: 278, useAdvancedWrap: true },
        lineSpacing: 3,
      }
    );

    const footer = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 + 284,
        LOGICAL_HEIGHT / 2 + 138,
        '按 [I] / [Tab] / [Esc] 關閉',
        'secondaryHint',
        {
          color: '#94a3b8',
        }
      )
      .setOrigin(1, 1);

    this.inventoryModal = this.add
      .container(0, 0, [
        panelBg,
        this.inventoryHeaderText,
        ...tabObjects,
        analyzeBtn,
        timeCycleBtn,
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
        580,
        316,
        0x0f172a,
        0.98
      )
      .setStrokeStyle(2, 0xef4444);

    const title = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2 - 134,
        '【體驗版通關結算】點名簿上不存在的人',
        'speakerName',
        {
          color: '#fca5a5',
        }
      )
      .setOrigin(0.5);

    const sub = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2 - 108,
        '—— 觀測紀錄：「新生已完成觀察」 ——',
        'secondaryHint',
        {
          color: '#fde047',
        }
      )
      .setOrigin(0.5);

    this.endingSummaryText = globalFontManager.createCrispText(
      this,
      LOGICAL_WIDTH / 2 - 268,
      LOGICAL_HEIGHT / 2 - 84,
      '',
      'documentBody',
      {
        color: '#e2e8f0',
        wordWrap: { width: 536, useAdvancedWrap: true },
        lineSpacing: 4,
      }
    );

    const restartBtn = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 - 120,
        LOGICAL_HEIGHT / 2 + 126,
        '🔄 重新開始 [E / Space]',
        'menuItem',
        {
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

    const menuBtn = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 + 125,
        LOGICAL_HEIGHT / 2 + 126,
        '🏠 返回主選單 (Main Menu)',
        'menuItem',
        {
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
      360,
      58,
      0x020617,
      0.94
    );
    bg.setStrokeStyle(1, 0x38bdf8);

    this.transitionText = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
        '正在移動至下一區域...',
        'importantPrompt',
        {
          color: '#e0f2fe',
        }
      )
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
        490,
        286,
        0x0f172a,
        0.98
      )
      .setStrokeStyle(2, 0x38bdf8);

    const pauseTitle = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2 - 98,
        '⏸ 遊戲暫停與系統選單 (SYSTEM MENU)',
        'speakerName',
        {
          color: '#f8fafc',
        }
      )
      .setOrigin(0.5);

    const btnOverrides = {
      color: '#fef08a',
      backgroundColor: '#1e293b',
      padding: { x: 10, y: 5 },
    };

    const saveBtn = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 - 135,
        LOGICAL_HEIGHT / 2 - 52,
        '💾 手動存檔',
        'menuItem',
        btnOverrides
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const loadBtn = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2 - 52,
        '📂 讀取存檔',
        'menuItem',
        btnOverrides
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const restartBtn = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 + 135,
        LOGICAL_HEIGHT / 2 - 52,
        '🔄 重新開始',
        'menuItem',
        btnOverrides
      )
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

    this.pauseAudioInfoText = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2 - 10,
        '',
        'secondaryHint',
        {
          color: '#a7f3d0',
        }
      )
      .setOrigin(0.5);

    const smBtnOverrides = {
      color: '#e2e8f0',
      backgroundColor: '#334155',
      padding: { x: 6, y: 4 },
    };

    const bgmMinus = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 - 175,
        LOGICAL_HEIGHT / 2 + 22,
        '[BGM -]',
        'secondaryHint',
        smBtnOverrides
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const bgmPlus = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 - 105,
        LOGICAL_HEIGHT / 2 + 22,
        '[BGM +]',
        'secondaryHint',
        smBtnOverrides
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const sfxMinus = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 - 20,
        LOGICAL_HEIGHT / 2 + 22,
        '[SFX -]',
        'secondaryHint',
        smBtnOverrides
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const sfxPlus = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 + 50,
        LOGICAL_HEIGHT / 2 + 22,
        '[SFX +]',
        'secondaryHint',
        smBtnOverrides
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const muteToggle = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 + 150,
        LOGICAL_HEIGHT / 2 + 22,
        '[靜音切換]',
        'secondaryHint',
        smBtnOverrides
      )
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

    const fontShowcaseBtn = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2 + 50,
        '🔤 繁體字體清晰度檢測展示 (Font Showcase)',
        'menuItem',
        {
          color: '#fde68a',
          backgroundColor: '#3b0764',
          padding: { x: 10, y: 4 },
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    fontShowcaseBtn.on('pointerdown', () => {
      this.openFontShowcaseModal();
    });

    const mainMenuBtn = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2 + 84,
        '🏠 返回標題主選單 (Return to Main Menu)',
        'menuItem',
        {
          color: '#93c5fd',
          backgroundColor: '#1e293b',
          padding: { x: 12, y: 5 },
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    mainMenuBtn.on('pointerdown', () => {
      globalEventBus.emit(GameEvents.UI_REQUEST_RETURN_MAIN_MENU);
    });

    const pauseSub = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2 + 118,
        '物理與角色行為已凍結 — 按 [P] 或 [Esc] 恢復遊戲',
        'secondaryHint',
        {
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
        fontShowcaseBtn,
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
    this.npcChoicesContainer.removeAll(true);
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

  /**
   * 更新 NPC 分支對話視窗與可點擊選項清單
   */
  private updateNPCDialogueModal(
    session: ActiveNPCDialogueSession | null
  ): void {
    this.npcChoicesContainer.removeAll(true);
    if (!session) {
      this.dialogueModal.setVisible(false);
      return;
    }

    this.dialogueModal.setVisible(true);
    const currentLine =
      session.lines[session.currentLineIndex] ??
      session.lines[session.lines.length - 1];

    this.dialogueSpeakerText.setText(currentLine?.speaker ?? session.npcName);
    this.dialogueSpeakerText.setColor('#fcd34d');

    const awakenTag = session.isAwakened ? ' ★覺醒盟友' : '';
    this.dialogueChapterText.setText(
      `${session.npcName}（${session.roleTitle}）| 好感:${session.affinity} 信任:${session.trust} [Tier ${session.tier}${awakenTag}]`
    );

    const outcomeNote = session.outcomeSummary
      ? `\n${session.outcomeSummary}`
      : '';
    this.dialogueBodyText.setText(
      `${currentLine?.text ?? ''}${outcomeNote}`
    );
    this.dialogueBodyText.setColor('#f8fafc');

    if (session.showingChoices && session.availableChoices.length > 0) {
      this.dialogueProgressText.setText(
        '請點擊上方對話選項，或按數字鍵 [1]~[3] 選擇 / [0] 結束對話'
      );
      this.renderNPCChoiceButtons(session);
    } else {
      this.dialogueProgressText.setText(
        `(${session.currentLineIndex + 1}/${session.lines.length}) 按 [E] / [Space] 或點擊繼續 ▶`
      );
    }
  }

  private renderNPCChoiceButtons(session: ActiveNPCDialogueSession): void {
    this.npcChoicesContainer.removeAll(true);

    const allOptions = [
      ...session.availableChoices.map((item, index) => ({
        id: item.choice.id,
        label: `[${index + 1}] ${item.unlockedByEvidence ? '🔍 ' : ''}${item.choice.label}${item.alreadyCompleted ? ' (✓已詢問)' : ''}`,
        isEvidenceUnlocked: item.unlockedByEvidence,
        alreadyCompleted: item.alreadyCompleted,
      })),
      {
        id: '__close_npc_dialogue__',
        label: '[0] 結束對話（離開）',
        isEvidenceUnlocked: false,
        alreadyCompleted: false,
      },
    ];

    const btnHeight = 26;
    const gap = 4;
    const bottomAnchorY = LOGICAL_HEIGHT - 118;

    allOptions.forEach((opt, idx) => {
      const revIdx = allOptions.length - 1 - idx;
      const yPos = bottomAnchorY - revIdx * (btnHeight + gap);

      const bgColor = opt.isEvidenceUnlocked
        ? '#064e3bf2'
        : opt.alreadyCompleted
          ? '#1e293be6'
          : '#1e1b4bf2';
      const textColor = opt.isEvidenceUnlocked
        ? '#6ee7b7'
        : opt.alreadyCompleted
          ? '#94a3b8'
          : '#fef08a';

      const choiceBtn = globalFontManager
        .createCrispText(
          this,
          LOGICAL_WIDTH / 2 + 284,
          yPos,
          opt.label,
          'documentBody',
          {
            color: textColor,
            backgroundColor: bgColor,
            padding: { x: 10, y: 4 },
            fontStyle: opt.isEvidenceUnlocked ? 'bold' : 'normal',
          }
        )
        .setOrigin(1, 1)
        .setInteractive({ useHandCursor: true });

      choiceBtn.on(
        'pointerdown',
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData
        ) => {
          event.stopPropagation();
          globalEventBus.emit(GameEvents.UI_REQUEST_SELECT_NPC_CHOICE, {
            choiceId: opt.id,
          });
        }
      );

      this.npcChoicesContainer.add(choiceBtn);
    });
  }

  private playVisualFlickerEffect(): void {
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
      `📊 調查統計（正式版核心系統同步紀錄）：`,
      `   - 證據完整度：${globalGameState.getValue('evidenceCompletion')}% （已收集線索：${payload.clues.length} 條 / 持有物品：${payload.items.length} 件）`,
      `   - 財閥警戒度：${globalGameState.getValue('corporateAlert')}% | 結局路線 ID：${payload.endingRouteId}`,
      `📋 已歸檔關鍵線索：\n${clueTitles || '（無）'}`,
    ].join('\n');

    this.endingSummaryText.setText(summary);
  }

  private updateStatusDisplay(snap: PlayerStateSnapshot): void {
    const stPct = Math.round(snap.stamina);
    const stExhaust = snap.isExhausted ? ' [力竭!]' : '';
    const posStr = `座標:(${Math.round(snap.x)},${Math.round(snap.y)}) 狀態:${snap.state.toUpperCase()} 耐力:${stPct}/${snap.maxStamina}${stExhaust}`;
    const gSnap = globalGameState.getSnapshot();
    const bagStr = `物品:${this.inventoryItems.length} 線索:${this.cluesList.length} 證據:${gSnap.evidenceCompletion}% 好感:${gSnap.studentAffinity} 信任:${gSnap.studentTrust} 警戒:${gSnap.corporateAlert} 侵蝕:${gSnap.experimentCorruption}`;
    this.statusText.setText(`${posStr} | ${bagStr}`);

    this.drawStaminaBar(snap.stamina, snap.maxStamina, snap.isExhausted);
  }

  private updatePromptBanner(
    inRangeCandidate: InteractableDefinition | null,
    selectedObject: InteractableDefinition | null
  ): void {
    if (inRangeCandidate) {
      this.promptBannerText.setText(
        `▶ 進入互動範圍：按 [E] 或滑鼠點擊 — ${inRangeCandidate.promptAction} (${inRangeCandidate.name})`
      );
      this.promptBannerText.setColor('#fef08a');
      this.promptBannerText.setVisible(true);
    } else if (selectedObject) {
      this.promptBannerText.setText(
        `🖱️ 已選取「${selectedObject.name}」— 請走近至 ${selectedObject.x}px 處按 [E] 互動`
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
    if (this.mapModal) {
      this.mapModal.setVisible(modalState === 'map');
      if (modalState === 'map') {
        this.refreshMapModal();
      }
    }

    const stateLabelMap: Record<UIModalState, string> = {
      none: '🎒 調查中心 [按 I / Tab]',
      dialogue: '💬 對話進行中 (DIALOGUE)',
      inspect: '🔍 調查視窗 (INSPECT)',
      document: '📄 文件閱讀 (DOCUMENT)',
      inventory: '📊 調查中心開啟中 [按 I 關閉]',
      map: '🗺️ 校園地圖 [按 M 關閉]',
      transition: '🚪 區域移動中...',
      anomaly: '⚠️ 異常觀測',
      ending: '🎬 體驗版通關結算',
      paused: '⏸ 遊戲暫停 (PAUSED)',
    };
    this.modalStateBadge.setText(stateLabelMap[modalState]);

    if (modalState === 'none') {
      this.modalStateBadge.setColor('#a7f3d0');
      this.modalStateBadge.setBackgroundColor('#064e3bdd');
    } else if (modalState === 'map') {
      this.modalStateBadge.setColor('#38bdf8');
      this.modalStateBadge.setBackgroundColor('#0c223add');
    } else {
      this.modalStateBadge.setColor('#f87171');
      this.modalStateBadge.setBackgroundColor('#450a0add');
    }

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
          : '按 [E] / [Esc] 或點擊視窗關閉';
      this.inspectFooterText.setText(extraNote);
    } else if (modalState === 'document' && result && result.document) {
      const doc = result.document;
      this.docTitleText.setText(doc.title);
      this.docSubtitleText.setText(doc.subtitle);

      const showAnomalyMutation =
        doc.id === 'doc_mysterious_school_file_content' &&
        globalStoryState.hasFlag('flag_missing_poster_found');

      const rawParagraphs =
        showAnomalyMutation && doc.mutatedBanner && doc.mutatedPages
          ? [...doc.pages, ...doc.mutatedPages]
          : [...doc.pages];

      if (showAnomalyMutation && doc.mutatedBanner) {
        this.docMutatedBannerText.setText(doc.mutatedBanner);
        this.docMutatedBannerText.setVisible(true);
      } else {
        this.docMutatedBannerText.setText('');
        this.docMutatedBannerText.setVisible(false);
      }

      // 使用 FontManager 執行長文安全分頁，杜絕文字超出視窗
      this.currentDocPages = globalFontManager.paginateDocumentContent(
        rawParagraphs,
        34,
        4
      );
      this.currentDocPageIndex = 0;
      this.renderCurrentDocumentPage();

      if (result.newlyAddedClue) {
        this.docClueBadgeText.setText(
          `✨ 首次閱讀：已收錄線索【${result.newlyAddedClue.title}】`
        );
      } else if (doc.clue) {
        this.docClueBadgeText.setText(
          `✓ 線索已收錄：【${doc.clue.title}】（可重複翻閱）`
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

    // 更新分頁按鈕高亮狀態
    for (const [tabId, btn] of Object.entries(this.hubTabButtons) as Array<
      [HubTabId, Phaser.GameObjects.Text]
    >) {
      const isSelected = tabId === this.activeHubTab;
      btn.setColor(isSelected ? '#090d16' : '#fef08a');
      btn.setBackgroundColor(isSelected ? '#facc15' : '#3b0764');
    }

    if (this.activeHubTab === 'bag_clues') {
      this.inventoryHeaderText.setText(
        '🎒 隨身背包與調查線索紀錄 (INVENTORY & CLUES)'
      );

      if (this.inventoryItems.length === 0) {
        this.inventoryListText.setText(
          '【背包物品 (0)】\n（目前尚未持有任何物品）'
        );
      } else {
        const itemLines = this.inventoryItems.map(
          (item, idx) => `${idx + 1}. [${item.name}]\n   ${item.description}`
        );
        this.inventoryListText.setText(
          `【背包物品 (${this.inventoryItems.length})】\n` +
            itemLines.slice(0, 4).join('\n')
        );
      }

      if (this.cluesList.length === 0) {
        this.cluesListText.setText(
          '【調查線索 (0)】\n（尚未記錄任何校內線索）'
        );
      } else {
        const clueLines = this.cluesList.map(
          (c, idx) => `${idx + 1}. ${c.title}\n   ${c.summary}`
        );
        this.cluesListText.setText(
          `【調查線索 (${this.cluesList.length})】\n` +
            clueLines.slice(0, 4).join('\n')
        );
      }
      return;
    }

    if (this.activeHubTab === 'evidence_db') {
      const collected = globalEvidenceSystem.getAllCollectedRecords();
      const completion = globalGameState.getValue('evidenceCompletion');
      this.inventoryHeaderText.setText(
        `🔍 正式版證據資料庫 (已收集 ${collected.length} 件 | 完整度 ${completion}%)`
      );

      if (collected.length === 0) {
        this.inventoryListText.setText(
          '【已收集證據清單】\n尚未收集任何證據。請在校園各場景調查文件、保險箱、微縮膠卷或與 NPC 對話。'
        );
        this.cluesListText.setText(
          '【證據分析與假線索識破說明】\n點擊左下角「🔬 深度分析已收集證據」可獲得額外完整度並推進真結局條件。'
        );
        return;
      }

      const half = Math.ceil(collected.length / 2);
      const formatEv = (rec: (typeof collected)[number]) => {
        const def = globalEvidenceSystem.getDefinition(rec.id);
        const statusTag = def?.isRedHerring
          ? rec.isDebunked
            ? '[✓已識破假線索]'
            : '[⚠️疑似誤導]'
          : rec.isAnalyzed
            ? '[🔬已分析]'
            : '[未分析]';
        return `・${statusTag} ${def?.name ?? rec.id}`;
      };

      this.inventoryListText.setText(
        '【證據檔案 (左欄)】\n' +
          collected.slice(0, Math.min(half, 6)).map(formatEv).join('\n')
      );
      this.cluesListText.setText(
        '【證據檔案 (右欄)】\n' +
          (collected.slice(half, half + 6).map(formatEv).join('\n') ||
            '（可點擊左下角按鈕執行深度分析）')
      );
      return;
    }

    if (this.activeHubTab === 'quest_log') {
      const activeQuests = globalQuestSystem.getQuestsByStatus('active');
      const availableQuests = globalQuestSystem.getQuestsByStatus('available');
      const completedQuests = globalQuestSystem.getQuestsByStatus('completed');

      this.inventoryHeaderText.setText(
        `📋 任務清單 (進行中:${activeQuests.length} | 可接取:${availableQuests.length} | 已完成:${completedQuests.length})`
      );

      const leftLines = [
        '【進行中與可觸發任務】',
        ...activeQuests
          .slice(0, 4)
          .map(
            (q) =>
              `▶ [進行中] ${q.definition.title}\n   目標: ${q.definition.objectives[0] ?? q.definition.summary}`
          ),
        ...availableQuests
          .slice(0, 2)
          .map((q) => `○ [可接取] ${q.definition.title}`),
      ];

      const rightLines = [
        '【已完成任務紀錄】',
        ...(completedQuests.length > 0
          ? completedQuests
              .slice(0, 5)
              .map((q) => `✓ [已完成] ${q.definition.title}`)
          : ['（目前尚無已完成任務）']),
      ];

      this.inventoryListText.setText(leftLines.join('\n'));
      this.cluesListText.setText(rightLines.join('\n'));
      return;
    }

    // relationships_vars 分頁
    this.inventoryHeaderText.setText(
      '🤝 15位角色關係與 8 大核心全域變數 (RELATIONSHIPS & GLOBAL STATE)'
    );
    const vars = globalGameState.getSnapshot();
    const previewEnding = globalGameState.evaluatePreviewEnding(
      vars,
      globalStoryState.getFlags()
    );
    const atmProfile = globalCampusAtmosphere.getCurrentProfile();

    const leftLines = [
      `【當前時段】${atmProfile.label}`,
      '【8 大核心全域變數】',
      `・證據完整度: ${vars.evidenceCompletion}% | 累積重傷: ${vars.injuryCount}`,
      `・學生好感度: ${vars.studentAffinity} | 學生信任度: ${vars.studentTrust}`,
      `・財閥警戒度: ${vars.corporateAlert} | 實驗侵蝕度: ${vars.experimentCorruption}`,
      `・外界曝光度: ${vars.publicExposure} | 學業學分: ${vars.academicCredits}`,
      `・結局路線預測: ${previewEnding}`,
    ];
    this.inventoryListText.setText(leftLines.join('\n'));

    const campusChars = [
      'su_yulan',
      'lin_xiaoyue',
      'zhou_yuan',
      'chen_pinyan',
      'zhao_jiahao',
      'shirakawa_hayate',
      'ye_sihan',
      'lu_zixuan',
      'shen_zhiyuan',
      'xu_wenqian',
    ] as const;

    const rightLines = [
      '【校內主要角色好感 / 信任 / 階段】',
      ...campusChars.slice(0, 6).map((cid) => {
        const def = globalRelationshipSystem.getCharacterDefinition(cid);
        const st = globalRelationshipSystem.getCharacterState(cid);
        return `・${def.name}(${def.roleTitle}): 好感${st.affinity}/信任${st.trust} [T${st.tier}${st.isAwakened ? '★' : ''}]`;
      }),
    ];
    this.cluesListText.setText(rightLines.join('\n'));
  }

  // ==========================================
  // Phase 6B-2: 3棟5層+地下室全校導覽地圖系統
  // ==========================================

  private createMapModal(): void {
    const modalBg = this.add
      .rectangle(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
        LOGICAL_WIDTH,
        LOGICAL_HEIGHT,
        0x020617,
        0.92
      )
      .setInteractive();

    const panel = this.add
      .rectangle(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
        616,
        338,
        0x090d16,
        0.98
      )
      .setStrokeStyle(2, 0x38bdf8);

    const title = globalFontManager
      .createCrispText(
        this,
        24,
        20,
        '🗺️ 白川學園全校導覽地圖 (CAMPUS MAP - 3×5 GRID)',
        'speakerName',
        { color: '#fcd34d' }
      )
      .setOrigin(0, 0.5);

    const sub = globalFontManager
      .createCrispText(
        this,
        24,
        38,
        '三棟五層連通走廊・中央棟垂直梯・地下設施・按 [M] 或 [Esc] 關閉',
        'secondaryHint',
        { color: '#94a3b8' }
      )
      .setOrigin(0, 0.5);

    const closeBtn = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH - 24,
        22,
        '[✕ 關閉 (M/Esc)]',
        'secondaryHint',
        {
          color: '#f87171',
          backgroundColor: '#450a0add',
          padding: { x: 6, y: 2 },
        }
      )
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this.closeMapModal());

    const children: Phaser.GameObjects.GameObject[] = [
      modalBg,
      panel,
      title,
      sub,
      closeBtn,
    ];

    // 棟別標題列 (y = 56)
    const colLeftTitle = globalFontManager
      .createCrispText(this, 115, 56, '【左棟教學區】', 'secondaryHint', {
        color: '#93c5fd',
      })
      .setOrigin(0.5);
    const colCenterTitle = globalFontManager
      .createCrispText(this, 320, 56, '【中間棟交通樞紐】', 'secondaryHint', {
        color: '#a7f3d0',
      })
      .setOrigin(0.5);
    const colRightTitle = globalFontManager
      .createCrispText(
        this,
        525,
        56,
        '【右棟活動與研究區】',
        'secondaryHint',
        {
          color: '#fde68a',
        }
      )
      .setOrigin(0.5);

    children.push(colLeftTitle, colCenterTitle, colRightTitle);

    // 5F 至 1F 樓層定義 (3 棟 × 5 層 = 15 個公共走廊格，房間作為附屬於走廊的第二層子節點)
    const floorRows: Array<{
      floorLabel: string;
      y: number;
      left: { areaId: AreaId; name: string };
      center: { areaId: AreaId; name: string };
      right: { areaId: AreaId; name: string };
    }> = [
      {
        floorLabel: '5F',
        y: 77,
        left: { areaId: 'corridor_left_5f', name: '5F走廊▸屋頂西側' },
        center: { areaId: 'corridor_center_5f', name: '5F走廊▸鐘塔頂樓' },
        right: { areaId: 'corridor_right_5f', name: '5F走廊▸屋頂設備' },
      },
      {
        floorLabel: '4F',
        y: 104,
        left: { areaId: 'corridor_left_4f', name: '4F走廊▸視聽室' },
        center: { areaId: 'corridor_center_4f', name: '4F走廊▸封存室🔒' },
        right: { areaId: 'corridor_right_4f', name: '4F走廊▸準備室🔒' },
      },
      {
        floorLabel: '3F',
        y: 131,
        left: { areaId: 'corridor_left_3f', name: '3F走廊▸2B教室' },
        center: { areaId: 'corridor_center_3f', name: '3F走廊▸圖書館' },
        right: { areaId: 'corridor_right_3f', name: '3F走廊▸社團室' },
      },
      {
        floorLabel: '2F',
        y: 158,
        left: { areaId: 'corridor_left_2f', name: '2F走廊▸2A教室🔒' },
        center: { areaId: 'corridor_center_2f', name: '2F走廊▸教務處' },
        right: { areaId: 'corridor_right_2f', name: '2F走廊▸實驗/宿' },
      },
      {
        floorLabel: '1F',
        y: 185,
        left: { areaId: 'corridor_left_1f', name: '1F走廊▸教職員室' },
        center: { areaId: 'corridor_center_1f', name: '1F大廳▸公佈欄' },
        right: { areaId: 'corridor_right_1f', name: '1F走廊▸保健室' },
      },
    ];

    floorRows.forEach((row) => {
      // 樓層文字
      const fText = globalFontManager
        .createCrispText(this, 26, row.y, row.floorLabel, 'secondaryHint', {
          color: '#cbd5e1',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      children.push(fText);

      // 水平連通走廊線與樓梯符號
      const leftCorr = globalFontManager
        .createCrispText(this, 203, row.y, '══', 'secondaryHint', {
          color: '#64748b',
        })
        .setOrigin(0.5);
      const rightCorr = globalFontManager
        .createCrispText(this, 437, row.y, '══', 'secondaryHint', {
          color: '#64748b',
        })
        .setOrigin(0.5);
      const leftStair = globalFontManager
        .createCrispText(this, 224, row.y, '🪜', 'secondaryHint', {
          color: '#38bdf8',
        })
        .setOrigin(0.5);
      const rightStair = globalFontManager
        .createCrispText(this, 416, row.y, '🪜', 'secondaryHint', {
          color: '#38bdf8',
        })
        .setOrigin(0.5);

      children.push(leftCorr, rightCorr, leftStair, rightStair);

      // 建立左、中、右三個單元格
      const leftCell = this.createMapCell(
        row.left.areaId,
        row.left.name,
        115,
        row.y,
        154,
        23
      );
      const centerCell = this.createMapCell(
        row.center.areaId,
        row.center.name,
        320,
        row.y,
        166,
        23
      );
      const rightCell = this.createMapCell(
        row.right.areaId,
        row.right.name,
        525,
        row.y,
        154,
        23
      );

      children.push(
        leftCell.bg,
        leftCell.label,
        leftCell.pinText,
        centerCell.bg,
        centerCell.label,
        centerCell.pinText,
        rightCell.bg,
        rightCell.label,
        rightCell.pinText
      );
    });

    // 地面層（校門前廣場）
    const groundLabel = globalFontManager
      .createCrispText(this, 26, 212, '1F/G', 'secondaryHint', {
        color: '#94a3b8',
      })
      .setOrigin(0.5);
    const gateCell = this.createMapCell(
      'school_gate',
      '校門前廣場 (正門入口)',
      320,
      212,
      196,
      22
    );
    const gateConn = globalFontManager
      .createCrispText(this, 320, 198, '║', 'secondaryHint', {
        color: '#64748b',
      })
      .setOrigin(0.5);
    children.push(
      groundLabel,
      gateConn,
      gateCell.bg,
      gateCell.label,
      gateCell.pinText
    );

    // 地下室標籤與深層實驗室 (B1 ~ B3)
    const ugLabel = globalFontManager
      .createCrispText(this, 26, 240, 'B1-3', 'secondaryHint', {
        color: '#f43f5e',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const ugSub = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        238,
        '—— 地下深層管制設施 (UNDERGROUND FACILITY) ——',
        'secondaryHint',
        { color: '#f87171' }
      )
      .setOrigin(0.5);

    const b1Cell = this.createMapCell(
      'underground_b1',
      '地下通道 (B1)',
      115,
      260,
      154,
      22
    );
    const b2Cell = this.createMapCell(
      'underground_b2',
      '秘密研究室 (B2)',
      320,
      260,
      166,
      22
    );
    const b3Cell = this.createMapCell(
      'underground_b3',
      '核心隔離室 (B3)',
      525,
      260,
      154,
      22
    );

    const ugLeftCorr = globalFontManager
      .createCrispText(this, 203, 260, '══', 'secondaryHint', {
        color: '#64748b',
      })
      .setOrigin(0.5);
    const ugRightCorr = globalFontManager
      .createCrispText(this, 437, 260, '══', 'secondaryHint', {
        color: '#64748b',
      })
      .setOrigin(0.5);

    children.push(
      ugLabel,
      ugSub,
      ugLeftCorr,
      ugRightCorr,
      b1Cell.bg,
      b1Cell.label,
      b1Cell.pinText,
      b2Cell.bg,
      b2Cell.label,
      b2Cell.pinText,
      b3Cell.bg,
      b3Cell.label,
      b3Cell.pinText
    );

    // 底部詳細資訊列與圖例
    this.mapDetailText = globalFontManager
      .createCrispText(
        this,
        24,
        286,
        '📍 目前位置：點擊各房間可查看連通路線、探索狀態與特殊調查標的',
        'secondaryHint',
        {
          color: '#fef08a',
          wordWrap: { width: 568, useAdvancedWrap: true },
        }
      )
      .setOrigin(0, 0);

    const legendText = globalFontManager
      .createCrispText(
        this,
        24,
        312,
        '圖例說明：[📍你在此處] [✓已探索] [???未探索] ｜ [══]水平連通走廊 [🪜]中央棟跨樓層垂直梯',
        'secondaryHint',
        { color: '#94a3b8' }
      )
      .setOrigin(0, 0);

    children.push(this.mapDetailText, legendText);

    this.mapModal = this.add
      .container(0, 0, children)
      .setDepth(155)
      .setVisible(false);
  }

  private createMapCell(
    areaId: AreaId,
    defaultName: string,
    x: number,
    y: number,
    w: number,
    h: number
  ): {
    bg: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
    pinText: Phaser.GameObjects.Text;
  } {
    const bg = this.add
      .rectangle(x, y, w, h, 0x0f172a, 0.9)
      .setStrokeStyle(1, 0x334155)
      .setInteractive({ useHandCursor: true });

    const label = globalFontManager
      .createCrispText(this, x - w / 2 + 6, y, defaultName, 'secondaryHint', {
        color: '#cbd5e1',
      })
      .setOrigin(0, 0.5);

    const pinText = globalFontManager
      .createCrispText(this, x + w / 2 - 6, y, '', 'secondaryHint', {
        color: '#facc15',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5);

    const cellObj = { bg, label, pinText };
    this.mapGridItems.set(areaId, cellObj);

    bg.on('pointerover', () => {
      bg.setStrokeStyle(2, 0x38bdf8);
      this.displayMapRoomDetail(areaId);
    });

    bg.on('pointerout', () => {
      const isCurrent = globalExplorationState.getCurrentAreaId() === areaId;
      const isExplored = globalExplorationState.isAreaExplored(areaId);
      if (isCurrent) {
        bg.setStrokeStyle(2, 0xfacc15);
      } else if (isExplored) {
        bg.setStrokeStyle(1, 0x10b981);
      } else {
        bg.setStrokeStyle(1, 0x334155);
      }
    });

    bg.on('pointerdown', () => {
      this.displayMapRoomDetail(areaId);
    });

    return cellObj;
  }

  private displayMapRoomDetail(areaId: AreaId): void {
    if (!this.mapDetailText) return;
    const def = CAMPUS_AREAS[areaId];
    if (!def) {
      this.mapDetailText.setText(`區域情報：${areaId}`);
      return;
    }

    const currentAreaId = globalExplorationState.getCurrentAreaId();
    const currentCorridorId = globalExplorationState.getCurrentCorridorSceneId();
    const currentRoomId = globalExplorationState.getCurrentRoomSceneId();

    // 若此節點為 3×5 走廊格，呈現「第一層：走廊連通與樓梯」＋「第二層：附屬房門與室內探索狀態」
    if (def.isCorridor) {
      const corridorId = areaId as CorridorSceneId;
      const isPlayerInThisCorridor =
        currentAreaId === corridorId || currentCorridorId === corridorId;
      const isCorridorExplored =
        globalExplorationState.isCorridorExplored(corridorId) ||
        globalExplorationState.isAreaExplored(corridorId);

      const boundary = BUILDING_BOUNDARY_CONNECTIONS[corridorId];
      const westConnStr = boundary?.west
        ? `◀西連廊(${CAMPUS_AREAS[boundary.west.targetCorridorId]?.buildingName ?? boundary.west.targetCorridorId})`
        : '◀西側外牆';
      const eastConnStr = boundary?.east
        ? `東連廊(${CAMPUS_AREAS[boundary.east.targetCorridorId]?.buildingName ?? boundary.east.targetCorridorId})▶`
        : '東側外牆▶';

      const stairs = getStairsForCorridor(corridorId);
      const stairStr =
        stairs.length > 0
          ? ` | 🪜中央梯:${stairs.map((s) => `${s.direction === 'up' ? '▲' : '▼'}${s.targetFloor}F`).join(' ')}`
          : '';

      const doors = getDoorsForCorridor(corridorId);
      const doorSummaries = doors.map((d) => {
        const roomDef = CAMPUS_AREAS[d.destinationSceneId];
        const roomName = roomDef?.roomName || roomDef?.title || d.promptText;
        const isUnlocked = globalExplorationState.isDoorUnlocked(d.doorId);
        const lockBadge = d.isLockedByDefault
          ? isUnlocked
            ? '🔓已開鎖'
            : '🔒上鎖'
          : '🚪開放';
        const roomExplored =
          globalExplorationState.isRoomExplored(d.destinationSceneId) ||
          globalExplorationState.isAreaExplored(d.destinationSceneId);
        const expBadge = roomExplored ? '✓已探索' : '未探索';
        const playerInRoom =
          currentRoomId === d.destinationSceneId ? '【📍你在房內】' : '';
        return `${roomName}(x=${d.corridorX},${lockBadge},${expBadge})${playerInRoom}`;
      });

      const playerWhereTag = isPlayerInThisCorridor
        ? currentRoomId &&
          doors.some((d) => d.destinationSceneId === currentRoomId)
          ? `【📍位於室內：${CAMPUS_AREAS[currentRoomId]?.roomName ?? currentRoomId}】`
          : '【📍位於此層公共走廊】'
        : '';

      const layer1Line = `[第一層·走廊] ${def.buildingName} ${def.floorName} (${isCorridorExplored ? '✓走廊已探索' : '???走廊未探索'}) ${playerWhereTag} ｜ ${westConnStr} · ${eastConnStr}${stairStr}`;
      const layer2Line = `[第二層·房門] ${doorSummaries.length > 0 ? doorSummaries.join(' ； ') : '本層走廊無獨立室內房間（公佈欄與正門大廳）'}`;

      this.mapDetailText.setText(`${layer1Line}\n${layer2Line}`);
      this.mapDetailText.setColor(
        isPlayerInThisCorridor
          ? '#fef08a'
          : isCorridorExplored
            ? '#a7f3d0'
            : '#94a3b8'
      );
      return;
    }

    // 校門或地下 B1~B3 節點
    const isCurrent = currentAreaId === areaId;
    const isExplored = globalExplorationState.isAreaExplored(areaId);
    const curTag = isCurrent ? '【📍 你當前所在位置】' : '';
    const expTag = isExplored ? '✓ 已探索' : '??? 未探索區域';
    const locName =
      def.fullDisplayName ||
      `「${def.buildingName || ''} ${def.floorName || ''} ${def.title}」`;
    const portals =
      def.interactables
        .filter((i) => i.kind === 'portal')
        .map((p) => p.promptAction)
        .join('、') || '無連通通道';

    this.mapDetailText.setText(
      `${curTag}${locName} [${expTag}]\n連通出入口：${portals} | 簡介：${def.subtitle}`
    );
    this.mapDetailText.setColor(
      isCurrent ? '#fef08a' : isExplored ? '#a7f3d0' : '#94a3b8'
    );
  }

  private refreshMapModal(): void {
    const currentAreaId = globalExplorationState.getCurrentAreaId();
    const currentCorridorId = globalExplorationState.getCurrentCorridorSceneId();
    const currentRoomId = globalExplorationState.getCurrentRoomSceneId();

    for (const [areaIdStr, item] of this.mapGridItems.entries()) {
      const areaId = areaIdStr as AreaId;
      const def = CAMPUS_AREAS[areaId];
      const isCorridorCell = Boolean(def?.isCorridor);

      const isCurrent = isCorridorCell
        ? currentAreaId === areaId ||
          (currentRoomId !== null && currentCorridorId === areaId)
        : currentAreaId === areaId;

      const isExplored = isCorridorCell
        ? globalExplorationState.isCorridorExplored(areaId as CorridorSceneId) ||
          globalExplorationState.isAreaExplored(areaId)
        : globalExplorationState.isAreaExplored(areaId);

      // 若為走廊格，保留「樓層走廊▸附屬房間」雙層摘要標籤
      let cellLabel = item.label.text;
      if (isCorridorCell && def) {
        const doors = getDoorsForCorridor(areaId as CorridorSceneId);
        const firstDoor = doors[0];
        if (firstDoor) {
          const roomDef = CAMPUS_AREAS[firstDoor.destinationSceneId];
          const shortRoom =
            roomDef?.roomName?.slice(0, 5) ||
            firstDoor.promptText.replace('按 E 進入：', '').slice(0, 5);
          const lockIcon =
            firstDoor.isLockedByDefault &&
            !globalExplorationState.isDoorUnlocked(firstDoor.doorId)
              ? '🔒'
              : '';
          cellLabel = `${def.floor}走廊▸${shortRoom}${lockIcon}`;
        }
      } else if (def) {
        cellLabel = def.roomName || def.title;
      }

      if (isCurrent) {
        item.bg.setFillStyle(0x78350f, 0.95);
        item.bg.setStrokeStyle(2, 0xfacc15);
        item.label.setText(cellLabel);
        item.label.setColor('#fef08a');
        const pinLabel =
          isCorridorCell && currentRoomId
            ? '📍房內'
            : isCorridorCell
              ? '📍走廊'
              : '📍在這';
        item.pinText.setText(pinLabel);
        item.pinText.setColor('#facc15');
        item.pinText.setVisible(true);
      } else if (isExplored) {
        item.bg.setFillStyle(0x064e3b, 0.85);
        item.bg.setStrokeStyle(1, 0x10b981);
        item.label.setText(cellLabel);
        item.label.setColor('#a7f3d0');
        item.pinText.setText('✓');
        item.pinText.setColor('#34d399');
        item.pinText.setVisible(true);
      } else {
        item.bg.setFillStyle(0x0f172a, 0.85);
        item.bg.setStrokeStyle(1, 0x334155);
        item.label.setText(cellLabel);
        item.label.setColor('#64748b');
        item.pinText.setText('');
        item.pinText.setVisible(false);
      }
    }

    const detailTargetAreaId: AreaId =
      CAMPUS_AREAS[currentAreaId]?.isCorridor ||
      currentAreaId === 'school_gate' ||
      currentAreaId.startsWith('underground_')
        ? currentAreaId
        : (currentCorridorId ?? currentAreaId);
    this.displayMapRoomDetail(detailTargetAreaId);
  }

  public toggleMapModal(): void {
    if (this.mapModal && this.mapModal.visible) {
      this.closeMapModal();
    } else {
      globalEventBus.emit(GameEvents.UI_MODAL_CHANGED, {
        modalState: 'map',
        result: null,
      });
    }
  }

  public closeMapModal(): void {
    globalEventBus.emit(GameEvents.UI_MODAL_CHANGED, {
      modalState: 'none',
      result: null,
    });
  }

  // ==========================================
  // Phase 6B-2: 繁體中文字體清晰度檢測展示介面
  // ==========================================

  private createFontShowcaseModal(): void {
    const modalBg = this.add
      .rectangle(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
        LOGICAL_WIDTH,
        LOGICAL_HEIGHT,
        0x020617,
        0.94
      )
      .setInteractive();

    const panel = this.add
      .rectangle(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
        616,
        338,
        0x090d16,
        0.98
      )
      .setStrokeStyle(2, 0xa855f7);

    const title = globalFontManager
      .createCrispText(
        this,
        24,
        20,
        '🔤 繁體中文字體清晰度與渲染檢驗展示 (FONT SHOWCASE)',
        'speakerName',
        { color: '#c084fc' }
      )
      .setOrigin(0, 0.5);

    const sub = globalFontManager
      .createCrispText(
        this,
        24,
        38,
        '字體配置：Noto Sans TC | 邏輯解析度：640×360 | 筆畫抗模糊對齊 | 嚴格 >= 12px',
        'secondaryHint',
        { color: '#94a3b8' }
      )
      .setOrigin(0, 0.5);

    const closeBtn = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH - 24,
        22,
        '[✕ 關閉 (Esc)]',
        'secondaryHint',
        {
          color: '#f87171',
          backgroundColor: '#450a0add',
          padding: { x: 6, y: 2 },
        }
      )
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this.closeFontShowcaseModal());

    const children: Phaser.GameObjects.GameObject[] = [
      modalBg,
      panel,
      title,
      sub,
      closeBtn,
    ];

    // 左欄 (x = 24 ~ 330)
    // 1. 高難度生僻字與繁體極限筆畫
    const t1 = globalFontManager.createCrispText(
      this,
      24,
      54,
      '【1. 繁體高難度生僻與極限筆畫測試】',
      'secondaryHint',
      { color: '#fde68a' }
    );
    const cjkText = globalFontManager.createCrispText(
      this,
      24,
      72,
      '鬱 驫 鸞 鑿 囊 釁 灤 鱟 籲 驚 艷 嚴 龜 囑 攬 疊 驟 體',
      'dialogueBody',
      { color: '#f8fafc' }
    );

    // 2. 劇情世界觀長句實測 (16px)
    const t2 = globalFontManager.createCrispText(
      this,
      24,
      102,
      '【2. 劇情代表長句實測 (16px 正文標準)】',
      'secondaryHint',
      { color: '#fde68a' }
    );
    const pangram1 = globalFontManager.createCrispText(
      this,
      24,
      120,
      '「白川財閥於1954年創立私立白川學園，地下三層隱藏回聲搖籃人體實驗。」\n「18.9Hz第四聲鐘響伴隨認知過濾，第29號席位之謎終將揭曉。」',
      'documentBody',
      {
        color: '#e2e8f0',
        wordWrap: { width: 310, useAdvancedWrap: true },
        lineSpacing: 4,
      }
    );

    // 3. 標點符號與英數對齊
    const t3 = globalFontManager.createCrispText(
      this,
      24,
      186,
      '【3. 英數符號與全半形排版對齊】',
      'secondaryHint',
      { color: '#fde68a' }
    );
    const symText = globalFontManager.createCrispText(
      this,
      24,
      204,
      '0123456789 | AaBbCcZz | 18.9Hz\n【】『』「」——……！？：；、（）《》',
      'secondaryHint',
      { color: '#cbd5e1' }
    );

    // 4. 高對比度色彩底框測試
    const t4 = globalFontManager.createCrispText(
      this,
      24,
      242,
      '【4. 高對比色彩框實測】',
      'secondaryHint',
      { color: '#fde68a' }
    );
    const darkBox = this.add
      .rectangle(94, 276, 140, 36, 0x020617)
      .setStrokeStyle(1, 0x475569);
    const darkBoxText = globalFontManager
      .createCrispText(this, 94, 276, '深底白字 (16px)', 'menuItem', {
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    const lightBox = this.add
      .rectangle(248, 276, 140, 36, 0xf1f5f9)
      .setStrokeStyle(1, 0x94a3b8);
    const lightBoxText = globalFontManager
      .createCrispText(this, 248, 276, '淺底黑字 (16px)', 'menuItem', {
        color: '#0f172a',
      })
      .setOrigin(0.5);

    children.push(
      t1,
      cjkText,
      t2,
      pangram1,
      t3,
      symText,
      t4,
      darkBox,
      darkBoxText,
      lightBox,
      lightBoxText
    );

    // 右欄 (x = 345 ~ 600)
    // 5. 字級階梯規範 (>= 12px)
    const t5 = globalFontManager.createCrispText(
      this,
      345,
      54,
      '【5. 遊戲字級規範階梯 (嚴格 >= 12px)】',
      'secondaryHint',
      { color: '#fde68a' }
    );
    const ladder1 = globalFontManager.createCrispText(
      this,
      345,
      72,
      '20px：重大提示 importantPrompt',
      'importantPrompt',
      { color: '#38bdf8' }
    );
    const ladder2 = globalFontManager.createCrispText(
      this,
      345,
      100,
      '17px：說話者名稱 speakerName [蘇語晴]',
      'speakerName',
      { color: '#fcd34d' }
    );
    const ladder3 = globalFontManager.createCrispText(
      this,
      345,
      126,
      '16px：對白內文 dialogueBody [語音與文字]',
      'dialogueBody',
      { color: '#ffffff' }
    );
    const ladder4 = globalFontManager.createCrispText(
      this,
      345,
      152,
      '16px：選單與文件 menuItem / documentBody',
      'menuItem',
      { color: '#a7f3d0' }
    );
    const ladder5 = globalFontManager.createCrispText(
      this,
      345,
      178,
      '12px：次要提示 secondaryHint (系統底限)',
      'secondaryHint',
      { color: '#94a3b8' }
    );

    // 6. 渲染與技術規範摘要
    const t6 = globalFontManager.createCrispText(
      this,
      345,
      206,
      '【6. 字體渲染技術指標】',
      'secondaryHint',
      { color: '#fde68a' }
    );
    const techText = globalFontManager.createCrispText(
      this,
      345,
      224,
      '・字體來源：Google Fonts Noto Sans TC (400, 700)\n・預載機制：BootScene CSS Font Preload 異步就緒\n・抗模糊：roundPixels: true，原尺寸無失真繪製\n・缺字防護：全系列繁體中文、日韓假名與特殊符號\n・標準規格：所有正文與按鈕均嚴格 >= 16px',
      'secondaryHint',
      {
        color: '#6ee7b7',
        lineSpacing: 3,
      }
    );

    const returnBtn = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        316,
        '✕ 返回遊戲 / 關閉展示 [Esc / 點擊]',
        'menuItem',
        {
          color: '#fef08a',
          backgroundColor: '#1e293b',
          padding: { x: 12, y: 4 },
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    returnBtn.on('pointerdown', () => this.closeFontShowcaseModal());

    children.push(
      t5,
      ladder1,
      ladder2,
      ladder3,
      ladder4,
      ladder5,
      t6,
      techText,
      returnBtn
    );

    this.fontShowcaseModal = this.add
      .container(0, 0, children)
      .setDepth(165)
      .setVisible(false);
  }

  public openFontShowcaseModal(): void {
    if (this.fontShowcaseModal) {
      this.fontShowcaseModal.setVisible(true);
    }
  }

  public closeFontShowcaseModal(): void {
    if (this.fontShowcaseModal) {
      this.fontShowcaseModal.setVisible(false);
    }
  }

  // ==========================================
  // Phase 6B-2: HUD 耐力條視覺渲染
  // ==========================================

  private drawStaminaBar(
    stamina: number,
    maxStamina: number,
    isExhausted: boolean
  ): void {
    if (!this.staminaBarGraphics) return;
    this.staminaBarGraphics.clear();

    const barX = 8;
    const barY = 36;
    const barW = 100;
    const barH = 4;

    // 外框背景
    this.staminaBarGraphics.fillStyle(0x0f172a, 0.9);
    this.staminaBarGraphics.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    this.staminaBarGraphics.lineStyle(1, 0x475569, 0.8);
    this.staminaBarGraphics.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);

    // 填充
    const ratio = Math.max(0, Math.min(1, stamina / maxStamina));
    const fillW = Math.round(barW * ratio);

    if (fillW > 0) {
      let fillColor = 0x10b981;
      if (isExhausted) {
        fillColor = 0xef4444;
      } else if (ratio < 0.3) {
        fillColor = 0xf59e0b;
      } else if (ratio < 0.7) {
        fillColor = 0x38bdf8;
      }
      this.staminaBarGraphics.fillStyle(fillColor, 1);
      this.staminaBarGraphics.fillRect(barX, barY, fillW, barH);
    }
  }
}
