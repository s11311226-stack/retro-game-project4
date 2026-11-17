import {
  CAMPUS_AREAS,
  ITEMS_CATALOG,
  getAllInteractableDefinitions,
  getAreaDefinition,
} from '../data/campusAreas';
import {
  ALL_CORRIDOR_SCENE_IDS,
  INDOOR_ROOM_TO_CORRIDOR_MIGRATION_TABLE,
  isCorridorSceneId,
} from '../data/campusCorridorNetwork';
import { DEMO_STORY_EVENTS, INITIAL_OBJECTIVE_TEXT } from '../data/storyScript';
import {
  LEGACY_SAVE_SCHEMA_VERSION_V1,
  LEGACY_SAVE_SCHEMA_VERSION_V2,
  SAVE_SCHEMA_VERSION,
  type AreaId,
  type AudioSettingsData,
  type CampusTimePhase,
  type ClueEntryDef,
  type CorridorSceneId,
  type FacingDirection,
  type GameSavePayloadV2,
  type InventoryItemDef,
  type Phase6ASaveState,
  type RoomReturnPosition,
  type SaveLoadResult,
  type StoryEventId,
  type StoryFlagId,
} from '../types';
import {
  CampusAtmosphereSystem,
  globalCampusAtmosphere,
} from './CampusAtmosphereSystem';
import {
  CharacterRelationshipSystem,
  globalRelationshipSystem,
} from './CharacterRelationshipSystem';
import { EvidenceSystem, globalEvidenceSystem } from './EvidenceSystem';
import type { ExplorationStateManager } from './ExplorationStateManager';
import { GlobalGameState, globalGameState } from './GlobalGameState';
import {
  NPCInteractionSystem,
  globalNPCInteractionSystem,
} from './NPCInteractionSystem';
import { QuestSystem, globalQuestSystem } from './QuestSystem';
import type { StoryStateManager } from './StoryStateManager';

export const SAVE_STORAGE_KEY = 'unnamed_campus_save_v2';
export const AUDIO_SETTINGS_STORAGE_KEY = 'unnamed_campus_audio_settings_v1';

export interface Phase6AManagersBundle {
  globalState?: GlobalGameState;
  relationships?: CharacterRelationshipSystem;
  evidence?: EvidenceSystem;
  quests?: QuestSystem;
  atmosphere?: CampusAtmosphereSystem;
  npcInteraction?: NPCInteractionSystem;
}

const VALID_AREA_IDS = new Set<AreaId>([
  ...ALL_CORRIDOR_SCENE_IDS,
  'school_gate',
  'bulletin_area',
  'corridor',
  'classroom',
  'academic_office',
  'teachers_office',
  'dormitory',
  'old_library',
  'forbidden_archive',
  'rooftop',
  'infirmary',
  'classroom_2b',
  'student_activity_room',
  'special_classroom',
  'science_reserve_4f',
  'rooftop_west',
  'rooftop_equipment',
  'underground_b1',
  'underground_b2',
  'underground_b3',
]);

const VALID_STORY_FLAGS = new Set<StoryFlagId>([
  'flag_intro_played',
  'flag_admission_notice_read',
  'flag_missing_poster_found',
  'flag_classroom_key_obtained',
  'flag_classroom_entered',
  'flag_roster_mismatch_checked',
  'flag_anachronistic_file_read',
  'flag_anomaly_observation_triggered',
  'flag_demo_completed',
]);

const VALID_STORY_EVENTS = new Set<StoryEventId>(
  Object.keys(DEMO_STORY_EVENTS) as StoryEventId[]
);

/**
 * 存檔中包含機密字樣的黑名單鍵名檢查，確保絕對不將密碼、權杖或其他機密寫入或讀入存檔
 */
const FORBIDDEN_SECRET_KEY_PATTERNS = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /credential/i,
  /private[_-]?key/i,
];

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class MemoryStorageFallback implements StorageBackend {
  private map = new Map<string, string>();
  public getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  public setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  public removeItem(key: string): void {
    this.map.delete(key);
  }
}

