const line = require('@line/bot-sdk');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

// โหลดคำตอบจากไฟล์ JSON
function loadReplies() {
  const filePath = path.join(process.cwd(), 'replies.json');
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

// สร้างคำตอบอัตโนมัติ
function generateReply(message) {
  const replies = loadReplies();

  for (const item of replies) {
    const matched = item.keywords.some((keyword) =>
      message.includes(keyword.toLowerCase())
    );
    if (matched) {
      return item.reply;
    }
  }

  return 'ขอบคุณที่ทักมาครับ! ตอนนี้ผมเข้าใจคำถามได้จำกัด\n\nลองพิมพ์:\n- "สวัสดี" เพื่อทักทาย\n- "ราคา" สอบถามราคา\n- "เวลา" ดูเวลาทำการ\n- "ติดต่อ" ข้อมูลติดต่อ\n\nหรือรอสักครู่ แอดมินจะมาตอบครับ 😊';
}

// Verify LINE signature
function validateSignature(body, signature) {
  const hash = crypto
    .createHmac('SHA256', config.channelSecret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

module.exports = async (req, res) => {
  // Health check
  if (req.method === 'GET') {
    return res.status(200).send('LINE Chatbot is running!');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // Get raw body for signature validation
  const rawBody = JSON.stringify(req.body);
  const signature = req.headers['x-line-signature'];

  if (!validateSignature(rawBody, signature)) {
    return res.status(401).send('Invalid signature');
  }

  const events = req.body.events || [];

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text.trim().toLowerCase();
      const reply = generateReply(userMessage);

      await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: reply }],
      });
    }
  }

  return res.status(200).json({ success: true });
};
