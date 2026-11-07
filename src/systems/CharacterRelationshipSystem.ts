import { GameEvents, globalEventBus } from '../core/EventBus';
import {
  ALL_CHARACTER_IDS,
  CHARACTERS_CATALOG,
} from '../data/charactersCatalog';
import type {
  CharacterDefinition,
  CharacterId,
  CharacterRelationshipState,
  CrossCharacterConflictResolution,
  RelationshipEventImpact,
  RelationshipTier,
} from '../types';
import { GlobalGameState, globalGameState } from './GlobalGameState';

/**
 * Phase 6A (B) — 角色關係與派系互動管理系統 (CharacterRelationshipSystem)
 *
 * 負責：
 * 1. 管理全部 15 位核心角色檔案與動態關係狀態 (affinity: 0~100, trust: 0~100, tier: 1~3, isAwakened)。
 * 2. 自動計算學生陣營整體的 studentAffinity 與 studentTrust 平均值，並同步寫入 GlobalGameState。
 * 3. 支援正面、負面及特殊事件影響，並具備一次性事件防重複機制 (completedEventIds)。
 * 4. 支援角色關係階段判定 (Tier 1: 0~39, Tier 2: 40~74, Tier 3: 75~100) 與覺醒條件判定。
 * 5. 支援 CHARACTER_RELATIONSHIPS.md 定義的三大跨角色衝突事件處理。
 */
export class CharacterRelationshipSystem {
  private globalState: GlobalGameState;
  private states = new Map<CharacterId, CharacterRelationshipState>();
  private completedEventIds = new Set<string>();

  constructor(targetGlobalState: GlobalGameState = globalGameState) {
    this.globalState = targetGlobalState;
    this.reset();
  }

  public reset(): void {
    this.states.clear();
    this.completedEventIds.clear();

    for (const id of ALL_CHARACTER_IDS) {
      const def = CHARACTERS_CATALOG[id];
      const affinity = this.clampScore(def.initialAffinity);
      const trust = this.clampScore(def.initialTrust);
      this.states.set(id, {
        characterId: id,
        affinity,
        trust,
        tier: this.computeTier(affinity, trust),
        isAwakened: id === 'su_yuqing',
      });
    }

    this.syncAggregateToGlobalState('Reset character relationships');
  }

  public getCharacterDefinition(characterId: CharacterId): CharacterDefinition {
    const def = CHARACTERS_CATALOG[characterId];
    if (!def) {
      throw new Error(`Unknown characterId: "${String(characterId)}"`);
    }
    return def;
  }

  public getAllCharacterDefinitions(): CharacterDefinition[] {
    return ALL_CHARACTER_IDS.map((id) => CHARACTERS_CATALOG[id]);
  }

  public getCharacterState(
    characterId: CharacterId
  ): Readonly<CharacterRelationshipState> {
    const st = this.states.get(characterId);
    if (!st) {
      throw new Error(`Unknown characterId: "${String(characterId)}"`);
    }
    return Object.freeze({ ...st });
  }

  public getAllCharacterStates(): Readonly<CharacterRelationshipState>[] {
    return ALL_CHARACTER_IDS.map((id) => this.getCharacterState(id));
  }

  public getAwakenedCharacters(): CharacterId[] {
    return ALL_CHARACTER_IDS.filter((id) => this.states.get(id)?.isAwakened);
  }

  public hasCompletedEvent(eventId: string): boolean {
    return this.completedEventIds.has(eventId);
  }

