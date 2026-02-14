aaaaaaaaaaaa# Webhook Proxy

โปรเจกต์นี้เป็น webhook proxy สำหรับส่งข้อมูลจาก Typeform ไปยัง Google Apps Script (GAS) โดยผ่าน API route บน Vercel (Serverless Function)

**ภาพรวมการใช้งาน**
- Typeform ส่ง webhook (POST) ไปยัง endpoint ของโปรเจกต์ที่ถูก deploy บน Vercel: `https://<your-project>.vercel.app/api/webhook`
- ฟังก์ชันบน Vercel จะรับ request แล้ว forward (POST) payload ต่อไปยัง Google Apps Script URL ที่ตั้งไว้ใน environment variable `GAS_WEBHOOK_URL` แล้วส่ง response ของ GAS กลับให้ Typeform

**ไฟล์สำคัญ**
- `api/webhook.js` — จุดรับและส่งต่อ webhook

**สิ่งที่ต้องเตรียมก่อน**
- บัญชี Vercel
- Git repository (หรือสามารถใช้ Vercel CLI เพื่อ deploy แบบ manual)
- Google Account เพื่อสร้าง Google Apps Script และ deploy เป็น Web App

**1) วิธี Deploy ขึ้น Vercel**

ทางเลือก A — ผ่าน Git (แนะนำ)
1. Push โค้ดนี้ขึ้น GitHub / GitLab / Bitbucket
2. เข้าไปที่ Vercel Dashboard -> New Project -> เลือกรีโปของคุณ
3. ตั้งค่า Root (ถาจำเป็น) และกด Deploy

ทางเลือก B — ใช้ Vercel CLI
1. ติดตั้ง Vercel CLI (ถ้ายังไม่มี):

```bash
npm i -g vercel
```

2. เข้าโฟลเดอร์โปรเจกต์ แล้วล็อกอิน:

```bash
vercel login
```

3. สั่ง deploy (ครั้งแรกจะมี interactive prompts):

```bash
vercel
# หรือสำหรับ production
vercel --prod
```

หลัง deploy เสร็จ คุณจะได้ URL รูปแบบ `https://<your-project>.vercel.app` — endpoint webhook จะเป็น `https://<your-project>.vercel.app/api/webhook`

**2) การตั้งค่า Environment Variable บน Vercel**

ตัวแปรที่ต้องเซ็ต:
- `GAS_WEBHOOK_URL` — ค่าเป็น URL ของ Google Apps Script Web App (ดูวิธีสร้างด้านล่าง)

วิธีตั้งค่า (Dashboard)
1. เข้า Project -> Settings -> Environment Variables
2. Add New -> Name: `GAS_WEBHOOK_URL` -> Value: `https://script.google.com/macros/s/....../exec` -> เลือก Environment (Preview/Production) -> Save

วิธีตั้งค่า (CLI)
1. โปรเจกต์ต้องเชื่อมต่อกับ Vercel project ก่อน
2. ใช้คำสั่ง (ตัวอย่างสำหรับ production):

```bash
vercel env add GAS_WEBHOOK_URL production
```

แล้วใส่ค่า URL เมื่อตัว CLI ถาม

หลังตั้งค่าแล้ว ให้ redeploy โปรเจกต์ (หรือ trigger redeploy) เพื่อให้ environment variable มีผล

**3) สร้าง Google Apps Script (GAS) เพื่อรับ webhook จาก proxy**

ตัวอย่างโค้ด Google Apps Script (ไฟล์ .gs)

```javascript
function doPost(e) {
  try {
    var content = e.postData.contents;
    // แปลงจาก JSON ถ้าต้องการ
    var data = JSON.parse(content);

    // ทำงานตามต้องการ เช่น บันทึกลง Spreadsheet, ส่งอีเมล ฯลฯ
    Logger.log(data);

    // ตัวอย่าง response กลับ (text/plain หรือ application/json)
    return ContentService.createTextOutput(JSON.stringify({status: 'ok'}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput('Error: ' + err.message);
  }
}
```

วิธี deploy เป็น Web App
1. ใน Google Apps Script Editor -> Deploy -> New deployment
2. เลือก Deployment type: "Web app"
3. Execute as: `Me`
4. Who has access: `Anyone` หรือ `Anyone with the link` (ขึ้นกับความต้องการ)
5. กด Deploy แล้วคัดลอก Web App URL (ค่าจะมีรูปแบบ `https://script.google.com/macros/s/XXXXXXXX/exec`)

ใช้ URL นี้เป็นค่า `GAS_WEBHOOK_URL` ใน Vercel

**4) ตั้งค่า Webhook ใน Typeform**

1. เข้า Typeform -> เลือก form -> Connect -> Webhooks (หรือ Integrations -> Webhooks)
2. Add new webhook URL: `https://<your-project>.vercel.app/api/webhook`
3. Enable the webhook

เมื่อมีการส่งข้อมูลจาก Typeform มาที่ URL ของคุณ ข้อมูลจะถูกส่งมายัง Vercel function แล้วถูก forward ต่อไปยัง GAS โดยใช้ `GAS_WEBHOOK_URL`

**5) ทดสอบด้วย curl (ตัวอย่าง)**

ทดสอบส่ง POST ไปยัง proxy (แทน `<your-vercel-url>` ด้วยของจริง):

```bash
curl -X POST https://<your-vercel-url>/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"test":"hello"}'
```

ผลลัพธ์ที่ได้คือ response จาก Google Apps Script ที่ถูก forwarded กลับมา

**ข้อควรระวังและคำแนะนำ**
- ตรวจสอบว่า Google Apps Script ถูกตั้งให้รับ request จากภายนอก (Who has access)
- หากต้องการจำกัดการเรียกใช้ ควรเพิ่มการยืนยัน (เช่น secret token) ระหว่าง Vercel และ GAS แล้วเก็บค่า token เป็น environment variable อีกตัวหนึ่ง
- ถ้าต้องการ logging เพิ่มเติม ให้ดู `console` logs ใน Vercel Dashboard เพื่อ debug

---

ถ้าต้องการ ผมช่วย deploy ให้ หรือช่วยเขียนตัวอย่าง Google Apps Script ที่บันทึกลง Google Sheets ได้เหมือนกัน — บอกผมได้เลยว่าต้องการแบบไหน