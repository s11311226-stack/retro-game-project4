import { beforeEach, describe, expect, it } from 'vitest';
import { CharacterRelationshipSystem } from '../src/systems/CharacterRelationshipSystem';
import { EvidenceSystem } from '../src/systems/EvidenceSystem';
import { ExplorationStateManager } from '../src/systems/ExplorationStateManager';
import { GlobalGameState } from '../src/systems/GlobalGameState';
import { QuestSystem } from '../src/systems/QuestSystem';
import {
  SAVE_STORAGE_KEY,
  SaveManager,
  type StorageBackend,
} from '../src/systems/SaveManager';
import { StoryStateManager } from '../src/systems/StoryStateManager';
import {
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

describe('Phase 6A (E) — SaveManager 相容擴充與 V2 -> V3 遷移單元測試', () => {
  let storage: MemoryStorage;
  let saveManager: SaveManager;

  beforeEach(() => {
    storage = new MemoryStorage();
    saveManager = new SaveManager(storage, SAVE_STORAGE_KEY);
  });

  it('1. 應完整儲存與還原 GlobalGameState、CharacterRelationshipSystem、EvidenceSystem 與 QuestSystem', () => {
    const exploration = new ExplorationStateManager('classroom', 'from_corridor');
    const story = new StoryStateManager();
    const globalState = new GlobalGameState();
    const relationships = new CharacterRelationshipSystem(globalState);
    const evidence = new EvidenceSystem(globalState);
    const quests = new QuestSystem(globalState, relationships, evidence);

    // 推進證據、角色關係與任務狀態
    evidence.collectEvidence('clue_missing_student_poster');
    evidence.collectEvidence('clue_mysterious_school_file');
    evidence.analyzeEvidence('clue_mysterious_school_file');

    relationships.applyRelationshipEvent({
      eventId: 'evt_test_pinyan_trust',
      characterId: 'chen_pinyan',
      affinityDelta: 25,
      trustDelta: 30,
    });

    quests.completeQuest('quest_main_ch1_desk29');
    globalState.setVariable(
      'corporateAlert',
      42,
      'story_director',
      'Test save alert'
    );

    const savedPayload = saveManager.saveCurrentGame(
      exploration,
      story,
      { x: 420, y: 312, facing: 'right' },
      { bgmVolume: 0.5, sfxVolume: 0.7, muted: false },
      {
        globalState,
        relationships,
        evidence,
        quests,
      }
    );

    expect(savedPayload.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(savedPayload.phase6a).toBeDefined();

    // 建立全新實例測試還原
    const freshExploration = new ExplorationStateManager('school_gate', 'initial_spawn');
    const freshStory = new StoryStateManager();
    const freshGlobalState = new GlobalGameState();
    const freshRelationships = new CharacterRelationshipSystem(freshGlobalState);
    const freshEvidence = new EvidenceSystem(freshGlobalState);
    const freshQuests = new QuestSystem(
      freshGlobalState,
      freshRelationships,
      freshEvidence
    );

    const loadRes = saveManager.loadAndValidateSave();
    expect(loadRes.success).toBe(true);
    expect(loadRes.migratedFromLegacy).toBe(false);

    saveManager.applySaveToManagers(
      loadRes.data!,
      freshExploration,
      freshStory,
      {
        globalState: freshGlobalState,
        relationships: freshRelationships,
        evidence: freshEvidence,
        quests: freshQuests,
      }
    );

    expect(freshGlobalState.getValue('corporateAlert')).toBe(42);
    expect(freshEvidence.hasEvidence('clue_mysterious_school_file')).toBe(true);
    expect(freshEvidence.isEvidenceAnalyzed('clue_mysterious_school_file')).toBe(
      true
    );
    expect(freshRelationships.getCharacterState('chen_pinyan').affinity).toBe(
      relationships.getCharacterState('chen_pinyan').affinity
    );
    expect(freshQuests.getQuestState('quest_main_ch1_desk29')?.status).toBe(
      'completed'
    );
  });

  it('2. 應無縫相容既有 Demo V2 存檔 (schemaVersion: 2)，自動升級至 V3 並將舊有線索同步至 EvidenceSystem', () => {
    const legacyV2Save = {
      schemaVersion: LEGACY_SAVE_SCHEMA_VERSION_V2,
      savedAtIso: '2026-11-07T10:00:00.000Z',
      player: {
        areaId: 'classroom',
        spawnId: 'from_corridor',
        x: 500,
        y: 312,
        facing: 'left',
      },
      exploration: {
        collectedObjectIds: ['pickup_rusted_classroom_key'],
        inventoryItemIds: ['item_rusted_classroom_key'],
        clueIds: ['clue_admission_notice', 'clue_missing_student_poster'],
        unlockedPortalIds: ['portal_corridor_to_classroom'],
      },
      story: {
        flags: [
          'flag_intro_played',
          'flag_admission_notice_read',
          'flag_missing_poster_found',
          'flag_classroom_key_obtained',
        ],
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
    expect(loadRes.migratedFromVersion).toBe(LEGACY_SAVE_SCHEMA_VERSION_V2);
    expect(loadRes.data?.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(loadRes.data?.phase6a).toBeDefined();

    const freshExploration = new ExplorationStateManager('school_gate', 'initial_spawn');
    const freshStory = new StoryStateManager();
    const freshGlobalState = new GlobalGameState();
    const freshRelationships = new CharacterRelationshipSystem(freshGlobalState);
    const freshEvidence = new EvidenceSystem(freshGlobalState);
    const freshQuests = new QuestSystem(
      freshGlobalState,
      freshRelationships,
      freshEvidence
    );

    saveManager.applySaveToManagers(
      loadRes.data!,
      freshExploration,
      freshStory,
      {
        globalState: freshGlobalState,
        relationships: freshRelationships,
        evidence: freshEvidence,
        quests: freshQuests,
      }
    );

    // 舊有 V2 線索與物品應自動轉換進 EvidenceSystem 並計算 evidenceCompletion
    expect(freshEvidence.hasEvidence('clue_admission_notice')).toBe(true);
    expect(freshEvidence.hasEvidence('clue_missing_student_poster')).toBe(true);
    expect(freshEvidence.hasEvidence('item_rusted_classroom_key')).toBe(true);
    expect(freshGlobalState.getValue('evidenceCompletion')).toBeGreaterThan(0);

    // 陳品妍的支線任務《暗房裡的1998》因已收集海報與鑰匙，應自動達成完成條件
    expect(
      freshQuests.getQuestState('quest_char_chen_pinyan_darkroom')?.status
    ).toBe('completed');
  });
});