/**
 * 版本化存檔與讀檔管理器 (SaveManager)
 *
 * 負責：
 * 1. 儲存玩家位置 (區域、出生點、座標、朝向)、已取得物品、已讀線索、已解鎖門與劇情旗標。
 * 2. Phase 6A 擴充：完整儲存與還原 GlobalGameState、CharacterRelationshipSystem、EvidenceSystem、QuestSystem。
 * 3. 使用明確的 `schemaVersion: 3` 版本化結構，並相容既有 Demo V2 (`schemaVersion: 2`) 與 V1 (`schemaVersion: 1`) 存檔自動平滑升級遷移。
 * 4. 安全檢查：禁止寫入或保留任何疑似密碼、Token 或 API Key 的機密欄位。
 * 5. 載入存檔時自動校正玩家 X/Y 座標至合法區域邊界與地面高度，避免壞檔座標造成卡牆或懸空。
 */
export class SaveManager {
  private storage: StorageBackend;
  private storageKey: string;

  constructor(storage?: StorageBackend, storageKey = SAVE_STORAGE_KEY) {
    if (storage) {
      this.storage = storage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      this.storage = new MemoryStorageFallback();
    }
    this.storageKey = storageKey;
  }

  public hasValidSave(): boolean {
    const res = this.loadAndValidateSave();
    return res.success;
  }

  public deleteSave(): void {
    try {
      this.storage.removeItem(this.storageKey);
    } catch {
      // 忽略儲存空間存取限制
    }
  }

  /**
   * 從目前遊戲狀態建立並寫入 V3 版本化存檔（向下相容既有 Demo 呼叫介面）
   */
  public saveCurrentGame(
    exploration: ExplorationStateManager,
    story: StoryStateManager,
    playerState: {
      x: number;
      y: number;
      facing: FacingDirection;
      stamina?: number;
    },
    audioSettings?: AudioSettingsData,
    phase6aManagers?: Phase6AManagersBundle
  ): GameSavePayloadV2 {
    const areaId = exploration.getCurrentAreaId();
    const area = getAreaDefinition(areaId);
    const clampedX = Math.max(
      area.bounds.minX + 18,
      Math.min(area.bounds.maxX - 18, Math.round(playerState.x))
    );

    const gState = phase6aManagers?.globalState ?? globalGameState;
    const relSys = phase6aManagers?.relationships ?? globalRelationshipSystem;
    const evSys = phase6aManagers?.evidence ?? globalEvidenceSystem;
    const qSys = phase6aManagers?.quests ?? globalQuestSystem;
    const atmSys = phase6aManagers?.atmosphere ?? globalCampusAtmosphere;
    const npcSys = phase6aManagers?.npcInteraction ?? globalNPCInteractionSystem;

    const payload: GameSavePayloadV2 = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAtIso: new Date().toISOString(),
      player: {
        areaId,
        spawnId: exploration.getCurrentSpawnId(),
        x: clampedX,
        y: area.bounds.floorY,
        facing: playerState.facing === 'left' ? 'left' : 'right',
        stamina: playerState.stamina ?? 100,
        buildingId: exploration.getCurrentBuildingId(),
        floorLevel: exploration.getCurrentFloorLevel(),
        corridorSceneId: exploration.getCurrentCorridorSceneId(),
        currentRoomSceneId: exploration.getCurrentRoomSceneId(),
        currentDoorId: exploration.getCurrentDoorId(),
        roomReturnPosition: exploration.getRoomReturnPosition(),
        migratedLegacyRoom: false,
      },
      exploration: {
        collectedObjectIds: exploration.getCollectedObjectIds(),
        inventoryItemIds: exploration.getInventoryItems().map((i) => i.id),
        clueIds: exploration.getClues().map((c) => c.id),
        unlockedPortalIds: exploration.getUnlockedPortalIds(),
        exploredAreaIds: exploration.getExploredAreaIds(),
        exploredCorridors: exploration.getExploredCorridors(),
        exploredRooms: exploration.getExploredRooms(),
        unlockedDoors: exploration.getUnlockedDoors(),
        unlockedStairs: exploration.getUnlockedStairs(),
      },
      story: {
        flags: story.getFlags(),
        completedEventIds: story.getCompletedEventIds(),
        currentObjectiveText: story.getCurrentObjective(),
        metrics: story.getMetrics(),
      },
      audio: audioSettings
        ? {
            bgmVolume: Math.max(0, Math.min(1, audioSettings.bgmVolume)),
            sfxVolume: Math.max(0, Math.min(1, audioSettings.sfxVolume)),
            muted: Boolean(audioSettings.muted),
          }
        : undefined,
      phase6a: {
        globalVariables: gState.toSaveData(),
        relationships: relSys.toSaveData(),
        evidence: evSys.serialize(),
        quests: qSys.serialize(),
        timePhase: atmSys.getCurrentPhase(),
        npcCompletedChoiceIds: npcSys.serialize().completedChoiceIds,
        investigatedObjectIds: exploration.getInvestigatedObjectIds(),
      },
    };

