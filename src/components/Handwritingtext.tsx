// HandwritingText.tsx - 손글씨 애니메이션 컴포넌트
import React, { useEffect, useMemo, useState, useRef } from "react";
import * as opentype from "opentype.js";
import type { Font, Glyph } from "opentype.js";

type OTCommand = {
  type: string;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
};

// 글리프를 컨투어(획 덩어리) 경로들로 분해
const glyphToContoursD = (
  glyph: Glyph,
  x: number,
  y: number,
  fontSize: number
): string[] => {
  const pathObj = glyph.getPath(x, y, fontSize);
  const cmds: OTCommand[] = pathObj.commands ?? [];
  const contours: string[] = [];
  let d = "";

  for (let i = 0; i < cmds.length; i++) {
    const c = cmds[i];
    switch (c.type) {
      case "M":
        if (d) {
          contours.push(d);
          d = "";
        }
        d += `M ${c.x} ${c.y}`;
        break;
      case "L":
        d += ` L ${c.x} ${c.y}`;
        break;
      case "Q":
        d += ` Q ${c.x1} ${c.y1} ${c.x} ${c.y}`;
        break;
      case "C":
        d += ` C ${c.x1} ${c.y1} ${c.x2} ${c.y2} ${c.x} ${c.y}`;
        break;
      case "Z":
        d += " Z";
        break;
      default:
        break;
    }
  }
  if (d) contours.push(d);
  return contours;
};

// 전체 글리프 경로를 하나로 합치기 (fill용)
const glyphToFullPath = (
  glyph: Glyph,
  x: number,
  y: number,
  fontSize: number
): string => {
  const pathObj = glyph.getPath(x, y, fontSize);
  const cmds: OTCommand[] = pathObj.commands ?? [];
  let d = "";

  for (const c of cmds) {
    switch (c.type) {
      case "M":
        d += `M ${c.x} ${c.y} `;
        break;
      case "L":
        d += `L ${c.x} ${c.y} `;
        break;
      case "Q":
        d += `Q ${c.x1} ${c.y1} ${c.x} ${c.y} `;
        break;
      case "C":
        d += `C ${c.x1} ${c.y1} ${c.x2} ${c.y2} ${c.x} ${c.y} `;
        break;
      case "Z":
        d += "Z ";
        break;
    }
  }
  return d.trim();
};

type Align = "left" | "center" | "right";

interface HandwritingTextProps {
  text: string;
  fontUrl?: string;
  fontSize?: number;
  color?: string;
  lineHeight?: number;
  letterSpacing?: number;
  wordSpacing?: number;
  align?: Align;
  
  // 애니메이션 설정
  duration?: number;      // 전체 애니메이션 시간 (초)
  delay?: number;         // 시작 전 딜레이 (초)
  strokeWidth?: number;   // 펜 두께 (획 애니메이션용)
  
  // 스타일
  shadow?: string;        // drop-shadow 값
  className?: string;
}

const DEFAULT_FONT_URL = "/fonts/DancingScript-Regular.ttf";

