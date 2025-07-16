import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, tool } from 'ai';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createEventPrompt } from '../../../lib/prompts/createEventPrompt';

const DEFAULT_TIMEZONE = 'Asia/Taipei';
const DEFAULT_EVENT_DURATION_HOURS = 1;
const AI_MODEL = 'gemini-2.0-flash-exp';

// Event creation schema
const createEventSchema = z.object({
  title: z.string().describe('活動標題'),
  description: z.string().optional().describe('活動描述'),
  start: z.string().describe('開始時間 (ISO 8601 格式，包含時區偏移)'),
  end: z.string().describe('結束時間 (ISO 8601 格式，包含時區偏移)'),
  allDay: z.boolean().optional().default(false).describe('是否為全天活動'),
  color: z.string().optional().describe('活動顏色'),
  label: z.string().optional().describe('活動標籤'),
});

// Request body schema
const requestSchema = z.object({
  userMessage: z.string(),
  timezone: z.string().optional(),
  userLocalDate: z.string(),
  apiKey: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userMessage,
      timezone = DEFAULT_TIMEZONE,
      userLocalDate,
      apiKey,
    } = requestSchema.parse(body);

    console.log({ userMessage, timezone, userLocalDate, apiKey });

    const ai = createGoogleGenerativeAI({ apiKey });

    // Create event tool
    const eventTool = tool({
      description: '建立新的行事曆活動',
      parameters: createEventSchema,
      execute: async (params) => {
        // Return the event data to be processed by the caller
        return {
          success: true,
          event: params,
        };
      },
    });

    const result = await generateText({
      model: ai(AI_MODEL),
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

    console.log('🚀 ~ result:', result);

    return NextResponse.json({
      success: true,
      data: {
        text: result.text,
        toolCalls: result.toolCalls,
        toolResults: result.toolResults,
      },
    });
  } catch (error) {
    console.error('AI calendar error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 },
    );
  }
}
