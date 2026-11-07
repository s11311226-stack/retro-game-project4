export type FacingDirection = 'left' | 'right';

export type PlayerActionState =
  | 'idle'
  | 'move'
  | 'jump'
  | 'attack'
  | 'block';

export type AttackSubPhase =
  | 'none'
  | 'startup'
  | 'active'
  | 'recovery';

export interface PlayerStatsConfig {
  /** 畫布基準寬高 (預設 128x128) */
  spriteCanvasSize: {
    width: number;
    height: number;
  };
  /** 獨立角色物理碰撞箱 (相對於 128x128 畫布左上角的偏移與寬高) */
  collider: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  };
  /** 水平移動速度 (px/s) */
  moveSpeed: number;
  /** 格擋狀態下是否允許緩慢移動，預設 0 為站立格擋 */
  blockMoveSpeed: number;
  /** 跳躍初速度 (px/s, 向上為負值) */
  jumpVelocity: number;
  /** 角色重力加速度 (px/s^2) */
  gravityY: number;
  /** 最大落下速度 (px/s) */
  maxFallSpeed: number;
  /** 最大連續跳躍次數 (1 = 單段跳，必須落地才能再跳) */
  maxJumps: number;
  /** 攻擊時序設定 (毫秒) */
  attackTiming: {
    startupMs: number;
    activeMs: number;
    recoveryMs: number;
    cooldownMs: number;
  };
  /** 攻擊判定範圍 (相對於角色碰撞箱中心或朝向的偏移與尺寸) */
  attackHitbox: {
    width: number;
    height: number;
    reachX: number;
    offsetY: number;
  };
}

export interface KeyBindingConfig {
  moveLeft: string[];
  moveRight: string[];
  jump: string[];
  attack: string[];
  block: string[];
  interact: string[];
  inventory: string[];
  pause: string[];
  /** 是否啟用滑鼠左鍵攻擊、右鍵格擋 */
  enableMouseCombat: boolean;
}

export interface InputSnapshot {
  moveLeft: boolean;
  moveRight: boolean;
  jumpJustPressed: boolean;
  attackJustPressed: boolean;
  blockHeld: boolean;
  interactJustPressed: boolean;
  inventoryJustPressed: boolean;
  pauseJustPressed: boolean;
}

export interface HitboxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlayerStateSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: FacingDirection;
  state: PlayerActionState;
  attackPhase: AttackSubPhase;
  isAttackHitboxActive: boolean;
  activeAttackHitbox: HitboxRect | null;
  isGrounded: boolean;
  attackCooldownRemainingMs: number;
}

/**
 * 角色視覺與動畫轉接介面
 * 目前預設由 PlaceholderCharacterRenderer 實作明確標示為「測試占位角色 (TEST PLACEHOLDER)」，
 * 未來替換正式美術精靈圖時，只需實作此介面即可無縫切換。
 */
export interface ICharacterVisualAdapter {
  readonly isPlaceholderAsset: boolean;
  readonly assetLabel: string;
  syncVisuals(snapshot: PlayerStateSnapshot): void;
  destroy(): void;
}

// ============================================================================
// Phase 2 — 校園探索區域、互動物件、背包、線索與 UI 狀態型別定義
// ============================================================================

export type AreaId =
  | 'school_gate'
  | 'bulletin_area'
  | 'corridor'
  | 'classroom';

export type InteractableKind =
  | 'portal'
  | 'examine'
  | 'document'
  | 'pickup';

export type UIModalState =
  | 'none'
  | 'dialogue'
  | 'inspect'
  | 'document'
  | 'inventory'
  | 'transition'
  | 'anomaly'
  | 'ending'
  | 'paused';

export interface InventoryItemDef {
  id: string;
  name: string;
  description: string;
  category: 'key' | 'tool' | 'quest';
}

export interface ClueEntryDef {
  id: string;
  title: string;
  summary: string;
  sourceObjectId: string;
}

