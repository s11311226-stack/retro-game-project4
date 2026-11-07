import {
  CAMPUS_AREAS,
  ITEMS_CATALOG,
  getAllInteractableDefinitions,
  getAreaDefinition,
} from '../data/campusAreas';
import { DEMO_STORY_EVENTS, INITIAL_OBJECTIVE_TEXT } from '../data/storyScript';
import {
  SAVE_SCHEMA_VERSION,
  type AreaId,
  type AudioSettingsData,
  type ClueEntryDef,
  type FacingDirection,
  type GameSavePayloadV2,
  type InventoryItemDef,
  type SaveLoadResult,
  type StoryEventId,
  type StoryFlagId,
} from '../types';
import type { ExplorationStateManager } from './ExplorationStateManager';
import type { StoryStateManager } from './StoryStateManager';

export const SAVE_STORAGE_KEY = 'unnamed_campus_save_v2';
export const AUDIO_SETTINGS_STORAGE_KEY = 'unnamed_campus_audio_settings_v1';

const VALID_AREA_IDS = new Set<AreaId>([
  'school_gate',
  'bulletin_area',
  'corridor',
  'classroom',
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
 * 2. 使用明確的 `schemaVersion: 2` 版本化結構。
 * 3. 驗證存檔損毀 (非合法 JSON)、缺少必要欄位、型別錯誤，並支援從舊版 (V1) 結構自動平滑升級遷移至 V2。
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
   * 從目前遊戲狀態建立並寫入 V2 版本化存檔
   */
  public saveCurrentGame(
    exploration: ExplorationStateManager,
    story: StoryStateManager,
    playerState: { x: number; y: number; facing: FacingDirection },
    audioSettings?: AudioSettingsData
  ): GameSavePayloadV2 {
    const areaId = exploration.getCurrentAreaId();
    const area = getAreaDefinition(areaId);
    const clampedX = Math.max(
      area.bounds.minX + 18,
      Math.min(area.bounds.maxX - 18, Math.round(playerState.x))
    );

    const payload: GameSavePayloadV2 = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAtIso: new Date().toISOString(),
      player: {
        areaId,
        spawnId: exploration.getCurrentSpawnId(),
        x: clampedX,
        y: area.bounds.floorY,
        facing: playerState.facing === 'left' ? 'left' : 'right',
      },
      exploration: {
        collectedObjectIds: exploration.getCollectedObjectIds(),
        inventoryItemIds: exploration.getInventoryItems().map((i) => i.id),
        clueIds: exploration.getClues().map((c) => c.id),
        unlockedPortalIds: exploration.getUnlockedPortalIds(),
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
   * 讀取並驗證存檔資料，處理損毀 JSON、缺漏欄位與 V1 -> V2 舊版資料遷移
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

    // 檢查是否為舊版 V1 存檔結構 (schemaVersion === 1 或舊版扁平結構)
    if (obj.schemaVersion === 1) {
      return this.migrateV1ToV2(obj);
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

    return this.validateV2Object(obj, false);
  }

  /**
   * 將驗證通過的存檔套用至探索與劇情狀態管理器，並回傳玩家恢復座標
   */
  public applySaveToManagers(
    saveData: GameSavePayloadV2,
    exploration: ExplorationStateManager,
    story: StoryStateManager
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

    exploration.restoreFromSaveData({
      areaId: saveData.player.areaId,
      spawnId: saveData.player.spawnId,
      collectedObjectIds: saveData.exploration.collectedObjectIds,
      inventoryItems: restoredItems,
      clues: restoredClues,
      unlockedPortalIds: saveData.exploration.unlockedPortalIds,
    });

    story.restoreFromSaveData({
      flags: saveData.story.flags,
      completedEventIds: saveData.story.completedEventIds,
      currentObjectiveText: saveData.story.currentObjectiveText,
      metrics: saveData.story.metrics,
    });

    return {
      areaId: saveData.player.areaId,
      spawnId: saveData.player.spawnId,
      x: saveData.player.x,
      y: saveData.player.y,
      facing: saveData.player.facing,
    };
  }

  private migrateV1ToV2(v1Obj: Record<string, unknown>): SaveLoadResult {
    // 支援舊版 V1 結構欄位轉換
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

    const constructedV2: Record<string, unknown> = {
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

    return this.validateV2Object(constructedV2, true);
  }

  private validateV2Object(
    obj: Record<string, unknown>,
    migratedFromLegacy: boolean
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
        reason: 'invalid_schema',
      };
    }

    const areaId = player.areaId as AreaId;
    if (!VALID_AREA_IDS.has(areaId)) {
      return {
        success: false,
        migratedFromLegacy,
        reason: 'invalid_schema',
      };
    }

    if (typeof player.x !== 'number' || Number.isNaN(player.x)) {
      return {
        success: false,
        migratedFromLegacy,
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

    const sanitized: GameSavePayloadV2 = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAtIso:
        typeof obj.savedAtIso === 'string'
          ? obj.savedAtIso
          : new Date().toISOString(),
      player: {
        areaId,
        spawnId,
        x: safeX,
        y: area.bounds.floorY,
        facing: player.facing === 'left' ? 'left' : 'right',
      },
      exploration: {
        collectedObjectIds: exploration.collectedObjectIds.filter(
          (id): id is string => typeof id === 'string'
        ),
        inventoryItemIds: exploration.inventoryItemIds.filter(
          (id): id is string => typeof id === 'string' && Boolean(ITEMS_CATALOG[id])
        ),
        clueIds: exploration.clueIds.filter(
          (id): id is string => typeof id === 'string'
        ),
        unlockedPortalIds: rawUnlocked.filter(
          (id): id is string => typeof id === 'string'
        ),
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
    };

    return {
      success: true,
      migratedFromLegacy,
      data: sanitized,
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
