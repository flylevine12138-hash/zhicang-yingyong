/* ===== 评测UI模块 ===== */
const EvalUI = {
  currentStep: 0,
  steps: [],
  voiceTaskIndex: 0,
  multiCmdRound: 0,
  timerStart: 0,
  timerInterval: null,
  stepCount: 0,

  // 随机题库（初始化时抽取）
  _randomMusic: null,    // 音乐点歌题
  _randomWindow: null,   // 车窗控制题
  _randomDrink: null,    // 饮品导航题
  _randomVideo: null,    // 视频片段题
  _randomSongSkip: null, // 跳副歌题
  _randomLyric: null,    // 歌词猜歌题
  _randomOral5P2: null,  // 口语理解5/7第二轮追加题

  // 音乐点歌题库（语音任务3/7）
  _musicPool: [
    { cmd: '我想听周杰伦的稻香', hint: '观察车机是否找到并播放了指定歌曲' },
    { cmd: '我想听陈奕迅的孤勇者', hint: '观察车机是否找到并播放了指定歌曲' },
    { cmd: '我想听林俊杰的江南', hint: '观察车机是否找到并播放了指定歌曲' }
  ],

  // 车窗控制题库（语音任务4/7）
  _windowPool: [
    { cmd: '打开主驾车窗', hint: '观察车机是否只打开了主驾位置的车窗' },
    { cmd: '打开副驾车窗', hint: '观察车机是否只打开了副驾位置的车窗' },
    { cmd: '打开后排车窗', hint: '观察车机是否打开了后排的车窗' },
    { cmd: '车窗打开30%', hint: '观察车机是否能精确控制车窗开度（目前很少有车能实现）' }
  ],

  // 饮品+导航题库（语音任务5/7）
  _drinkPool: [
    { cmd: '我想喝杯冰美式，帮我导航过去', hint: '观察车机是否导航到了附近的咖啡店' },
    { cmd: '我想喝杯桃桃乌龙，帮我导航过去', hint: '观察车机是否导航到了附近的奶茶店' },
    { cmd: '我想喝杯手打柠檬茶，帮我导航过去', hint: '观察车机是否导航到了附近的饮品店' }
  ],

  // 视频片段题库（语音任务6/7）
  _videoClipPool: [
    { cmd: '我想看《亮剑》里面李云龙喊"二营长，你他娘的意大利炮呢？"这个片段', hint: '观察车机是否能找到并播放指定影视片段' }
  ],

  // 跳副歌题库（语音任务7/7）
  _songSkipPool: [
    { cmd: '我想听周杰伦的《晴天》的副歌部分，直接跳过去吧', hint: '观察车机是否能识别"副歌部分"并直接跳转播放' }
  ],

  // 歌词猜歌题库（口语理解6/7）
  _lyricGuessPool: [
    { lyric: '"相对，针锋相对"', song: '《枪火》', singer: '宝石Gem（老舅）' },
    { lyric: '"可惜不是你，陪我到最后"', song: '《可惜不是你》', singer: '梁静茹' },
    { lyric: '"后来，终于在眼泪中明白"', song: '《后来》', singer: '刘若英' }
  ],

  // 口语理解5/7第二轮追加题库（2题随机，含记忆回访信息）
  _oral5Phase2Pool: [
    {
      cmd: '我想在中途找个餐馆吃饭，帮我找个人少一点的餐馆，不要选川菜馆，因为我不能吃辣',
      hint: '导航开始后，继续说这条追加指令',
      memoryQ: '你还记得我前面告诉你的，我不能吃什么吗？',
      memoryA: '不能吃辣（川菜）'
    },
    {
      cmd: '我想在中途喝个东西，帮我选个不用排队的店，但不要选咖啡店，我不能喝咖啡',
      hint: '导航开始后，继续说这条追加指令',
      memoryQ: '你还记得我前面告诉你的，我不能喝什么吗？',
      memoryA: '不能喝咖啡'
    }
  ],

  // 城市地标题库（每个城市3题，第4题随机抽取）
  _cityLandmarks: {
    '北京': [
      {q: '我要去北京最有名的湖，就在市中心', a: '什刹海'},
      {q: '我想去北京最高的山，秋天可以看红叶', a: '香山'},
      {q: '我想去北京最有名的古代宫殿', a: '故宫'}
    ],
    '上海': [
      {q: '我要去上海最有名的高楼，在黄浦江边', a: '东方明珠'},
      {q: '我要去上海最热闹的步行街', a: '南京路步行街'},
      {q: '我要去上海最有名的地方，以前叫十里洋场', a: '外滩'}
    ],
    '广州': [
      {q: '我要去广州最有名的山，就在市区里', a: '白云山'},
      {q: '我要去广州最热闹的商业街', a: '北京路步行街'},
      {q: '我要去广州最有名的建筑，腰身很细', a: '广州塔'}
    ],
    '深圳': [
      {q: '我要去深圳最出名的海滩', a: '大梅沙'},
      {q: '我要去深圳最有名的主题公园', a: '世界之窗'},
      {q: '我要去深圳最繁华的购物中心', a: '万象城'}
    ],
    '杭州': [
      {q: '我要去杭州最有名的湖，就在市中心', a: '西湖'},
      {q: '我要去杭州最有名的寺庙', a: '灵隐寺'},
      {q: '我要去杭州最热闹的步行街，就在西湖边上', a: '河坊街'}
    ],
    '成都': [
      {q: '我要去成都最有名的广场，市中心有个大熊猫屁股', a: '春熙路'},
      {q: '我要去成都最出名的古街', a: '宽窄巷子'},
      {q: '我要去成都看国宝大熊猫的地方', a: '大熊猫繁育基地'}
    ],
    '重庆': [
      {q: '我要去重庆最有名的吊脚楼，晚上灯光特别好看', a: '洪崖洞'},
      {q: '我要去重庆最繁华的商圈，有个解放碑', a: '解放碑'},
      {q: '我要去重庆最有名的古镇', a: '磁器口'}
    ],
    '武汉': [
      {q: '我要去武汉最有名的楼，在蛇山上', a: '黄鹤楼'},
      {q: '我要去武汉最大的湖，就在市区里', a: '东湖'},
      {q: '我要去武汉最热闹的步行街', a: '楚河汉街'}
    ],
    '南京': [
      {q: '我要去南京最有名的湖泊，就在市中心', a: '玄武湖'},
      {q: '我要去南京最有名的陵墓，在紫金山上', a: '中山陵'},
      {q: '我要去南京最热闹的商圈', a: '新街口'}
    ],
    '西安': [
      {q: '我要去西安最有名的古塔，在大雁塔广场', a: '大雁塔'},
      {q: '我要去西安最有名的古代军团', a: '兵马俑'},
      {q: '我要去西安最有名的古城墙', a: '西安城墙'}
    ],
    '长沙': [
      {q: '我要去长沙最有名的山，在湘江边', a: '岳麓山'},
      {q: '我要去长沙最热闹的商圈', a: '五一广场'},
      {q: '我要去长沙最有名的洲，岛头有雕像', a: '橘子洲'}
    ],
    '青岛': [
      {q: '我要去青岛最有名的海滨景点，有个回澜阁', a: '栈桥'},
      {q: '我要去青岛最有名的风景区，有很多外国建筑', a: '八大关'},
      {q: '我要去青岛最高的山，可以看全城', a: '崂山'}
    ],
    '其他': [
      {q: '我要去市中心最有名的公园', a: '市公园'},
      {q: '我要去市中心最有名的广场', a: '市中心广场'},
      {q: '我要去火车站', a: '火车站'}
    ]
  },

  _getLandmarkQuestion(city, index) {
    const list = this._cityLandmarks[city] || this._cityLandmarks['其他'];
    return list[index % list.length];
  },

  // ===== 初始化评测流程 =====
  init() {
    this.currentStep = 0;
    this.voiceTaskIndex = 0;
    this.multiCmdRound = 0;
    this.cityQuestionIndex = Math.floor(Math.random() * 3); // 随机抽取地标题

    // 从各题库中随机抽一题
    this._randomMusic = this._musicPool[Math.floor(Math.random() * this._musicPool.length)];
    this._randomWindow = this._windowPool[Math.floor(Math.random() * this._windowPool.length)];
    this._randomDrink = this._drinkPool[Math.floor(Math.random() * this._drinkPool.length)];
    this._randomVideo = this._videoClipPool[Math.floor(Math.random() * this._videoClipPool.length)];
    this._randomSongSkip = this._songSkipPool[Math.floor(Math.random() * this._songSkipPool.length)];
    this._randomLyric = this._lyricGuessPool[Math.floor(Math.random() * this._lyricGuessPool.length)];
    this._randomOral5P2 = this._oral5Phase2Pool[Math.floor(Math.random() * this._oral5Phase2Pool.length)];

    const city = App.state.city;
    const ww = App.state.wakeWord;
    const prefix = ww ? ww + '，' : '';

    // 构建评测步骤
    this.steps = [
      // 维度介绍 + B+C1语音任务（共用7个任务）
      { type: 'intro', icon: '🎯', title: '语音操作效率', desc: '用7个标准语音任务测试车机的操作效率、精简度和响应速度，一次测完出分' },
      { type: 'voice-task', index: 0, cmd: prefix + '导航到' + this._cityField(city, 'station') },
      { type: 'voice-task', index: 1, cmd: prefix + '空调调到24度' },
      { type: 'voice-task', index: 2, cmd: prefix + this._randomMusic.cmd, hint: this._randomMusic.hint },
      { type: 'voice-task', index: 3, cmd: prefix + this._randomWindow.cmd, hint: this._randomWindow.hint },
      { type: 'voice-task', index: 4, cmd: prefix + this._randomDrink.cmd, hint: this._randomDrink.hint },
      { type: 'voice-task', index: 5, cmd: prefix + this._randomVideo.cmd, hint: this._randomVideo.hint },
      { type: 'voice-task', index: 6, cmd: prefix + this._randomSongSkip.cmd, hint: this._randomSongSkip.hint },

      // C3口语理解（8题递进）
      { type: 'intro', icon: '🧩', title: '口语理解', desc: '8道递进式题目，测试车机对自然语言的理解和执行能力' },
      { type: 'oral', qIndex: 0 },
      { type: 'oral', qIndex: 1 },
      { type: 'oral', qIndex: 2 },
      { type: 'oral', qIndex: 3 },
      { type: 'oral', qIndex: 4 },
      { type: 'oral', qIndex: 5 },
      { type: 'oral', qIndex: 6 },
      { type: 'oral', qIndex: 7 },

      // C4多指令递增
      { type: 'intro', icon: '🧠', title: '多指令连续对话', desc: '逐轮增加指令数量，测出车机多指令处理的极限' },
      { type: 'multi-cmd' },

      // D界面设计
      { type: 'intro', icon: '👁️', title: '界面设计', desc: '评价智舱界面的视觉设计、信息布局和操作反馈' },
      { type: 'subjective', dim: 'D', qIndex: 0 },
      { type: 'subjective', dim: 'D', qIndex: 1 },
      { type: 'subjective', dim: 'D', qIndex: 2 },

      // E生态丰富度
      { type: 'intro', icon: '🌐', title: '生态丰富度', desc: '评价车载应用数量、手机互联和场景智能' },
      { type: 'subjective', dim: 'E', qIndex: 0 },
      { type: 'subjective', dim: 'E', qIndex: 1 },
      { type: 'subjective', dim: 'E', qIndex: 2 },

      // F主观体验
      { type: 'intro', icon: '✨', title: '主观体验', desc: '评价系统流畅度、安全设计和整体感受' },
      { type: 'subjective', dim: 'F', qIndex: 0 },
      { type: 'subjective', dim: 'F', qIndex: 1 },
      { type: 'subjective', dim: 'F', qIndex: 2 },

      // 完成
      { type: 'finish' }
    ];

    this._renderProgress();
    this._renderStep();
  },

  // 获取城市字段值
  _cityField(city, field) {
    const data = {
      '北京': { station: '北京南站', landmark: '故宫', hospital: '协和医院', scenic: '颐和园' },
      '上海': { station: '上海虹桥站', landmark: '东方明珠', hospital: '瑞金医院', scenic: '外滩' },
      '广州': { station: '广州南站', landmark: '广州塔', hospital: '中山一院', scenic: '白云山' },
      '深圳': { station: '深圳北站', landmark: '世界之窗', hospital: '北大深圳医院', scenic: '大梅沙' },
      '杭州': { station: '杭州东站', landmark: '西湖', hospital: '浙大一院', scenic: '灵隐寺' },
      '成都': { station: '成都东站', landmark: '大熊猫繁育基地', hospital: '华西医院', scenic: '宽窄巷子' },
      '重庆': { station: '重庆北站', landmark: '洪崖洞', hospital: '重医附一院', scenic: '磁器口' },
      '武汉': { station: '武汉站', landmark: '黄鹤楼', hospital: '同济医院', scenic: '东湖' },
      '南京': { station: '南京南站', landmark: '中山陵', hospital: '鼓楼医院', scenic: '夫子庙' },
      '西安': { station: '西安北站', landmark: '兵马俑', hospital: '西京医院', scenic: '大雁塔' },
      '长沙': { station: '长沙南站', landmark: '橘子洲', hospital: '湘雅医院', scenic: '岳麓山' },
      '青岛': { station: '青岛站', landmark: '栈桥', hospital: '青医附院', scenic: '八大关' },
      '其他': { station: '火车站', landmark: '市中心广场', hospital: '市人民医院', scenic: '市公园' }
    };
    return (data[city] && data[city][field]) || '火车站';
  },

  // ===== 进度条 =====
  _renderProgress() {
    const container = document.getElementById('eval-progress-steps');
    container.innerHTML = '';
    const total = this.steps.length;
    for (let i = 0; i < total; i++) {
      const step = document.createElement('div');
      step.className = 'progress-step';
      if (i < this.currentStep) step.classList.add('done');
      if (i === this.currentStep) step.classList.add('active');
      container.appendChild(step);
    }
  },

  // ===== 渲染当前步骤 =====
  _renderStep() {
    const step = this.steps[this.currentStep];
    if (!step) return;

    this._renderProgress();
    const container = document.getElementById('eval-content');

    switch (step.type) {
      case 'intro': container.innerHTML = this._htmlIntro(step); break;
      case 'voice-task': container.innerHTML = this._htmlVoiceTask(step); break;
      case 'oral': container.innerHTML = this._htmlOralQuestion(step); break;
      case 'multi-cmd': container.innerHTML = this._htmlMultiCmd(); break;
      case 'subjective': container.innerHTML = this._htmlSubjective(step); break;
      case 'finish': container.innerHTML = this._htmlFinish(); break;
    }

    // 维度介绍卡片自动下一步
    if (step.type === 'intro') {
      setTimeout(() => {
        if (this.steps[this.currentStep]?.type === 'intro') {
          this.nextStep();
        }
      }, 2000);
    }
  },

  // ===== 下一步 =====
  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this._renderStep();
    }
  },

  // ===== HTML: 维度介绍 =====
  _htmlIntro(step) {
    return `
      <div class="eval-card">
        <div class="dimension-intro">
          <div class="dimension-intro-icon">${step.icon}</div>
          <div class="dimension-intro-title">${step.title}</div>
          <div class="dimension-intro-desc">${step.desc}</div>
        </div>
      </div>`;
  },

  // ===== HTML: 语音任务（B+C1共用）=====
  _htmlVoiceTask(step) {
    const idx = step.index;
    const total = 7;
    const hint = step.hint || '请对着车机朗读上方指令';
    return `
      <div class="eval-card">
        <div class="eval-card-header">
          <div class="eval-card-icon">🎯</div>
          <div>
            <div class="eval-card-title">语音任务 ${idx + 1}/${total}</div>
            <div class="eval-card-subtitle">对车机说出下方指令，观察执行情况</div>
          </div>
        </div>
        <div class="voice-command">
          <div class="voice-command-text">${step.cmd}</div>
          <div class="voice-command-hint">${hint}</div>
        </div>
        <div class="eval-actions">
          <button class="eval-btn primary-action" id="btn-speak-done" onclick="EvalUI.onSpeakDone(${idx})">说完了</button>
          <button class="eval-btn primary-action" id="btn-feedback" onclick="EvalUI.onFeedback(${idx})" style="display:none">有反馈了</button>
        </div>
        <div class="timer-display" id="timer-area" style="display:none">
          <div class="timer-label">车机执行中...</div>
          <div class="timer-value" id="timer-value">0.0s</div>
        </div>
        <div class="eval-actions" id="result-btns" style="display:none">
          <button class="eval-btn success" onclick="EvalUI.onTaskSuccess(${idx})">执行成功</button>
          <button class="eval-btn fail" onclick="EvalUI.onTaskFail(${idx})">执行失败</button>
        </div>
      </div>`;
  },

  incStep() {}, // 已移除
  decStep() {}, // 已移除

  onSpeakDone(idx) {
    document.getElementById('btn-speak-done').style.display = 'none';
    document.getElementById('btn-feedback').style.display = 'flex';
    this.timerStart = performance.now();
  },

  onFeedback(idx) {
    const responseTime = performance.now() - this.timerStart;
    document.getElementById('btn-feedback').style.display = 'none';
    document.getElementById('timer-area').style.display = 'block';
    document.getElementById('result-btns').style.display = 'flex';

    // 开始计时直到完成
    this._responseTime = responseTime;
    this._completionStart = performance.now();
    this.timerInterval = setInterval(() => {
      const elapsed = (performance.now() - this._completionStart) / 1000;
      document.getElementById('timer-value').textContent = elapsed.toFixed(1) + 's';
    }, 100);
  },

  onTaskSuccess(idx) {
    clearInterval(this.timerInterval);
    const completionTime = performance.now() - this._completionStart;
    const task = {
      index: idx,
      success: true,
      sentenceCount: this.stepCount,
      responseTime_ms: Math.round(this._responseTime),
      completionTime_ms: Math.round(completionTime)
    };
    App.state.rawData.voiceTasks.push(task);
    this.stepCount = 0;
    this.nextStep();
  },

  onTaskFail(idx) {
    clearInterval(this.timerInterval);
    const completionTime = performance.now() - this._completionStart;
    const task = {
      index: idx,
      success: false,
      sentenceCount: this.stepCount,
      responseTime_ms: Math.round(this._responseTime),
      completionTime_ms: Math.round(completionTime)
    };
    App.state.rawData.voiceTasks.push(task);
    this.stepCount = 0;
    this.nextStep();
  },

  // ===== HTML: 口语理解 =====
  _htmlOralQuestion(step) {
    const qIdx = step.qIndex;
    const prefix = App.state.wakeWord ? App.state.wakeWord + '，' : '';
    const city = App.state.city;

    const questions = [
      {
        cmd: prefix + '我有点热了',
        hint: '观察车机是否调节了温度或风量',
        options: [
          { label: '降低了空调温度', key: 'temp_down' },
          { label: '调大了风量', key: 'fan_up' },
          { label: '没有任何反应', key: 'none' }
        ]
      },
      {
        cmd: prefix + '我有点渴了',
        hint: '观察车机是否推荐了买水的地方',
        options: [
          { label: '推荐了买水的地方并导航', key: 'nav_recommend' },
          { label: '口头推荐了但没导航', key: 'oral_only' },
          { label: '没反应或答非所问', key: 'none' }
        ]
      },
      {
        cmd: prefix + '我有点困了，想休息下',
        hint: '观察车机是否触发了休憩相关功能（座椅/模式/音乐/灯光）',
        options: [
          { label: '触发了休憩相关功能', key: 'triggered' },
          { label: '只口头安慰没执行', key: 'oral_only' },
          { label: '没反应', key: 'none' }
        ]
      },
      {
        cmd: prefix + this._getLandmarkQuestion(city, this.cityQuestionIndex).q,
        hint: '观察车机是否导航到了正确的地标',
        expected: this._getLandmarkQuestion(city, this.cityQuestionIndex).a,
        options: [
          { label: '导航目的地正确（' + this._getLandmarkQuestion(city, this.cityQuestionIndex).a + '）', key: 'correct_nav' },
          { label: '猜对了但导航到别的地方', key: 'wrong_nav' },
          { label: '没猜对', key: 'fail' }
        ]
      },
      {
        cmd: prefix + '我想买一张明天去XX（说你想去的城市名）的' + (Math.random() > 0.5 ? '飞机票' : '高铁票') + '，帮我选一个靠近中午的时间段，选好票后直接发起付款吧',
        hint: '观察车机是否能理解购票意图、筛选时间、执行付款全流程',
        options: [
          { label: '根据需求找到合适的机票/高铁票，并发起付款流程', key: 'ticket_full_pay' },
          { label: '根据需求找了几个机票/高铁票选择供你选择，确认后发起付款流程', key: 'ticket_select_pay' },
          { label: '完成上述两个选项前半部分，但没有执行后续付款流程', key: 'ticket_no_pay' },
          { label: '根据需求模糊回应，且没有执行后续付款流程', key: 'ticket_vague' },
          { label: '答非所问', key: 'ticket_irrelevant' }
        ]
      },
      {
        cmd: prefix + '我要去一个地方，' + this._getRiddle(city),
        hint: '观察车机是否猜出了地标并导航。猜对后继续说出追加指令',
        answer: this._cityField(city, 'landmark'),
        phase: 1
      },
      {
        cmd: prefix + '我想听个歌，大概的歌词是' + this._randomLyric.lyric,
        hint: '观察车机是否猜对歌曲' + this._randomLyric.song + '并自动播放',
        expected: this._randomLyric.song + '（' + this._randomLyric.singer + '）',
        options: [
          { label: '猜对了并自动播放', key: 'correct_play' },
          { label: '猜对了但没播放', key: 'correct_no_play' },
          { label: '没猜对', key: 'fail' }
        ]
      },
      {
        cmd: prefix + this._randomOral5P2.memoryQ,
        hint: '测试车机是否有上下文记忆能力',
        expected: this._randomOral5P2.memoryA,
        options: [
          { label: '记得，答对了（' + this._randomOral5P2.memoryA + '）', key: 'remember_correct' },
          { label: '答错了', key: 'remember_wrong' },
          { label: '没反应或答非所问', key: 'none' }
        ]
      }
    ];

    const q = questions[qIdx];
    const difficulty = ['⭐', '⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐'][qIdx];

    let html = `
      <div class="eval-card">
        <div class="eval-card-header">
          <div class="eval-card-icon">🧩</div>
          <div>
            <div class="eval-card-title">口语理解 ${qIdx + 1}/8</div>
            <div class="eval-card-subtitle">难度 ${difficulty}</div>
          </div>
        </div>
        <div class="voice-command">
          <div class="voice-command-text">${q.cmd}</div>
          <div class="voice-command-hint">${q.hint}</div>
        </div>`;

    if (q.expected) {
      html += `<div class="text-center text-dim mb-16" style="font-size:13px">参考答案：${q.expected}</div>`;
    }
    if (q.answer) {
      html += `<div class="text-center text-dim mb-16" style="font-size:13px">参考答案：${q.answer}</div>`;
    }

    if (qIdx !== 5) {
      // 非第6题：单次选择（前5题 + 第7、8题）
      html += `<div class="option-list">`;
      q.options.forEach(opt => {
        html += `<div class="option-item" onclick="EvalUI.onOralAnswer(${qIdx}, '${opt.key}')">${opt.label}</div>`;
      });
      html += `</div>`;
    } else {
      // 第6题：两阶段（谜面+中途追加）
      html += `
        <div id="oral5-phase1">
          <div class="text-center mb-16" style="font-size:14px;color:var(--text-mid)">第一轮：谜面导航</div>
          <div class="option-list">
            <div class="option-item" onclick="EvalUI.onOral5Phase1(true)">导航目的地正确</div>
            <div class="option-item" onclick="EvalUI.onOral5Phase1(false)">不正确</div>
          </div>
        </div>
        <div id="oral5-phase2" style="display:none">
          <div class="voice-command mt-16">
            <div class="voice-command-text">${prefix}${this._randomOral5P2.cmd}</div>
            <div class="voice-command-hint">${this._randomOral5P2.hint}</div>
          </div>
          <div class="text-center mb-16" style="font-size:14px;color:var(--text-mid)">第二轮：中途追加指令</div>
          <div class="option-list">
            <div class="option-item" onclick="EvalUI.onOral5Phase2('waypoint')">推荐了地点确认后，并在原导航中增加途经点</div>
            <div class="option-item" onclick="EvalUI.onOral5Phase2('keep')">推荐了地点确认后，只保留原导航没有增加途经点</div>
            <div class="option-item" onclick="EvalUI.onOral5Phase2('oral')">只推荐了地点，没有后续操作</div>
            <div class="option-item" onclick="EvalUI.onOral5Phase2('none')">没反应或答非所问</div>
          </div>
        </div>`;
    }

    html += `</div>`;
    return html;
  },

  _getRiddle(city) {
    const riddles = {
      '北京': '在市中心，是全国最大的古代宫殿建筑群，以前是皇帝住的地方，有9999间半的房间',
      '上海': '在黄浦江边上，468米高的电视塔，形状像几个球叠在一起',
      '广州': '被称为小蛮腰，是广州最高的建筑，腰身很细，晚上会变色',
      '深圳': '把全世界著名建筑按比例缩小建在一起，有埃菲尔铁塔、金字塔的微缩版',
      '杭州': '在市中心，有个很大的湖，经常被用来衡量其他湖泊的水量，李白白居易都为它写过诗',
      '成都': '专门保护一种黑白相间的中国国宝动物，可以看到刚出生的幼崽，全球都很有名',
      '重庆': '依山而建的吊脚楼群，晚上灯光一亮像宫崎骏动画，在嘉陵江边上',
      '武汉': '在蛇山山顶，有一千七百多年历史，崔颢写过昔人已乘黄鹤去',
      '南京': '孙中山先生的陵墓，在紫金山南麓，有392级台阶',
      '西安': '两千年前的地下军团，有几千个真人大小的陶俑，被誉为世界第八大奇迹',
      '长沙': '在湘江中间的狭长岛屿，岛头有巨大的青年毛泽东石像',
      '青岛': '从海边伸进海里，尽头有个八角亭子叫回澜阁，是青岛明信片最常见的风景'
    };
    return riddles[city] || '市中心最有名的地方';
  },

  onOralAnswer(qIdx, key) {
    App.state.rawData.oralUnderstanding.push({ qIndex: qIdx, answer: key });
    this.nextStep();
  },

  onOral5Phase1(correct) {
    App.state.rawData.oralUnderstanding.push({ qIndex: 4, phase: 1, correct: correct });
    if (correct) {
      document.getElementById('oral5-phase1').style.display = 'none';
      document.getElementById('oral5-phase2').style.display = 'block';
    } else {
      App.state.rawData.oralUnderstanding.push({ qIndex: 4, phase: 2, result: 'skipped' });
      this.nextStep();
    }
  },

  onOral5Phase2(result) {
    App.state.rawData.oralUnderstanding.push({ qIndex: 4, phase: 2, result: result });
    this.nextStep();
  },

  // ===== HTML: 多指令递增 =====
  _htmlMultiCmd() {
    const round = this.multiCmdRound;
    const cmdCount = round + 2;
    const prefix = App.state.wakeWord ? App.state.wakeWord + '，' : '';

    // 构建指令列表
    const cmds = [
      prefix + '导航到' + this._cityField(App.state.city, 'station'),
      '空调调到22度',
      '我想听周杰伦的稻香',
      '打开座椅通风',
      '主驾和副驾车窗全部打开',
      '打开氛围灯',
      '后排空调调到20度',
      '导航经过' + this._cityField(App.state.city, 'hospital')
    ];

    const currentCmds = cmds.slice(0, cmdCount);

    return `
      <div class="eval-card">
        <div class="eval-card-header">
          <div class="eval-card-icon">🧠</div>
          <div>
            <div class="eval-card-title">多指令测试</div>
            <div class="eval-card-subtitle">一口气说完${cmdCount}个指令</div>
          </div>
        </div>
        <div class="round-indicator">
          <span class="round-badge">第 ${round + 1} 轮</span>
          <span class="round-badge">${cmdCount}个指令</span>
        </div>
        <div class="voice-command">
          <div class="voice-command-text">${currentCmds.map((c, i) => i === 0 ? c : c).join('，')}</div>
          <div class="voice-command-hint">两句话之间不要停顿，尽量一口气说完</div>
        </div>
        <div class="eval-actions">
          <button class="eval-btn success" onclick="EvalUI.onMultiCmdResult('all')">全部执行了</button>
          <button class="eval-btn fail" onclick="EvalUI.onMultiCmdResult('partial')">只执行了部分</button>
          <button class="eval-btn fail" onclick="EvalUI.onMultiCmdResult('none')">都没执行</button>
        </div>
      </div>`;
  },

  onMultiCmdResult(result) {
    App.state.rawData.multiCmdRounds.push({
      round: this.multiCmdRound + 1,
      cmdCount: this.multiCmdRound + 2,
      result: result
    });

    if (result === 'all' && this.multiCmdRound < 6) {
      this.multiCmdRound++;
      this._renderStep();
    } else {
      // 测试结束，进入下一步
      this.nextStep();
    }
  },

  // ===== HTML: 主观评价 =====
  _htmlSubjective(step) {
    const dim = step.dim;
    const qIdx = step.qIndex;

    const questions = {
      D: [
        { key: 'D1', title: '图标和文字清晰度', options: ['非常清晰，驾驶距离下也能看清', '一般，近距离能看清', '不清晰，即使近距离也费力'] },
        { key: 'D2', title: '信息布局合理性', options: ['关键控制信息优先展示', '一般，偶尔需要找', '布局混乱，关键信息藏得深'] },
        { key: 'D3', title: '操作反馈明确度', options: ['多模态反馈（视觉+声音+震动）', '只有简单反馈', '无反馈'] }
      ],
      E: [
        { key: 'E1', title: '车载App数量', options: ['大于20个常用App', '10-20个', '少于10个'] },
        { key: 'E2', title: '手车互联', options: ['3个以上（CarPlay/HiCar等）', '1-2个', '不支持'] },
        { key: 'E3', title: '场景智能', options: ['有多个智舱场景供选择，并支持个性化设置智舱场景和任务', '有单一智舱场景供选择，并支持个性化设置智舱场景和任务', '有智舱场景供选择，但没有个性化设置功能', '没有相关智舱场景功能'] }
      ],
      F: [
        { key: 'F1', title: '系统流畅度', options: ['非常流畅，无卡顿', '偶尔卡顿，不影响使用', '经常卡顿，体验差'] },
        { key: 'F2', title: '安全感设计', options: ['有丰富安全提示（车速、障碍物、盲区等）', '只有简单提示', '无提示'] },
        { key: 'F3', title: '整体设计感受', options: ['有科技感/豪华感', '一般', '无感'] }
      ]
    };

    const q = questions[dim][qIdx];
    const icons = { D: '👁️', E: '🌐', F: '✨' };

    return `
      <div class="eval-card">
        <div class="eval-card-header">
          <div class="eval-card-icon">${icons[dim]}</div>
          <div>
            <div class="eval-card-title">${q.title}</div>
          </div>
        </div>
        <div class="option-list">
          ${q.options.map((opt, i) => `<div class="option-item" onclick="EvalUI.onSubjective('${q.key}', ${i})">${opt}</div>`).join('')}
        </div>
      </div>`;
  },

  onSubjective(key, optionIndex) {
    App.state.rawData.subjective[key] = optionIndex;
    this.nextStep();
  },

  // ===== HTML: 完成 =====
  _htmlFinish() {
    const duration = Math.round((Date.now() - App.state.evalStartTime) / 60000);

    return `
      <div class="eval-card">
        <div class="dimension-intro">
          <div class="dimension-intro-icon">🎉</div>
          <div class="dimension-intro-title">评测完成</div>
          <div class="dimension-intro-desc">
            本次评测用时 ${duration} 分钟
          </div>
          <button class="btn-primary btn-glow mt-16" onclick="App.finishEvaluation()">
            <span>查看报告</span>
          </button>
        </div>
      </div>`;
  }
};