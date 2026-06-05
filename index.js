const express = require('express');
const line = require('@line/bot-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// LINE config
const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
};

const app = express();
const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

// โหลดคำตอบจากไฟล์ JSON
function loadReplies() {
  const filePath = path.join(__dirname, 'replies.json');
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

// Webhook endpoint
app.post('/webhook', line.middleware(config), (req, res) => {
  console.log('Received webhook event:', JSON.stringify(req.body.events.length), 'events');

  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error handling event:', err);
      res.status(500).end();
    });
});

// Handle each event
async function handleEvent(event) {
  console.log('Event type:', event.type);

  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userMessage = event.message.text.trim().toLowerCase();
  console.log('User message:', userMessage);

  const reply = generateReply(userMessage);
  console.log('Reply:', reply);

  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [{ type: 'text', text: reply }],
  });
}

// สร้างคำตอบอัตโนมัติจาก replies.json
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

  // Default - ตอบเมื่อไม่เจอ keyword ที่ตรง
  return 'ขอบคุณที่ทักมาครับ! ตอนนี้ผมเข้าใจคำถามได้จำกัด\n\nลองพิมพ์:\n- "สวัสดี" เพื่อทักทาย\n- "ราคา" สอบถามราคา\n- "เวลา" ดูเวลาทำการ\n- "ติดต่อ" ข้อมูลติดต่อ\n\nหรือรอสักครู่ แอดมินจะมาตอบครับ 😊';
}

// Health check
app.get('/', (req, res) => {
  res.send('LINE Chatbot is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Channel Secret:', config.channelSecret ? 'SET' : 'NOT SET');
  console.log('Access Token:', config.channelAccessToken ? 'SET' : 'NOT SET');
});
