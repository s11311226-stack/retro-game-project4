import type { CharacterDefinition, CharacterId } from '../types';

/**
 * 15 位核心角色完整定義表 (嚴格對應 docs/production/CHARACTER_DATABASE.md 與 CHARACTER_RELATIONSHIPS.md)
 */
export const CHARACTERS_CATALOG: Record<CharacterId, CharacterDefinition> = {
  su_yuqing: {
    id: 'su_yuqing',
    number: '01',
    name: '蘇語晴',
    roleTitle: '三年丙班轉學生（主角）',
    faction: 'protagonist',
    primaryAreas: ['school_gate', 'bulletin_area', 'corridor', 'classroom'],
    background:
      '17 歲，高三轉學生。為了尋找半年前在白川學園離奇失聯、被校方宣稱「自願退學出國」的雙胞胎姊姊蘇語嵐，隱瞞親屬關係轉入三年丙班。',
    appearance128:
      '深黑色及肩短髮，左側別著銀色雙燕髮夾；身穿深藏青色冬季水手服與百褶裙，肩背棕色舊書包。',
    personality: '冷靜敏銳、重情重義，面對威權與怪異現象時展現出極強的心理韌性。',
    personalSecret:
      '與姊姊蘇語嵐存在罕見的「雙胞胎腦波共鳴」，對 18.9Hz 次聲波具備半免疫體質。',
    storyRole: '玩家操作角色，連接地面學生群體與地下真相的唯一樞紐。',
    relationToProtagonist: '玩家自身。',
    sideQuestId: 'quest_char_su_yuqing_echo',
    sideQuestTitle: '雙燕的回音',
    initialAffinity: 100,
    initialTrust: 100,
    countsTowardStudentAggregate: false,
    awakeningCondition: {
      minAffinity: 50,
      minTrust: 50,
    },
    endingImpactSummary: '其抉擇決定五大結局走向。',
  },

  su_yulan: {
    id: 'su_yulan',
    number: '02',
    name: '蘇語嵐',
    roleTitle: '主角雙胞胎姊姊／前第29號席位學生',
    faction: 'protagonist',
    primaryAreas: ['classroom', 'underground_b3'],
    background:
      '17 歲，蘇語晴的雙胞胎姊姊。半年前為三年丙班學藝股長，因發現 1998 年校史塗改與第29號席位規律，遭激進研究派秘密轉移至地下 B3 作為「回聲搖籃」的一號核心共鳴體。',
    appearance128:
      '與語晴容貌相似但留著齊腰長髮，於 B3 實驗槽中穿著白色無菌受試服，手腕帶有編號 EC-029 束縛環。',
    personality: '溫柔堅毅、具犧牲精神，在意識接入搖籃期間仍透過廣播雜訊向妹妹傳遞警告。',
    personalSecret:
      '被捕前曾與林靜儀、陸子軒合作，將「回聲搖籃」的緊急逆轉金鑰拆分為三份藏於校園各處。',
    storyRole: '主線核心追尋與營救目標。',
    relationToProtagonist: '至親雙胞胎姊姊，主角踏入無名校區的唯一動機。',
    sideQuestId: 'quest_char_su_yuqing_echo',
    sideQuestTitle: '雙燕的回音',
    initialAffinity: 90,
    initialTrust: 90,
    countsTowardStudentAggregate: false,
    awakeningCondition: {
      minAffinity: 80,
      minTrust: 80,
      requiredEvidenceIds: ['ev_yulan_recorder_tape'],
    },
    endingImpactSummary: 'A/C 結局獲救甦醒；B/D 結局消散；E 結局與主角交換脫困。',
  },

  lin_xiaoyue: {
    id: 'lin_xiaoyue',
    number: '03',
    name: '林曉月',
    roleTitle: '三年丙班失蹤學生／近期第29號席位',
    faction: 'student_ally',
    primaryAreas: ['bulletin_area', 'forbidden_archive', 'underground_b2'],
    background:
      '17 歲，三年丙班學生（學號 0419），蘇語嵐失蹤後被遞補坐上「第29號席位」的女孩。在主角入學前三天失蹤。',
    appearance128:
      '蒼白纖細、綁著麻花辮，制服領口別著刻有校徽的黃銅名牌；於 B2 隔離區穿著破損舊式校服。',
    personality: '內向膽怯但觀察細膩，擅長素描與速記。',
    personalSecret:
      '曾目擊校醫陳孟哲與教務主任沈知遠在夜間將昏迷學生送入保健室密道，並將過程畫在素描本中藏於禁書室。',
    storyRole: '第一章與第二章關鍵線索人物，證明第29號席位正在持續吞噬學生。',
    relationToProtagonist: '曾受蘇語嵐照顧的同班同學，視蘇語晴為唯一記得自己名字的救星。',
    sideQuestId: 'quest_char_lin_xiaoyue_sketchbook',
    sideQuestTitle: '第29號素描本',
    initialAffinity: 30,
    initialTrust: 25,
    countsTowardStudentAggregate: true,
    awakeningCondition: {
      minAffinity: 65,
      minTrust: 70,
      requiredEvidenceIds: ['ev_missing_student_poster', 'ev_brass_locker_token'],
    },
    endingImpactSummary: '成功救出她可大幅提升全班信任度，為 A/C 結局必要條件。',
  },

  zhou_yuan: {
    id: 'zhou_yuan',
    number: '04',
    name: '周予安',
    roleTitle: '三年丙班班長／學生會紀律幹部',
    faction: 'student_ally',
    primaryAreas: ['classroom', 'academic_office', 'corridor'],
    background:
      '18 歲，三年丙班班長兼學生會風紀委員。成績頂尖，負責每日點名與維持班級秩序。',
    appearance128:
      '配戴銀框眼鏡，制服穿戴一絲不苟，左臂配戴深紅底金字的「風紀／班長」臂章，手持班級點名簿。',
    personality: '嚴謹守序、責任感過強，初期因認知過濾對第29張課桌表現防衛。',
    personalSecret:
      '父親是白川財閥旗下醫院基層主管，被迫定期向沈知遠回報班上「思想異常」的學生名單，內心充滿罪惡感。',
    storyRole: '第一章的制度阻礙者，第二章轉化為關鍵學生領袖。',
    relationToProtagonist: '從互相猜忌的班長與轉學生，轉變為並肩作戰的學生指揮官。',
    sideQuestId: 'quest_char_zhou_yuan_rosters',
    sideQuestTitle: '兩本點名簿',
    initialAffinity: 15,
    initialTrust: 10,
    countsTowardStudentAggregate: true,
    awakeningCondition: {
      minAffinity: 60,
      minTrust: 75,
      requiredEvidenceIds: ['ev_mysterious_school_file'],
    },
    endingImpactSummary: 'C 結局（群體反抗）的核心必要角色，率領學生會集結。',
  },

  chen_pinyan: {
    id: 'chen_pinyan',
    number: '05',
    name: '陳品妍',
    roleTitle: '新聞社社長／情報收集者',
    faction: 'student_ally',
    primaryAreas: ['bulletin_area', 'old_library'],
    background:
      '17 歲，新聞社社長兼校刊主編。總是背著復古底片相機，在校園四處追查怪談與校方黑幕。',
    appearance128:
      '俏麗馬尾、戴著棕色貝雷帽，制服外罩著多口袋卡其色攝影背心，胸前掛著銀黑單眼相機。',
    personality: '機靈大膽、行動力極強，說話直率且充滿正義感。',
    personalSecret:
      '利用暗房沖洗技術保存了 1999 年舊校舍改建前的違建照片，社辦面臨廢社危機。',
    storyRole: '推動「外界曝光度 (publicExposure)」與證據整理的核心夥伴。',
    relationToProtagonist: '最早相信蘇語晴說詞的學生盟友，稱呼主角為「最佳特派搭檔」。',
    sideQuestId: 'quest_char_chen_pinyan_darkroom',
    sideQuestTitle: '暗房裡的1998',
    initialAffinity: 35,
    initialTrust: 30,
    countsTowardStudentAggregate: true,
    awakeningCondition: {
      minAffinity: 70,
      minTrust: 75,
      requiredEvidenceIds: ['ev_missing_student_poster'],
    },
    endingImpactSummary: 'A 結局與 C 結局關鍵推手，負責聯絡校外媒體與家長。',
  },

  zhao_jiahao: {
    id: 'zhao_jiahao',
    number: '06',
    name: '趙家豪',
    roleTitle: '田徑隊主將／體育股長',
    faction: 'student_ally',
    primaryAreas: ['corridor', 'dormitory', 'rooftop'],
    background:
      '18 歲，田徑隊主將兼三年丙班體育股長。體格健壯，擅長木棍與近身搏擊。',
    appearance128:
      '陽光寸頭，額頭綁著運動頭帶，制服襯衫袖口捲起，背著裝有竹劍與鐵撬的運動長袋。',
    personality: '熱血衝動、講義氣，只要朋友有難絕對第一個衝上前擋下攻擊。',
    personalSecret:
      '童年玩伴曾在兩年前於本校區「轉學失蹤」，卻因認知過濾而想不起玩伴長相。',
    storyRole: '戰鬥與潛行突圍的核心戰力夥伴。',
    relationToProtagonist: '可靠的護衛型夥伴，在危險區域能為主角掩護。',
    sideQuestId: 'quest_char_zhao_jiahao_baton',
    sideQuestTitle: '遺忘的接力棒',
    initialAffinity: 25,
    initialTrust: 15,
    countsTowardStudentAggregate: true,
    awakeningCondition: {
      minAffinity: 65,
      minTrust: 70,
    },
    endingImpactSummary: 'C 結局攻堅前鋒隊長；若缺乏理性引導則可能引發 B 結局衝突。',
  },

  shirakawa_hayate: {
    id: 'shirakawa_hayate',
    number: '07',
    name: '白川颯',
    roleTitle: '白川財閥旁系少爺／三年甲班學生',
    faction: 'internal_reformer',
    primaryAreas: ['corridor', 'teachers_office', 'rooftop', 'underground_b1'],
    background:
      '17 歲，三年甲班學生，白川財閥旁系子弟（白川鎮雄的姪子、白川鏡花的堂弟）。',
    appearance128:
      '銀灰色微捲短髮，氣質冷峻優雅，身穿剪裁合身的特仕版深黑領結制服，配戴白川家徽銀戒。',
    personality: '表面冷漠孤高、言辭犀利，實則對家族將同齡學生當成白老鼠的罪行深感厭惡。',
    personalSecret:
      '暗中隸屬於「內部改革派」，持有可通行教師辦公室與地下 B1 外圍的初階磁卡。',
    storyRole: '遊走於財閥與學生之間的灰線情報源與關鍵內應。',
    relationToProtagonist: '起初警告主角離開，見證主角決心後選擇背叛家族協助她。',
    sideQuestId: 'quest_char_hayate_crest',
    sideQuestTitle: '染血的家徽',
    initialAffinity: 10,
    initialTrust: 5,
    countsTowardStudentAggregate: true,
    awakeningCondition: {
      minAffinity: 60,
      minTrust: 75,
    },
    endingImpactSummary: 'A 結局污點證人；C 結局協助解除 B2 防爆門生物識別鎖。',
  },

  ye_sihan: {
    id: 'ye_sihan',
    number: '08',
    name: '葉思涵',
    roleTitle: '保健室志工／林曉月的摯友',
    faction: 'student_ally',
    primaryAreas: ['infirmary', 'dormitory'],
    background:
      '17 歲，三年丙班學生、保健室學生志工，同時也是林曉月最親密的室友。',
    appearance128:
      '溫婉雙辮、戴著白色護理志工袖章，制服外穿著淺粉色針織開襟衫，隨身攜帶急救包。',
    personality: '溫柔體貼但神經纖細，長期暴露於低劑量藥物與次聲波中。',
    personalSecret:
      '在林曉月失蹤當晚曾躲在保健室布簾後，聽見陳孟哲醫師提到 B1 升降梯密碼與鎮靜劑配方。',
    storyRole: '保健室與宿舍區域的關鍵證人，並提供醫療恢復支援。',
    relationToProtagonist: '在主角尋找林曉月時敞開心扉，負責為受傷的主角包紮。',
    sideQuestId: 'quest_char_ye_sihan_prescription',
    sideQuestTitle: '布簾後的處方箋',
    initialAffinity: 25,
    initialTrust: 15,
    countsTowardStudentAggregate: true,
    awakeningCondition: {
      minAffinity: 65,
      minTrust: 70,
    },
    endingImpactSummary: 'C 結局負責控制保健室據點並開啟通往地下 B1 升降梯。',
  },

  lu_zixuan: {
    id: 'lu_zixuan',
    number: '09',
    name: '陸子軒',
    roleTitle: '視聽與物理社社長／聲學怪才',
    faction: 'student_ally',
    primaryAreas: ['rooftop', 'old_library'],
    background:
      '18 歲，視聽社與物理研究社社長，常年待在頂樓電波塔旁與舊圖書館角落的聲學怪才。',
    appearance128:
      '亂翹的深棕髮、掛著防噪耳機與護目鏡，制服外披著沾有焊錫痕跡的實驗白袍，手持攜帶式示波器。',
    personality: '古怪孤僻、說話連珠炮且充滿科學術語，只對頻率與機械結構感興趣。',
    personalSecret:
      '半年前曾協助蘇語嵐測量校園鐘聲，第一個發現第四聲鐘響中隱藏的 18.9Hz 次聲波調變訊號。',
    storyRole: '破解「認知過濾機制」與「18.9Hz 第四聲鐘響」的科學技術核心。',
    relationToProtagonist: '蘇語嵐生前信賴的技術盟友，將半成品逆相抗頻器託付給蘇語晴。',
    sideQuestId: 'quest_char_lu_zixuan_counterwave',
    sideQuestTitle: '18.9Hz 的逆相波',
    initialAffinity: 20,
    initialTrust: 20,
    countsTowardStudentAggregate: true,
    awakeningCondition: {
      minAffinity: 60,
      minTrust: 75,
    },
    endingImpactSummary: 'C 結局佔領頂樓鐘塔發射全校逆相廣播的絕對核心人物。',
  },

  shen_zhiyuan: {
    id: 'shen_zhiyuan',
    number: '10',
    name: '沈知遠',
    roleTitle: '教務主任',
    faction: 'conservative_coverup',
    primaryAreas: ['academic_office', 'corridor'],
    background: '48 歲，無名校區教務主任，為白川鎮雄服務超過二十年的核心幕僚。',
    appearance128:
      '髮際線後退、梳著油頭，身穿筆挺的鐵灰色西裝，眼神陰鷙，手裡總拿著學籍註銷印章與教鞭。',
    personality: '官僚冷酷、極度重視規矩與表面和平，擅長以學分扣減與退學威脅壓制學生。',
    personalSecret:
      '1998 年三年丙班事故當晚，正是他親手鎖死教室大門並竄改了全班的出缺席與學籍紀錄。',
    storyRole: '保守掩蓋派的中堅執行者，掌管教務處與學業學分系統。',
    relationToProtagonist: '前期主要制度壓迫者。',
    sideQuestId: 'quest_char_shen_safe_ledger',
    sideQuestTitle: '主任保險箱的雙重帳冊',
    initialAffinity: 5,
    initialTrust: 5,
    countsTowardStudentAggregate: false,
    awakeningCondition: {
      minAffinity: 50,
      minTrust: 60,
    },
    endingImpactSummary: 'A 結局遭警方逮捕；C 結局於教師辦公室被學生與家長制伏。',
  },

  xu_wenqian: {
    id: 'xu_wenqian',
    number: '11',
    name: '許文謙',
    roleTitle: '歷史與公民教師／三年丙班導師',
    faction: 'internal_reformer',
    primaryAreas: ['classroom', 'teachers_office'],
    background: '35 歲，三年丙班導師兼歷史與公民教師。',
    appearance128:
      '溫文儒雅，戴著圓框眼鏡，穿著米色毛衣背心與襯衫，手持貼滿便利貼的歷史課本。',
    personality: '看似軟弱隨和，實則內心懷抱教育良知，暗中保護被盯上的學生。',
    personalSecret:
      '「內部改革派」在教師群中的聯絡人，1998 年事故時的實習教師，常在課堂用隱喻提示學生。',
    storyRole: '協助主角維持學分 (academicCredits)、提供教師辦公室情報與掩護的導師。',
    relationToProtagonist: '關心蘇語晴安危的班導師，多次出面為主角擔保。',
    sideQuestId: 'quest_char_xu_wenqian_history_notes',
    sideQuestTitle: '被撕掉的歷史講義',
    initialAffinity: 30,
    initialTrust: 25,
    countsTowardStudentAggregate: false,
    awakeningCondition: {
      minAffinity: 60,
      minTrust: 70,
    },
    endingImpactSummary: 'C 結局攻佔教師辦公室時率領良知教師由內部開門響應。',
  },

  chen_mengzhe: {
    id: 'chen_mengzhe',
    number: '12',
    name: '陳孟哲',
    roleTitle: '駐校校醫／B1 臨床實驗主管',
    faction: 'radical_research',
    primaryAreas: ['infirmary', 'underground_b1'],
    background:
      '42 歲，駐校校醫，實際身分為白川地下研究所 B1 臨床實驗與腦波篩選部主管。',
    appearance128:
      '斯文敗類型，戴著無框眼鏡與醫療口罩，白袍下穿著深綠色手術服，口袋插著鎮靜劑注射器。',
    personality: '表面親切溫和、語調輕柔，實則將所有學生視為數據與活體標本。',
    personalSecret:
      '利用保健室健檢與飲水系統長期對學生投餵微量「順從輔助劑」，並親手將林曉月押送至地底。',
    storyRole: '激進研究派的地面執行者，保健室／B1 區域的主要威脅頭目。',
    relationToProtagonist: '假意關心主角，企圖誘騙主角喝下鎮靜劑送入 B3。',
    sideQuestId: 'quest_char_chen_mengzhe_sedative',
    sideQuestTitle: '甜味鎮靜劑',
    initialAffinity: 10,
    initialTrust: 0,
    countsTowardStudentAggregate: false,
    awakeningCondition: {
      minAffinity: 99,
      minTrust: 99,
    },
    endingImpactSummary: 'A/C 結局於 B1 被擊潰；B/D 結局成為將主角送上手術台的執行者。',
  },

  shirakawa_shizuo: {
    id: 'shirakawa_shizuo',
    number: '13',
    name: '白川鎮雄',
    roleTitle: '白川財閥常務理事／學園最高監督',
    faction: 'conservative_coverup',
    primaryAreas: ['academic_office', 'underground_b1', 'underground_b2'],
    background: '64 歲，白川財閥常務理事、學園最高監督，保守掩蓋派首領。',
    appearance128:
      '滿頭銀髮、神情威嚴冷峻，身穿昂貴的深黑色雙排扣大衣，手拄鑲有白川家徽的烏木手杖。',
    personality: '老謀深算、威權主義，將家族企業的存續置於人命之上。',
    personalSecret:
      '1968 年至 1986 年間的初代人體實驗主持者，為掩蓋反人類罪行不惜啟動地下滅口程序。',
    storyRole: '保守掩蓋派最終代表，掌管財閥私人保全隊與校園封鎖指令。',
    relationToProtagonist: '將蘇語嵐與蘇語晴視為威脅財閥基業的「不穩定瑕疵品」。',
    sideQuestId: 'quest_main_ch2_doctored_history',
    sideQuestTitle: '被塗改的校史與雙面人',
    initialAffinity: 0,
    initialTrust: 0,
    countsTowardStudentAggregate: false,
    awakeningCondition: {
      minAffinity: 100,
      minTrust: 100,
    },
    endingImpactSummary: 'A/C 結局身敗名裂遭逮捕；B 結局下令武力鎮壓釀成慘劇。',
  },

  shirakawa_kyoka: {
    id: 'shirakawa_kyoka',
    number: '14',
    name: '白川鏡花',
    roleTitle: '地下研究所所長／回聲搖籃計畫主持人',
    faction: 'radical_research',
    primaryAreas: ['underground_b2', 'underground_b3'],
    background:
      '36 歲，白川鎮雄的養女兼天才神經科學家，地下研究所所長、「回聲搖籃計畫」最高主持人，激進研究派首領。',
    appearance128:
      '黑長直髮配齊瀏海，眼神狂熱而冰冷，身穿特製的黑邊高科技實驗長袍，配戴神經波形監測單片眼鏡。',
    personality: '極端完美主義與科學狂熱者，認為唯有透過「回聲搖籃」意識同步才是人類進化。',
    personalSecret:
      '曾是 1986 年第一批「第29號席位」的唯一倖存受試者，其情感中樞早已被 18.9Hz 改造。',
    storyRole: '全作最終幕後黑手與地下 B3 核心頭目。',
    relationToProtagonist: '將蘇語嵐與蘇語晴視為完成「回聲搖籃」的完美雙子受試者。',
    sideQuestId: 'quest_char_kyoka_observer_zero',
    sideQuestTitle: '第零號觀察者',
    initialAffinity: 0,
    initialTrust: 0,
    countsTowardStudentAggregate: false,
    awakeningCondition: {
      minAffinity: 100,
      minTrust: 100,
    },
    endingImpactSummary: 'A/C 結局搖籃被毀；D 結局同化主角；E 結局被主角反客為主取代。',
  },

  lin_jingyi: {
    id: 'lin_jingyi',
    number: '15',
    name: '林靜儀',
    roleTitle: '舊圖書館管理員／1998 年事件吹哨者',
    faction: 'internal_reformer',
    primaryAreas: ['old_library', 'forbidden_archive'],
    background:
      '52 歲，舊圖書館管理員。真實身分為 1994～1998 年間曾參與地下聲學研究的資深研究員，後假死隱姓埋名留守圖書館，為內部改革派核心導師。',
    appearance128:
      '盤起灰白髮髻、戴著老花眼鏡，身穿樸素的深褐色長裙與披肩，手持舊式煤油提燈與禁書室銅鑰匙。',
    personality: '沉穩內斂、外冷內熱，說話簡潔卻字字珠璣。',
    personalSecret:
      '半年前曾暗中指導蘇語嵐調查真相，將禁書室改造為反抗財閥的秘密基地。',
    storyRole: '主角的情報導師、禁書室守門人，指引通往 B1～B3 的密道。',
    relationToProtagonist: '像長輩般守護蘇語晴，將語嵐未能完成的遺志與解碼器交給主角。',
    sideQuestId: 'quest_char_lin_jingyi_redemption',
    sideQuestTitle: '守書人的贖罪',
    initialAffinity: 30,
    initialTrust: 20,
    countsTowardStudentAggregate: false,
    awakeningCondition: {
      minAffinity: 65,
      minTrust: 75,
    },
    endingImpactSummary: 'A 結局與 C 結局中提供摧毀 B3 回聲搖籃的終極逆相頻率參數。',
  },
};

export const ALL_CHARACTER_IDS = Object.keys(CHARACTERS_CATALOG) as CharacterId[];
