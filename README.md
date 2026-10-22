# LIMSTAGE

웰니스 쇼핑몰 (Apparel · Accessories · Meditation · Books&Journals)

- **client/**: React + Vite 프론트엔드 → Vercel 배포 (Root Directory: `client`)
- **server/**: Node.js + Express + MongoDB 백엔드 → Heroku 배포 (저장소 최상위 `package.json` 이 `server` 를 설치·실행)

## 로컬 실행

```bash
# 백엔드 (http://localhost:5000)
cd server
cp .env.example .env   # 값 채우기
npm install
npm run dev

# 프론트엔드 (http://localhost:5173)
cd client
cp .env.example .env   # 값 채우기
npm install
npm run dev
```

## 주요 기능

- 회원가입 · 로그인 (JWT, httpOnly 쿠키)
- 상품 목록 (카테고리 · 페이지네이션) · 상품 상세
- 장바구니 · 주문 · 포트원(KG이니시스) 결제 및 서버 검증
- 내 주문 목록 (처리중 · 배송중 · 배송완료)
- 관리자: 대시보드 · 상품 등록/수정/삭제 (Cloudinary 이미지) · 주문 관리 · 매출 분석 · 고객 관리
