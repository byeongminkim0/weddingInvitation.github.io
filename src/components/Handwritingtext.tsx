// HandwritingText.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as opentype from 'opentype.js';
import type { Font, Glyph } from 'opentype.js';

type OTCommand = {
  type: string;
  x?: number; y?: number;
  x1?: number; y1?: number;
  x2?: number; y2?: number;
};

// 글리프를 컨투어(획 덩어리) 경로들로 분해
const glyphToContoursD = (glyph: Glyph, x: number, y: number, fontSize: number): string[] => {
  const pathObj = glyph.getPath(x, y, fontSize);
  const cmds: OTCommand[] = pathObj.commands ?? [];
  const contours: string[] = [];
  let d = '';
  for (let i = 0; i < cmds.length; i++) {
    const c = cmds[i];
    switch (c.type) {
      case 'M': if (d) { contours.push(d); d = ''; } d += `M ${c.x} ${c.y}`; break;
      case 'L': d += ` L ${c.x} ${c.y}`; break;
      case 'Q': d += ` Q ${c.x1} ${c.y1} ${c.x} ${c.y}`; break;
      case 'C': d += ` C ${c.x1} ${c.y1} ${c.x2} ${c.y2} ${c.x} ${c.y}`; break;
      case 'Z': d += ' Z'; break;
      default: break;
    }
  }
  if (d) contours.push(d);
  return contours;
};

type Align = 'left' | 'center' | 'right';

interface HandwritingTextProps {
  text: string;                   // \n 줄바꿈
  fontUrl?: string;               // 권장: TTF/OTF
  fontSize?: number;              // px
  // 윤곽선은 기본 끔(0). 켜고 싶으면 >0 지정
  strokeWidth?: number;           // 윤곽선 두께
  strokeColor?: string;           // (윤곽/펜촉 색)
  fillColor?: string | 'none';    // 최종 글자 색
  lineHeight?: number;
  letterSpacing?: number;
  wordSpacing?: number;
  align?: Align;

  // 속도/브러시
  speed?: number;                 // 1=기본, 작을수록 빠름 (예: 0.7 빠름)
  brushWidthFactor?: number;      // 브러시 굵기 = fontSize * factor (얇게: 0.45~0.55)

  // 연출
  revealFill?: boolean;           // true면 다 끝난 뒤에도 그대로 유지
  showPen?: boolean;              // 펜촉 보이기
  penRadius?: number;

  className?: string;
}

const DEFAULT_FONT_URL = '/fonts/DancingScript-Regular.ttf';

