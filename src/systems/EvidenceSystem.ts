import { EVIDENCE_CATALOG, EVIDENCE_LIST } from '../data/evidenceCatalog';
import {
  CollectedEvidenceRecord,
  EvidenceCategory,
  EvidenceDefinition,
  EvidenceImportance,
  Phase6ASaveState,
} from '../types';
import { GameEvents, globalEventBus } from '../core/EventBus';
import { GlobalGameState, globalGameState } from './GlobalGameState';

export interface EvidenceQueryFilter {
  category?: EvidenceCategory;
  discoveredAreaId?: string;
  importance?: EvidenceImportance;
  isAnalyzed?: boolean;
  isRedHerring?: boolean;
  isDebunked?: boolean;
}

export interface EvidenceCollectionResult {
  success: boolean;
  newlyCollected: boolean;
  definition?: EvidenceDefinition;
  record?: CollectedEvidenceRecord;
  evidenceCompletion: number;
  reason?: 'not_found' | 'already_collected';
}

export interface EvidenceAnalysisResult {
  success: boolean;
  newlyAnalyzed: boolean;
  definition?: EvidenceDefinition;
  record?: CollectedEvidenceRecord;
  evidenceCompletion: number;
  reason?: 'not_collected' | 'not_found' | 'requires_counter_evidence';
}

export interface RedHerringDebunkResult {
  success: boolean;
  newlyDebunked: boolean;
  redHerringId: string;
  counterEvidenceId: string;
  evidenceCompletion: number;
  reason?:
    | 'not_found'
    | 'not_red_herring'
    | 'red_herring_not_collected'
    | 'counter_evidence_not_collected'
    | 'wrong_counter_evidence';
}

/**
 * 《無名校區》Phase 6A — EvidenceSystem (證據與錯誤線索系統)
 *
 * 負責：
 * 1. 管理所有證據之唯一 ID、名稱、類型、來源物件、發現區域、描述、重要程度、收集時間、是否已分析、是否為錯誤線索 (Red Herring)。
 * 2. 防止重複收集同一證據，並防止同一事件重複觸發加分。
 * 3. 支援條件查詢與分類篩選。
 * 4. 支援證據深度分析與錯誤線索識破 (Debunking via Counter-Evidence) 或誤信懲罰。
 * 5. 自動計算 `evidenceCompletion` (0~100) 並同步至 `GlobalGameState`。
 */
export class EvidenceSystem {
  private readonly gameState: GlobalGameState;
  private records: Map<string, CollectedEvidenceRecord> = new Map();
  private triggeredEventIds: Set<string> = new Set();

  constructor(gameState: GlobalGameState = globalGameState) {
    this.gameState = gameState;
  }

  /**
   * 取得證據靜態定義
   */
  public getDefinition(evidenceId: string): EvidenceDefinition | undefined {
    return EVIDENCE_CATALOG[evidenceId];
  }

  /**
   * 取得全部證據靜態定義清單
   */
  public getAllDefinitions(): EvidenceDefinition[] {
    return [...EVIDENCE_LIST];
  }

  /**
   * 檢查是否已收集指定證據
   */
  public hasEvidence(evidenceId: string): boolean {
    return this.records.has(evidenceId);
  }

  /**
   * 檢查指定證據是否已完成分析（若為錯誤線索，需已識破才算有效分析）
   */
  public isEvidenceAnalyzed(evidenceId: string): boolean {
    const rec = this.records.get(evidenceId);
    return Boolean(rec?.isAnalyzed);
  }

  /**
   * 檢查指定錯誤線索是否已被識破
   */
  public isRedHerringDebunked(evidenceId: string): boolean {
    const rec = this.records.get(evidenceId);
    return Boolean(rec?.isDebunked);
  }

  /**
   * 取得單筆已收集證據紀錄（凍結副本）
   */
  public getCollectedRecord(evidenceId: string): Readonly<CollectedEvidenceRecord> | undefined {
    const rec = this.records.get(evidenceId);
    return rec ? Object.freeze({ ...rec }) : undefined;
  }

