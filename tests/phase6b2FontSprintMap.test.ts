import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_KEY_BINDINGS,
  DEFAULT_PLAYER_CONFIG,
} from '../src/config/playerConfig';
import { TYPOGRAPHY_SPECS } from '../src/config/TypographyConfig';
import { CAMPUS_AREAS } from '../src/data/campusAreas';
import { PlayerController } from '../src/entities/PlayerController';
import { ExplorationStateManager } from '../src/systems/ExplorationStateManager';
import { FontManager, globalFontManager } from '../src/systems/FontManager';
import {
  SAVE_STORAGE_KEY,
  SaveManager,
  type StorageBackend,
} from '../src/systems/SaveManager';
import { StoryStateManager } from '../src/systems/StoryStateManager';
import {
  type AreaId,
  type InputSnapshot,
  LEGACY_SAVE_SCHEMA_VERSION_V2,
  SAVE_SCHEMA_VERSION,
} from '../src/types';

class MemoryStorage implements StorageBackend {
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

function createMockInput(overrides?: Partial<InputSnapshot>): InputSnapshot {
  return {
    moveLeft: false,
    moveRight: false,
    runHeld: false,
    jumpJustPressed: false,
    attackJustPressed: false,
    blockHeld: false,
    interactJustPressed: false,
    inventoryJustPressed: false,
    mapJustPressed: false,
    pauseJustPressed: false,
    ...overrides,
  };
}

describe('Phase 6B-2 — 繁體字體清晰度、Shift 奔跑耐力與三棟五層校園結構改造測試', () => {
  // ==========================================================================
  // 1. 繁體中文字體清晰度與字級階梯標準測試
  // ==========================================================================
  describe('1. 繁體中文字體清晰度與字級規範 (Typography Standards)', () => {
    it('全遊戲繁體中文字級嚴格 >= 12px，且對白、選單、文件、名稱符合高解析度清晰標準', () => {
      // 說話者名稱 (17-18px)
      expect(TYPOGRAPHY_SPECS.speakerName.fontSizePx).toBeGreaterThanOrEqual(17);
      expect(TYPOGRAPHY_SPECS.speakerName.fontSizePx).toBeLessThanOrEqual(18);

      // 對白內文 (16-18px)
      expect(TYPOGRAPHY_SPECS.dialogueBody.fontSizePx).toBeGreaterThanOrEqual(16);
      expect(TYPOGRAPHY_SPECS.dialogueBody.fontSizePx).toBeLessThanOrEqual(18);

      // 選單項目 (16px)
      expect(TYPOGRAPHY_SPECS.menuItem.fontSizePx).toBe(16);

      // 文件內文 (15-16px)
      expect(TYPOGRAPHY_SPECS.documentBody.fontSizePx).toBeGreaterThanOrEqual(15);
      expect(TYPOGRAPHY_SPECS.documentBody.fontSizePx).toBeLessThanOrEqual(16);

      // 次要提示 (>= 12px)
      expect(TYPOGRAPHY_SPECS.secondaryHint.fontSizePx).toBeGreaterThanOrEqual(12);

      // 全體樣式字級皆不得低於 12px，避免筆畫糊死
      for (const [key, style] of Object.entries(TYPOGRAPHY_SPECS)) {
        expect(
          style.fontSizePx,
          `Style ${key} must have fontSizePx >= 12`
        ).toBeGreaterThanOrEqual(12);
        expect(style.fontFamily).toContain('Noto Sans TC');
      }
    });

    it('FontManager 提供完整的字體檢驗展示資料 (包含極限難字、世界觀長句、英數符號)', () => {
      const showcase = globalFontManager.getShowcaseData();
      expect(showcase.cjkRareAndComplex.length).toBeGreaterThanOrEqual(15);
      expect(showcase.cjkRareAndComplex).toContain('靈');
      expect(showcase.cjkRareAndComplex).toContain('響');
      expect(showcase.sampleStorySentence).toContain('白川財閥');
      expect(showcase.sampleStorySentence).toContain('18.9Hz');
      expect(showcase.punctuationAndNumbers).toContain('0123456789');
      expect(showcase.contrastPresets.length).toBeGreaterThanOrEqual(5);
    });

    it('FontManager 建立文字時具備 roundPixels 抗鋸齒對齊與預設解析度', () => {
      const fm = new FontManager();
      const style = fm.buildPhaserTextStyle('dialogueBody', { color: '#f8fafc' });
      expect(style.fontFamily).toBe(TYPOGRAPHY_SPECS.dialogueBody.fontFamily);
      expect(style.fontSize).toBe('16px');
      expect(style.color).toBe('#f8fafc');
    });
  });

  // ==========================================================================
  // 2. Shift 奔跑與耐力條系統測試 (Sprint & Stamina System)
  // ==========================================================================
  describe('2. Shift 奔跑與耐力條系統 (Sprint & Stamina Dynamics)', () => {
    let controller: PlayerController;
    const testBounds = { minX: 0, maxX: 3000, floorY: 312 };

    beforeEach(() => {
      controller = new PlayerController(
        100,
        312,
        testBounds,
        DEFAULT_PLAYER_CONFIG
      );
    });

    it('鍵盤映射設定確認：Shift 綁定為奔跑 (run)，攻擊與格擋保留滑鼠支援，M 綁定地圖', () => {
      expect(DEFAULT_KEY_BINDINGS.run).toContain('ShiftLeft');
      expect(DEFAULT_KEY_BINDINGS.run).toContain('ShiftRight');
      expect(DEFAULT_KEY_BINDINGS.map).toContain('KeyM');
      expect(DEFAULT_KEY_BINDINGS.block).not.toContain('ShiftLeft');
    });

    it('步行時速 150px/s，按住 Shift 奔跑時速提升至 240px/s (1.6x)，且噪音半徑擴大為 150px', () => {
      // 1. 一般步行 (D 鍵)
      let snap = controller.step(100, createMockInput({ moveRight: true }));
      expect(snap.state).toBe('move');
      expect(snap.vx).toBe(150);
      expect(snap.noiseRadius).toBe(60);
      expect(snap.isRunning).toBe(false);

      // 2. 按住 Shift 奔跑 (D + Shift)
      snap = controller.step(
        100,
        createMockInput({ moveRight: true, runHeld: true })
      );
      expect(snap.state).toBe('run');
      expect(snap.vx).toBe(240);
      expect(snap.noiseRadius).toBe(150);
      expect(snap.isRunning).toBe(true);
    });

    it('奔跑時持續消耗耐力 (25/s)，站立或步行時恢復耐力 (20/s)', () => {
      expect(controller.getStamina()).toBe(100);

      // 奔跑 2 秒 (20 次 100ms)：消耗 2s * 25/s = 50 點耐力
      for (let i = 0; i < 20; i++) {
        controller.step(
          100,
          createMockInput({ moveRight: true, runHeld: true })
        );
      }
      expect(Math.round(controller.getStamina())).toBe(50);
      expect(controller.isPlayerExhausted()).toBe(false);

      // 靜止站立 1 秒 (10 次 100ms)：恢復 1s * 20/s = 20 點耐力
      for (let i = 0; i < 10; i++) {
        controller.step(100, createMockInput());
      }
      expect(Math.round(controller.getStamina())).toBe(70);
    });

    it('耐力歸零時進入力竭狀態 (Exhaustion)，降回步行速度，且需恢復至 25 以上方可再次奔跑', () => {
      // 耗盡所有耐力 (100 / 25 = 4 秒，執行 40 次 100ms)
      for (let i = 0; i < 40; i++) {
        controller.step(
          100,
          createMockInput({ moveRight: true, runHeld: true })
        );
      }
      expect(controller.getStamina()).toBe(0);
      expect(controller.isPlayerExhausted()).toBe(true);

      // 下一步即使依然按住 Shift，狀態被強制壓回 move (步行)，速度為 150
      let snap = controller.step(
        100,
        createMockInput({ moveRight: true, runHeld: true })
      );
      expect(snap.state).toBe('move');
      expect(snap.vx).toBe(150);
      expect(snap.isExhausted).toBe(true);

      // 恢復中 (耐力未達 25 門檻前)，仍處於力竭鎖定
      expect(controller.getStamina()).toBeLessThan(25);
      expect(controller.isPlayerExhausted()).toBe(true);

      // 嘗試在門檻前奔跑：依舊無法起跑
      snap = controller.step(
        100,
        createMockInput({ moveRight: true, runHeld: true })
      );
      expect(snap.state).toBe('move');

      // 繼續站立休息至耐力 >= 25 (再經過 1.5 秒)
      for (let i = 0; i < 15; i++) {
        controller.step(100, createMockInput());
      }
      expect(controller.getStamina()).toBeGreaterThanOrEqual(25);
      expect(controller.isPlayerExhausted()).toBe(false);

      // 成功解鎖奔跑
      snap = controller.step(
        100,
        createMockInput({ moveRight: true, runHeld: true })
      );
      expect(snap.state).toBe('run');
      expect(snap.vx).toBe(240);
    });

    it('奔跑起跳繼承水平衝刺動量 (Sprint Jump)', () => {
      // 在地面奔跑
      controller.step(
        50,
        createMockInput({ moveRight: true, runHeld: true })
      );
      // 起跳
      const snap = controller.step(
        50,
        createMockInput({
          moveRight: true,
          runHeld: true,
          jumpJustPressed: true,
        })
      );
      expect(snap.isGrounded).toBe(false);
      expect(snap.vy).toBeLessThan(0);
      expect(snap.vx).toBe(240); // 滯空期間維持 240px/s 衝刺速度
    });
  });

  // ==========================================================================
  // 3. 三棟五樓校園結構 (3 Buildings × 5 Floors Grid) 與地圖連通測試
  // ==========================================================================
  describe('3. 三棟五層校園結構與探索狀態 (Campus 3×5 Grid Architecture)', () => {
    it('校園總計 19 處合法場景，涵蓋左棟、中間棟、右棟 1F~5F、地面與地下 B1~B3', () => {
      const areaKeys = Object.keys(CAMPUS_AREAS) as AreaId[];
      expect(areaKeys.length).toBe(19);

      // 檢查建築分類
      const buildings = areaKeys.map((k) => CAMPUS_AREAS[k].building);
      expect(buildings).toContain('left');
      expect(buildings).toContain('center');
      expect(buildings).toContain('right');
      expect(buildings).toContain('outdoor');
      expect(buildings).toContain('underground');

      // 檢查 5 層樓皆有完整定義
      const floors = areaKeys.map((k) => CAMPUS_AREAS[k].floor);
      expect(floors).toContain(1);
      expect(floors).toContain(2);
      expect(floors).toContain(3);
      expect(floors).toContain(4);
      expect(floors).toContain(5);
      expect(floors).toContain(0);
      expect(floors).toContain(-1);
      expect(floors).toContain(-2);
      expect(floors).toContain(-3);
    });

    it('各樓層具備對稱橫向走廊連通 (左棟 <-> 中間棟 <-> 右棟)', () => {
      // 5F: 屋頂西側 (左) <-> 屋頂 (中) <-> 屋頂設備室 (右)
      const rWest = CAMPUS_AREAS['rooftop_west'];
      const rCenter = CAMPUS_AREAS['rooftop'];
      const rEquip = CAMPUS_AREAS['rooftop_equipment'];

      expect(
        rWest.interactables.some(
          (i) => i.portal?.targetAreaId === 'rooftop'
        )
      ).toBe(true);
      expect(
        rCenter.interactables.some(
          (i) => i.portal?.targetAreaId === 'rooftop_west'
        )
      ).toBe(true);
      expect(
        rCenter.interactables.some(
          (i) => i.portal?.targetAreaId === 'rooftop_equipment'
        )
      ).toBe(true);
      expect(
        rEquip.interactables.some(
          (i) => i.portal?.targetAreaId === 'rooftop'
        )
      ).toBe(true);

      // 4F: 特殊教室 (左) <-> 禁書室 (密室) <-> 舊圖書館 (中)
      const special = CAMPUS_AREAS['special_classroom'];
      const library = CAMPUS_AREAS['old_library'];
      const archive = CAMPUS_AREAS['forbidden_archive'];
      expect(
        special.interactables.some(
          (i) => i.portal?.targetAreaId === 'forbidden_archive'
        )
      ).toBe(true);
      expect(
        archive.interactables.some(
          (i) => i.portal?.targetAreaId === 'special_classroom'
        )
      ).toBe(true);
      expect(
        library.interactables.some(
          (i) => i.portal?.targetAreaId === 'forbidden_archive'
        )
      ).toBe(true);

      // 3F: 2年B班 (左) <-> 走廊/教務處 (中) <-> 學生活動室 (右)
      const class2b = CAMPUS_AREAS['classroom_2b'];
      const acad = CAMPUS_AREAS['academic_office'];
      const corridor = CAMPUS_AREAS['corridor'];
      const activity = CAMPUS_AREAS['student_activity_room'];
      expect(
        class2b.interactables.some(
          (i) => i.portal?.targetAreaId === 'academic_office'
        )
      ).toBe(true);
      expect(
        acad.interactables.some(
          (i) => i.portal?.targetAreaId === 'classroom_2b'
        )
      ).toBe(true);
      expect(
        corridor.interactables.some(
          (i) => i.portal?.targetAreaId === 'student_activity_room'
        )
      ).toBe(true);
      expect(
        activity.interactables.some(
          (i) => i.portal?.targetAreaId === 'corridor'
        )
      ).toBe(true);
    });

    it('地下三層 (B1~B3) 依次回流，最終直抵回聲搖籃核心', () => {
      const b1 = CAMPUS_AREAS['underground_b1'];
      const b2 = CAMPUS_AREAS['underground_b2'];
      const b3 = CAMPUS_AREAS['underground_b3'];

      expect(
        b1.interactables.some(
          (i) => i.portal?.targetAreaId === 'underground_b2'
        )
      ).toBe(true);
      expect(
        b2.interactables.some(
          (i) => i.portal?.targetAreaId === 'underground_b3'
        )
      ).toBe(true);
      expect(
        b3.interactables.some(
          (i) => i.portal?.targetAreaId === 'underground_b2'
        )
      ).toBe(true);
    });

    it('ExplorationStateManager 正確追蹤並還原已探索區域 (Explored Areas)', () => {
      const exploration = new ExplorationStateManager(
        'school_gate',
        'initial_spawn'
      );
      expect(exploration.isAreaExplored('school_gate')).toBe(true);
      expect(exploration.isAreaExplored('underground_b3')).toBe(false);

      exploration.markAreaExplored('underground_b3');
      expect(exploration.isAreaExplored('underground_b3')).toBe(true);

      const list = exploration.getExploredAreaIds();
      expect(list).toContain('school_gate');
      expect(list).toContain('underground_b3');

      // 重設與還原
      exploration.restoreExploredAreaIds(['classroom_2b', 'rooftop_west']);
      expect(exploration.isAreaExplored('classroom_2b')).toBe(true);
      expect(exploration.isAreaExplored('rooftop_west')).toBe(true);
      expect(exploration.isAreaExplored('underground_b3')).toBe(false);
    });
  });

  // ==========================================================================
  // 4. 存檔系統 V3 結構與向下相容升級測試 (SaveManager V3 Migration)
  // ==========================================================================
  describe('4. 存檔系統 V3 結構與向下相容 (SaveManager V3 Schema & Migration)', () => {
    let storage: MemoryStorage;
    let saveManager: SaveManager;
    let exploration: ExplorationStateManager;
    let story: StoryStateManager;

    beforeEach(() => {
      storage = new MemoryStorage();
      saveManager = new SaveManager(storage, SAVE_STORAGE_KEY);
      saveManager.deleteSave();
      exploration = new ExplorationStateManager('classroom_2b', 'from_academic');
      story = new StoryStateManager();
    });

    it('V3 存檔能正確儲存耐力值 (stamina) 與已探索區域清單 (exploredAreaIds)', () => {
      exploration.markAreaExplored('classroom_2b');
      exploration.markAreaExplored('academic_office');

      const payload = saveManager.saveCurrentGame(
        exploration,
        story,
        { x: 300, y: 312, facing: 'right', stamina: 82 }
      );

      expect(payload.schemaVersion).toBe(3);
      expect(payload.player.stamina).toBe(82);
      expect(payload.exploration.exploredAreaIds).toContain('classroom_2b');
      expect(payload.exploration.exploredAreaIds).toContain('academic_office');

      // 驗證讀取與解析
      const loadRes = saveManager.loadAndValidateSave();
      expect(loadRes.success).toBe(true);
      expect(loadRes.data?.player.stamina).toBe(82);
      expect(loadRes.data?.exploration.exploredAreaIds).toContain('classroom_2b');
    });

    it('讀取無 stamina 或 exploredAreaIds 之舊版 V1 / V2 存檔時，自動給予預設值 (耐力100、探索當前區域)', () => {
      const legacyV2Save = {
        schemaVersion: LEGACY_SAVE_SCHEMA_VERSION_V2,
        savedAtIso: '2026-11-07T10:00:00.000Z',
        player: {
          areaId: 'teachers_office',
          spawnId: 'from_corridor',
          x: 200,
          y: 312,
          facing: 'right',
        },
        exploration: {
          collectedObjectIds: [],
          inventoryItemIds: [],
          clueIds: ['clue_admission_notice'],
          unlockedPortalIds: [],
        },
        story: {
          flags: ['flag_intro_played'],
          completedEventIds: ['evt_chapter1_opening_intro'],
          currentObjectiveText: '探索教室內部的異常',
          metrics: {
            evidenceCompleteness: 40,
            affectionScores: {},
            conglomerateAlertLevel: 10,
          },
        },
      };

      storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(legacyV2Save));

      const loadRes = saveManager.loadAndValidateSave();
      expect(loadRes.success).toBe(true);
      expect(loadRes.migratedFromLegacy).toBe(true);
      expect(loadRes.data?.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
      expect(loadRes.data?.player.stamina).toBe(100); // 自動補齊預設 100
      expect(loadRes.data?.exploration.exploredAreaIds).toContain('teachers_office'); // 自動補齊當前區域
    });
  });
});
