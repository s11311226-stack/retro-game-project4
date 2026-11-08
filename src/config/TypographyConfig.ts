/**
 * 《無名校區》(Nameless Campus) — 正式版字體與排版規範設定 (TypographyConfig)
 *
 * 設計基準：640×360 邏輯解析度
 * 優先字體：Noto Sans TC / Noto Sans CJK TC
 *
 * 字體尺寸規範：
 * - 主要對話文字 (dialogueBody): 16px (16–18px)
 * - 角色名稱 (speakerName): 17px (16–18px)
 * - 選單文字 (menuItem): 15px (14–16px)
 * - 文件內容 (documentBody): 14px (14–16px)
 * - 次要提示 (secondaryHint): 12px (>= 12px)
 * - 重要提示 / 標題 (importantPrompt): 16px (>= 16px)
 */

export const PRIMARY_CJK_FONT_FAMILY =
  "'Noto Sans TC', 'Noto Sans CJK TC', 'Source Han Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif";

export type TypographyPresetKey =
  | 'mainTitle'
  | 'menuTitle'
  | 'speakerName'
  | 'dialogueBody'
  | 'menuItem'
  | 'documentTitle'
  | 'documentBody'
  | 'importantPrompt'
  | 'secondaryHint'
  | 'hudBadge';

export interface TypographyStyleSpec {
  fontFamily: string;
  fontSizePx: number;
  fontSize: string;
  fontStyle?: string;
  color: string;
  lineSpacing: number;
  resolution: number;
  padding: { x: number; y: number };
  backgroundColor?: string;
}

export const TYPOGRAPHY_SPECS: Record<TypographyPresetKey, TypographyStyleSpec> = {
  mainTitle: {
    fontFamily: PRIMARY_CJK_FONT_FAMILY,
    fontSizePx: 26,
    fontSize: '26px',
    fontStyle: 'bold',
    color: '#f8fafc',
    lineSpacing: 6,
    resolution: 3,
    padding: { x: 6, y: 4 },
  },
  menuTitle: {
    fontFamily: PRIMARY_CJK_FONT_FAMILY,
    fontSizePx: 26,
    fontSize: '26px',
    fontStyle: 'bold',
    color: '#f8fafc',
    lineSpacing: 6,
    resolution: 3,
    padding: { x: 6, y: 4 },
  },
  speakerName: {
    fontFamily: PRIMARY_CJK_FONT_FAMILY,
    fontSizePx: 17,
    fontSize: '17px',
    fontStyle: 'bold',
    color: '#fcd34d',
    lineSpacing: 4,
    resolution: 3,
    padding: { x: 4, y: 3 },
  },
  dialogueBody: {
    fontFamily: PRIMARY_CJK_FONT_FAMILY,
    fontSizePx: 16,
    fontSize: '16px',
    color: '#f8fafc',
    lineSpacing: 6,
    resolution: 3,
    padding: { x: 4, y: 3 },
  },
  menuItem: {
    fontFamily: PRIMARY_CJK_FONT_FAMILY,
    fontSizePx: 15,
    fontSize: '15px',
    fontStyle: 'bold',
    color: '#fef08a',
    lineSpacing: 5,
    resolution: 3,
    padding: { x: 10, y: 5 },
  },
  documentTitle: {
    fontFamily: PRIMARY_CJK_FONT_FAMILY,
    fontSizePx: 16,
    fontSize: '16px',
    fontStyle: 'bold',
    color: '#fde68a',
    lineSpacing: 5,
    resolution: 3,
    padding: { x: 4, y: 3 },
  },
  documentBody: {
    fontFamily: PRIMARY_CJK_FONT_FAMILY,
    fontSizePx: 14,
    fontSize: '14px',
    color: '#fef3c7',
    lineSpacing: 6,
    resolution: 3,
    padding: { x: 4, y: 3 },
  },
  importantPrompt: {
    fontFamily: PRIMARY_CJK_FONT_FAMILY,
    fontSizePx: 16,
    fontSize: '16px',
    fontStyle: 'bold',
    color: '#fef08a',
    lineSpacing: 5,
    resolution: 3,
    padding: { x: 8, y: 4 },
  },
  secondaryHint: {
    fontFamily: PRIMARY_CJK_FONT_FAMILY,
    fontSizePx: 12,
    fontSize: '12px',
    color: '#cbd5e1',
    lineSpacing: 4,
    resolution: 3,
    padding: { x: 4, y: 2 },
  },
  hudBadge: {
    fontFamily: PRIMARY_CJK_FONT_FAMILY,
    fontSizePx: 12,
    fontSize: '12px',
    fontStyle: 'bold',
    color: '#f8fafc',
    lineSpacing: 3,
    resolution: 3,
    padding: { x: 5, y: 2 },
  },
};
