import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../config/playerConfig';
import { getAreaDefinition } from '../data/campusAreas';
import { DEMO_CHAPTER_TITLE } from '../data/storyScript';
import { globalAudioSynth } from '../systems/AudioSynthManager';
import { globalRelationshipSystem } from '../systems/CharacterRelationshipSystem';
import { globalEvidenceSystem } from '../systems/EvidenceSystem';
import { globalExplorationState } from '../systems/ExplorationStateManager';
import { globalGameState } from '../systems/GlobalGameState';
import { globalQuestSystem } from '../systems/QuestSystem';
import { globalSaveManager } from '../systems/SaveManager';
import { globalStoryState } from '../systems/StoryStateManager';

/**
 * 體驗版主選單場景 (MainMenuScene)
 *
 * 提供：
 * 1. 「開始新遊戲（重新開始體驗版）」與「讀取存檔繼續遊戲」
 * 2. 存檔狀態檢測（若存檔有效顯示上次儲存位置與時間，若損毀或無存檔則清楚提示）
 * 3. 可調整的背景音樂音量 (BGM)、音效音量 (SFX) 與靜音開關
 * 4. 遵循瀏覽器首次互動後才啟動音訊的規範
 */
export class MainMenuScene extends Phaser.Scene {
  private saveInfoText!: Phaser.GameObjects.Text;
  private continueBtnText!: Phaser.GameObjects.Text;
  private audioStatusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  public create(): void {
    // 停止平行 UI 覆蓋層（進入實際探索場景時再啟動）
    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }

    globalAudioSynth.attachUserGestureUnlock(window);
    globalAudioSynth.startLoopingBgm();

    // 1. 繪製陰暗校區背景與月光剪影
    const g = this.add.graphics();
    g.fillStyle(0x070a12, 1);
    g.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // 遠景校舍屋頂與高窗剪影
    g.fillStyle(0x0f172a, 1);
    g.fillRect(60, 96, LOGICAL_WIDTH - 120, 220);
    g.lineStyle(2, 0x1e293b, 1);
    g.strokeRect(60, 96, LOGICAL_WIDTH - 120, 220);

