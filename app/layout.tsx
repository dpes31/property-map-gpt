import './globals.css';

export const metadata = {
  title: '이사계획 세후 예산 판단 대시보드 v20',
  description: '세후 자금, 대출, 매매가 시나리오 기반 이사 예산 판단 대시보드',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
