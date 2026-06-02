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

const fallbackResults = [
  {
    id: 'fallback-the-sharp-star-river-apt',
    placeName: '더샵스타리버아파트',
    categoryName: '부동산 > 주거시설 > 아파트',
    addressName: '서울특별시 강동구 천호동',
    roadAddressName: '서울특별시 강동구 천호동',
    lat: 37.5454,
    lng: 127.1266,
    placeUrl: '',
  },
  {
    id: 'fallback-the-sharp-star-river-officetel',
    placeName: '더샵스타리버오피스텔',
    categoryName: '부동산 > 주거시설 > 오피스텔',
    addressName: '서울특별시 강동구 천호동',
    roadAddressName: '서울특별시 강동구 천호동',
    lat: 37.5451,
    lng: 127.1263,
    placeUrl: '',
  },
];

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ success: false, error: '검색어가 필요합니다.' }, { status: 400 });
    }

    const apiKey = process.env.KAKAO_REST_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: true, fallback: true, results: fallbackResults });
    }

    const params = new URLSearchParams({
      query,
      size: '10',
      sort: 'accuracy',
    });

    const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`, {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ success: true, fallback: true, results: fallbackResults });
    }

    const data = await response.json();
    const results = (data.documents ?? []).map((item: KakaoDocument) => ({
      id: item.id,
      placeName: item.place_name,
      categoryName: item.category_name ?? '',
      addressName: item.address_name ?? '',
      roadAddressName: item.road_address_name ?? '',
      lat: Number(item.y),
      lng: Number(item.x),
      placeUrl: item.place_url ?? '',
      phone: item.phone ?? '',
    }));

    return NextResponse.json({ success: true, fallback: false, results });
  } catch {
    return NextResponse.json({ success: true, fallback: true, results: fallbackResults });
  }
}
