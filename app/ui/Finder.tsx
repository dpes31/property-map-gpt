'use client';

import { useMemo, useState } from 'react';

type Candidate = {
  name: string;
  region: string;
  score: number;
  grade: string;
  commute: number;
  shuttle: number;
  price: number;
  growth: number;
  liquidity: number;
  type: string;
  reason: string;
  risk: string;
};

const baseCandidates: Candidate[] = [
  { name: '잠실 엘스', region: '서울 송파구 잠실동', score: 87, grade: 'A', commute: 48, shuttle: 6, price: 23.5, growth: 12.4, liquidity: 18, type: '실거주+투자 균형형', reason: '논현 출근성과 셔틀 접근성이 모두 우수한 균형형 후보', risk: '가격 상단부 진입' },
  { name: '트리지움', region: '서울 송파구 잠실동', score: 84, grade: 'B', commute: 50, shuttle: 8, price: 21.8, growth: 10.2, liquidity: 15, type: '대단지 유동성형', reason: '잠실 생활권과 대단지 유동성을 함께 확보', risk: '평형별 가격 편차 확인 필요' },
  { name: '과천자이', region: '경기 과천시 별양동', score: 81, grade: 'B', commute: 59, shuttle: 5, price: 22.5, growth: 15.1, liquidity: 9, type: '셔틀+신축 희소형', reason: '셔틀 접근성과 과천 신축 희소성이 강점', risk: '논현 출근시간은 조건부 확인 필요' },
  { name: '프레스티어자이', region: '경기 과천시 별양동', score: 79, grade: 'B', commute: 60, shuttle: 7, price: 24.8, growth: 13.7, liquidity: 4, type: '장기보유 후보형', reason: '과천 원도심 신축 대단지 후보', risk: '입주 전 데이터와 분양가 선반영 주의' },
  { name: '분당 파크뷰', region: '경기 성남시 분당구 정자동', score: 76, grade: 'B', commute: 67, shuttle: 6, price: 21.0, growth: 8.8, liquidity: 11, type: '학군·정주성형', reason: '분당 학군·정주성·셔틀 접근성 양호', risk: '논현 출근 60분 조건은 초과 가능' },
  { name: '디에이치퍼스티어아이파크', region: '서울 강남구 개포동', score: 82, grade: 'B', commute: 42, shuttle: 9, price: 25.5, growth: 9.5, liquidity: 12, type: '강남 신축 상품형', reason: '강남 접근성과 신축 상품성이 강함', risk: '기본 예산 상단 초과 가능' },
];

function recalc(c: Candidate, maxPrice: number, maxCommute: number) {
  let score = c.score;
  if (c.price > maxPrice) score -= 12;
  if (c.commute > maxCommute) score -= 10;
  if (c.shuttle <= 7) score += 3;
  const final = Math.max(0, Math.min(100, score));
  return { ...c, score: final, grade: final >= 85 ? 'A' : final >= 75 ? 'B' : final >= 65 ? 'C' : 'D' };
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="bar-row">
      <span>{label}</span>
      <div className="bar"><i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
    </div>
  );
}

