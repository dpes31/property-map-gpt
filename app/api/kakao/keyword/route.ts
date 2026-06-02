import { NextResponse } from 'next/server';

type KakaoDocument = {
  id: string;
  place_name: string;
  category_name?: string;
  address_name?: string;
  road_address_name?: string;
  x: string;
  y: string;
  place_url?: string;
  phone?: string;
};

type PlaceResult = {
  id: string;
  placeName: string;
  categoryName: string;
  addressName: string;
  roadAddressName: string;
  lat: number;
  lng: number;
  placeUrl: string;
  phone?: string;
};

function normalize(value: string) {
  return value.replace(/\s+/g, '').toLowerCase();
}

function buildQueryVariants(query: string) {
  const trimmed = query.trim();
  const compact = trimmed.replace(/\s+/g, '');
  const variants = [
    trimmed,
    compact,
    `${trimmed} 아파트`,
    `${compact}아파트`,
  ];
  return Array.from(new Set(variants.filter(Boolean)));
}

function mapDocument(item: KakaoDocument): PlaceResult {
  return {
    id: item.id,
    placeName: item.place_name,
    categoryName: item.category_name ?? '',
    addressName: item.address_name ?? '',
    roadAddressName: item.road_address_name ?? '',
    lat: Number(item.y),
    lng: Number(item.x),
    placeUrl: item.place_url ?? '',
    phone: item.phone ?? '',
  };
}

function rankResults(results: PlaceResult[], originalQuery: string) {
  const normalizedQuery = normalize(originalQuery);
  const unique = new Map<string, PlaceResult>();

  results.forEach((result) => {
    const key = result.id || `${result.placeName}:${result.lat}:${result.lng}`;
    if (!unique.has(key)) unique.set(key, result);
  });

  return Array.from(unique.values()).sort((a, b) => {
    const aName = normalize(a.placeName);
    const bName = normalize(b.placeName);
    const aExact = aName.includes(normalizedQuery) ? 1 : 0;
    const bExact = bName.includes(normalizedQuery) ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;

    const aApt = a.categoryName.includes('아파트') ? 1 : 0;
    const bApt = b.categoryName.includes('아파트') ? 1 : 0;
    if (aApt !== bApt) return bApt - aApt;

    return a.placeName.localeCompare(b.placeName, 'ko');
  });
}

async function kakaoKeywordSearch(apiKey: string, query: string) {
  const params = new URLSearchParams({
    query,
    size: '10',
    sort: 'accuracy',
  });

  const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    cache: 'no-store',
  });

  if (!response.ok) return [];

  const data = await response.json();
  return (data.documents ?? []).map(mapDocument);
}

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ success: false, error: '검색어가 필요합니다.' }, { status: 400 });
    }

    const apiKey = process.env.KAKAO_REST_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: true, fallback: true, results: [], message: 'KAKAO_REST_API_KEY가 없어 검색 결과를 반환하지 않습니다.' });
    }

    const variants = buildQueryVariants(query);
    const allResults: PlaceResult[] = [];

    for (const variant of variants) {
      const results = await kakaoKeywordSearch(apiKey, variant);
      allResults.push(...results);
      const hasDirectMatch = results.some((item) => normalize(item.placeName).includes(normalize(query)));
      if (hasDirectMatch) break;
    }

    const ranked = rankResults(allResults, query);

    return NextResponse.json({
      success: true,
      fallback: false,
      query,
      variantsTried: variants,
      results: ranked,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Kakao keyword search failed',
      results: [],
    }, { status: 500 });
  }
}
