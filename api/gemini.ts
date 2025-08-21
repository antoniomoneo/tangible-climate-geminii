import { GoogleGenAI } from '@google/genai';

// Serverless functions can be isolated, so we redefine necessary types to be safe.
interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

// This function assumes a modern serverless environment that supports the standard Request and Response objects.
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // CRITICAL: Check for the API key from server-side environment variables.
  if (!process.env.API_KEY) {
    console.error('API_KEY is not set in environment variables.');
    return new Response(JSON.stringify({ error: 'The AI assistant is not configured.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { messages, context, systemInstruction } = await req.json();

    if (!messages || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: 'Invalid message format.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const contentsForApi = messages.map((msg: ChatMessage) => ({
        role: msg.role,
        parts: [{ text: msg.content }]
    }));

    // Append context to the last user message to give the AI awareness of the user's current state in the game.
    const lastUserMessage = contentsForApi[contentsForApi.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
        lastUserMessage.parts[0].text = `${lastUserMessage.parts[0].text}\n\n[System note: The user is currently viewing this scene: "${context}"]`;
    }

    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: contentsForApi,
      config: {
        systemInstruction: systemInstruction,
      },
    });
    
    // Use ReadableStream to send data to the client as it becomes available, preventing timeouts.
    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            // Format as a Server-Sent Event (SSE) for easy client-side parsing.
            const sseFormattedChunk = `data: ${JSON.stringify({ text })}\n\n`;
            controller.enqueue(encoder.encode(sseFormattedChunk));
          }
        }
        controller.close();
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: `An internal error occurred: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
