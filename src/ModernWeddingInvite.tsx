import React, { useMemo, useRef, useState, useEffect } from "react";
import { Calendar as MapPin, User, ChevronLeft, ChevronRight, X } from "lucide-react";
import { TimeSince } from "./components/TimeSince";
import { Guestbook } from "./components/Guestbook";
import { GuestGallery } from "./components/GuestGallery";
import { HandwritingText } from "./components/Handwritingtext";

/** ===== 디자인 토큰 ===== */
const MODERN = {
  // 기본 스타일
  base: "text-[#171717]",
  card: "bg-white backdrop-blur-sm",
  btn: "rounded-lg px-4 py-2 text-sm font-medium transition",
  primary: "bg-rose-500 text-white hover:bg-rose-600",
  soft: "bg-white hover:bg-gray-50 text-[#171717] backdrop-blur-sm border border-gray-200",
  pill: "rounded-full px-4 py-2 text-sm bg-white text-rose-700 backdrop-blur-sm border border-rose-100",

  // 텍스트 크기 공통 관리
  text: {
    // 제목 크기
    hero: "text-3xl sm:text-5xl",           // 메인 히어로 타이틀
    title: "text-center justify-start text-neutral-900 text-2xl font-normal font-['Gabia_Gosran']",          // 주요 섹션 제목
    subtitle: "text-xl sm:text-2xl",        // 부제목

    // 본문 크기
    body: "text-center justify-start text-neutral-900 text-base font-normal font-['Gabia_Gosran'] leading-6",           // 기본 본문
    bodyLarge: "text-base sm:text-lg",      // 큰 본문

    // 작은 텍스트
    small: "text-xs sm:text-sm",            // 작은 텍스트
    caption: "text-xs",                     // 캡션/힌트

    // 날짜/시간
    date: "text-lg sm:text-3xl",            // 날짜 표시
  }
};

/** ===== 웨딩 정보 ===== */
const WEDDING_DATE = "2026-06-13T14:00:00+09:00"; // 2026년 6월 13일 오후 2시
const VENUE_NAME = "제이오스티엘";
const TEL_GROOM = "010-1234-5678";
const TEL_BRIDE = "010-9876-5432";
const MAP_LINK_KAKAO = "https://map.kakao.com/";
const MAP_LINK_NAVER = "https://map.naver.com/";
const MAP_LINK_TMAP = "https://tmap.life/";

// 신랑신부 정보
const GROOM = {
  name: "병민",
  parents: { father: "김창주", mother: "윤정애" },
  relation: "차남",
  phone: TEL_GROOM,
  photo: "/man.jpg"
};

const BRIDE = {
  name: "혜민",
  parents: { father: "김태식", mother: "최갑숙" },
  relation: "장녀",
  phone: TEL_BRIDE,
  photo: "/woman.jpg"
};

// 계좌 정보
const ACCOUNTS_GROOM = [
  { bank: "카카오뱅크", num: "3333-12-3456789", name: "병민" },
  { bank: "신한은행", num: "110-123-456789", name: "신랑 아버지" },
  { bank: "우리은행", num: "1002-123-456789", name: "신랑 어머니" },
];