export const HandwritingText: React.FC<HandwritingTextProps> = ({
  text,
  fontUrl = DEFAULT_FONT_URL,
  fontSize = 86,
  strokeWidth = 0,                 // ✅ 기본: 테두리 끔
  strokeColor = '#1f2937',
  fillColor = '#1f2937',
  lineHeight = 1.18,
  letterSpacing = 0,
  wordSpacing = 14,
  align = 'center',

  speed = 0.7,                     // ✅ 더 빠르게
  brushWidthFactor = 0.5,          // ✅ 더 얇게

  revealFill = true,
  showPen = true,
  penRadius = 2.2,
  className = '',
}) => {
  const [font, setFont] = useState<Font | null>(null);
  const [dList, setDList] = useState<string[]>([]);
  const [viewBox, setViewBox] = useState<[number, number, number, number]>([0,0,900,220]);
  const [done, setDone] = useState(false);

  const maskPathRefs = useRef<SVGPathElement[]>([]);
  const penRef = useRef<SVGCircleElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const stopRef = useRef(false);

  // 안전한 advance(px)
  const charAdvancePx = (f: Font, glyph: Glyph, ch: string, fontSizePx: number, scale: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adv = typeof (glyph as any).advanceWidth === 'number'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (glyph as any).advanceWidth * scale
      : f.getAdvanceWidth(ch, fontSizePx);
    return Number.isFinite(adv) ? adv : 0;
  };

  // 폰트 로드
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const res = await fetch(fontUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${fontUrl}`);
        const buf = await res.arrayBuffer();
        const sig = new TextDecoder().decode(new Uint8Array(buf.slice(0, 12)));
        if (sig.startsWith('<!DO') || sig.startsWith('<html')) throw new Error('Got HTML instead of font');
        const f = opentype.parse(buf);
        if (!canceled) setFont(f);
      } catch (e) {
        console.error('Font load error', e);
      }
    })();
    return () => { canceled = true; };
  }, [fontUrl]);

  // 텍스트 → 컨투어 d 리스트
  useEffect(() => {
    if (!font) return;
    const lines = text.split('\n');
    const unitsPerEm = font.unitsPerEm ?? 1000;
    const scale = fontSize / unitsPerEm;
    const lineGap = fontSize * lineHeight;

    const lineWidths = lines.map(line => {
      let w = 0;
      for (const ch of line) {
        if (ch === ' ') { w += wordSpacing; continue; }
        const g = font.charToGlyph(ch);
        w += charAdvancePx(font, g, ch, fontSize, scale) + letterSpacing;
      }
      return w;
    });

    const maxWidth = Math.max(...lineWidths, 1);
    const height = Math.max(lines.length * lineGap, fontSize * 1.4);
    const startXFor = (w: number) => align === 'left' ? 0 : align === 'right' ? maxWidth - w : (maxWidth - w)/2;

    const allD: string[] = [];
    lines.forEach((line, rowIndex) => {
      let x = startXFor(lineWidths[rowIndex]);
      const y = (rowIndex + 1) * lineGap;
      for (const ch of line) {
        if (ch === ' ') { x += wordSpacing; continue; }
        const g = font.charToGlyph(ch);
        allD.push(...glyphToContoursD(g, x, y, fontSize));
        x += charAdvancePx(font, g, ch, fontSize, scale) + letterSpacing;
      }
    });

    setDList(allD);
    setDone(false);
    setViewBox([
      -Math.ceil(maxWidth * 0.06),
      -Math.ceil(fontSize * 0.35),
      Math.ceil(maxWidth * 1.12),
      Math.ceil(height * 1.25),
    ]);
  }, [font, text, fontSize, lineHeight, letterSpacing, wordSpacing, align]);

  // 브러시 마스크 순차 애니메이션 → 칠해지는 즉시 화면에 보임
  useEffect(() => {
    if (!dList.length) return;

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      // 모션 최소화: 바로 완성
      maskPathRefs.current.forEach(p => {
        if (!p) return;
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `0`;
      });
      setDone(true);
      return;
    }

    stopRef.current = false;

    // 더 빠르게: 기본 펜 속도 올림
    const pxPerSecondBase = 600;                    // ← 기존 420보다 빠름
    const pxPerSecond = pxPerSecondBase / Math.max(speed, 0.1); // speed↓ → 더 빠름
    const minDur = 0.06;                            // 짧은 획도 너무 번쩍되지 않게 최소 보호

    const animateOne = (el: SVGPathElement): Promise<void> =>
      new Promise((resolve) => {
        const len = el.getTotalLength();
        el.style.strokeDasharray = `${len}`;
        el.style.strokeDashoffset = `${len}`;
        const duration = Math.max(minDur, len / pxPerSecond) * 1000; // ms
        const start = performance.now();

        const anim = el.animate(
          [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
          { duration, easing: 'linear', fill: 'forwards' }
        );

        const pen = penRef.current;
        if (pen && showPen) pen.style.opacity = '1';

        const tick = (t: number) => {
          if (stopRef.current) { anim.cancel(); if (pen) pen.style.opacity = '0'; resolve(); return; }
          const pr = Math.min(1, Math.max(0, (t - start) / duration));
          const dist = len * pr;
          if (pen && showPen) {
            try {
              const pt = el.getPointAtLength(dist);
              pen.setAttribute('cx', String(pt.x));
              pen.setAttribute('cy', String(pt.y));
            } catch { /* empty */ }
          }
          if (pr < 1) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);

        anim.onfinish = () => { if (pen) pen.style.opacity = '0'; resolve(); };
        anim.oncancel  = () => { if (pen) pen.style.opacity = '0'; resolve(); };
      });

    (async () => {
      // 초기화
      maskPathRefs.current.forEach(p => {
        if (!p) return;
        p.getAnimations().forEach(a => a.cancel());
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
      });

      // 완전 순차
      for (const el of maskPathRefs.current) {
        if (!el) continue;
        await animateOne(el);
        if (stopRef.current) break;
      }
      setDone(true);
    })();

    return () => {
      stopRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      maskPathRefs.current.forEach(p => p?.getAnimations().forEach(a => a.cancel()));
    };
  }, [dList, speed, showPen]);

  // 얇은 브러시
  const brushWidth = useMemo(
    () => Math.max(1.2, fontSize * brushWidthFactor),
    [fontSize, brushWidthFactor]
  );

  // 그려지는 즉시 보이므로, finish 후에도 유지할지 여부만 결정
  const fillOpacity = useMemo(() => (revealFill ? (done ? 1 : 1) : 1), [done, revealFill]);

  return (
    <div className={className}>
      <svg viewBox={viewBox.join(' ')} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* 브러시가 지나간 곳만 보이게 하는 마스크 */}
          <mask id="revealMask" maskUnits="userSpaceOnUse">
            <rect x={viewBox[0]} y={viewBox[1]} width={viewBox[2]} height={viewBox[3]} fill="black" />
            <g fill="none" stroke="white" strokeLinecap="round" strokeLinejoin="round">
              {dList.map((d, i) => (
                <path
                  key={`m-${i}`}
                  ref={el => { if (el) maskPathRefs.current[i] = el; }}
                  d={d}
                  strokeWidth={brushWidth}   // ✅ 얇은 브러시
                />
              ))}
            </g>
          </mask>
        </defs>

        {/* (선택) 윤곽선: 기본 0이라 표시 안 됨 */}
        {strokeWidth > 0 && (
          <g fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            {dList.map((d, i) => <path key={`o-${i}`} d={d} />)}
          </g>
        )}

        {/* 채움 레이어: 마스크로 브러시 지나간 즉시 보임 */}
        {fillColor !== 'none' && (
          <g fill={fillColor} stroke="none" mask="url(#revealMask)" style={{ opacity: fillOpacity }}>
            {dList.map((d, i) => <path key={`f-${i}`} d={d} />)}
          </g>
        )}

        {/* 펜촉(옵션) */}
        {showPen && (
          <circle ref={penRef} r={penRadius} fill={strokeColor} opacity={0} />
        )}
      </svg>
    </div>
  );
};
