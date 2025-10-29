import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, MapPin, Heart, Camera, Phone, Send, Copy, Play, Pause, Volume2, Upload, Lock, Share2 } from "lucide-react";

/**
 * OurFirstLetter-style Wedding Invite (Single File .tsx)
 * - One-page scroll, mobile-first, clean pastel style inspired by ourfirstletter
 * - Sticky header chips (청첩장/일정/오시는길/갤러리/방명록)
 * - Sticky bottom action bar (전화 / 공유 / 길찾기)
 * - Smooth scroll anchors (HashRouter-friendly)
 * - BGM mini-player (needs /public/bgm.mp3)
 * - Gallery (local only) + uploader name + public/private + owner/admin delete
 * - Guestbook (local) with owner/admin delete
 * - Account copy box (혼주 계좌) with clipboard
 * - Hidden admin: long-press heart 0.7s or URL ?admin=0613
 * NOTE: This is frontend-only (localStorage). For multi-user, wire to Supabase/Firebase later.
 */

export default function OurFirstLetterInvite() {
  // Sections
  const sections = {
    invite: useRef<HTMLDivElement>(null),
    schedule: useRef<HTMLDivElement>(null),
    map: useRef<HTMLDivElement>(null),
    gallery: useRef<HTMLDivElement>(null),
    guestbook: useRef<HTMLDivElement>(null),
    account: useRef<HTMLDivElement>(null),
  } as const;

  // Admin/Owner identity
  const OWNER_KEY = "invite.ownerId";
  const ADMIN_KEY = "invite.admin";
  const [ownerId, setOwnerId] = useState<string>("");
  const [admin, setAdmin] = useState<boolean>(() => localStorage.getItem(ADMIN_KEY) === "1");

  useEffect(() => {
    let id = localStorage.getItem(OWNER_KEY);
    if (!id) { id = crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2); localStorage.setItem(OWNER_KEY, id); }
    setOwnerId(id!);
  }, []);

  // Optional URL admin param
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("admin") === "0613") { localStorage.setItem(ADMIN_KEY, "1"); setAdmin(true); }
  }, []);

  // Secret long-press on logo
  const pressRef = useRef<number | null>(null);
  function onLogoPointerDown() {
    if (pressRef.current) return;
    pressRef.current = window.setTimeout(() => {
      const pin = prompt("관리자 PIN을 입력하세요 (예: 0613)")?.trim();
      if (pin === "0613") { localStorage.setItem(ADMIN_KEY, "1"); setAdmin(true); }
      pressRef.current = null;
    }, 700);
  }
  function onLogoPointerUp() {
    if (pressRef.current) { clearTimeout(pressRef.current); pressRef.current = null; }
  }

  // Audio
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.6);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  // Countdown (edit your datetime/location)
  const weddingDate = useMemo(() => new Date("2026-06-13T14:00:00+09:00"), []);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const diff = Math.max(0, weddingDate.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff / 3600000) % 24);
  const minutes = Math.floor((diff / 60000) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  // Smooth scroll
  function scrollToEl(el: HTMLElement | null | undefined) { el?.scrollIntoView({ behavior: "smooth", block: "start" }); }

  // Gallery (local)
  type Photo = { id: string; dataUrl: string; ownerId: string; ownerName: string; visibility: "public"|"private"; createdAt: number };
  const [images, setImages] = useState<Photo[]>(() => { try { return JSON.parse(localStorage.getItem("invite.photos")||"[]"); } catch { return []; } });
  useEffect(()=>{ localStorage.setItem("invite.photos", JSON.stringify(images)); }, [images]);
  const [uploaderName, setUploaderName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const onPickFiles: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = Array.from(e.target.files ?? []); if (!files.length) return;
    const urls = await Promise.all(files.map(f => new Promise<string>((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result)); r.onerror=()=>rej(r.error); r.readAsDataURL(f);})))
    const batch: Photo[] = urls.map(d => ({ id: crypto.randomUUID(), dataUrl: d, ownerId, ownerName: uploaderName || "게스트", visibility: isPrivate?"private":"public", createdAt: Date.now() }));
    setImages(prev => [...batch, ...prev]); e.currentTarget.value = "";
  };

  // Guestbook (local)
  type Note = { id: string; ownerId: string; name: string; message: string; createdAt: number };
  const [notes, setNotes] = useState<Note[]>(() => { try { return JSON.parse(localStorage.getItem("invite.guestbook")||"[]"); } catch { return []; } });
  useEffect(()=>{ localStorage.setItem("invite.guestbook", JSON.stringify(notes)); }, [notes]);
  const [noteName, setNoteName] = useState("");
  const [noteMsg, setNoteMsg] = useState("");
  function addNote(){ if(!noteMsg.trim()) return; const n:Note={id:crypto.randomUUID(), ownerId, name:noteName||"게스트", message:noteMsg.trim(), createdAt:Date.now()}; setNotes(prev=>[n,...prev]); setNoteMsg(""); }
  function removeNote(id:string, owner:string){ if(admin || owner===ownerId) setNotes(prev=>prev.filter(n=>n.id!==id)); }

  // Account copy
  const groom = { bank:"카카오뱅크", name:"김병민", num:"3333-12-3456789" };
  const bride = { bank:"토스뱅크", name:"김혜민", num:"1000-22-334455" };
  async function copyText(t:string){ try{ await navigator.clipboard.writeText(t); alert("복사되었습니다"); }catch{ prompt("복사할 내용을 선택 후 복사하세요", t); } }

  // Share (Web Share API)
  async function shareInvite(){
    const shareData = { title:"혜민 ❤️ 병민 결혼식", text:"2026-06-13(토) 14:00 제이오스티엘에서 함께해 주세요!", url: window.location.href };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try{ if((navigator as any).share) await (navigator as any).share(shareData); else await navigator.clipboard.writeText(shareData.url); }catch{ /* empty */ }
  }

  return (
    <div className="min-h-screen bg-[#fffaf9] text-zinc-800 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-zinc-100">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <span
                onPointerDown={onLogoPointerDown}
                onPointerUp={onLogoPointerUp}
                onPointerLeave={onLogoPointerUp}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-500 text-white select-none"
                title="길게 눌러 관리자"
              >
                <Heart className="h-5 w-5"/>
              </span>
              <span className="flex items-center gap-1 text-base md:text-lg">혜민 ❤️ 병민 {admin && <Lock className="h-4 w-4 text-amber-500"/>}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1">
              <Chip onClick={()=>scrollToEl(sections.invite.current)}>청첩장</Chip>
              <Chip onClick={()=>scrollToEl(sections.schedule.current)}>일정</Chip>
              <Chip onClick={()=>scrollToEl(sections.map.current)}>오시는길</Chip>
              <Chip onClick={()=>scrollToEl(sections.gallery.current)}>갤러리</Chip>
              <Chip onClick={()=>scrollToEl(sections.guestbook.current)}>방명록</Chip>
            </div>
          </div>
          <div className="sm:hidden mt-2 grid grid-cols-5 gap-1">
            <SmallChip onClick={()=>scrollToEl(sections.invite.current)}>청첩장</SmallChip>
            <SmallChip onClick={()=>scrollToEl(sections.schedule.current)}>일정</SmallChip>
            <SmallChip onClick={()=>scrollToEl(sections.map.current)}>오시는길</SmallChip>
            <SmallChip onClick={()=>scrollToEl(sections.gallery.current)}>갤러리</SmallChip>
            <SmallChip onClick={()=>scrollToEl(sections.guestbook.current)}>방명록</SmallChip>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section ref={sections.invite} className="max-w-3xl mx-auto px-4 pt-8 pb-10 scroll-mt-24">
        <div className="rounded-[28px] border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-6 shadow-sm">
          <div className="aspect-[3/2] w-full rounded-2xl bg-white/70 border border-zinc-100 flex items-center justify-center overflow-hidden">
            <div className="text-center px-6">
              <Heart className="mx-auto h-10 w-10 text-rose-500"/>
              <p className="mt-2 text-sm text-zinc-500">커버 사진을 넣어보세요</p>
            </div>
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-zinc-900 text-center">초대합니다</h1>
          <p className="mt-3 text-center text-zinc-600 leading-relaxed">
            2026년 6월 13일(토) 오후 2시, 제이오스티엘에서 함께해 주세요.<br/>
            두 사람이 한마음으로 새로운 시작을 약속합니다.
          </p>

          {/* D-DAY */}
          <div className="mt-5 grid grid-cols-4 gap-2 text-center">
            <TimeBox label="Days" value={days}/>
            <TimeBox label="Hours" value={hours}/>
            <TimeBox label="Minutes" value={minutes}/>
            <TimeBox label="Seconds" value={seconds}/>
          </div>

          {/* Quick actions */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Btn onClick={()=>scrollToEl(sections.schedule.current)} icon={<Calendar className="h-4 w-4"/>}>일정안내</Btn>
            <Btn onClick={()=>scrollToEl(sections.map.current)} icon={<MapPin className="h-4 w-4"/>} variant="dark">오시는 길</Btn>
            <Btn onClick={()=>scrollToEl(sections.gallery.current)} icon={<Camera className="h-4 w-4"/>} variant="soft">사진보기</Btn>
          </div>
        </div>
      </section>

      {/* Schedule */}
      <section ref={sections.schedule} className="max-w-3xl mx-auto px-4 py-10 scroll-mt-24">
        <SectionTitle title="일정안내" subtitle="식은 14:00부터, 식전 리셉션은 13:30부터 진행됩니다."/>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <CardStep time="13:30" title="식전 리셉션" desc="포토타임 & 안내"/>
          <CardStep time="14:00" title="예식" desc="사회자 진행 및 서약"/>
          <CardStep time="15:00" title="피로연" desc="가벼운 다과 및 인사"/>
        </div>
      </section>

      {/* Map */}
      <section ref={sections.map} className="max-w-3xl mx-auto px-4 py-10 scroll-mt-24">
        <SectionTitle title="오시는 길" subtitle="제이오스티엘 (정확한 주소와 주차 안내를 함께 표기하세요)"/>
        <div className="mt-5 grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl overflow-hidden border border-zinc-100 shadow-sm bg-white">
            <iframe title="venue-map" className="w-full h-[260px] sm:h-[320px]" src="https://map.kakao.com/?q=%EC%A0%9C%EC%9D%B4%EC%98%A4%EC%8A%A4%ED%8B%B0%EC%97%98" allowFullScreen loading="lazy"/>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
            <InfoLine label="주소" value="서울 ○○구 ○○로 00 제이오스티엘"/>
            <InfoLine label="지하철" value="○○역 ○번 출구 도보 5분"/>
            <InfoLine label="주차" value="건물 내 주차 가능(2시간 무료)"/>
            <div className="mt-3 flex gap-2">
              <a className="px-3 py-2 rounded-xl bg-zinc-900 text-white text-sm" href="#">카카오 길찾기</a>
              <a className="px-3 py-2 rounded-xl bg-zinc-100 text-sm" href="#">네이버 길찾기</a>
            </div>
          </div>
        </div>
      </section>

      {/* Account */}
      <section ref={sections.account} className="max-w-3xl mx-auto px-4 py-10 scroll-mt-24">
        <SectionTitle title="마음 전하실 곳" subtitle="축복의 마음만으로도 충분합니다 💐"/>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <AccountBox who="신랑측" bank={groom.bank} name={groom.name} num={groom.num} onCopy={()=>copyText(`${groom.bank} ${groom.num} (${groom.name})`)}/>
          <AccountBox who="신부측" bank={bride.bank} name={bride.name} num={bride.num} onCopy={()=>copyText(`${bride.bank} ${bride.num} (${bride.name})`)}/>
        </div>
      </section>

      {/* Gallery */}
      <section ref={sections.gallery} className="max-w-3xl mx-auto px-4 py-10 scroll-mt-24">
        <SectionTitle title="사진 갤러리" subtitle="비공개 사진은 올린 사람과 관리자만 볼 수 있어요"/>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input type="text" placeholder="올린 사람 이름" value={uploaderName} onChange={(e)=>setUploaderName(e.target.value)} className="h-9 rounded-lg border border-zinc-200 px-3 text-sm"/>
          <label className="inline-flex items-center gap-1 text-sm text-zinc-600 select-none">
            <input type="checkbox" className="accent-rose-500" checked={isPrivate} onChange={(e)=>setIsPrivate(e.target.checked)}/> 비공개
          </label>
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500 text-white text-sm hover:bg-rose-600 cursor-pointer">
            <Upload className="h-4 w-4"/> 사진 업로드
            <input type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles}/>
          </label>
        </div>
        {images.filter(p=>p.visibility==='public'||p.ownerId===ownerId||admin).length===0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-zinc-200 p-10 text-center text-zinc-500">아직 사진이 없어요.</div>
        ) : (
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {images.filter(p=>p.visibility==='public'||p.ownerId===ownerId||admin).map(p=> (
              <figure key={p.id} className="relative aspect-square overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm">
                <img src={p.dataUrl} alt={p.ownerName} className="h-full w-full object-cover"/>
                <figcaption className="absolute inset-x-0 bottom-0 bg-black/40 text-white text-xs px-2 py-1 flex items-center justify-between">
                  <span className="truncate">{p.ownerName}</span>
                  <span className="ml-2 shrink-0">{new Date(p.createdAt).toLocaleDateString()}</span>
                </figcaption>
                {(admin || p.ownerId===ownerId) && (
                  <button onClick={()=>setImages(prev=>prev.filter(x=>x.id!==p.id))} className="absolute top-2 right-2 rounded-md bg-black/60 text-white text-[11px] px-2 py-1">삭제</button>
                )}
                {p.visibility==='private' && (
                  <span className="absolute top-2 left-2 rounded-md bg-amber-500 text-white text-[10px] px-1.5 py-0.5">비공개</span>
                )}
              </figure>
            ))}
          </div>
        )}
      </section>

      {/* Guestbook */}
      <section ref={sections.guestbook} className="max-w-3xl mx-auto px-4 py-10 scroll-mt-24">
        <SectionTitle title="방명록" subtitle="축하의 한마디를 남겨주세요"/>
        <div className="mt-3 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm grid sm:grid-cols-[1fr_auto] gap-3 items-start">
          <div className="flex flex-col gap-2">
            <input type="text" placeholder="이름(선택)" value={noteName} onChange={(e)=>setNoteName(e.target.value)} className="h-10 rounded-lg border border-zinc-200 px-3 text-sm"/>
            <textarea placeholder="축하 메시지를 남겨주세요" value={noteMsg} onChange={(e)=>setNoteMsg(e.target.value)} className="min-h-[90px] rounded-lg border border-zinc-200 p-3 text-sm"/>
          </div>
          <button onClick={addNote} className="h-10 px-4 rounded-xl bg-rose-500 text-white hover:bg-rose-600">등록</button>
        </div>
        {notes.length===0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-zinc-200 p-10 text-center text-zinc-500">아직 메시지가 없어요. 첫 축하를 남겨주세요! 🎉</div>
        ) : (
          <ul className="mt-5 space-y-3">
            {notes.map(n => (
              <li key={n.id} className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-zinc-900">{n.name || '게스트'}</div>
                  <div className="text-xs text-zinc-500">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                <p className="mt-2 text-sm text-zinc-700 whitespace-pre-wrap break-words">{n.message}</p>
                {(admin || n.ownerId===ownerId) && (
                  <div className="mt-3 text-right">
                    <button onClick={()=>removeNote(n.id, n.ownerId)} className="text-xs rounded-md bg-zinc-100 hover:bg-zinc-200 px-2 py-1">삭제</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 bg-white/70">
        <div className="max-w-3xl mx-auto px-4 py-10 text-center text-sm text-zinc-500">소중한 발걸음에 감사드립니다. 안전하게 오세요 💐</div>
      </footer>

      {/* BGM player */}
      <audio ref={audioRef} src="/bgm.mp3" loop hidden/>
      <div className="fixed bottom-24 right-4 sm:bottom-24 sm:right-4 z-40">
        <div className="rounded-2xl border border-zinc-200 bg-white/90 backdrop-blur shadow-sm px-3 py-2 flex items-center gap-2">
          <button onClick={async()=>{ const a=audioRef.current; if(!a) return; if(!playing){ try{ await a.play(); setPlaying(true);}catch(e){ console.warn(e);} } else { a.pause(); setPlaying(false);} }} className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-zinc-900 text-white">
            {playing? <Pause className="h-4 w-4"/> : <Play className="h-4 w-4"/>}
          </button>
          <Volume2 className="h-4 w-4 text-zinc-500"/>
          <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e)=>setVolume(Number(e.target.value))} className="w-20 accent-rose-500"/>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white/90 backdrop-blur border-t border-zinc-100">
        <div className="max-w-3xl mx-auto px-4 py-2 grid grid-cols-3 gap-2">
          <BottomBtn href="tel:010-1234-5678" icon={<Phone className="h-5 w-5"/>}>전화</BottomBtn>
          <BottomBtn onClick={shareInvite} icon={<Share2 className="h-5 w-5"/>}>공유</BottomBtn>
          <BottomBtn href="#" icon={<Send className="h-5 w-5"/>}>길찾기</BottomBtn>
        </div>
      </div>
    </div>
  );
}

/* --- UI Bits --- */
function Chip({ children, onClick }:{ children:React.ReactNode; onClick:()=>void }){
  return <button onClick={onClick} className="px-3 py-1.5 rounded-full text-sm bg-zinc-100 hover:bg-zinc-200">{children}</button>;
}
function SmallChip({ children, onClick }:{ children:React.ReactNode; onClick:()=>void }){
  return <button onClick={onClick} className="px-2 py-1 rounded-xl text-xs bg-zinc-100 hover:bg-zinc-200">{children}</button>;
}
function Btn({ children, icon, onClick, variant}:{ children:React.ReactNode; icon:React.ReactNode; onClick:()=>void; variant?:"dark"|"soft" }){
  const base = "inline-flex items-center gap-2 px-4 py-2 rounded-xl transition";
  const cls = variant==="dark"? "bg-zinc-900 text-white hover:bg-zinc-800" : variant==="soft"? "bg-zinc-100 hover:bg-zinc-200" : "bg-rose-500 text-white hover:bg-rose-600";
  return <button onClick={onClick} className={`${base} ${cls}`}>{icon}{children}</button>;
}
function SectionTitle({ title, subtitle }:{ title:string; subtitle?:string }){
  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-zinc-900">{title}</h2>
      {subtitle && <p className="mt-1 text-zinc-600">{subtitle}</p>}
    </div>
  );
}
function CardStep({ time, title, desc }:{ time:string; title:string; desc:string }){
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
      <div className="text-sm text-zinc-500">{time}</div>
      <div className="mt-1 font-semibold text-zinc-900">{title}</div>
      <div className="mt-1 text-sm text-zinc-600">{desc}</div>
    </div>
  );
}
function InfoLine({ label, value }:{ label:string; value:string }){
  return (
    <div className="flex items-start gap-3 py-1">
      <div className="w-14 shrink-0 text-sm text-zinc-500">{label}</div>
      <div className="text-sm text-zinc-700">{value}</div>
    </div>
  );
}
function TimeBox({ label, value }:{ label:string; value:number }){
  const v = String(value).padStart(2, "0");
  return (
    <div className="rounded-xl bg-white border border-zinc-100 p-3">
      <div className="text-xl font-bold tabular-nums text-zinc-900 text-center">{v}</div>
      <div className="text-[11px] text-zinc-500 mt-0.5 text-center">{label}</div>
    </div>
  );
}
function AccountBox({ who, bank, name, num, onCopy }:{ who:string; bank:string; name:string; num:string; onCopy:()=>void }){
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
      <div className="text-xs text-zinc-500">{who}</div>
      <div className="mt-1 font-medium text-zinc-900">{bank} <span className="text-zinc-600">{num}</span></div>
      <div className="text-sm text-zinc-600">예금주: {name}</div>
      <button onClick={onCopy} className="mt-2 inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200">
        <Copy className="h-4 w-4"/> 복사하기
      </button>
    </div>
  );
}
function BottomBtn({ children, icon, href, onClick }:{ children:React.ReactNode; icon:React.ReactNode; href?:string; onClick?:()=>void }){
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Cmp:any = href? 'a':'button';
  return (
    <Cmp href={href} onClick={onClick} className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-white border border-zinc-200 shadow-sm">
      {icon}<span className="text-sm font-medium">{children}</span>
    </Cmp>
  );
}
