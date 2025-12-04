// HeroHandwriting.tsx

import { HandwritingText } from "./Handwritingtext";

type HeroHandwritingProps = {
  variant?: "design1" | "design2";
};

export function HeroHandwriting({ variant = "design1" }: HeroHandwritingProps) {
  if (variant === "design1") {
    // ➜ Figma 첫 번째 시안 레이아웃
    return (
      <div className="absolute bottom-20 left-0 right-0 flex justify-center z-10 px-4 pointer-events-none">
        <div className="relative inline-flex flex-col items-center">
          {/* 예시: 뒷배경 박스 / 라벨 등 피그마 스타일 */}
          <div className="mb-3 rounded-full bg-black/70 px-4 py-1">
            <span className="text-[11px] tracking-[0.2em] text-white">
              WE&apos;RE GETTING MARRIED
            </span>
          </div>

          {/* 실제 필기체 텍스트 */}
          <div className="w-[260px] sm:w-[340px]">
            <HandwritingText
              text={`We're getting\nmarried!`}
              fontSize={80}          // 피그마에 맞게 조절
              fillColor="#ffffff"    // 예: 흰색 필기체
              strokeWidth={0}
              speed={0.6}
              brushWidthFactor={0.08}
              showPen={false}
              penRadius={2}
            />
          </div>

          {/* 서브 텍스트 (예: 이름/날짜) */}
          <p className="mt-2 text-[11px] sm:text-xs tracking-[0.25em] text-white/90 uppercase">
            BYUNGMIN & HYEMIN · 2026.06.13
          </p>
        </div>
      </div>
    );
  }

  // ➜ Figma 두 번째 시안 레이아웃
  return (
    <div className="absolute bottom-24 left-0 right-0 flex justify-center z-10 px-4 pointer-events-none">
      <div className="relative bg-black/60 rounded-2xl px-6 py-4 flex flex-col items-center">
        {/* 위에 작은 캡션 */}
        <p className="text-[11px] tracking-[0.2em] text-white/70 mb-1">
          INVITATION
        </p>

        {/* 필기체 텍스트 */}
        <div className="w-[220px] sm:w-[300px]">
          <HandwritingText
            text={`Hyemin &\nByungmin`}
            fontSize={70}
            fillColor="#ffffff"
            strokeWidth={0}
            speed={0.6}
            brushWidthFactor={0.08}
            showPen={false}
            penRadius={2}
          />
        </div>

        {/* 아래 설명 텍스트 */}
        <p className="mt-2 text-[11px] sm:text-xs text-white/85 text-center leading-relaxed">
          2026.06.13 SAT 2PM<br />
          J:OSTL WEDDING HALL
        </p>
      </div>
    </div>
  );
}
