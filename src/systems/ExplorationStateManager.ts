import { CAMPUS_AREAS, getAreaDefinition } from '../data/campusAreas';
import type {
  AreaId,
  ClueEntryDef,
  FacingDirection,
  InteractableDefinition,
  InteractionExecutionResult,
  InventoryItemDef,
  UIModalState,
} from '../types';

export interface ActiveSpawnLocation {
  areaId: AreaId;
  spawnId: string;
  x: number;
  y: number;
  facing: FacingDirection;
}

/**
 * 校園探索、互動、背包、線索與場景切換狀態管理器 (ExplorationStateManager)
 *
 * 負責：
 * 1. 維護當前存檔會話的背包物品 (Inventory)、已收集物件 ID 集合 (確保已拿取物品絕不重複生成)
 * 2. 維護已解鎖線索紀錄 (Clues，確保文件可無限次重複閱讀，但同一條線索絕不重複新增)
 * 3. 管理單一主要互動鎖定 (UIModalState)，確保同一時間只允許一個主要互動操作
 * 4. 處理距離判定、按 E 互動與滑鼠點擊選取互動物件
 * 5. 處理門與區域切換及安全落地座標計算（確保切換後角色永遠站在合法地面與邊界內，不卡牆或懸空）
 */
export class ExplorationStateManager {
  private currentAreaId: AreaId = 'school_gate';
  private currentSpawnId = 'initial_spawn';

  private collectedObjectIds = new Set<string>();
  private inventoryMap = new Map<string, InventoryItemDef>();
  private cluesMap = new Map<string, ClueEntryDef>();
  private unlockedPortalIds = new Set<string>();

  private activeModalState: UIModalState = 'none';
  private selectedObjectId: string | null = null;
  private lastInteractedObjectId: string | null = null;

  constructor(initialAreaId: AreaId = 'school_gate', initialSpawnId = 'initial_spawn') {
    this.setAreaAndSpawn(initialAreaId, initialSpawnId);
  }

  public resetSession(initialAreaId: AreaId = 'school_gate', initialSpawnId = 'initial_spawn'): void {
    this.collectedObjectIds.clear();
    this.inventoryMap.clear();
    this.cluesMap.clear();
    this.unlockedPortalIds.clear();
    this.activeModalState = 'none';
    this.selectedObjectId = null;
    this.lastInteractedObjectId = null;
    this.setAreaAndSpawn(initialAreaId, initialSpawnId);
  }

  public getLastInteractedObjectId(): string | null {
    return this.lastInteractedObjectId;
  }

  public getCurrentAreaId(): AreaId {
    return this.currentAreaId;
  }

  public getCurrentSpawnLocation(playerColliderWidth = 28): ActiveSpawnLocation {
    const area = getAreaDefinition(this.currentAreaId);
    const spawn =
      area.spawns[this.currentSpawnId] ??
      area.spawns[area.defaultSpawnId] ?? {
        id: 'fallback',
        x: 140,
        facing: 'right' as FacingDirection,
      };

    const halfWidth = playerColliderWidth / 2;
    const safeMinX = area.bounds.minX + halfWidth + 4;
    const safeMaxX = area.bounds.maxX - halfWidth - 4;
    const clampedX = Math.max(safeMinX, Math.min(safeMaxX, spawn.x));

    return {
      areaId: this.currentAreaId,
      spawnId: spawn.id,
      x: clampedX,
      y: area.bounds.floorY, // 強制對齊地面高度，杜絕切換後懸空或掉入地底
      facing: spawn.facing,
    };
  }

  public setAreaAndSpawn(areaId: AreaId, spawnId?: string): ActiveSpawnLocation {
    if (!CAMPUS_AREAS[areaId]) {
      throw new Error(`Unknown areaId: ${areaId}`);
    }
    const area = CAMPUS_AREAS[areaId];
    this.currentAreaId = areaId;
    this.currentSpawnId =
      spawnId && area.spawns[spawnId] ? spawnId : area.defaultSpawnId;
    this.selectedObjectId = null;
    return this.getCurrentSpawnLocation();
  }

  /**
   * 取得指定區域中目前可見的互動物件清單
   * 已拾取的 pickup 物件不會再出現在清單中（防止同一存檔重複生成）
   */
  public getVisibleInteractables(areaId: AreaId = this.currentAreaId): InteractableDefinition[] {
    const area = getAreaDefinition(areaId);
    return area.interactables.filter((item) => !this.isObjectCollected(item.id));
  }

  public isObjectCollected(objectId: string): boolean {
    return this.collectedObjectIds.has(objectId);
  }

  public hasItem(itemId: string): boolean {
    return this.inventoryMap.has(itemId);
  }

  public getInventoryItems(): InventoryItemDef[] {
    return Array.from(this.inventoryMap.values());
  }

  public getClues(): ClueEntryDef[] {
    return Array.from(this.cluesMap.values());
  }

  public hasClue(clueId: string): boolean {
    return this.cluesMap.has(clueId);
  }

