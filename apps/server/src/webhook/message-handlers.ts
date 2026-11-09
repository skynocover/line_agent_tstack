import { CalendarEventController } from '../calendar-events/controller';
import type { Database } from '../db';
import { createEventWithAI } from '../lib/ai';
import { parseError } from '../lib/enhanced-error-handler';
import { replyMessage } from '../lib/line';
import { MessageController } from '../messages/controller';
import { TEXT_MESSAGE_TYPE } from './constants';

// ============================================================================
// TYPES
// ============================================================================

export interface MessageContext {
  event: any;
  accessToken: string;
  db: Database;
  openrouterApiKey: string;
  frontendUrl: string;
}

// ============================================================================
// MAIN PROCESSOR
// ============================================================================

export const processMessage = async (context: MessageContext): Promise<void> => {
  const { event, db, accessToken, openrouterApiKey, frontendUrl } = context;
  const { message, source } = event;

  console.log(`處理訊息: ${message.id}, 類型: ${message.type}`);

  // Skip bot messages
  if (source.type === 'user' && !source.userId) {
    console.log('跳過機器人訊息');
    return;
  }

  // Check if message already exists
  const messageController = new MessageController(db);
  const existing = await messageController.getMessageByMessageId(message.id);
  if (existing) {
    console.log(`訊息 ${message.id} 已存在，跳過處理`);
    return;
  }

  // Save message to database
  const savedMessageId = await messageController.createMessage({
    messageId: message.id,
    userId: source.userId,
    content: message.text || message.fileName || `檔案訊息: ${message.type}`,
    messageType: message.type,
    quotedMessageId: message.quotedMessageId || null,
    groupId: source.groupId || source.roomId,
  });
  console.log(`訊息已儲存，ID: ${savedMessageId}`);

  // Process message based on type
  let responseText: string | null = null;

  try {
    if (message.type === TEXT_MESSAGE_TYPE) {
      if (source.groupId || source.roomId) {
        const isMentioned = message.mention?.mentionees?.some((m: any) => m.isSelf);
        if (!isMentioned) {
          console.log('群組文字訊息未 mention 機器人，跳過處理');
          return;
        }
      }
      responseText = await processText(
        message,
        source,
        db,
        openrouterApiKey,
        savedMessageId,
        frontendUrl,
      );
    }
  } catch (error) {
    const errorInfo = parseError(error, 'processMessage');
    console.error('處理錯誤:', errorInfo.message);

    if (errorInfo.shouldReply) {
      responseText = errorInfo.userMessage;
    }
  }

  // Send reply if needed
  if (responseText) {
    try {
      await replyMessage({
        replyToken: event.replyToken,
        message: responseText,
        accessToken,
        quoteToken: message.quoteToken,
      });
    } catch (error) {
      console.error('回覆失敗:', error);
    }
  }
};

// ============================================================================
// SPECIFIC PROCESSORS
// ============================================================================

const generateManageUrl = (source: any, frontendUrl: string, type: 'todo') => {
  const isGroupMessage = source.groupId || source.roomId;

  const menageUrl = isGroupMessage
    ? `${frontendUrl}/group/${source.groupId || source.roomId}/${type}`
    : `${frontendUrl}/${source.userId}/${type}`;

  return `\n\n📅 查看和訂閱行事曆：${menageUrl}`;
};

const processText = async (
  message: any,
  source: any,
  db: Database,
  openrouterApiKey: string,
  savedMessageId: number,
  frontendUrl: string,
): Promise<string | null> => {
  const calendarEventController = new CalendarEventController(db);
  const messageController = new MessageController(db);

  // Prepare AI input text (including quoted content)
  let aiInputText = message.text;

  if (message.quotedMessageId) {
    const quotedMessage = await messageController.getQuotedMessage(message.quotedMessageId);
    if (quotedMessage) {
      aiInputText = `回應訊息：「${quotedMessage.content}」\n\n當前訊息：${message.text}`;
    } else {
      aiInputText = `回應先前的訊息：${message.text}`;
    }
  }
  console.log('aiInputText', aiInputText);

  const aiResult = await createEventWithAI(aiInputText, {
    userId: source.userId,
    controller: calendarEventController,
    openrouterApiKey,
    messageId: message.id,
    groupId: source.groupId || source.roomId,
  });
  console.log('🚀 ~ aiResult:', JSON.stringify(aiResult));

  if (aiResult.success) {
    if (aiResult.createdEvent) {
      await messageController.updateMessageEventId(savedMessageId, aiResult.createdEvent.id);
    }

    return aiResult.text + generateManageUrl(source, frontendUrl, 'todo') || '操作完成';
  }

  return aiResult.error || '處理失敗';
};