export default function Finder() {
  const [company, setCompany] = useState('서울 강남구 논현동 105-7');
  const [maxCommute, setMaxCommute] = useState(60);
  const [minPrice, setMinPrice] = useState(15);
  const [maxPrice, setMaxPrice] = useState(25);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const candidates = useMemo(() => {
    return baseCandidates
      .map((c) => recalc(c, maxPrice, maxCommute))
      .filter((c) => c.price >= minPrice - 1 && c.price <= maxPrice + 3)
      .filter((c) => !query || c.name.includes(query) || c.region.includes(query))
      .sort((a, b) => b.score - a.score);
  }, [maxPrice, maxCommute, minPrice, query]);

  const activeCandidates = submitted ? candidates : baseCandidates;
  const top = activeCandidates[0];

  return (
    <main className="shell">
      <section className="hero-v2">
        <div className="hero-copy">
          <span className="eyebrow">Property Map GPT · Decision Dashboard</span>
          <h1 className="title">우리 가족 조건에 맞는<br />이사 후보지를 먼저 좁힙니다</h1>
          <p className="desc">회사 주소, 셔틀 탑승지, 매매가 범위, 출근시간을 동시에 반영해 후보 단지를 점수화합니다. 현재는 API 연결 전 MVP이며, 화면 구조와 판단 흐름을 먼저 검증하는 단계입니다.</p>
          <div className="row compact">
            <span className="pill dark">논현 {maxCommute}분</span>
            <span className="pill">셔틀 도보권</span>
            <span className="pill">{minPrice}~{maxPrice}억</span>
          </div>
        </div>
        <aside className="hero-panel">
          <div className="panel-label">현재 최상위 후보</div>
          <strong>{top?.name ?? '후보 없음'}</strong>
          <div className="hero-score">{top?.grade ?? '-'} {top?.score ?? 0}</div>
          <p>{top?.type ?? '조건을 입력하면 후보를 재정렬합니다.'}</p>
        </aside>
      </section>

      <section className="workspace">
        <div className="control-card">
          <div className="section-head">
            <span>01</span>
            <h2>조건 입력</h2>
          </div>
          <label>회사 주소<input className="input" value={company} onChange={(e) => setCompany(e.target.value)} /></label>
          <label>단지명/지역 검색<input className="input" placeholder="예: 프레스티어자이, 잠실" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
          <div className="two-col">
            <label>출근 허용시간<input className="input" type="number" value={maxCommute} onChange={(e) => setMaxCommute(Number(e.target.value))} /></label>
            <label>최대 매매가, 억<input className="input" type="number" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} /></label>
          </div>
          <label>최소 매매가, 억<input className="input" type="number" value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))} /></label>
          <button className="button" onClick={() => setSubmitted(true)}>후보 추천 실행</button>
        </div>

        <div className="map-card">
          <div className="section-head">
            <span>02</span>
            <h2>입지 시뮬레이션</h2>
          </div>
          <div className="map-visual" aria-label="지도 시각화 placeholder">
            <div className="ring r1" />
            <div className="ring r2" />
            <div className="ring r3" />
            <div className="pin company">논현</div>
            <div className="pin p1">잠실</div>
            <div className="pin p2">과천</div>
            <div className="pin p3">분당</div>
            <div className="route-line" />
          </div>
          <div className="map-note">지도 SDK 연결 전 임시 시각화입니다. 다음 단계에서 Kakao Map 마커와 셔틀 반경 레이어를 붙입니다.</div>
        </div>
      </section>

      <section className="result-v2">
        <div className="section-head wide">
          <span>03</span>
          <div>
            <h2>추천 후보 {activeCandidates.length}개</h2>
            <p>점수는 출근성, 셔틀 접근성, 가격 적합성, 상승률, 거래량, 리스크를 종합한 임시 모델입니다.</p>
          </div>
        </div>
        <div className="candidate-grid">
          {activeCandidates.map((c) => (
            <article className="candidate-card" key={c.name}>
              <div className="candidate-top">
                <span className={`badge grade-${c.grade}`}>{c.grade} {c.score}점</span>
                <span className="type">{c.type}</span>
              </div>
              <h3>{c.name}</h3>
              <p className="meta">{c.region}</p>
              <div className="metric-row">
                <b>{c.commute}분</b><span>논현 출근</span>
                <b>{c.shuttle}분</b><span>셔틀 도보</span>
                <b>{c.price}억</b><span>최근가</span>
              </div>
              <Bar label="출근성" value={100 - Math.max(0, c.commute - 35) * 2} />
              <Bar label="셔틀" value={100 - c.shuttle * 6} />
              <Bar label="투자 흐름" value={Math.min(100, 55 + c.growth * 3)} />
              <p className="reason"><b>추천 이유</b><br />{c.reason}</p>
              <p className="risk"><b>주의</b> {c.risk}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
