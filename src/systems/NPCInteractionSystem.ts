import { GameEvents, globalEventBus } from '../core/EventBus';
import { getNPCPlacementById, NPC_SCENE_PLACEMENTS } from '../data/npcDialoguesCatalog';
import type {
  ActiveNPCDialogueSession,
  CampusTimePhase,
  NPCDialogueChoiceDef,
  NPCScenePlacementDef,
} from '../types';
import {
  CharacterRelationshipSystem,
  globalRelationshipSystem,
} from './CharacterRelationshipSystem';
import { EvidenceSystem, globalEvidenceSystem } from './EvidenceSystem';
import { GlobalGameState, globalGameState } from './GlobalGameState';
import { QuestSystem, globalQuestSystem } from './QuestSystem';

/**
 * 《無名校區》Phase 6B — NPC 與角色分支對話系統 (NPCInteractionSystem)
 *
 * 負責：
 * 1. 管理全校區 NPC 互動對話、角色名稱顯示、分支選項、條件過濾與特定證據解鎖特殊對話。
 * 2. 實際連動 CharacterRelationshipSystem、GlobalGameState、EvidenceSystem 與 QuestSystem。
 * 3. 具備一次性劇情事件／選項防重複機制 (completedChoiceIds)，防止重複刷好感度或獎勵。
 */
export class NPCInteractionSystem {
  private readonly gameState: GlobalGameState;
  private readonly relationshipSystem: CharacterRelationshipSystem;
  private readonly evidenceSystem: EvidenceSystem;
  private readonly questSystem: QuestSystem;

  private completedChoiceIds = new Set<string>();
  private activePlacement: NPCScenePlacementDef | null = null;
  private activeSession: ActiveNPCDialogueSession | null = null;
  private isInChoiceResponse = false;

  constructor(
    gameState: GlobalGameState = globalGameState,
    relationshipSystem: CharacterRelationshipSystem = globalRelationshipSystem,
    evidenceSystem: EvidenceSystem = globalEvidenceSystem,
    questSystem: QuestSystem = globalQuestSystem
  ) {
    this.gameState = gameState;
    this.relationshipSystem = relationshipSystem;
    this.evidenceSystem = evidenceSystem;
    this.questSystem = questSystem;
  }

  public reset(): void {
    this.completedChoiceIds.clear();
    this.activePlacement = null;
    this.activeSession = null;
    this.isInChoiceResponse = false;
  }

  public getAllPlacements(): NPCScenePlacementDef[] {
    return Object.values(NPC_SCENE_PLACEMENTS);
  }

  public hasCompletedChoice(choiceId: string): boolean {
    return this.completedChoiceIds.has(choiceId);
  }

  public getCompletedChoiceIds(): string[] {
    return Array.from(this.completedChoiceIds);
  }

  public serialize(): { completedChoiceIds: string[] } {
    return {
      completedChoiceIds: this.getCompletedChoiceIds(),
    };
  }

  public restoreCompletedChoiceIds(ids?: string[]): void {
    this.completedChoiceIds.clear();
    if (Array.isArray(ids)) {
      for (const id of ids) {
        if (typeof id === 'string') {
          this.completedChoiceIds.add(id);
        }
      }
    }
  }

  public restoreFromSave(data?: { completedChoiceIds?: string[] }): void {
    this.restoreCompletedChoiceIds(data?.completedChoiceIds);
    this.activePlacement = null;
    this.activeSession = null;
    this.isInChoiceResponse = false;
  }

  public getActiveSession(): ActiveNPCDialogueSession | null {
    return this.activeSession ? { ...this.activeSession } : null;
  }

