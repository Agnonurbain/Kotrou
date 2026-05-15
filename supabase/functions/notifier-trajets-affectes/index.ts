import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") || "mailto:kotrou@sils.ci";

// ── Base64 URL utilities ──────────────────────────────────
function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const pad = "=".repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function concat(...bufs: Uint8Array[]): Uint8Array {
  const len = bufs.reduce((s, b) => s + b.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const b of bufs) {
    out.set(b, off);
    off += b.length;
  }
  return out;
}

// ── HKDF (Web Crypto) ────────────────────────────────────
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  len: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    len * 8,
  );
  return new Uint8Array(bits);
}

// ── VAPID JWT (ES256) ─────────────────────────────────────
async function vapidAuth(endpoint: string): Promise<string> {
  const url = new URL(endpoint);
  const aud = `${url.protocol}//${url.host}`;

  const header = b64url(
    new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })),
  );
  const payload = b64url(
    new TextEncoder().encode(
      JSON.stringify({
        aud,
        exp: Math.floor(Date.now() / 1000) + 43200,
        sub: VAPID_EMAIL,
      }),
    ),
  );
  const unsigned = `${header}.${payload}`;

  const pubBytes = b64urlDecode(VAPID_PUBLIC_KEY);
  const privBytes = b64urlDecode(VAPID_PRIVATE_KEY);

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: b64url(pubBytes.slice(1, 33)),
    y: b64url(pubBytes.slice(33, 65)),
    d: b64url(privBytes),
  };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsigned),
  );

  return `vapid t=${unsigned}.${b64url(sig)}, k=${VAPID_PUBLIC_KEY}`;
}

// ── Web Push encryption (RFC 8291 + RFC 8188) ─────────────
async function encryptPayload(
  payloadStr: string,
  p256dh: string,
  authKey: string,
): Promise<Uint8Array> {
  const clientPub = b64urlDecode(p256dh);
  const authSecret = b64urlDecode(authKey);

  const serverKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const serverPubRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeys.publicKey),
  );

  const clientKeyObj = await crypto.subtle.importKey(
    "raw",
    clientPub,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientKeyObj },
      serverKeys.privateKey,
      256,
    ),
  );

  const webpushInfo = concat(
    new TextEncoder().encode("WebPush: info\0"),
    clientPub,
    serverPubRaw,
  );
  const ikm = await hkdf(authSecret, ecdhSecret, webpushInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(
    salt,
    ikm,
    new TextEncoder().encode("Content-Encoding: aes128gcm\0"),
    16,
  );
  const nonce = await hkdf(
    salt,
    ikm,
    new TextEncoder().encode("Content-Encoding: nonce\0"),
    12,
  );

  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, [
    "encrypt",
  ]);
  const plainBytes = new TextEncoder().encode(payloadStr);
  const padded = concat(plainBytes, new Uint8Array([2]));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded),
  );

  const header = new Uint8Array(86);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = 65;
  header.set(serverPubRaw, 21);

  return concat(header, encrypted);
}

// ── Send push notification ────────────────────────────────
async function sendPush(
  sub: { endpoint: string; p256dh: string; auth_key: string },
  payloadStr: string,
): Promise<Response> {
  const auth = await vapidAuth(sub.endpoint);
  const body = await encryptPayload(payloadStr, sub.p256dh, sub.auth_key);

  return fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "3600",
      Urgency: "high",
    },
    body,
  });
}

// ── Message templates ─────────────────────────────────────
const MESSAGES: Record<string, { titre: string; corps: string }> = {
  danger: {
    titre: "Zone dangereuse sur ton trajet",
    corps: "Un probleme a ete signale pres de ton trajet habituel.",
  },
  fermeture: {
    titre: "Gare fermee sur ton trajet",
    corps: "Une gare de ton trajet habituel est signalee comme fermee.",
  },
  accident: {
    titre: "Accident sur ton trajet",
    corps: "Un accident a ete signale sur ton itineraire habituel.",
  },
};

// ── Main handler ──────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const { signalement_id, type, lat, lng } = await req.json();

    const { data: trajets, error: errTrajets } = await supabase.rpc(
      "trajets_affectes_par_signalement",
      { signal_coords: `POINT(${lng} ${lat})`, rayon_metres: 500 },
    );

    if (errTrajets) throw errTrajets;
    if (!trajets?.length) {
      return Response.json({ notifies: 0 });
    }

    const userIds = [...new Set(trajets.map((t: any) => t.user_id))];

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth_key")
      .in("user_id", userIds);

    if (!subscriptions?.length) {
      return Response.json({ notifies: 0, raison: "aucun abonnement push" });
    }

    const msg = MESSAGES[type] ?? MESSAGES["danger"];
    let nbEnvoyes = 0;

    for (const sub of subscriptions) {
      const userTrajets = trajets.filter(
        (t: any) => t.user_id === sub.user_id,
      );
      const nomTrajets = userTrajets.map((t: any) => t.nom).join(", ");

      const payload = JSON.stringify({
        titre: msg.titre,
        corps: `${msg.corps} Trajet : ${nomTrajets}`,
        icone: "/icons/icon-192.png",
        url: "/trajets-favoris",
        data: {
          signalement_id,
          type,
          trajet_ids: userTrajets.map((t: any) => t.trajet_id),
        },
      });

      try {
        const res = await sendPush(sub, payload);

        if (res.status === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
          continue;
        }

        if (res.ok) {
          for (const trajet of userTrajets) {
            await supabase.from("notifications_log").insert({
              user_id: sub.user_id,
              trajet_id: trajet.trajet_id,
              signalement_id,
              titre: msg.titre,
              corps: `${msg.corps} Trajet : ${nomTrajets}`,
            });
          }
          nbEnvoyes++;
        }
      } catch (err) {
        console.error("Push error for", sub.endpoint, err);
      }
    }

    return Response.json({ notifies: nbEnvoyes });
  } catch (err) {
    console.error("Edge Function error:", err);
    return Response.json({ erreur: String(err) }, { status: 500 });
  }
});
