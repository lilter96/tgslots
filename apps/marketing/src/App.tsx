import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import Lobby from './components/Lobby'
import GamePresentationPage from './components/GamePresentationPage'
import { gameRegistry } from './games/registry'

function GameRoute() {
  const { slug } = useParams<{ slug: string }>()
  const game = slug ? gameRegistry[slug] : undefined
  if (!game) return <Navigate to="/" replace />
  return <GamePresentationPage game={game} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Lobby />} />
      <Route path="/games/:slug" element={<GameRoute />} />
    </Routes>
  )
}
