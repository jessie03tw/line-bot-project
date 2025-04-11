// 設定 Webhook 路徑
app.post('/webhook', (req, res) => {
  const events = req.body.events;
  
  Promise.all(events.map(event => {
    if (event.type === 'message' && event.message.type === 'text') {
      // 設定回應邏輯
      let replyText = '';
      if (event.message.text.toLowerCase() === '你好') {
        replyText = '你好！很高興認識你！';
      } else {
        replyText = `你說的是: ${event.message.text}`;
      }

      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: replyText
      });
    }
  }))
  .then(() => res.status(200).send('OK'))
  .catch((err) => {
    console.error(err);
    res.status(500).send('Internal Server Error');
  });
});

