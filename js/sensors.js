/* ===== 传感器采集模块 ===== */
const Sensors = {
  running: false,
  events: [],
  startTime: null,
  lastAccelTime: 0,
  lastAccelData: null,
  gpsPositions: [],
  watchId: null,
  totalMileage: 0,
  lastGpsPoint: null,
  comfortScore: 100,

  // 校准数据：静止状态下采集基准G值
  calibrationSamples: [],
  calibrationDone: false,
  baseGravity: 9.81, // 默认基准，校准后更新
  calibrationCount: 0,
  calibrationMax: 10, // 采集10个样本后完成校准
  calibrationTimer: null, // 校准超时定时器
  calibrationTimeout: 5000, // 5秒超时，强制完成校准

  // 速度阈值：只有GPS检测到移动时才记录事件（排除静止误报）
  isMoving: false,
  lastSpeed: 0,

  // G值阈值（前端采集用，具体扣分规则在权重文件中，后端计算）
  // 注意：这些是去除重力后的净加速度阈值
  // 灵敏度：中等（排除手持噪声，只在明显晃动时触发）
  thresholds: {
    brake: [0.15, 0.25, 0.40],   // 纵向减速度（去除重力）
    accel: [0.12, 0.20, 0.35],   // 纵向加速度（去除重力）
    turn: [0.15, 0.25, 0.40],    // 横向加速度（去除重力）
    jerk: 1.5                      // 加速度变化率
  },

  // 冷却时间（ms）——同类型事件间隔最小值，避免重复计数
  cooldown: 2000,

  start() {
    if (this.running) return;
    this.running = true;
    this.events = [];
    this.startTime = Date.now();
    this.totalMileage = 0;
    this.comfortScore = 100;
    this.lastGpsPoint = null;
    this.calibrationDone = false;
    this.calibrationSamples = [];
    this.calibrationCount = 0;
    this.isMoving = false;
    this.lastSpeed = 0;
    this.lastAccelData = null;

    // 传感器权限已在按钮点击时由 App.requestMotionPermission() 处理
    this._startAccelerometer();
    this._startGPS();

    // 校准超时保护：如果3秒内没采够样本，强制完成校准
    this.calibrationTimer = setTimeout(() => {
      if (!this.calibrationDone) {
        console.warn('校准超时，使用默认基准。已采集样本:', this.calibrationCount);
        // 用已采集的样本（可能为0个）或默认值
        if (this.calibrationCount > 0) {
          const avgX = this.calibrationSamples.reduce((s, v) => s + v.x, 0) / this.calibrationCount;
          const avgY = this.calibrationSamples.reduce((s, v) => s + v.y, 0) / this.calibrationCount;
          const avgZ = this.calibrationSamples.reduce((s, v) => s + v.z, 0) / this.calibrationCount;
          this.baseGravity = { x: avgX, y: avgY, z: avgZ };
        } else {
          // 默认假设手机竖直握持：x≈0, y≈0, z≈9.81
          this.baseGravity = { x: 0, y: 0, z: 9.81 };
        }
        this.calibrationDone = true;
        console.log('校准强制完成，基准:', this.baseGravity);
      }
    }, this.calibrationTimeout);
  },

  stop() {
    this.running = false;
    if (this.calibrationTimer) {
      clearTimeout(this.calibrationTimer);
      this.calibrationTimer = null;
    }
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    window.removeEventListener('devicemotion', this._onMotion);
  },

  getMileage() {
    return this.totalMileage;
  },

  getEvents() {
    return this.events;
  },

  getComfortScore() {
    return Math.max(0, this.comfortScore);
  },

  // ===== 加速度计 =====
  _startAccelerometer() {
    this._onMotion = (e) => {
      if (!this.running) return;

      // 优先使用不含重力的加速度数据（更准确）
      const a = e.acceleration || e.accelerationIncludingGravity;
      if (!a) return;

      // 如果只有含重力的数据，需要减去重力
      const useGravity = !e.acceleration;
      const raw = useGravity ? e.accelerationIncludingGravity : null;
      if (!a && !raw) return;

      const now = Date.now();

      // ---- 校准阶段：采集静止基准 ----
      // 如果 e.acceleration 可用（不含重力的净加速度），则无需校准，直接跳过
      if (!this.calibrationDone && e.acceleration) {
        this.calibrationDone = true;
        console.log('e.acceleration 可用，跳过校准');
      }
      if (!this.calibrationDone && this.calibrationCount < this.calibrationMax) {
        if (raw) {
          const totalG = Math.sqrt((raw.x || 0) ** 2 + (raw.y || 0) ** 2 + (raw.z || 0) ** 2);
          this.calibrationSamples.push({ x: raw.x || 0, y: raw.y || 0, z: raw.z || 0, totalG: totalG });
          this.calibrationCount++;

          if (this.calibrationCount >= this.calibrationMax) {
            // 计算平均值作为基准
            const avgX = this.calibrationSamples.reduce((s, v) => s + v.x, 0) / this.calibrationMax;
            const avgY = this.calibrationSamples.reduce((s, v) => s + v.y, 0) / this.calibrationMax;
            const avgZ = this.calibrationSamples.reduce((s, v) => s + v.z, 0) / this.calibrationMax;
            this.baseGravity = { x: avgX, y: avgY, z: avgZ };
            this.calibrationDone = true;
            console.log('传感器校准完成，基准:', this.baseGravity);
          }
        }
        return; // 校准阶段不检测事件
      }

      // ---- 获取净加速度（去除重力分量）----
      let ax, ay, az;
      if (e.acceleration) {
        // 有直接的用户加速度（已去除重力），直接使用
        ax = a.x || 0;
        ay = a.y || 0;
        az = a.z || 0;
      } else if (raw && this.calibrationDone) {
        // 手动减去基准重力
        ax = (raw.x || 0) - this.baseGravity.x;
        ay = (raw.y || 0) - this.baseGravity.y;
        az = (raw.z || 0) - this.baseGravity.z;
      } else {
        return;
      }

      // 噪音过滤：极小值直接忽略
      const noiseFloor = 0.05; // 0.05G以下的噪声忽略（排除手持抖动和传感器噪声）
      ax = Math.abs(ax) < noiseFloor ? 0 : ax;
      ay = Math.abs(ay) < noiseFloor ? 0 : ay;
      az = Math.abs(az) < noiseFloor ? 0 : az;

      // 保存上一次数据用于Jerk计算
      const prevAccel = this.lastAccelData;
      this.lastAccelData = { x: ax, y: ay, z: az, t: now };

      // ---- 移动检测（GPS辅助，非强制）----
      // GPS确认移动时可信度更高，但无GPS时仍可通过传感器检测（方便室内测试）
      // 通过校准基线 + 噪声门限 + 冷却期三重保护过滤误报

      // 纵向加速度（前后方向）
      // 手机平放在车上：X轴=左右，Y轴=前后（近似），Z轴=上下
      // 不同手机放置方式不同，取XY平面最大分量作为横向，Z作为纵向/上下
      const lateralForce = Math.abs(ax); // 左右
      const longitudinalForce = Math.abs(ay); // 前后

      // 综合力（XY平面）
      const xyForce = Math.sqrt(ax ** 2 + ay ** 2);

      // 检测急减速（纵向减速度 > 阈值）
      // 手机朝前放置时，刹车 = Y轴正方向加速度增大
      if (longitudinalForce > this.thresholds.brake[0]) {
        this._detectEvent('brake', longitudinalForce, now);
      }

      // 检测急加速
      if (longitudinalForce > this.thresholds.accel[0] && ay < -0.1) {
        this._detectEvent('accel', longitudinalForce, now);
      }

      // 检测急转向（横向加速度）
      if (lateralForce > this.thresholds.turn[0]) {
        this._detectEvent('turn', lateralForce, now);
      }

      // Jerk计算（加速度变化率）
      if (prevAccel && (now - prevAccel.t) > 80) {
        const dt = (now - prevAccel.t) / 1000;
        const combinedAccel = Math.sqrt(ax ** 2 + ay ** 2);
        const prevCombined = Math.sqrt(prevAccel.x ** 2 + prevAccel.y ** 2);
        const jerk = Math.abs((combinedAccel - prevCombined) / dt);
        if (jerk > this.thresholds.jerk) {
          this._detectEvent('jerk', jerk, now);
        }
      }

      // 可视化已移除（惯性球+加速度条），事件检测正常工作
    };

    window.addEventListener('devicemotion', this._onMotion);
  },

  _detectEvent(type, value, now) {
    // 冷却检查
    const lastSame = this.events.filter(e => e.type === type).pop();
    if (lastSame && (now - lastSame.timestamp) < this.cooldown) return;

    // 确认阈值：必须超过第一级阈值才记录
    const thresholds = this.thresholds[type] || [];
    if (!thresholds || value < thresholds[0]) return;

    let level = 1;
    if (value >= thresholds[2]) level = 3;
    else if (value >= thresholds[1]) level = 2;

    const event = {
      type: type,
      level: level,
      value: Math.round(value * 1000) / 1000,
      timestamp: now,
      mileage_km: this.totalMileage,
      lat: this.lastGpsPoint ? this.lastGpsPoint.lat : 0,
      lng: this.lastGpsPoint ? this.lastGpsPoint.lng : 0
    };

    this.events.push(event);

    // 前端只显示舒适度分数（实际扣分规则在后端权重文件中）
    this._updateComfortDisplay(type, level);
    this._updateEventUI(event);
  },

  _updateComfortDisplay(type, level) {
    const deductions = { brake: level * 1.5, accel: level * 1, turn: level * 0.8, jerk: level * 0.5 };
    const deduct = deductions[type] || 0;
    this.comfortScore = Math.max(0, this.comfortScore - deduct);
    document.getElementById('ap-comfort-score').textContent = Math.round(this.comfortScore);
  },

  _updateEventUI(event) {
    const typeNames = { brake: '急减速', accel: '急加速', turn: '急转向', jerk: '顿挫' };
    const levelNames = { 1: '轻微', 2: '中等', 3: '严重' };
    App.showToast((typeNames[event.type] || '事件') + ' · ' + (levelNames[event.level] || ''));

    const bar = document.querySelector('.ap-score-value');
    if (bar) {
      bar.style.color = event.level >= 2 ? 'var(--warning)' : 'var(--success)';
      setTimeout(() => bar.style.color = 'var(--success)', 1500);
    }
  },

  // ===== GPS =====
  _startGPS() {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000
    };

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!this.running) return;
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: Date.now() };
        this.gpsPositions.push(point);

        // 计算里程和速度
        if (this.lastGpsPoint) {
          const dist = this._haversine(
            this.lastGpsPoint.lat, this.lastGpsPoint.lng,
            point.lat, point.lng
          );
          const dt = (point.t - this.lastGpsPoint.t) / 1000; // 秒
          const speed = dt > 0 ? (dist / dt) : 0; // km/s
          const speedKmh = speed * 3600; // km/h

          this.lastSpeed = speedKmh;
          // 只要速度超过5km/h就算在移动
          this.isMoving = speedKmh > 5;

          // 只在有合理位移时累计里程（过滤GPS漂移）
          if (dist < 0.5 && speedKmh < 200) { // 单次位移<500m且速度<200km/h
            this.totalMileage += dist;
            document.getElementById('ap-mileage').textContent = this.totalMileage.toFixed(1) + 'km';
          }
        }
        this.lastGpsPoint = point;
      },
      (err) => {
        console.warn('GPS error:', err.message);
      },
      options
    );
  },

  // Haversine公式计算两点间距离（km）
  _haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
};