import axios from 'axios';

const replyMessage = async ({
  replyToken,
  message,
  accessToken,
  quoteToken,
}: {
  replyToken: string;
  message: string;
  accessToken: string;
  quoteToken?: string;
}) => {
  const { data } = await axios.post(
    'https://api.line.me/v2/bot/message/reply',
    {
      replyToken,
      messages: [{ type: 'text', text: message, quoteToken }],
    },
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return data;
};

const pushMessage = async ({
  to,
  message,
  accessToken,
}: {
  to: string;
  message: string;
  accessToken: string;
}) => {
  const { data } = await axios.post(
    'https://api.line.me/v2/bot/message/push',
    { to, messages: [{ type: 'text', text: message }] },
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return data;
};

export { replyMessage, pushMessage };
