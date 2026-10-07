interface Props {
  launchUrl: string
  title: string
  onClose: () => void
}

export default function GameLauncher({ launchUrl, title, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Thin top bar with close */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-forest/90 border-b border-white/10">
        <span className="font-cinzel text-gold text-xs uppercase tracking-widest">{title}</span>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-gold transition-colors font-cinzel text-sm uppercase tracking-widest flex items-center gap-2"
          aria-label="Close game"
        >
          <span>✕</span>
          <span className="hidden sm:inline">Close</span>
        </button>
      </div>

      {/* Game iframe */}
      <iframe
        src={`${import.meta.env.VITE_GAME_CLIENT_URL ?? 'http://localhost:3002'}${launchUrl}`}
        title={title}
        className="flex-1 w-full border-0"
        allow="fullscreen"
      />
    </div>
  )
}
