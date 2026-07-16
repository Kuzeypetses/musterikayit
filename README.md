# Kuzeypet Yeni Müşteri Kayıt Formu

## Cloudflare Pages kurulumu
1. Bu klasörün içeriğini GitHub reposunun kök dizinine yükleyin.
2. Cloudflare > Workers & Pages > Create application > Pages > Connect to Git yoluyla repoyu bağlayın.
3. Framework preset: **None**
4. Build command: boş bırakın
5. Build output directory: `/` veya proje kökü seçeneği
6. Settings > Variables and Secrets altında aşağıdakileri ekleyin:
   - `BREVO_API_KEY` (Secret)
   - `BREVO_SENDER_EMAIL` (Brevo'da doğrulanmış gönderici adresi)
   - `BREVO_SENDER_NAME` (ör. Kuzeypet Cari Evrak)
7. Production ve Preview ortamları için değişkenleri ayrı ayrı tanımlayın ve yeniden deploy edin.

## İşleyiş
- Form mobil/tablet uyumludur.
- Şirket veya şahıs firmasına göre doğru evrak bölümü aktif olur.
- Dosyalar toplu veya sonradan eklenebilir; her dosyaya evrak türü atanır.
- İki imza alanı kalem/parmak ile doldurulur.
- Tarayıcıda PDF ve ZIP oluşturulur; Cloudflare Pages Function üzerinden Brevo API ile `carievrak@kuzeypet.com` adresine gönderilir.
- PDF + ZIP toplamı en fazla 15 MB olabilir.

## Güvenlik
Brevo API anahtarını `app.js` veya HTML içine yazmayın. Yalnızca Cloudflare Secret olarak saklayın.
