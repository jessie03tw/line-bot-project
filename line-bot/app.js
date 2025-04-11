// 引入所需的模塊
require('dotenv').config();  // 加載環境變數
const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('@line/bot-sdk');
const axios = require('axios');
const cheerio = require('cheerio');
const schedule = require('node-schedule');

const app = express();

// 設置 LINE bot 配置
const client = new Client({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
});

app.use(bodyParser.json()); // 解析來自 LINE 的 JSON 請求

// 設置 /webhook 路由，接收來自 LINE 的事件
app.post('/webhook', (req, res) => {
  const events = req.body.events;
  Promise.all(events.map(handleEvent))
    .then(() => res.status(200).send('OK'))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// 處理 LINE 事件的函數
function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    const echo = { type: 'text', text: event.message.text };
    return client.replyMessage(event.replyToken, echo);
  }
  return Promise.resolve(null);
}

// 用來抓取網頁新聞的函數
async function fetchNews() {
  const url = 'https://natalie.mu/music/news';  // 假設這是要抓取的新聞頁面
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  
  let newsList = [];
  $('a.news-title').each((index, element) => {
    const title = $(element).text();
    const link = $(element).attr('href');
    newsList.push({ title, link });
  });

  return newsList;
}

// 用來發送 LINE 訊息的函數
async function sendNewsToLine(news) {
  const message = {
    type: 'text',
    text: `今日新聞：\n${news.title}\n閱讀更多: ${news.link}`
  };

  // 假設你的 LINE 用戶 ID 已經確定
  const userId = 'YOUR_LINE_USER_ID';  // 替換為你的 LINE 用戶 ID
  await client.pushMessage(userId, message);
}

// 設置每日定時推播新聞
schedule.scheduleJob('0 9 * * *', async () => {
  const news = await fetchNews();
  if (news.length > 0) {
    sendNewsToLine(news[0]);  // 每天推送第一篇新聞
  }
});

// 啟動 Express 伺服器
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

