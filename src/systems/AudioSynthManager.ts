import { AUDIO_SETTINGS_STORAGE_KEY } from './SaveManager';
import type { AudioSettingsData } from '../types';

/**
 * 原創程序化合成背景音樂與音效管理系統 (AudioSynthManager)
 *
 * 1. 遵循瀏覽器自動播放政策：在首次使用者互動 (`unlockByUserGesture`) 之前，絕不假設音訊可自動播放，也不會在背景未授權時強制啟動 Oscillator。
 * 2. 提供可獨立調整並持久化的「背景音樂音量 (bgmVolume)」、「音效音量 (sfxVolume)」與「靜音開關 (muted)」。
 * 3. 原創可循環播放的懸疑校園背景音樂 (Looping Ambient BGM Sequence)。
 * 4. 完整涵蓋要求的 7 大類音效：
 *    - 腳步 (`playFootstep`)
 *    - 跳躍 (`playJump`)
 *    - 攻擊 (`playAttack`)
 *    - 格擋 (`playBlock`)
 *    - 互動 / 拾取 (`playUiClick`, `playItemPickup`)
 *    - 開門 (`playDoorOpen`)
 *    - 神祕訊息演出 (`playAnomalyGlitchStinger`)
 */
export class AudioSynthManager {
  private ctx: AudioContext | null = null;
  private unlockedByGesture = false;

  private settings: AudioSettingsData = {
    bgmVolume: 0.45,
    sfxVolume: 0.7,
    muted: false,
  };

  private bgmIntervalId: ReturnType<typeof setInterval> | null = null;
  private bgmStepIndex = 0;
  private isBgmRequested = false;

  private lastFootstepAtMs = 0;
  private gestureListenersAttached = false;

  constructor() {
    this.loadPersistedAudioSettings();
  }

  /**
   * 註冊全域首次互動解鎖監聽（僅在使用者實際按下按鍵或點擊滑鼠後才解鎖 Web Audio）
   */
  public attachUserGestureUnlock(win: Window = window): void {
    if (this.gestureListenersAttached || typeof win === 'undefined') return;
    this.gestureListenersAttached = true;

    const unlockHandler = () => {
      this.unlockByUserGesture();
    };

    win.addEventListener('pointerdown', unlockHandler, { passive: true });
    win.addEventListener('keydown', unlockHandler, { passive: true });
  }

  public unlockByUserGesture(): void {
    this.unlockedByGesture = true;
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (this.isBgmRequested && !this.bgmIntervalId) {
      this.startBgmLoopInternal();
    }
  }

  public isAudioUnlocked(): boolean {
    return this.unlockedByGesture;
  }

  public getSettings(): AudioSettingsData {
    return { ...this.settings };
  }

  public setBgmVolume(volume: number): void {
    this.settings.bgmVolume = Math.max(0, Math.min(1, Number(volume.toFixed(2))));
    this.persistAudioSettings();
  }