  /**
   * 取得所有已收集證據紀錄
   */
  public getAllCollectedRecords(): ReadonlyArray<Readonly<CollectedEvidenceRecord>> {
    return Object.freeze(
      Array.from(this.records.values()).map((r) => Object.freeze({ ...r }))
    );
  }

  /**
   * 收集證據（具備防重複收集保護）
   */
  public collectEvidence(
    evidenceId: string,
    collectedAtIso: string = new Date().toISOString()
  ): EvidenceCollectionResult {
    const def = EVIDENCE_CATALOG[evidenceId];
    if (!def) {
      return {
        success: false,
        newlyCollected: false,
        evidenceCompletion: this.calculateEvidenceCompletion(),
        reason: 'not_found',
      };
    }

    const existing = this.records.get(evidenceId);
    if (existing) {
      return {
        success: true,
        newlyCollected: false,
        definition: def,
        record: Object.freeze({ ...existing }),
        evidenceCompletion: this.calculateEvidenceCompletion(),
        reason: 'already_collected',
      };
    }

    const newRecord: CollectedEvidenceRecord = {
      id: evidenceId,
      collectedAtIso,
      isAnalyzed: false,
      isDebunked: false,
    };

    this.records.set(evidenceId, newRecord);
    const completion = this.syncEvidenceCompletionToGlobalState(
      `collect_evidence:${evidenceId}`
    );

    globalEventBus.emit(GameEvents.EVIDENCE_UPDATED, {
      evidenceId,
      action: 'collected',
      evidenceCompletion: completion,
    });

    return {
      success: true,
      newlyCollected: true,
      definition: def,
      record: Object.freeze({ ...newRecord }),
      evidenceCompletion: completion,
    };
  }

  /**
   * 分析已收集的一般證據（若為 Red Herring，需透過 debunkRedHerring 識破）
   */
  public analyzeEvidence(evidenceId: string): EvidenceAnalysisResult {
    const def = EVIDENCE_CATALOG[evidenceId];
    if (!def) {
      return {
        success: false,
        newlyAnalyzed: false,
        evidenceCompletion: this.calculateEvidenceCompletion(),
        reason: 'not_found',
      };
    }

    const rec = this.records.get(evidenceId);
    if (!rec) {
      return {
        success: false,
        newlyAnalyzed: false,
        definition: def,
        evidenceCompletion: this.calculateEvidenceCompletion(),
        reason: 'not_collected',
      };
    }

    if (def.isRedHerring && !rec.isDebunked) {
      return {
        success: false,
        newlyAnalyzed: false,
        definition: def,
        record: Object.freeze({ ...rec }),
        evidenceCompletion: this.calculateEvidenceCompletion(),
        reason: 'requires_counter_evidence',
      };
    }

    if (rec.isAnalyzed) {
      return {
        success: true,
        newlyAnalyzed: false,
        definition: def,
        record: Object.freeze({ ...rec }),
        evidenceCompletion: this.calculateEvidenceCompletion(),
      };
    }

    rec.isAnalyzed = true;
    const completion = this.syncEvidenceCompletionToGlobalState(
      `analyze_evidence:${evidenceId}`
    );

    globalEventBus.emit(GameEvents.EVIDENCE_UPDATED, {
      evidenceId,
      action: 'analyzed',
      evidenceCompletion: completion,
    });

    return {
      success: true,
      newlyAnalyzed: true,
      definition: def,
      record: Object.freeze({ ...rec }),
      evidenceCompletion: completion,
    };
  }