    // 主標題與章節副標題
    this.add
      .text(LOGICAL_WIDTH / 2, 52, '無 名 校 區', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    this.add
      .text(
        LOGICAL_WIDTH / 2,
        82,
        `UNNAMED CAMPUS — ${DEMO_CHAPTER_TITLE}`,
        {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#fcd34d',
        }
      )
      .setOrigin(0.5);

    // 2. 開始新遊戲按鈕
    const startNewBtn = this.add
      .text(
        LOGICAL_WIDTH / 2,
        132,
        '▶ 開始新遊戲 (New Demo Session) [Enter / 點擊]',
        {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#fef08a',
          backgroundColor: '#1e293b',
          padding: { x: 14, y: 7 },
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startNewBtn.on('pointerdown', () => {
      globalAudioSynth.unlockByUserGesture();
      globalAudioSynth.playUiClick();
      this.startNewGame();
    });

    // 3. 讀取存檔繼續遊戲按鈕
    this.continueBtnText = this.add
      .text(LOGICAL_WIDTH / 2, 174, '📂 讀取存檔繼續 (Continue Saved Game)', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#93c5fd',
        backgroundColor: '#0f172a',
        padding: { x: 14, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.continueBtnText.on('pointerdown', () => {
      globalAudioSynth.unlockByUserGesture();
      this.continueFromSave();
    });

    // 存檔詳細狀態列
    this.saveInfoText = this.add
      .text(LOGICAL_WIDTH / 2, 204, '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    // 4. 音樂與音效音量控制面板
    this.createAudioControlsPanel();

    // 5. 底部操作與授權說明
    this.add
      .text(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT - 16,
        '640x360 Pixel Integer Scale | 原創程序化合成 BGM & SFX | 首次點擊或按鍵後啟用音訊',
        {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#64748b',
        }
      )
      .setOrigin(0.5);

    // 鍵盤快捷鍵支援 (Enter/Space 開始新遊戲，C 讀取存檔)
    this.input.keyboard?.on('keydown-ENTER', () => {
      globalAudioSynth.unlockByUserGesture();
      globalAudioSynth.playUiClick();
      this.startNewGame();
    });
    this.input.keyboard?.on('keydown-C', () => {
      globalAudioSynth.unlockByUserGesture();
      this.continueFromSave();
    });

    this.refreshSaveStatusDisplay();
    this.refreshAudioStatusDisplay();
  }

  private createAudioControlsPanel(): void {
    this.audioStatusText = this.add
      .text(LOGICAL_WIDTH / 2, 244, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#a7f3d0',
      })
      .setOrigin(0.5);

    const btnStyle = {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#e2e8f0',
      backgroundColor: '#334155',
      padding: { x: 7, y: 4 },
    };

    const bgmDown = this.add
      .text(LOGICAL_WIDTH / 2 - 200, 272, '[BGM -]', btnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const bgmUp = this.add
      .text(LOGICAL_WIDTH / 2 - 130, 272, '[BGM +]', btnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const sfxDown = this.add
      .text(LOGICAL_WIDTH / 2 - 30, 272, '[SFX -]', btnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const sfxUp = this.add
      .text(LOGICAL_WIDTH / 2 + 40, 272, '[SFX +]', btnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const muteBtn = this.add
      .text(LOGICAL_WIDTH / 2 + 155, 272, '[靜音切換 Mute]', btnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    bgmDown.on('pointerdown', () => {
      globalAudioSynth.unlockByUserGesture();
      globalAudioSynth.adjustBgmVolume(-0.1);
      globalAudioSynth.playUiClick();
      this.refreshAudioStatusDisplay();
    });
    bgmUp.on('pointerdown', () => {
      globalAudioSynth.unlockByUserGesture();
      globalAudioSynth.adjustBgmVolume(0.1);
      globalAudioSynth.playUiClick();
      this.refreshAudioStatusDisplay();
    });
    sfxDown.on('pointerdown', () => {
      globalAudioSynth.unlockByUserGesture();
      globalAudioSynth.adjustSfxVolume(-0.1);
      globalAudioSynth.playUiClick();
      this.refreshAudioStatusDisplay();
    });
    sfxUp.on('pointerdown', () => {
      globalAudioSynth.unlockByUserGesture();
      globalAudioSynth.adjustSfxVolume(0.1);
      globalAudioSynth.playUiClick();
      this.refreshAudioStatusDisplay();
    });
    muteBtn.on('pointerdown', () => {
      globalAudioSynth.unlockByUserGesture();
      const cur = globalAudioSynth.getSettings().muted;
      globalAudioSynth.setMuted(!cur);
      globalAudioSynth.playUiClick();
      this.refreshAudioStatusDisplay();
    });
  }

  private refreshSaveStatusDisplay(): void {
    const loadRes = globalSaveManager.loadAndValidateSave();
    if (loadRes.success && loadRes.data) {
      const area = getAreaDefinition(loadRes.data.player.areaId);
      const clueCount = loadRes.data.exploration.clueIds.length;
      const itemCount = loadRes.data.exploration.inventoryItemIds.length;
      const migTag = loadRes.migratedFromLegacy ? ' (已自舊版存檔升級)' : '';
      this.saveInfoText.setText(
        `✓ 偵測到有效存檔 (v${loadRes.data.schemaVersion})${migTag}：位於【${area.title}】 | 物品:${itemCount} | 線索:${clueCount}`
      );
      this.saveInfoText.setColor('#4ade80');
      this.continueBtnText.setAlpha(1);
    } else if (loadRes.reason === 'no_save') {
      this.saveInfoText.setText('（目前尚無存檔紀錄，請點擊「開始新遊戲」）');
      this.saveInfoText.setColor('#94a3b8');
      this.continueBtnText.setAlpha(0.5);
    } else {
      this.saveInfoText.setText(
        `⚠️ 存檔檢查異常 (${loadRes.reason})：已拒絕載入損毀或不相容資料，請開始新遊戲`
      );
      this.saveInfoText.setColor('#f87171');
      this.continueBtnText.setAlpha(0.5);
    }
  }

  private refreshAudioStatusDisplay(): void {
    const s = globalAudioSynth.getSettings();
    const bgmPct = Math.round(s.bgmVolume * 100);
    const sfxPct = Math.round(s.sfxVolume * 100);
    const muteStr = s.muted ? '🔇 已靜音 (MUTED)' : '🔊 音訊啟用';
    this.audioStatusText.setText(
      `音訊設定：${muteStr} | 音樂音量 (BGM): ${bgmPct}% | 音效音量 (SFX): ${sfxPct}%`
    );
  }

  private startNewGame(): void {
    globalExplorationState.resetSession('school_gate', 'initial_spawn');
    globalStoryState.resetStoryState();
    globalGameState.reset('system_init', 'New game started from main menu');
    globalRelationshipSystem.reset();
    globalEvidenceSystem.reset();
    globalQuestSystem.reset();
    this.scene.launch('UIScene');
    this.scene.start('SchoolGateScene', { spawnId: 'initial_spawn' });
  }

  private continueFromSave(): void {
    const loadRes = globalSaveManager.loadAndValidateSave();
    if (!loadRes.success || !loadRes.data) {
      globalAudioSynth.playAnomalyGlitchStinger();
      this.refreshSaveStatusDisplay();
      return;
    }

    globalAudioSynth.playDoorOpen();
    const restoredLoc = globalSaveManager.applySaveToManagers(
      loadRes.data,
      globalExplorationState,
      globalStoryState
    );
    const targetArea = getAreaDefinition(restoredLoc.areaId);

    this.scene.launch('UIScene');
    this.scene.start(targetArea.sceneKey, {
      spawnId: restoredLoc.spawnId,
      restoredX: restoredLoc.x,
      restoredY: restoredLoc.y,
      restoredFacing: restoredLoc.facing,
    });
  }
}
