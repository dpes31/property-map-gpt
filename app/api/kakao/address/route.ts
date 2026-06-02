import { NextResponse } from 'next/server';

type KakaoAddressDocument = {
  address_name?: string;
  road_address?: { address_name?: string } | null;
  address?: { address_name?: string } | null;
  x: string;
  y: string;
};

const fallback = {
  addressName: '서울 강남구 논현동 105-7',
  roadAddressName: '',
  lat: 37.5117,
  lng: 127.0305,
};

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ success: false, error: '주소가 필요합니다.' }, { status: 400 });
    }

    const apiKey = process.env.KAKAO_REST_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: true, fallback: true, result: fallback });
    }

    const params = new URLSearchParams({ query, size: '1' });
    const response = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?${params.toString()}`, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ success: true, fallback: true, result: fallback });
    }

    const data = await response.json();
    const first = data.documents?.[0] as KakaoAddressDocument | undefined;
    if (!first) {
      return NextResponse.json({ success: true, fallback: true, result: fallback });
    }

    return NextResponse.json({
      success: true,
      fallback: false,
      result: {
        addressName: first.address?.address_name ?? first.address_name ?? query,
        roadAddressName: first.road_address?.address_name ?? '',
        lat: Number(first.y),
        lng: Number(first.x),
      },
    });
  } catch {
    return NextResponse.json({ success: true, fallback: true, result: fallback });
  }
}
