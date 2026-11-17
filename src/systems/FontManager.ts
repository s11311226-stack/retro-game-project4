import type Phaser from 'phaser';
import {
  PRIMARY_CJK_FONT_FAMILY,
  TYPOGRAPHY_SPECS,
  type TypographyPresetKey,
  type TypographyStyleSpec,
} from '../config/TypographyConfig';

export interface CrispTextOverrides {
  color?: string;
  backgroundColor?: string;
  fontSize?: string;
  fontStyle?: string;
  wordWrapWidth?: number;
  wordWrap?: {
    width: number;
    useAdvancedWrap?: boolean;
  };
  lineSpacing?: number;
  padding?: { x: number; y: number };
  align?: 'left' | 'center' | 'right';
}

/**
 * 《無名校區》正式版字體與清晰渲染管理器 (FontManager)
 *
 * 負責：
 * 1. 確保繁體中文字體 (Noto Sans TC / Noto Sans CJK TC) 載入與回退完整性。
 * 2. 提供符合 640×360 邏輯解析度規範的高清晰度文字樣式（強制至少 12px，主要對話/名稱 16–18px，選單/文件 14–16px）。
 * 3. 解決 Phaser `pixelArt: true` 導致 Canvas 文字低解析度鋸齒與模糊問題：透過高倍超取樣 (`resolution: 3`) 與線性平滑貼圖過濾，確保繁體中文筆畫清晰銳利。
 * 4. 提供長文件自動分段與可捲動分頁計算 (`paginateDocumentContent`)，防止長文字超出視窗。
 */
export class FontManager {
  private fontLoaded = false;

  public getPrimaryFontFamily(): string {
    return PRIMARY_CJK_FONT_FAMILY;
  }

  public getPresetSpec(preset: TypographyPresetKey): TypographyStyleSpec {
    return {
      ...TYPOGRAPHY_SPECS[preset],
      padding: { ...TYPOGRAPHY_SPECS[preset].padding },
    };
  }

  /**
   * 驗證所有預設字體尺寸是否嚴格符合 Phase 6B 規範（>= 12px，對話/角色名 16-18px，選單/文件 14-16px）
   */
  public validateTypographyStandards(): {
    valid: boolean;
    details: Record<TypographyPresetKey, number>;
  } {
    const details = {} as Record<TypographyPresetKey, number>;
    let valid = true;

    for (const key of Object.keys(TYPOGRAPHY_SPECS) as TypographyPresetKey[]) {
      const px = TYPOGRAPHY_SPECS[key].fontSizePx;
      details[key] = px;
      if (px < 12) {
        valid = false;
      }
    }

    if (
      details.dialogueBody < 16 ||
      details.dialogueBody > 18 ||
      details.speakerName < 16 ||
      details.speakerName > 18 ||
      details.menuItem < 14 ||
      details.menuItem > 16 ||
      details.documentBody < 14 ||
      details.documentBody > 16 ||
      details.importantPrompt < 16 ||
      details.secondaryHint < 12
    ) {
      valid = false;
    }

    return { valid, details };
  }

  /**
   * 建構 Phaser.Types.GameObjects.Text.TextStyle，內建高解析度超取樣與防裁切內距
   */
  public buildPhaserTextStyle(
    preset: TypographyPresetKey,
    overrides: CrispTextOverrides = {}
  ): Phaser.Types.GameObjects.Text.TextStyle {
    const spec = TYPOGRAPHY_SPECS[preset];
    const dpr =
      typeof window !== 'undefined' && window.devicePixelRatio
        ? Math.max(2, Math.min(4, Math.ceil(window.devicePixelRatio * 1.5)))
        : spec.resolution;

    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: spec.fontFamily,
      fontSize: overrides.fontSize ?? spec.fontSize,
      fontStyle: overrides.fontStyle ?? spec.fontStyle,
      color: overrides.color ?? spec.color,
      backgroundColor: overrides.backgroundColor ?? spec.backgroundColor,
      lineSpacing: overrides.lineSpacing ?? spec.lineSpacing,
      padding: overrides.padding ?? spec.padding,
      resolution: Math.max(spec.resolution, dpr),
      align: overrides.align,
    };

    if (overrides.wordWrap) {
      style.wordWrap = {
        width: overrides.wordWrap.width,
        useAdvancedWrap: overrides.wordWrap.useAdvancedWrap ?? true,
      };
    } else if (overrides.wordWrapWidth !== undefined) {
      style.wordWrap = {
        width: overrides.wordWrapWidth,
        useAdvancedWrap: true,
      };
    }

