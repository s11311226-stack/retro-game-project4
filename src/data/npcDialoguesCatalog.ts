import type { AreaId, NPCScenePlacementDef } from '../types';

/**
 * 《無名校區》Phase 6B — 全校區 NPC 駐留位置、外觀配色與分支對話資料庫
 * 嚴格對應 docs/production/CHARACTER_DATABASE.md、CHARACTER_RELATIONSHIPS.md 與 MAIN_STORY.md。
 */
export const NPC_SCENE_PLACEMENTS: Record<string, NPCScenePlacementDef> = {
  // 1. 公告欄區域：陳品妍 (新聞社社長)
  npc_bulletin_chen_pinyan: {
    id: 'npc_bulletin_chen_pinyan',
    characterId: 'chen_pinyan',
    areaId: 'bulletin_area',
    x: 220,
    y: 312,
    facing: 'right',
    palette: {
      coatColor: 0xb45309,
      hairColor: 0x451a03,
      accentColor: 0xfacc15,
      badgeText: '新聞社社長・陳品妍',
    },
    greetingLines: [
      {
        speaker: '陳品妍（新聞社社長）',
        portraitTag: 'protagonist',
        text: '「噓！小聲點，妳就是今天剛轉進三年丙班的蘇語晴吧？我正在拍教務處偷偷撕掉尋人海報的證據。」',
      },
      {
        speaker: '陳品妍（新聞社社長）',
        portraitTag: 'protagonist',
        text: '「這所學校只要有人坐上『第 29 號座位』就會人間蒸發，隔天全班還會像中了邪一樣忘記那個人！」',
      },
    ],
    choices: [
      {
        id: 'choice_pinyan_greet',
        label: '詢問失蹤學生海報與新聞社的暗房調查',
        condition: { onlyOnce: true },
        responseLines: [
          {
            speaker: '陳品妍（新聞社社長）',
            text: '「太好了，終於有個眼神清醒的同學！我在舊圖書館後面設了秘密暗房，傳統底片才不會被校方的系統篡改。」',
          },
          {
            speaker: '陳品妍（新聞社社長）',
            text: '「如果妳在公告欄或教室找到失蹤學生的線索，隨時拿來跟我比對！」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_pinyan_greet',
          affinityDelta: 15,
          trustDelta: 15,
          publicExposureDelta: 5,
        },
      },
      {
        id: 'choice_pinyan_show_poster',
        label: '【出示失蹤海報】比對 1998 年暗房底片並建立校外曝光連線',
        condition: {
          requiredEvidenceIds: ['clue_missing_student_poster'],
          onlyOnce: true,
        },
        responseLines: [
          {
            speaker: '陳品妍（新聞社社長）',
            text: '「這張林曉月的海報殘頁！妳看我沖洗出來的這捲銀鹽底片——半年前妳姊姊蘇語嵐跟林曉月都曾被叫進保健室後方！」',
          },
          {
            speaker: '陳品妍（新聞社社長）',
            text: '「我把這張《028 號與 029 號雙生底片》交給妳保管，我也會同步把備份寄給校外記者與失蹤學生家長！」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_pinyan_darkroom_film',
          affinityDelta: 30,
          trustDelta: 35,
          publicExposureDelta: 20,
          grantEvidenceId: 'ev_chen_darkroom_film_029',
        },
      },
      {
        id: 'choice_pinyan_debunk_love_letter',
        label: '【出示刀刻筆跡】識破講台抽屜裡的「偽造私奔情書」',
        condition: {
          requiredEvidenceIds: [
            'rh_fake_love_letter',
            'clue_classroom_desk_carving',
          ],
          onlyOnce: true,
        },
        responseLines: [
          {
            speaker: '陳品妍（新聞社社長）',
            text: '「哼，我就知道那封私奔情書是假貨！妳看第 29 張課桌的刀痕是左撇子刻的，情書卻是教務處慣用的右手公文體！」',
          },
          {
            speaker: '陳品妍（新聞社社長）',
            text: '「太漂亮了，語晴！我們立刻在校刊專欄貼出筆跡鑑定，粉碎校方的抹黑謠言！」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_pinyan_debunk_letter',
          affinityDelta: 15,
          trustDelta: 20,
          publicExposureDelta: 10,
          debunkRedHerring: {
            redHerringId: 'rh_fake_love_letter',
            counterEvidenceId: 'clue_classroom_desk_carving',
          },
        },
      },
    ],
  },

  // 2. 校園走廊：趙家豪 (田徑隊主將)
  npc_corridor_zhao_jiahao: {
    id: 'npc_corridor_zhao_jiahao',
    characterId: 'zhao_jiahao',
    areaId: 'corridor',
    x: 515,
    y: 312,
    facing: 'right',
    palette: {
      coatColor: 0x1d4ed8,
      hairColor: 0x1e293b,
      accentColor: 0xf97316,
      badgeText: '田徑隊主將・趙家豪',
    },
    greetingLines: [
      {
        speaker: '趙家豪（田徑隊主將）',
        text: '「喂，新來的轉學生，這條走廊到了傍晚第四聲鐘響後就會變得很古怪，連空氣都讓人胸悶頭痛。」',
      },
      {
        speaker: '趙家豪（田徑隊主將）',
        text: '「我總覺得我的接力賽搭檔兩年前也在這條走廊消失了，可每當我想回想他的臉，腦袋就像被針扎一樣痛……」',
      },
    ],
    choices: [
      {
        id: 'choice_zhao_greet',
        label: '關心他的頭痛症狀，詢問走廊與各處室的動向',
        condition: { onlyOnce: true },
        responseLines: [
          {
            speaker: '趙家豪（田徑隊主將）',
            text: '「謝啦！這條走廊連接著教務處、教師辦公室、宿舍、舊圖書館、頂樓和保健室。要是遇到財閥那些流氓保全，算我一份！」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_zhao_greet',
          affinityDelta: 15,
          trustDelta: 15,
        },
      },
      {
        id: 'choice_zhao_show_baton',
        label: '【出示田徑接力棒】讓他觸摸宿舍找回的刻名接力棒',
        condition: {
          requiredEvidenceIds: ['ev_zhao_relay_baton'],
          onlyOnce: true,
        },
        responseLines: [
          {
            speaker: '趙家豪（田徑隊主將）',
            text: '「這支鋁合金接力棒……上面的刻痕！我想起來了，是阿翔！當年沈知遠騙我們說他轉學了，其實是被拖進了保健室後門！」',
          },
          {
            speaker: '趙家豪（田徑隊主將）',
            text: '「蘇語晴，這份恩情我記下了！只要妳一聲令下，我隨時帶整個田徑隊幫妳撞開教務處跟地下室的鐵門！」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_zhao_awaken_baton',
          affinityDelta: 40,
          trustDelta: 55,
          completeQuestId: 'quest_char_zhao_jiahao_baton',
        },
      },
    ],
  },

  // 3. 三年丙班教室：周予安 (班長)
  npc_classroom_zhou_yuan: {
    id: 'npc_classroom_zhou_yuan',
    characterId: 'zhou_yuan',
    areaId: 'classroom',
    x: 215,
    y: 312,
    facing: 'right',
    palette: {
      coatColor: 0x1e293b,
      hairColor: 0x0f172a,
      accentColor: 0xe11d48,
      badgeText: '三年丙班班長・周予安',
    },
    greetingLines: [
      {
        speaker: '周予安（三年丙班班長）',
        text: '「蘇語晴同學，請遵守班級秩序。三年丙班的正式編制從開學以來就只有 28 個人，請不要再去翻動角落那張堆雜物的空課桌了。」',
      },
    ],
    choices: [
      {
        id: 'choice_zhou_reason',
        label: '冷靜詢問點名簿的核發流程與教務處的規定',
        condition: { onlyOnce: true },
        responseLines: [
          {
            speaker: '周予安（三年丙班班長）',
            text: '「……老實說，每個月初教務主任沈知遠都會親自換掉我的點名簿。有時候我也覺得奇怪，為什麼座位表總是對不齊……」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_zhou_reason',
          affinityDelta: 15,
          trustDelta: 20,
        },
      },
      {
        id: 'choice_zhou_show_rosters',
        label: '【出示原始點名簿與校務文件】證明第 29 號席位被刻意抹除',
        condition: {
          requiredEvidenceIds: [
            'clue_mysterious_school_file',
            'ev_original_attendance_roster',
          ],
          onlyOnce: true,
        },
        responseLines: [
          {
            speaker: '周予安（三年丙班班長）',
            text: '「這份未塗改的一月名冊……第 29 號林曉月，還有半年前的學藝股長蘇語嵐？！我的頭好痛……那四聲鐘響一直在騙我們！」',
          },
          {
            speaker: '周予安（三年丙班班長）',
            text: '「對不起，語晴，我居然成了幫兇……從現在起，學生會與全班 28 名同學由我負責串聯，我們絕對不會再遺忘任何一個人！」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_zhou_awaken_rosters',
          affinityDelta: 45,
          trustDelta: 60,
          completeQuestId: 'quest_char_zhou_yuan_rosters',
        },
      },
    ],
  },

  // 4. 教務處：沈知遠 (教務主任)
  npc_academic_shen_zhiyuan: {
    id: 'npc_academic_shen_zhiyuan',
    characterId: 'shen_zhiyuan',
    areaId: 'academic_office',
    x: 620,
    y: 312,
    facing: 'left',
    palette: {
      coatColor: 0x334155,
      hairColor: 0x1e293b,
      accentColor: 0xef4444,
      badgeText: '教務主任・沈知遠',
    },
    greetingLines: [
      {
        speaker: '沈知遠（教務主任）',
        portraitTag: 'system',
        text: '「蘇語晴同學，身為轉學生，妳唯一的本分就是修滿學分、聽從第四聲鐘響準時回宿舍就寢。別在不該去的地方亂轉。」',
      },
    ],
    choices: [
      {
        id: 'choice_shen_comply_credits',
        label: '呈交轉學生隨堂測驗卷，降低教務處的戒心',
        condition: { onlyOnce: true },
        responseLines: [
          {
            speaker: '沈知遠（教務主任）',
            text: '「嗯，成績還算合格。我就幫妳登錄 +10 學業學分，只要妳安分守己，白川理事自然不會為難妳。」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_shen_comply',
          affinityDelta: 10,
          trustDelta: 10,
          academicCreditsDelta: 10,
          corporateAlertDelta: -10,
        },
      },
      {
        id: 'choice_shen_confront_black_ledger',
        label: '【出示黑皮書與封口費帳冊】迫使沈知遠交出地下封鎖情報',
        condition: {
          requiredEvidenceIds: ['ev_dean_black_ledger'],
          onlyOnce: true,
        },
        responseLines: [
          {
            speaker: '沈知遠（教務主任）',
            text: '「妳、妳怎麼打開雙重保險箱的？！別把帳冊交給白川鎮雄，否則連我也會被滅口！我承認 1998 年的退學紀錄全是我奉命偽造的……」',
          },
          {
            speaker: '沈知遠（教務主任）',
            text: '「只要妳不公開那筆封口費，我不會再派夜間保全攔截妳們學生會的行動！」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_shen_compromised',
          affinityDelta: 45,
          trustDelta: 55,
          corporateAlertDelta: -15,
          publicExposureDelta: 15,
        },
      },
    ],
  },

  // 5. 教師辦公室：許文謙 (班導師 / 歷史教師)
  npc_teachers_xu_wenqian: {
    id: 'npc_teachers_xu_wenqian',
    characterId: 'xu_wenqian',
    areaId: 'teachers_office',
    x: 420,
    y: 312,
    facing: 'right',
    palette: {
      coatColor: 0x78350f,
      hairColor: 0x27272a,
      accentColor: 0x38bdf8,
      badgeText: '歷史導師・許文謙',
    },
    greetingLines: [
      {
        speaker: '許文謙（三年丙班導師）',
        text: '「語晴，來交歷史作業嗎？（壓低聲音）小心點，沈主任在隔壁裝了監聽器。歷史課本被撕掉的那一頁，其實就藏在我的檔案櫃裡。」',
      },
    ],
    choices: [
      {
        id: 'choice_xu_history_hint',
        label: '請教 1979 年與 1998 年校史矛盾，領取導師的學分保護',
        condition: { onlyOnce: true },
        responseLines: [
          {
            speaker: '許文謙（三年丙班導師）',
            text: '「1998 年 11 月 7 日那晚，我還是實習老師，親眼看見第 29 號學生被校醫帶走。我幫妳加簽了模範生學分，並留了原始點名簿在右側書架。」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_xu_history_hint',
          affinityDelta: 25,
          trustDelta: 30,
          academicCreditsDelta: 15,
        },
      },
      {
        id: 'choice_xu_debunk_expulsion',
        label: '【出示偽造退學表與 1979 地契】查明沈知遠盜用印章的真相',
        condition: {
          requiredEvidenceIds: [
            'rh_forged_expulsion_form',
            'ev_1979_land_deed',
          ],
          onlyOnce: true,
        },
        responseLines: [
          {
            speaker: '許文謙（三年丙班導師）',
            text: '「這份 1994 年退學申請書上的印泥是教務處專用的紫光油墨！沈知遠為了嫁禍給改革派教師，竟然盜蓋了我的職章。」',
          },
          {
            speaker: '許文謙（三年丙班導師）',
            text: '「謝謝妳查明真相，語晴。真到了最後關頭，我會帶領全校良知教師從內部打開行政大樓的大門！」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_xu_debunk_form',
          affinityDelta: 30,
          trustDelta: 35,
          debunkRedHerring: {
            redHerringId: 'rh_forged_expulsion_form',
            counterEvidenceId: 'ev_1979_land_deed',
          },
        },
      },
    ],
  },

  // 6. 學生宿舍：葉思涵 (保健室志工 / 室友)
  npc_dormitory_ye_sihan: {
    id: 'npc_dormitory_ye_sihan',
    characterId: 'ye_sihan',
    areaId: 'dormitory',
    x: 450,
    y: 312,
    facing: 'left',
    palette: {
      coatColor: 0xf472b6,
      hairColor: 0x3f2e21,
      accentColor: 0x4ade80,
      badgeText: '保健室志工・葉思涵',
    },
    greetingLines: [
      {
        speaker: '葉思涵（保健室志工／室友）',
        text: '「語晴……妳回來了！304 室對面那張貼著封條的雙層床，以前就是妳姊姊蘇語嵐和林曉月睡過的床位……」',
      },
    ],
    choices: [
      {
        id: 'choice_ye_medical_care',
        label: '請葉思涵協助包紮傷口，並詢問林曉月失蹤當晚的經過',
        condition: { onlyOnce: true },
        responseLines: [
          {
            speaker: '葉思涵（保健室志工／室友）',
            text: '「來，我幫妳消炎包紮。曉月失蹤那天晚上，我躲在保健室白色隔簾後面，聽見陳孟哲醫師說要把『第 29 號樣本』從手術室貨梯送進 B1……」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_ye_medical_care',
          affinityDelta: 25,
          trustDelta: 30,
          injuryCountDelta: -2,
        },
      },
      {
        id: 'choice_ye_show_manifest',
        label: '【出示 B1 檢體移交簽收單】揭穿甜味鎮靜劑，解除葉思涵的恐懼',
        condition: {
          requiredEvidenceIds: ['ev_b1_transfer_manifest'],
          onlyOnce: true,
        },
        responseLines: [
          {
            speaker: '葉思涵（保健室志工／室友）',
            text: '「原來陳醫師每天叫我們喝的維他命水裡全摻了順從鎮靜劑！謝謝妳拿到這份簽收單，我不會再害怕了，我會幫妳守住保健室據點！」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_ye_awaken_manifest',
          affinityDelta: 35,
          trustDelta: 45,
          experimentCorruptionDelta: -10,
          completeQuestId: 'quest_char_ye_sihan_prescription',
        },
      },
    ],
  },

  // 7. 舊圖書館：林靜儀 (圖書館管理員 / 吹哨者)
  npc_library_lin_jingyi: {
    id: 'npc_library_lin_jingyi',
    characterId: 'lin_jingyi',
    areaId: 'old_library',
    x: 490,
    y: 312,
    facing: 'left',
    palette: {
      coatColor: 0x713f12,
      hairColor: 0x94a3b8,
      accentColor: 0xf59e0b,
      badgeText: '圖書館管理員・林靜儀',
    },
    greetingLines: [
      {
        speaker: '林靜儀（舊圖書館管理員）',
        text: '「那枚銀色雙燕髮夾……妳就是語嵐常掛在嘴邊的雙胞胎妹妹，蘇語晴吧。我等妳很久了。」',
      },
    ],
    choices: [
      {
        id: 'choice_lin_grant_key',
        label: '向林靜儀表明追查姊姊下落的決心，請求開啟特藏禁書室',
        condition: { onlyOnce: true },
        responseLines: [
          {
            speaker: '林靜儀（舊圖書館管理員）',
            text: '「1998 年那場實驗事故後，我假死隱姓埋名留在這座圖書館，就是為了守護真相。拿著這把【禁書室特藏銅鑰匙】，去打開最深處的書櫃暗門吧。」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_lin_grant_key',
          affinityDelta: 25,
          trustDelta: 30,
          grantItemId: 'item_forbidden_archive_key',
        },
      },
      {
        id: 'choice_lin_decode_echo_cradle',
        label: '【出示蘇語嵐錄音帶與 1968 報告】解析回聲搖籃計畫的逆轉參數',
        condition: {
          requiredEvidenceIds: [
            'ev_yulan_recorder_tape',
            'ev_1968_infrasound_report',
          ],
          onlyOnce: true,
        },
        responseLines: [
          {
            speaker: '林靜儀（舊圖書館管理員）',
            text: '「語嵐把 B3『回聲搖籃』的共振頻率都錄在這捲磁帶裡了！我把 1999 年『畢業移交』實驗總表也交給妳，這將是扳倒白川鎮雄的最終鐵證。」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_lin_decode_complete',
          affinityDelta: 35,
          trustDelta: 45,
          publicExposureDelta: 15,
          grantEvidenceId: 'ev_1999_graduation_experiment_log',
          completeQuestId: 'quest_char_lin_jingyi_redemption',
        },
      },
    ],
  },

  // 8. 禁書室：蘇語嵐意識殘響 (雙胞胎姊姊)
  npc_forbidden_su_yulan_echo: {
    id: 'npc_forbidden_su_yulan_echo',
    characterId: 'su_yulan',
    areaId: 'forbidden_archive',
    x: 420,
    y: 312,
    facing: 'left',
    palette: {
      coatColor: 0xe2e8f0,
      hairColor: 0x0f172a,
      accentColor: 0x38bdf8,
      badgeText: '雙胞胎姊姊殘響・蘇語嵐',
    },
    greetingLines: [
      {
        speaker: '蘇語嵐（雙胞胎腦波共鳴殘響）',
        portraitTag: 'mystery',
        text: '「語晴……妳聽得見我的聲音嗎？我現在被鎖在地下 B3 的『回聲搖籃』核心槽裡，透過雙子共鳴向妳傳遞訊號……」',
      },
    ],
    choices: [
      {
        id: 'choice_yulan_vow',
        label: '握緊雙燕髮夾回應姊姊，穩定自身腦波並記下林曉月的素描位置',
        condition: { onlyOnce: true },
        responseLines: [
          {
            speaker: '蘇語嵐（雙胞胎腦波共鳴殘響）',
            text: '「別讓 18.9Hz 的第四聲鐘響侵蝕妳的心智！林曉月畫下了 B2 與 B3 的結構圖，快去頂樓找陸子軒組裝逆相抗頻音叉！」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_yulan_resonance_vow',
          affinityDelta: 15,
          trustDelta: 15,
          experimentCorruptionDelta: -15,
        },
      },
    ],
  },

  // 9. 頂樓鐘塔：陸子軒 (物理社社長) 與 白川颯 (財閥旁系少爺)
  npc_rooftop_lu_zixuan: {
    id: 'npc_rooftop_lu_zixuan',
    characterId: 'lu_zixuan',
    areaId: 'rooftop',
    x: 340,
    y: 312,
    facing: 'right',
    palette: {
      coatColor: 0xe2e8f0,
      hairColor: 0x451a03,
      accentColor: 0x22d3ee,
      badgeText: '物理社社長・陸子軒',
    },
    greetingLines: [
      {
        speaker: '陸子軒（視聽與物理社社長）',
        text: '「別踩到我的示波器導線！妳看這座鐘塔的第四聲鐘響——基頻 440Hz 底下竟然夾帶了高振幅的 18.9Hz 次聲波！」',
      },
    ],
    choices: [
      {
        id: 'choice_lu_get_music_box',
        label: '說明自己是蘇語嵐的妹妹，領取語嵐託付的《18.9Hz 逆向抗頻八音盒》',
        condition: { onlyOnce: true },
        responseLines: [
          {
            speaker: '陸子軒（視聽與物理社社長）',
            text: '「妳就是蘇語嵐的雙胞胎妹妹？！太好了，這座《殘響八音盒》內建 18.9Hz 逆相音叉，能保護妳不受催眠廣播影響！」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_lu_music_box',
          affinityDelta: 25,
          trustDelta: 30,
          experimentCorruptionDelta: -10,
          grantEvidenceId: 'ev_su_yuqing_music_box_189hz',
        },
      },
      {
        id: 'choice_lu_calibrate_tower',
        label: '【出示鐘塔 18.9Hz 調變波形紀錄】完成頂樓全校逆相廣播塔校準',
        condition: {
          requiredEvidenceIds: ['ev_bell_tower_189hz_log'],
          onlyOnce: true,
        },
        responseLines: [
          {
            speaker: '陸子軒（視聽與物理社社長）',
            text: '「有了這份精確的相位參數，我已經把頂樓發射台改裝完畢！到了最終決戰，我們一鍵就能讓全校師生徹底清醒！」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_lu_calibrate_complete',
          affinityDelta: 35,
          trustDelta: 45,
          experimentCorruptionDelta: -15,
          completeQuestId: 'quest_char_lu_zixuan_counterwave',
        },
      },
    ],
  },

  npc_rooftop_shirakawa_hayate: {
    id: 'npc_rooftop_shirakawa_hayate',
    characterId: 'shirakawa_hayate',
    areaId: 'rooftop',
    x: 780,
    y: 312,
    facing: 'left',
    palette: {
      coatColor: 0x0f172a,
      hairColor: 0x94a3b8,
      accentColor: 0x38bdf8,
      badgeText: '財閥旁系・白川颯',
    },
    greetingLines: [
      {
        speaker: '白川颯（白川財閥旁系學生）',
        text: '「蘇語晴，我警告過妳別再查下去。我伯父白川鎮雄與堂姊白川鏡花，是不會放過任何發現『第 29 號席位』的人的。」',
      },
    ],
    choices: [
      {
        id: 'choice_hayate_resolve',
        label: '表明無論如何都要救出姊姊蘇語嵐與受困同學的決心',
        condition: { onlyOnce: true },
        responseLines: [
          {
            speaker: '白川颯（白川財閥旁系學生）',
            text: '「……妳那雙眼睛跟蘇語嵐一模一樣。我也早就受夠白川家把同齡學生當成實驗白老鼠了。拿去，這張教務處保險箱的暗碼提示可以幫到妳。」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_hayate_resolve',
          affinityDelta: 25,
          trustDelta: 30,
          corporateAlertDelta: -10,
        },
      },
      {
        id: 'choice_hayate_rebel_alliance',
        label: '【出示黑皮書帳冊】說服白川颯作為污點證人並與新聞社陳品妍合作',
        condition: {
          requiredEvidenceIds: ['ev_dean_black_ledger'],
          onlyOnce: true,
        },
        responseLines: [
          {
            speaker: '白川颯（白川財閥旁系學生）',
            text: '「連 1954 年以來的黑皮書都被妳找出來了……好，我正式跟白川鎮雄決裂！我會用家族生物識別權限幫妳們打開地下室防爆門，並替妳們壓下財閥警戒度！」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_hayate_alliance',
          affinityDelta: 40,
          trustDelta: 55,
          corporateAlertDelta: -20,
          publicExposureDelta: 15,
          completeQuestId: 'quest_char_hayate_crest',
        },
      },
    ],
  },

  // 10. 保健室：陳孟哲 (駐校校醫 / B1 臨床主管)
  npc_infirmary_chen_mengzhe: {
    id: 'npc_infirmary_chen_mengzhe',
    characterId: 'chen_mengzhe',
    areaId: 'infirmary',
    x: 560,
    y: 312,
    facing: 'left',
    palette: {
      coatColor: 0xecfdf5,
      hairColor: 0x18181b,
      accentColor: 0x14b8a6,
      badgeText: '駐校校醫・陳孟哲',
    },
    greetingLines: [
      {
        speaker: '陳孟哲（駐校校醫）',
        portraitTag: 'mystery',
        text: '「呵呵，蘇語晴同學，聽說妳最近常聽到第四聲鐘響的雜音？來，喝下這杯特製的『甜味安神藥水』，很快就會什麼煩惱都忘記了。」',
      },
    ],
    choices: [
      {
        id: 'choice_chen_refuse_drink',
        label: '【保持警惕】假裝道謝但偷偷倒掉藥水，趁機記下他白袍口袋的 B2 工程圖',
        condition: { onlyOnce: true },
        responseLines: [
          {
            speaker: '蘇語晴（內心獨白）',
            text: '（好險沒有喝下去！藥水散發著強烈的神經阻斷劑氣味。我趁陳孟哲轉身時，將他桌上的《地下二層配電與過濾陣列工程圖》拓印了下來！）',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_chen_steal_blueprint',
          affinityDelta: 5,
          trustDelta: 5,
          grantEvidenceId: 'ev_b2_circuit_blueprint',
        },
      },
      {
        id: 'choice_chen_confront_manifest',
        label: '【出示 B1 檢體移交簽收單】揭穿他私自押送林曉月下樓的罪證',
        condition: {
          requiredEvidenceIds: ['ev_b1_transfer_manifest'],
          onlyOnce: true,
        },
        responseLines: [
          {
            speaker: '陳孟哲（駐校校醫）',
            portraitTag: 'mystery',
            text: '「嘖……妳居然連 B1 的移交單都翻出來了。看來妳跟妳姊姊蘇語嵐一樣，都是『回聲搖籃』最完美的雙子實驗體……」',
          },
        ],
        outcome: {
          oneTimeEventId: 'evt_npc_chen_confront_manifest',
          publicExposureDelta: 10,
          corporateAlertDelta: 5,
        },
      },
    ],
  },
};

export function getNPCPlacementById(
  placementId: string
): NPCScenePlacementDef | undefined {
  return NPC_SCENE_PLACEMENTS[placementId];
}

export const getNPCScenePlacement = getNPCPlacementById;

export function getNPCPlacementsByArea(
  areaId: AreaId
): NPCScenePlacementDef[] {
  return Object.values(NPC_SCENE_PLACEMENTS).filter(
    (npc) => npc.areaId === areaId
  );
}
