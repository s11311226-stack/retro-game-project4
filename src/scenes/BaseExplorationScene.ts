import Phaser from 'phaser';
import { DEFAULT_PLAYER_CONFIG, LOGICAL_WIDTH } from '../config/playerConfig';
import { GameEvents, globalEventBus } from '../core/EventBus';
import { getAreaDefinition } from '../data/campusAreas';
import { getNPCScenePlacement } from '../data/npcDialoguesCatalog';
import { InteractablePlaceholderRenderer } from '../entities/InteractablePlaceholderRenderer';
import { PlaceholderCharacterRenderer } from '../entities/PlaceholderCharacterRenderer';
import { PlayerController } from '../entities/PlayerController';
import { globalAudioSynth } from '../systems/AudioSynthManager';
import { globalCampusAtmosphere } from '../systems/CampusAtmosphereSystem';
import { globalRelationshipSystem } from '../systems/CharacterRelationshipSystem';
import { globalEvidenceSystem } from '../systems/EvidenceSystem';
import { globalExplorationState } from '../systems/ExplorationStateManager';
import { globalFontManager } from '../systems/FontManager';
import { globalGameState } from '../systems/GlobalGameState';
import { InputManager } from '../systems/InputManager';
import { globalNPCInteractionSystem } from '../systems/NPCInteractionSystem';
import { globalQuestSystem } from '../systems/QuestSystem';
import { globalSaveManager } from '../systems/SaveManager';
import {
  type ActiveStoryDialogueState,
  globalStoryState,
} from '../systems/StoryStateManager';
import type {
  AreaDefinition,
  AreaId,
  CampusTimePhase,
  FacingDirection,
  ICharacterVisualAdapter,
  InteractableDefinition,
  InteractionExecutionResult,
  PlayerActionState,
  PlayerStateSnapshot,
} from '../types';

export interface SceneTransitionData {
  spawnId?: string;
  restoredX?: number;
  restoredY?: number;
  restoredFacing?: FacingDirection;
}

/**
 * 校園可探索區域共用場景基底類別 (BaseExplorationScene)
 *
 * 1. 支援全部 11 個地面校園探索場景（校門、公告欄區域、校園走廊、教室、教務處、教師辦公室、宿舍、舊圖書館、禁書室、頂樓、保健室）。
 * 2. 完整保留並共用 Phase 1 已驗收的 `PlayerController`、`InputManager`、`PlaceholderCharacterRenderer`。
 * 3. 整合 `ExplorationStateManager`、`StoryStateManager`、`NPCInteractionSystem`、`CampusAtmosphereSystem`、`SaveManager` 與 `AudioSynthManager`。
 * 4. 支援日間 (`day`)、黃昏 (`dusk` 第四聲鐘響 18.9Hz) 與夜間 (`night`) 視覺氛圍渲染與音訊演出。
 */
export abstract class BaseExplorationScene extends Phaser.Scene {
  protected readonly areaId: AreaId;
  protected areaDef!: AreaDefinition;

  protected inputManager!: InputManager;
  protected playerController!: PlayerController;
  protected playerVisual!: ICharacterVisualAdapter;
  protected interactableRenderers: InteractablePlaceholderRenderer[] = [];
  protected atmosphereOverlay?: Phaser.GameObjects.Graphics;

  protected isGamePaused = false;
  protected isTransitioning = false;
  private transitionData?: SceneTransitionData;
  private previousPlayerState: PlayerActionState = 'idle';

  // 在走廊場景保留 Phase 1 的攻擊有效判定測試標靶
  private dummyTargetRect = new Phaser.Geom.Rectangle(520, 248, 28, 64);
  private dummyGraphics?: Phaser.GameObjects.Graphics;
  private dummyHitFlashMs = 0;
  private lastAttackHitTriggered = false;

  private unsubscribers: Array<() => void> = [];

  constructor(sceneKey: string, areaId: AreaId) {
    super({ key: sceneKey });
    this.areaId = areaId;
  }

  public init(data?: SceneTransitionData): void {
    this.isGamePaused = false;
    this.isTransitioning = false;
    this.transitionData = data;
    this.areaDef = getAreaDefinition(this.areaId);
    globalExplorationState.setAreaAndSpawn(this.areaId, data?.spawnId);
    globalExplorationState.setModalState('none');
  }

  public create(): void {
    // 確保 UIScene 已平行啟動
    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }

    globalAudioSynth.attachUserGestureUnlock(window);
    globalAudioSynth.startLoopingBgm();

    // 1. 繪製當前區域專屬背景、牆面、地面與邊界標示
    this.renderAreaEnvironment();

    // 2. 建立日／黃昏／夜氛圍光影疊層
    this.atmosphereOverlay = this.add.graphics().setDepth(30);
    this.syncAtmosphereOverlay();

    // 3. 初始化集中式輸入管理
    this.inputManager = new InputManager();
    this.inputManager.attachToDom(window);

    // 4. 計算安全落地出生點（或讀檔還原座標，確保不卡牆、不懸空）並初始化 PlayerController
    const spawnLoc = globalExplorationState.getCurrentSpawnLocation(
      DEFAULT_PLAYER_CONFIG.collider.width
    );
    const startX =
      typeof this.transitionData?.restoredX === 'number'
        ? this.transitionData.restoredX
        : spawnLoc.x;
    const startY =
      typeof this.transitionData?.restoredY === 'number'
        ? this.transitionData.restoredY
        : spawnLoc.y;
    const startFacing = this.transitionData?.restoredFacing ?? spawnLoc.facing;

