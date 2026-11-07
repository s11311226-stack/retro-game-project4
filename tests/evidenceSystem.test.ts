import { describe, expect, it, beforeEach } from 'vitest';
import { GlobalGameState } from '../src/systems/GlobalGameState';
import { EvidenceSystem } from '../src/systems/EvidenceSystem';

describe('Phase 6A — EvidenceSystem (證據與錯誤線索系統)', () => {
  let gameState: GlobalGameState;
  let evidenceSystem: EvidenceSystem;

  beforeEach(() => {
    gameState = new GlobalGameState();
    evidenceSystem = new EvidenceSystem(gameState);
  });

  it('應正確收集證據、防止重複收集並自動同步 evidenceCompletion 至 GlobalGameState', () => {
    expect(gameState.getValue('evidenceCompletion')).toBe(0);

    const first = evidenceSystem.collectEvidence(
      'clue_mysterious_school_file',
      '2026-11-07T12:00:00.000Z'
    );
    expect(first.success).toBe(true);
    expect(first.newlyCollected).toBe(true);
    expect(first.evidenceCompletion).toBeGreaterThan(0);
    expect(gameState.getValue('evidenceCompletion')).toBe(first.evidenceCompletion);

    // 重複收集同一證據不得重複加分
    const duplicate = evidenceSystem.collectEvidence('clue_mysterious_school_file');
    expect(duplicate.success).toBe(true);
    expect(duplicate.newlyCollected).toBe(false);
    expect(duplicate.reason).toBe('already_collected');
    expect(duplicate.evidenceCompletion).toBe(first.evidenceCompletion);
  });

  it('應支援證據深度分析並提升證據完整度，且防止重複分析加分', () => {
    evidenceSystem.collectEvidence('clue_classroom_desk_carving');
    const beforeAnalysis = gameState.getValue('evidenceCompletion');

    const analysis = evidenceSystem.analyzeEvidence('clue_classroom_desk_carving');
    expect(analysis.success).toBe(true);
    expect(analysis.newlyAnalyzed).toBe(true);
    expect(analysis.evidenceCompletion).toBeGreaterThan(beforeAnalysis);
    expect(gameState.getValue('evidenceCompletion')).toBe(analysis.evidenceCompletion);

    const secondAnalysis = evidenceSystem.analyzeEvidence('clue_classroom_desk_carving');
    expect(secondAnalysis.success).toBe(true);
    expect(secondAnalysis.newlyAnalyzed).toBe(false);
    expect(secondAnalysis.evidenceCompletion).toBe(analysis.evidenceCompletion);
  });

  it('應支援錯誤線索 (Red Herring) 標記、反證識破與誤信陷阱懲罰防重機制', () => {
    // 收集錯誤線索本身不增加正分 (baseWeight = 0)
    const rhCollect = evidenceSystem.collectEvidence('rh_fake_love_letter');
    expect(rhCollect.success).toBe(true);
    expect(rhCollect.evidenceCompletion).toBe(0);

    // 直接分析錯誤線索會被拒絕並提示需要反證
    const directAnalyze = evidenceSystem.analyzeEvidence('rh_fake_love_letter');
    expect(directAnalyze.success).toBe(false);
    expect(directAnalyze.reason).toBe('requires_counter_evidence');

    // 未收集反證前無法識破
    const prematureDebunk = evidenceSystem.debunkRedHerring(
      'rh_fake_love_letter',
      'clue_classroom_desk_carving'
    );
    expect(prematureDebunk.success).toBe(false);
    expect(prematureDebunk.reason).toBe('counter_evidence_not_collected');

    // 收集正確反證並識破錯誤線索
    evidenceSystem.collectEvidence('clue_classroom_desk_carving');
    const afterCounter = gameState.getValue('evidenceCompletion');

    const debunk = evidenceSystem.debunkRedHerring(
      'rh_fake_love_letter',
      'clue_classroom_desk_carving'
    );
    expect(debunk.success).toBe(true);
    expect(debunk.newlyDebunked).toBe(true);
    expect(debunk.evidenceCompletion).toBeGreaterThan(afterCounter);
    expect(evidenceSystem.isRedHerringDebunked('rh_fake_love_letter')).toBe(true);

    // 測試未識破的錯誤線索誤信陷阱（且具備單次防重）
    evidenceSystem.collectEvidence('rh_b2_power_lever');
    const trap1 = evidenceSystem.triggerRedHerringTrap('rh_b2_power_lever');
    expect(trap1.triggered).toBe(true);
    expect(gameState.getValue('corporateAlert')).toBe(15);
    expect(gameState.getValue('experimentCorruption')).toBe(10);

    const trap2 = evidenceSystem.triggerRedHerringTrap('rh_b2_power_lever');
    expect(trap2.triggered).toBe(false);
    expect(gameState.getValue('corporateAlert')).toBe(15);
  });

  it('應支援按分類、區域、重要度與是否為錯誤線索進行查詢篩選', () => {
    evidenceSystem.collectEvidence('clue_admission_notice');
    evidenceSystem.collectEvidence('clue_classroom_desk_carving');
    evidenceSystem.collectEvidence('rh_fake_love_letter');

    const classroomEvidences = evidenceSystem.queryCollectedEvidence({
      discoveredAreaId: 'classroom',
    });
    expect(classroomEvidences.length).toBe(2);

    const redHerrings = evidenceSystem.queryCollectedEvidence({
      isRedHerring: true,
    });
    expect(redHerrings.length).toBe(1);
    expect(redHerrings[0].definition.id).toBe('rh_fake_love_letter');

    const criticalOnly = evidenceSystem.queryCollectedEvidence({
      importance: 'critical',
    });
    expect(criticalOnly.length).toBe(1);
    expect(criticalOnly[0].definition.id).toBe('clue_classroom_desk_carving');
  });
});