  /**
   * 套用正面、負面或特殊角色關係事件
   * 若 oneTimeOnly 為 true（預設為 true），同一 eventId 不會重複觸發。
   */
  public applyRelationshipEvent(
    impact: RelationshipEventImpact,
    collectedEvidenceIds: string[] = []
  ): {
    applied: boolean;
    reason?: 'already_completed' | 'invalid_character';
    updatedState: Readonly<CharacterRelationshipState>;
  } {
    const def = CHARACTERS_CATALOG[impact.characterId];
    if (!def) {
      throw new Error(`Unknown characterId: "${String(impact.characterId)}"`);
    }

    const oneTime = impact.oneTimeOnly ?? true;
    if (oneTime && this.completedEventIds.has(impact.eventId)) {
      return {
        applied: false,
        reason: 'already_completed',
        updatedState: this.getCharacterState(impact.characterId),
      };
    }

    const current = this.states.get(impact.characterId)!;
    const nextAffinity = this.clampScore(
      current.affinity + (impact.affinityDelta ?? 0)
    );
    const nextTrust = this.clampScore(
      current.trust + (impact.trustDelta ?? 0)
    );
    const nextTier = this.computeTier(nextAffinity, nextTrust);

    const nextAwakened =
      current.isAwakened ||
      Boolean(impact.forceAwaken) ||
      this.evaluateAwakening(def, nextAffinity, nextTrust, collectedEvidenceIds);

    const nextState: CharacterRelationshipState = {
      characterId: impact.characterId,
      affinity: nextAffinity,
      trust: nextTrust,
      tier: nextTier,
      isAwakened: nextAwakened,
    };

    this.states.set(impact.characterId, nextState);
    if (oneTime) {
      this.completedEventIds.add(impact.eventId);
    }

    if (
      typeof impact.corporateAlertDelta === 'number' &&
      impact.corporateAlertDelta !== 0
    ) {
      this.globalState.adjustVariable(
        'corporateAlert',
        impact.corporateAlertDelta,
        'relationship_system',
        impact.reason ?? impact.eventId
      );
    }

    this.syncAggregateToGlobalState(impact.reason ?? impact.eventId);
    globalEventBus.emit(GameEvents.RELATIONSHIP_UPDATED, {
      eventId: impact.eventId,
      characterId: impact.characterId,
      state: this.getCharacterState(impact.characterId),
    });

    return {
      applied: true,
      updatedState: this.getCharacterState(impact.characterId),
    };
  }

  /**
   * 根據目前已收集的證據清單，重新檢查並更新指定角色是否達成覺醒條件
   */
  public evaluateAndAwakenCharacter(
    characterId: CharacterId,
    collectedEvidenceIds: string[]
  ): boolean {
    const def = this.getCharacterDefinition(characterId);
    const current = this.states.get(characterId)!;
    if (current.isAwakened) return true;

    if (
      this.evaluateAwakening(
        def,
        current.affinity,
        current.trust,
        collectedEvidenceIds
      )
    ) {
      current.isAwakened = true;
      this.states.set(characterId, { ...current });
      globalEventBus.emit(GameEvents.RELATIONSHIP_UPDATED, {
        eventId: `awaken_${characterId}`,
        characterId,
        state: this.getCharacterState(characterId),
      });
      return true;
    }

    return false;
  }

