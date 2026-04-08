import homeLogo from '../assets/Logo_new_nev_home.svg'
import './GlobalLoader.css'

function GlobalLoader({ fading = false }) {
  return (
    <div className={`global-loader-overlay${fading ? ' global-loader-overlay-fading' : ''}`} role="status" aria-live="polite" aria-label="Loading content">
      <div className="global-loader-card">
        <img src={homeLogo} alt="Nev Koder" className="global-loader-logo" data-loader-ignore="true" />
        <div className="global-loader-spinner" aria-hidden="true" />
        <p>Loading...</p>
      </div>
    </div>
  )
}

export default GlobalLoader
