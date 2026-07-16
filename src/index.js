const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const DESTINATION_EMAIL = "carievrak@kuzeypet.com";
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/submit") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(request),
        });
      }

      if (request.method !== "POST") {
        return json({ error: "Bu adres yalnızca POST isteği kabul eder." }, 405, request);
      }

      return submitForm(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function submitForm(request, env) {
  try {
    assertEnvironment(env);

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return json({ error: "Geçersiz gönderim biçimi." }, 415, request);
    }

    const formData = await request.formData();
    const metadataRaw = formData.get("metadata");
    const pdf = formData.get("pdf");
    const zip = formData.get("zip");

    if (typeof metadataRaw !== "string") {
      return json({ error: "Form bilgileri alınamadı." }, 400, request);
    }
    if (!(pdf instanceof File) || pdf.size === 0 || pdf.type !== "application/pdf") {
      return json({ error: "PDF dosyası alınamadı veya geçersiz." }, 400, request);
    }
    const hasZip = zip instanceof File && zip.size > 0;

    let metadata;
    try {
      metadata = JSON.parse(metadataRaw);
    } catch {
      return json({ error: "Form bilgileri okunamadı." }, 400, request);
    }

    const tradeName = cleanText(metadata.tradeName, 160);
    const formDate = cleanDate(metadata.formDate);
    if (!tradeName || !formDate) {
      return json({ error: "İşletme tabela adı veya form tarihi eksik." }, 400, request);
    }

    const totalBytes = pdf.size + (hasZip ? zip.size : 0);
    if (totalBytes > MAX_ATTACHMENT_BYTES) {
      return json({ error: "PDF ve ZIP toplamı 15 MB sınırını aşmaktadır." }, 413, request);
    }

    const pdfContent = await fileToBase64(pdf);
    const zipContent = hasZip ? await fileToBase64(zip) : null;

    const subject = `Yeni Müşteri Kaydı - ${tradeName} - ${formatDateTR(formDate)}`;
    const senderName = cleanText(env.BREVO_SENDER_NAME || "Kuzeypet Cari Evrak", 100);

    const payload = {
      sender: {
        name: senderName,
        email: env.BREVO_SENDER_EMAIL,
      },
      to: [{ email: DESTINATION_EMAIL, name: "Kuzeypet Cari Evrak" }],
      subject,
      htmlContent: buildEmailHtml(metadata, tradeName, formDate),
      attachment: [
        { name: safeAttachmentName(pdf.name, `${tradeName}_${formDate}.pdf`), content: pdfContent },
        ...(hasZip ? [{ name: safeAttachmentName(zip.name, `${tradeName}_${formDate}_Evraklar.zip`), content: zipContent }] : []),
      ],
    };

    const brevoResponse = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const brevoBody = await brevoResponse.json().catch(() => ({}));
    if (!brevoResponse.ok) {
      console.error("Brevo error", brevoResponse.status, brevoBody);
      const detail = typeof brevoBody.message === "string" ? brevoBody.message : "Brevo gönderimi reddetti.";
      return json({ error: `E-posta gönderilemedi: ${detail}` }, 502, request);
    }

    return json({ ok: true, messageId: brevoBody.messageId || null }, 200, request);
  } catch (error) {
    console.error("Submit error", error);
    const message = error instanceof Error ? error.message : "Beklenmeyen sunucu hatası oluştu.";
    return json({ error: message }, 500, request);
  }
}

function assertEnvironment(env) {
  const missing = ["BREVO_API_KEY", "BREVO_SENDER_EMAIL"].filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`Cloudflare değişkenleri eksik: ${missing.join(", ")}`);
  }
}

async function fileToBase64(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function buildEmailHtml(metadata, tradeName, formDate) {
  const firmType = escapeHtml(cleanText(metadata.firmType, 80) || "-");
  const ownerName = escapeHtml(cleanText(metadata.ownerName, 160) || "-");
  const representative = escapeHtml(cleanText(metadata.salesRepresentative, 160) || "-");
  const approver = escapeHtml(cleanText(metadata.approverName, 160) || "-");
  const interviewer = escapeHtml(cleanText(metadata.interviewerName, 160) || "-");

  return `
    <div style="font-family:Arial,sans-serif;color:#2d3348;line-height:1.5">
      <h2 style="color:#e52528;margin-bottom:8px">Yeni Müşteri Kayıt Formu</h2>
      <p>Yeni müşteri kayıt formu ekte iletilmiştir. Evrak yükleme isteğe bağlıdır; eklenmiş evrak varsa ZIP dosyası ayrıca ektedir.</p>
      <table style="border-collapse:collapse;width:100%;max-width:680px">
        ${emailRow("İşletme Tabela Adı", escapeHtml(tradeName))}
        ${emailRow("Form Tarihi", escapeHtml(formatDateTR(formDate)))}
        ${emailRow("Firma Türü", firmType)}
        ${emailRow("İşletme Sahibi", ownerName)}
        ${emailRow("Satış Temsilcisi", representative)}
        ${emailRow("Cari Açılış Onaylayan", approver)}
        ${emailRow("Görüşmeyi Yapan", interviewer)}
      </table>
      <p style="font-size:12px;color:#687087;margin-top:20px">Bu ileti Kuzeypet Yeni Müşteri Kayıt Formu üzerinden otomatik oluşturulmuştur.</p>
    </div>`;
}

function emailRow(label, value) {
  return `<tr><td style="padding:8px;border:1px solid #d9dce5;font-weight:bold;width:210px">${label}</td><td style="padding:8px;border:1px solid #d9dce5">${value}</td></tr>`;
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, maxLength);
}

function cleanDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "" : value;
}

function formatDateTR(value) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function safeAttachmentName(value, fallback) {
  const source = cleanText(value, 180) || fallback;
  return source.replace(/[\\/:*?"<>|\r\n]/g, "_");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function corsHeaders(request) {
  const origin = request.headers.get("origin");
  return {
    "access-control-allow-origin": origin || "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "Origin",
  };
}

function json(data, status, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...corsHeaders(request),
    },
  });
}
