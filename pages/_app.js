import '../styles/globals.css'
import DevelopmentNav from '../components/DevelopmentNav'

export default function App({ Component, pageProps }) {
  return (
    <>
      <DevelopmentNav />
      <Component {...pageProps} />
    </>
  )
}