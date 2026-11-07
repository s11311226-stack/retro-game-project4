import { GameEvents, globalEventBus } from '../core/EventBus';
import { QUEST_LIST, QUESTS_CATALOG } from '../data/questsCatalog';
import {
  GlobalVariableKey,
  Phase6ASaveState,
  QuestCategory,
  QuestDefinition,
  QuestRuntimeState,
  QuestStatus,
} from '../types';
import {
  CharacterRelationshipSystem,
  globalRelationshipSystem,
} from './CharacterRelationshipSystem';
import { EvidenceSystem, globalEvidenceSystem } from './EvidenceSystem';
import { GlobalGameState, globalGameState } from './GlobalGameState';

export interface QuestTransitionResult {
  success: boolean;
  questId: string;
  previousStatus?: QuestStatus;
  currentStatus?: QuestStatus;
  rewardApplied?: boolean;
  reason?:
    | 'not_found'
    | 'prerequisites_not_met'
    | 'already_active'
    | 'already_completed'
    | 'already_failed'
    | 'completion_condition_not_met'
    | 'not_active';
}

/**
 * 《無名校區》Phase 6A (D) — QuestSystem (任務管理系統)
 *
 * 負責：
 * 1. 將任務靜態定義 (QUESTS_CATALOG) 與執行期狀態邏輯分離。
 * 2. 支援主線任務 (main)、支線任務 (side) 與角色專屬任務 (character)。
 * 3. 支援前置條件檢查（旗標、已完成任務、證據、角色信任度／好感度、學業學分）。
 * 4. 支援進行中 (active)、已完成 (completed)、失敗 (failed) 狀態轉換。
 * 5. 支援完成獎勵發放（連動 GlobalGameState 與 CharacterRelationshipSystem），並確保單次事件／獎勵絕不重複發放。
 */
export class QuestSystem {
  private readonly gameState: GlobalGameState;
  private readonly relationshipSystem: CharacterRelationshipSystem;
  private readonly evidenceSystem: EvidenceSystem;
  private states = new Map<string, QuestRuntimeState>();
  private executedOneTimeEventIds = new Set<string>();

  constructor(
    gameState: GlobalGameState = globalGameState,
    relationshipSystem: CharacterRelationshipSystem = globalRelationshipSystem,
    evidenceSystem: EvidenceSystem = globalEvidenceSystem
  ) {
    this.gameState = gameState;
    this.relationshipSystem = relationshipSystem;
    this.evidenceSystem = evidenceSystem;
    this.reset();
  }

  /**
   * 重置所有任務狀態，並將無前置條件的第一章主線任務設為 available / active
   */
  public reset(): void {
    this.states.clear();
    this.executedOneTimeEventIds.clear();

    for (const def of QUEST_LIST) {
      const initialStatus: QuestStatus = this.checkPrerequisites(def, [])
        ? 'available'
        : 'locked';
      this.states.set(def.id, {
        questId: def.id,
        status: initialStatus,
        rewardClaimed: false,
      });
    }

    // 預設自動啟動第一章主線任務與主角個人任務
    this.startQuest('quest_main_ch1_desk29');
    this.startQuest('quest_char_su_yuqing_echo');
  }

  public getQuestDefinition(questId: string): QuestDefinition | undefined {
    return QUESTS_CATALOG[questId];
  }

  public getAllQuestDefinitions(): QuestDefinition[] {
    return [...QUEST_LIST];
  }

  public getQuestState(questId: string): Readonly<QuestRuntimeState> | undefined {
    const st = this.states.get(questId);
    return st ? Object.freeze({ ...st }) : undefined;
  }

  public getAllQuestStates(): ReadonlyArray<Readonly<QuestRuntimeState>> {
    return Object.freeze(
      QUEST_LIST.map((def) => {
        const st = this.states.get(def.id) ?? {
          questId: def.id,
          status: 'locked' as QuestStatus,
          rewardClaimed: false,
        };
        return Object.freeze({ ...st });
      })
    );
  }

  public getQuestsByCategory(
    category: QuestCategory
  ): Array<{ definition: QuestDefinition; state: Readonly<QuestRuntimeState> }> {
    return QUEST_LIST.filter((def) => def.category === category).map((def) => ({
      definition: def,
      state: this.getQuestState(def.id)!,
    }));
  }

  public getQuestsByStatus(
    status: QuestStatus
  ): Array<{ definition: QuestDefinition; state: Readonly<QuestRuntimeState> }> {
    return QUEST_LIST.filter((def) => this.states.get(def.id)?.status === status).map(
      (def) => ({
        definition: def,
        state: this.getQuestState(def.id)!,
      })
    );
  }