  /**
   * 使用反證識破錯誤線索 (Red Herring)
   */
  public debunkRedHerring(
    redHerringId: string,
    counterEvidenceId: string
  ): RedHerringDebunkResult {
    const def = EVIDENCE_CATALOG[redHerringId];
    if (!def) {
      return {
        success: false,
        newlyDebunked: false,
        redHerringId,
        counterEvidenceId,
        evidenceCompletion: this.calculateEvidenceCompletion(),
        reason: 'not_found',
      };
    }

    if (!def.isRedHerring) {
      return {
        success: false,
        newlyDebunked: false,
        redHerringId,
        counterEvidenceId,
        evidenceCompletion: this.calculateEvidenceCompletion(),
        reason: 'not_red_herring',
      };
    }

    const rhRecord = this.records.get(redHerringId);
    if (!rhRecord) {
      return {
        success: false,
        newlyDebunked: false,
        redHerringId,
        counterEvidenceId,
        evidenceCompletion: this.calculateEvidenceCompletion(),
        reason: 'red_herring_not_collected',
      };
    }

    if (!this.records.has(counterEvidenceId)) {
      return {
        success: false,
        newlyDebunked: false,
        redHerringId,
        counterEvidenceId,
        evidenceCompletion: this.calculateEvidenceCompletion(),
        reason: 'counter_evidence_not_collected',
      };
    }

    if (def.counterEvidenceId !== counterEvidenceId) {
      return {
        success: false,
        newlyDebunked: false,
        redHerringId,
        counterEvidenceId,
        evidenceCompletion: this.calculateEvidenceCompletion(),
        reason: 'wrong_counter_evidence',
      };
    }

    if (rhRecord.isDebunked) {
      return {
        success: true,
        newlyDebunked: false,
        redHerringId,
        counterEvidenceId,
        evidenceCompletion: this.calculateEvidenceCompletion(),
      };
    }

    rhRecord.isDebunked = true;
    rhRecord.isAnalyzed = true;

    const completion = this.syncEvidenceCompletionToGlobalState(
      `debunk_red_herring:${redHerringId}`
    );

    globalEventBus.emit(GameEvents.EVIDENCE_UPDATED, {
      evidenceId: redHerringId,
      action: 'debunked',
      evidenceCompletion: completion,
    });

    return {
      success: true,
      newlyDebunked: true,
      redHerringId,
      counterEvidenceId,
      evidenceCompletion: completion,
    };
  }

  /**
   * 若玩家未查驗反證而誤信錯誤線索並採取行動（對應 MAIN_STORY.md 第五節懲罰機制）
   * 同一錯誤線索誤信事件僅觸發一次
   */
  public triggerRedHerringTrap(redHerringId: string): {
    triggered: boolean;
    corporateAlertDelta: number;
    experimentCorruptionDelta: number;
  } {
    const trapEventKey = `trap:${redHerringId}`;
    if (this.triggeredEventIds.has(trapEventKey)) {
      return {
        triggered: false,
        corporateAlertDelta: 0,
        experimentCorruptionDelta: 0,
      };
    }

    const def = EVIDENCE_CATALOG[redHerringId];
    const rec = this.records.get(redHerringId);
    if (!def || !def.isRedHerring || rec?.isDebunked) {
      return {
        triggered: false,
        corporateAlertDelta: 0,
        experimentCorruptionDelta: 0,
      };
    }

    this.triggeredEventIds.add(trapEventKey);

    const corporateAlertDelta = 15;
    const experimentCorruptionDelta = 10;

    this.gameState.batchUpdate(
      {
        corporateAlert: this.gameState.getValue('corporateAlert') + corporateAlertDelta,
        experimentCorruption:
          this.gameState.getValue('experimentCorruption') + experimentCorruptionDelta,
      },
      'evidence_system',
      `red_herring_trap:${redHerringId}`
    );

    return {
      triggered: true,
      corporateAlertDelta,
      experimentCorruptionDelta,
    };
  }

  /**
   * 條件查詢與篩選已收集的證據
   */
  public queryCollectedEvidence(
    filter: EvidenceQueryFilter = {}
  ): Array<{ definition: EvidenceDefinition; record: CollectedEvidenceRecord }> {
    const results: Array<{
      definition: EvidenceDefinition;
      record: CollectedEvidenceRecord;
    }> = [];

    for (const [id, rec] of this.records.entries()) {
      const def = EVIDENCE_CATALOG[id];
      if (!def) continue;

      if (filter.category !== undefined && def.category !== filter.category) {
        continue;
      }
      if (
        filter.discoveredAreaId !== undefined &&
        def.discoveredAreaId !== filter.discoveredAreaId
      ) {
        continue;
      }
      if (filter.importance !== undefined && def.importance !== filter.importance) {
        continue;
      }
      if (filter.isAnalyzed !== undefined && rec.isAnalyzed !== filter.isAnalyzed) {
        continue;
      }
      if (filter.isRedHerring !== undefined && def.isRedHerring !== filter.isRedHerring) {
        continue;
      }
      if (filter.isDebunked !== undefined && rec.isDebunked !== filter.isDebunked) {
        continue;
      }

      results.push({
        definition: def,
        record: { ...rec },
      });
    }

    return results;
  }

