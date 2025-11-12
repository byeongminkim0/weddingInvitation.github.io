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

const glyphToContoursD = (glyph: Glyph, x: number, y: number, fontSize: number): string[] => {
  const pathObj = glyph.getPath(x, y, fontSize);
  const cmds: OTCommand[] = pathObj.commands ?? [];
  const contours: string[] = [];

  let d = '';
  for (let i = 0; i < cmds.length; i++) {
    const c = cmds[i];
    switch (c.type) {
      case 'M':
        if (d) { contours.push(d); d = ''; }
        d += `M ${c.x} ${c.y}`;
        break;
      case 'L':
        d += ` L ${c.x} ${c.y}`;
        break;
      case 'Q':
        d += ` Q ${c.x1} ${c.y1} ${c.x} ${c.y}`;
        break;
      case 'C':
        d += ` C ${c.x1} ${c.y1} ${c.x2} ${c.y2} ${c.x} ${c.y}`;
        break;
      case 'Z':
        d += ' Z';
        break;
      default:
        break;
    }
  }
  if (d) contours.push(d);
  return contours;
};

type Align = 'left' | 'center' | 'right';

interface HandwritingTextProps {
  text: string;                   // \n 줄바꿈 지원
  fontUrl?: string;               // 권장 TTF/OTF (opentype.js 안정)
  fontSize?: number;              // px
  strokeWidth?: number;
  strokeColor?: string;
  fillColor?: string | 'none';
  lineHeight?: number;            // 배수
  letterSpacing?: number;         // px
  wordSpacing?: number;           // px
  align?: Align;
  speed?: number;                 // 배속: 1=기본(느려짐 원하면 >1), 0.7은 더 빠름
  revealFill?: boolean;           // 윤곽 후 채움 페이드인
  showPen?: boolean;              // 펜촉 표시
  penRadius?: number;             // 펜촉 반지름
  className?: string;
}

const DEFAULT_FONT_URL = '/fonts/DancingScript-Regular.ttf';

