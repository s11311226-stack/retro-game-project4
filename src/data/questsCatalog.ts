import type { QuestDefinition } from '../types';

/**
 * 《無名校區》正式版任務資料定義表 (Quests Catalog)
 * 任務資料與執行邏輯分離，涵蓋：
 * - 四大章節主線任務 (category: 'main')
 * - 角色專屬支線任務 (category: 'character'，對應 CHARACTER_DATABASE.md)
 * - 校園調查支線任務 (category: 'side')
 */
export const QUESTS_CATALOG: Record<string, QuestDefinition> = {
  // ==========================================================================
  // 四大章節主線任務 (Main Quests)
  // ==========================================================================
  quest_main_ch1_desk29: {
    id: 'quest_main_ch1_desk29',
    title: '第一章：第 29 張課桌與點名簿上不存在的人',
    category: 'main',
    chapter: 1,
    relatedCharacterId: 'su_yuqing',
    summary:
      '剛轉入三年丙班的蘇語晴在校門口拾獲入學通知，必須依序調查公告欄失蹤學生海報與教室講台暗格中的神祕校務文件，揭開「第 29 號席位」的初步異常。',
    objectives: [
      '於校門口閱讀入學通知單並前往公告欄區域調查失蹤學生海報',
      '於走廊取得生鏽的教室備用鑰匙並進入教室',
      '調查第 29 號課桌抽屜刻痕與講台暗格中的《特別校務移交卷宗》',
    ],
    prerequisites: {},
    completionCondition: {
      requiredEvidenceIds: [
        'clue_missing_student_poster',
        'clue_mysterious_school_file',
      ],
    },
    rewards: {
      globalStateDeltas: {
        academicCredits: 5,
      },
      characterImpacts: [
        {
          characterId: 'chen_pinyan',
          affinityDelta: 10,
          trustDelta: 10,
        },
        {
          characterId: 'zhou_yuan',
          affinityDelta: 5,
          trustDelta: 5,
        },
      ],
      setStoryFlags: ['flag_anachronistic_file_read'],
    },
  },

  quest_main_ch2_doctored_history: {
    id: 'quest_main_ch2_doctored_history',
    title: '第二章：被塗改的校史與雙面人',
    category: 'main',
    chapter: 2,
    relatedCharacterId: 'shirakawa_shizuo',
    summary:
      '深入調查走廊 1979 年銘牌與舊圖書館禁書區，找出白川學園前身「白川腦科學臨床中心」的原始地契，並識破教務處偽造的退學申請書。',
    objectives: [
      '完成第一章調查並收集《建校沿革紀念銘牌拓印》',
      '取得《1979 年白川腦科學臨床中心地契與藍圖》',
    ],
    prerequisites: {
      requiredCompletedQuestIds: ['quest_main_ch1_desk29'],
    },
    completionCondition: {
      requiredEvidenceIds: ['clue_corridor_history_plaque', 'ev_1979_land_deed'],
    },
    rewards: {
      globalStateDeltas: {
        publicExposure: 15,
      },
      characterImpacts: [
        {
          characterId: 'lin_jingyi',
          affinityDelta: 15,
          trustDelta: 20,
        },
      ],
    },
  },

  quest_main_ch3_echoes_in_dark: {
    id: 'quest_main_ch3_echoes_in_dark',
    title: '第三章：18.9Hz 的第四聲鐘響與暗房真相',
    category: 'main',
    chapter: 3,
    relatedCharacterId: 'lu_zixuan',
    summary:
      '與新聞社社長陳品妍、物理社社長陸子軒合作，沖洗出 028 與 029 號雙生底片，並取得能抵銷 18.9Hz 催眠廣播的逆向抗頻八音盒。',
    objectives: [
      '取得《陳品言的顯影底片：028 號與 029 號雙生紀錄》',
      '取得《蘇雨晴的殘響八音盒（18.9Hz 逆向抗頻音叉）》',
    ],
    prerequisites: {
      requiredCompletedQuestIds: ['quest_main_ch2_doctored_history'],
    },
    completionCondition: {
      requiredEvidenceIds: [
        'ev_chen_darkroom_film_029',
        'ev_su_yuqing_music_box_189hz',
      ],
    },
    rewards: {
      globalStateDeltas: {
        publicExposure: 20,
        experimentCorruption: -10,
      },
      characterImpacts: [
        {
          characterId: 'lu_zixuan',
          affinityDelta: 20,
          trustDelta: 25,
        },
      ],
    },
  },

  quest_main_ch4_final_graduation: {
    id: 'quest_main_ch4_final_graduation',
    title: '第四章：回聲搖籃與無名者的畢業典禮',
    category: 'main',
    chapter: 4,
    relatedCharacterId: 'su_yulan',
    summary:
      '突破地下 B1～B3 封鎖線，避開 B2 假斷電拉桿陷阱，取得 1999 年「畢業移交」實驗總表並解救姊姊蘇語嵐。',
    objectives: [
      '取得《地下二層配電與認知過濾陣列工程圖》以規避陷阱',
      '於 B3 核心實驗室取得《1999 年「畢業移交」人體實驗總表與錄音帶》',
    ],
    prerequisites: {
      requiredCompletedQuestIds: ['quest_main_ch3_echoes_in_dark'],
    },
    completionCondition: {
      requiredEvidenceIds: [
        'ev_b2_circuit_blueprint',
        'ev_1999_graduation_experiment_log',
      ],
    },
    rewards: {
      globalStateDeltas: {
        publicExposure: 30,
      },
      characterImpacts: [
        {
          characterId: 'su_yulan',
          affinityDelta: 10,
          trustDelta: 10,
        },
      ],
    },
  },

  // ==========================================================================
  // 角色專屬支線任務 (Character Quests)
  // ==========================================================================
  quest_char_su_yuqing_echo: {
    id: 'quest_char_su_yuqing_echo',
    title: '雙燕的回音',
    category: 'character',
    chapter: 1,
    relatedCharacterId: 'su_yuqing',
    summary:
      '透過入學通知單與第 29 號課桌抽屜背面的刀刻字跡，確認姊姊蘇語嵐留下的求救訊號。',
    objectives: [
      '收集《被風吹落的入學通知單》',
      '收集《第 29 號課桌抽屜背面的刀刻字跡》',
    ],
    prerequisites: {},
    completionCondition: {
      requiredEvidenceIds: ['clue_admission_notice', 'clue_classroom_desk_carving'],
    },
    rewards: {
      globalStateDeltas: {
        academicCredits: 5,
      },
      characterImpacts: [
        {
          characterId: 'su_yulan',
          affinityDelta: 10,
          trustDelta: 10,
        },
      ],
    },
  },

  quest_char_lin_xiaoyue_sketchbook: {
    id: 'quest_char_lin_xiaoyue_sketchbook',
    title: '第29號素描本',
    category: 'character',
    chapter: 1,
    relatedCharacterId: 'lin_xiaoyue',
    summary:
      '收集失蹤學生協尋海報與 29 號黃銅儲物櫃名牌，拼湊出林曉月失蹤當晚的行動軌跡。',
    objectives: [
      '於公告欄收集《失蹤學生協尋海報殘頁》',
      '於校門警衛室收集《29 號黃銅儲物櫃名牌》',
    ],
    prerequisites: {},
    completionCondition: {
      requiredEvidenceIds: ['clue_missing_student_poster', 'item_brass_locker_token'],
    },
    rewards: {
      characterImpacts: [
        {
          characterId: 'lin_xiaoyue',
          affinityDelta: 35,
          trustDelta: 45,
        },
      ],
    },
  },

  quest_char_zhou_yuan_rosters: {
    id: 'quest_char_zhou_yuan_rosters',
    title: '兩本點名簿',
    category: 'character',
    chapter: 1,
    relatedCharacterId: 'zhou_yuan',
    summary:
      '向班長周予安出示講台暗格中的《特別校務移交卷宗》與黑板值日生擦痕，動搖他對校方秩序的盲目服從。',
    objectives: [
      '取得《神祕校務文件（特別校務移交卷宗）》',
      '調查教室黑板取得《教室黑板值日生擦痕紀錄》',
    ],
    prerequisites: {
      requiredCharacterTrust: {
        characterId: 'zhou_yuan',
        minTrust: 10,
      },
    },
    completionCondition: {
      requiredEvidenceIds: [
        'clue_mysterious_school_file',
        'clue_classroom_blackboard_duty',
      ],
    },
    rewards: {
      characterImpacts: [
        {
          characterId: 'zhou_yuan',
          affinityDelta: 45,
          trustDelta: 65,
        },
      ],
    },
  },

  quest_char_chen_pinyan_darkroom: {
    id: 'quest_char_chen_pinyan_darkroom',
    title: '暗房裡的1998',
    category: 'character',
    chapter: 2,
    relatedCharacterId: 'chen_pinyan',
    summary:
      '協助新聞社社長陳品妍比對失蹤學生海報與暗房底片，建立校園地下情報網。',
    objectives: [
      '收集《失蹤學生協尋海報殘頁》與《生鏽的教室備用鑰匙（物證）》',
    ],
    prerequisites: {
      requiredCharacterAffinity: {
        characterId: 'chen_pinyan',
        minAffinity: 30,
      },
    },
    completionCondition: {
      requiredEvidenceIds: [
        'clue_missing_student_poster',
        'item_rusted_classroom_key',
      ],
    },
    rewards: {
      globalStateDeltas: {
        publicExposure: 15,
      },
      characterImpacts: [
        {
          characterId: 'chen_pinyan',
          affinityDelta: 35,
          trustDelta: 45,
        },
      ],
    },
  },

  // ==========================================================================
  // 校園調查支線任務 (Side Quests)
  // ==========================================================================
  quest_side_debunk_rumors: {
    id: 'quest_side_debunk_rumors',
    title: '支線：粉碎私奔謠言',
    category: 'side',
    chapter: 1,
    relatedCharacterId: 'chen_pinyan',
    summary:
      '收集偽造情書並以第 29 號課桌抽屜背面的刀刻字跡識破校方的抹黑煙霧彈。',
    objectives: [
      '收集《【可疑線索】偽造的「蘇雨晴私奔情書」》',
      '以《第 29 號課桌抽屜背面的刀刻字跡》完成反證識破',
    ],
    prerequisites: {},
    completionCondition: {
      requiredEvidenceIds: ['rh_fake_love_letter', 'clue_classroom_desk_carving'],
    },
    failureCondition: {
      maxCorporateAlert: 90,
    },
    rewards: {
      globalStateDeltas: {
        publicExposure: 10,
        corporateAlert: -5,
      },
      characterImpacts: [
        {
          characterId: 'chen_pinyan',
          affinityDelta: 15,
          trustDelta: 15,
        },
      ],
    },
  },
};

export const QUEST_LIST: QuestDefinition[] = Object.values(QUESTS_CATALOG);
