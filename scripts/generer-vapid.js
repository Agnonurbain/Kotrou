#!/usr/bin/env node

import webpush from 'web-push';

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n=== Cles VAPID generees ===\n');
console.log('# A ajouter dans .env (cle publique exposee au frontend) :');
console.log(`VITE_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`\n# A ajouter dans Supabase Dashboard > Settings > Edge Functions > Secrets :`);
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:kotrou@sils.ci`);