  /**
   * 啟動與指定 NPC 的對話
   */
  public startDialogue(
    placementId: string,
    activeFlags: string[] = [],
    currentTimePhase: CampusTimePhase = 'day'
  ): ActiveNPCDialogueSession | null {
    const placement = getNPCPlacementById(placementId);
    if (!placement) return null;

    this.activePlacement = placement;
    this.isInChoiceResponse = false;

    const charDef = this.relationshipSystem.getCharacterDefinition(
      placement.characterId
    );
    const charState = this.relationshipSystem.getCharacterState(
      placement.characterId
    );
    const availableChoices = this.evaluateChoicesForPlacement(
      placement,
      activeFlags,
      currentTimePhase
    );

    this.activeSession = {
      npcId: placement.characterId,
      npcName: charDef.name,
      roleTitle: charDef.roleTitle,
      affinity: charState.affinity,
      trust: charState.trust,
      tier: charState.tier,
      isAwakened: charState.isAwakened,
      lines: [...placement.greetingLines],
      currentLineIndex: 0,
      availableChoices,
      showingChoices: placement.greetingLines.length <= 1 && availableChoices.length > 0,
    };

    globalEventBus.emit(GameEvents.NPC_DIALOGUE_UPDATED, this.getActiveSession());
    return this.getActiveSession();
  }

  /**
   * 推進當前 NPC 對話行；若已讀完開場台詞且有選項則切換至顯示選項，若已讀完選項回應則關閉對話
   */
  public advanceDialogue(
    _activeFlags: string[] = [],
    _currentTimePhase: CampusTimePhase = 'day'
  ): {
    session: ActiveNPCDialogueSession | null;
    finished: boolean;
  } {
    if (!this.activeSession || !this.activePlacement) {
      return { session: null, finished: true };
    }

    if (this.activeSession.showingChoices) {
      return { session: this.getActiveSession(), finished: false };
    }

    const nextIdx = this.activeSession.currentLineIndex + 1;
    if (nextIdx < this.activeSession.lines.length) {
      this.activeSession.currentLineIndex = nextIdx;
      const isLastGreetingLine =
        !this.isInChoiceResponse &&
        nextIdx === this.activeSession.lines.length - 1;
      if (isLastGreetingLine && this.activeSession.availableChoices.length > 0) {
        this.activeSession.showingChoices = true;
      }
      globalEventBus.emit(
        GameEvents.NPC_DIALOGUE_UPDATED,
        this.getActiveSession()
      );
      return { session: this.getActiveSession(), finished: false };
    }

    // 若剛讀完開場白且還有選項尚未顯示
    if (
      !this.isInChoiceResponse &&
      this.activeSession.availableChoices.length > 0
    ) {
      this.activeSession.showingChoices = true;
      globalEventBus.emit(
        GameEvents.NPC_DIALOGUE_UPDATED,
        this.getActiveSession()
      );
      return { session: this.getActiveSession(), finished: false };
    }

    // 對話結束
    this.closeDialogue();
    return { session: null, finished: true };
  }

  public advanceLine(): ActiveNPCDialogueSession | null {
    return this.advanceDialogue().session;
  }

