import { beforeEach, describe, expect, it } from 'vitest';
import { AudioSynthManager } from '../src/systems/AudioSynthManager';
import { ExplorationStateManager } from '../src/systems/ExplorationStateManager';
import {
  SAVE_STORAGE_KEY,
  SaveManager,
  type StorageBackend,
} from '../src/systems/SaveManager';
import { StoryStateManager } from '../src/systems/StoryStateManager';
import { SAVE_SCHEMA_VERSION } from '../src/types';

class MockStorage implements StorageBackend {
  private data = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  public removeItem(key: string): void {
    this.data.delete(key);
  }
}

describe('Phase 4 — 版本化存檔、損毀與舊版遷移檢查、音訊互動政策測試', () => {
  let mockStorage: MockStorage;
  let saveManager: SaveManager;
  let exploration: ExplorationStateManager;
  let story: StoryStateManager;

  beforeEach(() => {
    mockStorage = new MockStorage();
    saveManager = new SaveManager(mockStorage, SAVE_STORAGE_KEY);
    exploration = new ExplorationStateManager('school_gate', 'initial_spawn');
    story = new StoryStateManager();
  });

  it('1. 正常存檔與讀檔：正確儲存並還原玩家位置、已取得物品、已讀線索及劇情旗標', () => {
    // 模擬玩家進行探索：閱讀入學通知、前往公告欄拿取鑰匙並讀失蹤海報
    exploration.interactWithObject('doc_admission_notice', 310);
    story.notifyObjectInteracted('doc_admission_notice', exploration.getClues().length);
    exploration.closeModal();

    exploration.interactWithObject('portal_gate_to_bulletin', 610);
    exploration.interactWithObject('doc_missing_student_poster', 490);
    story.notifyObjectInteracted('doc_missing_student_poster', exploration.getClues().length);
    exploration.closeModal();

    exploration.interactWithObject('pickup_rusted_classroom_key', 630);
    story.notifyObjectInteracted('pickup_rusted_classroom_key', exploration.getClues().length);
    exploration.closeModal();

    // 執行存檔
    const saved = saveManager.saveCurrentGame(
      exploration,
      story,
      { x: 630, y: 312, facing: 'left' },
      { bgmVolume: 0.6, sfxVolume: 0.8, muted: false }
    );

    expect(saved.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(saveManager.hasValidSave()).toBe(true);

    // 建立全新空白的探索與劇情管理器，執行讀檔還原
    const freshExploration = new ExplorationStateManager('school_gate', 'initial_spawn');
    const freshStory = new StoryStateManager();

    const loadRes = saveManager.loadAndValidateSave();
    expect(loadRes.success).toBe(true);
    expect(loadRes.migratedFromLegacy).toBe(false);

    const restoredLoc = saveManager.applySaveToManagers(
      loadRes.data!,
      freshExploration,
      freshStory
    );

    expect(restoredLoc.areaId).toBe('bulletin_area');
    expect(restoredLoc.x).toBe(630);
    expect(restoredLoc.y).toBe(312);
    expect(restoredLoc.facing).toBe('left');

    // 已取得物品與已讀線索皆正確還原，且已拾取的鑰匙不會在公告欄重複生成
    expect(freshExploration.hasItem('item_rusted_classroom_key')).toBe(true);
    expect(freshExploration.isObjectCollected('pickup_rusted_classroom_key')).toBe(true);
    expect(
      freshExploration
        .getVisibleInteractables('bulletin_area')
        .some((o) => o.id === 'pickup_rusted_classroom_key')
    ).toBe(false);
    expect(freshExploration.hasClue('clue_admission_notice')).toBe(true);
    expect(freshExploration.hasClue('clue_missing_student_poster')).toBe(true);

    // 劇情旗標正確還原
    expect(freshStory.hasFlag('flag_admission_notice_read')).toBe(true);
    expect(freshStory.hasFlag('flag_missing_poster_found')).toBe(true);
    expect(freshStory.hasFlag('flag_classroom_key_obtained')).toBe(true);
  });

  it('2. 檢查存檔損毀、缺少必要欄位與不支援的未來版本', () => {
    // 尚無存檔
    expect(saveManager.loadAndValidateSave().reason).toBe('no_save');

    // 損毀的 JSON 字串
    mockStorage.setItem(SAVE_STORAGE_KEY, '{corrupted_json: true, ');
    const corruptedRes = saveManager.loadAndValidateSave();
    expect(corruptedRes.success).toBe(false);
    expect(corruptedRes.reason).toBe('corrupted_json');

    // 缺少 player 或 exploration 必要欄位
    mockStorage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify({ schemaVersion: SAVE_SCHEMA_VERSION, player: { areaId: 'corridor' } })
    );
    const missingFieldRes = saveManager.loadAndValidateSave();
    expect(missingFieldRes.success).toBe(false);
    expect(missingFieldRes.reason).toBe('invalid_schema');

    // 不支援的未來版本號 (例如 schemaVersion: 99)
    mockStorage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 99 })
    );
    const unsupportedVerRes = saveManager.loadAndValidateSave();
    expect(unsupportedVerRes.success).toBe(false);
    expect(unsupportedVerRes.reason).toBe('unsupported_version');
  });

  it('3. 支援舊版本 (V1) 存檔結構自動遷移至 V2，並自動修正超出邊界的異常座標', () => {
    const legacyV1Data = {
      schemaVersion: 1,
      areaId: 'corridor',
      x: 99999, // 超出走廊最大寬度 1280 的異常座標
      facing: 'right',
      items: ['item_rusted_classroom_key'],
      clues: ['clue_admission_notice'],
      flags: ['flag_intro_played', 'flag_classroom_key_obtained'],
      collectedObjectIds: ['pickup_rusted_classroom_key'],
    };

    mockStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(legacyV1Data));
    const migratedRes = saveManager.loadAndValidateSave();

    expect(migratedRes.success).toBe(true);
    expect(migratedRes.migratedFromLegacy).toBe(true);
    expect(migratedRes.data?.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(migratedRes.data?.player.areaId).toBe('corridor');
    // 驗證超出邊界的 X 座標已被安全限制在走廊右邊界內 (<= 1280 - 18)
    expect(migratedRes.data?.player.x).toBeLessThanOrEqual(1262);
    expect(migratedRes.data?.player.y).toBe(312);
    expect(migratedRes.data?.exploration.inventoryItemIds).toContain(
      'item_rusted_classroom_key'
    );
  });

  it('4. 安全性保護：拒絕將密碼、權杖 (Token) 或 API Key 等機密欄位寫入存檔', () => {
    expect(() => {
      saveManager.assertNoSecretFields({
        schemaVersion: 2,
        userPassword: '123',
      });
    }).toThrow(/Security Violation/);

    expect(() => {
      saveManager.assertNoSecretFields({
        nested: {
          authToken: 'abc-xyz',
        },
      });
    }).toThrow(/Security Violation/);
  });

  it('5. 音訊系統：首次互動前不假設可自動播放，且可調整音樂/音效音量並涵蓋所有必備音效方法', () => {
    const audio = new AudioSynthManager();

    // 瀏覽器首次互動前，isAudioUnlocked 為 false
    expect(audio.isAudioUnlocked()).toBe(false);

    // 調整 BGM 與 SFX 音量並限制在 0.0 ~ 1.0
    audio.setBgmVolume(0.8);
    audio.setSfxVolume(0.35);
    expect(audio.getSettings().bgmVolume).toBe(0.8);
    expect(audio.getSettings().sfxVolume).toBe(0.35);

    audio.adjustBgmVolume(0.5);
    expect(audio.getSettings().bgmVolume).toBe(1);
    audio.adjustSfxVolume(-0.9);
    expect(audio.getSettings().sfxVolume).toBe(0);

    // 驗證未解鎖或無頭環境下呼叫所有 7 類必備音效與循環 BGM 均安全無錯誤
    audio.startLoopingBgm();
    audio.playFootstep(1000);
    audio.playJump();
    audio.playAttack();
    audio.playBlock();
    audio.playUiClick();
    audio.playItemPickup();
    audio.playDoorOpen();
    audio.playAnomalyGlitchStinger();

    // 模擬使用者首次互動後解鎖
    audio.unlockByUserGesture();
    expect(audio.isAudioUnlocked()).toBe(true);
    audio.stopLoopingBgm();
  });
});
