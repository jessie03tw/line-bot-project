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

app.use(bodyParser.json()); // 解析 JSON 請求

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
  const url = 'https://natalie.mu/music/news';  // 抓取音樂新聞頁面
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  
  let newsList = [];
  // 提取所有新聞標題和鏈接
  $('a.news-title').each((index, element) => {
    const title = $(element).text();  // 獲取標題
    const link = $(element).attr('href');  // 獲取鏈接
    newsList.push({ title, link });
  });

  return newsList;
}

// 用來發送 LINE 訊息的函數
async function sendNewsToLine(news, language = 'en') {
  const message = {
    type: 'text',
    text: `今日新聞：\n${news.title}\n閱讀更多: ${news.link}`
  };

  // 如果需要日文回覆
  if (language === 'ja') {
    message.text = `今日のニュース：\n${news.title}\nもっと読む: ${news.link}`;
  }

  const userId = 'YOUR_LINE_USER_ID';  // 請替換成你的 LINE 用戶 ID
  await client.pushMessage(userId, message);
}

// 設置每日定時推播新聞（每天 11:05 AM 和 5:05 PM）
schedule.scheduleJob('5 11 * * *', async () => {
  const news = await fetchNews();
  if (news.length > 0) {
    sendNewsToLine(news[0]);  // 每天推送最新的第一篇新聞
  }
});

schedule.scheduleJob('5 17 * * *', async () => {
  const news = await fetchNews();
  if (news.length > 0) {
    sendNewsToLine(news[0]);  // 每天推送最新的第一篇新聞
  }
});

// 設置關鍵字推播（例如：アシア 或 台湾）
const keywords = ['アシア', '台湾'];  // 要檢查的關鍵字
schedule.scheduleJob('*/5 * * * *', async () => {
  const news = await fetchNews();
  news.forEach(async (article) => {
    if (keywords.some(keyword => article.title.includes(keyword))) {
      await sendNewsToLine(article, 'ja');  // 當標題包含關鍵字時，用日文推播該新聞
    }
  });
});

// 啟動伺服器
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