const ACCOUNTS_BRIDE = [
  { bank: "토스뱅크", num: "1000-22-334455", name: "혜민" },
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
    guestbook: useRef<HTMLDivElement>(null),
    guestGallery: useRef<HTMLDivElement>(null),
  } as const;

  /** 카운트다운 */
  const weddingDate = useMemo(() => new Date(WEDDING_DATE), []);

  /** 캘린더 생성 */
  const year = weddingDate.getFullYear();
  const month = weddingDate.getMonth();
  const date = weddingDate.getDate();
  const calendar = buildCalendar(year, month);

  /** 갤러리 이미지 (24개) */
  const galleryImages = Array.from({ length: 24 }, (_, i) => `/gallery/gallery${i + 1}.jpg`);

  /** 갤러리 모달 상태 */
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  /** 갤러리 더보기 상태 */
  const [showAllGallery, setShowAllGallery] = useState(false);
  const INITIAL_GALLERY_COUNT = 9; // 처음에 보여줄 이미지 개수

  // 모바일 체크 함수
  const isMobile = () => window.innerWidth < 768;

  const openModal = (index: number) => {
    // 모바일에서는 모달을 열지 않음
    if (!isMobile()) {
      setSelectedImageIndex(index);
    }
  };
  const closeModal = () => setSelectedImageIndex(null);
  const goToPrevious = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((selectedImageIndex - 1 + galleryImages.length) % galleryImages.length);
    }
  };
  const goToNext = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((selectedImageIndex + 1) % galleryImages.length);
    }
  };

  // 복사-붙여넣기 방지
  useEffect(() => {
    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    const preventCut = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    const preventPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('copy', preventCopy);
    document.addEventListener('cut', preventCut);
    document.addEventListener('paste', preventPaste);
    document.addEventListener('contextmenu', preventContextMenu);

    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('cut', preventCut);
      document.removeEventListener('paste', preventPaste);
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  }, []);

  return (
    <div className={`min-h-screen bg-white overflow-visible`}>
      {/* 메인 컨테이너 - 모바일 폭으로 제한 */}
      <div className="overflow-visible">
        <div className={`${MODERN.base} overflow-visible`}>
          {/* Hero - 메인 웨딩 사진 */}
          <section ref={sections.hero} className="overflow-visible mb-16 sm:mb-20">
            <figure className="h-screen relative overflow-visible">
              {/* 메인 이미지 */}
              <SmartImage
                src="/main.png"
                alt="Wedding Photo"
                className="w-full h-full object-cover"
                aspect=""
              />

              {/* 하단 필기체 텍스트 - 손글씨 효과 */}
              <div
                className="absolute left-0 right-0 flex justify-center z-10 px-1"
                style={{
                  transform: "rotate(-14deg)",
                  bottom: "420px",
                }}
              >
                <div className="w-[400px] sm:w-[420px] text-left">
                  <HandwritingText
                    text={`We getting\nmarried!`}
                    fontUrl="/fonts/Quentin.ttf"
                    fontSize={64}
                    lineHeight={79.78 / 64}
                    align="right"
                    color="#ffffff"

                    duration={2.0}        // 전체 애니메이션 2초
                    delay={0.5}           // 0.5초 후 시작

                    shadow="0px 4px 5px rgba(0, 0, 0, 1)"
                  />
                </div>
              </div>
            </figure>
          </section>

          {/* 초대 메시지 */}
          <section ref={sections.greeting}>
            <EllipseBadge text="INVITATION" />
            <br />
            <br />
            <h1 className={`${MODERN.text.title} font-serif text-[#171717] mb-4 sm:mb-6`}>
              소중한 분들을 모십니다
            </h1>
            <br />
            {/* <div className={`space-y-3 sm:space-y-4 ${MODERN.text.body} text-[#171717] leading-relaxed`}>
                <p>
                  어릴 적 스치듯 지나가던 작은 인사가<br />
                  긴 시간의 여백을 건너<br />
                  서로의 마음으로 단단히 자리하였습니다.<br />
                  이제 저희 두 사람이<br />
                  담담히 한 길을 약속하고자 합니다.
                </p>
                <p>
                  그동안 보내 주신 <br />
                  응원과 정을 깊이 기억하며,<br />
                  이날 오셔서 기꺼이 내어 주신 귀한 걸음으로<br />
                  따뜻한 축복을 보태 주신다면<br />
                  저희에게 더없는 기쁨과 큰 힘이 될 것입니다.
                </p>
              </div> */}
            <div className="text-center justify-start text-neutral-900 text-base font-normal font-['Gabia_Gosran'] leading-6">어릴 적 지나가던 작은 인사가<br />긴 시간의 여백을 건너<br />서로의 마음으로 단단히 자리하였습니다.<br />이제 저희 두 사람이<br />담담히 한 길을 약속하고자 합니다.<br /><br />그동안 보내주신<br />응원과 정을 깊이 기억하며,<br />이날 오셔서 기꺼이 내어주신 귀한 발걸음으로<br />따뜻한 축복을 보태 주신다면<br />저희에게 더없는 기쁨과 큰 힘이 될 것입니다.</div>
          </section>

          {/* 신랑신부 정보 */}
          <section ref={sections.profiles} className="relative mt-20">
            <div className="grid grid-cols-2 gap-2">
              <ProfileCard person={GROOM} role="신랑" />
              <ProfileCard person={BRIDE} role="신부" />
            </div>
            {/* 중앙 하트 */}
            <div className="w-16 h-16 absolute top-29 left-1/2 transform -translate-x-1/2 z-10">
              <div className="">
                <img
                  src="/heart.svg"
                  alt="heart"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </section>

          <div className="mt-18">
            <EllipseBadge text="OUR TIME" />
            <br />
            <div className="text-center">
              <p className={`${MODERN.text.bodyLarge} text-black-600 mb-2`}>
                {GROOM.name}과 {BRIDE.name}이 함께한지
              </p>
              <div className="flex items-center justify-center">
                <div className="text-zinc-300 text-5xl font-normal font-['Ghanachocolate'] -mr-3">&ldquo;</div>
                <TimeSince
                  startDate="2020-03-21T00:00:00+09:00"
                  className="font-hamchorong font-bold text-2xl md:text-3xl text-[#171717]"
                />
                <div className="text-zinc-300 text-5xl font-normal font-['Ghanachocolate'] -ml-3">&rdquo;</div>
              </div>
            </div>
          </div>

          {/* 스토리 섹션 */}
          <section ref={sections.story} className="pt-15">
            <div className="text-center justify-start text-blue-500 text-5xl font-normal font-['Cafe24_Oneprettynight']">저희 결혼해요!</div>
            <div className="w-full">
              <img
                src="/story1.png"
                alt="Our Story"
                className="w-full h-auto"
              />
              <img
                src="/story2.png"
                alt="Our Story"
                className="w-full h-auto"
              />
              <img
                src="/story3.png"
                alt="Our Story"
                className="w-full h-auto"
              />
            </div>
          </section>

          {/* 갤러리 */}
          <EllipseBadge text="GALLERY" />
          <br />
          <section ref={sections.gallery} className="max-w-6xl mx-auto px-3 sm:px-4 pb-8 sm:pb-12">
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2">
              {(showAllGallery ? galleryImages : galleryImages.slice(0, INITIAL_GALLERY_COUNT)).map((image, index) => (
                <figure
                  key={index}
                  onClick={() => openModal(index)}
                  className="aspect-square overflow-hidden hover:opacity-80 transition cursor-pointer"
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

            {/* 더보기 / 접기 버튼 */}
            {galleryImages.length > INITIAL_GALLERY_COUNT && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setShowAllGallery(!showAllGallery)}
                  className={`${MODERN.text.body} font-bold text-[#171717] flex items-center gap-1 hover:opacity-70 transition`}
                >
                  <span>{showAllGallery ? '▲ 접기' : '▼ 더보기'}</span>
                </button>
              </div>
            )}
          </section>

          {/* 갤러리 모달 - 데스크톱에서만 표시 */}
          {selectedImageIndex !== null && !isMobile() && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-70 backdrop-blur-sm"
              onClick={closeModal}
            >
              {/* 닫기 버튼 */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 text-black hover:text-gray-300 transition z-50"
              >
                <X className="w-8 h-8" />
              </button>

              {/* 이전 버튼 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                className="absolute left-4 text-black hover:text-gray-300 transition z-50"
              >
                <ChevronLeft className="w-10 h-10" />
              </button>

              {/* 이미지 */}
              <div
                className="max-w-4xl max-h-[90vh] relative"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={galleryImages[selectedImageIndex]}
                  alt={`Gallery ${selectedImageIndex + 1}`}
                  className="max-w-full max-h-[90vh] object-contain"
                />

                {/* 이미지 카운터 */}
                <div className={`absolute left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full ${MODERN.text.small}`}>
                  {selectedImageIndex + 1} / {galleryImages.length}
                </div>
              </div>

              {/* 다음 버튼 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-4 text-black hover:text-gray-300 transition z-50"
              >
                <ChevronRight className="w-10 h-10" />
              </button>
            </div>
          )}

          {/* 캘린더 & D-DAY */}
          <section ref={sections.calendar} className="max-w-3xl mx-auto px-3 sm:px-4 pb-8 sm:pb-12">
            <Card className="p-4 sm:p-8">
              <div className="text-center mb-6 sm:mb-8">
                <EllipseBadge text="WEDDING DAY" />
                <br />
                <p className={`${MODERN.text.body} text-[#171717] font-bold`}>
                  {year}년 {month + 1}월 {date}일 토요일 오후 2시<br />
                  {VENUE_NAME}
                </p>
              </div>
              {/* 캘린더 */}
              <div className="max-w-md mx-auto">
                <div className="bg-white backdrop-blur-sm rounded-b-2xl overflow-hidden">
                  <div className="grid grid-cols-7 text-center py-2">
                    {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                      <div key={index} className={`font-bold ${index === 0 ? "text-red-500" : "text-gray-600"}`}>
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 bg-white">
                    {calendar.map((cell, i) => {
                      const isWeddingDay = cell.y === year && cell.m === month && cell.d === date;
                      const isSunday = cell.d && new Date(cell.y, cell.m, cell.d).getDay() === 0;

                      return (
                        <div key={i} className="aspect-square flex items-center justify-center">
                          {cell.d && (
                            <span className={`
                                              inline-flex h-10 w-10 items-center justify-center rounded-full
                                              ${isWeddingDay ? "bg-rose-500 text-white font-bold" :
                                isSunday ? "text-red-500 font-bold" : "text-[#171717]"}
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

          {/* 오시는 길 상세 (교통수단) */}
          <section ref={sections.directions} className="max-w-5xl mx-auto px-3 sm:px-4 pb-8 sm:pb-12">
            <h2 className={`${MODERN.text.subtitle} font-semibold text-[#171717] mb-4 sm:mb-6 text-center`}>
              오시는 길
            </h2>
            {/* 지도 + 네비 버튼 (붙어있는 형태) */}
            <div className="mb-4 sm:mb-6 overflow-hidden shadow-lg">
              {/* 지도 */}
              <div className="bg-gradient-to-br from-gray-100 to-gray-50 h-60 sm:h-80 flex flex-col items-center justify-center">
                <MapPin className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
                <span className={`ml-2 ${MODERN.text.body} text-gray-500`}>지도 API 연동 영역</span>
              </div>

              {/* 네비게이션 버튼 3개 */}
              <div className="grid grid-cols-3 bg-black">
                <a href={MAP_LINK_NAVER} target="_blank" rel="noopener noreferrer" className={`py-3 sm:py-4 text-center text-white ${MODERN.text.small} font-bold hover:bg-gray-800 transition border-r border-gray-700`}>
                  네이버지도 내비
                </a>
                <a href={MAP_LINK_KAKAO} target="_blank" rel="noopener noreferrer" className={`py-3 sm:py-4 text-center text-white ${MODERN.text.small} font-bold hover:bg-gray-800 transition border-r border-gray-700`}>
                  카카오맵 내비
                </a>
                <a href={MAP_LINK_TMAP} target="_blank" rel="noopener noreferrer" className={`py-3 sm:py-4 text-center text-white ${MODERN.text.small} font-bold hover:bg-gray-800 transition`}>
                  T맵 내비
                </a>
              </div>
            </div>
            <Card className="p-4 sm:p-6">
              {/* 교통 정보 */}
              <div className={`grid grid-cols-1 sm:grid-cols-1 gap-3 sm:gap-4 ${MODERN.text.small}`}>
                <InfoBox icon="🚗" title="자가용 & 주차" info="구로공구상가 주차장 검색\n최대5시간 무료 주차" />
                <InfoBox icon="🚇" title="지하철" info="1호선 구로역 1번 출구 하차\n출구 나와서 우측 신호등 건너서 도보 1분" />
                <InfoBox icon="🚌" title="안강 셔틀버스" info="한동아파트 앞 버스정류장에서 오전 8시까지 탑승\n* 오후 4시에 서울에서 출발합니다" />
              </div>
            </Card>
          </section>

          {/* 마음 전하실 곳 */}
          <section ref={sections.account} className="max-w-3xl mx-auto px-3 sm:px-4 pb-8 sm:pb-12">
            <Card className="p-6 sm:p-8 text-center">
              <EllipseBadge text="INFORMATION" />
              <br />
              <h2 className={`${MODERN.text.subtitle} font-semibold text-[#171717] mb-4 sm:mb-6 text-center`}>
                마음 전하실 곳
              </h2>

              <div className={`space-y-3 sm:space-y-4 ${MODERN.text.body} text-[#171717] leading-relaxed`}>
                <p>
                  직접 축하를 전해주시기 어려운 분들을 위해<br />
                  아래에 계좌 안내를 드립니다<br />
                  <br />
                  따뜻한 마음만으로도 큰 축복이 됩니다.<br />
                  <br />
                </p>
                <p>
                  환경을 위하여 화환·꽃바구니는 받지 않습니다.<br />
                  귀한 마음은 축복으로 전해 주시면 감사하겠습니다.<br />
                </p>
              </div>
            </Card>

            <div className="grid sm:grid-cols-2 gap-2 mt-4">
              <AccountAccordion accounts={ACCOUNTS_GROOM} role="신랑측" bgColor="bg-sky-50" textColor="text-sky-700" />
              <AccountAccordion accounts={ACCOUNTS_BRIDE} role="신부측" bgColor="bg-rose-50" textColor="text-rose-700" />
            </div>
          </section>

          {/* 방명록 섹션 */}
          <section ref={sections.guestbook} className="max-w-3xl mx-auto px-3 sm:px-4 pb-8 sm:pb-12">
            <Guestbook />
          </section>

          {/* 하객 갤러리 섹션 */}
          <section ref={sections.guestGallery} className="max-w-3xl mx-auto px-3 sm:px-4 pb-8 sm:pb-12">
            <GuestGallery />
          </section>
        </div>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${MODERN.card} ${className}`}>{children}</div>;
}

interface ProfileCardProps {
  person: typeof GROOM;
  role: string;
}

function ProfileCard({ person, role }: ProfileCardProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-2">
      <figure className="w-42 h-42 rounded-full overflow-hidden">
        <SmartImage
          src={person.photo}
          alt={person.name}
          className="w-full h-full object-cover"
          aspect="1/1"
        />
      </figure>
      <div>
        <p className={`${MODERN.text.small} text-center justify-start text-neutral-900 text-base font-normal font-['Gabia_Gosran'] leading-6 mt-1.5`}>
          {person.name === "병민" ? <img src="/flower.svg" alt="heart" className="inline w-4 h-4 mx-1" /> : ''}{person.parents.father} · {person.parents.mother} 의 {person.relation}
        </p>
        <div className="flex items-center justify-center gap-1">
          <p className={`${MODERN.text.small} text-neutral-900 text-base font-normal font-['Gabia_Gosran']`}>{role}</p>
          <p className={`${MODERN.text.bodyLarge} text-neutral-900 text-xl font-normal font-['Gabia_Gosran']`}>{person.name}</p>
        </div>
      </div>
    </div>
  );
}

interface BadgeProps {
  text: string;
  className?: string;
}

const EllipseBadge: React.FC<BadgeProps> = ({ text }) => {
  return (
    <div className="flex justify-center">
      <svg width="124" height="30" viewBox="0 0 124 30">
        <ellipse cx="62" cy="15" rx="62" ry="15" fill="black" />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="white"
          fontSize="14"
          fontWeight="700"
          fontFamily="SUITE"
        // letterSpacing="2"
        >
          {text}
        </text>
        {/* <div style={{textAlign: 'center', color: 'white', fontSize: 14, fontFamily: 'SUITE', fontWeight: '700', wordWrap: 'break-word'}}>INVITAION</div> */}
      </svg>
    </div>
  );
};

function InfoBox({ title, info }: { icon: string; title: string; info: string }) {
  return (
    <div className="bg-white backdrop-blur-sm rounded-lg sm:rounded-xl text-left">
      <p className={`${MODERN.text.body} font-bold text-[#171717] mb-1`}>{title}</p>
      <div className={`${MODERN.text.small} text-gray-600 whitespace-pre-line`}>
        {info.split('\\n').map((line, index) => (
          <span key={index}>
            {line}
            {index < info.split('\\n').length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  );
}

function AccountAccordion({ accounts, role, bgColor = "bg-rose-50", textColor = "text-rose-700" }: {
  accounts: Array<{ bank: string; num: string; name: string }>;
  role: string;
  bgColor?: string;
  textColor?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // 복사 실패 시 fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg">
      {/* 아코디언 헤더 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 ${bgColor} ${textColor} ${MODERN.text.body} font-medium flex items-center justify-between transition-all hover:opacity-80`}
      >
        <span>{role}</span>
        <svg
          className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 아코디언 콘텐츠 */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-white border-x border-b border-gray-100">
          {accounts.map((account, index) => (
            <div key={index} className="px-4 py-3 border-b border-gray-50 last:border-b-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${MODERN.text.small} text-gray-500`}>{account.bank}</p>
                  <p className={`${MODERN.text.body} text-[#171717] font-medium`}>{account.num}</p>
                  <p className={`${MODERN.text.small} text-gray-600`}>{account.name}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(account.num, index)}
                  className={`px-3 py-1.5 ${MODERN.text.small} rounded-md border transition-all ${copiedIndex === index
                    ? 'bg-green-50 border-green-300 text-green-600'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {copiedIndex === index ? '복사됨' : '복사'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
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
        className={`flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 ${className}`}
        style={{ aspectRatio: aspect }}
      >
        <div className="text-center text-gray-400">
          <User className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2" />
          <p className={MODERN.text.small}>이미지 준비중</p>
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