    this.playerController = new PlayerController(
      startX,
      startY,
      {
        minX: this.areaDef.bounds.minX,
        maxX: this.areaDef.bounds.maxX,
        floorY: this.areaDef.bounds.floorY,
      },
      DEFAULT_PLAYER_CONFIG
    );
    this.playerController.setSpawnPosition(startX, startY, startFacing);
    this.previousPlayerState = 'idle';

    // 5. 初始化角色占位視覺渲染器
    this.playerVisual = new PlaceholderCharacterRenderer(
      this,
      this.playerController.getConfig()
    );

    // 6. 建立本區域所有互動物件與 NPC 渲染器與滑鼠點擊綁定
    this.createAreaInteractables();

    // 7. 若在走廊場景，一併繪製 Phase 1 靜態擊打測試標靶以維持向下相容
    if (this.areaId === 'corridor') {
      this.createCombatHitDummy();
    }

    // 8. 設定攝影機邊界並立即對齊玩家初始位置
    this.cameras.main.setBounds(
      0,
      0,
      this.areaDef.bounds.width,
      this.areaDef.bounds.height
    );
    const initialSnapshot = this.playerController.getSnapshot();
    this.cameras.main.scrollX = Phaser.Math.Clamp(
      initialSnapshot.x - LOGICAL_WIDTH / 2,
      0,
      Math.max(0, this.areaDef.bounds.width - LOGICAL_WIDTH)
    );
    this.cameras.main.fadeIn(180, 8, 12, 20);

    // 9. 訂閱來自 UIScene 的事件請求
    this.unsubscribers.push(
      globalEventBus.on(GameEvents.UI_REQUEST_CLOSE_MODAL, () => {
        if (!this.isTransitioning && !this.isGamePaused) {
          this.handleCloseActiveModal();
        }
      }),
      globalEventBus.on(GameEvents.UI_REQUEST_ADVANCE_DIALOGUE, () => {
        if (!this.isTransitioning && !this.isGamePaused) {
          this.handleAdvanceDialogue();
        }
      }),
      globalEventBus.on(
        GameEvents.UI_REQUEST_SELECT_NPC_CHOICE,
        (payload?: { choiceId: string }) => {
          if (!this.isTransitioning && !this.isGamePaused && payload?.choiceId) {
            this.handleSelectNPCChoice(payload.choiceId);
          }
        }
      ),
      globalEventBus.on(
        GameEvents.UI_REQUEST_CYCLE_TIME_PHASE,
        (payload?: { targetPhase?: CampusTimePhase }) => {
          if (!this.isTransitioning) {
            this.handleCycleTimePhase(payload?.targetPhase);
          }
        }
      ),
      globalEventBus.on(GameEvents.UI_REQUEST_TOGGLE_INVENTORY, () => {
        if (!this.isTransitioning && !this.isGamePaused) {
          this.toggleInventory();
        }
      }),
      globalEventBus.on(GameEvents.UI_REQUEST_RESTART_DEMO, () => {
        this.restartDemoSession();
      }),
      globalEventBus.on(GameEvents.UI_REQUEST_MANUAL_SAVE, () => {
        this.performSaveGame(true);
      }),
      globalEventBus.on(GameEvents.UI_REQUEST_LOAD_SAVE, () => {
        this.performLoadSavedGame();
      }),
      globalEventBus.on(GameEvents.UI_REQUEST_RETURN_MAIN_MENU, () => {
        this.returnToMainMenu();
      })
    );

    // 10. 初始同步畫面與全域事件
    this.playerVisual.syncVisuals(initialSnapshot);
    this.syncInteractablesAndPrompt(initialSnapshot.x);

    globalEventBus.emit(GameEvents.AREA_CHANGED, {
      area: this.areaDef,
      spawn: spawnLoc,
    });
    globalEventBus.emit(GameEvents.TIME_PHASE_CHANGED, {
      phase: globalCampusAtmosphere.getCurrentPhase(),
      profile: globalCampusAtmosphere.getCurrentProfile(),
    });
    globalEventBus.emit(GameEvents.PLAYER_STATE_CHANGED, initialSnapshot);
    globalEventBus.emit(
      GameEvents.INVENTORY_UPDATED,
      globalExplorationState.getInventoryItems()
    );
    globalEventBus.emit(
      GameEvents.CLUES_UPDATED,
      globalExplorationState.getClues()
    );
    globalEventBus.emit(
      GameEvents.STORY_OBJECTIVE_UPDATED,
      globalStoryState.getCurrentObjective()
    );

    // 11. 檢查進入此區域是否有劇情演出（例如校門初始入學演出、首次進入教室演出）
    const areaDialogue = globalStoryState.checkAreaEnterTriggers(this.areaId);
    if (areaDialogue) {
      this.enterStoryDialogueMode(areaDialogue);
    } else {
      this.emitModalState(null);
      // 進入新區域時執行自動存檔
      this.performSaveGame(false);
    }