    // 執行機密欄位安全掃描，確保絕無密碼或權杖被寫入存檔
    this.assertNoSecretFields(payload);

    try {
      this.storage.setItem(this.storageKey, JSON.stringify(payload));
    } catch {
      // 忽略 QuotaExceeded 等例外
    }

    return payload;
  }

  /**
   * 讀取並驗證存檔資料，處理損毀 JSON、缺漏欄位，以及 V1 / V2 -> V3 舊版資料遷移
   */
  public loadAndValidateSave(): SaveLoadResult {
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(this.storageKey);
    } catch {
      return {
        success: false,
        migratedFromLegacy: false,
        reason: 'storage_error',
      };
    }

    if (!raw || raw.trim() === '') {
      return {
        success: false,
        migratedFromLegacy: false,
        reason: 'no_save',
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        success: false,
        migratedFromLegacy: false,
        reason: 'corrupted_json',
      };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        success: false,
        migratedFromLegacy: false,
        reason: 'invalid_schema',
      };
    }

    const obj = parsed as Record<string, unknown>;

    // 檢查是否為舊版 V1 存檔結構 (schemaVersion === 1)
    if (obj.schemaVersion === LEGACY_SAVE_SCHEMA_VERSION_V1) {
      return this.migrateV1ToCurrent(obj);
    }

    // 檢查是否為 Demo V2 存檔結構 (schemaVersion === 2)，平滑升級至 V3
    if (obj.schemaVersion === LEGACY_SAVE_SCHEMA_VERSION_V2) {
      return this.validatePayloadObject(obj, true, LEGACY_SAVE_SCHEMA_VERSION_V2);
    }

    if (typeof obj.schemaVersion !== 'number') {
      return {
        success: false,
        migratedFromLegacy: false,
        reason: 'invalid_schema',
      };
    }

    if (obj.schemaVersion !== SAVE_SCHEMA_VERSION) {
      return {
        success: false,
        migratedFromLegacy: false,
        reason: 'unsupported_version',
      };
    }

    return this.validatePayloadObject(obj, false);
  }

  /**
   * 將驗證通過的存檔套用至探索、劇情與 Phase 6A 四大核心系統，並回傳玩家恢復座標
   */
  public applySaveToManagers(
    saveData: GameSavePayloadV2,
    exploration: ExplorationStateManager,
    story: StoryStateManager,
    phase6aManagers?: Phase6AManagersBundle
  ): {
    areaId: AreaId;
    spawnId: string;
    x: number;
    y: number;
    facing: FacingDirection;
  } {
    const allInteractables = getAllInteractableDefinitions();
    const allCluesMap = new Map<string, ClueEntryDef>();
    for (const inter of allInteractables) {
      if (inter.clue) {
        allCluesMap.set(inter.clue.id, inter.clue);
      }
      if (inter.document?.clue) {
        allCluesMap.set(inter.document.clue.id, inter.document.clue);
      }
    }

    const restoredItems: InventoryItemDef[] = saveData.exploration.inventoryItemIds
      .map((id) => ITEMS_CATALOG[id])
      .filter((item): item is InventoryItemDef => Boolean(item));

    const restoredClues: ClueEntryDef[] = saveData.exploration.clueIds
      .map((id) => allCluesMap.get(id))
      .filter((clue): clue is ClueEntryDef => Boolean(clue));

    // 若為舊版存檔且記錄在室內場景（未包含 R1 走廊返回資訊），透過遷移表安排在該房間所屬公共走廊入口外
    let targetAreaId: AreaId = saveData.player.areaId;
    let targetSpawnId: string = saveData.player.spawnId;
    let targetX: number = saveData.player.x;
    let targetY: number = saveData.player.y;
    let targetFacing: FacingDirection = saveData.player.facing;

    if (
      saveData.player.migratedLegacyRoom &&
      INDOOR_ROOM_TO_CORRIDOR_MIGRATION_TABLE[saveData.player.areaId]
    ) {
      const mig = INDOOR_ROOM_TO_CORRIDOR_MIGRATION_TABLE[saveData.player.areaId];
      targetAreaId = mig.corridorSceneId;
      targetSpawnId = mig.returnSpawnId;
      targetX = mig.doorX;
      targetY = 312;
      targetFacing = 'right';
    }

    exploration.restoreFromSaveData({
      areaId: targetAreaId,
      spawnId: targetSpawnId,
      collectedObjectIds: saveData.exploration.collectedObjectIds,
      investigatedObjectIds: saveData.phase6a?.investigatedObjectIds ?? [],
      inventoryItems: restoredItems,
      clues: restoredClues,
      unlockedPortalIds: saveData.exploration.unlockedPortalIds,
      exploredAreaIds: saveData.exploration.exploredAreaIds,
      exploredCorridors: saveData.exploration.exploredCorridors,
      exploredRooms: saveData.exploration.exploredRooms,
      unlockedDoors: saveData.exploration.unlockedDoors,
      unlockedStairs: saveData.exploration.unlockedStairs,
      corridorSceneId: saveData.player.corridorSceneId,
      currentRoomSceneId: saveData.player.migratedLegacyRoom
        ? null
        : saveData.player.currentRoomSceneId,
      currentDoorId: saveData.player.currentDoorId,
      roomReturnPosition: saveData.player.roomReturnPosition,
    });

    story.restoreFromSaveData({
      flags: saveData.story.flags,
      completedEventIds: saveData.story.completedEventIds,
      currentObjectiveText: saveData.story.currentObjectiveText,
      metrics: saveData.story.metrics,
    });

    // 同步還原 Phase 6A & 6B 核心系統
    const gState = phase6aManagers?.globalState ?? globalGameState;
    const relSys = phase6aManagers?.relationships ?? globalRelationshipSystem;
    const evSys = phase6aManagers?.evidence ?? globalEvidenceSystem;
    const qSys = phase6aManagers?.quests ?? globalQuestSystem;
    const atmSys = phase6aManagers?.atmosphere ?? globalCampusAtmosphere;
    const npcSys = phase6aManagers?.npcInteraction ?? globalNPCInteractionSystem;

    const legacyEvidenceIds = [
      ...saveData.exploration.clueIds,
      ...saveData.exploration.inventoryItemIds,
    ];

    if (saveData.phase6a) {
      gState.restoreFromSaveData(saveData.phase6a.globalVariables);
      relSys.restoreFromSaveData(saveData.phase6a.relationships);
      evSys.restoreFromSave(saveData.phase6a.evidence, legacyEvidenceIds);
      qSys.restoreFromSave(saveData.phase6a.quests, saveData.story.flags);
      atmSys.restoreFromSave(saveData.phase6a.timePhase);
      npcSys.restoreFromSave({
        completedChoiceIds: saveData.phase6a.npcCompletedChoiceIds ?? [],
      });
      // 若存檔中有自訂的全域變數（如 injuryCount / corporateAlert / publicExposure 等），確保還原後不被覆蓋
      if (saveData.phase6a.globalVariables) {
        gState.restoreFromSaveData({
          ...saveData.phase6a.globalVariables,
          evidenceCompletion: evSys.calculateEvidenceCompletion(),
        });
      }
      qSys.evaluateAndSyncQuests(
        saveData.story.flags,
        saveData.story.completedEventIds
      );
    } else {
      // 由舊版 V1 / V2 遷移之存檔：自動根據已收集線索、物品與劇情旗標重建 Phase 6A 狀態
      gState.reset('save_restore', 'Migrate from legacy save');
      relSys.reset();
      evSys.restoreFromSave(undefined, legacyEvidenceIds);
      qSys.reset();
      atmSys.reset();
      npcSys.reset();
      qSys.evaluateAndSyncQuests(
        saveData.story.flags,
        saveData.story.completedEventIds
      );
    }

    return {
      areaId: targetAreaId,
      spawnId: targetSpawnId,
      x: targetX,
      y: targetY,
      facing: targetFacing,
    };
  }

  private migrateV1ToCurrent(v1Obj: Record<string, unknown>): SaveLoadResult {
    const areaIdRaw =
      (v1Obj.areaId as string) ??
      ((v1Obj.player as Record<string, unknown> | undefined)?.areaId as string);

    if (!areaIdRaw || !VALID_AREA_IDS.has(areaIdRaw as AreaId)) {
      return {
        success: false,
        migratedFromLegacy: false,
        reason: 'invalid_schema',
      };
    }

    const areaId = areaIdRaw as AreaId;
    const area = CAMPUS_AREAS[areaId];
    const rawX =
      typeof v1Obj.x === 'number'
        ? v1Obj.x
        : typeof (v1Obj.player as Record<string, unknown> | undefined)?.x ===
            'number'
          ? ((v1Obj.player as Record<string, unknown>).x as number)
          : area.spawns[area.defaultSpawnId].x;

    const rawItems = Array.isArray(v1Obj.items)
      ? v1Obj.items
      : Array.isArray(v1Obj.inventoryItemIds)
        ? v1Obj.inventoryItemIds
        : [];
    const rawClues = Array.isArray(v1Obj.clues)
      ? v1Obj.clues
      : Array.isArray(v1Obj.clueIds)
        ? v1Obj.clueIds
        : [];
    const rawFlags = Array.isArray(v1Obj.flags) ? v1Obj.flags : [];
    const rawCollected = Array.isArray(v1Obj.collectedObjectIds)
      ? v1Obj.collectedObjectIds
      : [];

    const constructed: Record<string, unknown> = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAtIso:
        typeof v1Obj.savedAtIso === 'string'
          ? v1Obj.savedAtIso
          : new Date().toISOString(),
      player: {
        areaId,
        spawnId: area.defaultSpawnId,
        x: rawX,
        y: area.bounds.floorY,
        facing: v1Obj.facing === 'left' ? 'left' : 'right',
      },
      exploration: {
        collectedObjectIds: rawCollected,
        inventoryItemIds: rawItems,
        clueIds: rawClues,
        unlockedPortalIds: [],
      },
      story: {
        flags: rawFlags,
        completedEventIds: [],
        currentObjectiveText: INITIAL_OBJECTIVE_TEXT,
        metrics: {
          evidenceCompleteness: 0,
          affectionScores: {},
          conglomerateAlertLevel: 0,
        },
      },
    };

    return this.validatePayloadObject(
      constructed,
      true,
      LEGACY_SAVE_SCHEMA_VERSION_V1
    );
  }

  private validatePayloadObject(
    obj: Record<string, unknown>,
    migratedFromLegacy: boolean,
    migratedFromVersion?: number
  ): SaveLoadResult {
    const player = obj.player as Record<string, unknown> | undefined;
    const exploration = obj.exploration as Record<string, unknown> | undefined;
    const story = obj.story as Record<string, unknown> | undefined;

    if (
      !player ||
      typeof player !== 'object' ||
      !exploration ||
      typeof exploration !== 'object' ||
      !story ||
      typeof story !== 'object'
    ) {
      return {
        success: false,
        migratedFromLegacy,
        migratedFromVersion,
        reason: 'invalid_schema',
      };
    }

    const areaId = player.areaId as AreaId;
    if (!VALID_AREA_IDS.has(areaId)) {
      return {
        success: false,
        migratedFromLegacy,
        migratedFromVersion,
        reason: 'invalid_schema',
      };
    }

    if (typeof player.x !== 'number' || Number.isNaN(player.x)) {
      return {
        success: false,
        migratedFromLegacy,
        migratedFromVersion,
        reason: 'invalid_schema',
      };
    }

    if (
      !Array.isArray(exploration.collectedObjectIds) ||
      !Array.isArray(exploration.inventoryItemIds) ||
      !Array.isArray(exploration.clueIds) ||
      !Array.isArray(story.flags)
    ) {
      return {
        success: false,
        migratedFromLegacy,
        migratedFromVersion,
        reason: 'invalid_schema',
      };
    }

    const area = CAMPUS_AREAS[areaId];
    const safeX = Math.max(
      area.bounds.minX + 18,
      Math.min(area.bounds.maxX - 18, Math.round(player.x))
    );
    const spawnId =
      typeof player.spawnId === 'string' && area.spawns[player.spawnId]
        ? player.spawnId
        : area.defaultSpawnId;

    const validFlags = story.flags.filter(
      (f): f is StoryFlagId =>
        typeof f === 'string' && VALID_STORY_FLAGS.has(f as StoryFlagId)
    );

    const rawEvents = Array.isArray(story.completedEventIds)
      ? story.completedEventIds
      : [];
    const validEvents = rawEvents.filter(
      (e): e is StoryEventId =>
        typeof e === 'string' && VALID_STORY_EVENTS.has(e as StoryEventId)
    );

    const rawUnlocked = Array.isArray(exploration.unlockedPortalIds)
      ? exploration.unlockedPortalIds
      : [];

    const validItemIds = exploration.inventoryItemIds.filter(
      (id): id is string => typeof id === 'string' && Boolean(ITEMS_CATALOG[id])
    );
    const validClueIds = exploration.clueIds.filter(
      (id): id is string => typeof id === 'string'
    );

    const savedAtIso =
      typeof obj.savedAtIso === 'string'
        ? obj.savedAtIso
        : new Date().toISOString();

    const sanitizedPhase6A = this.sanitizePhase6ASection(
      obj.phase6a as Partial<Phase6ASaveState> | undefined,
      validClueIds,
      validItemIds,
      savedAtIso
    );

    const indoorMigration = INDOOR_ROOM_TO_CORRIDOR_MIGRATION_TABLE[areaId];
    const hasExplicitR1CorridorInfo =
      typeof player.corridorSceneId === 'string' ||
      player.migratedLegacyRoom === false;
    const isPreR1IndoorSave =
      Boolean(indoorMigration) && !hasExplicitR1CorridorInfo;

    const resolvedCorridorId: CorridorSceneId | null =
      typeof player.corridorSceneId === 'string' &&
      isCorridorSceneId(player.corridorSceneId)
        ? player.corridorSceneId
        : isCorridorSceneId(areaId)
          ? areaId
          : indoorMigration
            ? indoorMigration.corridorSceneId
            : null;

    const resolvedRoomId: AreaId | null = indoorMigration ? areaId : null;
    const resolvedDoorId: string | null =
      typeof player.currentDoorId === 'string'
        ? player.currentDoorId
        : indoorMigration
          ? indoorMigration.doorId
          : null;

    const rawReturnPos = player.roomReturnPosition as
      | Partial<RoomReturnPosition>
      | undefined;
    const resolvedReturnPos: RoomReturnPosition | null =
      rawReturnPos &&
      typeof rawReturnPos.corridorSceneId === 'string' &&
      isCorridorSceneId(rawReturnPos.corridorSceneId) &&
      typeof rawReturnPos.x === 'number'
        ? {
            corridorSceneId: rawReturnPos.corridorSceneId,
            doorId:
              typeof rawReturnPos.doorId === 'string'
                ? rawReturnPos.doorId
                : resolvedDoorId ?? '',
            x: rawReturnPos.x,
            y: typeof rawReturnPos.y === 'number' ? rawReturnPos.y : 312,
            facing: rawReturnPos.facing === 'left' ? 'left' : 'right',
            spawnId:
              typeof rawReturnPos.spawnId === 'string'
                ? rawReturnPos.spawnId
                : 'from_room',
          }
        : indoorMigration
          ? {
              corridorSceneId: indoorMigration.corridorSceneId,
              doorId: indoorMigration.doorId,
              x: indoorMigration.doorX,
              y: 312,
              facing: 'right',
              spawnId: indoorMigration.returnSpawnId,
            }
          : null;

    const rawExploredAreas = Array.isArray(
      (exploration as Record<string, unknown>).exploredAreaIds
    )
      ? (
          (exploration as Record<string, unknown>).exploredAreaIds as unknown[]
        ).filter((id): id is string => typeof id === 'string')
      : [areaId];

    const exploredAreaSet = new Set<string>(rawExploredAreas);
    exploredAreaSet.add(areaId);
    if (resolvedCorridorId) {
      exploredAreaSet.add(resolvedCorridorId);
    }

    const rawExploredCorridors = Array.isArray(
      (exploration as Record<string, unknown>).exploredCorridors
    )
      ? (
          (exploration as Record<string, unknown>)
            .exploredCorridors as unknown[]
        ).filter(
          (id): id is CorridorSceneId =>
            typeof id === 'string' && isCorridorSceneId(id)
        )
      : [];
    const exploredCorridorsSet = new Set<CorridorSceneId>(rawExploredCorridors);
    for (const id of exploredAreaSet) {
      if (isCorridorSceneId(id)) {
        exploredCorridorsSet.add(id);
      }
    }

    const rawExploredRooms = Array.isArray(
      (exploration as Record<string, unknown>).exploredRooms
    )
      ? (
          (exploration as Record<string, unknown>).exploredRooms as unknown[]
        ).filter(
          (id): id is AreaId =>
            typeof id === 'string' &&
            Boolean(INDOOR_ROOM_TO_CORRIDOR_MIGRATION_TABLE[id])
        )
      : [];
    const exploredRoomsSet = new Set<AreaId>(rawExploredRooms);
    for (const id of exploredAreaSet) {
      if (INDOOR_ROOM_TO_CORRIDOR_MIGRATION_TABLE[id]) {
        exploredRoomsSet.add(id as AreaId);
      }
    }

    const rawUnlockedDoors = Array.isArray(
      (exploration as Record<string, unknown>).unlockedDoors
    )
      ? (
          (exploration as Record<string, unknown>).unlockedDoors as unknown[]
        ).filter((id): id is string => typeof id === 'string')
      : [];
    const rawUnlockedStairs = Array.isArray(
      (exploration as Record<string, unknown>).unlockedStairs
    )
      ? (
          (exploration as Record<string, unknown>).unlockedStairs as unknown[]
        ).filter((id): id is string => typeof id === 'string')
      : [];

    const sanitized: GameSavePayloadV2 = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAtIso,
      player: {
        areaId,
        spawnId,
        x: safeX,
        y: area.bounds.floorY,
        facing: player.facing === 'left' ? 'left' : 'right',
        stamina:
          typeof player.stamina === 'number'
            ? Math.max(0, Math.min(100, player.stamina))
            : 100,
        buildingId: area.building,
        floorLevel: area.floor,
        corridorSceneId: resolvedCorridorId,
        currentRoomSceneId: resolvedRoomId,
        currentDoorId: resolvedDoorId,
        roomReturnPosition: resolvedReturnPos,
        migratedLegacyRoom: isPreR1IndoorSave,
      },
      exploration: {
        collectedObjectIds: exploration.collectedObjectIds.filter(
          (id): id is string => typeof id === 'string'
        ),
        inventoryItemIds: validItemIds,
        clueIds: validClueIds,
        unlockedPortalIds: rawUnlocked.filter(
          (id): id is string => typeof id === 'string'
        ),
        exploredAreaIds: Array.from(exploredAreaSet),
        exploredCorridors: Array.from(exploredCorridorsSet),
        exploredRooms: Array.from(exploredRoomsSet),
        unlockedDoors: Array.from(
          new Set([
            ...rawUnlocked.filter((id): id is string => typeof id === 'string'),
            ...rawUnlockedDoors,
          ])
        ),
        unlockedStairs: rawUnlockedStairs,
      },
      story: {
        flags: validFlags,
        completedEventIds: validEvents,
        currentObjectiveText:
          typeof story.currentObjectiveText === 'string' &&
          story.currentObjectiveText.trim().length > 0
            ? story.currentObjectiveText
            : INITIAL_OBJECTIVE_TEXT,
        metrics: {
          evidenceCompleteness:
            typeof (story.metrics as Record<string, unknown> | undefined)
              ?.evidenceCompleteness === 'number'
              ? ((story.metrics as Record<string, unknown>)
                  .evidenceCompleteness as number)
              : 0,
          affectionScores: {},
          conglomerateAlertLevel:
            typeof (story.metrics as Record<string, unknown> | undefined)
              ?.conglomerateAlertLevel === 'number'
              ? ((story.metrics as Record<string, unknown>)
                  .conglomerateAlertLevel as number)
              : 0,
        },
      },
      phase6a: sanitizedPhase6A,
    };

    return {
      success: true,
      migratedFromLegacy,
      migratedFromVersion,
      data: sanitized,
    };
  }

  private sanitizePhase6ASection(
    rawPhase6a: Partial<Phase6ASaveState> | undefined,
    legacyClueIds: string[],
    legacyItemIds: string[],
    fallbackIso: string
  ): Phase6ASaveState {
    const tempGlobal = new GlobalGameState();
    const tempRel = new CharacterRelationshipSystem(tempGlobal);
    const tempEv = new EvidenceSystem(tempGlobal);
    const tempQuest = new QuestSystem(tempGlobal, tempRel, tempEv);

    if (rawPhase6a && typeof rawPhase6a === 'object') {
      tempGlobal.restoreFromSaveData(rawPhase6a.globalVariables);
      tempRel.restoreFromSaveData(rawPhase6a.relationships);
      tempEv.restoreFromSave(rawPhase6a.evidence, [
        ...legacyClueIds,
        ...legacyItemIds,
      ]);
      tempQuest.restoreFromSave(rawPhase6a.quests);
      if (rawPhase6a.globalVariables) {
        tempGlobal.restoreFromSaveData({
          ...rawPhase6a.globalVariables,
          evidenceCompletion: tempEv.calculateEvidenceCompletion(),
        });
      }
    } else {
      tempEv.restoreFromSave(
        {
          records: [...legacyClueIds, ...legacyItemIds].map((id) => ({
            id,
            collectedAtIso: fallbackIso,
            isAnalyzed: false,
            isDebunked: false,
          })),
          triggeredEventIds: [],
        },
        []
      );
    }

    const validTimePhase: CampusTimePhase =
      rawPhase6a?.timePhase === 'dusk' || rawPhase6a?.timePhase === 'night'
        ? rawPhase6a.timePhase
        : 'day';
    const validNpcChoices = Array.isArray(rawPhase6a?.npcCompletedChoiceIds)
      ? rawPhase6a.npcCompletedChoiceIds.filter(
          (id): id is string => typeof id === 'string'
        )
      : [];
    const validInvestigated = Array.isArray(rawPhase6a?.investigatedObjectIds)
      ? rawPhase6a.investigatedObjectIds.filter(
          (id): id is string => typeof id === 'string'
        )
      : [];

    return {
      globalVariables: tempGlobal.toSaveData(),
      relationships: tempRel.toSaveData(),
      evidence: tempEv.serialize(),
      quests: tempQuest.serialize(),
      timePhase: validTimePhase,
      npcCompletedChoiceIds: validNpcChoices,
      investigatedObjectIds: validInvestigated,
    };
  }

  public assertNoSecretFields(obj: unknown): void {
    if (!obj || typeof obj !== 'object') return;
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      for (const pattern of FORBIDDEN_SECRET_KEY_PATTERNS) {
        if (pattern.test(key)) {
          throw new Error(
            `Security Violation: Refusing to persist secret/credential key "${key}" in save data.`
          );
        }
      }
      if (value && typeof value === 'object') {
        this.assertNoSecretFields(value);
      }
    }
  }
}

export const globalSaveManager = new SaveManager();
