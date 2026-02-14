// api/webhook.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const GAS_URL = process.env.GAS_WEBHOOK_URL;
  if (!GAS_URL) {
    return res.status(500).send("GAS_WEBHOOK_URL not configured");
  }

  try {
    // 1) Forward request ไป GAS
    const gasResponse = await fetch(GAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body)
    });

    // 2) อ่าน response จาก GAS
    const responseText = await gasResponse.text();
    const contentType = gasResponse.headers.get("content-type") || "text/plain";

    // 3) ส่ง response กลับไปให้ Typeform
    res.setHeader("Content-Type", contentType);
    return res.status(gasResponse.status).send(responseText);

  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).send("Proxy Error");
  }
}