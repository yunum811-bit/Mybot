const fs = require('fs');
const path = require('path');

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

// โหลดคำตอบจากไฟล์ JSON
function loadReplies() {
  const tmpPath = '/tmp/replies.json';
  const sourcePath = path.join(process.cwd(), 'replies.json');
  try {
    if (fs.existsSync(tmpPath)) {
      return JSON.parse(fs.readFileSync(tmpPath, 'utf-8'));
    }
  } catch (e) {}
  return JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
}

// สร้างคำตอบอัตโนมัติ
function generateReply(message) {
  const replies = loadReplies();
  const msg = message.toLowerCase();

  for (const item of replies) {
    const matched = item.keywords.some((keyword) =>
      msg.includes(keyword.toLowerCase())
    );
    if (matched) {
      return item.reply;
    }
  }

  return 'ขอบคุณที่ทักมาครับ! ตอนนี้ผมเข้าใจคำถามได้จำกัด\n\nลองพิมพ์:\n- "สวัสดี" เพื่อทักทาย\n- "ราคา" สอบถามราคา\n- "เวลา" ดูเวลาทำการ\n- "ติดต่อ" ข้อมูลติดต่อ\n\nหรือรอสักครู่ แอดมินจะมาตอบครับ 😊';
}

// ส่งข้อความกลับไปหา user
async function sendMessage(recipientId, text) {
  const res = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: text },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error('Facebook API Error:', error);
  }
}

module.exports = async (req, res) => {
  // GET - Facebook Webhook Verification
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Facebook webhook verified');
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  // POST - รับข้อความจาก Facebook
  if (req.method === 'POST') {
    const body = req.body;

    if (body.object === 'page') {
      for (const entry of body.entry) {
        const messaging = entry.messaging || [];
        for (const event of messaging) {
          if (event.message && event.message.text) {
            const senderId = event.sender.id;
            const userMessage = event.message.text.trim();
            const reply = generateReply(userMessage);
            await sendMessage(senderId, reply);
          }
        }
      }
      return res.status(200).send('EVENT_RECEIVED');
    }

    return res.status(404).send('Not Found');
  }

  return res.status(405).send('Method Not Allowed');
};
