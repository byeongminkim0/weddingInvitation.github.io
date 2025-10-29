import { Route, Routes, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function App() {
  const [countdown, setCountdown] = useState('')
  const location = useLocation()

  useEffect(() => {
    const weddingDate = new Date('2026-06-13T14:00:00+09:00')

    const updateCountdown = () => {
      const now = new Date()
      const diff = weddingDate.getTime() - now.getTime()

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

        setCountdown(`D-${days}일 ${hours}시간 ${minutes}분`)
      } else {
        setCountdown('오늘은 우리의 결혼식입니다 💕')
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 60000) // 1분마다 업데이트

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="wedding-app">
      {/* 플로팅 하트 애니메이션 - 개수 줄임 */}
      <div className="floating-hearts">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="heart"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${6 + Math.random() * 4}s`
            }}
          >
            ❤️
          </div>
        ))}
      </div>

      {/* 웨딩 헤더 */}
      <header className="wedding-header">
        <h1 className="couple-names">
          혜민 <span className="heart-divider">❤️</span> 병민
        </h1>
        <p className="wedding-date">2026년 6월 13일 토요일 오후 2시</p>
        <div className="countdown">{countdown}</div>
      </header>

      {/* 네비게이션 */}
      <nav className="navigation">
        <div className="nav-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            🏠 청첩장
          </Link>
          <Link
            to="/info"
            className={`nav-link ${location.pathname === '/info' ? 'active' : ''}`}
          >
            📅 일정안내
          </Link>
          <Link
            to="/map"
            className={`nav-link ${location.pathname === '/map' ? 'active' : ''}`}
          >
            🗺️ 오시는 길
          </Link>
        </div>
      </nav>

      {/* 메인 컨텐츠 */}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/info" element={<WeddingInfo />} />
          <Route path="/map" element={<Map />} />
        </Routes>
      </main>
    </div>
  )
}

function Home() {
  return (
    <div className="content-section">
      <h2 className="section-title">💕 우리의 결혼식에 초대합니다</h2>
      <div className="wedding-info">
        <div className="info-item">
          <div className="info-label">📅 날짜</div>
          <div className="info-value">2026년 6월 13일 토요일</div>
        </div>
        <div className="info-item">
          <div className="info-label">🕐 시간</div>
          <div className="info-value">오후 2시</div>
        </div>
        <div className="info-item">
          <div className="info-label">🏛️ 장소</div>
          <div className="info-value">제이오스티엘</div>
        </div>
        <div className="info-item">
          <div className="info-label">💌 초대의 말</div>
          <div className="info-value">
            서로의 마음을 나누며<br />
            새로운 가정을 이루게 된 혜민과 병민입니다.<br />
            여러분의 따뜻한 마음과 축복으로<br />
            아름다운 결혼식을 만들어가고 싶습니다.<br />
            바쁘신 중에도 참석해 주시어<br />
            우리의 소중한 순간을 함께해 주시면 감사하겠습니다.
          </div>
        </div>
      </div>
    </div>
  )
}

function WeddingInfo() {
  return (
    <div className="content-section">
      <h2 className="section-title">📅 결혼식 일정</h2>
      <div className="wedding-info">
        <div className="info-item">
          <div className="info-label">🕐 11:30</div>
          <div className="info-value">하객 입장</div>
        </div>
        <div className="info-item">
          <div className="info-label">🕐 12:00</div>
          <div className="info-value">결혼식 시작</div>
        </div>
        <div className="info-item">
          <div className="info-label">🕐 13:00</div>
          <div className="info-value">식사 및 축하</div>
        </div>
        <div className="info-item">
          <div className="info-label">💝 준비사항</div>
          <div className="info-value">
            • 정장 또는 단정한 복장<br />
            • 축의금은 현금으로 준비해 주세요<br />
            • 주차는 건물 내 지하주차장을 이용하세요
          </div>
        </div>
      </div>
    </div>
  )
}

function Map() {
  return (
    <div className="content-section">
      <h2 className="section-title">🗺️ 오시는 길</h2>
      <div className="wedding-info">
        <div className="info-item">
          <div className="info-label">📍 주소</div>
          <div className="info-value">제이오스티엘 (상세주소)</div>
        </div>
        <div className="info-item">
          <div className="info-label">🚇 지하철</div>
          <div className="info-value">
            • 1호선: XX역 3번 출구에서 도보 5분<br />
            • 2호선: XX역 1번 출구에서 도보 8분
          </div>
        </div>
        <div className="info-item">
          <div className="info-label">🚌 버스</div>
          <div className="info-value">
            • XX버스: XX정류장 하차<br />
            • XX버스: XX정류장 하차
          </div>
        </div>
        <div className="info-item">
          <div className="info-label">🚗 자가용</div>
          <div className="info-value">
            • 건물 내 지하주차장 이용 가능<br />
            • 주차비는 면제됩니다
          </div>
        </div>
      </div>

      <div className="map-container">
        <iframe
          title="wedding-venue-map"
          src="https://map.naver.com/v5/entry/place/<장소ID>?c=..."
          className="map-iframe"
          loading="lazy"
        />
      </div>
    </div>
  )
}