export interface DocumentDef {
  id: string;
  title: string;
  subtitle: string;
  pages: string[];
  /** 當特定劇情旗標開啟後（如觸發結尾異變），文件顯示的覆寫或追加內容 */
  mutatedPages?: string[];
  mutatedBanner?: string;
  clue?: ClueEntryDef;
}

export interface InteractableDefinition {
  /** 穩定唯一的識別 ID (跨場景不重複) */
  id: string;
  areaId: AreaId;
  name: string;
  kind: InteractableKind;
  /** 物件於場景中的水平中心座標與底部座標 */
  x: number;
  y: number;
  width: number;
  height: number;
  /** 玩家可觸發互動的有效水平距離半徑 (px) */
  interactionRadius: number;
  /** 靠近時顯示的動作提示文字，例如 "進入走廊"、"閱讀入學通知" */
  promptAction: string;
  /** 一般調查描述文字 */
  inspectLines?: string[];
  /** 若為門/出入口 (portal)，指定目標區域與出生點及切換條件 */
  portal?: {
    targetAreaId: AreaId;
    targetSpawnId: string;
    requiredItemId?: string;
    lockedMessage?: string;
    unlockedMessage?: string;
  };
  /** 若為可閱讀文件 (document)，對應的文件定義 */
  document?: DocumentDef;
  /** 若為可拾取物品 (pickup)，對應的背包物品定義与拾取提示 */
  pickup?: {
    item: InventoryItemDef;
    pickupMessage: string;
  };
  /** 若一般調查也會記錄線索 */
  clue?: ClueEntryDef;
  /** 視覺占位樣式類型 (保留未來替換正式像素素材的介面) */
  visualStyle:
    | 'gate_door'
    | 'wood_door'
    | 'bulletin_board'
    | 'desk'
    | 'blackboard'
    | 'paper_note'
    | 'poster'
    | 'folder_doc'
    | 'key_item';
}

export interface AreaSpawnPoint {
  id: string;
  x: number;
  facing: FacingDirection;
}

export interface AreaDefinition {
  id: AreaId;
  sceneKey: string;
  title: string;
  subtitle: string;
  bounds: {
    minX: number;
    maxX: number;
    width: number;
    height: number;
    floorY: number;
    floorHeight: number;
  };
  theme: {
    skyOrWallColor: number;
    secondaryWallColor: number;
    floorColor: number;
    accentColor: number;
  };
  defaultSpawnId: string;
  spawns: Record<string, AreaSpawnPoint>;
  interactables: InteractableDefinition[];
}

export interface InteractionExecutionResult {
  success: boolean;
  objectId: string;
  kind: InteractableKind;
  uiState: UIModalState;
  title: string;
  messages: string[];
  document?: DocumentDef;
  acquiredItem?: InventoryItemDef;
   newlyAddedClue?: ClueEntryDef;
  portalTransition?: {
    fromAreaId: AreaId;
    targetAreaId: AreaId;
    targetSpawnId: string;
    spawnX: number;
    spawnY: number;
    facing: FacingDirection;
  };
  blockedReason?: 'busy' | 'out_of_range' | 'already_collected' | 'locked' | 'not_found';
}

/**
 * 場景互動物件視覺轉接介面
 * 預設以清楚標示的占位像素繪圖實作，保留替換為正式像素精靈圖的介面。
 */
export interface IInteractableVisualAdapter {
  readonly isPlaceholderAsset: boolean;
  syncInteractableVisual(
    def: InteractableDefinition,
    state: {
      isCollected: boolean;
      isInRange: boolean;
      isFocused: boolean;
      isHovered: boolean;
    }
  ): void;
  destroy(): void;
}

// ============================================================================
// Phase 3 — 體驗版短篇劇情「點名簿上不存在的人」與未來擴充介面定義
// ============================================================================

