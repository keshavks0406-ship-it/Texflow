self.addEventListener('push', event => {
  let payload = {}
  try { payload = event.data ? event.data.json() : {} } catch { payload = { body: event.data?.text() || 'You have a new factory alert.' } }
  const title = payload.title || 'TexFlow factory alert'
  const options = {
    body: payload.body || 'Open TexFlow to review the latest alert.',
    icon: '/pwa-192.svg',
    badge: '/pwa-192.svg',
    tag: payload.tag || 'texflow-factory-alert',
    data: { url: payload.url || '/?page=notifications' },
    renotify: false
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const client of list) {
      if ('focus' in client) {
        client.navigate(target)
        return client.focus()
      }
    }
    return self.clients.openWindow(target)
  }))
})
