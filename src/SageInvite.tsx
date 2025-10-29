import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalIcon, MapPin, Phone, Share2, Copy, Heart, Music2, Upload } from "lucide-react";

/** ===== 토큰 ===== */
const SAGE = {
  base: "text-zinc-800",
  card: "bg-white border border-[#eceee9] shadow-[0_1px_0_rgba(0,0,0,0.03)]",
  btn: "rounded-xl px-4 py-2 text-sm font-medium transition",
  green: "bg-[#58745a] text-white hover:bg-[#4f6a51]",
  soft: "bg-zinc-100 hover:bg-zinc-200",
  pill: "rounded-full px-3 py-1.5 text-sm bg-[#eaf0e7] text-[#3c4d3c]",
};

/** ===== 고정값 ===== */
const WEDDING_DATE = "2026-06-13T14:00:00+09:00";
const VENUE_NAME = "제이오스티엘";
const ADDRESS = "서울 ○○구 ○○로 00, 제이오스티엘";
const TEL_GROOM = "010-0000-0000";
const TEL_BRIDE = "010-0000-0000";
const MAP_LINK_KAKAO = "https://map.kakao.com/?sName=&eName=%EC%A0%9C%EC%9D%B4%EC%98%A4%EC%8A%A4%ED%8B%B0%EC%97%98";
const MAP_LINK_NAVER = "https://map.naver.com/p/search/%EC%A0%9C%EC%9D%B4%EC%98%A4%EC%8A%A4%ED%8B%B0%EC%97%98";
const ACCOUNT_GROOM = { bank: "카카오뱅크", num: "3333-12-3456789", name: "김병민" };
const ACCOUNT_BRIDE = { bank: "토스뱅크", num: "1000-22-334455", name: "김혜민" };

