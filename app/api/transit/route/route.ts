import { NextResponse } from 'next/server';

type Coordinate = {
  lat: number;
  lng: number;
};

type ODsayPathInfo = {
  totalTime?: number;
  payment?: number;
  busTransitCount?: number;
  subwayTransitCount?: number;
  totalWalk?: number;
  firstStartStation?: string;
  lastEndStation?: string;
  mapObj?: string;
};

type ODsayPath = {
  pathType?: number;
  info?: ODsayPathInfo;
};

function fallbackTransit(origin: Coordinate, destination: Coordinate) {
  const latDiff = Math.abs(origin.lat - destination.lat);
  const lngDiff = Math.abs(origin.lng - destination.lng);
  const roughDistance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
  const estimated = Math.max(25, Math.round(roughDistance * 2.2 + 20));

  return {
    fallback: true,
    provider: 'fallback',
    totalTimeMinutes: estimated,
    transferCount: estimated > 55 ? 2 : 1,
    totalWalkMeters: estimated > 55 ? 950 : 650,
    paymentKrw: 1550,
    routeSummary: 'ODsay 응답 실패 또는 API Key 미설정으로 거리 기반 임시 시간을 표시합니다.',
  };
}

function parseBestPath(paths: ODsayPath[] | undefined) {
  if (!Array.isArray(paths) || paths.length === 0) return null;

  const sorted = [...paths].sort((a, b) => {
    const timeA = a.info?.totalTime ?? Number.MAX_SAFE_INTEGER;
    const timeB = b.info?.totalTime ?? Number.MAX_SAFE_INTEGER;
    const transferA = (a.info?.busTransitCount ?? 0) + (a.info?.subwayTransitCount ?? 0);
    const transferB = (b.info?.busTransitCount ?? 0) + (b.info?.subwayTransitCount ?? 0);
    if (timeA !== timeB) return timeA - timeB;
    return transferA - transferB;
  });

  const best = sorted[0];
  const info = best.info;
  if (!info) return null;

  const transferCount = Math.max(0, (info.busTransitCount ?? 0) + (info.subwayTransitCount ?? 0) - 1);
  const start = info.firstStartStation ? `${info.firstStartStation}` : '';
  const end = info.lastEndStation ? `${info.lastEndStation}` : '';

  return {
    fallback: false,
    provider: 'odsay',
    pathType: best.pathType ?? null,
    totalTimeMinutes: info.totalTime ?? null,
    transferCount,
    totalWalkMeters: info.totalWalk ?? null,
    paymentKrw: info.payment ?? null,
    routeSummary: start && end ? `${start} → ${end}` : 'ODsay 기준 최적 대중교통 경로',
    mapObj: info.mapObj ?? null,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const origin = body.origin as Coordinate;
    const destination = body.destination as Coordinate;

    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return NextResponse.json({ success: false, error: '출발지와 목적지 좌표가 필요합니다.' }, { status: 400 });
    }

    const apiKey = process.env.ODSAY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: true, ...fallbackTransit(origin, destination) });
    }

    const params = new URLSearchParams({
      apiKey,
      SX: String(origin.lng),
      SY: String(origin.lat),
      EX: String(destination.lng),
      EY: String(destination.lat),
    });

    const response = await fetch(`https://api.odsay.com/v1/api/searchPubTransPathT?${params.toString()}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ success: true, ...fallbackTransit(origin, destination), odsayStatus: response.status });
    }

    const data = await response.json();
    const best = parseBestPath(data.result?.path);

    if (!best) {
      return NextResponse.json({ success: true, ...fallbackTransit(origin, destination), odsayMessage: data.error?.msg ?? 'No route found' });
    }

    return NextResponse.json({ success: true, ...best });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'ODsay route request failed',
    }, { status: 500 });
  }
}
