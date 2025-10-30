import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as MapPin, Phone, Share2, Heart, User } from "lucide-react";

/** ===== 디자인 토큰 ===== */
const MODERN = {
  base: "text-gray-800",
  card: "bg-white border border-gray-200 shadow-sm",
  btn: "rounded-lg px-4 py-2 text-sm font-medium transition",
  primary: "bg-rose-500 text-white hover:bg-rose-600",
  soft: "bg-gray-100 hover:bg-gray-200 text-gray-700",
  pill: "rounded-full px-4 py-2 text-sm bg-rose-50 text-rose-700",
};

/** ===== 웨딩 정보 ===== */
const WEDDING_DATE = "2020-03-21T17:00:00+09:00"; // 2020년 3월 21일 오후 5시
const VENUE_NAME = "웨딩홀 이름";
const ADDRESS = "서울시 강남구 테헤란로 123";
const FLOOR = "3층 그랜드볼룸";
const TEL_GROOM = "010-1234-5678";
const TEL_BRIDE = "010-9876-5432";
const MAP_LINK_KAKAO = "https://map.kakao.com/";
const MAP_LINK_NAVER = "https://map.naver.com/";

// 신랑신부 정보
const GROOM = {
  name: "신랑 이름",
  parents: { father: "아버지", mother: "어머니" },
  relation: "장남",
  phone: TEL_GROOM,
  photo: "/profiles/groom.jpg"
};

const BRIDE = {
  name: "신부 이름",
  parents: { father: "아버지", mother: "어머니" },
  relation: "장녀",
  phone: TEL_BRIDE,
  photo: "/profiles/bride.jpg"
};

// 계좌 정보
const ACCOUNTS_GROOM = [
  { bank: "카카오뱅크", num: "3333-12-3456789", name: "신랑 이름" },
  { bank: "신한은행", num: "110-123-456789", name: "신랑 아버지" },
  { bank: "우리은행", num: "1002-123-456789", name: "신랑 어머니" },
];

const ACCOUNTS_BRIDE = [
  { bank: "토스뱅크", num: "1000-22-334455", name: "신부 이름" },
  { bank: "국민은행", num: "123456-01-123456", name: "신부 아버지" },
  { bank: "하나은행", num: "123-456789-01234", name: "신부 어머니" },
];

