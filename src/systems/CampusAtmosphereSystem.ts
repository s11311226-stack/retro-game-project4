import { GameEvents, globalEventBus } from '../core/EventBus';
import type { CampusTimePhase } from '../types';
import { globalAudioSynth } from './AudioSynthManager';
import { EvidenceSystem, globalEvidenceSystem } from './EvidenceSystem';
import { GlobalGameState, globalGameState } from './GlobalGameState';

export interface AtmospherePhaseConfig {
  phase: CampusTimePhase;
  label: string;
  clockText: string;
  ambientTintHex: number;
  ambientAlpha: number;
  tintColor: number;
  tintAlpha: number;
  description: string;
}

export type AtmosphereLightingProfile = AtmospherePhaseConfig;

export const ATMOSPHERE_PHASES: Record<CampusTimePhase, AtmospherePhaseConfig> = {
  day: {
    phase: 'day',
    label: '日間（正常校園生活）',
    clockText: '14:20 第一至第三聲鐘響',
    ambientTintHex: 0x0ea5e9,
    ambientAlpha: 0.0,
    tintColor: 0x0ea5e9,
    tintAlpha: 0.0,
    description:
      '表面平靜的寄宿校園日常。師生正常上課，適合收集公開證言與維持學業學分。',
  },
  dusk: {
    phase: 'dusk',
    label: '黃昏（18.9Hz 第四聲鐘響）',
    clockText: '17:55 第四聲低頻鐘響',
    ambientTintHex: 0xd97706,
    ambientAlpha: 0.14,
    tintColor: 0xd97706,
    tintAlpha: 0.14,
    description:
      '全校廣播敲響第四聲鐘響，18.9Hz 次聲波共鳴啟動，認知過濾網籠罩校區。',
  },
  night: {
    phase: 'night',
    label: '夜間（校園封鎖與潛行調查）',
    clockText: '22:30 門禁封鎖時段',
    ambientTintHex: 0x1e1b4b,
    ambientAlpha: 0.22,
    tintColor: 0x1e1b4b,
    tintAlpha: 0.22,
    description:
      '一般學生進入高順從睡眠，走廊與行政區進入夜間封鎖，可深入機密處室調查。',
  },
};

export interface TimePhaseTransitionOptions {
  playBellAudio?: boolean;
  hasCounterPhaseChime?: boolean;
}

/**
 * 《無名校區》Phase 6B — 日夜與 18.9Hz 校園氣氛系統 (CampusAtmosphereSystem)
 *
 * 負責：
 * 1. 管理日間 (day)、黃昏 18.9Hz 第四聲鐘響 (dusk)、夜間封鎖 (night) 三階段時段切換。
 * 2. 當進入黃昏「18.9Hz 第四聲鐘響」時，若玩家尚未持有《蘇雨晴的殘響八音盒（18.9Hz 逆向抗頻音叉）》，會微幅增加實驗侵蝕度（具備防濫用保護）；若已持有則自動抵消！
 * 3. 提供環境光影濾鏡參數與時段事件通知。
 */
export class CampusAtmosphereSystem {
  private readonly gameState: GlobalGameState;
  private readonly evidenceSystem: EvidenceSystem;
  private currentPhase: CampusTimePhase = 'day';
  private fourthBellTriggeredCount = 0;

  constructor(
    gameState: GlobalGameState = globalGameState,
    evidenceSystem: EvidenceSystem = globalEvidenceSystem
  ) {
    this.gameState = gameState;
    this.evidenceSystem = evidenceSystem;
  }

  public reset(): void {
    this.currentPhase = 'day';
    this.fourthBellTriggeredCount = 0;
  }

  public restoreFromSave(savedPhase?: CampusTimePhase): void {
    if (savedPhase === 'day' || savedPhase === 'dusk' || savedPhase === 'night') {
      this.currentPhase = savedPhase;
    } else {
      this.currentPhase = 'day';
    }
  }

  public getCurrentPhase(): CampusTimePhase {
    return this.currentPhase;
  }

  public getPhaseConfig(
    phase: CampusTimePhase = this.currentPhase
  ): AtmospherePhaseConfig {
    return { ...ATMOSPHERE_PHASES[phase] };
  }

  public getCurrentProfile(
    phase: CampusTimePhase = this.currentPhase
  ): AtmosphereLightingProfile {
    return this.getPhaseConfig(phase);
  }

