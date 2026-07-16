const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8'}});
function safeName(s=''){return s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,80)||'Yeni_Musteri'}
function toBase64(buffer){const bytes=new Uint8Array(buffer);let binary='';const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));return btoa(binary)}
export async function onRequestPost({request,env}){
  try{
    if(!env.BREVO_API_KEY||!env.BREVO_SENDER_EMAIL)return json({error:'Cloudflare ortam değişkenleri eksik: BREVO_API_KEY ve BREVO_SENDER_EMAIL tanımlanmalıdır.'},500);
    const form=await request.formData(),metadataRaw=form.get('metadata'),pdf=form.get('pdf'),zip=form.get('zip');
    if(typeof metadataRaw!=='string'||!(pdf instanceof File)||!(zip instanceof File))return json({error:'Form verisi veya ek dosyalar eksik.'},400);
    const data=JSON.parse(metadataRaw);if(!data.tradeName||!data.formDate)return json({error:'İşletme tabela adı ve tarih zorunludur.'},400);
    if(pdf.size+zip.size>15*1024*1024)return json({error:'Ek dosyaların toplam boyutu 15 MB sınırını aşıyor.'},413);
    const base=`${safeName(data.tradeName)}_${data.formDate}`;
    const payload={sender:{name:env.BREVO_SENDER_NAME||'Kuzeypet Yeni Müşteri Formu',email:env.BREVO_SENDER_EMAIL},to:[{email:'carievrak@kuzeypet.com',name:'Cari Evrak'}],subject:`Yeni Müşteri Kaydı - ${data.tradeName} - ${data.formDate}`,htmlContent:`<h2>Yeni Müşteri Kayıt Formu</h2><p><b>İşletme Tabela Adı:</b> ${String(data.tradeName).replace(/[<>]/g,'')}</p><p><b>Firma Türü:</b> ${String(data.firmType||'').replace(/[<>]/g,'')}</p><p><b>Form Tarihi:</b> ${String(data.formDate).replace(/[<>]/g,'')}</p><p>PDF formu ve evrak ZIP dosyası ektedir.</p>`,attachment:[{name:base+'.pdf',content:toBase64(await pdf.arrayBuffer())},{name:base+'_Evraklar.zip',content:toBase64(await zip.arrayBuffer())}]};
    const res=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{accept:'application/json','content-type':'application/json','api-key':env.BREVO_API_KEY},body:JSON.stringify(payload)});
    const out=await res.json().catch(()=>({}));if(!res.ok)return json({error:out.message||`Brevo gönderim hatası (${res.status})`},502);return json({ok:true,messageId:out.messageId||null});
  }catch(e){return json({error:e?.message||'Beklenmeyen sunucu hatası.'},500)}
}
export async function onRequest(){return json({error:'Yalnızca POST isteği desteklenir.'},405)}
