<template>
  <!-- importance-content 섹션 -->
  <section class="importance-content">
    <div class="text-content">
      <div class="text-group">
        <span class="sk sk--text-sm"></span>
        <span class="sk sk--text-md"></span>
      </div>
    </div>
    <div class="grap-content">
      <!-- 게이지 원형 -->
      <div class="sk-gauge-wrap">
        <div class="sk sk--gauge-ring"></div>
        <div class="sk-gauge-center">
          <span class="sk sk--gauge-label"></span>
          <span class="sk sk--gauge-score"></span>
          <span class="sk sk--gauge-unit"></span>
        </div>
      </div>
      <!-- 메트릭 바 4개 -->
      <div class="sk-score-list">
        <div v-for="n in 4" :key="n" class="sk-score-item">
          <span class="sk sk--score-val"></span>
          <span class="sk sk--score-bar"></span>
          <span class="sk sk--score-label"></span>
        </div>
      </div>
    </div>
  </section>

  <!-- card-content 섹션 -->
  <section class="card-content">
    <!-- 카드 1: 인사이트 + 요약 -->
    <div class="card-item">
      <div class="sk-card-header">
        <span class="sk sk--icon"></span>
        <span class="sk sk--card-title"></span>
      </div>
      <span class="sk sk--line-full"></span>
      <span class="sk sk--line-full"></span>
      <span class="sk sk--line-three-quarter"></span>
      <div class="sk-card-tips">
        <span class="sk sk--badge"></span>
        <span class="sk sk--line-full"></span>
        <span class="sk sk--line-half"></span>
      </div>
    </div>

    <!-- 카드 2: 추천 -->
    <div class="card-item">
      <div class="sk-card-header">
        <span class="sk sk--icon"></span>
        <span class="sk sk--card-title"></span>
      </div>
      <div v-for="n in 2" :key="n" class="sk-reco-item">
        <span class="sk sk--reco-num"></span>
        <div class="sk-reco-lines">
          <span class="sk sk--reco-title"></span>
          <span class="sk sk--line-full"></span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

.sk {
  display: block;
  border-radius: 4px;
  background: linear-gradient(90deg, #e9ecef 25%, #f3f4f6 50%, #e9ecef 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

// ── 점수 섹션 ──
.grap-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.text-content { margin-bottom: 8px; }
.text-group { display: flex; flex-direction: column; gap: 6px; }

.sk--text-sm  { width: 80px;  height: 13px; }
.sk--text-md  { width: 120px; height: 16px; }

.sk-gauge-wrap {
  position: relative;
  width: 240px;
  height: 168px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sk--gauge-ring {
  width: 168px;
  height: 168px;
  border-radius: 50%;
}

.sk-gauge-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -38%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  pointer-events: none;
}

.sk--gauge-label { width: 52px; height: 13px; }
.sk--gauge-score { width: 64px; height: 40px; border-radius: 6px; }
.sk--gauge-unit  { width: 36px; height: 11px; }

.sk-score-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  width: 100%;
}

.sk-score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.sk--score-val   { width: 28px; height: 18px; }
.sk--score-bar   { width: 100%; height: 14px; border-radius: 4px; }
.sk--score-label { width: 28px; height: 12px; }

// ── 카드 섹션 ──
.sk-card-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.sk--icon       { width: 50px; height: 50px; border-radius: 20px; }
.sk--card-title { width: 160px; height: 16px; }

.sk--line-full          { width: 100%; height: 13px; margin-bottom: 6px; }
.sk--line-three-quarter { width: 75%;  height: 13px; margin-bottom: 6px; }
.sk--line-half          { width: 55%;  height: 13px; }

.sk-card-tips {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
  padding: 16px;
  border-radius: 16px;
  background: $bg-color;
}

.sk--badge { width: 56px; height: 22px; border-radius: 6px; }

.sk-reco-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  min-height: 56px;
  margin-bottom: 4px;
}

.sk--reco-num { flex-shrink: 0; width: 28px; height: 28px; border-radius: 10px; }

.sk-reco-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
}

.sk--reco-title { width: 80px; height: 14px; }
</style>