  public setSfxVolume(volume: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, Number(volume.toFixed(2))));
    this.persistAudioSettings();
  }

  public setMuted(muted: boolean): void {
    this.settings.muted = Boolean(muted);
    this.persistAudioSettings();
  }

  public adjustBgmVolume(delta: number): number {
    this.setBgmVolume(this.settings.bgmVolume + delta);
    return this.settings.bgmVolume;
  }

  public adjustSfxVolume(delta: number): number {
    this.setSfxVolume(this.settings.sfxVolume + delta);
    return this.settings.sfxVolume;
  }

  /**
   * 啟動可循環播放的原創懸疑校園背景音樂 (Looping Ambient BGM)
   * 若使用者尚未進行首次互動，會記錄 `isBgmRequested = true` 並在首次點擊/按鍵時自動平滑開始播放。
   */
  public startLoopingBgm(): void {
    this.isBgmRequested = true;
    if (!this.unlockedByGesture) {
      return;
    }
    this.startBgmLoopInternal();
  }

  public stopLoopingBgm(): void {
    this.isBgmRequested = false;
    if (this.bgmIntervalId !== null) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  private startBgmLoopInternal(): void {
    if (this.bgmIntervalId !== null) return;

    // A 小調 / 減五度陰暗校園鋼琴與低音氛圍分解和弦 (原創程序化音序)
    const melodyNotesHz = [
      220.0, // A3
      261.63, // C4
      329.63, // E4
      311.13, // D#4
      220.0, // A3
      246.94, // B3
      293.66, // D4
      261.63, // C4
    ];
    const bassNotesHz = [110.0, 110.0, 130.81, 123.47, 110.0, 98.0, 116.54, 110.0];

    this.bgmIntervalId = setInterval(() => {
      if (this.settings.muted || this.settings.bgmVolume <= 0) return;
      const ctx = this.getActiveContext();
      if (!ctx) return;

      const idx = this.bgmStepIndex % melodyNotesHz.length;
      this.bgmStepIndex += 1;

      try {
        const now = ctx.currentTime;
        const vol = this.settings.bgmVolume * 0.08;

        // 懸疑高音音符
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(melodyNotesHz[idx], now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.85);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.88);

        // 每兩拍疊加低音 Drone
        if (idx % 2 === 0) {
          const bassOsc = ctx.createOscillator();
          const bassGain = ctx.createGain();
          bassOsc.type = 'triangle';
          bassOsc.frequency.setValueAtTime(bassNotesHz[idx], now);
          bassGain.gain.setValueAtTime(0.001, now);
          bassGain.gain.linearRampToValueAtTime(vol * 0.75, now + 0.15);
          bassGain.gain.exponentialRampToValueAtTime(0.0008, now + 1.6);
          bassOsc.connect(bassGain);
          bassGain.connect(ctx.destination);
          bassOsc.start(now);
          bassOsc.stop(now + 1.65);
        }
      } catch {
        // 忽略音訊節點例外
      }
    }, 900);
  }

  // ==========================================================================
  // 7 大類遊戲音效 (Footstep, Jump, Attack, Block, Interact/Pickup, Door, Anomaly)
  // ==========================================================================

  /**
   * 1. 腳步音效 (`playFootstep`) — 附帶節流間隔避免每幀重複觸發
   */
  public playFootstep(nowMs: number = Date.now()): void {
    if (nowMs - this.lastFootstepAtMs < 250) return;
    this.lastFootstepAtMs = nowMs;

    const ctx = this.getActiveContext();
    const vol = this.getEffectiveSfxGain(0.06);
    if (!ctx || vol <= 0) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(135, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.045);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.055);
    } catch {}
  }

  /**
   * 2. 跳躍音效 (`playJump`)
   */
  public playJump(): void {
    const ctx = this.getActiveContext();
    const vol = this.getEffectiveSfxGain(0.09);
    if (!ctx || vol <= 0) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(430, now + 0.11);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.125);
    } catch {}
  }

  /**
   * 3. 攻擊揮擊音效 (`playAttack`)
   */
  public playAttack(): void {
    const ctx = this.getActiveContext();
    const vol = this.getEffectiveSfxGain(0.11);
    if (!ctx || vol <= 0) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.09);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  /**
   * 4. 格擋架盾音效 (`playBlock`)
   */
  public playBlock(): void {
    const ctx = this.getActiveContext();
    const vol = this.getEffectiveSfxGain(0.09);
    if (!ctx || vol <= 0) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.setValueAtTime(320, now + 0.03);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.085);
    } catch {}
  }

  /**
   * 5. 互動 / UI 點擊與拾取音效 (`playUiClick`, `playItemPickup`)
   */
  public playUiClick(): void {
    const ctx = this.getActiveContext();
    const vol = this.getEffectiveSfxGain(0.08);
    if (!ctx || vol <= 0) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.06);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch {}
  }

  public playItemPickup(): void {
    const ctx = this.getActiveContext();
    const vol = this.getEffectiveSfxGain(0.11);
    if (!ctx || vol <= 0) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(660, now + 0.07);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    } catch {}
  }

  /**
   * 6. 開門 / 場景切換木門聲 (`playDoorOpen`)
   */
  public playDoorOpen(): void {
    const ctx = this.getActiveContext();
    const vol = this.getEffectiveSfxGain(0.1);
    if (!ctx || vol <= 0) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.linearRampToValueAtTime(195, now + 0.12);
      osc.frequency.linearRampToValueAtTime(120, now + 0.24);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } catch {}
  }

  /**
   * 7. 神祕訊息演出「新生已完成觀察」低頻懸疑共鳴音效 (`playAnomalyGlitchStinger`)
   */
  public playAnomalyGlitchStinger(): void {
    const ctx = this.getActiveContext();
    const vol = this.getEffectiveSfxGain(0.07);
    if (!ctx || vol <= 0) return;

    try {
      const now = ctx.currentTime;
      const freqs = [110, 116.5, 233];
      for (const f of freqs) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.linearRampToValueAtTime(f * 0.85, now + 0.55);

        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.62);
      }
    } catch {}
  }

  /**
   * 8. 「18.9Hz 第四聲鐘響」心理聲學拍頻轉譯音效 (`playFourthBellChime`)
   * 依據 AUDIO_DESIGN.md：以 56.7Hz (18.9×3) 與 75.6Hz (18.9×4) 差頻產生 18.9Hz 拍頻脈衝
   */
  public playFourthBellChime(): void {
    const ctx = this.getActiveContext();
    const vol = this.getEffectiveSfxGain(0.08);
    if (!ctx || vol <= 0) return;

    try {
      const now = ctx.currentTime;
      const beatFreqs = [56.7, 75.6, 220];
      for (const f of beatFreqs) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = f < 100 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.78);
      }
    } catch {}
  }

  /**
   * 9. 陸子軒「逆相抗頻音叉」清澈泛音 (`playCounterPhaseChime`)
   */
  public playCounterPhaseChime(): void {
    const ctx = this.getActiveContext();
    const vol = this.getEffectiveSfxGain(0.09);
    if (!ctx || vol <= 0) return;

    try {
      const now = ctx.currentTime;
      const freqs = [528, 880];
      for (const f of freqs) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.48);
      }
    } catch {}
  }

  // ==========================================================================
  // 內部工具方法
  // ==========================================================================

  private getEffectiveSfxGain(baseGain: number): number {
    if (this.settings.muted || this.settings.sfxVolume <= 0) return 0;
    return baseGain * this.settings.sfxVolume;
  }

  private getActiveContext(): AudioContext | null {
    // 重要：若使用者尚未進行任何首次互動，絕不強制啟動 AudioContext
    if (!this.unlockedByGesture || this.settings.muted) return null;
    return this.ensureContext();
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  private loadPersistedAudioSettings(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AudioSettingsData>;
      if (typeof parsed.bgmVolume === 'number') {
        this.settings.bgmVolume = Math.max(0, Math.min(1, parsed.bgmVolume));
      }
      if (typeof parsed.sfxVolume === 'number') {
        this.settings.sfxVolume = Math.max(0, Math.min(1, parsed.sfxVolume));
      }
      if (typeof parsed.muted === 'boolean') {
        this.settings.muted = parsed.muted;
      }
    } catch {
      // 忽略損毀設定
    }
  }

  private persistAudioSettings(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(
        AUDIO_SETTINGS_STORAGE_KEY,
        JSON.stringify(this.settings)
      );
    } catch {}
  }
}

export const globalAudioSynth = new AudioSynthManager();