export default function ModernWeddingInvite() {
  const sections = {
    hero: useRef<HTMLDivElement>(null),
    greeting: useRef<HTMLDivElement>(null),
    profiles: useRef<HTMLDivElement>(null),
    calendar: useRef<HTMLDivElement>(null),
    location: useRef<HTMLDivElement>(null),
    story: useRef<HTMLDivElement>(null),
    gallery: useRef<HTMLDivElement>(null),
    weddingday: useRef<HTMLDivElement>(null),
    dday: useRef<HTMLDivElement>(null),
    directions: useRef<HTMLDivElement>(null),
    account: useRef<HTMLDivElement>(null),
  } as const;

  const scrollTo = (el?: HTMLElement | null) => el?.scrollIntoView({ behavior: "smooth", block: "start" });

  /** 카운트다운 */
  const weddingDate = useMemo(() => new Date(WEDDING_DATE), []);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const diff = Math.max(0, weddingDate.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff / 3600000) % 24);
  const minutes = Math.floor((diff / 60000) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  /** 캘린더 생성 */
  const year = weddingDate.getFullYear();
  const month = weddingDate.getMonth();
  const date = weddingDate.getDate();
  const calendar = buildCalendar(year, month);

  /** 갤러리 이미지 (24개) */
  const galleryImages = Array.from({ length: 24 }, (_, i) => `/gallery/photo${i + 1}.jpg`);

  /** 공유 기능 */
  async function share() {
    const data = {
      title: "결혼식에 초대합니다",
      text: `${GROOM.name} ❤️ ${BRIDE.name}의 결혼식에 초대합니다. ${year}년 ${month + 1}월 ${date}일`,
      url: window.location.href
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(data.url);
        alert("링크가 복사되었습니다");
      }
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <div className={`min-h-screen bg-gray-50 pb-24 ${MODERN.base}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-rose-500" />
            <span className="font-semibold text-gray-900">결혼합니다</span>
          </div>
          <nav className="hidden sm:flex items-center gap-2">
            <Pill onClick={() => scrollTo(sections.greeting.current)}>인사말</Pill>
            <Pill onClick={() => scrollTo(sections.calendar.current)}>일정</Pill>
            <Pill onClick={() => scrollTo(sections.location.current)}>오시는길</Pill>
            <Pill onClick={() => scrollTo(sections.gallery.current)}>갤러리</Pill>
          </nav>
        </div>
      </header>

      {/* 1. Hero - 메인 웨딩 사진 */}
      <section ref={sections.hero} className="max-w-4xl mx-auto px-3 sm:px-4 pt-4 sm:pt-8 pb-8 sm:pb-12">
        <figure className="overflow-hidden rounded-2xl sm:rounded-3xl shadow-lg">
          <SmartImage
            src="/cover/main-wedding-photo.jpg"
            alt="Wedding Photo"
            className="w-full h-auto object-cover"
            aspect="3/4"
          />
        </figure>
      </section>

      {/* 2. 초대 메시지 (Text - 결혼안내) */}
      <section ref={sections.greeting} className="max-w-2xl mx-auto px-3 sm:px-4 pb-8 sm:pb-12">
        <Card className="p-6 sm:p-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-serif text-gray-900 mb-4 sm:mb-6">
            소중한 당신을 초대합니다
          </h1>
          <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-gray-700 leading-relaxed">
            <p>
              저희 두 사람이 사랑과 믿음으로<br />
              한 가정을 이루게 되었습니다.
            </p>
            <p>
              여러분을 초대하오니<br />
              오셔서 축복해 주시면<br />
              더없는 기쁨으로 간직하겠습니다.
            </p>
          </div>
        </Card>
      </section>

      {/* 3. 신랑신부 정보 */}
      <section ref={sections.profiles} className="max-w-4xl mx-auto px-3 sm:px-4 pb-8 sm:pb-12">
        <div className="grid md:grid-cols-2 gap-3 sm:gap-6">
          <ProfileCard person={GROOM} role="신랑" />
          <ProfileCard person={BRIDE} role="신부" />
        </div>
      </section>

      {/* 10. D-DAY 카운트다운 */}
      <section ref={sections.dday} className="max-w-3xl mx-auto px-3 sm:px-4 pb-8 sm:pb-12">
        <Card className="p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 text-center mb-6">
            D-Day 타이머
          </h2>
          <div className="flex justify-center gap-2 sm:gap-3">
            <TimeBox label="DAYS" value={days} />
            <TimeBox label="HOURS" value={hours} />
            <TimeBox label="MIN" value={minutes} />
            <TimeBox label="SEC" value={seconds} />
          </div>
        </Card>
      </section>

      {/* 6. 스토리 섹션 1 (Photo + Text - 대칭순서1) */}
      <section ref={sections.story} className="max-w-4xl mx-auto px-3 sm:px-4 pb-8 sm:pb-12">
        <div className="space-y-8 sm:space-y-12">
          {/* 첫 번째 스토리 */}
          <div className="grid md:grid-cols-2 gap-4 sm:gap-8 items-center">
            <figure className="overflow-hidden rounded-xl sm:rounded-2xl">
              <SmartImage
                src="/story/photo1.jpg"
                alt="Story 1"
                className="w-full h-auto object-cover"
                aspect="1/1"
              />
            </figure>
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-xl sm:text-2xl font-serif text-gray-900">첫 만남의 순간</h3>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                어느 봄날, 우리는 운명처럼 만났습니다.<br />
                서로를 알아가며 사랑을 키워왔고,<br />
                이제 평생을 함께하기로 약속합니다.
              </p>
            </div>
          </div>

          {/* 7. 두 번째 스토리 (Photo + Text - 대칭순서2) */}
          <div className="grid md:grid-cols-2 gap-4 sm:gap-8 items-center">
            <div className="space-y-3 sm:space-y-4 md:order-2">
              <h3 className="text-xl sm:text-2xl font-serif text-gray-900">새로운 시작</h3>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                서로의 차이를 이해하고 존중하며,<br />
                함께 웃고 함께 울 수 있는<br />
                따뜻한 가정을 만들어가겠습니다.
              </p>
            </div>
            <figure className="overflow-hidden rounded-xl sm:rounded-2xl md:order-1">
              <SmartImage
                src="/story/photo2.jpg"
                alt="Story 2"
                className="w-full h-auto object-cover"
                aspect="1/1"
              />
            </figure>
          </div>
        </div>
      </section>

      {/* 8. 갤러리 (회전경형 사진) */}
      <section ref={sections.gallery} className="max-w-6xl mx-auto px-3 sm:px-4 pb-8 sm:pb-12">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6 text-center">
          Gallery
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2">
          {galleryImages.map((image, index) => (
            <figure
              key={index}
              className="aspect-square overflow-hidden rounded-md sm:rounded-lg hover:opacity-80 transition cursor-pointer"
            >
              <SmartImage
                src={image}
                alt={`Gallery ${index + 1}`}
                className="w-full h-full object-cover"
                aspect="1/1"
              />
            </figure>
          ))}
        </div>
      </section>

      {/* 9. Wedding Day 상세 정보 */}
      <section ref={sections.weddingday} className="max-w-2xl mx-auto px-3 sm:px-4 pb-8 sm:pb-12">
        <Card className="p-6 sm:p-8 text-center bg-gradient-to-b from-rose-50 to-white">
          <p className="text-xs sm:text-sm text-rose-600 mb-2">WEDDING DAY</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            {year}년 {month + 1}월 {date}일 토요일
          </p>
          <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6">오후 5시</p>

          <div className="border-t border-rose-200 pt-4 sm:pt-6 space-y-1 sm:space-y-2">
            <p className="text-base sm:text-lg font-medium text-gray-900">{VENUE_NAME}</p>
            <p className="text-gray-600 text-xs sm:text-sm">{ADDRESS}</p>
            <p className="text-gray-500 text-xs sm:text-sm">{FLOOR}</p>
          </div>

          {/* 연락처 */}
          <div className="mt-6 pt-6 border-t border-rose-200">
            <div className="flex justify-center gap-4">
              <a
                href={`tel:${TEL_GROOM}`}
                className={`${MODERN.btn} ${MODERN.soft} inline-flex items-center gap-2`}
              >
                <Phone className="h-4 w-4" />
                신랑에게 연락
              </a>
              <a
                href={`tel:${TEL_BRIDE}`}
                className={`${MODERN.btn} ${MODERN.soft} inline-flex items-center gap-2`}
              >
                <Phone className="h-4 w-4" />
                신부에게 연락
              </a>
            </div>
          </div>
        </Card>
      </section>

      {/* 4. 캘린더 (D-DAY 없이) */}
      <section ref={sections.calendar} className="max-w-3xl mx-auto px-3 sm:px-4 pb-8 sm:pb-12">
        <Card className="p-4 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
              Wedding Day
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              {year}년 {month + 1}월 {date}일 토요일 오후 5시
            </p>
          </div>

          {/* 캘린더 */}
          <div className="max-w-md mx-auto">
            <div className="bg-gray-800 text-white rounded-t-2xl py-3 text-center">
              <p className="text-sm font-medium">{year}년 {month + 1}월</p>
            </div>
            <div className="border border-gray-200 rounded-b-2xl overflow-hidden">
              <div className="grid grid-cols-7 text-center text-sm bg-gray-50 py-2 border-b">
                {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                  <div key={day} className="text-gray-600">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 bg-white">
                {calendar.map((cell, i) => {
                  const isWeddingDay = cell.y === year && cell.m === month && cell.d === date;
                  return (
                    <div key={i} className="aspect-square flex items-center justify-center border-b border-r border-gray-100">
                      {cell.d && (
                        <span className={`
                          inline-flex h-10 w-10 items-center justify-center rounded-full
                          ${isWeddingDay ? "bg-rose-500 text-white font-bold" : "text-gray-700"}
                        `}>
                          {cell.d}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 5. 지도 (간단한 위치) */}
      <section ref={sections.location} className="max-w-4xl mx-auto px-3 sm:px-4 pb-8 sm:pb-12">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4 text-center">
          정확한 위치
        </h2>

        <Card className="p-4 sm:p-6">
          <div className="text-center mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-1">{VENUE_NAME}</h3>
            <p className="text-sm sm:text-base text-gray-600">{ADDRESS}</p>
            <p className="text-gray-500 text-xs sm:text-sm">{FLOOR}</p>
          </div>

          {/* 지도 */}
          <div className="bg-gray-200 h-60 sm:h-80 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 flex flex-col items-center justify-center">
            <MapPin className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
            <span className="ml-2 text-sm sm:text-base text-gray-500">지도 API 연동 영역</span>
          </div>

          {/* 길찾기 버튼 */}
          <div className="flex justify-center gap-2 sm:gap-3">
            <a
              href={MAP_LINK_KAKAO}
              target="_blank"
              rel="noopener noreferrer"
              className={`${MODERN.btn} ${MODERN.primary}`}
            >
              카카오맵 길찾기
            </a>
            <a
              href={MAP_LINK_NAVER}
              target="_blank"
              rel="noopener noreferrer"
              className={`${MODERN.btn} ${MODERN.soft}`}
            >
              네이버 길찾기
            </a>
          </div>
        </Card>
      </section>

      

      {/* 11. 오시는 길 상세 (교통수단) */}
      <section ref={sections.directions} className="max-w-4xl mx-auto px-3 sm:px-4 pb-8 sm:pb-12">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6 text-center">
          오시는 길
        </h2>

        <Card className="p-4 sm:p-6">
          {/* 교통 정보 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
            <InfoBox icon="🚇" title="지하철" info="2호선 강남역 3번 출구 도보 5분" />
            <InfoBox icon="🚌" title="버스" info="간선 140, 148, 360, 740" />
            <InfoBox icon="🚗" title="주차" info="건물 내 주차장 2시간 무료" />
          </div>
        </Card>
      </section>

      {/* 12. 마음 전하실 곳 */}
      <section ref={sections.account} className="max-w-3xl mx-auto px-3 sm:px-4 pb-8 sm:pb-12">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6 text-center">
          마음 전하실 곳
        </h2>
        
        {/* 화환 사양 문구 */}
        <div className="text-center mb-6">
          <p className="text-sm sm:text-base text-gray-600 bg-rose-50 rounded-xl py-3 px-4 inline-block">
            🌸 화환은 정중히 사양합니다 🌸
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
          <AccountBoxSelect accounts={ACCOUNTS_GROOM} role="신랑측 계좌" />
          <AccountBoxSelect accounts={ACCOUNTS_BRIDE} role="신부측 계좌" />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 text-center text-gray-500 text-xs sm:text-sm border-t border-gray-200">
        <p>© 2020 Wedding Invitation</p>
        <p className="mt-2">감사합니다 💝</p>
      </footer>

      {/* 하단 액션바 */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex justify-center gap-2 sm:gap-3">
          <ActionButton
            href={`tel:${TEL_GROOM}`}
            icon={<Phone className="h-5 w-5" />}
            label="전화하기"
          />
          <ActionButton
            onClick={share}
            icon={<Share2 className="h-5 w-5" />}
            label="공유하기"
          />
          <ActionButton
            href={MAP_LINK_KAKAO}
            icon={<MapPin className="h-5 w-5" />}
            label="길찾기"
          />
        </div>
      </div>
    </div>
  );
}

/** ===== UI 컴포넌트들 ===== */
function Pill({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`${MODERN.pill} hover:bg-rose-100 transition`}
    >
      {children}
    </button>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${MODERN.card} rounded-2xl ${className}`}>{children}</div>;
}

function TimeBox({ label, value }: { label: string; value: number }) {
  const displayValue = String(value).padStart(2, "0");
  return (
    <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 px-2.5 sm:px-4 py-2 sm:py-3 min-w-[60px] sm:min-w-[70px] text-center">
      <div className="text-xl sm:text-2xl font-bold text-gray-900 tabular-nums">{displayValue}</div>
      <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">{label}</div>
    </div>
  );
}

interface ProfileCardProps {
  person: typeof GROOM;
  role: string;
}

function ProfileCard({ person, role }: ProfileCardProps) {
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
        <figure className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-gray-100">
          <SmartImage
            src={person.photo}
            alt={person.name}
            className="w-full h-full object-cover"
            aspect="1/1"
          />
        </figure>
        <div>
          <p className="text-xs sm:text-sm text-gray-500">{role}</p>
          <p className="text-lg sm:text-xl font-semibold text-gray-900 mt-1">{person.name}</p>
          <p className="text-xs sm:text-sm text-gray-600 mt-1.5 sm:mt-2">
            {person.parents.father} · {person.parents.mother}의 {person.relation}
          </p>
        </div>
        <a
          href={`tel:${person.phone}`}
          className={`${MODERN.btn} ${MODERN.soft} inline-flex items-center gap-2 text-xs sm:text-sm`}
        >
          <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          연락하기
        </a>
      </div>
    </Card>
  );
}

