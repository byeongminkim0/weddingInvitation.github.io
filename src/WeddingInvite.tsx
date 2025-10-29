import React, { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Volume2, Upload, Calendar, MapPin, Heart, Camera, Lock } from "lucide-react";

/**
 * WeddingInvite – single page scroll layout (mobile-first)
 * - Sticky nav (모바일/데스크탑 공통) + 스무스 스크롤
 * - BGM 플레이어 (/public/bgm.mp3)
 * - 사진 갤러리 (업로더 이름, 공개/비공개, 올린사람/관리자만 삭제)
 * - 방명록 (작성/삭제: 본인 or 관리자)
 * - 관리자 진입: 하트 로고 "길게 누르기 0.7초" 또는 URL ?admin=0613
 * - 모든 데이터는 localStorage에 저장 (브라우저/기기별)
 */

export default function WeddingInvite() {
  // Sections
  const sections = {
    invite: useRef<HTMLDivElement>(null),
    schedule: useRef<HTMLDivElement>(null),
    map: useRef<HTMLDivElement>(null),
    gallery: useRef<HTMLDivElement>(null),
    guestbook: useRef<HTMLDivElement>(null),
  } as const;

  // Audio
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.6);

  // Identity / Admin
  const OWNER_KEY = "invite.ownerId";
  const ADMIN_KEY = "invite.admin";
  const [ownerId, setOwnerId] = useState<string>("");
  const [admin, setAdmin] = useState<boolean>(() => localStorage.getItem(ADMIN_KEY) === "1");

  useEffect(() => {
    let id = localStorage.getItem(OWNER_KEY);
    if (!id) {
      id = (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
      localStorage.setItem(OWNER_KEY, id);
    }
    setOwnerId(id!);
  }, []);

  // URL ?admin=0613 로 진입 시 자동 ON
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("admin") === "0613") {
        localStorage.setItem(ADMIN_KEY, "1");
        setAdmin(true);
      }
    } catch { /* empty */ }
  }, []);

  // 하트 길게 누르면 PIN
  const pressRef = useRef<number | null>(null);
  function onLogoPointerDown() {
    if (pressRef.current) return;
    pressRef.current = window.setTimeout(() => {
      const pin = prompt("관리자 PIN을 입력하세요 (예: 0613)")?.trim();
      if (pin === "0613") {
        localStorage.setItem(ADMIN_KEY, "1");
        setAdmin(true);
      }
      pressRef.current = null;
    }, 700);
  }
  function onLogoPointerUp() {
    if (pressRef.current) {
      clearTimeout(pressRef.current);
      pressRef.current = null;
    }
  }

  // Photos (with owner/visibility)
  type Photo = {
    id: string;
    dataUrl: string;
    ownerId: string;
    ownerName: string;
    visibility: "public" | "private";
    createdAt: number;
  };
  const [images, setImages] = useState<Photo[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("invite.photos") || "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem("invite.photos", JSON.stringify(images));
  }, [images]);

  // Guestbook
  type Note = { id: string; ownerId: string; name: string; message: string; createdAt: number };
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("invite.guestbook") || "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem("invite.guestbook", JSON.stringify(notes));
  }, [notes]);

  // Countdown (KST)
  const weddingDate = useMemo(() => new Date("2026-06-13T14:00:00+09:00"), []);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, weddingDate.getTime() - now.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  // Smooth scroll (HTMLElement 전달)
  function scrollToEl(el: HTMLElement | null | undefined) {
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Audio volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Upload
  const [uploaderName, setUploaderName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  async function filesToPhotos(files: File[], ownerName: string, visibility: "public" | "private") {
    const readers = await Promise.all(
      files.map(
        (f) =>
          new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(String(r.result));
            r.onerror = () => rej(r.error);
            r.readAsDataURL(f);
          })
      )
    );
    const newPhotos: Photo[] = readers.map((d) => ({
      id: crypto.randomUUID(),
      dataUrl: d,
      ownerId,
      ownerName,
      visibility,
      createdAt: Date.now(),
    }));
    setImages((prev) => [...newPhotos, ...prev]);
  }

  const onPickFiles: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    await filesToPhotos(files, uploaderName || "게스트", isPrivate ? "private" : "public");
    e.currentTarget.value = ""; // re-pick allow
  };

  // Guestbook write/delete
  const [noteName, setNoteName] = useState("");
  const [noteMsg, setNoteMsg] = useState("");
  function addNote() {
    if (!noteMsg.trim()) return;
    const n: Note = {
      id: crypto.randomUUID(),
      ownerId,
      name: noteName || "게스트",
      message: noteMsg.trim(),
      createdAt: Date.now(),
    };
    setNotes((prev) => [n, ...prev]);
    setNoteMsg("");
  }
  function removeNote(id: string, owner: string) {
    if (admin || owner === ownerId) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-rose-50 to-white text-zinc-800">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-zinc-100">
        <div className="pt-[env(safe-area-inset-top)]" />
        <div className="max-w-5xl mx-auto px-3 md:px-4 py-2.5">
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2 font-semibold text-base md:text-lg min-w-0">
              <span
                onPointerDown={onLogoPointerDown}
                onPointerUp={onLogoPointerUp}
                onPointerLeave={onLogoPointerUp}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-white select-none"
                title="길게 눌러 관리자 모드"
              >
                <Heart className="h-4 w-4" />
              </span>
              <span className="truncate flex items-center gap-1">
                혜민 ❤️ 병민 {admin && <Lock className="h-3.5 w-3.5 text-amber-500" />}
              </span>
            </div>
            {/* 데스크탑 네비 (관리자 버튼 없음) */}
            <nav className="hidden md:flex gap-2 min-w-0">
              <button
                onClick={() => scrollToEl(sections.invite.current)}
                className="inline-flex items-center justify-center px-3.5 py-2.5 rounded-full text-sm md:text-base bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[.99] transition"
              >
                청첩장
              </button>
              <button
                onClick={() => scrollToEl(sections.schedule.current)}
                className="inline-flex items-center justify-center px-3.5 py-2.5 rounded-full text-sm md:text-base bg-zinc-100 hover:bg-zinc-200 active:scale-[.99] transition"
              >
                일정안내
              </button>
              <button
                onClick={() => scrollToEl(sections.map.current)}
                className="inline-flex items-center justify-center px-3.5 py-2.5 rounded-full text-sm md:text-base bg-zinc-100 hover:bg-zinc-200 active:scale-[.99] transition"
              >
                오시는 길
              </button>
            </nav>
          </div>

          {/* 모바일 네비 (관리자 버튼 없음) */}
          <nav className="mt-2 grid grid-cols-3 gap-1 md:hidden">
            <button
              onClick={() => scrollToEl(sections.invite.current)}
              className="w-full px-3 py-2 rounded-xl text-sm font-medium bg-zinc-900 text-white active:scale-[.99]"
            >
              청첩장
            </button>
            <button
              onClick={() => scrollToEl(sections.schedule.current)}
              className="w-full px-3 py-2 rounded-xl text-sm font-medium bg-zinc-100 text-zinc-900 hover:bg-zinc-200 active:scale-[.99]"
            >
              일정안내
            </button>
            <button
              onClick={() => scrollToEl(sections.map.current)}
              className="w-full px-3 py-2 rounded-xl text-sm font-medium bg-zinc-100 text-zinc-900 hover:bg-zinc-200 active:scale-[.99]"
            >
              오시는 길
            </button>
          </nav>
        </div>
      </header>

      {/* Invite */}
      <section ref={sections.invite} className="max-w-5xl mx-auto px-3 md:px-4 pt-10 md:pt-12 pb-14 md:pb-16 scroll-mt-24">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="order-2 md:order-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900">초대합니다</h1>
            <p className="mt-3 text-zinc-600 leading-relaxed">
              2026년 6월 13일(토) 오후 2시, 제이오스티엘에서 함께해 주세요. 두 사람이 한마음으로 새로운 시작을 약속합니다.
            </p>

            <div className="mt-6 p-4 rounded-2xl bg-white shadow-sm border border-zinc-100">
              <p className="text-sm text-zinc-500">우리의 D-DAY</p>
              <div className="mt-2 flex items-center gap-4 text-center">
                <TimeBox label="Days" value={days} />
                <TimeBox label="Hours" value={hours} />
                <TimeBox label="Minutes" value={minutes} />
                <TimeBox label="Seconds" value={seconds} />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => scrollToEl(sections.schedule.current)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition"
              >
                <Calendar className="h-4 w-4" />
                일정안내
              </button>
              <button
                onClick={() => scrollToEl(sections.map.current)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition"
              >
                <MapPin className="h-4 w-4" />
                오시는 길
              </button>
              <button
                onClick={() => scrollToEl(sections.gallery.current)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 transition"
              >
                <Camera className="h-4 w-4" />
                사진보기
              </button>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <div className="aspect-[4/5] w-full rounded-3xl bg-gradient-to-br from-rose-100 via-white to-rose-50 border border-zinc-100 shadow-sm overflow-hidden flex items-center justify-center">
              <div className="text-center px-4 md:px-6">
                <Heart className="mx-auto h-10 w-10 text-rose-500" />
                <p className="mt-3 text-sm text-zinc-500">여기에 우리 사진 커버를 올려도 좋아요</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Schedule */}
      <section ref={sections.schedule} className="max-w-5xl mx-auto px-3 md:px-4 py-14 scroll-mt-24">
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900">일정안내</h2>
        <p className="mt-2 text-zinc-600">식은 14:00에 시작하며, 식전 리셉션은 13:30부터 진행됩니다.</p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 min-w-0">
          <Step time="13:30" title="식전 리셉션" desc="포토타임 & 안내" />
          <Step time="14:00" title="예식" desc="사회자 진행 및 서약" />
          <Step time="15:00" title="피로연" desc="가벼운 다과 및 인사" />
        </div>
      </section>

      {/* Map / Directions */}
      <section ref={sections.map} className="max-w-5xl mx-auto px-3 md:px-4 py-14 scroll-mt-24">
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900">오시는 길</h2>
        <p className="mt-2 text-zinc-600">제이오스티엘 (서울 · 정확한 주소와 주차 안내를 함께 표기하세요)</p>

        <div className="mt-6 grid md:grid-cols-2 gap-6 min-w-0">
          <div className="rounded-2xl overflow-hidden border border-zinc-100 shadow-sm bg-white">
            <iframe
              title="venue-map"
              className="w-full h-[260px] sm:h-[320px]"
              src="https://map.kakao.com/?q=%EC%A0%9C%EC%9D%B4%EC%98%A4%EC%8A%A4%ED%8B%B0%EC%97%98"
              allowFullScreen
              loading="lazy"
            />
          </div>
          <div className="flex flex-col gap-3 min-w-0">
            <InfoLine label="주소" value="서울 ○○구 ○○로 00 제이오스티엘" />
            <InfoLine label="지하철" value="○○역 ○번 출구 도보 5분" />
            <InfoLine label="주차" value="건물 내 주차 가능(2시간 무료)" />
            <div className="flex flex-wrap gap-2 pt-2">
              <a href="#" className="px-3 py-2 rounded-xl bg-zinc-900 text-white text-sm hover:bg-zinc-800">
                카카오 길찾기
              </a>
              <a href="#" className="px-3 py-2 rounded-xl bg-zinc-100 text-sm hover:bg-zinc-200">
                네이버 길찾기
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section ref={sections.gallery} className="max-w-5xl mx-auto px-3 md:px-4 py-14 scroll-mt-24">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl md:text-3xl font-bold text-zinc-900">사진 갤러리</h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="올린 사람 이름"
              value={uploaderName}
              onChange={(e) => setUploaderName(e.target.value)}
              className="h-9 rounded-lg border border-zinc-200 px-3 text-sm"
            />
            <label className="inline-flex items-center gap-1 text-sm text-zinc-600 select-none">
              <input type="checkbox" className="accent-rose-500" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} /> 비공개(본인·관리자만)
            </label>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500 text-white text-sm hover:bg-rose-600 cursor-pointer">
              <Upload className="h-4 w-4" /> 사진 업로드
              <input type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles} />
            </label>
          </div>
        </div>
        <p className="mt-2 text-zinc-600">사진은 이 브라우저에 저장되며, '비공개'는 올린 사람과 관리자만 볼 수 있어요.</p>

        {images.filter((p) => p.visibility === "public" || p.ownerId === ownerId || admin).length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-200 p-10 text-center text-zinc-500">
            아직 사진이 없어요. 오른쪽의 <b>사진 업로드</b> 버튼을 눌러보세요.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 min-w-0">
            {images
              .filter((p) => p.visibility === "public" || p.ownerId === ownerId || admin)
              .map((p) => (
                <figure key={p.id} className="group relative aspect-square overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm">
                  <img src={p.dataUrl} alt={p.ownerName} className="h-full w-full object-cover group-hover:scale-[1.02] transition" />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-black/40 text-white text-xs px-2 py-1 flex items-center justify-between">
                    <span className="truncate">{p.ownerName || "게스트"}</span>
                    <span className="ml-2 shrink-0">{new Date(p.createdAt).toLocaleDateString()}</span>
                  </figcaption>
                  {(admin || p.ownerId === ownerId) && (
                    <button
                      onClick={() => setImages((prev) => prev.filter((x) => x.id !== p.id))}
                      className="absolute top-2 right-2 rounded-md bg-black/60 text-white text-xs px-2 py-1"
                    >
                      삭제
                    </button>
                  )}
                  {p.visibility === "private" && <span className="absolute top-2 left-2 rounded-md bg-amber-500 text-white text-[10px] px-1.5 py-0.5">비공개</span>}
                </figure>
              ))}
          </div>
        )}
      </section>

      {/* Guestbook */}
      <section ref={sections.guestbook} className="max-w-5xl mx-auto px-3 md:px-4 py-14 scroll-mt-24">
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900">방명록</h2>
        <p className="mt-2 text-zinc-600">축하 메시지를 남겨주세요. 작성자는 본인 브라우저에서 삭제할 수 있고, 관리자는 모든 메시지를 관리할 수 있어요.</p>

        <div className="mt-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm grid sm:grid-cols-[1fr_auto] gap-3 items-start">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="이름(선택)"
              value={noteName}
              onChange={(e) => setNoteName(e.target.value)}
              className="h-10 rounded-lg border border-zinc-200 px-3 text-sm"
            />
            <textarea
              placeholder="축하 메시지를 남겨주세요"
              value={noteMsg}
              onChange={(e) => setNoteMsg(e.target.value)}
              className="min-h-[90px] rounded-lg border border-zinc-200 p-3 text-sm"
            />
          </div>
          <button onClick={addNote} className="h-10 px-4 rounded-xl bg-rose-500 text-white hover:bg-rose-600">
            등록
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-200 p-10 text-center text-zinc-500">아직 메시지가 없어요. 첫 축하를 남겨주세요! 🎉</div>
        ) : (
          <ul className="mt-6 space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-zinc-900">{n.name || "게스트"}</div>
                  <div className="text-xs text-zinc-500">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                <p className="mt-2 text-sm text-zinc-700 whitespace-pre-wrap break-words">{n.message}</p>
                {(admin || n.ownerId === ownerId) && (
                  <div className="mt-3 text-right">
                    <button onClick={() => removeNote(n.id, n.ownerId)} className="text-xs rounded-md bg-zinc-100 hover:bg-zinc-200 px-2 py-1">
                      삭제
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 bg-white/70">
        <div className="max-w-5xl mx-auto px-4 py-10 text-center text-sm text-zinc-500">소중한 발걸음에 감사드립니다. 안전하게 오세요 💐</div>
      </footer>

      {/* BGM floating player */}
      <audio ref={audioRef} src="/bgm.mp3" loop hidden />
      <div className="fixed bottom-4 right-4 z-50 sm:bottom-4 sm:right-4 max-sm:bottom-2 max-sm:right-2">
        <div className="rounded-2xl border border-zinc-200 bg-white/90 backdrop-blur shadow-sm px-3 py-2 flex items-center gap-2 max-w-[92vw]">
          <button
            onClick={async () => {
              const a = audioRef.current;
              if (!a) return;
              if (!playing) {
                try {
                  await a.play();
                  setPlaying(true);
                } catch (e) {
                  console.warn("Autoplay blocked until user gesture", e);
                }
              } else {
                a.pause();
                setPlaying(false);
              }
            }}
            className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-zinc-900 text-white hover:bg-zinc-800"
            aria-label={playing ? "Pause music" : "Play music"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <Volume2 className="h-4 w-4 text-zinc-500" />
          <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-20 sm:w-24 accent-rose-500" />
        </div>
      </div>
    </div>
  );
}

function TimeBox({ label, value }: { label: string; value: number }) {
  const v = String(value).padStart(2, "0");
  return (
    <div className="flex-1 rounded-xl bg-zinc-50 border border-zinc-100 p-3">
      <div className="text-2xl font-bold tabular-nums text-zinc-900">{v}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
    </div>
  );
}

function Step({ time, title, desc }: { time: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
      <div className="text-sm text-zinc-500">{time}</div>
      <div className="mt-1 font-semibold text-zinc-900">{title}</div>
      <div className="mt-1 text-sm text-zinc-600">{desc}</div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-14 shrink-0 text-sm text-zinc-500">{label}</div>
      <div className="text-sm text-zinc-700">{value}</div>
    </div>
  );
}
