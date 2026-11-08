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

  quest_char_zhao_jiahao_baton: {
    id: 'quest_char_zhao_jiahao_baton',
    title: '遺忘的接力棒',
    category: 'character',
    chapter: 2,
    relatedCharacterId: 'zhao_jiahao',
    summary:
      '在學生宿舍儲物櫃找回刻有趙家豪童年玩伴名字的田徑接力棒，喚醒他被認知過濾屏蔽的記憶。',
    objectives: [
      '於學生宿舍調查儲物櫃取得《刻有失蹤玩伴名字的田徑接力棒》',
      '向走廊或宿舍的趙家豪出示接力棒',
    ],
    prerequisites: {},
    completionCondition: {
      requiredEvidenceIds: ['ev_zhao_relay_baton'],
    },
    rewards: {
      characterImpacts: [
        {
          characterId: 'zhao_jiahao',
          affinityDelta: 40,
          trustDelta: 55,
        },
      ],
    },
  },

  quest_char_hayate_crest: {
    id: 'quest_char_hayate_crest',
    title: '染血的家徽',
    category: 'character',
    chapter: 2,
    relatedCharacterId: 'shirakawa_hayate',
    summary:
      '在頂樓或教師辦公室與白川颯對質，出示教務處黑皮書或 1979 年地契，促使他下定決心背叛家族。',
    objectives: [
      '於教務處取得《1954～1999 空白學籍註銷黑皮書》',
    ],
    prerequisites: {},
    completionCondition: {
      requiredEvidenceIds: ['ev_dean_black_ledger'],
    },
    rewards: {
      globalStateDeltas: {
        corporateAlert: -15,
      },
      characterImpacts: [
        {
          characterId: 'shirakawa_hayate',
          affinityDelta: 50,
          trustDelta: 70,
        },
      ],
    },
  },

  quest_char_ye_sihan_prescription: {
    id: 'quest_char_ye_sihan_prescription',
    title: '布簾後的處方箋',
    category: 'character',
    chapter: 2,
    relatedCharacterId: 'ye_sihan',
    summary:
      '在保健室調查上鎖的藥品櫃，找出陳孟哲投餵鎮靜劑與移交 B1 檢體的簽收單，解除葉思涵的恐懼。',
    objectives: [
      '於保健室取得《特殊檢體移交 B1 簽收單》與甜味鎮靜劑化驗單',
    ],
    prerequisites: {},
    completionCondition: {
      requiredEvidenceIds: ['ev_b1_transfer_manifest'],
    },
    rewards: {
      characterImpacts: [
        {
          characterId: 'ye_sihan',
          affinityDelta: 45,
          trustDelta: 60,
        },
      ],
    },
  },

  quest_char_lu_zixuan_counterwave: {
    id: 'quest_char_lu_zixuan_counterwave',
    title: '18.9Hz 的逆相波',
    category: 'character',
    chapter: 2,
    relatedCharacterId: 'lu_zixuan',
    summary:
      '登上頂樓鐘塔取得 18.9Hz 第四聲鐘響調變紀錄，協助物理社社長陸子軒校準逆相抗頻發射器。',
    objectives: [
      '於頂樓鐘塔取得《頂樓鐘塔 18.9Hz 第四聲鐘響調變波形紀錄》',
    ],
    prerequisites: {},
    completionCondition: {
      requiredEvidenceIds: ['ev_bell_tower_189hz_log'],
    },
    rewards: {
      globalStateDeltas: {
        experimentCorruption: -15,
      },
      characterImpacts: [
        {
          characterId: 'lu_zixuan',
          affinityDelta: 45,
          trustDelta: 60,
        },
      ],
    },
  },

  quest_char_xu_wenqian_history_notes: {
    id: 'quest_char_xu_wenqian_history_notes',
    title: '被撕掉的歷史講義',
    category: 'character',
    chapter: 2,
    relatedCharacterId: 'xu_wenqian',
    summary:
      '在教師辦公室找出許文謙老師暗中保存的未塗改原始出缺席點名簿，獲得導師的學分保護與信任。',
    objectives: [
      '於教師辦公室取得《未塗改前的一月原始出缺席點名簿》',
    ],
    prerequisites: {},
    completionCondition: {
      requiredEvidenceIds: ['ev_original_attendance_roster'],
    },
    rewards: {
      globalStateDeltas: {
        academicCredits: 10,
      },
      characterImpacts: [
        {
          characterId: 'xu_wenqian',
          affinityDelta: 35,
          trustDelta: 50,
        },
      ],
    },
  },

  quest_char_lin_jingyi_redemption: {
    id: 'quest_char_lin_jingyi_redemption',
    title: '守書人的贖罪',
    category: 'character',
    chapter: 2,
    relatedCharacterId: 'lin_jingyi',
    summary:
      '進入舊圖書館深處的禁書室，研讀《1968 年 18.9Hz 次聲波共鳴實驗原始報告》與《蘇語嵐加密錄音日誌》。',
    objectives: [
      '於禁書室取得《1968 年 18.9Hz 次聲波共鳴實驗原始報告》',
      '於禁書室取得《蘇語嵐加密錄音日誌 #1～#3》',
    ],
    prerequisites: {},
    completionCondition: {
      requiredEvidenceIds: [
        'ev_1968_infrasound_report',
        'ev_yulan_recorder_tape',
      ],
    },
    rewards: {
      globalStateDeltas: {
        publicExposure: 15,
      },
      characterImpacts: [
        {
          characterId: 'lin_jingyi',
          affinityDelta: 40,
          trustDelta: 60,
        },
      ],
    },
  },

  quest_char_kyoka_observer_zero: {
    id: 'quest_char_kyoka_observer_zero',
    title: '第零號觀察者',
    category: 'character',
    chapter: 3,
    relatedCharacterId: 'shirakawa_kyoka',
    summary:
      '在禁書室找出白川鏡花少年時期的受試病歷，揭露她曾是 1986 年初代第 29 號席位唯一倖存者的祕密。',
    objectives: [
      '於禁書室取得《1986 年第零號受試者：白川鏡花病歷》',
    ],
    prerequisites: {},
    completionCondition: {
      requiredEvidenceIds: ['ev_kyoka_patient_zero_file'],
    },
    rewards: {
      globalStateDeltas: {
        experimentCorruption: 10,
      },
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
