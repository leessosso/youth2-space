"use client";

import { useEffect, useState } from "react";
import { getToken, deleteToken, getMessaging, isSupported } from "firebase/messaging";
import { Button, Card, CardHeader } from "@/components/ui";
import { getClientFirebaseApp, getWebPushVapidKey } from "@/lib/firebase-client";
import {
  registerPushSubscription,
  unregisterPushSubscription,
} from "@/app/push-actions";

type Status = "unsupported" | "unconfigured" | "denied" | "off" | "on";

function hasNotificationApi(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

function hasServiceWorkerApi(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

function initialStatus(configured: boolean, initialSubscribed: boolean): Status {
  if (!configured) return "unconfigured";
  if (typeof window === "undefined") return initialSubscribed ? "on" : "off";
  if (!hasNotificationApi() || !hasServiceWorkerApi()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (initialSubscribed && Notification.permission === "granted") return "on";
  return "off";
}

export function PushNotificationSettings({
  configured,
  initialSubscribed,
}: {
  configured: boolean;
  initialSubscribed: boolean;
}) {
  const [status, setStatus] = useState<Status>(() => initialStatus(configured, initialSubscribed));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    void (async () => {
      try {
        const supported = await isSupported();
        if (cancelled) return;
        if (!supported) {
          setStatus("unsupported");
          return;
        }
        if (!hasNotificationApi() || !hasServiceWorkerApi()) {
          setStatus("unsupported");
        }
      } catch {
        if (!cancelled) setStatus("unsupported");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configured]);

  async function enablePush() {
    setBusy(true);
    setMessage(null);
    try {
      if (!configured) {
        setStatus("unconfigured");
        return;
      }
      const supported = await isSupported();
      if (!supported) {
        setStatus("unsupported");
        setMessage("이 브라우저에서는 웹 푸시를 지원하지 않습니다.");
        return;
      }
      if (!hasNotificationApi()) {
        setStatus("unsupported");
        setMessage("이 브라우저에서는 웹 푸시를 지원하지 않습니다.");
        return;
      }
      if (!hasServiceWorkerApi()) {
        setStatus("unsupported");
        setMessage("이 브라우저에서는 서비스 워커를 사용할 수 없습니다.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        setMessage("브라우저에서 알림 권한을 허용해 주세요.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
        scope: "/",
      });
      await navigator.serviceWorker.ready;

      const messaging = getMessaging(getClientFirebaseApp());
      const vapidKey = getWebPushVapidKey();
      if (!vapidKey) throw new Error("VAPID 키가 없습니다.");

      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });
      if (!token) {
        setMessage("FCM 토큰을 받지 못했습니다. Firebase 콘솔 설정을 확인해 주세요.");
        return;
      }

      const res = await registerPushSubscription(token, navigator.userAgent);
      if (res.error) {
        setMessage(res.error);
        return;
      }
      setStatus("on");
      setMessage("알림이 켜졌습니다.");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "알림 설정에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await unregisterPushSubscription();
      if (res.error) {
        setMessage(res.error);
        return;
      }
      if (configured) {
        try {
          const messaging = getMessaging(getClientFirebaseApp());
          await deleteToken(messaging);
        } catch {
          /* 서버 구독 삭제가 우선 */
        }
      }
      setStatus("off");
      setMessage("알림이 꺼졌습니다.");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "알림 해제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "unconfigured") {
    return null;
  }

  if (status === "unsupported") {
    return (
      <Card>
        <CardHeader title="웹 푸시 알림" subtitle="돌봄카드 등 중요 알림 (로그인 사용자)" />
        <p className="px-4 py-3 text-sm text-muted-foreground sm:px-5">
          이 브라우저에서는 웹 푸시를 지원하지 않습니다. iPhone은 홈 화면에 추가한 PWA에서만 알림이
          동작합니다.
        </p>
        {message && <p className="px-4 pb-3 text-sm text-stone-700 sm:px-5">{message}</p>}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="웹 푸시 알림"
        subtitle="돌봄카드 등 중요 알림 · 카카오톡과 별도로 동작합니다"
      />
      <div className="space-y-3 px-4 py-3 sm:px-5">
        <p className="text-sm text-stone-600">
          {status === "on" && "현재 이 기기에서 알림을 받도록 등록되어 있습니다."}
          {status === "off" && "알림이 꺼져 있습니다. 켜면 돌봄카드 등 푸시를 받을 수 있습니다."}
          {status === "denied" &&
            "브라우저에서 알림이 차단되어 있습니다. 주소창 옆 사이트 설정에서 알림을 허용한 뒤 다시 시도해 주세요."}
        </p>
        {message && <p className="text-sm text-stone-700">{message}</p>}
        <div className="flex flex-wrap gap-2">
          {status !== "on" && status !== "denied" && (
            <Button type="button" disabled={busy} onClick={() => void enablePush()}>
              알림 켜기
            </Button>
          )}
          {status === "on" && (
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void disablePush()}>
              알림 끄기
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          iOS Safari는 홈 화면에 「2청년회」을 추가한 PWA에서만 웹 푸시가 동작합니다.
        </p>
      </div>
    </Card>
  );
}
