import { GameEvents, globalEventBus } from '../core/EventBus';
import type {
  FormalEndingId,
  GlobalGameVariables,
  GlobalStateAuthSource,
  GlobalStateChangeNotification,
  GlobalVariableKey,
  IEndingEvaluatorExtension,
} from '../types';

export const DEFAULT_GLOBAL_VARIABLES: Readonly<GlobalGameVariables> = Object.freeze({
  evidenceCompletion: 0,
  injuryCount: 0,
  studentAffinity: 20,
  studentTrust: 10,
  corporateAlert: 0,
  experimentCorruption: 0,
  publicExposure: 0,
  academicCredits: 60,
});

const VARIABLE_BOUNDS: Record<GlobalVariableKey, { min: number; max: number }> = {
  evidenceCompletion: { min: 0, max: 100 },
  injuryCount: { min: 0, max: 99 },
  studentAffinity: { min: 0, max: 100 },
  studentTrust: { min: 0, max: 100 },
  corporateAlert: { min: 0, max: 100 },
  experimentCorruption: { min: 0, max: 100 },
  publicExposure: { min: 0, max: 100 },
  academicCredits: { min: 0, max: 100 },
};

const VALID_AUTH_SOURCES = new Set<GlobalStateAuthSource>([
  'system_init',
  'relationship_system',
  'evidence_system',
  'quest_system',
  'combat_system',
  'academic_system',
  'story_director',
  'save_restore',
  'dev_inspector',
]);

type StateChangeListener = (notification: GlobalStateChangeNotification) => void;

/**
 * Phase 6A (A) — 正式版全域遊戲狀態管理模組 (GlobalGameState)
 *
 * 負責：
 * 1. 管理 8 大核心全域變數 (evidenceCompletion, injuryCount, studentAffinity, studentTrust, corporateAlert, experimentCorruption, publicExposure, academicCredits)。
 * 2. 嚴格型別與非法數值防護 (攔截 NaN/Infinity、限制上下界並正規化為整數)。
 * 3. 防止未授權任意修改：getSnapshot() 回傳凍結淺拷貝 (Object.freeze)，且所有修改必須提供合法的 GlobalStateAuthSource。
 * 4. 支援狀態變更訂閱通知與 EventBus 廣播。
 * 5. 提供 SaveManager 序列化/還原介面，並預留未來 EndingEvaluator 評估介面。
 */
export class GlobalGameState implements IEndingEvaluatorExtension {
  private defaults: GlobalGameVariables;
  private state: GlobalGameVariables;
  private listeners = new Set<StateChangeListener>();
  private customEndingHook?: IEndingEvaluatorExtension;

  constructor(customDefaults?: Partial<GlobalGameVariables>) {
    this.defaults = this.sanitizePartialState(
      { ...DEFAULT_GLOBAL_VARIABLES, ...customDefaults },
      DEFAULT_GLOBAL_VARIABLES
    );
    this.state = { ...this.defaults };
  }

  /**
   * 讀取當前全域狀態的唯讀凍結快照（防止外部直接竄改內部狀態物件）
   */
  public getSnapshot(): Readonly<GlobalGameVariables> {
    return Object.freeze({ ...this.state });
  }

  public getValue(key: GlobalVariableKey): number {
    if (!(key in VARIABLE_BOUNDS)) {
      throw new Error(`Invalid GlobalVariableKey: "${String(key)}"`);
    }
    return this.state[key];
  }

  /**
   * 設定單一全域變數（需具備合法授權來源，並自動過濾非法數值與限制範圍）
   */
  public setVariable(
    key: GlobalVariableKey,
    value: number,
    source: GlobalStateAuthSource,
    reason?: string
  ): Readonly<GlobalGameVariables> {
    this.assertAuthorizedSource(source);
    return this.batchUpdate({ [key]: value }, source, reason);
  }

  /**
   * 以差值增減單一全域變數
   */
  public adjustVariable(
    key: GlobalVariableKey,
    delta: number,
    source: GlobalStateAuthSource,
    reason?: string
  ): Readonly<GlobalGameVariables> {
    this.assertAuthorizedSource(source);
    if (typeof delta !== 'number' || !Number.isFinite(delta)) {
      return this.getSnapshot();
    }
    const nextVal = this.state[key] + delta;
    return this.batchUpdate({ [key]: nextVal }, source, reason);
  }

  /**
   * 批次更新多個全域變數並發送單次變更通知
   */
  public batchUpdate(
    updates: Partial<GlobalGameVariables>,
    source: GlobalStateAuthSource,
    reason?: string
  ): Readonly<GlobalGameVariables> {
    this.assertAuthorizedSource(source);
    if (!updates || typeof updates !== 'object') {
      return this.getSnapshot();
    }

    const previous = { ...this.state };
    const changedKeys: GlobalVariableKey[] = [];

    for (const rawKey of Object.keys(updates)) {
      if (!(rawKey in VARIABLE_BOUNDS)) {
        throw new Error(`Unauthorized or unknown global state key: "${rawKey}"`);
      }
      const key = rawKey as GlobalVariableKey;
      const rawValue = updates[key];
      if (rawValue === undefined) continue;

      const sanitized = this.sanitizeSingleValue(key, rawValue, this.state[key]);
      if (sanitized !== this.state[key]) {
        this.state[key] = sanitized;
        changedKeys.push(key);
      }
    }

    if (changedKeys.length > 0) {
      const notification: GlobalStateChangeNotification = {
        source,
        changedKeys,
        previous,
        current: { ...this.state },
        reason,
      };
      this.notifyListeners(notification);
    }

    return this.getSnapshot();
  }

