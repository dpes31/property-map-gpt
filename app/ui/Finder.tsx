'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

declare global {
  interface Window {
    kakao?: any;
  }
}

type Candidate = {
  name: string;
  region: string;
  score: number;
  grade: string;
  commute: number;
  shuttle: number;
  price: number;
  growth: number;
  type: string;
  reason: string;
  risk: string;
  lat: number;
  lng: number;
};

type PlaceResult = {
  id: string;
  placeName: string;
  categoryName: string;
  addressName: string;
  roadAddressName: string;
  lat: number;
  lng: number;
};

type CompanyAnchor = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

type CommuteResult = {
  fallback?: boolean;
  provider?: string;
  totalTimeMinutes?: number | null;
  transferCount?: number | null;
  totalWalkMeters?: number | null;
  paymentKrw?: number | null;
  routeSummary?: string | null;
};

type AreaDeal = {
  label: string;
  exclusiveArea: string;
  latestPrice: number;
  latestDate: string;
  range: string;
  count: number;
};

const DEFAULT_COMPANY: CompanyAnchor = {
  name: '남편 회사',
  address: '서울 강남구 논현동 105-7',
  lat: 37.5117,
  lng: 127.0305,
};

const baseCandidates: Candidate[] = [
  { name: '잠실 엘스', region: '서울 송파구 잠실동', score: 87, grade: 'A', commute: 48, shuttle: 6, price: 23.5, growth: 12.4, type: '실거주+투자 균형형', reason: '논현 출근성과 셔틀 접근성이 모두 우수한 균형형 후보', risk: '가격 상단부 진입', lat: 37.5121, lng: 127.0841 },
  { name: '트리지움', region: '서울 송파구 잠실동', score: 84, grade: 'B', commute: 50, shuttle: 8, price: 21.8, growth: 10.2, type: '대단지 유동성형', reason: '잠실 생활권과 대단지 유동성을 함께 확보', risk: '평형별 가격 편차 확인 필요', lat: 37.5101, lng: 127.0918 },
  { name: '과천자이', region: '경기 과천시 별양동', score: 81, grade: 'B', commute: 59, shuttle: 5, price: 22.5, growth: 15.1, type: '셔틀+신축 희소형', reason: '셔틀 접근성과 과천 신축 희소성이 강점', risk: '논현 출근시간은 조건부 확인 필요', lat: 37.4265, lng: 126.9915 },
  { name: '프레스티어자이', region: '경기 과천시 별양동', score: 79, grade: 'B', commute: 60, shuttle: 7, price: 24.8, growth: 13.7, type: '장기보유 후보형', reason: '과천 원도심 신축 대단지 후보', risk: '입주 전 데이터와 분양가 선반영 주의', lat: 37.4287, lng: 126.9918 },
  { name: '분당 파크뷰', region: '경기 성남시 분당구 정자동', score: 76, grade: 'B', commute: 67, shuttle: 6, price: 21.0, growth: 8.8, type: '학군·정주성형', reason: '분당 학군·정주성·셔틀 접근성 양호', risk: '논현 출근 60분 조건은 초과 가능', lat: 37.3715, lng: 127.1065 },
  { name: '디에이치퍼스티어아이파크', region: '서울 강남구 개포동', score: 82, grade: 'B', commute: 42, shuttle: 9, price: 25.5, growth: 9.5, type: '강남 신축 상품형', reason: '강남 접근성과 신축 상품성이 강함', risk: '기본 예산 상단 초과 가능', lat: 37.4792, lng: 127.0579 },
];

function recalc(c: Candidate, maxPrice: number, maxCommute: number): Candidate {
  let score = c.score;
  if (c.price > maxPrice) score -= 12;
  if (c.commute > maxCommute) score -= 10;
  if (c.shuttle <= 7) score += 3;
  const final = Math.max(0, Math.min(100, score));
  return { ...c, score: final, grade: final >= 85 ? 'A' : final >= 75 ? 'B' : final >= 65 ? 'C' : 'D' };
}