  /**
   * 檢查任務前置條件是否滿足
   */
  public canStartQuest(questId: string, activeFlags: string[] = []): boolean {
    const def = QUESTS_CATALOG[questId];
    if (!def) return false;
    return this.checkPrerequisites(def, activeFlags);
  }

  /**
   * 啟動任務
   */
  public startQuest(
    questId: string,
    activeFlags: string[] = [],
    startedAtIso: string = new Date().toISOString()
  ): QuestTransitionResult {
    const def = QUESTS_CATALOG[questId];
    if (!def) {
      return {
        success: false,
        questId,
        reason: 'not_found',
      };
    }

    const current = this.states.get(questId)!;
    if (current.status === 'active') {
      return {
        success: false,
        questId,
        previousStatus: current.status,
        currentStatus: current.status,
        reason: 'already_active',
      };
    }
    if (current.status === 'completed') {
      return {
        success: false,
        questId,
        previousStatus: current.status,
        currentStatus: current.status,
        reason: 'already_completed',
      };
    }
    if (current.status === 'failed') {
      return {
        success: false,
        questId,
        previousStatus: current.status,
        currentStatus: current.status,
        reason: 'already_failed',
      };
    }

    if (!this.checkPrerequisites(def, activeFlags)) {
      return {
        success: false,
        questId,
        previousStatus: current.status,
        currentStatus: current.status,
        reason: 'prerequisites_not_met',
      };
    }

    const previousStatus = current.status;
    const nextState: QuestRuntimeState = {
      ...current,
      status: 'active',
      startedAtIso,
    };
    this.states.set(questId, nextState);

    globalEventBus.emit(GameEvents.QUEST_UPDATED, {
      questId,
      status: 'active',
    });

    return {
      success: true,
      questId,
      previousStatus,
      currentStatus: 'active',
    };
  }

