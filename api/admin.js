const fs = require('fs');
const path = require('path');

// ไฟล์ replies.json จะอ่าน/เขียนผ่าน /tmp บน Vercel (serverless)
const REPLIES_SOURCE = path.join(process.cwd(), 'replies.json');
const REPLIES_TMP = '/tmp/replies.json';

// โหลด replies (ถ้ามีใน /tmp ใช้ตัวนั้น ถ้าไม่มีใช้ source)
function loadReplies() {
  try {
    if (fs.existsSync(REPLIES_TMP)) {
      return JSON.parse(fs.readFileSync(REPLIES_TMP, 'utf-8'));
    }
  } catch (e) {}
  return JSON.parse(fs.readFileSync(REPLIES_SOURCE, 'utf-8'));
}

// บันทึก replies
function saveReplies(data) {
  fs.writeFileSync(REPLIES_TMP, JSON.stringify(data, null, 2), 'utf-8');
}

// ตรวจ password
function checkAuth(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  return token === process.env.ADMIN_PASSWORD;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ตรวจ auth ทุก request
  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized - รหัสผ่านไม่ถูกต้อง' });
  }

  const replies = loadReplies();

  // GET - ดูคำตอบทั้งหมด
  if (req.method === 'GET') {
    return res.status(200).json(replies);
  }

  // POST - เพิ่มคำตอบใหม่
  if (req.method === 'POST') {
    const { keywords, reply } = req.body;
    if (!keywords || !reply) {
      return res.status(400).json({ error: 'ต้องมี keywords และ reply' });
    }
    replies.push({ keywords, reply });
    saveReplies(replies);
    return res.status(201).json({ message: 'เพิ่มสำเร็จ', data: replies });
  }

  // PUT - แก้ไขคำตอบ (ส่ง index มา)
  if (req.method === 'PUT') {
    const { index, keywords, reply } = req.body;
    if (index === undefined || index < 0 || index >= replies.length) {
      return res.status(400).json({ error: 'index ไม่ถูกต้อง' });
    }
    if (keywords) replies[index].keywords = keywords;
    if (reply) replies[index].reply = reply;
    saveReplies(replies);
    return res.status(200).json({ message: 'แก้ไขสำเร็จ', data: replies });
  }

  // DELETE - ลบคำตอบ
  if (req.method === 'DELETE') {
    const { index } = req.body;
    if (index === undefined || index < 0 || index >= replies.length) {
      return res.status(400).json({ error: 'index ไม่ถูกต้อง' });
    }
    replies.splice(index, 1);
    saveReplies(replies);
    return res.status(200).json({ message: 'ลบสำเร็จ', data: replies });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
