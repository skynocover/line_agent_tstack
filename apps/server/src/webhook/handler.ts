import type { Context } from 'hono';
import type { Database } from '../db';
import { FileController } from '../files/controller';
import { pushMessage } from '../lib/line';
import { welcomeMessage } from '../lib/messagt';
import type { EnvironmentBindings } from '../types/env';
import { FILE_MESSAGE_TYPES, GROUP_TYPES, TEXT_MESSAGE_TYPE, WEBHOOK_RESPONSE } from './constants';
import { type MessageContext, processMessage } from './message-handlers';

interface WebhookDependencies {
  accessToken: string;
  googleApiKey: string;
  db: Database;
  fileController: FileController;
  frontendUrl: string;
}

type WebhookContext = {
  Bindings: EnvironmentBindings;
  Variables: { db: Database };
};

// Handle join event when bot is added to a group
const handleJoinEvent = async (event: any, dependencies: WebhookDependencies): Promise<void> => {
  const groupId = event.source.groupId || event.source.roomId;
  if (groupId) {
    await pushMessage({
      to: groupId,
      message: welcomeMessage,
      accessToken: dependencies.accessToken,
    });
  }
};

// Handle message events (text and files)
const handleMessageEvent = async (event: any, dependencies: WebhookDependencies): Promise<void> => {
  const messageType = event.message.type;

  // Create context for message processing
  const context: MessageContext = {
    event,
    accessToken: dependencies.accessToken,
    db: dependencies.db,
    googleApiKey: dependencies.googleApiKey,
    frontendUrl: dependencies.frontendUrl,
  };

  // Add file controller for file messages
  if (FILE_MESSAGE_TYPES.includes(messageType)) {
    context.fileController = dependencies.fileController;
  }

  await processMessage(context);
};

// Handle individual webhook event
const handleEvent = async (event: any, dependencies: WebhookDependencies): Promise<void> => {
  switch (event.type) {
    case 'join':
      await handleJoinEvent(event, dependencies);
      break;
    case 'message':
      await handleMessageEvent(event, dependencies);
      break;
    default:
      // Ignore other event types
      break;
  }
};

// Main webhook handler function
export const handleWebhook = async (events: any[], c: Context<WebhookContext>): Promise<string> => {
  const dependencies: WebhookDependencies = {
    accessToken: c.env.LINE_ACCESS_TOKEN,
    googleApiKey: c.env.GOOGLE_AI_API_KEY,
    db: c.get('db'),
    fileController: new FileController(c.get('db'), c.env.APP_STORAGE),
    frontendUrl: c.env.FRONTEND_URL || '',
  };

  try {
    const promises = events.map((event) => handleEvent(event, dependencies));
    await Promise.all(promises);
    return WEBHOOK_RESPONSE.SUCCESS;
  } catch (error: any) {
    console.error('🚀 ~ handleWebhook ~ error:', error);
    if (error?.response?.data?.message?.includes('Invalid reply token')) {
      return WEBHOOK_RESPONSE.INVALID_REPLY_TOKEN;
    }
    throw error;
  }
};
