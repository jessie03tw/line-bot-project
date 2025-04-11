// 引入必要的套件
const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('@line/bot-sdk');

// 初始化 Express 應用程式
const app = express();

// 設置 LINE Bot 的配置
const config = {
  channelAccessToken: 'J3+fJz8BVrQexw8mE8FnSrhskvPkHmMNWs2b+yZlxR53rkiF/tMDFXHWJFgA+f31YTz9viXu9eeTs9uOsR/w7gzyd2vq1qDxgJSadjl9xN+UALz5smtZWm3qhKMJTCKbP6A0DhRUow0JCORLv79IIAdB04t89/1O/w1cDnyilFU=',
  channelSecret: '2e5924bace79277f72d73c261db036fe'
};

// 初始化 LINE Bot 客戶端
const client = new Client(config);

// 設定中介軟體
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 設定根目錄路由
app.get('/', (req, res) => {
  res.send('Hello, welcome to the LINE Bot server!');
});

// 設定 Webhook 路徑
app.post('/webhook', (req, res) => {
  const events = req.body.events;
  
  Promise.all(events.map(event => {
    if (event.type === 'message' && event.message.type === 'text') {
      // 回應使用者訊息
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `你說的是: ${event.message.text}`
      });
    }
  }))
  .then(() => res.status(200).send('OK'))
  .catch((err) => {
    console.error(err);
    res.status(500).send('Internal Server Error');
  });
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

