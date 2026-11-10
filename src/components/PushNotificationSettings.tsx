import { useEffect, useState } from 'react'
import { BellRing, BellOff, Smartphone, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Props = { organizationId: string; factoryId: string; userId: string }

function decodeBase64Url(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from(raw, char => char.charCodeAt(0))
}

export default function PushNotificationSettings({ organizationId, factoryId, userId }: Props) {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

  useEffect(() => {
    const available = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setSupported(available)
    if (!available) return
    setPermission(Notification.permission)
    let active = true
    navigator.serviceWorker.ready.then(async registration => {
      const subscription = await registration.pushManager.getSubscription()
      if (active) setEnabled(Boolean(subscription))
    }).catch(() => { if (active) setMessage('Could not check this device subscription.') })
    return () => { active = false }
  }, [])

  async function enablePush() {
    if (!supabase || !organizationId || !factoryId || !vapidKey) {
      setMessage('Push setup is incomplete. The VAPID public key must be configured in the app deployment.')
      return
    }
    setBusy(true); setMessage('')
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') throw new Error('Notification permission was not granted.')
      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeBase64Url(vapidKey)
      })
      const json = subscription.toJSON()
      const keys = json.keys
      if (!json.endpoint || !keys?.p256dh || !keys.auth) throw new Error('The browser returned an incomplete push subscription.')
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: userId, organization_id: organizationId, factory_id: factoryId,
        endpoint: json.endpoint, p256dh: keys.p256dh, auth: keys.auth,
        device_label: navigator.userAgent.slice(0, 180), is_active: true, updated_at: new Date().toISOString()
      }, { onConflict: 'endpoint' })
      if (error) throw error
      setEnabled(true)
      setMessage('This device is subscribed. Push delivery will start once the server sender is configured.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not enable push notifications.')
    } finally { setBusy(false) }
  }

  async function disablePush() {
    if (!supabase) return
    setBusy(true); setMessage('')
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        const endpoint = subscription.endpoint
        const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', userId)
        if (error) throw error
        await subscription.unsubscribe()
      }
      setEnabled(false)
      setMessage('Push notifications are disabled on this device.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not disable push notifications.')
    } finally { setBusy(false) }
  }

  return <section className="panel data-panel push-settings">
    <div className="section-heading"><div><h2>Mobile push notifications</h2><p>Receive important factory alerts on this device</p></div><span className="period-pill"><Smartphone size={15}/> This device</span></div>
    <div className="push-status"><span className="push-status-icon">{enabled ? <BellRing/> : <BellOff/>}</span><div><strong>{enabled ? 'Device subscribed' : 'Push notifications off'}</strong><p>{supported ? 'Browser support detected' : 'This browser does not support Web Push notifications.'} · Permission: {permission}</p></div></div>
    {!vapidKey && <p className="field-hint">Deployment configuration is still required: VITE_VAPID_PUBLIC_KEY.</p>}
    <div className="push-explainer"><ShieldCheck size={18}/><span>Subscriptions are linked to your signed-in account and selected factory. You can disable this device at any time.</span></div>
    {supported && (enabled
      ? <button className="secondary-btn" onClick={disablePush} disabled={busy}>{busy ? 'Updating…' : 'Disable on this device'}</button>
      : <button className="primary-btn" onClick={enablePush} disabled={busy || !organizationId || !factoryId}>{busy ? 'Enabling…' : 'Enable push notifications'}</button>)}
    {message && <p className="form-message" role="status">{message}</p>}
  </section>
}