export type StoryFlagId =
  | 'flag_intro_played'
  | 'flag_admission_notice_read'
  | 'flag_missing_poster_found'
  | 'flag_classroom_key_obtained'
  | 'flag_classroom_entered'
  | 'flag_roster_mismatch_checked'
  | 'flag_anachronistic_file_read'
  | 'flag_anomaly_observation_triggered'
  | 'flag_demo_completed';

export type StoryEventId =
  | 'evt_chapter1_opening_intro'
  | 'evt_bulletin_poster_reflection'
  | 'evt_classroom_entry_reflection'
  | 'evt_anomaly_new_student_observed'
  | 'evt_demo_ending_complete';

export interface DialogueLineDef {
  speaker: string;
  portraitTag?: 'protagonist' | 'system' | 'mystery';
  text: string;
}

export interface StoryEventDef {
  /** 明確穩定的劇情事件 ID (避免依賴座標，且場景重載時不會重複觸發) */
  id: StoryEventId;
  chapterTitle: string;
  triggerCondition: {
    requiredFlags: StoryFlagId[];
    forbiddenFlags?: StoryFlagId[];
    triggerOnAreaEnter?: AreaId;
    triggerAfterObjectClosed?: string;
  };
  setFlagsOnComplete: StoryFlagId[];
  dialogueLines: DialogueLineDef[];
  /** 是否在事件對話時觸發畫面短暫閃爍與音效異變演出 */
  presentationEffect?: 'none' | 'screen_flicker_anomaly' | 'transition_to_ending';
  /** 完成後更新的當前體驗版目標提示 */
  nextObjectiveText?: string;
}

/**
 * 為未來正式版預留的擴充介面：
 * - 證據完整度 (evidenceCompleteness: 0 ~ 100)
 * - 角色好感度 (affectionScores: NPC ID -> 數值)
 * - 財閥警戒度 (conglomerateAlertLevel: 0 ~ 100)
 * - 多結局評估介面 (IMultiEndingExtensionHooks)
 * 本體驗版僅保留單一結局與介面契約，不提前實作複雜多結局分支。
 */
export interface FutureNarrativeMetrics {
  evidenceCompleteness: number;
  affectionScores: Record<string, number>;
  conglomerateAlertLevel: number;
}

export interface IMultiEndingExtensionHooks {
  getMetrics(): FutureNarrativeMetrics;
  recordEvidenceProgress(clueCount: number, totalDemoClues: number): void;
  adjustAffection(npcId: string, delta: number): void;
  adjustConglomerateAlert(delta: number): void;
  resolveEndingRouteId(): string;
}

// ============================================================================
// Phase 4 — 版本化存檔結構、音訊設定與品質整理型別定義
// ============================================================================

export const SAVE_SCHEMA_VERSION = 2;

export interface AudioSettingsData {
  bgmVolume: number; // 0.0 ~ 1.0
  sfxVolume: number; // 0.0 ~ 1.0
  muted: boolean;
}

/**
 * 版本化存檔資料結構 (不含任何機密、密碼或權杖)
 */
export interface GameSavePayloadV2 {
  schemaVersion: number;
  savedAtIso: string;
  player: {
    areaId: AreaId;
    spawnId: string;
    x: number;
    y: number;
    facing: FacingDirection;
  };
  exploration: {
    collectedObjectIds: string[];
    inventoryItemIds: string[];
    clueIds: string[];
    unlockedPortalIds: string[];
  };
  story: {
    flags: StoryFlagId[];
    completedEventIds: StoryEventId[];
    currentObjectiveText: string;
    metrics: FutureNarrativeMetrics;
  };
  audio?: AudioSettingsData;
}

export interface SaveLoadResult {
  success: boolean;
  migratedFromLegacy: boolean;
  reason?: 'no_save' | 'corrupted_json' | 'invalid_schema' | 'unsupported_version' | 'storage_error';
  data?: GameSavePayloadV2;
}



