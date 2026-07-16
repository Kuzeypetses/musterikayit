# Kuzeypet Yeni Müşteri Kayıt Formu — Worker Sürümü

Bu paket **Cloudflare Worker + Static Assets** mimarisindedir. Formun HTML/CSS/JS dosyaları `public/` klasöründen yayınlanır; `/api/submit` isteği `src/index.js` içindeki Worker tarafından karşılanır ve Brevo üzerinden e-posta gönderilir.

## GitHub'a yükleme

ZIP dosyasını açın ve içindeki bütün dosya/klasörleri GitHub reposunun köküne yükleyin. Repo kökünde şu dosyalar görünmelidir:

- `package.json`
- `wrangler.jsonc`
- `src/index.js`
- `public/index.html`

Eski statik dosyalar repo kökünde kalmamalıdır. Özellikle eski `index.html`, `app.js` ve `styles.css` dosyalarını kökten silin; bunların yeni konumu `public/` klasörüdür.

## Cloudflare Git bağlantısı

Cloudflare > Workers & Pages > Create application > Import a repository yolunu kullanın.

- **Project name:** `musterikayit`
- **Build command:** `npm install`
- **Deploy command:** `npx wrangler deploy`
- **Root directory:** boş / repo kökü

Ardından **Deploy** seçeneğine basın.

## Brevo değişkenleri

İlk Worker deploy edildikten sonra:

Cloudflare > Workers & Pages > `musterikayit` > **Settings > Variables and Secrets**

Aşağıdakileri ekleyin:

1. `BREVO_API_KEY` — **Secret** olarak
2. `BREVO_SENDER_EMAIL` — Brevo'da doğrulanmış gönderici e-posta adresi
3. `BREVO_SENDER_NAME` — örneğin `Kuzeypet Cari Evrak`

Değişkenleri kaydettikten sonra Cloudflare yeniden deploy isteyebilir. İsterse **Deploy** veya **Create deployment** ile tekrar yayınlayın.

## Gönderim adresi

Form e-postaları sabit olarak şu adrese gönderilir:

`carievrak@kuzeypet.com`

## Dosya yapısı

```text
musterikayit/
├── public/
│   ├── assets/
│   │   └── kuzeypet-logo.png
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── src/
│   └── index.js
├── package.json
├── wrangler.jsonc
├── .assetsignore
└── .gitignore
```

## Önemli

Brevo API anahtarını hiçbir zaman `app.js`, HTML veya GitHub içine yazmayın. Yalnızca Cloudflare **Secret** olarak ekleyin.


## Güncelleme
- Şirket ve şahıs firması evrak yüklemeleri isteğe bağlıdır.
- Evrak eklenmezse yalnızca PDF gönderilir; evrak eklenirse PDF ile birlikte ZIP gönderilir.
- Müşteri Kayıt Formu logosu üst bölümün sağ tarafına eklenmiştir.