function getMockAreaDeals(placeName: string): AreaDeal[] {
  if (placeName.includes('엘스')) {
    return [
      { label: '33평', exclusiveArea: '84.8㎡', latestPrice: 24.7, latestDate: '2026-05', range: '23.8~25.4억', count: 8 },
      { label: '25평', exclusiveArea: '59.9㎡', latestPrice: 20.2, latestDate: '2026-04', range: '19.4~21.0억', count: 11 },
      { label: '18평', exclusiveArea: '45.0㎡', latestPrice: 16.8, latestDate: '2026-03', range: '16.2~17.1억', count: 4 },
    ];
  }

  if (placeName.includes('프레스티어') || placeName.includes('과천')) {
    return [
      { label: '34평', exclusiveArea: '84.9㎡', latestPrice: 24.8, latestDate: '입주예정', range: '24.0~26.0억', count: 0 },
      { label: '30평', exclusiveArea: '74.9㎡', latestPrice: 22.4, latestDate: '입주예정', range: '21.5~23.5억', count: 0 },
      { label: '25평', exclusiveArea: '59.9㎡', latestPrice: 18.9, latestDate: '입주예정', range: '18.0~20.5억', count: 0 },
    ];
  }

  return [
    { label: '30평', exclusiveArea: '84.9㎡', latestPrice: 22.8, latestDate: '2026-05', range: '21.8~24.0억', count: 6 },
    { label: '26평', exclusiveArea: '72.0㎡', latestPrice: 20.4, latestDate: '2026-04', range: '19.5~21.2억', count: 5 },
    { label: '18평', exclusiveArea: '59.9㎡', latestPrice: 17.6, latestDate: '2026-03', range: '16.8~18.3억', count: 4 },
  ];
}

function getInvestmentSignal(placeName: string) {
  if (placeName.includes('엘스')) {
    return { grade: 'A-', summary: '대단지 거래량과 잠실 생활권 수요가 강점입니다. 단, 가격 레벨이 높아 진입가 관리가 중요합니다.', momentum: 78, liquidity: 86, budget: 74 };
  }
  if (placeName.includes('프레스티어') || placeName.includes('과천')) {
    return { grade: 'B+', summary: '과천 신축 희소성과 정비사업 기대감은 강점입니다. 입주 전 가격 선반영 여부를 별도 점검해야 합니다.', momentum: 82, liquidity: 55, budget: 68 };
  }
  return { grade: 'B', summary: '입지와 상품성은 확인되지만, 실거래량·상승률·예산 적합성은 실제 국토부 데이터 연결 후 재판단이 필요합니다.', momentum: 64, liquidity: 60, budget: 70 };
}

function Bar({ label, value }: { label: string; value: number }) {
  return <div className="bar-row"><span>{label}</span><div className="bar"><i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div></div>;
}

function FallbackMap({ selectedPlace }: { selectedPlace: PlaceResult | null }) {
  return <div className="map-fallback"><div className="ring r1" /><div className="ring r2" /><div className="ring r3" /><div className="pin company">회사</div>{selectedPlace ? <div className="pin p1">선택</div> : <><div className="pin p1">잠실</div><div className="pin p2">과천</div><div className="pin p3">분당</div></>}<div className="route-line" /></div>;
}