  /**
   * 切換或推進校園時段（日間 -> 黃昏 18.9Hz 第四聲鐘響 -> 夜間 -> 日間）
   */
  public setTimePhase(
    nextPhase: CampusTimePhase,
    optionsOrPlayAudio: boolean | TimePhaseTransitionOptions = true
  ): {
    previousPhase: CampusTimePhase;
    currentPhase: CampusTimePhase;
    config: AtmospherePhaseConfig;
    counterPhaseProtected: boolean;
    protectedByCounterChime: boolean;
    fourthBellTriggered: boolean;
    bannerMessage: string;
    message: string;
  } {
    const playBellAudio =
      typeof optionsOrPlayAudio === 'boolean'
        ? optionsOrPlayAudio
        : (optionsOrPlayAudio.playBellAudio ?? true);
    const extraChimeFlag =
      typeof optionsOrPlayAudio === 'object'
        ? Boolean(optionsOrPlayAudio.hasCounterPhaseChime)
        : false;

    const previousPhase = this.currentPhase;
    this.currentPhase = nextPhase;
    const config = this.getPhaseConfig(nextPhase);

    const hasCounterWaveBox =
      extraChimeFlag ||
      this.evidenceSystem.hasEvidence('ev_su_yuqing_music_box_189hz') ||
      this.evidenceSystem.hasEvidence('item_yulan_tuning_fork');

    let bannerMessage = `🕒 時段切換：【${config.label}】(${config.clockText})`;
    const fourthBellTriggered = nextPhase === 'dusk';

    if (nextPhase === 'dusk') {
      this.fourthBellTriggeredCount += 1;
      if (playBellAudio) {
        if (hasCounterWaveBox) {
          globalAudioSynth.playCounterPhaseChime();
        } else {
          globalAudioSynth.playFourthBellChime();
        }
      }

      if (hasCounterWaveBox) {
        bannerMessage =
          '🔔 18.9Hz 第四聲鐘響響起——《逆向抗頻音叉／殘響八音盒》發出逆向相位波，成功抵消認知過濾侵蝕！';
      } else {
        // 僅在前三次黃昏鐘響且未持有音叉/八音盒時微幅累積侵蝕度，避免無限疊加
        if (this.fourthBellTriggeredCount <= 3) {
          this.gameState.adjustVariable(
            'experimentCorruption',
            4,
            'story_director',
            '18.9Hz Fourth Bell Chime exposure'
          );
        }
        bannerMessage =
          '🔔 18.9Hz 第四聲鐘響迴盪全校！低頻共振令眼角浮現黑影（實驗侵蝕度 +4，可至頂樓找陸子軒取得逆相音叉抵消）';
      }
    } else if (nextPhase === 'night') {
      bannerMessage =
        '🌙 校園進入夜間封鎖時段：燈光轉為昏暗，教務處、禁書室與頂樓的秘密浮現。';
    } else if (nextPhase === 'day') {
      bannerMessage =
        '☀️ 晨鐘響起，校園恢復表面正常的日間課堂秩序。';
    }

    globalEventBus.emit(GameEvents.TIME_PHASE_CHANGED, {
      phase: nextPhase,
      config,
      profile: config,
      bannerMessage,
      message: bannerMessage,
    });

    return {
      previousPhase,
      currentPhase: nextPhase,
      config,
      counterPhaseProtected: hasCounterWaveBox,
      protectedByCounterChime: hasCounterWaveBox,
      fourthBellTriggered,
      bannerMessage,
      message: bannerMessage,
    };
  }

  public transitionToPhase(
    nextPhase: CampusTimePhase,
    optionsOrPlayAudio: boolean | TimePhaseTransitionOptions = true
  ) {
    return this.setTimePhase(nextPhase, optionsOrPlayAudio);
  }

  public cycleNextPhase(
    optionsOrPlayAudio: boolean | TimePhaseTransitionOptions = true
  ) {
    const order: CampusTimePhase[] = ['day', 'dusk', 'night'];
    const idx = order.indexOf(this.currentPhase);
    const nextPhase = order[(idx + 1) % order.length];
    return this.setTimePhase(nextPhase, optionsOrPlayAudio);
  }
}

export const globalCampusAtmosphere = new CampusAtmosphereSystem(
  globalGameState,
  globalEvidenceSystem
);
