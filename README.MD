# Webhook Proxy — สายฟ้าโอนข้อมูล

เบา. เร็ว. เท่.

โปรเจกต์นี้เป็น proxy เล็กๆ สำหรับรับ Webhook จาก Typeform แล้วส่งต่อไปยัง Google Apps Script (GAS) ผ่าน Serverless API บน Vercel

**สรุปการทำงาน**
- Typeform -> `https://<your-project>.vercel.app/api/webhook` (Vercel) -> forward -> GAS (`GAS_WEBHOOK_URL`) -> response forwarded กลับให้ Typeform

**ไฟล์สำคัญ**
- `api/webhook.js` — รับ POST แล้ว forward payload ไปยัง `GAS_WEBHOOK_URL`

---

## เตรียมของก่อนเริ่ม
- บัญชี Vercel
- รีโปที่มีโปรเจกต์นี้
- Google Account สำหรับสร้าง Google Apps Script

## 1) Deploy ขึ้น Vercel (สั้นๆ)

วิธีเร็วสุด (Git): push ขึ้น GitHub แล้วสร้าง Project ใหม่บน Vercel

หรือใช้ Vercel CLI:

```bash
npm i -g vercel
vercel login
vercel --prod
```

หลัง deploy จะได้ URL เช่น `https://<your-project>.vercel.app` — endpoint webhook คือ `/api/webhook`

## 2) ตั้งค่า Environment Variable

ตัวแปรสำคัญ:
- `GAS_WEBHOOK_URL` = `https://script.google.com/macros/s/XXXXXXXX/exec`

Dashboard: Project → Settings → Environment Variables → Add New

CLI:

```bash
vercel env add GAS_WEBHOOK_URL production
```

หลังตั้งค่าอย่าลืม redeploy

## 3) ตัวอย่าง Google Apps Script (GAS)

วางโค้ดนี้ใน Apps Script แล้ว deploy เป็น Web App (Anyone with the link)

```javascript
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    Logger.log(payload);
    return ContentService
      .createTextOutput(JSON.stringify({ok:true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput('Error: ' + err.message);
  }
}
```

เอา URL ที่ได้ไปใส่เป็นค่า `GAS_WEBHOOK_URL` บน Vercel

## 4) ตั้งค่า Webhook บน Typeform

Form → Connect → Webhooks → Add webhook:

```
https://<your-project>.vercel.app/api/webhook
```

เปิดใช้งาน — ทุกการตอบจะถูก forward ไปยัง GAS ของคุณ

## 5) ทดสอบด้วย curl

```bash
curl -X POST https://<your-vercel-url>/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"test":"hello"}'
```

จะได้ response เดิมจาก GASกลับมา (ผ่าน proxy)

---

## Tips & Security
- ถ้าต้องการความปลอดภัยเพิ่ม ให้ใช้ secret token ระหว่าง Vercel ↔ GAS และเก็บเป็น env var
- ดู logs ใน Vercel Dashboard เมื่อ debug

ต้องการให้ผมปรับสไตล์อีก (เช่นสี/ขนาดไอคอน หรือเพิ่มตัวอย่างบันทึกลง Google Sheets) บอกได้เลย