  /**
   * 處理 CHARACTER_RELATIONSHIPS.md 定義的三大跨角色衝突事件：
   * 1. conflict_zhou_vs_zhao (周予安 vs 趙家豪：秩序與衝動的摩擦)
   * 2. conflict_ye_vs_chen (葉思涵 vs 陳孟哲：保健室的心理攻防)
   * 3. conflict_hayate_vs_pinyan (白川颯 vs 陳品妍：對財閥姓氏的猜忌)
   */
  public resolveCrossCharacterConflict(
    resolution: CrossCharacterConflictResolution
  ): {
    applied: boolean;
    summary: string;
  } {
    const eventKey = `conflict:${resolution.conflictId}`;
    const oneTime = resolution.oneTimeOnly ?? true;
    if (oneTime && this.completedEventIds.has(eventKey)) {
      return {
        applied: false,
        summary: '此跨角色衝突事件已處理過。',
      };
    }

    if (resolution.conflictId === 'conflict_zhou_vs_zhao') {
      if (resolution.choiceId === 'harmonize_with_evidence') {
        this.applyRelationshipEvent({
          eventId: `${eventKey}:zhou`,
          characterId: 'zhou_yuan',
          affinityDelta: 10,
          trustDelta: 15,
          oneTimeOnly: false,
        });
        this.applyRelationshipEvent({
          eventId: `${eventKey}:zhao`,
          characterId: 'zhao_jiahao',
          affinityDelta: 10,
          trustDelta: 15,
          oneTimeOnly: false,
        });
        if (oneTime) this.completedEventIds.add(eventKey);
        return {
          applied: true,
          summary: '以林靜儀的線索成功調和周予安與趙家豪，兩人信任度與好感度同步提升！',
        };
      } else {
        // 偏袒盲目暴力：財閥警戒度 +25，周予安信任度下降
        this.applyRelationshipEvent({
          eventId: `${eventKey}:zhou_neg`,
          characterId: 'zhou_yuan',
          trustDelta: -10,
          corporateAlertDelta: 25,
          oneTimeOnly: false,
        });
        if (oneTime) this.completedEventIds.add(eventKey);
        return {
          applied: true,
          summary: '採取魯莽衝撞導致財閥警戒度大幅上升 (+25)，且周予安信任度下降。',
        };
      }
    }

    if (resolution.conflictId === 'conflict_ye_vs_chen') {
      if (resolution.choiceId === 'harmonize_with_evidence') {
        this.applyRelationshipEvent({
          eventId: `${eventKey}:ye`,
          characterId: 'ye_sihan',
          affinityDelta: 15,
          trustDelta: 20,
          oneTimeOnly: false,
        });
        this.applyRelationshipEvent({
          eventId: `${eventKey}:xu`,
          characterId: 'xu_wenqian',
          trustDelta: 10,
          oneTimeOnly: false,
        });
        if (oneTime) this.completedEventIds.add(eventKey);
        return {
          applied: true,
          summary: '先與許文謙老師配合保護葉思涵後再揭穿藥水，葉思涵完全敞開心扉！',
        };
      } else {
        this.applyRelationshipEvent({
          eventId: `${eventKey}:ye_neg`,
          characterId: 'ye_sihan',
          trustDelta: -10,
          corporateAlertDelta: 15,
          oneTimeOnly: false,
        });
        if (oneTime) this.completedEventIds.add(eventKey);
        return {
          applied: true,
          summary: '過早質問陳孟哲導致葉思涵遭調離保健室，警戒度上升。',
        };
      }
    }

    if (resolution.conflictId === 'conflict_hayate_vs_pinyan') {
      if (resolution.choiceId === 'harmonize_with_evidence') {
        this.applyRelationshipEvent({
          eventId: `${eventKey}:hayate`,
          characterId: 'shirakawa_hayate',
          affinityDelta: 15,
          trustDelta: 20,
          corporateAlertDelta: -15,
          oneTimeOnly: false,
        });
        this.applyRelationshipEvent({
          eventId: `${eventKey}:pinyan`,
          characterId: 'chen_pinyan',
          affinityDelta: 10,
          trustDelta: 15,
          oneTimeOnly: false,
        });
        this.globalState.adjustVariable(
          'publicExposure',
          15,
          'relationship_system',
          'Hayate and Pinyan intelligence exchange'
        );
        if (oneTime) this.completedEventIds.add(eventKey);
        return {
          applied: true,
          summary: '促成白川颯與陳品妍於頂樓交換情報，曝光度提升且財閥警戒度下降！',
        };
      }
    }

    throw new Error(`Unknown conflictId: "${resolution.conflictId}"`);
  }