function InfoBox({ icon, title, info }: { icon: string; title: string; info: string }) {
  return (
    <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
      <div className="text-xl sm:text-2xl mb-1.5 sm:mb-2">{icon}</div>
      <p className="text-sm sm:text-base font-medium text-gray-900 mb-1">{title}</p>
      <p className="text-xs sm:text-sm text-gray-600">{info}</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AccountBox({ bank, num, name, role }: { bank: string; num: string; name: string; role: string }) {
  async function copyText() {
    try {
      await navigator.clipboard.writeText(`${bank} ${num} ${name}`);
      alert("계좌번호가 복사되었습니다");
    } catch {
      prompt("계좌번호를 복사하세요", `${bank} ${num} ${name}`);
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">{role}</p>
      <p className="text-sm sm:text-base font-medium text-gray-900">{bank}</p>
      <p className="text-sm sm:text-base text-gray-700 mt-1">{num}</p>
      <p className="text-xs sm:text-sm text-gray-600 mt-1">예금주: {name}</p>
      <button
        onClick={copyText}
        className={`${MODERN.btn} ${MODERN.soft} w-full mt-3 sm:mt-4 text-xs sm:text-sm`}
      >
        계좌번호 복사
      </button>
    </Card>
  );
}

function AccountBoxSelect({ accounts, role }: { accounts: Array<{ bank: string; num: string; name: string }>; role: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = accounts[selectedIndex];

  async function copyText() {
    try {
      await navigator.clipboard.writeText(`${selected.bank} ${selected.num} ${selected.name}`);
      alert("계좌번호가 복사되었습니다");
    } catch {
      prompt("계좌번호를 복사하세요", `${selected.bank} ${selected.num} ${selected.name}`);
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <p className="text-xs sm:text-sm text-gray-500 mb-3">{role}</p>
      
      {/* 드롭다운 */}
      <select 
        value={selectedIndex}
        onChange={(e) => setSelectedIndex(Number(e.target.value))}
        className="w-full mb-3 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
      >
        {accounts.map((account, index) => (
          <option key={index} value={index}>
            {account.name} ({account.bank})
          </option>
        ))}
      </select>

      {/* 선택된 계좌 정보 */}
      <div className="bg-gray-50 rounded-lg p-3 mb-3">
        <p className="text-sm sm:text-base font-medium text-gray-900">{selected.bank}</p>
        <p className="text-sm sm:text-base text-gray-700 mt-1 font-mono">{selected.num}</p>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">예금주: {selected.name}</p>
      </div>

      <button
        onClick={copyText}
        className={`${MODERN.btn} ${MODERN.soft} w-full text-xs sm:text-sm`}
      >
        계좌번호 복사
      </button>
    </Card>
  );
}

function ActionButton({
  href,
  onClick,
  icon,
  label
}: {
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  const className = `${MODERN.btn} ${MODERN.soft} inline-flex items-center justify-center gap-1.5 sm:gap-2 min-w-[90px] sm:min-w-[100px] text-xs sm:text-sm py-2.5 sm:py-2`;

  if (href) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer">
        <span className="hidden sm:inline">{icon}</span>
        <span>{label}</span>
      </a>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      <span className="hidden sm:inline">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function SmartImage({
  src,
  alt,
  className = "",
  aspect = "1/1"
}: {
  src?: string;
  alt: string;
  className?: string;
  aspect?: string;
}) {
  const [, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={{ aspectRatio: aspect }}
      >
        <div className="text-center text-gray-400">
          <User className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2" />
          <p className="text-xs sm:text-sm">이미지 준비중</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ aspectRatio: aspect }}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
    />
  );
}

/** ===== 유틸리티 함수 ===== */
function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  const cells: { y: number; m: number; d: number | null }[] = [];

  // 이전 달의 빈 칸
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push({ y: year, m: month, d: null });
  }

  // 현재 달의 날짜
  for (let d = 1; d <= lastDate; d++) {
    cells.push({ y: year, m: month, d });
  }

  // 다음 달의 빈 칸 (7의 배수 맞추기)
  while (cells.length % 7 !== 0) {
    cells.push({ y: year, m: month, d: null });
  }

  return cells;
}