  /**
   * 檢查任務完成條件是否滿足
   */
  public isCompletionConditionMet(
    questId: string,
    activeFlags: string[] = [],
    completedEventIds: string[] = []
  ): boolean {
    const def = QUESTS_CATALOG[questId];
    if (!def) return false;

    const cond = def.completionCondition;
    if (cond.requiredEvidenceIds && cond.requiredEvidenceIds.length > 0) {
      for (const evId of cond.requiredEvidenceIds) {
        if (!this.evidenceSystem.hasEvidence(evId)) {
          return false;
        }
      }
    }

    if (cond.requiredFlags && cond.requiredFlags.length > 0) {
      const flagSet = new Set(activeFlags);
      for (const flag of cond.requiredFlags) {
        if (!flagSet.has(flag)) {
          return false;
        }
      }
    }

    if (cond.requiredCompletedEventIds && cond.requiredCompletedEventIds.length > 0) {
      const evtSet = new Set(completedEventIds);
      for (const evtId of cond.requiredCompletedEventIds) {
        if (!evtSet.has(evtId) && !this.relationshipSystem.hasCompletedEvent(evtId)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 完成任務並發放單次獎勵（具備防重複發放保護）
   */
  public completeQuest(
    questId: string,
    activeFlags: string[] = [],
    completedEventIds: string[] = [],
    completedAtIso: string = new Date().toISOString()
  ): QuestTransitionResult {
    const def = QUESTS_CATALOG[questId];
    if (!def) {
      return {
        success: false,
        questId,
        reason: 'not_found',
      };
    }

    const current = this.states.get(questId)!;
    if (current.status === 'completed') {
      return {
        success: false,
        questId,
        previousStatus: 'completed',
        currentStatus: 'completed',
        rewardApplied: false,
        reason: 'already_completed',
      };
    }

    if (current.status === 'failed') {
      return {
        success: false,
        questId,
        previousStatus: 'failed',
        currentStatus: 'failed',
        rewardApplied: false,
        reason: 'already_failed',
      };
    }

    if (!this.isCompletionConditionMet(questId, activeFlags, completedEventIds)) {
      return {
        success: false,
        questId,
        previousStatus: current.status,
        currentStatus: current.status,
        rewardApplied: false,
        reason: 'completion_condition_not_met',
      };
    }

    const previousStatus = current.status;
    const rewardEventKey = `quest_reward:${questId}`;
    let rewardApplied = false;

    if (!current.rewardClaimed && !this.executedOneTimeEventIds.has(rewardEventKey)) {
      this.executedOneTimeEventIds.add(rewardEventKey);
      this.applyQuestReward(def);
      rewardApplied = true;
    }

    const nextState: QuestRuntimeState = {
      ...current,
      status: 'completed',
      startedAtIso: current.startedAtIso ?? completedAtIso,
      completedAtIso,
      rewardClaimed: true,
    };
    this.states.set(questId, nextState);

    // 完成任務後，重新檢查是否有後續任務可解鎖為 available
    this.refreshAvailableQuests(activeFlags);

    globalEventBus.emit(GameEvents.QUEST_UPDATED, {
      questId,
      status: 'completed',
      rewardApplied,
    });

    return {
      success: true,
      questId,
      previousStatus,
      currentStatus: 'completed',
      rewardApplied,
    };
  }

  /**
   * 標記任務失敗
   */
  public failQuest(
    questId: string,
    failedAtIso: string = new Date().toISOString()
  ): QuestTransitionResult {
    const def = QUESTS_CATALOG[questId];
    if (!def) {
      return {
        success: false,
        questId,
        reason: 'not_found',
      };
    }

    const current = this.states.get(questId)!;
    if (current.status === 'completed') {
      return {
        success: false,
        questId,
        previousStatus: 'completed',
        currentStatus: 'completed',
        reason: 'already_completed',
      };
    }
    if (current.status === 'failed') {
      return {
        success: false,
        questId,
        previousStatus: 'failed',
        currentStatus: 'failed',
        reason: 'already_failed',
      };
    }

    const previousStatus = current.status;
    this.states.set(questId, {
      ...current,
      status: 'failed',
      failedAtIso,
    });

    globalEventBus.emit(GameEvents.QUEST_UPDATED, {
      questId,
      status: 'failed',
    });

    return {
      success: true,
      questId,
      previousStatus,
      currentStatus: 'failed',
    };
  }

  /**
   * 自動推進所有可解鎖／可完成／觸發失敗條件的任務
   * 當玩家在場景中取得新證據或觸發旗標時可呼叫此方法同步更新任務狀態
   */
  public evaluateAndSyncQuests(
    activeFlags: string[] = [],
    completedEventIds: string[] = []
  ): {
    newlyCompletedQuestIds: string[];
    newlyFailedQuestIds: string[];
    newlyUnlockedQuestIds: string[];
  } {
    const newlyCompletedQuestIds: string[] = [];
    const newlyFailedQuestIds: string[] = [];
    const newlyUnlockedQuestIds = this.refreshAvailableQuests(activeFlags);

    const flagSet = new Set(activeFlags);
    const currentAlert = this.gameState.getValue('corporateAlert');

    for (const def of QUEST_LIST) {
      const st = this.states.get(def.id)!;
      if (st.status === 'completed' || st.status === 'failed') {
        continue;
      }

      // 檢查失敗條件
      if (def.failureCondition) {
        const { forbiddenFlags, maxCorporateAlert } = def.failureCondition;
        const hitForbiddenFlag =
          forbiddenFlags?.some((f) => flagSet.has(f)) ?? false;
        const hitAlertLimit =
          maxCorporateAlert !== undefined && currentAlert > maxCorporateAlert;

        if (hitForbiddenFlag || hitAlertLimit) {
          const failRes = this.failQuest(def.id);
          if (failRes.success) {
            newlyFailedQuestIds.push(def.id);
          }
          continue;
        }
      }

      // 若任務為 available 或 active，且已滿足完成條件，自動完成並推進後續任務
      if (
        (st.status === 'active' || st.status === 'available') &&
        this.isCompletionConditionMet(def.id, activeFlags, completedEventIds)
      ) {
        const compRes = this.completeQuest(def.id, activeFlags, completedEventIds);
        if (compRes.success) {
          newlyCompletedQuestIds.push(def.id);
        }
      }
    }

    return {
      newlyCompletedQuestIds,
      newlyFailedQuestIds,
      newlyUnlockedQuestIds,
    };
  }

  /**
   * 序列化供 SaveManager 儲存
   */
  public serialize(): Phase6ASaveState['quests'] {
    const statesObj: Record<string, QuestRuntimeState> = {};
    for (const [id, st] of this.states.entries()) {
      statesObj[id] = { ...st };
    }
    return {
      states: statesObj,
      executedOneTimeEventIds: Array.from(this.executedOneTimeEventIds),
    };
  }

  /**
   * 從存檔還原狀態
   */
  public restoreFromSave(
    saved?: Phase6ASaveState['quests'],
    activeFlags: string[] = []
  ): void {
    this.reset();

    if (saved && saved.states && typeof saved.states === 'object') {
      for (const def of QUEST_LIST) {
        const savedSt = saved.states[def.id];
        if (savedSt && typeof savedSt === 'object') {
          const validStatus: QuestStatus = [
            'locked',
            'available',
            'active',
            'completed',
            'failed',
          ].includes(savedSt.status)
            ? savedSt.status
            : 'locked';

          this.states.set(def.id, {
            questId: def.id,
            status: validStatus,
            startedAtIso: savedSt.startedAtIso,
            completedAtIso: savedSt.completedAtIso,
            failedAtIso: savedSt.failedAtIso,
            rewardClaimed: Boolean(savedSt.rewardClaimed),
          });
        }
      }
    }

    if (saved && Array.isArray(saved.executedOneTimeEventIds)) {
      for (const evtId of saved.executedOneTimeEventIds) {
        if (typeof evtId === 'string') {
          this.executedOneTimeEventIds.add(evtId);
        }
      }
    }

    this.refreshAvailableQuests(activeFlags);
  }

  // ==========================================================================
  // 內部輔助方法
  // ==========================================================================

  private checkPrerequisites(
    def: QuestDefinition,
    activeFlags: string[]
  ): boolean {
    const pre = def.prerequisites;
    if (!pre) return true;

    if (pre.requiredFlags && pre.requiredFlags.length > 0) {
      const flagSet = new Set(activeFlags);
      for (const f of pre.requiredFlags) {
        if (!flagSet.has(f)) return false;
      }
    }

    if (pre.requiredCompletedQuestIds && pre.requiredCompletedQuestIds.length > 0) {
      for (const qId of pre.requiredCompletedQuestIds) {
        if (this.states.get(qId)?.status !== 'completed') {
          return false;
        }
      }
    }

    if (pre.requiredEvidenceIds && pre.requiredEvidenceIds.length > 0) {
      for (const evId of pre.requiredEvidenceIds) {
        if (!this.evidenceSystem.hasEvidence(evId)) {
          return false;
        }
      }
    }

    if (pre.requiredCharacterTrust) {
      const charSt = this.relationshipSystem.getCharacterState(
        pre.requiredCharacterTrust.characterId
      );
      if (charSt.trust < pre.requiredCharacterTrust.minTrust) {
        return false;
      }
    }

    if (pre.requiredCharacterAffinity) {
      const charSt = this.relationshipSystem.getCharacterState(
        pre.requiredCharacterAffinity.characterId
      );
      if (charSt.affinity < pre.requiredCharacterAffinity.minAffinity) {
        return false;
      }
    }

    if (
      pre.minAcademicCredits !== undefined &&
      this.gameState.getValue('academicCredits') < pre.minAcademicCredits
    ) {
      return false;
    }

    return true;
  }

  private refreshAvailableQuests(activeFlags: string[]): string[] {
    const newlyUnlocked: string[] = [];
    for (const def of QUEST_LIST) {
      const st = this.states.get(def.id);
      if (st && st.status === 'locked' && this.checkPrerequisites(def, activeFlags)) {
        this.states.set(def.id, {
          ...st,
          status: 'available',
        });
        newlyUnlocked.push(def.id);
      }
    }
    return newlyUnlocked;
  }

  private applyQuestReward(def: QuestDefinition): void {
    const { globalStateDeltas, characterImpacts } = def.rewards;

    if (globalStateDeltas) {
      for (const key of Object.keys(globalStateDeltas) as GlobalVariableKey[]) {
        const delta = globalStateDeltas[key];
        if (typeof delta === 'number' && delta !== 0) {
          this.gameState.adjustVariable(
            key,
            delta,
            'quest_system',
            `quest_reward:${def.id}`
          );
        }
      }
    }

    if (characterImpacts && characterImpacts.length > 0) {
      const collectedEvidenceIds = this.evidenceSystem
        .getAllCollectedRecords()
        .map((r) => r.id);

      for (const impact of characterImpacts) {
        this.relationshipSystem.applyRelationshipEvent(
          {
            eventId: `quest_reward:${def.id}:${impact.characterId}`,
            characterId: impact.characterId,
            affinityDelta: impact.affinityDelta,
            trustDelta: impact.trustDelta,
            oneTimeOnly: true,
            reason: `Quest completed: ${def.title}`,
          },
          collectedEvidenceIds
        );
      }
    }
  }
}

export const globalQuestSystem = new QuestSystem(
  globalGameState,
  globalRelationshipSystem,
  globalEvidenceSystem
);