  /**
   * 計算學生盟友群體的整體好感度與信任度平均值
   */
  public computeAggregateStudentMetrics(): {
    studentAffinity: number;
    studentTrust: number;
  } {
    const studentIds = ALL_CHARACTER_IDS.filter(
      (id) => CHARACTERS_CATALOG[id].countsTowardStudentAggregate
    );
    if (studentIds.length === 0) {
      return { studentAffinity: 20, studentTrust: 10 };
    }

    let totalAffinity = 0;
    let totalTrust = 0;
    for (const id of studentIds) {
      const st = this.states.get(id)!;
      totalAffinity += st.affinity;
      totalTrust += st.trust;
    }

    return {
      studentAffinity: Math.round(totalAffinity / studentIds.length),
      studentTrust: Math.round(totalTrust / studentIds.length),
    };
  }

  /**
   * 根據分數判定關係階段 (CHARACTER_RELATIONSHIPS.md: 0~39 Tier 1, 40~74 Tier 2, 75~100 Tier 3)
   */
  public computeTier(affinity: number, trust: number): RelationshipTier {
    const score = Math.round((affinity + trust) / 2);
    if (score >= 75) return 3;
    if (score >= 40) return 2;
    return 1;
  }

  public toSaveData(): {
    states: Record<CharacterId, CharacterRelationshipState>;
    completedEventIds: string[];
  } {
    const record = {} as Record<CharacterId, CharacterRelationshipState>;
    for (const id of ALL_CHARACTER_IDS) {
      record[id] = { ...this.states.get(id)! };
    }
    return {
      states: record,
      completedEventIds: Array.from(this.completedEventIds),
    };
  }

  public restoreFromSaveData(saved?: {
    states?: Partial<Record<CharacterId, Partial<CharacterRelationshipState>>>;
    completedEventIds?: string[];
  }): void {
    this.reset();
    if (!saved || typeof saved !== 'object') return;

    if (Array.isArray(saved.completedEventIds)) {
      for (const evId of saved.completedEventIds) {
        if (typeof evId === 'string') {
          this.completedEventIds.add(evId);
        }
      }
    }

    if (saved.states && typeof saved.states === 'object') {
      for (const id of ALL_CHARACTER_IDS) {
        const raw = saved.states[id];
        if (!raw || typeof raw !== 'object') continue;
        const def = CHARACTERS_CATALOG[id];
        const affinity = this.clampScore(
          typeof raw.affinity === 'number' ? raw.affinity : def.initialAffinity
        );
        const trust = this.clampScore(
          typeof raw.trust === 'number' ? raw.trust : def.initialTrust
        );
        const tier = this.computeTier(affinity, trust);
        const isAwakened = Boolean(raw.isAwakened) || id === 'su_yuqing';

        this.states.set(id, {
          characterId: id,
          affinity,
          trust,
          tier,
          isAwakened,
        });
      }
    }

    this.syncAggregateToGlobalState('Restore relationships from save');
  }

  private evaluateAwakening(
    def: CharacterDefinition,
    affinity: number,
    trust: number,
    collectedEvidenceIds: string[]
  ): boolean {
    const cond = def.awakeningCondition;
    if (affinity < cond.minAffinity || trust < cond.minTrust) {
      return false;
    }
    if (cond.requiredEvidenceIds && cond.requiredEvidenceIds.length > 0) {
      const evSet = new Set(collectedEvidenceIds);
      for (const reqEv of cond.requiredEvidenceIds) {
        if (!evSet.has(reqEv)) return false;
      }
    }
    return true;
  }

  private syncAggregateToGlobalState(reason: string): void {
    const { studentAffinity, studentTrust } =
      this.computeAggregateStudentMetrics();
    this.globalState.batchUpdate(
      {
        studentAffinity,
        studentTrust,
      },
      'relationship_system',
      reason
    );
  }

  private clampScore(val: number): number {
    if (typeof val !== 'number' || !Number.isFinite(val)) return 0;
    return Math.max(0, Math.min(100, Math.round(val)));
  }
}

export const globalRelationshipSystem = new CharacterRelationshipSystem(
  globalGameState
);
