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
  reason: string;
  risk: string;
};

const baseCandidates: Candidate[] = [
  { name: '잠실 엘스', region: '서울 송파구 잠실동', score: 87, grade: 'A', commute: 48, shuttle: 6, price: 23.5, growth: 12.4, reason: '논현 출근성과 셔틀 접근성이 모두 우수한 균형형 후보', risk: '가격 상단부 진입' },
  { name: '트리지움', region: '서울 송파구 잠실동', score: 84, grade: 'B', commute: 50, shuttle: 8, price: 21.8, growth: 10.2, reason: '잠실 생활권과 대단지 유동성을 함께 확보', risk: '평형별 가격 편차 확인 필요' },
  { name: '과천자이', region: '경기 과천시 별양동', score: 81, grade: 'B', commute: 59, shuttle: 5, price: 22.5, growth: 15.1, reason: '셔틀 접근성과 과천 신축 희소성이 강점', risk: '논현 출근시간은 조건부 확인 필요' },
  { name: '프레스티어자이', region: '경기 과천시 별양동', score: 79, grade: 'B', commute: 60, shuttle: 7, price: 24.8, growth: 13.7, reason: '과천 원도심 신축 대단지 후보', risk: '입주 전 데이터와 분양가 선반영 주의' },
  { name: '분당 파크뷰', region: '경기 성남시 분당구 정자동', score: 76, grade: 'B', commute: 67, shuttle: 6, price: 21.0, growth: 8.8, reason: '분당 학군·정주성·셔틀 접근성 양호', risk: '논현 출근 60분 조건은 초과 가능' },
  { name: '디에이치퍼스티어아이파크', region: '서울 강남구 개포동', score: 82, grade: 'B', commute: 42, shuttle: 9, price: 25.5, growth: 9.5, reason: '강남 접근성과 신축 상품성이 강함', risk: '기본 예산 상단 초과 가능' },
];

function recalc(c: Candidate, maxPrice: number, maxCommute: number) {
  let score = c.score;
  if (c.price > maxPrice) score -= 12;
  if (c.commute > maxCommute) score -= 10;
  if (c.shuttle <= 7) score += 3;
  const final = Math.max(0, Math.min(100, score));
  return { ...c, score: final, grade: final >= 85 ? 'A' : final >= 75 ? 'B' : final >= 65 ? 'C' : 'D' };
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

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">Dual commute real estate finder</div>
        <h1 className="title">이사 후보지 자동 발굴 대시보드</h1>
        <p className="desc">회사 주소, 셔틀 탑승지, 매매가 범위, 출근시간 조건을 기준으로 후보 단지를 점수화합니다. 현재 배포 버전은 API 연결 전 mock MVP이며, Vercel 환경변수 입력 후 Kakao·ODsay·국토부 API를 단계적으로 연결할 수 있습니다.</p>
        <div className="row">
          <span className="pill">기본 회사: {company}</span>
          <span className="pill">출근 {maxCommute}분 이내</span>
          <span className="pill">매매가 {minPrice}~{maxPrice}억</span>
        </div>
      </section>

      <section className="card" style={{marginTop:18}}>
        <h3>조건 입력</h3>
        <div className="grid cards">
          <label>회사 주소<input className="input" value={company} onChange={(e)=>setCompany(e.target.value)} /></label>
          <label>단지명/지역 검색<input className="input" placeholder="예: 프레스티어자이, 잠실" value={query} onChange={(e)=>setQuery(e.target.value)} /></label>
          <label>출근 허용시간<input className="input" type="number" value={maxCommute} onChange={(e)=>setMaxCommute(Number(e.target.value))} /></label>
          <label>최소 매매가, 억<input className="input" type="number" value={minPrice} onChange={(e)=>setMinPrice(Number(e.target.value))} /></label>
          <label>최대 매매가, 억<input className="input" type="number" value={maxPrice} onChange={(e)=>setMaxPrice(Number(e.target.value))} /></label>
        </div>
        <button className="button" style={{marginTop:16}} onClick={()=>setSubmitted(true)}>후보 추천 실행</button>
      </section>

      <section className="result">
        <h2>추천 후보 {submitted ? candidates.length : baseCandidates.length}개</h2>
        <div className="grid cards">
          {(submitted ? candidates : baseCandidates).map((c) => (
            <article className="card" key={c.name}>
              <div className="score">{c.grade} {c.score}점</div>
              <h3 style={{marginTop:14}}>{c.name}</h3>
              <p className="meta">{c.region}</p>
              <p>논현 출근 {c.commute}분 · 셔틀 도보 {c.shuttle}분 · 최근가 약 {c.price}억</p>
              <p><b>추천 이유</b><br />{c.reason}</p>
              <p className="meta"><b>주의</b> {c.risk}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
