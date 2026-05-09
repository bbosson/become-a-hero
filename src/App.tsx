import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Upload from './pages/Upload'
import Processing from './pages/Processing'
import Intro from './pages/Intro'
import Play from './pages/Play'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/processing/:jobId" element={<Processing />} />
      <Route path="/play/:bookId/intro" element={<Intro />} />
      <Route path="/play/:bookId/:nodeNumber" element={<Play />} />
    </Routes>
  )
}
