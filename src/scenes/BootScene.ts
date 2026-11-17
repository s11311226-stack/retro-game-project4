import Phaser from 'phaser';
import { globalFontManager } from '../systems/FontManager';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public async create(): Promise<void> {
    // 確保中文字體 (Noto Sans TC) 在進入主選單建立文字前完成載入，杜絕預設字型跳動與排版模糊
    await globalFontManager.ensureFontsReady();

    // 啟動主選單場景 (可選擇開始新遊戲、讀取存檔繼續、調整音量或進入字體檢驗展示)
    this.scene.start('MainMenuScene');
  }
}
