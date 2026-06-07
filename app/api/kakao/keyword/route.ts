import { NextResponse } from 'next/server';

type PlaceResult = {
  id: string;
  placeName: string;
  categoryName: string;
  addressName: string;
  roadAddressName: string;
  lat: number;
  lng: number;
  placeUrl: string;
  phone: string;
};

function normalize(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function makeVariants(query: string): string[] {
  const trimmed = query.trim();
  const compact = trimmed.replace(/\s+/g, '');
  const variants = [trimmed, compact, `${trimmed} 아파트`, `${compact}아파트`];
  return variants.filter((item, index) => item && variants.indexOf(item) === index);
}

function toPlaceResult(item: any): PlaceResult {
  return {
    id: String(item.id ?? `${item.place_name}-${item.x}-${item.y}`),
    placeName: String(item.place_name ?? ''),
    categoryName: String(item.category_name ?? ''),
    addressName: String(item.address_name ?? ''),
    roadAddressName: String(item.road_address_name ?? ''),
    lat: Number(item.y),
    lng: Number(item.x),
    placeUrl: String(item.place_url ?? ''),
    phone: String(item.phone ?? ''),
  };
}

function dedupeAndSort(results: PlaceResult[], query: string): PlaceResult[] {
  const deduped: PlaceResult[] = [];
  const seen = new Set<string>();
  const q = normalize(query);

  results.forEach((item) => {
    const key = item.id || `${item.placeName}-${item.lat}-${item.lng}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  });

  return deduped.sort((a, b) => {
    const aName = normalize(a.placeName);
    const bName = normalize(b.placeName);
    const aMatch = aName.includes(q) ? 1 : 0;
    const bMatch = bName.includes(q) ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;

    const aApt = a.categoryName.includes('아파트') ? 1 : 0;
    const bApt = b.categoryName.includes('아파트') ? 1 : 0;
    return bApt - aApt;
  });
}

async function requestKakao(apiKey: string, keyword: string): Promise<PlaceResult[]> {
  const params = new URLSearchParams();
  params.set('query', keyword);
  params.set('size', '10');
  params.set('sort', 'accuracy');

  const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    cache: 'no-store',
  });

  if (!response.ok) return [];

  const data = await response.json();
  const documents = Array.isArray(data.documents) ? data.documents : [];
  return documents.map(toPlaceResult);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = typeof body.query === 'string' ? body.query.trim() : '';

    if (!query) {
      return NextResponse.json({ success: false, error: '검색어가 필요합니다.', results: [] }, { status: 400 });
    }

    const apiKey = process.env.KAKAO_REST_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: true, fallback: false, results: [], message: 'KAKAO_REST_API_KEY is missing.' });
    }

    const variants = makeVariants(query);
    const allResults: PlaceResult[] = [];

    for (const variant of variants) {
      const results = await requestKakao(apiKey, variant);
      allResults.push(...results);

      const directMatch = results.some((item) => normalize(item.placeName).includes(normalize(query)));
      if (directMatch) break;
    }

    return NextResponse.json({
      success: true,
      fallback: false,
      query,
      variantsTried: variants,
      results: dedupeAndSort(allResults, query),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Kakao keyword search failed',
      results: [],
    }, { status: 500 });
  }
}
