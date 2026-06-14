/* ===== 应用主控制器 ===== */
const App = {
  // 全局状态
  state: {
    currentPage: 'page-home',
    brand: '',
    wakeWord: '',
    city: '',
    evaluating: false,
    evalStartTime: null,
    // 评测数据（全部传给后端，前端只存原始数据）
    rawData: {
      brand: '',
      model: '',
      wakeWord: '',
      city: '',
      voiceTasks: [],       // 语音任务（B+C1共用）
      oralUnderstanding: [], // C3口语理解
      multiCmdRounds: [],    // C4多指令递增
      subjective: {},        // D/E/F主观评分
      capabilities: {}       // 语音能力矩阵
    }
  },

  // ===== 页面导航 =====
  goTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('page-current'));
    document.getElementById(pageId).classList.add('page-current');
    this.state.currentPage = pageId;

    if (pageId === 'page-eval') {
      EvalUI.init();
    }
    if (pageId === 'page-report') {
      Report.generate();
    }
  },

  // ===== 品牌选择 =====
  selectBrand(btn) {
    document.querySelectorAll('.brand-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const brand = btn.dataset.brand;

    if (brand === 'other') {
      const input = document.getElementById('brand-custom');
      input.style.display = 'block';
      input.focus();
      this.state.brand = '';
      this.state.wakeWord = '';
      document.getElementById('wake-word-display').style.display = 'none';
      document.getElementById('wake-word-edit').style.display = 'block';
    } else {
      document.getElementById('brand-custom').style.display = 'none';
      this.state.brand = brand;
      this.state.wakeWord = btn.dataset.wake;

      // 显示唤醒词
      const display = document.getElementById('wake-word-display');
      const wakeText = document.getElementById('wake-word-text');
      if (this.state.wakeWord) {
        wakeText.textContent = '「' + this.state.wakeWord + '」';
        display.style.display = 'flex';
        document.getElementById('wake-word-edit').style.display = 'none';
      } else {
        wakeText.textContent = '无需唤醒词（直接说）';
        display.style.display = 'flex';
        document.getElementById('wake-word-edit').style.display = 'none';
      }
    }

    this.checkReady();
  },

  selectCity(btn) {
    document.querySelectorAll('.city-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const city = btn.dataset.city;

    if (city === 'other') {
      const input = document.getElementById('city-custom');
      input.style.display = 'block';
      input.focus();
      this.state.city = '';
    } else {
      document.getElementById('city-custom').style.display = 'none';
      this.state.city = city;
    }
    this.checkReady();
  },

  setWakeWord() {
    const input = document.getElementById('wake-word-input');
    const val = input.value.trim();
    if (val) {
      this.state.wakeWord = val;
      const display = document.getElementById('wake-word-display');
      document.getElementById('wake-word-text').textContent = '「' + val + '」';
      display.style.display = 'flex';
      document.getElementById('wake-word-edit').style.display = 'none';
      this.showToast('唤醒词已设为「' + val + '」');
    }
  },

  checkReady() {
    const btn = document.getElementById('btn-start-eval');
    const note = document.getElementById('ready-note');
    const brandOk = this.state.brand || document.getElementById('brand-custom').value.trim();
    const cityOk = this.state.city || document.getElementById('city-custom').value.trim();

    if (brandOk && cityOk) {
      btn.disabled = false;
      note.textContent = '所有设置已完成，点击开始评测';
      note.style.color = 'var(--success)';
    } else {
      btn.disabled = true;
      note.textContent = '请先完成品牌和城市选择';
      note.style.color = 'var(--warning)';
    }
  },

  // ===== 开始评测 =====
  startEvaluation() {
    // 同步自定义输入
    if (!this.state.brand) {
      this.state.brand = document.getElementById('brand-custom').value.trim() || '其他';
    }
    if (!this.state.city) {
      this.state.city = document.getElementById('city-custom').value.trim() || '其他';
    }

    // 初始化原始数据
    this.state.rawData.brand = this.state.brand;
    this.state.rawData.wakeWord = this.state.wakeWord;
    this.state.rawData.city = this.state.city;
    this.state.rawData.voiceTasks = [];
    this.state.rawData.oralUnderstanding = [];
    this.state.rawData.multiCmdRounds = [];
    this.state.rawData.subjective = {};
    this.state.rawData.capabilities = {};

    this.state.evaluating = true;
    this.state.evalStartTime = Date.now();

    // 跳转到评测页
    this.goTo('page-eval');
    this.showToast('评测开始，请按照引导操作');
  },

  // ===== 结束评测 =====
  finishEvaluation() {
    this.state.evaluating = false;

    const duration = Math.round((Date.now() - this.state.evalStartTime) / 60000);
    this.state.rawData.duration_min = duration;
    this.state.rawData.timestamp = new Date().toISOString();

    this.goTo('page-report');
  },

  // ===== Toast =====
  showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  },

  // ===== 返回上一页（用于二维码页返回报告页）=====
  goBack() {
    this.goTo(this.state.currentPage === 'page-qrcode' ? 'page-report' : 'page-home');
  },

  // ===== 保存报告（生成长图）=====
  saveReport() {
    const reportPage = document.getElementById('page-report');
    if (!reportPage) return;

    this.showToast('正在生成报告图片...');

    // 隐藏按钮区域，不截入图片
    const actionsEl = reportPage.querySelector('.report-actions');
    const headerEl = reportPage.querySelector('.page-header');
    if (actionsEl) actionsEl.style.display = 'none';
    if (headerEl) headerEl.style.visibility = 'hidden';

    html2canvas(reportPage, {
      backgroundColor: '#0a0a12',
      scale: 2,
      useCORS: true,
      logging: false,
      width: reportPage.scrollWidth,
      height: reportPage.scrollHeight,
      windowWidth: reportPage.scrollWidth,
      windowHeight: reportPage.scrollHeight
    }).then(canvas => {
      // 恢复隐藏的元素
      if (actionsEl) actionsEl.style.display = '';
      if (headerEl) headerEl.style.visibility = '';

      // 创建全屏预览层
      const overlay = document.createElement('div');
      overlay.id = 'report-image-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;overflow:auto;padding:20px;box-sizing:border-box;';

      const title = document.createElement('p');
      title.textContent = '长按下方图片保存到相册';
      title.style.cssText = 'color:#00D4FF;font-size:14px;margin-bottom:12px;text-align:center;';
      overlay.appendChild(title);

      const img = document.createElement('img');
      img.src = canvas.toDataURL('image/png', 1.0);
      img.style.cssText = 'max-width:100%;border-radius:12px;box-shadow:0 4px 30px rgba(0,212,255,0.2);';
      overlay.appendChild(img);

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '关闭预览';
      closeBtn.style.cssText = 'margin-top:16px;padding:10px 32px;border:none;border-radius:50px;background:rgba(123,47,255,0.6);color:#fff;font-size:14px;cursor:pointer;';
      closeBtn.onclick = () => document.body.removeChild(overlay);
      overlay.appendChild(closeBtn);

      document.body.appendChild(overlay);

      this.showToast('✅ 报告图片已生成，长按保存到相册！');
    }).catch(err => {
      if (actionsEl) actionsEl.style.display = '';
      if (headerEl) headerEl.style.visibility = '';
      console.error('截图失败:', err);
      this.showToast('❌ 图片生成失败，请重试');
    });
  },

  // ===== 首页粒子效果 =====
  initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (8 + Math.random() * 12) + 's';
      p.style.animationDelay = Math.random() * 10 + 's';
      p.style.width = p.style.height = (1 + Math.random() * 2) + 'px';
      if (Math.random() > 0.5) p.style.background = '#7B2FFF';
      container.appendChild(p);
    }
  }
};

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  App.initParticles();

  // 品牌按钮绑定
  document.querySelectorAll('.brand-btn').forEach(btn => {
    btn.addEventListener('click', () => App.selectBrand(btn));
  });

  // 城市按钮绑定
  document.querySelectorAll('.city-btn').forEach(btn => {
    btn.addEventListener('click', () => App.selectCity(btn));
  });

  // 唤醒词输入回车确认
  document.getElementById('wake-word-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') App.setWakeWord();
  });

  // 其他品牌输入实时检测
  document.getElementById('brand-custom').addEventListener('input', () => App.checkReady());
  document.getElementById('city-custom').addEventListener('input', () => App.checkReady());
});