    return style;
  }

  /**
   * 在 Phaser Scene 中建立高清晰度繁體中文 Text 物件，並為文字貼圖開啟平滑過濾以避免像素鋸齒破字
   */
  public createCrispText(
    scene: Phaser.Scene,
    x: number,
    y: number,
    content: string,
    preset: TypographyPresetKey,
    overrides: CrispTextOverrides = {}
  ): Phaser.GameObjects.Text {
    const style = this.buildPhaserTextStyle(preset, overrides);
    const textObj = scene.add.text(x, y, content, style);
    this.enhanceTextTextureClarity(textObj);
    return textObj;
  }

  /**
   * 確保 Phaser Text 物件在 pixelArt 模式下仍使用高解析度平滑抗鋸齒渲染
   */
  public enhanceTextTextureClarity(textObj: Phaser.GameObjects.Text): void {
    try {
      if (textObj.texture && typeof textObj.texture.setFilter === 'function') {
        // FilterMode.LINEAR = 0 in Phaser
        textObj.texture.setFilter(0);
      }
    } catch {
      // Headless / test environment fallback
    }
  }

  /**
   * 預先觸發瀏覽器字體載入與測量流程，確保 Noto Sans TC 於文字建立前完成載入
   */
  public async ensureFontsReady(): Promise<boolean> {
    if (this.fontLoaded) return true;
    try {
      if (typeof document !== 'undefined' && 'fonts' in document) {
        await Promise.race([
          Promise.allSettled([
            document.fonts.load('12px "Noto Sans TC"'),
            document.fonts.load('16px "Noto Sans TC"'),
            document.fonts.load('bold 16px "Noto Sans TC"'),
            document.fonts.load('17px "Noto Sans TC"'),
            document.fonts.load('26px "Noto Sans TC"'),
            document.fonts.ready,
          ]),
          new Promise((resolve) => setTimeout(resolve, 1200)),
        ]);
      }
      this.fontLoaded = true;
      return true;
    } catch {
      this.fontLoaded = true;
      return false;
    }
  }

  /**
   * 取得字體清晰度展示畫面 (Font Showcase) 測試資料
   */
  public getShowcaseData(): {
    cjkRareAndComplex: string;
    sampleStorySentence: string;
    punctuationAndNumbers: string;
    contrastPresets: Array<{ label: string; size: string; preset: TypographyPresetKey }>;
  } {
    return {
      cjkRareAndComplex:
        '體議鐘學廳藥難聽讀護處階實驗秘密靈魂霧警濁鑑響隱藏迴廊檔案席位研發順從遺忘',
      sampleStorySentence:
        '1968年白川財閥以私人教育慈善基金名義購置後山校舍，表面興辦私立高中，地底暗中挖掘三層秘密設施進行「回聲搖籃計畫」，黃昏第四聲鐘響共振18.9Hz次聲波，使師生對失蹤者產生群體遺忘。',
      punctuationAndNumbers:
        '0123456789 ＋－×÷＝％ ！？。，、；：「」『』（）《》【】——……',
      contrastPresets: [
        { label: '標題大字 (26px)', size: '26px', preset: 'mainTitle' },
        { label: '角色名稱 (17px)', size: '17px', preset: 'speakerName' },
        { label: '對白正文 (16px)', size: '16px', preset: 'dialogueBody' },
        { label: '選單項目 (16px)', size: '16px', preset: 'menuItem' },
        { label: '文件內容 (16px)', size: '16px', preset: 'documentBody' },
        { label: '重要提示 (16px)', size: '16px', preset: 'importantPrompt' },
        { label: '次要提示 (12px)', size: '12px', preset: 'secondaryHint' },
      ],
    };
  }

  /**
   * 將長文件內容依行數與字元寬度自動拆分為可捲動的分頁區塊，確保長文字絕不超出視窗高度
   */
  public paginateDocumentContent(
    pages: string[],
    maxCharsPerLine = 32,
    maxLinesPerView = 6
  ): string[] {
    const wrappedLines: string[] = [];

    for (let pIdx = 0; pIdx < pages.length; pIdx++) {
      const rawParagraphs = pages[pIdx].split('\n');
      for (const para of rawParagraphs) {
        const trimmed = para.trimEnd();
        if (trimmed.length === 0) {
          wrappedLines.push('');
          continue;
        }
        for (let i = 0; i < trimmed.length; i += maxCharsPerLine) {
          wrappedLines.push(trimmed.slice(i, i + maxCharsPerLine));
        }
      }
      if (pIdx < pages.length - 1) {
        wrappedLines.push('');
      }
    }

    while (
      wrappedLines.length > 0 &&
      wrappedLines[wrappedLines.length - 1] === ''
    ) {
      wrappedLines.pop();
    }

    if (wrappedLines.length === 0) {
      return ['（無內容）'];
    }

    const chunks: string[] = [];
    for (let i = 0; i < wrappedLines.length; i += maxLinesPerView) {
      chunks.push(wrappedLines.slice(i, i + maxLinesPerView).join('\n'));
    }

    return chunks;
  }
}

export const globalFontManager = new FontManager();
