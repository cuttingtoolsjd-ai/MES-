import '../styles/globals.css'
import { Inter, Poppins } from 'next/font/google'
import { useEffect } from 'react'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Persist auth data across browser refreshes
    // Store in both localStorage and sessionStorage for redundancy
    const currentUser = localStorage.getItem('currentUser')
    if (currentUser) {
      try {
        sessionStorage.setItem('currentUser', currentUser)
        // Also store with timestamp to detect sessions
        sessionStorage.setItem('authTimestamp', new Date().toISOString())
      } catch (e) {
        console.warn('Could not persist session:', e)
      }
    }

    // Register service worker for PWA (non-blocking)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {})
    }
  }, [])

  return (
    <div className={`${inter.variable} ${poppins.variable}`}>
      <Component {...pageProps} />
    </div>
  )
}