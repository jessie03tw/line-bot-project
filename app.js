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

// 測試路由，檢查抓取的新聞
app.get('/test-news', async (req, res) => {
  const news = await fetchNews();
  console.log(news);  // 在終端打印抓取的新聞
  res.json(news);     // 返回 JSON 給前端
});

// 設置 /webhook 路由來處理來自 LINE 的事件
app.post('/webhook', (req, res) => {
  const events = req.body.events;
  Promise.all(events.map(handleEvent))
    .then(() => res.status(200).send('OK'))  // 回應 200 表示成功
    .catch((err) => {
      console.error(err);
      res.status(500).end();  // 如果有錯誤，回應 500
    });
});

// 處理 LINE 事件的函數
async function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    const userMessage = event.message.text;

    // 當收到用戶發送的 "1"，抓取最新的新聞
    if (userMessage === '1') {
      const news = await fetchNews();
      if (news.length > 0) {
        const latestNews = news[0];  // 最新的新聞
        const replyMessage = {
          type: 'text',
          text: `最新的新聞是：\n${latestNews.title}\n閱讀更多: ${latestNews.link}`
        };
        return client.replyMessage(event.replyToken, replyMessage);
      } else {
        const replyMessage = {
          type: 'text',
          text: '抱歉，無法抓取最新的新聞。'
        };
        return client.replyMessage(event.replyToken, replyMessage);
      }
    }

    // 如果收到其他消息，回應相同的文字
    const echo = { type: 'text', text: event.message.text };
    return client.replyMessage(event.replyToken, echo);
  }
  return Promise.resolve(null);  // 如果不是文字訊息，什麼都不做
}

// 用來抓取網頁新聞的函數
async function fetchNews() {
  const url = 'https://natalie.mu/music/news';  // 抓取音樂新聞頁面
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    let newsList = [];
    $('a.news-title').each((index, element) => {
      const title = $(element).text();  // 獲取標題
      const link = $(element).attr('href');  // 獲取鏈接
      newsList.push({ title, link });
    });

    console.log(newsList);  // 在終端打印抓取的新聞列表，這樣可以幫助我們排查問題
    return newsList;
  } catch (error) {
    console.error('抓取新聞失敗:', error);
    return [];  // 如果抓取新聞出錯，返回空陣列
  }
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

  const userId = 'YOUR_LINE_USER_ID';  // 替換成你的 LINE 用戶 ID
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