function useKakaoMap(containerRef: React.RefObject<HTMLDivElement | null>, candidates: Candidate[], selectedPlace: PlaceResult | null, companyAnchor: CompanyAnchor) {
  const [status, setStatus] = useState<'ready' | 'loading' | 'missing-key' | 'error'>('loading');
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowsRef = useRef<any[]>([]);

  const clearOverlays = () => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    infoWindowsRef.current.forEach((info) => info.close());
    markersRef.current = [];
    infoWindowsRef.current = [];
  };

  const drawMarkers = () => {
    if (!containerRef.current || !window.kakao?.maps) return;
    const kakao = window.kakao;
    let map = mapRef.current;

    if (!map) {
      map = new kakao.maps.Map(containerRef.current, {
        center: new kakao.maps.LatLng(companyAnchor.lat, companyAnchor.lng),
        level: 8,
      });
      mapRef.current = map;
      kakao.maps.event.addListener(map, 'click', () => {
        infoWindowsRef.current.forEach((info) => info.close());
      });
    }

    clearOverlays();
    const bounds = new kakao.maps.LatLngBounds();
    const companyPosition = new kakao.maps.LatLng(companyAnchor.lat, companyAnchor.lng);
    const companyMarker = new kakao.maps.Marker({ map, position: companyPosition, title: companyAnchor.name });
    const companyInfo = new kakao.maps.InfoWindow({
      content: `<div style="padding:8px 10px;font-size:12px;font-weight:700;white-space:nowrap">${companyAnchor.name}<br/><span style="font-weight:400;color:#64748b">${companyAnchor.address}</span></div>`,
    });
    kakao.maps.event.addListener(companyMarker, 'click', () => {
      infoWindowsRef.current.forEach((info) => info.close());
      companyInfo.open(map, companyMarker);
    });
    markersRef.current.push(companyMarker);
    infoWindowsRef.current.push(companyInfo);
    bounds.extend(companyPosition);

    const targets = selectedPlace
      ? [{ name: selectedPlace.placeName, region: selectedPlace.categoryName || selectedPlace.addressName, grade: '선택', score: 0, commute: 0, lat: selectedPlace.lat, lng: selectedPlace.lng }]
      : candidates.slice(0, 6);

    targets.forEach((target) => {
      const position = new kakao.maps.LatLng(target.lat, target.lng);
      const marker = new kakao.maps.Marker({ map, position, title: target.name });
      const detail = selectedPlace ? target.region : `${target.grade} ${target.score}점 · ${target.commute}분`;
      const info = new kakao.maps.InfoWindow({
        content: `<div style="padding:8px 10px;font-size:12px;font-weight:700;white-space:nowrap">${target.name}<br/><span style="font-weight:400;color:#64748b">${detail}</span></div>`,
      });
      kakao.maps.event.addListener(marker, 'click', () => {
        infoWindowsRef.current.forEach((item) => item.close());
        info.open(map, marker);
      });
      markersRef.current.push(marker);
      infoWindowsRef.current.push(info);
      bounds.extend(position);
    });

    map.setBounds(bounds);
    setStatus('ready');
  };

  useEffect(() => {
    const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
    if (!appKey) {
      setStatus('missing-key');
      return;
    }
    if (!containerRef.current) return;

    if (window.kakao?.maps) {
      window.kakao.maps.load(drawMarkers);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-kakao-map="true"]');
    if (existing) {
      existing.addEventListener('load', () => window.kakao?.maps?.load(drawMarkers), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.dataset.kakaoMap = 'true';
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.async = true;
    script.onload = () => window.kakao?.maps?.load(drawMarkers);
    script.onerror = () => setStatus('error');
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (status === 'ready') drawMarkers();
  }, [selectedPlace, candidates, companyAnchor.lat, companyAnchor.lng]);

  return status;
}

export default function Finder() {
  const [company, setCompany] = useState(DEFAULT_COMPANY.address);
  const [companyAnchor, setCompanyAnchor] = useState<CompanyAnchor>(DEFAULT_COMPANY);
  const [maxCommute, setMaxCommute] = useState(60);
  const [minPrice, setMinPrice] = useState(15);
  const [maxPrice, setMaxPrice] = useState(25);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [searchState, setSearchState] = useState('');
  const [commute, setCommute] = useState<CommuteResult | null>(null);
  const [commuteState, setCommuteState] = useState('');
  const mapRef = useRef<HTMLDivElement | null>(null);

  const candidates = useMemo(() => baseCandidates
    .map((c) => recalc(c, maxPrice, maxCommute))
    .filter((c) => c.price >= minPrice - 1 && c.price <= maxPrice + 3)
    .filter((c) => !query || c.name.includes(query) || c.region.includes(query))
    .sort((a, b) => b.score - a.score), [maxPrice, maxCommute, minPrice, query]);

  const activeCandidates = submitted ? candidates : baseCandidates;
  const top = selectedPlace ? { name: selectedPlace.placeName, grade: '선택', score: '', type: selectedPlace.categoryName || selectedPlace.addressName } : activeCandidates[0];
  const mapStatus = useKakaoMap(mapRef, activeCandidates, selectedPlace, companyAnchor);
  const areaDeals = selectedPlace ? getMockAreaDeals(selectedPlace.placeName) : [];
  const investment = selectedPlace ? getInvestmentSignal(selectedPlace.placeName) : null;
  const budgetRows = areaDeals.map((row) => ({ ...row, withinBudget: row.latestPrice >= minPrice && row.latestPrice <= maxPrice }));

  async function geocodeCompany() {
    const res = await fetch('/api/kakao/address', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: company }) });
    const data = await res.json();
    if (data.result) {
      setCompanyAnchor({ name: '남편 회사', address: data.result.roadAddressName || data.result.addressName || company, lat: data.result.lat, lng: data.result.lng });
      setCommute(null);
      setCommuteState('회사 위치가 갱신되었습니다. 선택 단지가 있으면 출근시간을 자동 재계산합니다.');
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setPlaces([]);
    setSelectedPlace(null);
    setSearchState('');
    setCommute(null);
    setCommuteState('');
  }

  async function searchPlaces() {
    if (!query.trim()) { setSearchState('검색어를 입력하세요.'); return; }
    setSearchState('검색 중');
    setSelectedPlace(null);
    setCommute(null);
    setCommuteState('');
    const res = await fetch('/api/kakao/keyword', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
    const data = await res.json();
    setPlaces(data.results ?? []);
    setSearchState((data.results?.length ?? 0) > 0 ? '검색 결과 중 분석할 대상을 선택하세요.' : '검색 결과가 없습니다.');
  }

  function selectPlace(p: PlaceResult) {
    setSelectedPlace(p);
    setCommute(null);
    setCommuteState('선택 단지 기준으로 출근시간을 자동 계산 중입니다.');
    setSearchState('선택 완료. 선택한 대상 기준으로 지도 마커를 갱신했습니다.');
    setSubmitted(true);
  }

  async function calculateCommute() {
    if (!selectedPlace) return;
    setCommuteState('ODsay 기준 대중교통 경로를 계산 중입니다.');
    setCommute(null);

    const response = await fetch('/api/transit/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { lat: selectedPlace.lat, lng: selectedPlace.lng },
        destination: { lat: companyAnchor.lat, lng: companyAnchor.lng },
      }),
    });

    const data = await response.json();

    if (!data.success) {
      setCommuteState(data.error || '출근시간 계산에 실패했습니다.');
      return;
    }

    setCommute(data);
    setCommuteState(data.fallback ? 'ODsay 응답 실패로 임시 추정값을 표시합니다.' : 'ODsay 기준 대중교통 경로 계산 완료.');
  }

  useEffect(() => {
    if (!selectedPlace) return;
    const timer = window.setTimeout(() => {
      calculateCommute();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [selectedPlace?.id, companyAnchor.lat, companyAnchor.lng]);

  return <main className="shell">
    <section className="hero-v2"><div className="hero-copy"><span className="eyebrow">Property Map GPT · Decision Dashboard</span><h1 className="title">우리 가족 조건에 맞는<br />이사 후보지를 먼저 좁힙니다</h1><p className="desc">단지명 검색 결과는 사용자가 직접 선택하고, 선택 즉시 회사까지의 대중교통 소요시간과 투자 판단 보조 지표를 표시합니다.</p><div className="row compact"><span className="pill dark">논현 {maxCommute}분</span><span className="pill">자동 통근 계산</span><span className="pill">{minPrice}~{maxPrice}억</span></div></div><aside className="hero-panel"><div className="panel-label">현재 분석 대상</div><strong>{top?.name ?? '후보 없음'}</strong><div className="hero-score">{String(top?.grade ?? '-')} {String(top?.score ?? '')}</div><p>{commute?.totalTimeMinutes ? `남편 회사까지 ${commute.totalTimeMinutes}분` : top?.type ?? '조건을 입력하면 후보를 재정렬합니다.'}</p></aside></section>
    <section className="workspace"><div className="control-card"><div className="section-head"><span>01</span><h2>조건 입력</h2></div><label>회사 주소<input className="input" value={company} onChange={(e) => setCompany(e.target.value)} /></label><button className="button secondary" onClick={geocodeCompany}>회사 위치 갱신</button><label>단지명/지역 검색<input className="input" placeholder="예: 더샵스타리버, 프레스티어자이, 잠실 엘스" value={query} onChange={(e) => handleQueryChange(e.target.value)} /></label><button className="button secondary" onClick={searchPlaces}>카카오에서 단지 검색</button>{searchState && <p className="search-state">{searchState}</p>}{places.length > 0 && <div className="place-list">{places.map((p) => <button key={p.id} className={`place-item ${selectedPlace?.id === p.id ? 'selected' : ''}`} onClick={() => selectPlace(p)}><b>{p.placeName}</b><span>{p.categoryName || '분류 없음'}</span><small>{p.roadAddressName || p.addressName}</small></button>)}</div>}<div className="two-col"><label>출근 허용시간<input className="input" type="number" value={maxCommute} onChange={(e) => setMaxCommute(Number(e.target.value))} /></label><label>최대 매매가, 억<input className="input" type="number" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} /></label></div><label>최소 매매가, 억<input className="input" type="number" value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))} /></label><button className="button" onClick={() => setSubmitted(true)}>후보 추천 실행</button></div>
      <div className="map-card"><div className="section-head"><span>02</span><h2>입지 지도</h2></div><div ref={mapRef} className={`map-visual ${mapStatus === 'ready' ? 'kakao-live' : ''}`} aria-label="Kakao Map">{mapStatus !== 'ready' && <FallbackMap selectedPlace={selectedPlace} />}</div><div className="map-note">{mapStatus === 'ready' && (selectedPlace ? 'Kakao Map 연결 완료. 선택 단지와 회사 목적지만 표시합니다.' : 'Kakao Map 연결 완료. 후보 단지와 회사 목적지 마커를 표시합니다.')}{mapStatus === 'missing-key' && 'Kakao Map JavaScript Key가 감지되지 않았습니다.'}{mapStatus === 'error' && 'Kakao Map 로드에 실패했습니다.'}{mapStatus === 'loading' && 'Kakao Map을 불러오는 중입니다.'}</div>{selectedPlace && <div className="map-note"><b>선택 단지</b><br />{selectedPlace.placeName}<br />{selectedPlace.roadAddressName || selectedPlace.addressName}</div>}</div></section>
    <section className="result-v2"><div className="section-head wide"><span>03</span><div><h2>{selectedPlace ? '선택 단지 통근·투자 분석' : '추천 후보 ' + activeCandidates.length + '개'}</h2><p>{selectedPlace ? '선택 즉시 통근시간을 계산하고, 예산 내 진입 가능한 평형과 투자 판단 보조 지표를 함께 보여줍니다.' : '점수는 출근성, 셔틀 접근성, 가격 적합성, 상승률, 거래량, 리스크를 종합한 임시 모델입니다.'}</p></div></div>{selectedPlace && <article className="commute-card"><div><b>{selectedPlace.placeName}</b><span>{selectedPlace.roadAddressName || selectedPlace.addressName}</span></div>{commuteState && <p className="search-state">{commuteState}</p>}{commute && <div className="commute-grid"><div><strong>{commute.totalTimeMinutes ?? '-'}분</strong><span>총 소요시간</span></div><div><strong>{commute.transferCount ?? '-'}회</strong><span>환승</span></div><div><strong>{commute.totalWalkMeters ?? '-'}m</strong><span>도보거리</span></div><div><strong>{commute.paymentKrw ? `${commute.paymentKrw.toLocaleString()}원` : '-'}</strong><span>요금</span></div></div>}{commute?.routeSummary && <p className="risk"><b>경로 요약</b> {commute.routeSummary}</p>}</article>}{selectedPlace && investment && <section className="investment-grid"><article className="investment-card"><div className="candidate-top"><span className="badge grade-B">투자성 {investment.grade}</span><span className="type">판단 보조 지표</span></div><p className="reason">{investment.summary}</p><Bar label="상승 흐름" value={investment.momentum} /><Bar label="거래 유동성" value={investment.liquidity} /><Bar label="예산 적합" value={investment.budget} /><p className="risk">미래 가격 상승을 보장하는 예측이 아니라, 실거래 추세·거래량·예산 적합성을 종합해 볼 수 있는 판단 보조 영역입니다.</p></article><article className="investment-card"><h3>예산 내 평형 가능성</h3><div className="deal-table"><div className="deal-head"><span>평형</span><span>최근 실거래</span><span>예산</span></div>{budgetRows.map((row) => <div className="deal-row" key={row.label}><span>{row.label} <small>{row.exclusiveArea}</small></span><span><b>{row.latestPrice.toFixed(1)}억</b><small>{row.latestDate} · {row.range} ({row.count}건)</small></span><span className={row.withinBudget ? 'fit-ok' : 'fit-no'}>{row.withinBudget ? '가능' : '초과'}</span></div>)}</div><p className="risk">현재 값은 화면 구조 검증용 임시 데이터입니다. 다음 단계에서 국토부 실거래가 API로 실제 평형별 거래가를 대체합니다.</p></article></section>}<div className="candidate-grid">{activeCandidates.map((c) => <article className="candidate-card" key={c.name}><div className="candidate-top"><span className={`badge grade-${c.grade}`}>{c.grade} {c.score}점</span><span className="type">{c.type}</span></div><h3>{c.name}</h3><p className="meta">{c.region}</p><div className="metric-row"><b>{c.commute}분</b><span>논현 출근</span><b>{c.shuttle}분</b><span>셔틀 도보</span><b>{c.price}억</b><span>최근가</span></div><Bar label="출근성" value={100 - Math.max(0, c.commute - 35) * 2} /><Bar label="셔틀" value={100 - c.shuttle * 6} /><Bar label="투자 흐름" value={Math.min(100, 55 + c.growth * 3)} /><p className="reason"><b>추천 이유</b><br />{c.reason}</p><p className="risk"><b>주의</b> {c.risk}</p></article>)}</div></section>
  </main>;
}
