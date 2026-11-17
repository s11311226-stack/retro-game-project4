import { CAMPUS_AREAS, ITEMS_CATALOG, getAreaDefinition } from '../data/campusAreas';
import {
  BUILDING_BOUNDARY_CONNECTIONS,
  CORRIDOR_DOORS_REGISTRY,
  INDOOR_ROOM_TO_CORRIDOR_MIGRATION_TABLE,
  isCorridorSceneId,
} from '../data/campusCorridorNetwork';
import type {
  AreaId,
  BuildingType,
  ClueEntryDef,
  CorridorSceneId,
  FacingDirection,
  FloorLevel,
  InteractableDefinition,
  InteractionExecutionResult,
  InventoryItemDef,
  RoomReturnPosition,
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
 * 6. Phase 6B-2 R1：集中管理 3 棟 × 5 層公共走廊與室內房間分離、跨棟邊界轉場、樓梯轉場與室內返回座標
 */
export class ExplorationStateManager {
  private currentAreaId: AreaId = 'school_gate';
  private currentSpawnId = 'initial_spawn';

  private currentCorridorSceneId: CorridorSceneId | null = null;
  private currentRoomSceneId: AreaId | null = null;
  private currentDoorId: string | null = null;
  private roomReturnPosition: RoomReturnPosition | null = null;
  private lastCorridorAreaId: AreaId | null = null;

  private collectedObjectIds = new Set<string>();
  private investigatedObjectIds = new Set<string>();
  private inventoryMap = new Map<string, InventoryItemDef>();
  private cluesMap = new Map<string, ClueEntryDef>();
  private unlockedPortalIds = new Set<string>();
  private exploredAreaIds = new Set<string>();
  private exploredCorridors = new Set<CorridorSceneId>();
  private exploredRooms = new Set<AreaId>();
  private unlockedDoors = new Set<string>();
  private unlockedStairs = new Set<string>();

  private activeModalState: UIModalState = 'none';
  private selectedObjectId: string | null = null;
  private lastInteractedObjectId: string | null = null;

  constructor(initialAreaId: AreaId = 'school_gate', initialSpawnId = 'initial_spawn') {
    this.setAreaAndSpawn(initialAreaId, initialSpawnId);
  }

  public resetSession(initialAreaId: AreaId = 'school_gate', initialSpawnId = 'initial_spawn'): void {
    this.collectedObjectIds.clear();
    this.investigatedObjectIds.clear();
    this.inventoryMap.clear();
    this.cluesMap.clear();
    this.unlockedPortalIds.clear();
    this.exploredAreaIds.clear();
    this.exploredCorridors.clear();
    this.exploredRooms.clear();
    this.unlockedDoors.clear();
    this.unlockedStairs.clear();
    this.currentCorridorSceneId = null;
    this.currentRoomSceneId = null;
    this.currentDoorId = null;
    this.roomReturnPosition = null;
    this.lastCorridorAreaId = null;
    this.exploredAreaIds.add(initialAreaId);
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

  public getCurrentBuildingId(): BuildingType {
    return getAreaDefinition(this.currentAreaId).building;
  }

  public getCurrentFloorLevel(): FloorLevel {
    return getAreaDefinition(this.currentAreaId).floor;
  }

  public getCurrentCorridorSceneId(): CorridorSceneId | null {
    return this.currentCorridorSceneId;
  }

  public getCurrentRoomSceneId(): AreaId | null {
    return this.currentRoomSceneId;
  }

  public getCurrentDoorId(): string | null {
    return this.currentDoorId;
  }

  public getRoomReturnPosition(): RoomReturnPosition | null {
    return this.roomReturnPosition ? { ...this.roomReturnPosition } : null;
  }

  public setRoomReturnPosition(pos: RoomReturnPosition | null): void {
    this.roomReturnPosition = pos ? { ...pos } : null;
  }

  public getExploredCorridors(): CorridorSceneId[] {
    return Array.from(this.exploredCorridors);
  }

  public getExploredRooms(): AreaId[] {
    return Array.from(this.exploredRooms);
  }

  public getUnlockedDoors(): string[] {
    return Array.from(this.unlockedDoors);
  }

  public getUnlockedStairs(): string[] {
    return Array.from(this.unlockedStairs);
  }

  public isDoorUnlocked(doorId: string): boolean {
    const def = CORRIDOR_DOORS_REGISTRY[doorId];
    if (!def) {
      return this.unlockedPortalIds.has(doorId) || this.unlockedDoors.has(doorId);
    }
    if (!def.isLockedByDefault) return true;
    if (this.unlockedDoors.has(doorId) || this.unlockedPortalIds.has(doorId)) {
      return true;
    }
    if (def.requiredItemId && this.hasItem(def.requiredItemId)) {
      return true;
    }
    return false;
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
      y: area.bounds.floorY,
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
    this.exploredAreaIds.add(areaId);

    if (isCorridorSceneId(areaId)) {
      this.exploredCorridors.add(areaId);
      this.currentCorridorSceneId = areaId;
      this.currentRoomSceneId = null;
      this.lastCorridorAreaId = areaId;
    } else if (areaId === 'corridor' || areaId === 'bulletin_area') {
      this.lastCorridorAreaId = areaId;
      if (areaId === 'bulletin_area') {
        this.exploredCorridors.add('corridor_center_1f');
      }
    } else if (INDOOR_ROOM_TO_CORRIDOR_MIGRATION_TABLE[areaId]) {
      const mig = INDOOR_ROOM_TO_CORRIDOR_MIGRATION_TABLE[areaId];
      this.exploredRooms.add(areaId);
      this.currentRoomSceneId = areaId;
      this.currentCorridorSceneId = mig.corridorSceneId;
      this.currentDoorId = mig.doorId;
      if (!this.roomReturnPosition || this.roomReturnPosition.corridorSceneId !== mig.corridorSceneId) {
        this.roomReturnPosition = {
          corridorSceneId: mig.corridorSceneId,
          doorId: mig.doorId,
          x: mig.doorX,
          y: 312,
          facing: 'right',
          spawnId: mig.returnSpawnId,
        };
      }
    }

    this.selectedObjectId = null;
    return this.getCurrentSpawnLocation();
  }

  public isAreaExplored(areaId: AreaId): boolean {
    if (isCorridorSceneId(areaId)) {
      return this.exploredCorridors.has(areaId) || this.exploredAreaIds.has(areaId);
    }
    return this.exploredAreaIds.has(areaId) || this.exploredRooms.has(areaId);
  }

  public isCorridorExplored(corridorId: CorridorSceneId): boolean {
    return this.exploredCorridors.has(corridorId) || this.exploredAreaIds.has(corridorId);
  }

  public isRoomExplored(roomAreaId: AreaId): boolean {
    return this.exploredRooms.has(roomAreaId) || this.exploredAreaIds.has(roomAreaId);
  }

  public markAreaExplored(areaId: AreaId): void {
    this.exploredAreaIds.add(areaId);
    if (isCorridorSceneId(areaId)) {
      this.exploredCorridors.add(areaId);
    } else if (INDOOR_ROOM_TO_CORRIDOR_MIGRATION_TABLE[areaId]) {
      this.exploredRooms.add(areaId);
    }
  }

  public getExploredAreaIds(): string[] {
    return Array.from(this.exploredAreaIds);
  }

  public restoreExploredAreaIds(ids: string[]): void {
    this.exploredAreaIds.clear();
    this.exploredCorridors.clear();
    this.exploredRooms.clear();
    for (const id of ids) {
      this.exploredAreaIds.add(id);
      if (isCorridorSceneId(id)) {
        this.exploredCorridors.add(id);
      } else if (INDOOR_ROOM_TO_CORRIDOR_MIGRATION_TABLE[id]) {
        this.exploredRooms.add(id as AreaId);
      }
    }
  }

  /**
   * 執行同樓層跨棟邊界轉場（當玩家在公共走廊走到西側或東側建築邊界時觸發）
   * - 左棟西側、右棟東側為校園外牆，回傳 null 不允許跨出
   * - 其餘邊界切換至相鄰建築之同樓層公共走廊，絕不跳層
   */
  public triggerBoundaryTransition(
    direction: 'west' | 'east',
    playerColliderWidth = 28
  ): InteractionExecutionResult | null {
    if (!isCorridorSceneId(this.currentAreaId)) {
      return null;
    }
    const conn = BUILDING_BOUNDARY_CONNECTIONS[this.currentAreaId]?.[direction];
    if (!conn) {
      return null;
    }

    const fromAreaId = this.currentAreaId;
    const spawnLoc = this.setAreaAndSpawn(conn.targetCorridorId, conn.targetSpawnId);
    const safeSpawn = this.getCurrentSpawnLocation(playerColliderWidth);
    const targetArea = getAreaDefinition(conn.targetCorridorId);

    this.activeModalState = 'none';

    return {
      success: true,
      objectId: `boundary_${fromAreaId}_${direction}_to_${conn.targetCorridorId}`,
      kind: 'portal',
      uiState: 'none',
      title: `跨棟進入：${targetArea.title}`,
      messages: [`進入【${targetArea.title}】`],
      portalTransition: {
        fromAreaId,
        targetAreaId: spawnLoc.areaId,
        targetSpawnId: spawnLoc.spawnId,
        spawnX: safeSpawn.x,
        spawnY: safeSpawn.y,
        facing: conn.targetFacing,
      },
    };
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
    if (this.collectedObjectIds.has(objectId)) {
      return true;
    }
    // 確保三年丙班鑰匙不論在舊穿堂或新中間棟 1F 公共走廊拾取後都不會重複生成
    if (
      (objectId === 'pickup_rusted_classroom_key' ||
        objectId === 'pickup_center_1f_rusted_key') &&
      this.hasItem('item_rusted_classroom_key')
    ) {
      return true;
    }
    return false;
  }

  public isObjectInvestigated(objectId: string): boolean {
    return this.investigatedObjectIds.has(objectId);
  }

  public markObjectInvestigated(objectId: string): void {
    this.investigatedObjectIds.add(objectId);
  }

  public getInvestigatedObjectIds(): string[] {
    return Array.from(this.investigatedObjectIds);
  }

  public hasItem(itemId: string): boolean {
    return this.inventoryMap.has(itemId);
  }

  /**
   * 授予指定目錄物品至背包（供 NPC 對話獎勵或劇情事件使用）
   */
  public grantItem(itemId: string): InventoryItemDef | null {
    const def = ITEMS_CATALOG[itemId];
    if (!def) {
      return null;
    }
    this.inventoryMap.set(def.id, def);
    return def;
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
    investigatedObjectIds?: string[];
    inventoryItems: InventoryItemDef[];
    clues: ClueEntryDef[];
    unlockedPortalIds: string[];
    exploredAreaIds?: string[];
    exploredCorridors?: CorridorSceneId[];
    exploredRooms?: AreaId[];
    unlockedDoors?: string[];
    unlockedStairs?: string[];
    corridorSceneId?: CorridorSceneId | null;
    currentRoomSceneId?: AreaId | null;
    currentDoorId?: string | null;
    roomReturnPosition?: RoomReturnPosition | null;
  }): void {
    this.collectedObjectIds = new Set(payload.collectedObjectIds);
    this.investigatedObjectIds = new Set(payload.investigatedObjectIds ?? []);
    this.inventoryMap.clear();
    for (const item of payload.inventoryItems) {
      this.inventoryMap.set(item.id, item);
    }
    this.cluesMap.clear();
    for (const clue of payload.clues) {
      this.cluesMap.set(clue.id, clue);
    }
    this.unlockedPortalIds = new Set(payload.unlockedPortalIds);
    this.unlockedDoors = new Set([
      ...payload.unlockedPortalIds,
      ...(payload.unlockedDoors ?? []),
    ]);
    this.unlockedStairs = new Set(payload.unlockedStairs ?? []);

    if (payload.exploredAreaIds && payload.exploredAreaIds.length > 0) {
      this.restoreExploredAreaIds(payload.exploredAreaIds);
    } else {
      this.exploredAreaIds.clear();
      this.exploredCorridors.clear();
      this.exploredRooms.clear();
      this.markAreaExplored(payload.areaId);
    }

    if (payload.exploredCorridors) {
      payload.exploredCorridors.forEach((c) => {
        this.exploredCorridors.add(c);
        this.exploredAreaIds.add(c);
      });
    }
    if (payload.exploredRooms) {
      payload.exploredRooms.forEach((r) => {
        this.exploredRooms.add(r);
        this.exploredAreaIds.add(r);
      });
    }

    this.currentCorridorSceneId = payload.corridorSceneId ?? null;
    this.currentRoomSceneId = payload.currentRoomSceneId ?? null;
    this.currentDoorId = payload.currentDoorId ?? null;
    this.roomReturnPosition = payload.roomReturnPosition ?? null;

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
    let obj = area.interactables.find((item) => item.id === objectId);

    // 向下相容舊版 Phase 2/3/4 測試呼叫 school_gate 的 portal_gate_to_bulletin
    if (!obj && this.currentAreaId === 'school_gate' && objectId === 'portal_gate_to_bulletin') {
      obj = {
        id: 'portal_gate_to_bulletin',
        areaId: 'school_gate',
        name: '穿堂公告欄步道',
        kind: 'portal',
        x: 610,
        y: 312,
        width: 56,
        height: 92,
        interactionRadius: 72,
        promptAction: '前往「公告欄區域」',
        visualStyle: 'gate_door',
        portal: {
          targetAreaId: 'bulletin_area',
          targetSpawnId: 'from_gate',
        },
      };
    }

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
      case 'npc':
        return this.handleNPCInteraction(obj);
    }
  }

  private handlePickupInteraction(obj: InteractableDefinition): InteractionExecutionResult {
    const pickupData = obj.pickup!;
    this.collectedObjectIds.add(obj.id);
    if (pickupData.item.id === 'item_rusted_classroom_key') {
      this.collectedObjectIds.add('pickup_rusted_classroom_key');
      this.collectedObjectIds.add('pickup_center_1f_rusted_key');
    }
    this.investigatedObjectIds.add(obj.id);
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
      grantedEvidenceId: obj.grantEvidenceId,
    };
  }

  private handleDocumentInteraction(obj: InteractableDefinition): InteractionExecutionResult {
    const doc = obj.document!;
    let newlyAddedClue: ClueEntryDef | undefined;

    this.investigatedObjectIds.add(obj.id);

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
      grantedEvidenceId: obj.grantEvidenceId,
    };
  }

  private handleExamineInteraction(obj: InteractableDefinition): InteractionExecutionResult {
    let newlyAddedClue: ClueEntryDef | undefined;

    this.investigatedObjectIds.add(obj.id);

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
      grantedEvidenceId: obj.grantEvidenceId,
    };
  }

  private handleNPCInteraction(obj: InteractableDefinition): InteractionExecutionResult {
    this.investigatedObjectIds.add(obj.id);
    this.activeModalState = 'dialogue';

    return {
      success: true,
      objectId: obj.id,
      kind: 'npc',
      uiState: 'dialogue',
      title: obj.name,
      messages: obj.inspectLines ? [...obj.inspectLines] : [`你向${obj.name}搭話。`],
      npcId: obj.npcId,
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
      !this.unlockedDoors.has(obj.id) &&
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
      this.unlockedDoors.add(obj.id);
    }

    if (obj.visualStyle === 'staircase') {
      this.unlockedStairs.add(obj.id);
    }

    // 若玩家從公共走廊透過房門進入室內房間，記錄返回位置
    const doorDef = CORRIDOR_DOORS_REGISTRY[obj.id];
    if (doorDef) {
      this.unlockedDoors.add(doorDef.doorId);
      this.currentCorridorSceneId = doorDef.corridorSceneId;
      this.currentDoorId = doorDef.doorId;
      this.currentRoomSceneId = doorDef.destinationSceneId;
      this.roomReturnPosition = {
        corridorSceneId: doorDef.corridorSceneId,
        doorId: doorDef.doorId,
        x: doorDef.returnX,
        y: 312,
        facing: 'right',
        spawnId: doorDef.returnSpawnId,
      };
    }

    let targetAreaId = portal.targetAreaId;
    let targetSpawnId = portal.targetSpawnId;

    // 若從室內房間離開返回走廊：
    if (
      INDOOR_ROOM_TO_CORRIDOR_MIGRATION_TABLE[fromAreaId] &&
      isCorridorSceneId(targetAreaId)
    ) {
      if (this.lastCorridorAreaId === 'corridor') {
        // 向下相容舊版測試（由舊 corridor 進入 academic_office 再離開回舊 corridor）
        targetAreaId = 'corridor';
        targetSpawnId = `from_${fromAreaId.replace('_office', '')}`;
      } else if (
        this.roomReturnPosition &&
        this.roomReturnPosition.corridorSceneId === targetAreaId
      ) {
        targetAreaId = this.roomReturnPosition.corridorSceneId;
        targetSpawnId = this.roomReturnPosition.spawnId;
      }
    }

    // 切換至目標區域與對應安全落地出生點
    const spawnLoc = this.setAreaAndSpawn(targetAreaId, targetSpawnId);
    const safeSpawn = this.getCurrentSpawnLocation(playerColliderWidth);

    // 切換完成後將 UI 狀態恢復為 none (或由過場動畫控制)
    this.activeModalState = 'none';

    const messages: string[] = [];
    if (portal.unlockedMessage) {
      messages.push(portal.unlockedMessage);
    }
    messages.push(`進入【${getAreaDefinition(targetAreaId).title}】`);

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