  /**
   * 選擇一個 NPC 對話分支選項，執行關係與證據/任務連動並顯示回應台詞
   */
  public selectChoice(
    choiceId: string,
    activeFlags: string[] = [],
    currentTimePhase: CampusTimePhase = 'day',
    onGrantItem?: (itemId: string) => void
  ): {
    success: boolean;
    alreadyCompleted: boolean;
    outcomeSummary: string;
    session: ActiveNPCDialogueSession | null;
  } {
    if (!this.activePlacement || !this.activeSession) {
      return {
        success: false,
        alreadyCompleted: false,
        outcomeSummary: '',
        session: null,
      };
    }

    if (choiceId === 'choice_close_dialogue') {
      this.closeDialogue();
      return {
        success: true,
        alreadyCompleted: false,
        outcomeSummary: '結束對話',
        session: null,
      };
    }

    const choiceEntry = this.activeSession.availableChoices.find(
      (c) => c.choice.id === choiceId
    );
    if (!choiceEntry) {
      return {
        success: false,
        alreadyCompleted: false,
        outcomeSummary: '選項不符條件或不存在',
        session: this.getActiveSession(),
      };
    }

    const { choice } = choiceEntry;
    const alreadyCompleted = this.completedChoiceIds.has(choice.id);
    const summaryParts: string[] = [];

    if (!alreadyCompleted && choice.outcome) {
      const out = choice.outcome;
      this.completedChoiceIds.add(choice.id);

      const collectedEvIds = this.evidenceSystem
        .getAllCollectedRecords()
        .map((r) => r.id);

      // 1. 更新角色關係
      if (
        (out.affinityDelta && out.affinityDelta !== 0) ||
        (out.trustDelta && out.trustDelta !== 0) ||
        (out.corporateAlertDelta && out.corporateAlertDelta !== 0)
      ) {
        this.relationshipSystem.applyRelationshipEvent(
          {
            eventId: out.oneTimeEventId,
            characterId: this.activePlacement.characterId,
            affinityDelta: out.affinityDelta,
            trustDelta: out.trustDelta,
            corporateAlertDelta: out.corporateAlertDelta,
            oneTimeOnly: true,
            reason: `NPC Choice: ${choice.id}`,
          },
          collectedEvIds
        );

        if (out.affinityDelta) {
          summaryParts.push(
            `好感 ${out.affinityDelta > 0 ? `+${out.affinityDelta}` : out.affinityDelta}`
          );
        }
        if (out.trustDelta) {
          summaryParts.push(
            `信任 ${out.trustDelta > 0 ? `+${out.trustDelta}` : out.trustDelta}`
          );
        }
        if (out.corporateAlertDelta) {
          summaryParts.push(
            `警戒度 ${out.corporateAlertDelta > 0 ? `+${out.corporateAlertDelta}` : out.corporateAlertDelta}`
          );
        }
      }

      // 2. 更新全域變數
      if (out.publicExposureDelta) {
        this.gameState.adjustVariable(
          'publicExposure',
          out.publicExposureDelta,
          'relationship_system',
          out.oneTimeEventId
        );
        summaryParts.push(
          `曝光度 ${out.publicExposureDelta > 0 ? `+${out.publicExposureDelta}` : out.publicExposureDelta}`
        );
      }

      if (out.academicCreditsDelta) {
        this.gameState.adjustVariable(
          'academicCredits',
          out.academicCreditsDelta,
          'academic_system',
          out.oneTimeEventId
        );
        summaryParts.push(
          `學分 ${out.academicCreditsDelta > 0 ? `+${out.academicCreditsDelta}` : out.academicCreditsDelta}`
        );
      }

      if (out.experimentCorruptionDelta) {
        this.gameState.adjustVariable(
          'experimentCorruption',
          out.experimentCorruptionDelta,
          'story_director',
          out.oneTimeEventId
        );
        summaryParts.push(
          `侵蝕度 ${out.experimentCorruptionDelta > 0 ? `+${out.experimentCorruptionDelta}` : out.experimentCorruptionDelta}`
        );
      }

      if (out.injuryCountDelta) {
        this.gameState.adjustVariable(
          'injuryCount',
          out.injuryCountDelta,
          'combat_system',
          out.oneTimeEventId
        );
        summaryParts.push(
          `重傷 ${out.injuryCountDelta > 0 ? `+${out.injuryCountDelta}` : out.injuryCountDelta}`
        );
      }

      // 3. 授予新證據
      if (out.grantEvidenceId) {
        const evRes = this.evidenceSystem.collectEvidence(out.grantEvidenceId);
        if (evRes.definition) {
          summaryParts.push(`獲得證據【${evRes.definition.name}】`);
        }
      }

      // 4. 授予背包物品
      if (out.grantItemId && onGrantItem) {
        onGrantItem(out.grantItemId);
        summaryParts.push(`獲得關鍵物品`);
      }

      // 5. 識破錯誤線索
      if (out.debunkRedHerring) {
        const debRes = this.evidenceSystem.debunkRedHerring(
          out.debunkRedHerring.redHerringId,
          out.debunkRedHerring.counterEvidenceId
        );
        if (debRes.success) {
          summaryParts.push(`成功識破錯誤線索！`);
        }
      }

      // 6. 任務推進與角色覺醒重算
      const latestEvIds = this.evidenceSystem
        .getAllCollectedRecords()
        .map((r) => r.id);
      this.relationshipSystem.evaluateAndAwakenCharacter(
        this.activePlacement.characterId,
        latestEvIds
      );

      if (out.startQuestId) {
        this.questSystem.startQuest(out.startQuestId, activeFlags);
      }
      if (out.completeQuestId) {
        this.questSystem.completeQuest(out.completeQuestId, activeFlags);
      }
      this.questSystem.evaluateAndSyncQuests(activeFlags);
    } else if (alreadyCompleted) {
      summaryParts.push('（此對話事件已觸發過，不重複計算獎勵）');
    }

    const updatedCharState = this.relationshipSystem.getCharacterState(
      this.activePlacement.characterId
    );
    const updatedChoices = this.evaluateChoicesForPlacement(
      this.activePlacement,
      activeFlags,
      currentTimePhase
    );

    this.isInChoiceResponse = true;
    const outcomeSummary =
      summaryParts.length > 0 ? `✦ ${summaryParts.join(' | ')}` : '';

    this.activeSession = {
      ...this.activeSession,
      affinity: updatedCharState.affinity,
      trust: updatedCharState.trust,
      tier: updatedCharState.tier,
      isAwakened: updatedCharState.isAwakened,
      lines: [...choice.responseLines],
      currentLineIndex: 0,
      availableChoices: updatedChoices,
      showingChoices: false,
      outcomeSummary,
    };

    globalEventBus.emit(GameEvents.NPC_DIALOGUE_UPDATED, this.getActiveSession());
    return {
      success: true,
      alreadyCompleted,
      outcomeSummary,
      session: this.getActiveSession(),
    };
  }