    // 12. 註冊 Scene 關閉時的清理邏輯
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputManager.detachFromDom();
      this.playerVisual.destroy();
      this.interactableRenderers.forEach((r) => r.destroy());
      this.interactableRenderers = [];
      this.atmosphereOverlay?.destroy();
      this.unsubscribers.forEach((unsub) => unsub());
      this.unsubscribers = [];
    });
  }

  public update(_time: number, delta: number): void {
    const inputSnapshot = this.inputManager.consumeSnapshot();

    if (this.isTransitioning) {
      return;
    }

    const currentModal = globalExplorationState.getModalState();

    // 若在體驗版通關結尾畫面 (ending)，按 E 或 Space 可重新開始體驗版
    if (currentModal === 'ending') {
      if (inputSnapshot.interactJustPressed || inputSnapshot.jumpJustPressed) {
        this.restartDemoSession();
      }
      return;
    }

    // 若在劇情或 NPC 對話演出模式 (dialogue)，按 E / Space / J 可推進下一句對話
    if (currentModal === 'dialogue') {
      if (
        inputSnapshot.interactJustPressed ||
        inputSnapshot.jumpJustPressed ||
        inputSnapshot.attackJustPressed
      ) {
        this.handleAdvanceDialogue();
      } else if (inputSnapshot.pauseJustPressed) {
        this.handleCloseActiveModal();
      }
      return;
    }

    // 處理當前開啟的調查視窗或文件閱讀視窗
    if (currentModal === 'inspect' || currentModal === 'document') {
      if (inputSnapshot.interactJustPressed || inputSnapshot.pauseJustPressed) {
        this.handleCloseActiveModal();
      }
      return;
    }

    // 處理背包與正式版系統中心開啟狀態
    if (currentModal === 'inventory') {
      if (
        inputSnapshot.inventoryJustPressed ||
        inputSnapshot.pauseJustPressed
      ) {
        globalExplorationState.closeModal();
        this.inputManager.resetAllInputs();
        this.emitModalState(null);
      }
      return;
    }

    // 處理遊戲暫停與恢復
    if (inputSnapshot.pauseJustPressed) {
      this.togglePause();
      return;
    }

    if (this.isGamePaused) {
      return;
    }

    // 處理開啟背包 (按 I 或 Tab)
    if (inputSnapshot.inventoryJustPressed) {
      this.toggleInventory();
      return;
    }

    // 處理按 E 進行環境或 NPC 互動
    const currentSnap = this.playerController.getSnapshot();
    if (inputSnapshot.interactJustPressed) {
      const candidate = globalExplorationState.findCandidateInRange(
        currentSnap.x
      );
      if (candidate) {
        this.executeObjectInteraction(candidate);
        return;
      }
    }

    // 推進 Phase 1 玩家移動、跳躍、攻擊與格擋狀態機
    const clampedDelta = Math.min(delta, 50);
    const snapshot = this.playerController.step(clampedDelta, inputSnapshot);

    // 根據玩家狀態轉換播放對應動作音效（腳步、跳躍、攻擊、格擋）
    this.triggerMovementAndCombatSfx(snapshot);

    if (this.areaId === 'corridor') {
      this.checkAttackHitboxAgainstTarget(snapshot, clampedDelta);
    }

    // 同步角色視覺、互動物件提示與攝影機位置
    this.playerVisual.syncVisuals(snapshot);
    this.syncInteractablesAndPrompt(snapshot.x);
    this.updateCameraFollow(snapshot);

    globalEventBus.emit(GameEvents.PLAYER_STATE_CHANGED, snapshot);
  }

  private triggerMovementAndCombatSfx(snapshot: PlayerStateSnapshot): void {
    const prev = this.previousPlayerState;
    const next = snapshot.state;

    if (next === 'jump' && prev !== 'jump') {
      globalAudioSynth.playJump();
    } else if (next === 'attack' && prev !== 'attack') {
      globalAudioSynth.playAttack();
    } else if (next === 'block' && prev !== 'block') {
      globalAudioSynth.playBlock();
    } else if (next === 'move' && snapshot.isGrounded) {
      globalAudioSynth.playFootstep(this.time.now);
    }

    this.previousPlayerState = next;
  }

  public togglePause(forceState?: boolean): void {
    globalAudioSynth.playUiClick();
    this.isGamePaused =
      forceState !== undefined ? forceState : !this.isGamePaused;
    this.playerController.setPaused(this.isGamePaused);

    if (this.isGamePaused) {
      this.inputManager.resetAllInputs();
      globalExplorationState.setModalState('paused');
      if (this.physics && this.physics.world) {
        this.physics.world.pause();
      }
    } else {
      globalExplorationState.setModalState('none');
      if (this.physics && this.physics.world) {
        this.physics.world.resume();
      }
    }

    globalEventBus.emit(GameEvents.GAME_PAUSE_CHANGED, this.isGamePaused);
    this.emitModalState(null);
  }

  private performSaveGame(notifyUser: boolean): void {
    const snap = this.playerController.getSnapshot();
    const savedPayload = globalSaveManager.saveCurrentGame(
      globalExplorationState,
      globalStoryState,
      {
        x: snap.x,
        y: snap.y,
        facing: snap.facing,
      },
      globalAudioSynth.getSettings()
    );

    if (notifyUser) {
      globalAudioSynth.playItemPickup();
      globalEventBus.emit(
        GameEvents.SAVE_STATUS_NOTIFICATION,
        `💾 存檔成功！(v${savedPayload.schemaVersion} - ${this.areaDef.title})`
      );
    }
  }

  private performLoadSavedGame(): void {
    const loadRes = globalSaveManager.loadAndValidateSave();
    if (!loadRes.success || !loadRes.data) {
      globalAudioSynth.playAnomalyGlitchStinger();
      globalEventBus.emit(
        GameEvents.SAVE_STATUS_NOTIFICATION,
        `⚠️ 讀取失敗：無有效存檔或資料已損毀 (${loadRes.reason ?? 'unknown'})`
      );
      return;
    }

    globalAudioSynth.playDoorOpen();
    this.inputManager.resetAllInputs();
    if (this.isGamePaused) {
      this.togglePause(false);
    }

    const restoredLoc = globalSaveManager.applySaveToManagers(
      loadRes.data,
      globalExplorationState,
      globalStoryState
    );
    const targetArea = getAreaDefinition(restoredLoc.areaId);

    globalEventBus.emit(
      GameEvents.SAVE_STATUS_NOTIFICATION,
      `📂 已載入存檔：返回【${targetArea.title}】`
    );

    this.scene.start(targetArea.sceneKey, {
      spawnId: restoredLoc.spawnId,
      restoredX: restoredLoc.x,
      restoredY: restoredLoc.y,
      restoredFacing: restoredLoc.facing,
    });
  }

  private returnToMainMenu(): void {
    globalAudioSynth.playUiClick();
    this.inputManager.resetAllInputs();
    if (this.isGamePaused) {
      this.togglePause(false);
    }
    this.scene.stop('UIScene');
    this.scene.start('MainMenuScene');
  }

  private handleCloseActiveModal(): void {
    const closedObjId = globalExplorationState.getLastInteractedObjectId();
    if (globalNPCInteractionSystem.getActiveSession()) {
      globalNPCInteractionSystem.closeSession();
      globalEventBus.emit(GameEvents.NPC_DIALOGUE_UPDATED, null);
    }

    globalExplorationState.closeModal();
    this.inputManager.resetAllInputs();
    globalAudioSynth.playUiClick();

    if (closedObjId) {
      const triggeredDialogue =
        globalStoryState.checkAfterObjectModalClosed(closedObjId);
      if (triggeredDialogue) {
        this.enterStoryDialogueMode(triggeredDialogue);
        return;
      }
    }

    this.performSaveGame(false);
    this.emitModalState(null);
  }

  private enterStoryDialogueMode(dialogue: ActiveStoryDialogueState): void {
    this.inputManager.resetAllInputs();
    globalExplorationState.setModalState('dialogue');

    if (dialogue.presentationEffect === 'screen_flicker_anomaly') {
      this.triggerScreenFlickerAnomaly();
    }

    globalEventBus.emit(GameEvents.STORY_DIALOGUE_UPDATED, dialogue);
    this.emitModalState(null);
  }

  private handleAdvanceDialogue(): void {
    // 若目前正在進行 NPC 角色互動對話，優先推進 NPC 對話
    const activeNpcSession = globalNPCInteractionSystem.getActiveSession();
    if (activeNpcSession) {
      globalAudioSynth.playUiClick();
      this.inputManager.resetAllInputs();

      // 若已顯示選項，按空白鍵或 E 時不強制關閉，等待玩家點選選項或按數字鍵；若無選項則推進
      if (
        activeNpcSession.showingChoices &&
        activeNpcSession.availableChoices.length > 0
      ) {
        return;
      }

      const nextSession = globalNPCInteractionSystem.advanceLine();
      if (nextSession) {
        globalEventBus.emit(GameEvents.NPC_DIALOGUE_UPDATED, nextSession);
        return;
      }

      globalEventBus.emit(GameEvents.NPC_DIALOGUE_UPDATED, null);
      globalExplorationState.setModalState('none');
      this.performSaveGame(false);
      this.emitModalState(null);
      return;
    }

    this.handleAdvanceStoryDialogue();
  }

  private handleSelectNPCChoice(choiceId: string): void {
    globalAudioSynth.playUiClick();
    this.inputManager.resetAllInputs();

    if (choiceId === '__close_npc_dialogue__') {
      globalNPCInteractionSystem.closeSession();
      globalEventBus.emit(GameEvents.NPC_DIALOGUE_UPDATED, null);
      globalExplorationState.setModalState('none');
      this.performSaveGame(false);
      this.emitModalState(null);
      return;
    }

    const activeSession = globalNPCInteractionSystem.getActiveSession();
    const placementId = globalExplorationState.getLastInteractedObjectId();
    const placement = placementId ? getNPCScenePlacement(placementId) : null;
    const choiceDef = placement?.choices.find((c) => c.id === choiceId);

    const selectRes = globalNPCInteractionSystem.selectChoice(
      choiceId,
      globalStoryState.getFlags(),
      globalCampusAtmosphere.getCurrentPhase()
    );
    const updatedSession = selectRes.session;

    // 若該對話選項授予背包物品，立即加入 ExplorationStateManager 與 EvidenceSystem
    if (choiceDef?.outcome?.grantItemId) {
      const grantedItem = globalExplorationState.grantItem(
        choiceDef.outcome.grantItemId
      );
      if (grantedItem) {
        globalEvidenceSystem.collectEvidence(grantedItem.id);
        globalAudioSynth.playItemPickup();
        globalEventBus.emit(
          GameEvents.INVENTORY_UPDATED,
          globalExplorationState.getInventoryItems()
        );
      }
    }

    // 若該對話選項切換時段
    if (choiceDef?.outcome?.advanceTimePhaseTo) {
      this.handleCycleTimePhase(choiceDef.outcome.advanceTimePhaseTo);
    }

    if (updatedSession) {
      globalEventBus.emit(GameEvents.NPC_DIALOGUE_UPDATED, updatedSession);
    } else if (activeSession) {
      globalEventBus.emit(GameEvents.NPC_DIALOGUE_UPDATED, null);
      globalExplorationState.setModalState('none');
      this.emitModalState(null);
    }
  }

  private handleCycleTimePhase(targetPhase?: CampusTimePhase): void {
    const hasChime =
      globalExplorationState.hasItem('item_yulan_tuning_fork') ||
      globalEvidenceSystem.hasEvidence('item_yulan_tuning_fork');

    const res = targetPhase
      ? globalCampusAtmosphere.transitionToPhase(targetPhase, {
          hasCounterPhaseChime: hasChime,
        })
      : globalCampusAtmosphere.cycleNextPhase({
          hasCounterPhaseChime: hasChime,
        });

    if (res.fourthBellTriggered) {
      globalAudioSynth.playFourthBellChime();
      if (res.protectedByCounterChime) {
        globalAudioSynth.playCounterPhaseChime();
      } else {
        this.cameras.main.shake(220, 0.003);
      }
    } else {
      globalAudioSynth.playUiClick();
    }

    this.syncAtmosphereOverlay();
    globalEventBus.emit(GameEvents.TIME_PHASE_CHANGED, {
      phase: res.currentPhase,
      profile: globalCampusAtmosphere.getCurrentProfile(),
      message: res.message,
    });
    globalEventBus.emit(GameEvents.SAVE_STATUS_NOTIFICATION, res.message);
  }

  private syncAtmosphereOverlay(): void {
    if (!this.atmosphereOverlay) return;
    const profile = globalCampusAtmosphere.getCurrentProfile();
    const { width, height } = this.areaDef.bounds;
    this.atmosphereOverlay.clear();
    if (profile.tintAlpha > 0) {
      this.atmosphereOverlay.fillStyle(profile.tintColor, profile.tintAlpha);
      this.atmosphereOverlay.fillRect(0, 0, width, height);
    }
  }

  private handleAdvanceStoryDialogue(): void {
    globalAudioSynth.playUiClick();
    this.inputManager.resetAllInputs();

    const { dialogueState, completedEvent, shouldEnterDemoEnding } =
      globalStoryState.advanceDialogue();

    globalEventBus.emit(
      GameEvents.STORY_OBJECTIVE_UPDATED,
      globalStoryState.getCurrentObjective()
    );

    if (dialogueState) {
      if (
        dialogueState.presentationEffect === 'screen_flicker_anomaly' &&
        dialogueState.currentLineIndex === 2
      ) {
        this.triggerScreenFlickerAnomaly();
      }
      globalEventBus.emit(GameEvents.STORY_DIALOGUE_UPDATED, dialogueState);
      return;
    }

    globalEventBus.emit(GameEvents.STORY_DIALOGUE_UPDATED, null);
    this.performSaveGame(false);

    if (shouldEnterDemoEnding && completedEvent) {
      globalExplorationState.setModalState('ending');
      globalEventBus.emit(GameEvents.STORY_ENTER_ENDING, {
        chapterTitle: globalStoryState.getChapterTitle(),
        clues: globalExplorationState.getClues(),
        items: globalExplorationState.getInventoryItems(),
        metrics: globalStoryState.getMetrics(),
        endingRouteId: globalStoryState.resolveEndingRouteId(),
      });
      this.emitModalState(null);
      return;
    }

    globalExplorationState.setModalState('none');
    this.emitModalState(null);
  }

  /**
   * 溫和且不影響文字可讀性的短暫視覺與音效閃爍演出
   */
  private triggerScreenFlickerAnomaly(): void {
    globalAudioSynth.playAnomalyGlitchStinger();
    this.cameras.main.shake(260, 0.004);
    this.cameras.main.flash(220, 120, 20, 28);
    globalEventBus.emit(GameEvents.STORY_ANOMALY_FLICKER);
  }

  private restartDemoSession(): void {
    globalAudioSynth.playUiClick();
    this.inputManager.resetAllInputs();
    globalExplorationState.resetSession('school_gate', 'initial_spawn');
    globalStoryState.resetStoryState();
    globalGameState.reset('system_init', 'Restart demo session');
    globalRelationshipSystem.reset();
    globalEvidenceSystem.reset();
    globalQuestSystem.reset();
    globalCampusAtmosphere.reset();
    globalNPCInteractionSystem.reset();
    this.scene.start('SchoolGateScene', { spawnId: 'initial_spawn' });
  }

  private toggleInventory(): void {
    globalAudioSynth.playUiClick();
    const nextState = globalExplorationState.toggleInventoryModal();
    this.inputManager.resetAllInputs();
    this.emitModalState(null);
    if (nextState === 'inventory') {
      globalEventBus.emit(
        GameEvents.INVENTORY_UPDATED,
        globalExplorationState.getInventoryItems()
      );
    }
  }

  private createAreaInteractables(): void {
    this.interactableRenderers = this.areaDef.interactables.map((def) => {
      return new InteractablePlaceholderRenderer(this, def, (clickedDef) => {
        this.handleObjectMouseClicked(clickedDef);
      });
    });
  }

  private handleObjectMouseClicked(def: InteractableDefinition): void {
    if (this.isGamePaused || this.isTransitioning) return;

    if (globalExplorationState.getModalState() !== 'none') {
      return;
    }

    globalExplorationState.selectObjectByMouse(def.id);
    const playerX = this.playerController.getSnapshot().x;

    this.executeObjectInteraction(def);
    this.syncInteractablesAndPrompt(playerX);
  }

  private executeObjectInteraction(def: InteractableDefinition): void {
    const playerX = this.playerController.getSnapshot().x;
    const result = globalExplorationState.interactWithObject(
      def.id,
      playerX,
      DEFAULT_PLAYER_CONFIG.collider.width
    );

    this.inputManager.resetAllInputs();

    if (result.success) {
      if (result.portalTransition) {
        globalAudioSynth.playDoorOpen();
      } else if (result.acquiredItem) {
        globalAudioSynth.playItemPickup();
      } else {
        globalAudioSynth.playUiClick();
      }

      globalStoryState.notifyObjectInteracted(
        def.id,
        globalExplorationState.getClues().length
      );
      globalEventBus.emit(
        GameEvents.STORY_OBJECTIVE_UPDATED,
        globalStoryState.getCurrentObjective()
      );
    }

    if (result.acquiredItem) {
      globalEvidenceSystem.collectEvidence(result.acquiredItem.id);
      globalEventBus.emit(
        GameEvents.INVENTORY_UPDATED,
        globalExplorationState.getInventoryItems()
      );
    }

    if (result.newlyAddedClue) {
      globalEvidenceSystem.collectEvidence(result.newlyAddedClue.id);
      globalEventBus.emit(
        GameEvents.CLUES_UPDATED,
        globalExplorationState.getClues()
      );
    }

    if (result.grantedEvidenceId) {
      globalEvidenceSystem.collectEvidence(result.grantedEvidenceId);
    }

    // 若該互動物件觸發時段切換（如宿舍床鋪休息）
    if (result.success && def.triggersTimeCycle) {
      const hasChime =
        globalExplorationState.hasItem('item_yulan_tuning_fork') ||
        globalEvidenceSystem.hasEvidence('item_yulan_tuning_fork');
      const timeRes = globalCampusAtmosphere.cycleNextPhase({
        hasCounterPhaseChime: hasChime,
      });
      if (timeRes.fourthBellTriggered) {
        globalAudioSynth.playFourthBellChime();
        if (timeRes.protectedByCounterChime) {
          globalAudioSynth.playCounterPhaseChime();
        }
      }
      this.syncAtmosphereOverlay();
      result.messages.push(timeRes.message);
      globalEventBus.emit(GameEvents.TIME_PHASE_CHANGED, {
        phase: timeRes.currentPhase,
        profile: globalCampusAtmosphere.getCurrentProfile(),
        message: timeRes.message,
      });
    }

    if (result.success) {
      globalQuestSystem.evaluateAndSyncQuests(
        globalStoryState.getFlags(),
        globalStoryState.getCompletedEventIds()
      );
    }

    // 若互動對象為 NPC，啟動 NPCInteractionSystem 對話會話
    if (result.success && result.kind === 'npc') {
      const npcSession = globalNPCInteractionSystem.startDialogue(
        def.id,
        globalStoryState.getFlags(),
        globalCampusAtmosphere.getCurrentPhase()
      );
      if (npcSession) {
        this.syncInteractablesAndPrompt(playerX);
        globalEventBus.emit(GameEvents.NPC_DIALOGUE_UPDATED, npcSession);
        this.emitModalState(result);
        return;
      }
    }

    if (result.success && result.portalTransition) {
      this.performScenePortalTransition(result);
      return;
    }

    if (!result.success && result.blockedReason === 'out_of_range') {
      this.emitModalState(result);
      return;
    }

    this.syncInteractablesAndPrompt(playerX);
    this.emitModalState(result);
  }

  private performScenePortalTransition(
    result: InteractionExecutionResult
  ): void {
    const transition = result.portalTransition!;
    const targetArea = getAreaDefinition(transition.targetAreaId);

    this.isTransitioning = true;
    globalExplorationState.setModalState('transition');
    this.emitModalState(result);

    this.cameras.main.fadeOut(160, 8, 12, 20);
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        this.scene.start(targetArea.sceneKey, {
          spawnId: transition.targetSpawnId,
        });
      }
    );
  }

  private syncInteractablesAndPrompt(playerX: number): void {
    const candidate = globalExplorationState.findCandidateInRange(playerX);
    const selectedId = globalExplorationState.getSelectedObjectId();

    for (const renderer of this.interactableRenderers) {
      const def = renderer.getDefinition();
      const isCollected = globalExplorationState.isObjectCollected(def.id);
      const isInvestigated = globalExplorationState.isObjectInvestigated(def.id);
      const isInRange =
        !isCollected && globalExplorationState.isPlayerInRange(playerX, def);
      const isFocused =
        !isCollected && (candidate?.id === def.id || selectedId === def.id);

      renderer.syncInteractableVisual(def, {
        isCollected,
        isInvestigated,
        isInRange,
        isFocused,
        isHovered: renderer.isHovered(),
      });
    }

    globalEventBus.emit(GameEvents.INTERACTION_PROMPT_CHANGED, {
      inRangeCandidate: candidate,
      selectedObject:
        this.areaDef.interactables.find((o) => o.id === selectedId) ?? null,
    });
  }

  private emitModalState(result: InteractionExecutionResult | null): void {
    globalEventBus.emit(GameEvents.UI_MODAL_CHANGED, {
      modalState: globalExplorationState.getModalState(),
      result,
    });
  }

  private updateCameraFollow(snapshot: PlayerStateSnapshot): void {
    const cam = this.cameras.main;
    const maxScrollX = Math.max(0, this.areaDef.bounds.width - LOGICAL_WIDTH);
    const targetScrollX = Phaser.Math.Clamp(
      snapshot.x - LOGICAL_WIDTH / 2,
      0,
      maxScrollX
    );
    cam.scrollX = Phaser.Math.Linear(cam.scrollX, targetScrollX, 0.18);
  }

  protected renderAreaEnvironment(): void {
    const g = this.add.graphics().setDepth(1);
    const { width, height, floorY, floorHeight } = this.areaDef.bounds;
    const { skyOrWallColor, secondaryWallColor, floorColor, accentColor } =
      this.areaDef.theme;

    g.fillStyle(skyOrWallColor, 1);
    g.fillRect(0, 0, width, height);

    if (this.areaId === 'school_gate') {
      g.fillStyle(secondaryWallColor, 0.8);
      g.fillRect(40, 120, width - 80, floorY - 120);
      g.lineStyle(2, 0x334155, 0.9);
      for (let x = 40; x < width - 40; x += 32) {
        g.lineBetween(x, 110, x, floorY);
      }
      g.fillStyle(0x1e293b, 1);
      g.fillRect(240, 88, 36, floorY - 88);
      g.fillRect(520, 88, 36, floorY - 88);
    } else if (this.areaId === 'bulletin_area') {
      g.fillStyle(secondaryWallColor, 1);
      g.fillRect(0, 36, width, 28);
      for (let x = 140; x < width; x += 200) {
        g.fillStyle(0x1e293b, 1);
        g.fillRect(x, 64, 20, floorY - 64);
      }
      g.fillStyle(0x3f2e21, 1);
      g.fillRect(585, floorY - 18, 86, 8);
      g.fillRect(595, floorY - 10, 8, 10);
      g.fillRect(655, floorY - 10, 8, 10);
    } else if (this.areaId === 'corridor') {
      for (let x = 60; x < width; x += 180) {
        g.fillStyle(secondaryWallColor, 1);
        g.fillRect(x - 10, 24, 16, floorY - 24);
        g.fillStyle(0x1e3a5f, 0.4);
        g.fillRect(x + 28, 60, 92, 74);
        g.lineStyle(2, 0x334155, 1);
        g.strokeRect(x + 28, 60, 92, 74);
      }
    } else if (this.areaId === 'classroom') {
      g.fillStyle(secondaryWallColor, 1);
      g.fillRect(0, floorY - 96, width, 96);
      g.lineStyle(2, 0x3f3149, 1);
      g.lineBetween(0, floorY - 96, width, floorY - 96);
      for (let x = 190; x < 540; x += 140) {
        g.fillStyle(0x2e2536, 0.55);
        g.fillRect(x, 68, 84, 78);
        g.strokeRect(x, 68, 84, 78);
      }
    } else if (this.areaId === 'academic_office') {
      // 教務處：胡桃木護牆板、白川基金會橫幅與檔案櫃列
      g.fillStyle(secondaryWallColor, 0.95);
      g.fillRect(0, floorY - 110, width, 110);
      g.lineStyle(2, accentColor, 0.8);
      g.lineBetween(0, floorY - 110, width, floorY - 110);
      for (let x = 140; x < width - 100; x += 170) {
        g.fillStyle(0x0f172a, 0.7);
        g.fillRect(x, 54, 96, 86);
        g.lineStyle(2, 0x64748b, 0.9);
        g.strokeRect(x, 54, 96, 86);
      }
    } else if (this.areaId === 'teachers_office') {
      // 教師辦公室：辦公隔間與牆上課表白板
      g.fillStyle(secondaryWallColor, 0.9);
      g.fillRect(0, floorY - 100, width, 100);
      g.fillStyle(0x1e293b, 0.85);
      g.fillRect(200, 62, 160, 68);
      g.lineStyle(2, 0x38bdf8, 0.6);
      g.strokeRect(200, 62, 160, 68);
    } else if (this.areaId === 'dormitory') {
      // 學生宿舍：暖色壁燈、窗簾與雙人房格局
      g.fillStyle(secondaryWallColor, 0.92);
      g.fillRect(0, floorY - 104, width, 104);
      for (let x = 220; x < width - 140; x += 260) {
        g.fillStyle(0x1e1b4b, 0.75);
        g.fillRect(x, 58, 90, 82);
        g.lineStyle(2, 0xf59e0b, 0.7);
        g.strokeRect(x, 58, 90, 82);
      }
    } else if (this.areaId === 'old_library') {
      // 舊圖書館：挑高拱形書牆與彩繪高窗
      for (let x = 90; x < width - 80; x += 160) {
        g.fillStyle(secondaryWallColor, 0.85);
        g.fillRect(x, 38, 110, floorY - 38);
        g.lineStyle(1, accentColor, 0.5);
        g.strokeRect(x, 38, 110, floorY - 38);
      }
    } else if (this.areaId === 'forbidden_archive') {
      // 禁書室：地下石砌封存室與紅外線警戒線
      g.fillStyle(secondaryWallColor, 0.95);
      g.fillRect(0, 32, width, floorY - 32);
      g.lineStyle(1, 0xef4444, 0.35);
      for (let y = 70; y < floorY; y += 48) {
        g.lineBetween(20, y, width - 20, y);
      }
    } else if (this.areaId === 'rooftop') {
      // 頂樓與鐘塔：夜空遠景、防墜鐵絲網與高聳鐘塔剪影
      g.fillStyle(0x0f172a, 0.85);
      g.fillRect(460, 18, 150, floorY - 18); // 鐘塔高塔結構
      g.lineStyle(2, 0x475569, 0.9);
      g.strokeRect(460, 18, 150, floorY - 18);
      // 鐵絲網護欄
      g.lineStyle(1, 0x64748b, 0.65);
      g.lineBetween(0, floorY - 68, width, floorY - 68);
      for (let x = 20; x < width; x += 28) {
        g.lineBetween(x, floorY - 68, x, floorY);
      }
    } else if (this.areaId === 'infirmary') {
      // 保健室：潔白醫療隔簾與觀察窗
      g.fillStyle(secondaryWallColor, 0.92);
      g.fillRect(0, floorY - 108, width, 108);
      for (let x = 180; x < width - 120; x += 190) {
        g.fillStyle(0x0f766e, 0.35);
        g.fillRect(x, 54, 110, floorY - 64);
        g.lineStyle(1, 0x34d399, 0.5);
        g.strokeRect(x, 54, 110, floorY - 64);
      }
    }

    g.fillStyle(floorColor, 1);
    g.fillRect(0, floorY, width, floorHeight);
    g.lineStyle(2, accentColor, 0.75);
    g.lineBetween(0, floorY, width, floorY);

    g.lineStyle(3, 0xef4444, 0.75);
    g.lineBetween(2, 0, 2, floorY);
    g.lineBetween(width - 2, 0, width - 2, floorY);

    globalFontManager
      .createCrispText(
        this,
        16,
        floorY + 12,
        `[${this.areaDef.title}] ${this.areaDef.subtitle}`,
        'secondaryHint',
        {
          color: '#94a3b8',
        }
      )
      .setDepth(5);
  }

  private createCombatHitDummy(): void {
    this.dummyGraphics = this.add.graphics().setDepth(9);
    globalFontManager
      .createCrispText(
        this,
        this.dummyTargetRect.centerX,
        this.dummyTargetRect.top - 6,
        '訓練標靶',
        'secondaryHint',
        {
          color: '#fca5a5',
          backgroundColor: '#1e1b4bcc',
          padding: { x: 3, y: 1 },
        }
      )
      .setOrigin(0.5, 1)
      .setDepth(10);
    this.drawHitTarget();
  }

  private checkAttackHitboxAgainstTarget(
    snapshot: PlayerStateSnapshot,
    dtMs: number
  ): void {
    if (!this.dummyGraphics) return;

    if (this.dummyHitFlashMs > 0) {
      this.dummyHitFlashMs = Math.max(0, this.dummyHitFlashMs - dtMs);
    }

    if (!snapshot.isAttackHitboxActive || !snapshot.activeAttackHitbox) {
      this.lastAttackHitTriggered = false;
      this.drawHitTarget();
      return;
    }

    const hb = snapshot.activeAttackHitbox;
    const attackRect = new Phaser.Geom.Rectangle(
      hb.x,
      hb.y,
      hb.width,
      hb.height
    );

    const overlapped = Phaser.Geom.Intersects.RectangleToRectangle(
      attackRect,
      this.dummyTargetRect
    );

    if (overlapped && !this.lastAttackHitTriggered) {
      this.lastAttackHitTriggered = true;
      this.dummyHitFlashMs = 180;
      globalEventBus.emit(GameEvents.PLAYER_ATTACK_HIT, {
        targetX: this.dummyTargetRect.centerX,
        targetY: this.dummyTargetRect.centerY,
      });
    }

    this.drawHitTarget();
  }

  private drawHitTarget(): void {
    if (!this.dummyGraphics) return;
    const g = this.dummyGraphics;
    g.clear();
    const isFlashing = this.dummyHitFlashMs > 0;
    g.fillStyle(isFlashing ? 0xef4444 : 0x334155, 0.7);
    g.lineStyle(1, isFlashing ? 0xfef08a : 0x64748b, 0.9);
    g.fillRectShape(this.dummyTargetRect);
    g.strokeRectShape(this.dummyTargetRect);
  }
}
