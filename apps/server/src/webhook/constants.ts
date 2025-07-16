// Webhook response types
export const WEBHOOK_RESPONSE = {
  SUCCESS: 'OK',
  INVALID_REPLY_TOKEN: 'Reply token has expired or invalid',
} as const;

// Message types
export const FILE_MESSAGE_TYPES = ['image', 'video', 'audio', 'file'] as const;
export const TEXT_MESSAGE_TYPE = 'text' as const;

// Source types
export const GROUP_TYPES = ['group', 'room'] as const;
