import { beforeEach, describe, expect, it } from 'vitest';
import { ALL_CHARACTER_IDS } from '../src/data/charactersCatalog';
import { CharacterRelationshipSystem } from '../src/systems/CharacterRelationshipSystem';
import { GlobalGameState } from '../src/systems/GlobalGameState';

describe('Phase 6A (B) — 角色關係系統 (CharacterRelationshipSystem) 單元測試', () => {
  let globalState: GlobalGameState;
  let relSystem: CharacterRelationshipSystem;

  beforeEach(() => {
    globalState = new GlobalGameState();
    relSystem = new CharacterRelationshipSystem(globalState);
  });

  it('1. 完整管理 CHARACTER_DATABASE.md 中的 15 位核心角色資料與初始關係狀態', () => {
    const allDefs = relSystem.getAllCharacterDefinitions();
    expect(allDefs.length).toBe(15);
    expect(ALL_CHARACTER_IDS).toEqual([
      'su_yuqing',
      'su_yulan',
      'lin_xiaoyue',
      'zhou_yuan',
      'chen_pinyan',
      'zhao_jiahao',
      'shirakawa_hayate',
      'ye_sihan',
      'lu_zixuan',
      'shen_zhiyuan',
      'xu_wenqian',
      'chen_mengzhe',
      'shirakawa_shizuo',
      'shirakawa_kyoka',
      'lin_jingyi',
    ]);

    const zhouState = relSystem.getCharacterState('zhou_yuan');
    expect(zhouState.tier).toBe(1);
    expect(zhouState.isAwakened).toBe(false);
  });

  it('2. 支援正面、負面事件影響與關係階段 (Tier 1 / 2 / 3) 判定，並同步更新全域 studentAffinity 與 studentTrust', () => {
    const initialSnap = globalState.getSnapshot();

    // 正面事件提升陳品妍好感與信任至 Tier 2 (40~74)
    const res1 = relSystem.applyRelationshipEvent({
      eventId: 'evt_pinyan_help_photo',
      characterId: 'chen_pinyan',
      affinityDelta: 25,
      trustDelta: 25,
    });
    expect(res1.applied).toBe(true);
    expect(res1.updatedState.affinity).toBe(60);
    expect(res1.updatedState.trust).toBe(55);
    expect(res1.updatedState.tier).toBe(2);

    // 繼續提升至 Tier 3 (75~100)
    const res2 = relSystem.applyRelationshipEvent({
      eventId: 'evt_pinyan_darkroom_truth',
      characterId: 'chen_pinyan',
      affinityDelta: 30,
      trustDelta: 30,
    });
    expect(res2.updatedState.tier).toBe(3);

    // 全域 studentAffinity 與 studentTrust 應隨之提升
    expect(globalState.getValue('studentAffinity')).toBeGreaterThan(
      initialSnap.studentAffinity
    );
    expect(globalState.getValue('studentTrust')).toBeGreaterThan(
      initialSnap.studentTrust
    );

    // 負面事件測試與上下界 (0~100) 保護
    const resNeg = relSystem.applyRelationshipEvent({
      eventId: 'evt_zhou_argument',
      characterId: 'zhou_yuan',
      affinityDelta: -999,
      trustDelta: -999,
    });
    expect(resNeg.updatedState.affinity).toBe(0);
    expect(resNeg.updatedState.trust).toBe(0);
    expect(resNeg.updatedState.tier).toBe(1);
  });

  it('3. 一次性事件防重複機制：相同 eventId 不得重複疊加好感度或信任度', () => {
    const first = relSystem.applyRelationshipEvent({
      eventId: 'evt_one_time_baton_return',
      characterId: 'zhao_jiahao',
      affinityDelta: 20,
      trustDelta: 25,
      oneTimeOnly: true,
    });
    expect(first.applied).toBe(true);
    const affinityAfterFirst = first.updatedState.affinity;

    // 第二次觸發相同 eventId 應被攔截
    const second = relSystem.applyRelationshipEvent({
      eventId: 'evt_one_time_baton_return',
      characterId: 'zhao_jiahao',
      affinityDelta: 20,
      trustDelta: 25,
      oneTimeOnly: true,
    });
    expect(second.applied).toBe(false);
    expect(second.reason).toBe('already_completed');
    expect(second.updatedState.affinity).toBe(affinityAfterFirst);
  });

  it('4. 角色覺醒條件判定與跨角色衝突事件處理', () => {
    // 周予安需要 minAffinity: 60, minTrust: 75 且持有證據 'ev_mysterious_school_file' 才會覺醒
    relSystem.applyRelationshipEvent({
      eventId: 'evt_zhou_boost',
      characterId: 'zhou_yuan',
      affinityDelta: 60,
      trustDelta: 75,
    });

    // 尚未出示關鍵證據前，尚未覺醒
    expect(relSystem.getCharacterState('zhou_yuan').isAwakened).toBe(false);

    // 傳入關鍵證據後觸發覺醒判定
    const awakened = relSystem.evaluateAndAwakenCharacter('zhou_yuan', [
      'ev_mysterious_school_file',
    ]);
    expect(awakened).toBe(true);
    expect(relSystem.getCharacterState('zhou_yuan').isAwakened).toBe(true);
    expect(relSystem.getAwakenedCharacters()).toContain('zhou_yuan');

    // 測試跨角色衝突：周予安 vs 趙家豪
    const conflictRes = relSystem.resolveCrossCharacterConflict({
      conflictId: 'conflict_zhou_vs_zhao',
      choiceId: 'harmonize_with_evidence',
    });
    expect(conflictRes.applied).toBe(true);

    // 同一衝突事件不會重複執行
    const duplicateConflict = relSystem.resolveCrossCharacterConflict({
      conflictId: 'conflict_zhou_vs_zhao',
      choiceId: 'harmonize_with_evidence',
    });
    expect(duplicateConflict.applied).toBe(false);
  });
});
