import { EvidenceDefinition } from '../types';

/**
 * 《無名校區》正式版證據與錯誤線索 (Red Herring) 完整資料庫
 * 完整對應 docs/production/MAIN_STORY.md、WORLD_BIBLE.md 與既有 Demo 線索/物品 ID。
 */
export const EVIDENCE_CATALOG: Record<string, EvidenceDefinition> = {
  // ==========================================================================
  // 第一章 & 體驗版互通核心證據 (對應既有 Demo 線索與物品 ID)
  // ==========================================================================
  clue_admission_notice: {
    id: 'clue_admission_notice',
    name: '被風吹落的入學通知單',
    category: 'historical_document',
    sourceObjectId: 'gate_admission_notice',
    discoveredAreaId: 'school_gate',
    description:
      '校門口拾獲的入學通知單，手寫批註要求新生核對一年 B 班「第 29 號課桌」，但正式編制僅有 28 人。',
    importance: 'medium',
    baseWeight: 5,
    analysisBonusWeight: 3,
    isRedHerring: false,
    analysisConclusion:
      '入學通知單上的編號「029」並非學號錯誤，而是白川學園將第 29 號座位作為認知過濾觀測點的標記。',
  },

  clue_bulletin_board_hint: {
    id: 'clue_bulletin_board_hint',
    name: '校方公告欄巡查通告',
    category: 'historical_document',
    sourceObjectId: 'bulletin_main_board',
    discoveredAreaId: 'bulletin_board_area',
    description:
      '總務處張貼的夜間巡查與校史室整修通告，底部殘留被撕毀的張貼物痕跡。',
    importance: 'low',
    baseWeight: 4,
    analysisBonusWeight: 2,
    isRedHerring: false,
    analysisConclusion:
      '校方以「管線維護」為由封鎖舊校舍走廊與地下入口，時間點與失蹤海報被撕除的時間完全吻合。',
  },

  clue_missing_student_poster: {
    id: 'clue_missing_student_poster',
    name: '失蹤學生協尋海報殘頁',
    category: 'historical_document',
    sourceObjectId: 'bulletin_missing_poster',
    discoveredAreaId: 'bulletin_board_area',
    description:
      '公告欄夾縫中的半張協尋海報，協尋對象「林語澄（蘇雨晴化名）」最後目擊於一年 B 班與舊校舍走廊。',
    importance: 'high',
    baseWeight: 8,
    analysisBonusWeight: 4,
    isRedHerring: false,
    analysisConclusion:
      '海報背面的鉛筆字跡指向走廊儲物櫃，證實曾有學生試圖在被清除記憶前留下備用鑰匙。',
  },

  clue_corridor_history_plaque: {
    id: 'clue_corridor_history_plaque',
    name: '建校沿革紀念銘牌拓印',
    category: 'historical_document',
    sourceObjectId: 'corridor_history_plaque',
    discoveredAreaId: 'corridor',
    description:
      '走廊牆上的金屬銘牌記載學校於 1994 年秋季正式啟用，但螺絲孔位下露出更古老的「1979」字樣。',
    importance: 'high',
    baseWeight: 7,
    analysisBonusWeight: 4,
    isRedHerring: false,
    analysisConclusion:
      '學園表面宣稱 1994 年建校，實際上早在 1979 年「白川腦科學臨床中心」時期便已運作。',
  },

  clue_classroom_desk_carving: {
    id: 'clue_classroom_desk_carving',
    name: '第 29 號課桌抽屜背面的刀刻字跡',
    category: 'physical_item',
    sourceObjectId: 'classroom_student_desk',
    discoveredAreaId: 'classroom',
    description:
      '一年 B 班第 29 號課桌抽屜內側深深刻著：「點名簿上沒有我。如果妳看見這行字，別相信講台上的點名紀錄。」',
    importance: 'critical',
    baseWeight: 10,
    analysisBonusWeight: 5,
    isRedHerring: false,
    analysisConclusion:
      '刀刻筆跡與蘇雨晴留下的手稿完全一致，且刻痕顯示她在失蹤當晚正處於極度恐懼中，直接戳破「自願私奔」的謠言。',
  },

  clue_mysterious_school_file: {
    id: 'clue_mysterious_school_file',
    name: '神祕校務文件（特別校務移交卷宗）',
    category: 'historical_document',
    sourceObjectId: 'classroom_mysterious_file',
    discoveredAreaId: 'classroom',
    description:
      '講台暗格中的機密卷宗，建檔日期為 1987 年 11 月 4 日（早於官方建校 7 年），記載「第 29 號觀察席位」與不存在於名冊上的學生。',
    importance: 'critical',
    baseWeight: 12,
    analysisBonusWeight: 6,
    isRedHerring: false,
    analysisConclusion:
      '證實「第 29 號席位」是跨越數十年的實驗觀察編號，且觀測系統仍在即時運作中。',
  },

  clue_classroom_blackboard_duty: {
    id: 'clue_classroom_blackboard_duty',
    name: '教室黑板值日生擦痕紀錄',
    category: 'testimony',
    sourceObjectId: 'classroom_blackboard',
    discoveredAreaId: 'classroom',
    description:
      '黑板右側值日生欄位原本寫著兩個名字，其中一個被用力塗抹，但粉筆凹痕仍能辨識出「028 / 蘇雨晴」。',
    importance: 'medium',
    baseWeight: 5,
    analysisBonusWeight: 3,
    isRedHerring: false,
    analysisConclusion:
      '全班同學在 18.9Hz 廣播後集體遺忘該名值日生，唯獨物理粉筆凹痕無法被認知過濾抹除。',
  },

  item_rusted_classroom_key: {
    id: 'item_rusted_classroom_key',
    name: '生鏽的教室備用鑰匙（物證）',
    category: 'physical_item',
    sourceObjectId: 'corridor_utility_cabinet',
    discoveredAreaId: 'corridor',
    description:
      '藏在走廊器材櫃夾層的黃銅鑰匙，掛牌刻有「1-B 備用」，柄部殘留微弱的鐵鏽與暗房藥水氣味。',
    importance: 'medium',
    baseWeight: 4,
    analysisBonusWeight: 2,
    isRedHerring: false,
    analysisConclusion:
      '鑰匙上的暗房定影液殘留物，證明攝影社社長陳品言曾協助蘇雨晴在夜間反鎖教室以躲避校安隊。',
  },

  item_brass_locker_token: {
    id: 'item_brass_locker_token',
    name: '29 號黃銅儲物櫃名牌',
    category: 'physical_item',
    sourceObjectId: 'gate_security_booth',
    discoveredAreaId: 'school_gate',
    description:
      '校門警衛室窗台拾獲的舊式黃銅名牌，正面刻著「29」，背面刻著「B2-ARCHIVE」。',
    importance: 'medium',
    baseWeight: 5,
    analysisBonusWeight: 3,
    isRedHerring: false,
    analysisConclusion:
      '背面編碼「B2-ARCHIVE」是地下二層記憶封存庫的通行索引碼之一。',
  },

  // ==========================================================================
  // 第二章～第四章 正式版關鍵證據 (對應 MAIN_STORY.md 與 CHARACTER_DATABASE.md)
  // ==========================================================================
  ev_1979_land_deed: {
    id: 'ev_1979_land_deed',
    name: '1979 年白川腦科學臨床中心地契與藍圖',
    category: 'historical_document',
    sourceObjectId: 'library_archive_safe_1979',
    discoveredAreaId: 'library_archive',
    description:
      '周源協助從禁書區暗格找出的 1979 年原始地契與地下三層結構圖，記載「無名計畫」早於 1994 年便已收容第 001～028 號受試者。',
    importance: 'critical',
    baseWeight: 10,
    analysisBonusWeight: 5,
    isRedHerring: false,
    analysisConclusion:
      '直接證明白川學園在 1994 年之前早已存在，任何以「1994 年才建校」為由開立的退學或轉學公文皆屬偽造。',
  },

  ev_chen_darkroom_film_029: {
    id: 'ev_chen_darkroom_film_029',
    name: '陳品言的顯影底片：028 號與 029 號雙生紀錄',
    category: 'physical_item',
    sourceObjectId: 'art_darkroom_enlarger',
    discoveredAreaId: 'art_music_wing',
    description:
      '傳統銀鹽底片不受電子竄改影響，清晰拍下蘇雨晴（028 號）與主角蘇雨嵐（029 號）在實驗艙門前的合影與白川鏡花的監控簽名。',
    importance: 'critical',
    baseWeight: 10,
    analysisBonusWeight: 5,
    isRedHerring: false,
    analysisConclusion:
      '不可磨滅的光學鐵證，足以讓陳品言、周源等學生完全覺醒，並在公開曝光時作為核心視覺證據。',
  },

  ev_su_yuqing_music_box_189hz: {
    id: 'ev_su_yuqing_music_box_189hz',
    name: '蘇雨晴的殘響八音盒（18.9Hz 逆向抗頻音叉）',
    category: 'audio_tape',
    sourceObjectId: 'music_room_piano_compartment',
    discoveredAreaId: 'art_music_wing',
    description:
      '藏於音樂教室舊鋼琴共鳴箱內的特製八音盒，運轉時會發出抵銷 18.9Hz 校鐘催眠波的逆向相位聲波。',
    importance: 'high',
    baseWeight: 6,
    analysisBonusWeight: 4,
    isRedHerring: false,
    analysisConclusion:
      '不僅證明學園廣播含有次聲波催眠，更能作為第四章解除全校師生認知過濾的聲學鑰匙。',
  },

  ev_b2_circuit_blueprint: {
    id: 'ev_b2_circuit_blueprint',
    name: '地下二層配電與認知過濾陣列工程圖',
    category: 'historical_document',
    sourceObjectId: 'b1_security_terminal_blueprint',
    discoveredAreaId: 'underground_b1',
    description:
      '沈志遠私下留存的 B2 工程線路圖，標示走廊顯眼處的「緊急斷電拉桿」實為觸發神經阻斷瓦斯的防盜誘餌。',
    importance: 'high',
    baseWeight: 6,
    analysisBonusWeight: 4,
    isRedHerring: false,
    analysisConclusion:
      '揭露 B2 假斷電拉桿的陷阱構造，指出真正的主機斷路器位於 B2 封存庫西側配電箱。',
  },

  ev_1999_graduation_experiment_log: {
    id: 'ev_1999_graduation_experiment_log',
    name: '1999 年「畢業移交」人體實驗總表與錄音帶',
    category: 'audio_tape',
    sourceObjectId: 'b3_core_director_console',
    discoveredAreaId: 'underground_b3',
    description:
      '記錄白川靜雄與白川鏡花將歷屆「第 29 號席位」學生移交地下三層進行記憶覆寫的完整名單與原始錄音。',
    importance: 'critical',
    baseWeight: 8,
    analysisBonusWeight: 4,
    isRedHerring: false,
    analysisConclusion:
      '直接鎖定白川財閥最高層的刑事責任，是達成結局 A「真相大白」不可或缺的最終鐵證。',
  },

  // ==========================================================================
  // 三大錯誤線索 (Red Herrings，對應 MAIN_STORY.md 第五節)
  // ==========================================================================
  rh_fake_love_letter: {
    id: 'rh_fake_love_letter',
    name: '【可疑線索】偽造的「蘇雨晴私奔情書」',
    category: 'red_herring',
    sourceObjectId: 'classroom_podium_drawer_bait',
    discoveredAreaId: 'classroom',
    description:
      '夾在班級日誌中的信件，宣稱失蹤學生只是因為感情問題與校外人士私奔。字跡工整卻缺乏個人筆觸。',
    importance: 'medium',
    baseWeight: 0,
    analysisBonusWeight: 4,
    isRedHerring: true,
    counterEvidenceId: 'clue_classroom_desk_carving',
    analysisConclusion:
      '【已識破錯誤線索】比對《第 29 號課桌抽屜背面的刀刻字跡》後確認此信為陳夢澤奉命偽造的煙霧彈，旨在誤導學生停止追查。',
  },

  rh_forged_expulsion_form: {
    id: 'rh_forged_expulsion_form',
    name: '【可疑線索】1994 年偽造退學申請書',
    category: 'red_herring',
    sourceObjectId: 'admin_registrar_open_tray',
    discoveredAreaId: 'admin_building',
    description:
      '教務處公開檔案架上的退學申請書，記載第 29 號學生於 1994 年自願辦理退學，試圖合理化名冊缺號。',
    importance: 'high',
    baseWeight: 0,
    analysisBonusWeight: 4,
    isRedHerring: true,
    counterEvidenceId: 'ev_1979_land_deed',
    analysisConclusion:
      '【已識破錯誤線索】比對《1979 年地契與藍圖》及《1987 年特別校務移交卷宗》後，證實該退學表是徐文謙事後補蓋印章的偽造文書。',
  },

  rh_b2_power_lever: {
    id: 'rh_b2_power_lever',
    name: '【可疑線索】地下二層「緊急斷電拉桿」指示牌',
    category: 'red_herring',
    sourceObjectId: 'b2_corridor_decoy_lever',
    discoveredAreaId: 'underground_b2',
    description:
      'B2 走廊入口處異常顯眼的紅色拉桿與指示牌，宣稱拉下即可關閉全校認知過濾系統。',
    importance: 'high',
    baseWeight: 0,
    analysisBonusWeight: 4,
    isRedHerring: true,
    counterEvidenceId: 'ev_b2_circuit_blueprint',
    analysisConclusion:
      '【已識破錯誤線索】比對《地下二層配電與認知過濾陣列工程圖》後，確認該拉桿連接的是校安處警報與催眠瓦斯閥門！',
  },
};

export const EVIDENCE_LIST: EvidenceDefinition[] = Object.values(EVIDENCE_CATALOG);
