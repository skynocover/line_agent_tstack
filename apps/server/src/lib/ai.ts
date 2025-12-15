import { createOpenAI } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import type { CalendarEventController } from '../calendar-events/controller';
import type { calendarEvents, NewCalendarEvent } from '../db/schema';
import { parseError } from './enhanced-error-handler';
import { createEventPrompt } from './prompts/createEventPrompt';

const DEFAULT_TIMEZONE = 'Asia/Taipei';
const DEFAULT_EVENT_DURATION_HOURS = 1;
const AI_MODEL = 'google/gemini-2.0-flash-001';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

// Calendar Event 工具的參數 schema
export const createEventSchema = z.object({
  title: z.string().describe('活動標題'),
  description: z.string().optional().describe('活動描述'),
  start: z
    .string()
    .describe('開始時間 (ISO 8601 格式，包含時區偏移，例如: 2024-01-15T10:00:00+08:00)'),
  end: z
    .string()
    .describe('結束時間 (ISO 8601 格式，包含時區偏移，例如: 2024-01-15T11:00:00+08:00)'),
  allDay: z.boolean().optional().default(false).describe('是否為全天活動'),
  color: z.string().optional().describe('活動顏色'),
  label: z.string().optional().describe('活動標籤'),
});

export type CreateEventParams = z.infer<typeof createEventSchema>;

// 結果類型定義
interface ErrorResult {
  success: false;
  error: string;
}

interface SuccessResult {
  success: true;
  message: string;
  createdEvent: typeof calendarEvents.$inferSelect;
}

type EventResult = SuccessResult | ErrorResult;

// AI 處理上下文
interface AIContext {
  userId: string;
  messageId: string;
  controller: CalendarEventController;
  openrouterApiKey: string;
  timezone?: string;
  groupId?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * 格式化成功訊息
 */
const formatSuccessMessage = (eventData: NewCalendarEvent, timezone: string): string => {
  const formatOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };

  return `成功建立待辦事項
標題: ${eventData.title}
開始時間: ${eventData.start.toLocaleString('zh-TW', formatOptions)}
結束時間: ${eventData.end.toLocaleString('zh-TW', formatOptions)}`;
};

/**
 * 獲取用戶本地時間字串
 */
const getUserLocalDateString = (timezone: string): string => {
  const now = new Date();
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);
};

// ============================================================================
// EVENT CREATION LOGIC
// ============================================================================

/**
 * 執行事件創建的核心邏輯
 */
const executeCreateEvent = async (
  controller: CalendarEventController,
  eventData: NewCalendarEvent,
  timezone: string,
): Promise<EventResult> => {
  try {
    const createdEvent = await controller.createEvent(eventData);
    const resultMessage = formatSuccessMessage(eventData, timezone);

    return {
      success: true,
      message: resultMessage,
      createdEvent,
    };
  } catch (error) {
    const errorInfo = parseError(error, 'executeCreateEvent');
    console.error('🚀 ~ error:', errorInfo.message);
    return {
      success: false,
      error: errorInfo.userMessage,
    };
  }
};

/**
 * 創建直接事件（不使用AI工具時的默認行為）
 */
const createDirectEvent = async (
  controller: CalendarEventController,
  userMessage: string,
  userId: string,
  messageId: string,
  timezone: string,
  groupId?: string,
): Promise<EventResult> => {
  const now = new Date();
  const endTime = new Date(now.getTime() + DEFAULT_EVENT_DURATION_HOURS * 60 * 60 * 1000);

  const eventData: NewCalendarEvent = {
    title: userMessage,
    description: undefined,
    start: now,
    end: endTime,
    allDay: false,
    color: undefined,
    label: undefined,
    userId,
    completed: false,
    messageId,
    groupId: groupId || null,
  };

  const result = await executeCreateEvent(controller, eventData, timezone);

  return result;
};

// ============================================================================
// MAIN AI FUNCTION
// ============================================================================

// AI 函數返回類型
interface AIResult {
  success: boolean;
  text: string;
  toolCalls: unknown[];
  toolResults: unknown[];
  createdEvent: typeof calendarEvents.$inferSelect | null;
  error?: string;
}

/**
 * 使用 AI 創建事件的主要函數
 */
export const createEventWithAI = async (
  userMessage: string,
  context: AIContext,
): Promise<AIResult> => {
  const { userId, controller, openrouterApiKey, messageId, groupId } = context;
  const timezone = context.timezone || DEFAULT_TIMEZONE;

  try {
    const userLocalDate = getUserLocalDateString(timezone);

    // Create OpenRouter client using OpenAI SDK
    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: openrouterApiKey,
    });

    // Create event tool - in v5, use inputSchema instead of parameters
    const eventTool = tool({
      description: '建立新的行事曆活動',
      inputSchema: createEventSchema,
    });

    // Call AI using OpenRouter
    const result = await generateText({
      model: openrouter(AI_MODEL),
      messages: [
        {
          role: 'system',
          content: createEventPrompt({ timezone, userLocalDate }),
        },
        { role: 'user', content: userMessage },
      ],
      tools: { createEvent: eventTool },
      toolChoice: 'auto',
    });

    console.log('🚀 ~ AI result:', JSON.stringify(result));

    const { text, toolCalls, toolResults } = result;

    // 處理工具調用結果 - 需要實際執行事件創建
    let resultText = text;
    let createdEvent: typeof calendarEvents.$inferSelect | null = null;
    let success = false;

    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        if (toolCall.toolName === 'createEvent') {
          // In v5, toolCall.input contains the parsed arguments
          const eventParams = toolCall.input as CreateEventParams;

          // 實際執行事件創建
          const eventData: NewCalendarEvent = {
            title: eventParams.title,
            description: eventParams.description,
            start: new Date(eventParams.start),
            end: new Date(eventParams.end),
            allDay: eventParams.allDay || false,
            color: eventParams.color,
            label: eventParams.label,
            userId,
            completed: false,
            messageId,
            groupId: groupId || null,
          };

          const executeResult = await executeCreateEvent(controller, eventData, timezone);

          if (executeResult.success) {
            createdEvent = executeResult.createdEvent;
            resultText = executeResult.message;
            success = true;
          } else {
            resultText = executeResult.error;
            success = false;
          }
          break;
        }
      }
    }

    // 如果有工具結果，使用工具結果
    if (success && createdEvent) {
      return {
        success: true,
        text: resultText,
        toolCalls: toolCalls || [],
        toolResults: toolResults || [],
        createdEvent,
        error: undefined,
      };
    }

    // 沒有工具調用時，直接創建事件
    const directResult = await createDirectEvent(
      controller,
      userMessage,
      userId,
      messageId,
      timezone,
      groupId,
    );

    if (directResult.success) {
      return {
        success: true,
        text: directResult.message,
        toolCalls: toolCalls || [],
        toolResults: toolResults || [],
        createdEvent: directResult.createdEvent,
        error: undefined,
      };
    }

    return {
      success: false,
      text: '',
      toolCalls: toolCalls || [],
      toolResults: toolResults || [],
      createdEvent: null,
      error: directResult.error,
    };
  } catch (error) {
    const errorInfo = parseError(error, 'createEventWithAI');
    console.error('🚀 ~ error:', errorInfo.message);
    return {
      success: false,
      text: '',
      toolCalls: [],
      toolResults: [],
      createdEvent: null,
      error: errorInfo.userMessage,
    };
  }
};
