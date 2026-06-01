# Property Map GPT

Vercel 배포용 경량 MVP입니다.

## 목적

주소/단지명 또는 조건을 입력해 이사 후보지를 점수화하는 부동산 의사결정 대시보드입니다.

## Vercel 환경변수

```env
KAKAO_REST_API_KEY=
NEXT_PUBLIC_KAKAO_MAP_APP_KEY=
ODSAY_API_KEY=
DATA_GO_KR_SERVICE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DISABLE_WRITES=false
```

## 현재 버전

- mock 데이터 기반 후보 추천 화면
- Vercel 빌드 가능 구조
- API Key 없어도 기본 화면 작동
- 추후 v3 전체 소스 반영 가능