  /**
   * 重設回初始預設值
   */
  public reset(
    source: GlobalStateAuthSource = 'system_init',
    reason = 'Reset to defaults'
  ): Readonly<GlobalGameVariables> {
    this.assertAuthorizedSource(source);
    return this.batchUpdate({ ...this.defaults }, source, reason);
  }

  public onChange(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 匯出供 SaveManager 儲存的純資料結構
   */
  public toSaveData(): GlobalGameVariables {
    return { ...this.state };
  }

  /**
   * 從 SaveManager 還原狀態（自動修補缺漏或越界數值）
   */
  public restoreFromSaveData(
    savedVars?: Partial<GlobalGameVariables> | null
  ): Readonly<GlobalGameVariables> {
    if (!savedVars || typeof savedVars !== 'object') {
      return this.reset('save_restore', 'Restore fallback defaults');
    }
    const sanitized = this.sanitizePartialState(savedVars, this.defaults);
    return this.batchUpdate(sanitized, 'save_restore', 'Restore from save payload');
  }

  // ==========================================================================
  // 預留給 Phase 8 EndingEvaluator 的擴充介面 (依據 ENDING_DESIGN.md 優先序 1 -> 5)
  // ==========================================================================

  public registerEndingEvaluatorHook(hook: IEndingEvaluatorExtension): void {
    this.customEndingHook = hook;
  }

  public evaluatePreviewEnding(
    vars: GlobalGameVariables = this.state,
    flags: string[] = []
  ): FormalEndingId {
    if (this.customEndingHook) {
      return this.customEndingHook.evaluatePreviewEnding(vars, flags);
    }

    const flagSet = new Set(flags);

    // Priority 1: E 結局（觀察者 — 隱藏結局）
    if (
      vars.evidenceCompletion >= 85 &&
      vars.experimentCorruption >= 70 &&
      flagSet.has('flag_kyoka_patient_zero_found') &&
      flagSet.has('flag_yulan_all_tapes_collected')
    ) {
      return 'ending_e_observer';
    }

    // Priority 2: C 結局（群體反抗／攻佔結局）
    if (
      vars.studentAffinity >= 75 &&
      vars.studentTrust >= 80 &&
      vars.publicExposure >= 65 &&
      vars.injuryCount <= 3 &&
      vars.experimentCorruption < 50
    ) {
      return 'ending_c_mass_uprising';
    }

    // Priority 3: A 結局（真相大白）
    if (
      vars.evidenceCompletion >= 80 &&
      vars.publicExposure >= 75 &&
      vars.experimentCorruption < 60
    ) {
      return 'ending_a_truth_revealed';
    }

    // Priority 4: B 結局（血色校園）
    if (
      vars.corporateAlert >= 80 &&
      (vars.injuryCount >= 5 || vars.studentTrust < 50)
    ) {
      return 'ending_b_blood_campus';
    }

    // Priority 5: D 結局（無名者）
    return 'ending_d_nameless_one';
  }

  // ==========================================================================
  // 內部驗證與正規化工具
  // ==========================================================================

  private assertAuthorizedSource(source: GlobalStateAuthSource): void {
    if (!source || !VALID_AUTH_SOURCES.has(source)) {
      throw new Error(
        `Unauthorized GlobalGameState mutation attempt from source: "${String(source)}"`
      );
    }
  }

  private sanitizeSingleValue(
    key: GlobalVariableKey,
    rawValue: unknown,
    fallbackValue: number
  ): number {
    if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
      return fallbackValue;
    }
    const { min, max } = VARIABLE_BOUNDS[key];
    const clamped = Math.max(min, Math.min(max, Math.round(rawValue)));
    return clamped;
  }

  private sanitizePartialState(
    partial: Partial<GlobalGameVariables>,
    fallback: Readonly<GlobalGameVariables>
  ): GlobalGameVariables {
    const result = { ...fallback };
    for (const key of Object.keys(VARIABLE_BOUNDS) as GlobalVariableKey[]) {
      if (key in partial && partial[key] !== undefined) {
        result[key] = this.sanitizeSingleValue(key, partial[key], fallback[key]);
      }
    }
    return result;
  }

  private notifyListeners(notification: GlobalStateChangeNotification): void {
    for (const listener of this.listeners) {
      listener(notification);
    }
    globalEventBus.emit(GameEvents.GLOBAL_STATE_CHANGED, notification);
  }
}

export const globalGameState = new GlobalGameState();