export const HandwritingText: React.FC<HandwritingTextProps> = ({
  text,
  fontUrl = DEFAULT_FONT_URL,
  fontSize = 64,
  color = "#ffffff",
  lineHeight = 1.25,
  letterSpacing = 0,
  wordSpacing = 14,
  align = "center",
  
  duration = 2.5,
  delay = 0.3,
  strokeWidth,
  
  shadow = "0px 4px 5px rgba(0, 0, 0, 1)",
  className = ""
}) => {
  const [font, setFont] = useState<Font | null>(null);
  const [pathData, setPathData] = useState<{ d: string; length: number }[]>([]);
  const [fullPaths, setFullPaths] = useState<string[]>([]);
  const [viewBox, setViewBox] = useState<[number, number, number, number]>([0, 0, 900, 220]);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 유니크 ID
  const uniqueId = useMemo(() => "hw-" + Math.random().toString(36).slice(2), []);

  // 자동 strokeWidth 계산 (폰트 크기의 일정 비율)
  const autoStrokeWidth = useMemo(() => {
    return strokeWidth ?? Math.max(2, fontSize * 0.06);
  }, [strokeWidth, fontSize]);

  // Intersection Observer로 뷰포트 진입 감지
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // 폰트 로드
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const res = await fetch(fontUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${fontUrl}`);
        const buf = await res.arrayBuffer();

        const sig = new TextDecoder().decode(new Uint8Array(buf.slice(0, 12)));
        if (sig.startsWith("<!DO") || sig.startsWith("<html")) {
          throw new Error("Got HTML instead of font");
        }

        const f = opentype.parse(buf);
        if (!canceled) setFont(f);
      } catch (e) {
        console.error("Font load error", e);
      }
    })();
    return () => { canceled = true; };
  }, [fontUrl]);

  // 텍스트 → 경로 변환
  useEffect(() => {
    if (!font) return;

    const lines = text.split("\n");
    const unitsPerEm = font.unitsPerEm ?? 1000;
    const scale = fontSize / unitsPerEm;
    const lineGap = fontSize * lineHeight;

    const lineWidths = lines.map((line) => {
      let w = 0;
      for (const ch of line) {
        if (ch === " ") {
          w += wordSpacing;
          continue;
        }
        const g = font.charToGlyph(ch);
        w += charAdvancePx(font, g, ch, fontSize, scale) + letterSpacing;
      }
      return w;
    });

    const maxWidth = Math.max(...lineWidths, 1);
    const height = Math.max(lines.length * lineGap, fontSize * 1.4);

    const startXFor = (w: number) => {
      if (align === "left") return 0;
      if (align === "right") return maxWidth - w;
      return (maxWidth - w) / 2;
    };

    const allContours: { d: string; length: number }[] = [];
    const allFullPaths: string[] = [];

    lines.forEach((line, rowIndex) => {
      let x = startXFor(lineWidths[rowIndex]);
      const y = (rowIndex + 1) * lineGap;
      
      for (const ch of line) {
        if (ch === " ") {
          x += wordSpacing;
          continue;
        }
        const g = font.charToGlyph(ch);
        
        // 컨투어별 경로 (애니메이션용)
        const contours = glyphToContoursD(g, x, y, fontSize);
        contours.forEach(d => {
          // 대략적인 경로 길이 추정
          const length = estimatePathLength(d);
          allContours.push({ d, length });
        });
        
        // 전체 경로 (fill용)
        const fullPath = glyphToFullPath(g, x, y, fontSize);
        if (fullPath) allFullPaths.push(fullPath);
        
        x += charAdvancePx(font, g, ch, fontSize, scale) + letterSpacing;
      }
    });

    setPathData(allContours);
    setFullPaths(allFullPaths);
    setViewBox([
      -Math.ceil(maxWidth * 0.06),
      -Math.ceil(fontSize * 0.35),
      Math.ceil(maxWidth * 1.12),
      Math.ceil(height * 1.25)
    ]);
  }, [font, text, fontSize, lineHeight, letterSpacing, wordSpacing, align]);

  // 각 경로의 애니메이션 타이밍 계산
  const totalLength = useMemo(() => {
    return pathData.reduce((sum, p) => sum + p.length, 0);
  }, [pathData]);

  const getAnimationTiming = (index: number) => {
    let accumulatedLength = 0;
    for (let i = 0; i < index; i++) {
      accumulatedLength += pathData[i].length;
    }
    
    const startRatio = accumulatedLength / totalLength;
    const endRatio = (accumulatedLength + pathData[index].length) / totalLength;
    
    const pathDelay = delay + startRatio * duration;
    const pathDuration = (endRatio - startRatio) * duration;
    
    return { pathDelay, pathDuration: Math.max(pathDuration, 0.05) };
  };

  if (!font || pathData.length === 0) {
    return <div className={className} style={{ minHeight: fontSize * lineHeight }} />;
  }

  return (
    <div ref={containerRef} className={className}>
      <svg
        viewBox={viewBox.join(" ")}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        style={{ filter: shadow ? `drop-shadow(${shadow})` : undefined }}
      >
        <defs>
          {/* 클립 마스크: 애니메이션 stroke가 지나간 영역만 보이게 */}
          <clipPath id={`${uniqueId}-clip`}>
            {pathData.map((p, i) => {
              const { pathDelay, pathDuration } = getAnimationTiming(i);
              return (
                <path
                  key={i}
                  d={p.d}
                  fill="none"
                  stroke="white"
                  strokeWidth={autoStrokeWidth * 12}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: p.length,
                    strokeDashoffset: isVisible ? 0 : p.length,
                    transition: isVisible 
                      ? `stroke-dashoffset ${pathDuration}s ease-out ${pathDelay}s`
                      : 'none',
                  }}
                />
              );
            })}
          </clipPath>
        </defs>

        {/* 채워진 글자 (클립 마스크 적용) */}
        <g clipPath={`url(#${uniqueId}-clip)`}>
          {fullPaths.map((d, i) => (
            <path
              key={`fill-${i}`}
              d={d}
              fill={color}
              stroke="none"
            />
          ))}
        </g>

        {/* 펜 획 효과 (선택적) - 글자 위에 얇은 선으로 쓰는 느낌 */}
        <g fill="none" stroke={color} strokeWidth={autoStrokeWidth * 0.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.3}>
          {pathData.map((p, i) => {
            const { pathDelay, pathDuration } = getAnimationTiming(i);
            return (
              <path
                key={`stroke-${i}`}
                d={p.d}
                style={{
                  strokeDasharray: p.length,
                  strokeDashoffset: isVisible ? 0 : p.length,
                  transition: isVisible
                    ? `stroke-dashoffset ${pathDuration}s ease-out ${pathDelay}s`
                    : 'none',
                }}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
};

// 유틸 함수들
function charAdvancePx(
  f: Font,
  glyph: Glyph,
  ch: string,
  fontSizePx: number,
  scale: number
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyGlyph = glyph as any;
  const adv =
    typeof anyGlyph.advanceWidth === "number"
      ? anyGlyph.advanceWidth * scale
      : f.getAdvanceWidth(ch, fontSizePx);
  return Number.isFinite(adv) ? adv : 0;
}

// 경로 길이 대략 추정 (정확한 계산은 비용이 크므로 간단히)
function estimatePathLength(d: string): number {
  const commands = d.match(/[MLQCZ][^MLQCZ]*/gi) || [];
  let length = 0;
  let lastX = 0, lastY = 0;
  
  for (const cmd of commands) {
    const type = cmd[0].toUpperCase();
    const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    
    if (type === 'M' && nums.length >= 2) {
      lastX = nums[0];
      lastY = nums[1];
    } else if (type === 'L' && nums.length >= 2) {
      const dx = nums[0] - lastX;
      const dy = nums[1] - lastY;
      length += Math.sqrt(dx * dx + dy * dy);
      lastX = nums[0];
      lastY = nums[1];
    } else if (type === 'Q' && nums.length >= 4) {
      // Quadratic bezier - 대략적인 길이
      const dx = nums[2] - lastX;
      const dy = nums[3] - lastY;
      length += Math.sqrt(dx * dx + dy * dy) * 1.2;
      lastX = nums[2];
      lastY = nums[3];
    } else if (type === 'C' && nums.length >= 6) {
      // Cubic bezier - 대략적인 길이
      const dx = nums[4] - lastX;
      const dy = nums[5] - lastY;
      length += Math.sqrt(dx * dx + dy * dy) * 1.3;
      lastX = nums[4];
      lastY = nums[5];
    }
  }
  
  return Math.max(length, 10);
}

export default HandwritingText;
