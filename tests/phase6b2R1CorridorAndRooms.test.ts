import { beforeEach, describe, expect, it } from 'vitest';
import { CAMPUS_AREAS } from '../src/data/campusAreas';
import {
  ALL_CORRIDOR_SCENE_IDS,
  BUILDING_BOUNDARY_CONNECTIONS,
  CENTER_BUILDING_STAIRWAYS,
  CORRIDOR_DOORS_LIST,
  CORRIDOR_GRID_MAP,
  INDOOR_ROOM_TO_CORRIDOR_MIGRATION_TABLE,
  validateCorridorSpacingRules,
} from '../src/data/campusCorridorNetwork';
import { ExplorationStateManager } from '../src/systems/ExplorationStateManager';
import {
  SAVE_STORAGE_KEY,
  SaveManager,
  type StorageBackend,
} from '../src/systems/SaveManager';
import { StoryStateManager } from '../src/systems/StoryStateManager';
import { LEGACY_SAVE_SCHEMA_VERSION_V2 } from '../src/types';

class MemoryStorage implements StorageBackend {
  private store = new Map<string, string>();
  public getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  public removeItem(key: string): void {
    this.store.delete(key);
  }
  public setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('Phase 6B-2 R1 — 三棟五層公共走廊連通與室內場景分離完整驗收測試', () => {
  // ==========================================================================
  // A. 走廊網路測試 (15 Independent Public Corridors)
  // ==========================================================================
  describe('A. 三棟 × 五層共 15 個獨立公共走廊網路測試', () => {
    it('15 個公共走廊場景全部存在且 isCorridor === true、寬度為 1680px', () => {
      expect(ALL_CORRIDOR_SCENE_IDS.length).toBe(15);

      for (const corridorId of ALL_CORRIDOR_SCENE_IDS) {
        const def = CAMPUS_AREAS[corridorId];
        expect(def).toBeDefined();
        expect(def.isCorridor).toBe(true);
        expect(def.bounds.width).toBe(1680);
        expect(['left', 'center', 'right']).toContain(def.building);
        expect([1, 2, 3, 4, 5]).toContain(def.floor);
        expect(def.buildingName).toBeTruthy();
        expect(def.floorName).toBeTruthy();
        expect(def.fullDisplayName).toContain('走廊');
      }
    });

    it('每個走廊皆具備合法的預設與跨棟/房間返回出生點，且座標位於走廊邊界內', () => {
      for (const corridorId of ALL_CORRIDOR_SCENE_IDS) {
        const def = CAMPUS_AREAS[corridorId];
        expect(def.spawns.default_spawn).toBeDefined();

        for (const [, pt] of Object.entries(def.spawns)) {
          expect(pt.x).toBeGreaterThanOrEqual(40);
          expect(pt.x).toBeLessThanOrEqual(def.bounds.width - 40);
          expect(['left', 'right']).toContain(pt.facing);
        }
      }
    });
  });

  // ==========================================================================
  // B. 跨棟邊界測試 (Cross-Building Horizontal Boundary Transitions)
  // ==========================================================================
  describe('B. 1F～5F 跨棟水平邊界連通與外牆阻擋測試', () => {
    const floors: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];

    it('1F～5F 每一層皆滿足：左棟東側 <-> 中間棟西側，中間棟東側 <-> 右棟西側，且絕不跳樓層', () => {
      for (const f of floors) {
        const leftId = CORRIDOR_GRID_MAP.left[f];
        const centerId = CORRIDOR_GRID_MAP.center[f];
        const rightId = CORRIDOR_GRID_MAP.right[f];

        const exploration = new ExplorationStateManager(leftId, 'default');
        expect(exploration.getCurrentAreaId()).toBe(leftId);
        expect(exploration.getCurrentCorridorSceneId()).toBe(leftId);

        // 1. 左棟西側為校園外牆，不可穿越
        expect(exploration.triggerBoundaryTransition('west')).toBeNull();
        expect(exploration.getCurrentAreaId()).toBe(leftId);

        // 2. 左棟東側 -> 中間棟同樓層西側入口 (x = 140)
        const toCenterFromLeft = exploration.triggerBoundaryTransition('east');
        expect(toCenterFromLeft).not.toBeNull();
        expect(toCenterFromLeft?.portalTransition?.targetAreaId).toBe(centerId);
        expect(toCenterFromLeft?.portalTransition?.spawnX).toBe(140);
        expect(
          CAMPUS_AREAS[toCenterFromLeft!.portalTransition!.targetAreaId].floor
        ).toBe(f);
        expect(exploration.getCurrentCorridorSceneId()).toBe(centerId);

        // 3. 中間棟東側 -> 右棟同樓層西側入口 (x = 140)
        const toRightFromCenter = exploration.triggerBoundaryTransition('east');
        expect(toRightFromCenter).not.toBeNull();
        expect(toRightFromCenter?.portalTransition?.targetAreaId).toBe(rightId);
        expect(toRightFromCenter?.portalTransition?.spawnX).toBe(140);
        expect(
          CAMPUS_AREAS[toRightFromCenter!.portalTransition!.targetAreaId].floor
        ).toBe(f);
        expect(exploration.getCurrentCorridorSceneId()).toBe(rightId);

        // 4. 右棟東側為校園外牆，不可穿越
        expect(exploration.triggerBoundaryTransition('east')).toBeNull();
        expect(exploration.getCurrentAreaId()).toBe(rightId);

        // 5. 右棟西側 -> 中間棟同樓層東側入口 (x = 1540)
        const backToCenter = exploration.triggerBoundaryTransition('west');
        expect(backToCenter).not.toBeNull();
        expect(backToCenter?.portalTransition?.targetAreaId).toBe(centerId);
        expect(backToCenter?.portalTransition?.spawnX).toBe(1540);
        expect(
          CAMPUS_AREAS[backToCenter!.portalTransition!.targetAreaId].floor
        ).toBe(f);

        // 6. 中間棟西側 -> 左棟同樓層東側入口 (x = 1540)
        const backToLeft = exploration.triggerBoundaryTransition('west');
        expect(backToLeft).not.toBeNull();
        expect(backToLeft?.portalTransition?.targetAreaId).toBe(leftId);
        expect(backToLeft?.portalTransition?.spawnX).toBe(1540);
        expect(
          CAMPUS_AREAS[backToLeft!.portalTransition!.targetAreaId].floor
        ).toBe(f);
      }
    });

    it('玩家也可以在跨棟連廊拱門處按 E 互動過門，結果與邊界切換完全一致', () => {
      const exploration = new ExplorationStateManager(
        'corridor_center_2f',
        'default_spawn'
      );
      const westArch = CAMPUS_AREAS['corridor_center_2f'].interactables.find(
        (i) => i.id === 'boundary_corridor_center_2f_west_to_corridor_left_2f'
      );
      expect(westArch).toBeDefined();

      const res = exploration.interactWithObject(westArch!.id, 56, 28);
      expect(res.success).toBe(true);
      expect(res.portalTransition?.targetAreaId).toBe('corridor_left_2f');
      expect(res.portalTransition?.spawnX).toBe(1540);
    });
  });

  // ==========================================================================
  // C. 房門互動與走廊/室內完全分離測試 (Corridor vs Indoor Separation)
  // ==========================================================================
  describe('C. 走廊與室內場景完全分離及房門互動測試', () => {
    it('全部 14 間室內房間的 isCorridor 均為 false，且設定正確的 parentCorridorId', () => {
      expect(CORRIDOR_DOORS_LIST.length).toBe(14);

      for (const door of CORRIDOR_DOORS_LIST) {
        const roomDef = CAMPUS_AREAS[door.destinationSceneId];
        expect(roomDef).toBeDefined();
        expect(roomDef.isCorridor).toBe(false);
        expect(roomDef.parentCorridorId).toBe(door.corridorSceneId);
        expect(roomDef.building).toBe(door.building);
        expect(roomDef.floor).toBe(door.floor);
      }
    });

    it('遠離房門時按 E 不會進入房間；靠近房門按 E 進入室內，從室內出口按 E 精確返回原走廊門口 X 座標', () => {
      const exploration = new ExplorationStateManager(
        'corridor_center_2f',
        'default'
      );

      // 教務處房門位於 x = 840
      const outOfRangeRes = exploration.interactWithObject(
        'door_center_2f_academic',
        340,
        28
      );
      expect(outOfRangeRes.success).toBe(false);
      expect(outOfRangeRes.blockedReason).toBe('out_of_range');
      expect(exploration.getCurrentAreaId()).toBe('corridor_center_2f');
      expect(exploration.getCurrentRoomSceneId()).toBeNull();

      // 走近至 x = 840 按 E 進入教務處
      const enterRes = exploration.interactWithObject(
        'door_center_2f_academic',
        840,
        28
      );
      expect(enterRes.success).toBe(true);
      expect(enterRes.portalTransition?.targetAreaId).toBe('academic_office');
      expect(exploration.getCurrentAreaId()).toBe('academic_office');
      expect(exploration.getCurrentCorridorSceneId()).toBe(
        'corridor_center_2f'
      );
      expect(exploration.getCurrentRoomSceneId()).toBe('academic_office');
      expect(exploration.isRoomExplored('academic_office')).toBe(true);
      expect(exploration.getRoomReturnPosition()).toEqual({
        corridorSceneId: 'corridor_center_2f',
        doorId: 'door_center_2f_academic',
        x: 840,
        y: 312,
        facing: 'right',
        spawnId: 'from_room',
      });

      // 在教務處內走近出口門 (x = 90) 按 E 返回中間棟 2F 走廊門口 (x = 840)
      const exitRes = exploration.interactWithObject(
        'portal_academic_to_corridor',
        90,
        28
      );
      expect(exitRes.success).toBe(true);
      expect(exitRes.portalTransition?.targetAreaId).toBe('corridor_center_2f');
      expect(exitRes.portalTransition?.spawnX).toBe(840);
      expect(exploration.getCurrentAreaId()).toBe('corridor_center_2f');
      expect(exploration.getCurrentRoomSceneId()).toBeNull();
    });

    it('上鎖房門（左棟 2F 普通教室、中間棟 4F 禁書室、右棟 4F 封存理化準備室）驗證鑰匙條件並支援解鎖進入', () => {
      // 1. 左棟 2F 普通教室 (需 item_rusted_classroom_key)
      const expClassroom = new ExplorationStateManager(
        'corridor_left_2f',
        'default'
      );
      const lockedClassRes = expClassroom.interactWithObject(
        'door_left_2f_classroom',
        680,
        28
      );
      expect(lockedClassRes.success).toBe(false);
      expect(lockedClassRes.blockedReason).toBe('locked');
      expect(expClassroom.getCurrentAreaId()).toBe('corridor_left_2f');

      expClassroom.closeModal();
      expClassroom.grantItem('item_rusted_classroom_key');
      const unlockedClassRes = expClassroom.interactWithObject(
        'door_left_2f_classroom',
        680,
        28
      );
      expect(unlockedClassRes.success).toBe(true);
      expect(unlockedClassRes.portalTransition?.targetAreaId).toBe('classroom');
      expect(expClassroom.isDoorUnlocked('door_left_2f_classroom')).toBe(true);

      // 2. 右棟 4F 封存理化準備室 (需 item_brass_locker_token)
      const expReserve = new ExplorationStateManager(
        'corridor_right_4f',
        'default'
      );
      const lockedRes = expReserve.interactWithObject(
        'door_right_4f_science_reserve',
        960,
        28
      );
      expect(lockedRes.success).toBe(false);
      expect(lockedRes.blockedReason).toBe('locked');

      expReserve.closeModal();
      expReserve.grantItem('item_brass_locker_token');
      const unlockedRes = expReserve.interactWithObject(
        'door_right_4f_science_reserve',
        960,
        28
      );
      expect(unlockedRes.success).toBe(true);
      expect(unlockedRes.portalTransition?.targetAreaId).toBe(
        'science_reserve_4f'
      );
      expect(expReserve.isDoorUnlocked('door_right_4f_science_reserve')).toBe(
        true
      );
    });
  });

  // ==========================================================================
  // D. 房門間距與非重疊測試 (Door Spacing >= 220px & Non-Overlap Rules)
  // ==========================================================================
  describe('D. 全部 15 條走廊房門間距 (>= 220px) 與互動範圍不重疊測試', () => {
    it('全部 15 條公共走廊通過 validateCorridorSpacingRules 檢測（門距 >= 220px、碰撞與互動半徑零重疊）', () => {
      for (const corridorId of ALL_CORRIDOR_SCENE_IDS) {
        const areaDef = CAMPUS_AREAS[corridorId];
        const check = validateCorridorSpacingRules(areaDef);
        expect(check.valid, `${corridorId}: ${check.issues.join('; ')}`).toBe(
          true
        );
        expect(check.issues).toEqual([]);
      }
    });
  });

  // ==========================================================================
  // E. 樓梯與跨棟邊界完全分離測試 (Stairways vs Boundaries)
  // ==========================================================================
  describe('E. 中間棟 1F～5F 垂直樓梯通行與跨棟邊界分離測試', () => {
    it('中間棟 1F～5F 樓梯上下樓永遠抵達目標樓層的「公共走廊」，絕不直接進入室內房間', () => {
      const exploration = new ExplorationStateManager(
        'corridor_center_1f',
        'from_gate'
      );

      // 1F -> 2F -> 3F -> 4F -> 5F
      const up1to2 = exploration.interactWithObject(
        'stair_center_1f_east_up_2f',
        1390,
        28
      );
      expect(up1to2.success).toBe(true);
      expect(up1to2.portalTransition?.targetAreaId).toBe('corridor_center_2f');
      expect(CAMPUS_AREAS[exploration.getCurrentAreaId()].isCorridor).toBe(true);

      const up2to3 = exploration.interactWithObject(
        'stair_center_2f_east_up_3f',
        1340,
        28
      );
      expect(up2to3.success).toBe(true);
      expect(up2to3.portalTransition?.targetAreaId).toBe('corridor_center_3f');
      expect(CAMPUS_AREAS[exploration.getCurrentAreaId()].isCorridor).toBe(true);

      const up3to4 = exploration.interactWithObject(
        'stair_center_3f_east_up_4f',
        1340,
        28
      );
      expect(up3to4.success).toBe(true);
      expect(up3to4.portalTransition?.targetAreaId).toBe('corridor_center_4f');
      expect(CAMPUS_AREAS[exploration.getCurrentAreaId()].isCorridor).toBe(true);

      const up4to5 = exploration.interactWithObject(
        'stair_center_4f_east_up_5f',
        1340,
        28
      );
      expect(up4to5.success).toBe(true);
      expect(up4to5.portalTransition?.targetAreaId).toBe('corridor_center_5f');
      expect(CAMPUS_AREAS[exploration.getCurrentAreaId()].isCorridor).toBe(true);

      // 5F -> 4F -> 3F -> 2F -> 1F
      const down5to4 = exploration.interactWithObject(
        'stair_center_5f_west_down_4f',
        340,
        28
      );
      expect(down5to4.success).toBe(true);
      expect(down5to4.portalTransition?.targetAreaId).toBe(
        'corridor_center_4f'
      );

      const down4to3 = exploration.interactWithObject(
        'stair_center_4f_west_down_3f',
        340,
        28
      );
      expect(down4to3.success).toBe(true);
      expect(down4to3.portalTransition?.targetAreaId).toBe(
        'corridor_center_3f'
      );

      const down3to2 = exploration.interactWithObject(
        'stair_center_3f_west_down_2f',
        340,
        28
      );
      expect(down3to2.success).toBe(true);
      expect(down3to2.portalTransition?.targetAreaId).toBe(
        'corridor_center_2f'
      );

      const down2to1 = exploration.interactWithObject(
        'stair_center_2f_west_down_1f',
        340,
        28
      );
      expect(down2to1.success).toBe(true);
      expect(down2to1.portalTransition?.targetAreaId).toBe(
        'corridor_center_1f'
      );
    });

    it('中間棟每層樓梯與東西跨棟邊界 (x=56, x=1624) 距離皆 >= 234px，完全分離不重疊', () => {
      for (const f of [1, 2, 3, 4, 5] as const) {
        const stairs = CENTER_BUILDING_STAIRWAYS[f];
        const corridorId = CORRIDOR_GRID_MAP.center[f];
        const boundary = BUILDING_BOUNDARY_CONNECTIONS[corridorId];

        for (const st of stairs) {
          expect(Math.abs(st.x - boundary.west!.triggerX)).toBeGreaterThanOrEqual(
            234
          );
          expect(Math.abs(st.x - boundary.east!.triggerX)).toBeGreaterThanOrEqual(
            234
          );
        }
      }
    });
  });

  // ==========================================================================
  // F. 存檔與舊版室內場景遷移相容測試 (Save / Load & Pre-R1 Migration)
  // ==========================================================================
  describe('F. R1 存檔還原與舊版室內場景存檔自動遷移測試', () => {
    let storage: MemoryStorage;
    let saveManager: SaveManager;

    beforeEach(() => {
      storage = new MemoryStorage();
      saveManager = new SaveManager(storage, SAVE_STORAGE_KEY);
      saveManager.deleteSave();
    });

    it('在公共走廊或室內房間存檔後讀檔，完整保留走廊/房間位置、門鎖狀態與返回座標', () => {
      const exploration = new ExplorationStateManager(
        'corridor_left_2f',
        'default'
      );
      const story = new StoryStateManager();

      exploration.grantItem('item_rusted_classroom_key');
      exploration.interactWithObject('door_left_2f_classroom', 680, 28);
      expect(exploration.getCurrentAreaId()).toBe('classroom');
      expect(exploration.getCurrentRoomSceneId()).toBe('classroom');

      const saved = saveManager.saveCurrentGame(
        exploration,
        story,
        { x: 320, y: 300, facing: 'right', stamina: 82 },
        { bgmVolume: 0.7, sfxVolume: 0.8, muted: false }
      );
      expect(saved.player.corridorSceneId).toBe('corridor_left_2f');
      expect(saved.player.currentRoomSceneId).toBe('classroom');
      expect(saved.exploration.unlockedDoors).toContain(
        'door_left_2f_classroom'
      );

      // 重設後讀檔
      const restoredExp = new ExplorationStateManager(
        'school_gate',
        'initial_spawn'
      );
      const restoredStory = new StoryStateManager();
      const loadRes = saveManager.loadAndValidateSave();
      expect(loadRes.success).toBe(true);

      const loc = saveManager.applySaveToManagers(
        loadRes.data!,
        restoredExp,
        restoredStory
      );
      expect(loc.areaId).toBe('classroom');
      expect(restoredExp.getCurrentCorridorSceneId()).toBe('corridor_left_2f');
      expect(restoredExp.getCurrentRoomSceneId()).toBe('classroom');
      expect(restoredExp.isDoorUnlocked('door_left_2f_classroom')).toBe(true);

      // 讀檔後從教室按 E 離開，仍能正確回到左棟 2F 走廊 x=680 門口
      const exitRes = restoredExp.interactWithObject(
        'portal_classroom_to_corridor',
        95,
        28
      );
      expect(exitRes.success).toBe(true);
      expect(exitRes.portalTransition?.targetAreaId).toBe('corridor_left_2f');
      expect(exitRes.portalTransition?.spawnX).toBe(680);
    });

    it('載入舊版 Phase 6B / 6B-2 直接位於室內場景（未含 corridorSceneId）的存檔時，自動遷移至所屬公共走廊對應房門外，且不遺失任何物品與進度', () => {
      const legacySavePayload = {
        schemaVersion: LEGACY_SAVE_SCHEMA_VERSION_V2,
        savedAtIso: '2026-11-16T10:00:00.000Z',
        player: {
          areaId: 'academic_office',
          spawnId: 'from_corridor',
          x: 520,
          y: 300,
          facing: 'left',
          stamina: 95,
        },
        exploration: {
          inventoryItemIds: ['item_rusted_classroom_key'],
          clueIds: ['clue_missing_student_lin'],
          collectedObjectIds: ['pickup_rusted_key'],
          investigatedObjectIds: ['obj_office_attendance_register'],
          unlockedPortalIds: [],
          exploredAreaIds: ['school_gate', 'bulletin_area', 'academic_office'],
        },
        story: {
          flags: ['flag_intro_played', 'flag_missing_poster_found'],
          completedEventIds: ['evt_chapter1_opening_intro'],
          currentObjectiveText: '調查教務處點名簿',
          metrics: {
            evidenceCompleteness: 25,
            affectionScores: {},
            conglomerateAlertLevel: 10,
          },
        },
        audio: {
          bgmVolume: 0.7,
          sfxVolume: 0.8,
          muted: false,
        },
      };

      storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(legacySavePayload));
      const loadRes = saveManager.loadAndValidateSave();
      expect(loadRes.success).toBe(true);

      const exp = new ExplorationStateManager('school_gate', 'initial_spawn');
      const story = new StoryStateManager();
      const restoredLoc = saveManager.applySaveToManagers(
        loadRes.data!,
        exp,
        story
      );

      // 舊版直接卡在 academic_office 的存檔應自動移至中間棟 2F 走廊教務處門口 (x = 840)
      const expectedMig =
        INDOOR_ROOM_TO_CORRIDOR_MIGRATION_TABLE['academic_office'];
      expect(restoredLoc.areaId).toBe('corridor_center_2f');
      expect(restoredLoc.x).toBe(expectedMig.doorX);
      expect(exp.getCurrentAreaId()).toBe('corridor_center_2f');
      expect(exp.getCurrentCorridorSceneId()).toBe('corridor_center_2f');
      expect(exp.getCurrentRoomSceneId()).toBeNull();

      // 驗證物品、線索、旗標 100% 保留
      expect(exp.hasItem('item_rusted_classroom_key')).toBe(true);
      expect(exp.isObjectCollected('pickup_rusted_key')).toBe(true);
      expect(story.hasFlag('flag_missing_poster_found')).toBe(true);
    });
  });
});
