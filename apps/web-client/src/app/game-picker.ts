export class GamePicker {
  private readonly _overlay: HTMLDivElement

  constructor(
    games: ReadonlyArray<{ readonly id: string; readonly displayName: string }>,
    onSelect: (gameId: string) => void,
  ) {
    this._overlay = document.createElement('div')
    this._overlay.style.cssText = [
      'position:fixed;inset:0;z-index:9999',
      'background:#0a0000',
      'display:flex;flex-direction:column;align-items:center;justify-content:center',
      'font-family:Cinzel,serif',
    ].join(';')

    const title = document.createElement('h1')
    title.textContent = 'SELECT A GAME'
    title.style.cssText =
      'color:#ffe066;font-size:2rem;letter-spacing:0.2em;margin:0 0 2.5rem;font-weight:700;text-transform:uppercase'
    this._overlay.appendChild(title)

    const grid = document.createElement('div')
    grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:1.5rem;justify-content:center'

    for (const game of games) {
      const card = document.createElement('button')
      card.textContent = game.displayName
      card.style.cssText = [
        'background:#1a0505;border:2px solid #cc1a1a;border-radius:8px',
        'color:#ffe066;font-family:Cinzel,serif;font-size:1.2rem;font-weight:700',
        'letter-spacing:0.1em;text-transform:uppercase',
        'padding:1.5rem 3rem;min-width:220px;cursor:pointer',
        'transition:background 0.15s,border-color 0.15s,transform 0.15s',
      ].join(';')

      card.addEventListener('mouseenter', () => {
        card.style.background = '#3a0808'
        card.style.borderColor = '#ff4444'
        card.style.transform = 'scale(1.05)'
      })
      card.addEventListener('mouseleave', () => {
        card.style.background = '#1a0505'
        card.style.borderColor = '#cc1a1a'
        card.style.transform = ''
      })
      card.addEventListener('click', () => {
        history.pushState({}, '', `?game=${encodeURIComponent(game.id)}`)
        this.destroy()
        onSelect(game.id)
      })

      grid.appendChild(card)
    }

    this._overlay.appendChild(grid)
    document.body.appendChild(this._overlay)
  }

  destroy(): void {
    this._overlay.remove()
  }
}
