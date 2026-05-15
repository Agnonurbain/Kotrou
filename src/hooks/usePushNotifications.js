import { supabase } from '../supabase';
import { useAuth } from './useAuth';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const { utilisateur } = useAuth();

  const estSupporte = () =>
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  const sAbonner = async () => {
    if (!estSupporte() || !utilisateur) return false;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const { endpoint, keys } = subscription.toJSON();
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: utilisateur.id,
          endpoint,
          p256dh: keys.p256dh,
          auth_key: keys.auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: 'endpoint' },
      );

    return !error;
  };

  const seDesabonner = async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    await subscription.unsubscribe();
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', subscription.endpoint);
  };

  const estAbonne = async () => {
    if (!estSupporte()) return false;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  };

  return { estSupporte, sAbonner, seDesabonner, estAbonne };
}
