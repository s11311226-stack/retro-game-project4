import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_GLOBAL_VARIABLES,
  GlobalGameState,
} from '../src/systems/GlobalGameState';
import type { GlobalStateAuthSource } from '../src/types';

describe('Phase 6A (A) — 全域遊戲狀態管理 (GlobalGameState) 單元測試', () => {
  let state: GlobalGameState;

  beforeEach(() => {
    state = new GlobalGameState();
  });

  it('1. 預設值合理且可自訂初始化，並支援讀取、批次更新與重設', () => {
    const snap = state.getSnapshot();
    expect(snap).toEqual(DEFAULT_GLOBAL_VARIABLES);
    expect(state.getValue('academicCredits')).toBe(60);
    expect(state.getValue('studentAffinity')).toBe(20);
    expect(state.getValue('studentTrust')).toBe(10);

    // 更新單一與多個變數
    state.setVariable('evidenceCompletion', 45, 'evidence_system');
    state.adjustVariable('injuryCount', 2, 'combat_system');
    state.batchUpdate(
      {
        publicExposure: 70,
        corporateAlert: 35,
      },
      'quest_system'
    );

    expect(state.getValue('evidenceCompletion')).toBe(45);
    expect(state.getValue('injuryCount')).toBe(2);
    expect(state.getValue('publicExposure')).toBe(70);
    expect(state.getValue('corporateAlert')).toBe(35);

    // 重設回預設值
    state.reset('system_init');
    expect(state.getSnapshot()).toEqual(DEFAULT_GLOBAL_VARIABLES);
  });

  it('2. 非法數值防護：自動限制上下界 (Clamp) 並拒絕 NaN / Infinity 污染', () => {
    // 超過上限與低於下限應被 Clamp
    state.setVariable('evidenceCompletion', 999, 'evidence_system');
    expect(state.getValue('evidenceCompletion')).toBe(100);

    state.setVariable('academicCredits', -50, 'academic_system');
    expect(state.getValue('academicCredits')).toBe(0);

    state.setVariable('injuryCount', 150, 'combat_system');
    expect(state.getValue('injuryCount')).toBe(99);

    // 傳入 NaN 或 Infinity 應保留原有效值，不污染狀態
    state.setVariable('evidenceCompletion', Number.NaN, 'evidence_system');
    expect(state.getValue('evidenceCompletion')).toBe(100);

    state.adjustVariable('evidenceCompletion', Number.POSITIVE_INFINITY, 'evidence_system');
    expect(state.getValue('evidenceCompletion')).toBe(100);
  });

  it('3. 防止未授權的任意修改：凍結快照不可竄改，且非法授權來源或未知欄位會拋出錯誤', () => {
    const snap = state.getSnapshot() as Record<string, number>;
    expect(() => {
      snap.evidenceCompletion = 100;
    }).toThrow();
    expect(state.getValue('evidenceCompletion')).toBe(0);

    // 未授權的來源字串必須被阻擋
    expect(() => {
      state.setVariable(
        'evidenceCompletion',
        50,
        'hacker_script' as unknown as GlobalStateAuthSource
      );
    }).toThrow(/Unauthorized GlobalGameState mutation attempt/);

    // 未知欄位必須被阻擋
    expect(() => {
      state.batchUpdate(
        { unknownHackKey: 123 } as unknown as Record<string, number>,
        'system_init'
      );
    }).toThrow(/Unauthorized or unknown global state key/);
  });

  it('4. 支援狀態變更通知與未來 EndingEvaluator 預覽判定介面', () => {
    const changes: string[][] = [];
    const unsub = state.onChange((notif) => {
      changes.push(notif.changedKeys);
    });

    state.batchUpdate(
      {
        studentAffinity: 80,
        studentTrust: 85,
        publicExposure: 70,
        injuryCount: 1,
        experimentCorruption: 20,
      },
      'relationship_system'
    );

    expect(changes.length).toBe(1);
    expect(changes[0]).toContain('studentAffinity');
    expect(state.evaluatePreviewEnding()).toBe('ending_c_mass_uprising');

    unsub();
  });
});
