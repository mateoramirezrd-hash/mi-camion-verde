import { useRegisterSW } from 'virtual:pwa-register/react'

function PWABadge() {
  const period = 60 * 60 * 1000
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (period <= 0) return
      if (registration?.active?.state === 'activated') registerPeriodicSync(period, swUrl, registration)
    },
  })

  if (!offlineReady && !needRefresh) return null

  return (
    <div className="fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-md rounded-2xl bg-forest p-4 text-sm text-white shadow-lg md:bottom-6" role="status">
      <p>{offlineReady ? 'La guía y el calendario quedan disponibles sin conexión.' : 'Hay una versión nueva de la aplicación.'}</p>
      <div className="mt-3 flex gap-2">
        {needRefresh && (
          <button type="button" className="rounded-full bg-gold px-3 py-1 font-bold text-ink" onClick={() => updateServiceWorker(true)}>
            Actualizar
          </button>
        )}
        <button type="button" className="rounded-full bg-white/15 px-3 py-1 font-bold" onClick={() => { setOfflineReady(false); setNeedRefresh(false) }}>
          Cerrar
        </button>
      </div>
    </div>
  )
}

function registerPeriodicSync(period, swUrl, registration) {
  setInterval(async () => {
    if (!navigator.onLine) return
    const resp = await fetch(swUrl, { cache: 'no-store' })
    if (resp?.status === 200) await registration.update()
  }, period)
}

export default PWABadge
