import { beforeEach, describe, expect, it } from 'vitest';
import { CharacterRelationshipSystem } from '../src/systems/CharacterRelationshipSystem';
import { EvidenceSystem } from '../src/systems/EvidenceSystem';
import { GlobalGameState } from '../src/systems/GlobalGameState';
import { QuestSystem } from '../src/systems/QuestSystem';

describe('Phase 6A (D) — 任務系統 (QuestSystem) 單元測試', () => {
  let gameState: GlobalGameState;
  let relSystem: CharacterRelationshipSystem;
  let evidenceSystem: EvidenceSystem;
  let questSystem: QuestSystem;

  beforeEach(() => {
    gameState = new GlobalGameState();
    relSystem = new CharacterRelationshipSystem(gameState);
    evidenceSystem = new EvidenceSystem(gameState);
    questSystem = new QuestSystem(gameState, relSystem, evidenceSystem);
  });

  it('1. 應支援主線、支線與角色專屬任務分類查詢，且初始啟動第一章主線任務', () => {
    const mainQuests = questSystem.getQuestsByCategory('main');
    const charQuests = questSystem.getQuestsByCategory('character');
    const sideQuests = questSystem.getQuestsByCategory('side');

    expect(mainQuests.length).toBeGreaterThanOrEqual(4);
    expect(charQuests.length).toBeGreaterThanOrEqual(4);
    expect(sideQuests.length).toBeGreaterThanOrEqual(1);

    const ch1State = questSystem.getQuestState('quest_main_ch1_desk29');
    expect(ch1State?.status).toBe('active');

    // 第二章主線因前置條件（需完成第一章）未滿足，初始應為 locked
    const ch2State = questSystem.getQuestState('quest_main_ch2_doctored_history');
    expect(ch2State?.status).toBe('locked');
    expect(questSystem.canStartQuest('quest_main_ch2_doctored_history')).toBe(false);
  });

  it('2. 應檢查完成條件（證據與關係條件）、發放獎勵並自動解鎖後續主線任務', () => {
    // 未收集必要證據前無法完成第一章主線
    const premature = questSystem.completeQuest('quest_main_ch1_desk29');
    expect(premature.success).toBe(false);
    expect(premature.reason).toBe('completion_condition_not_met');

    const initialCredits = gameState.getValue('academicCredits');
    const initialPinyanAffinity = relSystem.getCharacterState('chen_pinyan').affinity;

    // 收集第一章所需證據
    evidenceSystem.collectEvidence('clue_missing_student_poster');
    evidenceSystem.collectEvidence('clue_mysterious_school_file');

    const comp = questSystem.completeQuest('quest_main_ch1_desk29');
    expect(comp.success).toBe(true);
    expect(comp.currentStatus).toBe('completed');
    expect(comp.rewardApplied).toBe(true);

    // 驗證獎勵已寫入 GlobalGameState 與 CharacterRelationshipSystem
    expect(gameState.getValue('academicCredits')).toBe(initialCredits + 5);
    expect(relSystem.getCharacterState('chen_pinyan').affinity).toBe(
      initialPinyanAffinity + 10
    );

    // 第二章主線任務應自動解鎖為 available
    expect(questSystem.getQuestState('quest_main_ch2_doctored_history')?.status).toBe(
      'available'
    );
  });

  it('3. 單次任務與獎勵不得重複執行或重複領取獎勵', () => {
    evidenceSystem.collectEvidence('clue_admission_notice');
    evidenceSystem.collectEvidence('clue_classroom_desk_carving');

    const firstComp = questSystem.completeQuest('quest_char_su_yuqing_echo');
    expect(firstComp.success).toBe(true);
    expect(firstComp.rewardApplied).toBe(true);
    const creditsAfterFirst = gameState.getValue('academicCredits');

    const duplicateComp = questSystem.completeQuest('quest_char_su_yuqing_echo');
    expect(duplicateComp.success).toBe(false);
    expect(duplicateComp.reason).toBe('already_completed');
    expect(duplicateComp.rewardApplied).toBe(false);
    expect(gameState.getValue('academicCredits')).toBe(creditsAfterFirst);
  });

  it('4. 應支援任務失敗條件判定（如財閥警戒度超標）與自動推進評估', () => {
    questSystem.startQuest('quest_side_debunk_rumors');
    expect(questSystem.getQuestState('quest_side_debunk_rumors')?.status).toBe('active');

    // 當財閥警戒度超過 90 時，evaluateAndSyncQuests 應將該支線判定為失敗
    gameState.setVariable(
      'corporateAlert',
      95,
      'story_director',
      'Test alert threshold'
    );

    const syncResult = questSystem.evaluateAndSyncQuests();
    expect(syncResult.newlyFailedQuestIds).toContain('quest_side_debunk_rumors');
    expect(questSystem.getQuestState('quest_side_debunk_rumors')?.status).toBe('failed');
  });
});