export const HandwritingText: React.FC<HandwritingTextProps> = ({
  text,
  fontUrl = DEFAULT_FONT_URL,
  fontSize = 86,
  strokeWidth = 2.2,
  strokeColor = '#1f2937',
  fillColor = 'none',
  lineHeight = 1.18,
  letterSpacing = 0,
  wordSpacing = 14,
  align = 'center',
  speed = 1.0,
  revealFill = true,
  showPen = true,
  penRadius = 2.4,
  className = '',
}) => {
  const [font, setFont] = useState<Font | null>(null);
  const [dList, setDList] = useState<string[]>([]);
  const [viewBox, setViewBox] = useState<[number, number, number, number]>([0, 0, 900, 220]);
  const [filled, setFilled] = useState(false);

  const pathRefs = useRef<SVGPathElement[]>([]);
  const penRef = useRef<SVGCircleElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const stopRef = useRef<boolean>(false);

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
        if (sig.startsWith('<!DO') || sig.startsWith('<html')) {
          throw new Error(`Got HTML instead of font: ${fontUrl}`);
        }

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

    // 줄 폭
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

    const startXFor = (w: number) => {
      if (align === 'left') return 0;
      if (align === 'right') return maxWidth - w;
      return (maxWidth - w) / 2;
    };

    const allD: string[] = [];
    lines.forEach((line, rowIndex) => {
      let x = startXFor(lineWidths[rowIndex]);
      const yBaseline = (rowIndex + 1) * lineGap;

      for (const ch of line) {
        if (ch === ' ') { x += wordSpacing; continue; }
        const glyph = font.charToGlyph(ch);
        const contours = glyphToContoursD(glyph, x, yBaseline, fontSize);
        allD.push(...contours);
        x += charAdvancePx(font, glyph, ch, fontSize, scale) + letterSpacing;
      }
    });

    setFilled(false);
    setDList(allD);
    setViewBox([
      -Math.ceil(maxWidth * 0.06),
      -Math.ceil(fontSize * 0.35),
      Math.ceil(maxWidth * 1.12),
      Math.ceil(height * 1.25),
    ]);
  }, [font, text, fontSize, lineHeight, letterSpacing, wordSpacing, align]);

  // 순차 애니메이션 (WAAPI + rAF로 펜촉 이동)
  useEffect(() => {
    if (!dList.length) return;

    // 접근성: 선호도 체크
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      // 애니메이션 없이 완성 상태로
      pathRefs.current.forEach(p => {
        if (!p) return;
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `0`;
      });
      setFilled(true);
      return;
    }

    stopRef.current = false;
    const pxPerSecondBase = 420;
    const pxPerSecond = pxPerSecondBase / Math.max(speed, 0.1);
    const minDur = 0.08;

    const animateOne = (el: SVGPathElement): Promise<void> =>
      new Promise((resolve) => {
        const len = el.getTotalLength();
        el.style.strokeDasharray = `${len}`;
        el.style.strokeDashoffset = `${len}`;

        // 펜촉 보이기
        const pen = penRef.current;
        if (pen && showPen) {
          pen.style.opacity = '1';
        }

        const duration = Math.max(minDur, len / pxPerSecond) * 1000; // ms
        const start = performance.now();

        // strokeDashoffset 애니메이션 (WAAPI)
        const anim = el.animate(
          [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
          { duration, easing: 'linear', fill: 'forwards' }
        );

        // 펜촉 위치 rAF로 갱신
        const tick = (t: number) => {
          if (stopRef.current) {
            anim.cancel();
            if (pen) pen.style.opacity = '0';
            resolve();
            return;
          }
          const elapsed = t - start;
          const progress = Math.min(1, Math.max(0, elapsed / duration));
          const dist = len * progress; // 그린 길이
          if (pen && showPen) {
            try {
              const pt = el.getPointAtLength(dist);
              pen.setAttribute('cx', String(pt.x));
              pen.setAttribute('cy', String(pt.y));
            } catch { /* noop */ }
          }
          if (progress < 1) {
            rafRef.current = requestAnimationFrame(tick);
          }
        };
        rafRef.current = requestAnimationFrame(tick);

        anim.onfinish = () => {
          if (pen && showPen) pen.style.opacity = '0';
          resolve();
        };
        anim.oncancel = () => {
          if (pen && showPen) pen.style.opacity = '0';
          resolve();
        };
      });

    (async () => {
      // 초기화
      pathRefs.current.forEach(p => {
        if (!p) return;
        p.getAnimations().forEach(a => a.cancel());
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
      });

      // 순차로 하나씩
      for (const el of pathRefs.current) {
        if (!el) continue;
        await animateOne(el);
        if (stopRef.current) break;
      }
      // 다 끝나면 fill 페이드인
      setFilled(true);
    })();

    return () => {
      stopRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      pathRefs.current.forEach(p => p?.getAnimations().forEach(a => a.cancel()));
    };
  }, [dList, speed, showPen]);

  const fillOpacity = useMemo(() => (revealFill ? (filled ? 1 : 0) : 1), [filled, revealFill]);

  return (
    <div className={className}>
      <svg
        viewBox={viewBox.join(' ')}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="ink-blur" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="0.35" />
          </filter>
        </defs>

        {/* 윤곽(펜) 레이어 */}
        <g
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#ink-blur)"
        >
          {dList.map((d, i) => (
            <path
              key={i}
              ref={el => { if (el) pathRefs.current[i] = el; }}
              d={d}
            />
          ))}
        </g>

        {/* 펜촉 */}
        {showPen && (
          <circle
            ref={penRef}
            r={penRadius}
            fill={strokeColor}
            opacity={0}
          />
        )}

        {/* 채움 레이어 */}
        {fillColor !== 'none' && (
          <g
            fill={fillColor}
            stroke="none"
            style={{ transition: 'opacity .45s ease-out', opacity: fillOpacity }}
          >
            {dList.map((d, i) => (
              <path key={`f-${i}`} d={d} />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
};
