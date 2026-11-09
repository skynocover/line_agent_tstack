// Webhook response types
export const WEBHOOK_RESPONSE = {
  SUCCESS: 'OK',
  INVALID_REPLY_TOKEN: 'Reply token has expired or invalid',
} as const;

// Message types
export const TEXT_MESSAGE_TYPE = 'text' as const;
