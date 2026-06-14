/* ===== 报告生成模块 ===== */
const Report = {
  generate() {
    this._renderMeta();
    this._renderDimensions();
    this._renderSummary();
    this._drawRadarChart();
  },

  _renderMeta() {
    const data = App.state.rawData;
    const now = new Date(data.timestamp || Date.now());
    const dateStr = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0');

    document.getElementById('report-meta').innerHTML =
      `${data.brand || '未知品牌'} · ${data.city || '未知城市'} · ${dateStr}`;
  },

  _renderDimensions() {
    // 维度得分（简化版展示，实际计算在后端，这里用原始数据做前端展示估算）
    const data = App.state.rawData;
    const dims = [
      { name: '语音操作效率', score: this._calcVoiceEfficiency(), max: 30, color: '#00D4FF' },
      { name: '语音智能', score: this._calcVoiceSmart(), max: 28, color: '#7B2FFF' },
      { name: '界面设计', score: this._calcSubjective('D'), max: 14, color: '#FFD740' },
      { name: '生态丰富度', score: this._calcSubjective('E'), max: 18, color: '#FF9100' },
      { name: '主观体验', score: this._calcSubjective('F'), max: 10, color: '#E040FB' }
    ];

    const total = dims.reduce((sum, d) => sum + d.score, 0);
    const totalMax = dims.reduce((sum, d) => sum + d.max, 0);
    document.getElementById('total-score-number').textContent = Math.round(total);

    const container = document.getElementById('dimension-scores');
    container.innerHTML = '';
    dims.forEach(d => {
      const pct = Math.min(100, (d.score / d.max) * 100);
      container.innerHTML += `
        <div class="dim-score-item">
          <span class="dim-score-name">${d.name}</span>
          <div class="dim-score-bar-wrap">
            <div class="dim-score-bar" style="width:${pct}%;background:${d.color}"></div>
          </div>
          <span class="dim-score-value" style="color:${d.color}">${Math.round(d.score)}<span style="font-size:11px;font-weight:400;opacity:0.4">/${d.max}</span></span>
        </div>`;
    });

    // 存储供雷达图使用
    this._dims = dims;
  },

  _calcVoiceEfficiency() {
    const tasks = App.state.rawData.voiceTasks;
    if (tasks.length === 0) return 0;

    const successCount = tasks.filter(t => t.success).length;
    const avgTime = tasks.reduce((s, t) => s + (t.completionTime_ms || 0), 0) / tasks.length / 1000;
    const avgResp = tasks.reduce((s, t) => s + (t.responseTime_ms || 0), 0) / tasks.length / 1000;
    const avgSentences = tasks.reduce((s, t) => s + (t.sentenceCount || 1), 0) / tasks.length;

    // B1完成效率（9分）
    let b1 = 0;
    if (avgTime < 3) b1 = 9; else if (avgTime <= 5) b1 = 5;

    // B2精简度（8分）
    let b2 = 0;
    if (avgSentences <= 1) b2 = 8; else if (avgSentences <= 2) b2 = 4;

    // B3响应速度（8分）
    let b3 = 0;
    if (avgResp < 1) b3 = 8; else if (avgResp <= 2) b3 = 4;

    return b1 + b2 + b3;
  },

  _calcVoiceSmart() {
    const data = App.state.rawData;

    // C1识别率（6分）
    const tasks = data.voiceTasks;
    const successRate = tasks.length > 0 ? tasks.filter(t => t.success).length / tasks.length : 0;
    let c1 = 0;
    if (successRate >= 1) c1 = 6;
    else if (successRate >= 0.8) c1 = 5;
    else if (successRate >= 0.6) c1 = 3;
    else if (successRate >= 0.4) c1 = 1;

    // C3口语理解（7题）
    let c3 = 0;
    const oral = data.oralUnderstanding;

    // 前4题（qIndex 0-3），每题1分
    for (let i = 0; i < 4; i++) {
      const q = oral.filter(o => o.qIndex === i)[0];
      if (!q) continue;
      if (q.answer === 'none') { /* 0分 */ }
      else if (q.answer === 'oral_only') c3 += 0.5;
      else c3 += 1;
    }

    // 第5题（qIndex=4）购票指令
    const q5 = oral.filter(o => o.qIndex === 4)[0];
    if (q5) {
      if (q5.answer === 'ticket_full_pay') c3 += 1;
      else if (q5.answer === 'ticket_select_pay') c3 += 0.8;
      else if (q5.answer === 'ticket_no_pay') c3 += 0.5;
      else if (q5.answer === 'ticket_vague') c3 += 0.2;
    }

    // 第6题（qIndex=5）双阶段：谜面导航 + 中途追加
    const q6p1 = oral.filter(o => o.qIndex === 5 && o.phase === 1)[0];
    const q6p2 = oral.filter(o => o.qIndex === 5 && o.phase === 2)[0];
    if (q6p1 && q6p1.correct) {
      c3 += 1;
      if (q6p2 && q6p2.result === 'waypoint') c3 += 0.6;
      else if (q6p2 && q6p2.result === 'keep') c3 += 0.4;
      else if (q6p2 && q6p2.result === 'oral') c3 += 0.2;
    }

    // 第7题（qIndex=6）歌词猜歌
    const q7 = oral.filter(o => o.qIndex === 6)[0];
    if (q7) {
      if (q7.answer === 'correct_play') c3 += 1;
      else if (q7.answer === 'correct_no_play') c3 += 0.5;
    }

    // 第8题（qIndex=7）记忆回访
    const q8 = oral.filter(o => o.qIndex === 7)[0];
    if (q8) {
      if (q8.answer === 'remember_correct') c3 += 1;
      else if (q8.answer === 'remember_wrong') c3 += 0.5;
    }

    // C4多指令（8分）
    let c4 = 0;
    const multi = data.multiCmdRounds;
    const maxRound = multi.length > 0 ? Math.max(...multi.map(r => r.round)) : 0;
    if (maxRound >= 7) c4 = 8;
    else if (maxRound >= 5) c4 = 6;
    else if (maxRound >= 3) c4 = 3;

    return Math.min(28, c1 + c3 + c4);
  },

  _calcSubjective(dim) {
    const s = App.state.rawData.subjective;
    const scores = {
      D: [5, 5, 5],
      E: [3, 3, 2],
      F: [4, 3, 3]
    };
    const opts = scores[dim] || [0, 0, 0];
    let total = 0;
    for (let i = 0; i < opts.length; i++) {
      const key = dim + (i + 1);
      const val = s[key];
      if (val === 0) total += opts[i];
      else if (val === 1) total += opts[i] * 0.6;
      // val === 2 => 0分
    }
    return total;
  },

  // ===== 智舱能力总结 =====
  _renderSummary() {
    const dims = this._dims || [];
    const total = dims.reduce((s, d) => s + d.score, 0);
    const totalMax = dims.reduce((s, d) => s + d.max, 0);
    const pct = total / totalMax;

    // 各维度评级
    const voiceEff = dims.find(d => d.name === '语音操作效率')?.score || 0;
    const voiceSmart = dims.find(d => d.name === '语音智能')?.score || 0;
    const uiDesign = dims.find(d => d.name === '界面设计')?.score || 0;
    const ecosystem = dims.find(d => d.name === '生态丰富度')?.score || 0;
    const experience = dims.find(d => d.name === '主观体验')?.score || 0;

    // 总体等级
    let level, levelColor;
    if (pct >= 0.85) { level = '非常优秀'; levelColor = '#00E676'; }
    else if (pct >= 0.7) { level = '表现良好'; levelColor = '#00D4FF'; }
    else if (pct >= 0.55) { level = '中规中矩'; levelColor = '#FFD740'; }
    else if (pct >= 0.4) { level = '有待提升'; levelColor = '#FF9100'; }
    else { level = '体验较差'; levelColor = '#FF5252'; }

    // 亮点和短板
    const strengths = [];
    const weaknesses = [];
    if (voiceEff >= 20) strengths.push('语音操作效率极高，响应迅速');
    else if (voiceEff < 12) weaknesses.push('语音操作响应偏慢，任务完成效率不高');
    if (voiceSmart >= 18) strengths.push('语音理解能力强，口语和多指令处理优秀');
    else if (voiceSmart < 10) weaknesses.push('语音理解能力有限，复杂指令和口语支持不足');
    if (uiDesign >= 12) strengths.push('界面设计清晰，信息布局合理');
    else if (uiDesign < 7) weaknesses.push('界面设计有待优化，操作反馈不够明确');
    if (ecosystem >= 6) strengths.push('生态应用丰富，手机互联支持好');
    else if (ecosystem < 4) weaknesses.push('生态应用较少，手机互联支持有限');
    if (experience >= 8) strengths.push('系统流畅度好，安全感设计到位');
    else if (experience < 5) weaknesses.push('系统偶有卡顿，安全感提示不足');

    // 一句话评价
    let oneLiner;
    if (pct >= 0.85) oneLiner = `这款车的智舱综合实力强劲，语音交互灵敏精准，是一台真正聪明的智能汽车。`;
    else if (pct >= 0.7) oneLiner = `这款车的智舱整体表现良好，${strengths.length > 0 ? strengths[0] : '各项指标均衡'}，日常使用体验令人满意。`;
    else if (pct >= 0.55) oneLiner = `这款车的智舱中规中矩，${strengths.length > 0 ? strengths[0] : '基础功能可用'}${weaknesses.length > 0 ? '，但' + weaknesses[0] : ''}。`;
    else if (pct >= 0.4) oneLiner = `这款车的智舱有明显的提升空间，${weaknesses.length > 0 ? weaknesses[0] : '多项指标低于预期'}，建议关注后续OTA升级。`;
    else oneLiner = `这款车的智舱体验较差，${weaknesses.length > 1 ? weaknesses.slice(0,2).join('，') : weaknesses[0] || '多项核心能力不足'}，与同级别竞品差距明显。`;

    let html = `
      <div class="section-card" id="section-summary">
        <h3 class="section-title">智舱能力总结</h3>
        <div class="summary-level" style="text-align:center;margin-bottom:16px">
          <span style="font-size:24px;font-weight:800;color:${levelColor}">${Math.round(total)}分</span>
          <span style="font-size:16px;font-weight:600;color:${levelColor};margin-left:8px">${level}</span>
        </div>
        <div class="summary-text" style="font-size:14px;line-height:1.8;color:var(--text-mid);margin-bottom:16px">
          ${oneLiner}
        </div>`;

    if (strengths.length > 0) {
      html += `<div style="margin-bottom:12px"><div style="font-size:13px;font-weight:600;color:var(--success);margin-bottom:6px">亮点</div>`;
      strengths.forEach(s => {
        html += `<div style="font-size:13px;color:var(--text-mid);padding-left:12px;border-left:2px solid var(--success);margin-bottom:4px">${s}</div>`;
      });
      html += `</div>`;
    }
    if (weaknesses.length > 0) {
      html += `<div><div style="font-size:13px;font-weight:600;color:var(--warning);margin-bottom:6px">待提升</div>`;
      weaknesses.forEach(w => {
        html += `<div style="font-size:13px;color:var(--text-mid);padding-left:12px;border-left:2px solid var(--warning);margin-bottom:4px">${w}</div>`;
      });
      html += `</div>`;
    }
    html += `</div>`;

    const section = document.getElementById('section-summary');
    if (section) {
      section.outerHTML = html;
    } else {
      // Insert before report-actions
      const actions = document.querySelector('.report-actions');
      if (actions) {
        const div = document.createElement('div');
        div.innerHTML = html;
        actions.parentNode.insertBefore(div.firstElementChild, actions);
      }
    }
  },

  // ===== 雷达图（Canvas手绘）=====
  _drawRadarChart() {
    const canvas = document.getElementById('radar-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 300;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const cx = size / 2, cy = size / 2, r = 110;
    const dims = this._dims || [];
    const n = dims.length;
    const angleStep = (Math.PI * 2) / n;
    const startAngle = -Math.PI / 2;

    // 网格
    for (let ring = 1; ring <= 4; ring++) {
      ctx.beginPath();
      const rr = r * ring / 4;
      for (let i = 0; i <= n; i++) {
        const angle = startAngle + i * angleStep;
        const x = cx + rr * Math.cos(angle);
        const y = cy + rr * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 轴线
    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.stroke();
    }

    // 数据区域
    ctx.beginPath();
    dims.forEach((d, i) => {
      const angle = startAngle + i * angleStep;
      const val = Math.min(1, d.score / d.max);
      const x = cx + r * val * Math.cos(angle);
      const y = cy + r * val * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 212, 255, 0.15)';
    ctx.fill();
    ctx.strokeStyle = '#00D4FF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 数据点
    dims.forEach((d, i) => {
      const angle = startAngle + i * angleStep;
      const val = Math.min(1, d.score / d.max);
      const x = cx + r * val * Math.cos(angle);
      const y = cy + r * val * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = d.color;
      ctx.fill();
    });

    // 标签
    dims.forEach((d, i) => {
      const angle = startAngle + i * angleStep;
      const lx = cx + (r + 20) * Math.cos(angle);
      const ly = cy + (r + 20) * Math.sin(angle);
      ctx.font = '11px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.name, lx, ly);
    });
  },

  // ===== 分享 =====
  shareReport() {
    const text = `我用「智舱测」评测了${App.state.rawData.brand}的智舱，综合评分${document.getElementById('total-score-number').textContent}分！来测测你的爱车有多聪明？`;
    if (navigator.share) {
      navigator.share({ title: '智舱测 · 智舱评测报告', text: text }).catch(() => {});
    } else {
      // 降级：复制到剪贴板
      navigator.clipboard.writeText(text).then(() => {
        App.showToast('分享文案已复制到剪贴板');
      }).catch(() => {
        App.showToast('请手动分享');
      });
    }
  }
};