  public getCollectedObjectIds(): string[] {
    return Array.from(this.collectedObjectIds);
  }

  public getUnlockedPortalIds(): string[] {
    return Array.from(this.unlockedPortalIds);
  }

  public getCurrentSpawnId(): string {
    return this.currentSpawnId;
  }

  /**
   * 從經驗證的存檔快照還原探索狀態
   */
  public restoreFromSaveData(payload: {
    areaId: AreaId;
    spawnId: string;
    collectedObjectIds: string[];
    inventoryItems: InventoryItemDef[];
    clues: ClueEntryDef[];
    unlockedPortalIds: string[];
  }): void {
    this.collectedObjectIds = new Set(payload.collectedObjectIds);
    this.inventoryMap.clear();
    for (const item of payload.inventoryItems) {
      this.inventoryMap.set(item.id, item);
    }
    this.cluesMap.clear();
    for (const clue of payload.clues) {
      this.cluesMap.set(clue.id, clue);
    }
    this.unlockedPortalIds = new Set(payload.unlockedPortalIds);
    this.activeModalState = 'none';
    this.selectedObjectId = null;
    this.lastInteractedObjectId = null;
    this.setAreaAndSpawn(payload.areaId, payload.spawnId);
  }

  public getModalState(): UIModalState {
    return this.activeModalState;
  }

  public setModalState(state: UIModalState): void {
    this.activeModalState = state;
  }

  public closeModal(): void {
    if (this.activeModalState !== 'transition' && this.activeModalState !== 'paused') {
      this.activeModalState = 'none';
    }
  }

  public toggleInventoryModal(): UIModalState {
    if (this.activeModalState === 'inventory') {
      this.activeModalState = 'none';
    } else if (this.activeModalState === 'none') {
      this.activeModalState = 'inventory';
    }
    return this.activeModalState;
  }

  /**
   * 滑鼠點擊選取畫面中的互動物件
   */
  public selectObjectByMouse(objectId: string | null): InteractableDefinition | null {
    if (!objectId) {
      this.selectedObjectId = null;
      return null;
    }
    const target = this.getVisibleInteractables().find((obj) => obj.id === objectId);
    if (!target) {
      this.selectedObjectId = null;
      return null;
    }
    this.selectedObjectId = target.id;
    return target;
  }

  public getSelectedObjectId(): string | null {
    return this.selectedObjectId;
  }

  /**
   * 判斷玩家與互動物件是否在有效互動範圍內
   */
  public isPlayerInRange(playerX: number, obj: InteractableDefinition): boolean {
    return Math.abs(playerX - obj.x) <= obj.interactionRadius;
  }

  /**
   * 取得玩家當前位置可互動的最佳目標：
   * 1. 若滑鼠已選取某物件且該物件在有效範圍內，優先使用該選取物件
   * 2. 否則自動選擇有效範圍內距離玩家最近的互動物件
   */
  public findCandidateInRange(playerX: number): InteractableDefinition | null {
    const visible = this.getVisibleInteractables();

    if (this.selectedObjectId) {
      const selected = visible.find((o) => o.id === this.selectedObjectId);
      if (selected && this.isPlayerInRange(playerX, selected)) {
        return selected;
      }
    }

    let closest: InteractableDefinition | null = null;
    let minDistance = Infinity;

    for (const obj of visible) {
      const dist = Math.abs(playerX - obj.x);
      if (dist <= obj.interactionRadius && dist < minDistance) {
        minDistance = dist;
        closest = obj;
      }
    }

    return closest;
  }

  /**
   * 執行主要互動操作 (按 E 或滑鼠點擊範圍內物件觸發)
   * 強制遵守「同一時間只允許一個主要互動操作」：若 activeModalState !== 'none' 則拒絕新互動。
   */
  public interactWithObject(
    objectId: string,
    playerX: number,
    playerColliderWidth = 28
  ): InteractionExecutionResult {
    // 規則 4：同一時間只允許一個主要互動操作
    if (this.activeModalState !== 'none') {
      return {
        success: false,
        objectId,
        kind: 'examine',
        uiState: this.activeModalState,
        title: '互動進行中',
        messages: ['目前已有正在進行的互動視窗，請先關閉後再操作。'],
        blockedReason: 'busy',
      };
    }

    const area = getAreaDefinition(this.currentAreaId);
    const obj = area.interactables.find((item) => item.id === objectId);

    if (!obj) {
      return {
        success: false,
        objectId,
        kind: 'examine',
        uiState: 'none',
        title: '找不到目標',
        messages: ['找不到指定的互動物件。'],
        blockedReason: 'not_found',
      };
    }

    // 規則 6：已拿取物品不得重複拿取或生成
    if (this.isObjectCollected(obj.id)) {
      return {
        success: false,
        objectId: obj.id,
        kind: obj.kind,
        uiState: 'none',
        title: obj.name,
        messages: ['此物品已經被拿取過了。'],
        blockedReason: 'already_collected',
      };
    }

    // 規則 1：必須在有效互動範圍內才可執行互動
    if (!this.isPlayerInRange(playerX, obj)) {
      this.selectedObjectId = obj.id;
      return {
        success: false,
        objectId: obj.id,
        kind: obj.kind,
        uiState: 'none',
        title: obj.name,
        messages: [`距離「${obj.name}」太遠，請走近後按 [E] 或點擊互動。`],
        blockedReason: 'out_of_range',
      };
    }

    this.selectedObjectId = obj.id;
    this.lastInteractedObjectId = obj.id;

    // 依據物件類型分派處理
    switch (obj.kind) {
      case 'pickup':
        return this.handlePickupInteraction(obj);
      case 'document':
        return this.handleDocumentInteraction(obj);
      case 'examine':
        return this.handleExamineInteraction(obj);
      case 'portal':
        return this.handlePortalInteraction(obj, playerColliderWidth);
    }
  }