  public closeDialogue(): void {
    this.activePlacement = null;
    this.activeSession = null;
    this.isInChoiceResponse = false;
    globalEventBus.emit(GameEvents.NPC_DIALOGUE_UPDATED, null);
  }

  public closeSession(): void {
    this.closeDialogue();
  }

  /**
   * 評估該 NPC 在目前證據、好感、信任與時段下可顯示的對話選項
   */
  public evaluateChoicesForPlacement(
    placement: NPCScenePlacementDef,
    activeFlags: string[] = [],
    currentTimePhase: CampusTimePhase = 'day'
  ): Array<{
    choice: NPCDialogueChoiceDef;
    alreadyCompleted: boolean;
    unlockedByEvidence: boolean;
  }> {
    const charState = this.relationshipSystem.getCharacterState(
      placement.characterId
    );
    const flagSet = new Set(activeFlags);
    const result: Array<{
      choice: NPCDialogueChoiceDef;
      alreadyCompleted: boolean;
      unlockedByEvidence: boolean;
    }> = [];

    for (const choice of placement.choices) {
      const cond = choice.condition;
      let unlockedByEvidence = false;

      if (cond) {
        if (
          cond.minAffinity !== undefined &&
          charState.affinity < cond.minAffinity
        ) {
          continue;
        }
        if (cond.minTrust !== undefined && charState.trust < cond.minTrust) {
          continue;
        }
        if (
          cond.requiredTimePhase !== undefined &&
          cond.requiredTimePhase !== currentTimePhase
        ) {
          continue;
        }
        if (cond.requiredFlags && cond.requiredFlags.length > 0) {
          if (!cond.requiredFlags.every((f) => flagSet.has(f))) {
            continue;
          }
        }
        if (cond.requiredEvidenceIds && cond.requiredEvidenceIds.length > 0) {
          const allPresent = cond.requiredEvidenceIds.every((evId) =>
            this.evidenceSystem.hasEvidence(evId)
          );
          if (!allPresent) {
            continue;
          }
          unlockedByEvidence = true;
        }
      }

      result.push({
        choice,
        alreadyCompleted: this.completedChoiceIds.has(choice.id),
        unlockedByEvidence,
      });
    }

    return result;
  }
}

export const globalNPCInteractionSystem = new NPCInteractionSystem(
  globalGameState,
  globalRelationshipSystem,
  globalEvidenceSystem,
  globalQuestSystem
);
