import { Route, Routes, Link } from 'react-router-dom'

export default function App() {
  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>혜민 ❤️ 병민 모바일 청첩장</h1>
      <nav style={{ margin: '1rem 0' }}>
        <Link to="/">Home</Link> | <Link to="/map">오시는 길</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<Map />} />
      </Routes>
    </div>
  )
}

function Home() {
  return (
    <section>
      <p>2026년 6월 13일, 함께해 주세요 💌</p>
      <p>D-XXX</p>
    </section>
  )
}

function Map() {
  return (
    <section>
      <h2>오시는 길</h2>
      <iframe
        title="map"
        src="https://map.naver.com/v5/search/제이오스티엘"
        style={{ width: '100%', height: 400, border: 0 }}
        loading="lazy"
      />
    </section>
  )
}
