import './globals.css';
import './investment.css';

export const metadata = {
  title: 'Property Map GPT',
  description: '이사 후보지 자동 발굴 대시보드',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
