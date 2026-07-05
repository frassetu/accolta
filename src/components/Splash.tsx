'use client'

import { useEffect } from 'react'

interface Props {
  onFinish: () => void
}

// Durée d'affichage de l'écran de lancement avant de basculer sur l'appli.
const SPLASH_DURATION_MS = 2500

export default function Splash({ onFinish }: Props) {
  useEffect(() => {
    const timer = setTimeout(onFinish, SPLASH_DURATION_MS)
    return () => clearTimeout(timer)
  }, [onFinish])

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center gap-6 fade-in">
      <img src="/icon-192.png" alt="" className="w-32 h-32 rounded-2xl" />
      <img src="/logo-wordmark.png" alt="Vogliu Cantà !" className="w-full max-w-[420px] h-auto px-6" />
    </div>
  )
}
