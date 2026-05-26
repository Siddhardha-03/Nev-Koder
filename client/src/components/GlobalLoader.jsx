import './GlobalLoader.css'

function GlobalLoader({ fading = false }) {
  return (
    <div className={`global-loader-overlay${fading ? ' global-loader-overlay-fading' : ''}`} role="status" aria-live="polite" aria-label="Loading content">
      <div className="global-loader-card">
        <div className="global-loader-brand" aria-hidden="true">hey koder!!</div>
        <div className="global-loader-spinner" aria-hidden="true" />
        <p>Loading...</p>
      </div>
    </div>
  )
}

export default GlobalLoader