  /**
   * 計算總體證據完整度 `evidenceCompletion` (0 ~ 100)
   *
   * 計算規則：
   * - 所有非錯誤線索提供 `baseWeight` (收集時獲得) + `analysisBonusWeight` (分析後獲得)
   * - 錯誤線索收集時 `baseWeight = 0`（不提供正分），但識破後可獲得 `analysisBonusWeight` 獎勵分
   * - 分母為所有真實證據的 (baseWeight + analysisBonusWeight) 加上所有錯誤線索識破獎勵分之總和
   */
  public calculateEvidenceCompletion(): number {
    let totalMaxPoints = 0;
    let earnedPoints = 0;

    for (const def of EVIDENCE_LIST) {
      if (def.isRedHerring) {
        totalMaxPoints += def.analysisBonusWeight;
      } else {
        totalMaxPoints += def.baseWeight + def.analysisBonusWeight;
      }

      const rec = this.records.get(def.id);
      if (!rec) continue;

      if (def.isRedHerring) {
        if (rec.isDebunked) {
          earnedPoints += def.analysisBonusWeight;
        }
      } else {
        earnedPoints += def.baseWeight;
        if (rec.isAnalyzed) {
          earnedPoints += def.analysisBonusWeight;
        }
      }
    }

    if (totalMaxPoints <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((earnedPoints / totalMaxPoints) * 100)));
  }

  /**
   * 將計算出的 `evidenceCompletion` 同步至 `GlobalGameState`
   */
  public syncEvidenceCompletionToGlobalState(reason: string = 'evidence_sync'): number {
    const completion = this.calculateEvidenceCompletion();
    this.gameState.setVariable(
      'evidenceCompletion',
      completion,
      'evidence_system',
      reason
    );
    return completion;
  }

  /**
   * 匯出供 SaveManager 序列化的資料結構
   */
  public serialize(): Phase6ASaveState['evidence'] {
    return {
      records: Array.from(this.records.values()).map((r) => ({ ...r })),
      triggeredEventIds: Array.from(this.triggeredEventIds),
    };
  }

  /**
   * 從存檔還原狀態
   */
  public restoreFromSave(
    saved?: Phase6ASaveState['evidence'],
    legacyClueAndItemIds: string[] = []
  ): void {
    this.records.clear();
    this.triggeredEventIds.clear();

    if (saved && Array.isArray(saved.records)) {
      for (const rec of saved.records) {
        if (rec && typeof rec.id === 'string' && EVIDENCE_CATALOG[rec.id]) {
          this.records.set(rec.id, {
            id: rec.id,
            collectedAtIso:
              typeof rec.collectedAtIso === 'string'
                ? rec.collectedAtIso
                : new Date().toISOString(),
            isAnalyzed: Boolean(rec.isAnalyzed),
            isDebunked: Boolean(rec.isDebunked),
          });
        }
      }
      if (Array.isArray(saved.triggeredEventIds)) {
        for (const evtId of saved.triggeredEventIds) {
          if (typeof evtId === 'string') {
            this.triggeredEventIds.add(evtId);
          }
        }
      }
    }

    // 相容既有 Demo V2 存檔：若舊存檔已有線索或物品，確保自動納入證據系統
    for (const id of legacyClueAndItemIds) {
      if (EVIDENCE_CATALOG[id] && !this.records.has(id)) {
        this.records.set(id, {
          id,
          collectedAtIso: new Date().toISOString(),
          isAnalyzed: false,
          isDebunked: false,
        });
      }
    }

    this.syncEvidenceCompletionToGlobalState('restore_from_save');
  }

  /**
   * 重置系統狀態
   */
  public reset(): void {
    this.records.clear();
    this.triggeredEventIds.clear();
    this.syncEvidenceCompletionToGlobalState('evidence_reset');
  }
}

export const globalEvidenceSystem = new EvidenceSystem(globalGameState);