export default function SageInvite() {
  /** 종이 텍스처: 파일이 없으면 data-URI 폴백을 주입 */
  useEffect(() => {
    const prefersUrl = "/bg/paper-bright.svg";
    const testImg = new Image();
    testImg.onload = () => document.documentElement.style.setProperty("--paper-url", `url("${prefersUrl}")`);
    testImg.onerror = () => {
      const svg = encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'>
           <filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/>
             <feColorMatrix type='saturate' values='0'/></filter>
           <rect width='100%' height='100%' fill='#fdfcf9'/>
           <rect width='100%' height='100%' filter='url(%23n)' fill='rgba(0,0,0,0.035)'/>
         </svg>`
      );
      document.documentElement.style.setProperty("--paper-url", `url("data:image/svg+xml,${svg}")`);
    };
    testImg.src = prefersUrl;
  }, []);

  const sections = {
    hero: useRef<HTMLDivElement>(null),
    greet: useRef<HTMLDivElement>(null),
    profiles: useRef<HTMLDivElement>(null),
    calendar: useRef<HTMLDivElement>(null),
    schedule: useRef<HTMLDivElement>(null),
    studio: useRef<HTMLDivElement>(null),
    account: useRef<HTMLDivElement>(null),
    info: useRef<HTMLDivElement>(null),
    map: useRef<HTMLDivElement>(null),
    guestbook: useRef<HTMLDivElement>(null),
    gallery: useRef<HTMLDivElement>(null),
  } as const;

  const scrollTo = (el?: HTMLElement | null) => el?.scrollIntoView({ behavior: "smooth", block: "start" });

  /** 카운트다운/캘린더 */
  const weddingDate = useMemo(() => new Date(WEDDING_DATE), []);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const diff = Math.max(0, weddingDate.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff / 3600000) % 24);
  const minutes = Math.floor((diff / 60000) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  const y = weddingDate.getFullYear();
  const m = weddingDate.getMonth();
  const d = weddingDate.getDate();
  const cal = buildCalendar(y, m);

  /** BGM */
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  /** 방명록 */
  type Note = { id: string; name: string; message: string; createdAt: number };
  const [notes, setNotes] = useState<Note[]>(() => {
    try { return JSON.parse(localStorage.getItem("sage.notes") || "[]"); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem("sage.notes", JSON.stringify(notes)); }, [notes]);
  const [noteName, setNoteName] = useState(""); const [noteMsg, setNoteMsg] = useState("");
  const addNote = () => {
    if (!noteMsg.trim()) return;
    const n: Note = { id: crypto.randomUUID(), name: (noteName || "게스트").trim(), message: noteMsg.trim(), createdAt: Date.now() };
    setNotes(p => [n, ...p]); setNoteMsg("");
  };
  const delNote = (id: string) => setNotes(p => p.filter(x => x.id !== id));

  /** 업로드 갤러리 */
  type Photo = { id: string; dataUrl: string; name: string; createdAt: number };
  const [images, setImages] = useState<Photo[]>(() => {
    try { return JSON.parse(localStorage.getItem("sage.photos") || "[]"); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem("sage.photos", JSON.stringify(images)); }, [images]);
  const [uploader, setUploader] = useState("");
  const onPickFiles: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = Array.from(e.target.files ?? []); if (!files.length) return;
    const urls = await Promise.all(files.map(f => new Promise<string>((res, rej) => {
      const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(f);
    })));
    const batch: Photo[] = urls.map(u => ({ id: crypto.randomUUID(), dataUrl: u, name: uploader || "게스트", createdAt: Date.now() }));
    setImages(p => [...batch, ...p]); e.currentTarget.value = "";
  };

  /** 공유 */
  async function share() {
    const data = { title: "혜민 ❤️ 병민 결혼식", text: `2026년 6월 13일(토) 14:00 ${VENUE_NAME}에서 함께해 주세요.`, url: window.location.href };
    try { if (navigator.share) await navigator.share(data); else await navigator.clipboard.writeText(data.url); } catch { /* empty */ }
  }

  return (
    <div className={`min-h-screen paper-sage ${SAGE.base}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#e7ebe3] bg-[color:var(--sage-bg)/.85] backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#5f745f] text-white"><Heart className="h-5 w-5" /></span>
            <span className="font-semibold text-[#3f4f3f]">혜민 &nbsp;❤️&nbsp; 병민</span>
          </div>
          <nav className="hidden sm:flex items-center gap-2">
            <Pill onClick={() => scrollTo(sections.greet.current)}>인사</Pill>
            <Pill onClick={() => scrollTo(sections.calendar.current)}>D-DAY</Pill>
            <Pill onClick={() => scrollTo(sections.schedule.current)}>일정</Pill>
            <Pill onClick={() => scrollTo(sections.map.current)}>오시는길</Pill>
            <Pill onClick={() => scrollTo(sections.account.current)}>마음전하기</Pill>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section ref={sections.hero} className="max-w-3xl mx-auto px-4 pt-6 pb-8">
        <figure className={`overflow-hidden rounded-[26px] ${SAGE.card}`}>
          <SmartImage src="/cover/hero.jpg" alt="커버" className="w-full h-auto object-cover" aspect="3/4" />
        </figure>
      </section>

      {/* 인사말 */}
      <section ref={sections.greet} className="max-w-3xl mx-auto px-4 pb-10">
        <Card className="text-center p-8">
          <p className="text-sm tracking-[0.18em] text-[#3f4f3f]">WE ARE GETTING MARRIED</p>
          <h1 className="mt-2 text-3xl font-serif text-[#2f3a2f]">소중한 당신을 초대합니다</h1>
          <p className="mt-4 leading-relaxed text-zinc-700">
            2026년 6월 13일 토요일 오후 2시, {VENUE_NAME}에서
            <br />두 사람이 한마음으로 새로운 시작을 약속합니다.
            <br />따뜻한 축복으로 함께해 주세요.
          </p>
        </Card>
      </section>

      {/* 신랑/신부 */}
      <section ref={sections.profiles} className="max-w-3xl mx-auto px-4 pb-10">
        <div className="grid sm:grid-cols-2 gap-3">
          <ProfileCard name="김병민" role="신랑" sub="첫째 아들" img="/profiles/groom.jpg" phone={TEL_GROOM} />
          <ProfileCard name="김혜민" role="신부" sub="막내 딸" img="/profiles/bride.jpg" phone={TEL_BRIDE} />
        </div>
      </section>

      {/* D-DAY / 캘린더 */}
      <section ref={sections.calendar} className="max-w-3xl mx-auto px-4 pb-10">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#2f3a2f]">우리의 D-DAY</h2>
              <p className="text-sm text-zinc-600">{y}년 {m + 1}월 {d}일 (토) 오후 2시</p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <TimeBox label="DAYS" value={days} />
              <TimeBox label="HRS" value={hours} />
              <TimeBox label="MIN" value={minutes} />
              <TimeBox label="SEC" value={seconds} />
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-[#e7ebe3]">
            <div className="grid grid-cols-7 text-center text-sm bg-[#eef2ec] text-[#3f4f3f] py-2">
              {["일", "월", "화", "수", "목", "금", "토"].map((w) => <div key={w}>{w}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px bg-[#e7ebe3]">
              {cal.map((cell, i) => {
                const isTarget = cell.y === y && cell.m === m && cell.d === d;
                return (
                  <div key={i} className="bg-white h-12 flex items-center justify-center">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${isTarget ? "bg-[#5f745f] text-white" : "text-zinc-700"}`}>
                      {cell.d || ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </section>

      {/* 일정 */}
      <section ref={sections.schedule} className="max-w-3xl mx-auto px-4 pb-10">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-[#2f3a2f]">예식 일정</h2>
          <ul className="mt-4 grid sm:grid-cols-3 gap-3">
            <Step when="13:30" title="식전 리셉션" desc="포토타임 & 안내" />
            <Step when="14:00" title="예식" desc="사회자 진행 및 서약" />
            <Step when="15:00" title="피로연" desc="가벼운 다과 및 인사" />
          </ul>
        </Card>
      </section>

      {/* 스튜디오 컷 */}
      <section ref={sections.studio} className="max-w-3xl mx-auto px-4 pb-10">
        <div className="grid gap-3">
          <figure className={SAGE.card + " rounded-2xl overflow-hidden"}>
            <SmartImage src="/studio/01.jpg" alt="studio-01" className="w-full h-auto object-cover" aspect="3/2" />
          </figure>
          <div className="grid grid-cols-3 gap-3">
            {["/studio/02.jpg", "/studio/03.jpg", "/studio/04.jpg"].map((src) => (
              <figure key={src} className={SAGE.card + " rounded-2xl overflow-hidden"}>
                <SmartImage src={src} alt={src} className="w-full h-auto object-cover" aspect="1/1" />
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 마음 전하실 곳 */}
      <section ref={sections.account} className="max-w-3xl mx-auto px-4 pb-10">
        <h2 className="text-xl font-semibold text-[#2f3a2f] mb-3">마음 전하실 곳</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <AccountBox {...ACCOUNT_GROOM} />
          <AccountBox {...ACCOUNT_BRIDE} />
        </div>
      </section>

      {/* 예식 안내 */}
      <section ref={sections.info} className="max-w-3xl mx-auto px-4 pb-10">
        <Card className="p-6">
          <div className="flex items-center gap-2"><CalIcon className="h-5 w-5 text-[#5f745f]" /><h3 className="font-semibold text-[#2f3a2f]">예식 안내</h3></div>
          <ul className="mt-3 text-sm text-zinc-700 space-y-1">
            <li>• 일시: 2026년 6월 13일(토) 오후 2시</li>
            <li>• 장소: {VENUE_NAME}</li>
            <li>• 주차: 건물 내 2시간 무료</li>
            <li>• 드레스코드: 자유로운 세미포멀</li>
          </ul>
        </Card>
      </section>

      {/* 오시는 길 */}
      <section ref={sections.map} className="max-w-3xl mx-auto px-4 pb-10">
        <h2 className="text-xl font-semibold text-[#2f3a2f]">오시는 길</h2>
        <p className="text-sm text-zinc-600">{ADDRESS}</p>
        <div className="mt-3 grid md:grid-cols-2 gap-3">
          <div className={SAGE.card + " rounded-2xl overflow-hidden"}>
            <iframe title="map" className="w-full h-[280px]" src={MAP_LINK_KAKAO} loading="lazy" />
          </div>
          <Card className="p-4">
            <InfoLine label="장소" value={VENUE_NAME} />
            <InfoLine label="주소" value={ADDRESS} />
            <div className="mt-3 flex flex-wrap gap-2">
              <a className={`${SAGE.btn} ${SAGE.green}`} href={MAP_LINK_KAKAO} target="_blank">카카오 길찾기</a>
              <a className={`${SAGE.btn} ${SAGE.soft}`} href={MAP_LINK_NAVER} target="_blank">네이버 길찾기</a>
            </div>
          </Card>
        </div>
      </section>

      {/* 방명록 */}
      <section ref={sections.guestbook} className="max-w-3xl mx-auto px-4 pb-10">
        <h2 className="text-xl font-semibold text-[#2f3a2f]">방명록</h2>
        <Card className="p-4 mt-2">
          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-start">
            <div className="flex flex-col gap-2">
              <input className="h-10 rounded-lg border border-[#e7ebe3] px-3 text-sm" placeholder="이름(선택)" value={noteName} onChange={(e) => setNoteName(e.target.value)} />
              <textarea className="min-h-[90px] rounded-lg border border-[#e7ebe3] p-3 text-sm" placeholder="축하 메시지를 남겨주세요" value={noteMsg} onChange={(e) => setNoteMsg(e.target.value)} />
            </div>
            <button onClick={addNote} className={`${SAGE.btn} ${SAGE.green} h-10`}>등록</button>
          </div>
        </Card>

        {notes.length === 0 ? (
          <p className="text-center text-zinc-500 mt-6">아직 메시지가 없어요. 첫 축하를 남겨주세요! 🎉</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {notes.map((n) => (
              <li key={n.id} className={SAGE.card + " rounded-2xl p-4"}>
                <div className="flex items-center justify-between">
                  <b className="text-zinc-900">{n.name}</b>
                  <span className="text-xs text-zinc-500">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-700 whitespace-pre-wrap break-words">{n.message}</p>
                <div className="mt-2 text-right">
                  <button onClick={() => delNote(n.id)} className="text-xs px-2 py-1 rounded bg-zinc-100">삭제</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 갤러리 */}
      <section ref={sections.gallery} className="max-w-3xl mx-auto px-4 pb-24">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-xl font-semibold text-[#2f3a2f]">사진 갤러리</h2>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <input className="h-10 flex-1 min-w-0 rounded-lg border border-[#e7ebe3] px-3 text-sm" placeholder="올린 사람 이름" value={uploader} onChange={(e) => setUploader(e.target.value)} />
            <label className={`${SAGE.btn} ${SAGE.green} h-10 cursor-pointer flex items-center gap-1`}>
              <Upload className="h-4 w-4" />
              업로드
              <input type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles} />
            </label>
          </div>
        </div>

        {images.length === 0 ? (
          <p className="text-center text-zinc-500 mt-6">아직 사진이 없어요.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((p) => (
              <figure key={p.id} className={SAGE.card + " rounded-2xl overflow-hidden relative aspect-square"}>
                <img src={p.dataUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-black/40 text-white text-xs px-2 py-1 flex justify-between">
                  <span className="truncate">{p.name}</span>
                  <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                </figcaption>
                <button onClick={() => setImages(prev => prev.filter(x => x.id !== p.id))} className="absolute top-2 right-2 text-[11px] px-2 py-1 rounded bg-black/60 text-white">삭제</button>
              </figure>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e7ebe3] bg-[color:var(--sage-bg)/.85]">
        <div className="max-w-3xl mx-auto px-4 py-10 text-center text-sm text-zinc-600">소중한 발걸음에 감사드립니다. 안전하게 오세요 💐</div>
      </footer>

      {/* BGM */}
      <audio ref={audioRef} src="/bgm.mp3" loop hidden />
      <div className="fixed right-4 bottom-24 z-40">
        <div className={SAGE.card + " rounded-2xl px-3 py-2 flex items-center gap-2 bg-white/90 backdrop-blur"}>
          <button
            onClick={async () => {
              const a = audioRef.current; if (!a) return;
              if (!playing) { try { await a.play(); setPlaying(true); } catch { /* empty */ } }
              else { a.pause(); setPlaying(false); }
            }}
            className={`${SAGE.btn} ${SAGE.green} h-8`} aria-label={playing ? "Pause" : "Play"}
          >
            <Music2 className="h-4 w-4" />
          </button>
          <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-24 accent-[#5f745f]" />
        </div>
      </div>

      {/* 하단 액션바 */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-[color:var(--sage-bg)/.85] backdrop-blur border-t border-[#e7ebe3]">
        <div className="max-w-3xl mx-auto px-4 py-2 grid grid-cols-3 gap-2">
          <Action href={`tel:${TEL_GROOM}`} icon={<Phone className="h-5 w-5" />}>전화</Action>
          <Action onClick={share} icon={<Share2 className="h-5 w-5" />}>공유</Action>
          <Action href={MAP_LINK_KAKAO} icon={<MapPin className="h-5 w-5" />}>길찾기</Action>
        </div>
      </div>
    </div>
  );
}

/** ===== UI bits ===== */
function Pill({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className={`${SAGE.pill} hover:bg-[#dde6d9]`}>{children}</button>;
}
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${SAGE.card} rounded-2xl ${className}`}>{children}</div>;
}
function TimeBox({ label, value }: { label: string; value: number }) {
  const v = String(value).padStart(2, "0");
  return (
    <div className="min-w-14 rounded-xl bg-white border border-[#e7ebe3] px-3 py-2 text-center">
      <div className="text-xl font-bold tabular-nums text-[#2f3a2f]">{v}</div>
      <div className="text-[10px] text-zinc-500">{label}</div>
    </div>
  );
}
function Step({ when, title, desc }: { when: string; title: string; desc: string }) {
  return (
    <li className={SAGE.card + " rounded-2xl p-4"}>
      <div className="text-sm text-zinc-500">{when}</div>
      <div className="mt-1 font-semibold text-zinc-900">{title}</div>
      <div className="text-sm text-zinc-600">{desc}</div>
    </li>
  );
}
function ProfileCard({ name, role, sub, img, phone }: { name: string; role: string; sub?: string; img: string; phone: string; }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <figure className="rounded-xl overflow-hidden w-20 h-20 border border-[#e7ebe3]">
          <img src={img} alt={name} className="w-full h-full object-cover" />
        </figure>
        <div>
          <div className="text-xs text-zinc-500">{role}</div>
          <div className="text-lg font-semibold text-zinc-900">{name}</div>
          {sub && <div className="text-sm text-zinc-600">{sub}</div>}
          <div className="mt-2 flex items-center gap-2">
            <a href={`tel:${phone}`} className={`${SAGE.btn} ${SAGE.soft} inline-flex items-center gap-1`}><Phone className="h-4 w-4" />연락하기</a>
          </div>
        </div>
      </div>
    </Card>
  );
}
function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <div className="w-14 shrink-0 text-sm text-zinc-500">{label}</div>
      <div className="text-sm text-zinc-700">{value}</div>
    </div>
  );
}
function AccountBox({ bank, num, name }: { bank: string; num: string; name: string }) {
  async function copyText(t: string) {
    try { await navigator.clipboard.writeText(t); alert("복사되었습니다"); }
    catch { prompt("복사할 내용을 선택 후 복사하세요", t); }
  }
  const text = `${bank} ${num} (${name})`;
  return (
    <Card className="p-4">
      <div className="text-xs text-zinc-500">마음 전하실 곳</div>
      <div className="mt-1 font-medium text-zinc-900">{bank} <span className="text-zinc-600">{num}</span></div>
      <div className="text-sm text-zinc-600">예금주: {name}</div>
      <button onClick={() => copyText(text)} className={`${SAGE.btn} ${SAGE.soft} mt-2 inline-flex items-center gap-1`}><Copy className="h-4 w-4" />복사하기</button>
    </Card>
  );
}
function Action({ children, icon, href, onClick }: { children: React.ReactNode; icon: React.ReactNode; href?: string; onClick?: () => void; }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Cmp: any = href ? "a" : "button";
  return (
    <Cmp href={href} onClick={onClick} className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-white/90 backdrop-blur border border-[#eceee9] shadow-sm">
      {icon}<span className="text-sm font-medium">{children}</span>
    </Cmp>
  );
}
/** 이미지 없을 때 동일 공간을 잡아주는 스마트 이미지 */
function SmartImage({ src, alt, className = "", aspect = "1/1" }: { src?: string; alt: string; className?: string; aspect?: `${number}/${number}`; }) {
  const [ok, setOk] = useState<boolean>(Boolean(src));
  return ok && src ? (
    <img src={src} alt={alt} className={className} onError={() => setOk(false)} style={{ aspectRatio: aspect }} loading="lazy" />
  ) : (
    <div aria-label="이미지 준비중" className="flex items-center justify-center text-zinc-400 text-sm bg-white" style={{ aspectRatio: aspect }}>
      이미지 준비중
    </div>
  );
}

/** ===== utils ===== */
function buildCalendar(year: number, month0: number) {
  const first = new Date(year, month0, 1);
  const startIdx = first.getDay();
  const lastDate = new Date(year, month0 + 1, 0).getDate();
  const cells: { y: number; m: number; d: number | null }[] = [];
  for (let i = 0; i < startIdx; i++) cells.push({ y: year, m: month0, d: null });
  for (let d = 1; d <= lastDate; d++) cells.push({ y: year, m: month0, d });
  while (cells.length % 7 !== 0) cells.push({ y: year, m: month0, d: null });
  return cells;
}