  private handlePickupInteraction(obj: InteractableDefinition): InteractionExecutionResult {
    const pickupData = obj.pickup!;
    this.collectedObjectIds.add(obj.id);
    this.inventoryMap.set(pickupData.item.id, pickupData.item);
    this.activeModalState = 'inspect';

    return {
      success: true,
      objectId: obj.id,
      kind: 'pickup',
      uiState: 'inspect',
      title: `獲得物品：${pickupData.item.name}`,
      messages: [pickupData.pickupMessage, pickupData.item.description],
      acquiredItem: pickupData.item,
    };
  }

  private handleDocumentInteraction(obj: InteractableDefinition): InteractionExecutionResult {
    const doc = obj.document!;
    let newlyAddedClue: ClueEntryDef | undefined;

    // 規則 7：文件可重複閱讀，但不應重複新增同一條線索
    if (doc.clue && !this.cluesMap.has(doc.clue.id)) {
      this.cluesMap.set(doc.clue.id, doc.clue);
      newlyAddedClue = doc.clue;
    }

    this.activeModalState = 'document';

    return {
      success: true,
      objectId: obj.id,
      kind: 'document',
      uiState: 'document',
      title: doc.title,
      messages: [...doc.pages],
      document: doc,
      newlyAddedClue,
    };
  }

  private handleExamineInteraction(obj: InteractableDefinition): InteractionExecutionResult {
    let newlyAddedClue: ClueEntryDef | undefined;

    if (obj.clue && !this.cluesMap.has(obj.clue.id)) {
      this.cluesMap.set(obj.clue.id, obj.clue);
      newlyAddedClue = obj.clue;
    }

    this.activeModalState = 'inspect';

    return {
      success: true,
      objectId: obj.id,
      kind: 'examine',
      uiState: 'inspect',
      title: `調查：${obj.name}`,
      messages: obj.inspectLines ? [...obj.inspectLines] : [`你仔細觀察了${obj.name}。`],
      newlyAddedClue,
    };
  }

  private handlePortalInteraction(
    obj: InteractableDefinition,
    playerColliderWidth: number
  ): InteractionExecutionResult {
    const portal = obj.portal!;

    // 檢查門是否需要特定鑰匙且尚未解鎖
    if (
      portal.requiredItemId &&
      !this.unlockedPortalIds.has(obj.id) &&
      !this.hasItem(portal.requiredItemId)
    ) {
      this.activeModalState = 'inspect';
      return {
        success: false,
        objectId: obj.id,
        kind: 'portal',
        uiState: 'inspect',
        title: `${obj.name}（上鎖）`,
        messages: [
          portal.lockedMessage ?? '這扇門目前鎖著，需要找到對應的鑰匙才能開啟。',
        ],
        blockedReason: 'locked',
      };
    }

    const fromAreaId = this.currentAreaId;
    if (portal.requiredItemId) {
      this.unlockedPortalIds.add(obj.id);
    }

    // 切換至目標區域與對應安全落地出生點
    const spawnLoc = this.setAreaAndSpawn(portal.targetAreaId, portal.targetSpawnId);
    const safeSpawn = this.getCurrentSpawnLocation(playerColliderWidth);

    // 切換完成後將 UI 狀態恢復為 none (或由過場動畫控制)
    this.activeModalState = 'none';

    const messages: string[] = [];
    if (portal.unlockedMessage) {
      messages.push(portal.unlockedMessage);
    }
    messages.push(`進入【${getAreaDefinition(portal.targetAreaId).title}】`);

    return {
      success: true,
      objectId: obj.id,
      kind: 'portal',
      uiState: 'none',
      title: obj.name,
      messages,
      portalTransition: {
        fromAreaId,
        targetAreaId: spawnLoc.areaId,
        targetSpawnId: spawnLoc.spawnId,
        spawnX: safeSpawn.x,
        spawnY: safeSpawn.y,
        facing: safeSpawn.facing,
      },
    };
  }
}

export const globalExplorationState = new ExplorationStateManager();
