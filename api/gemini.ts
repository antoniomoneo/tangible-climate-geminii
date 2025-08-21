import { GoogleGenAI } from "@google/genai";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Allow': 'POST' },
    });
  }

  try {
    const { contents, systemInstruction } = await req.json();

    if (!process.env.API_KEY) {
        return new Response(JSON.stringify({ error: 'API Key is not configured on the server. The application owner needs to set the API_KEY environment variable.' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    if (!contents || contents.length === 0) {
      return new Response(JSON.stringify({ error: 'Contents are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const model = 'gemini-2.5-flash';

    const result = await ai.models.generateContentStream({
        model,
        contents,
        config: {
            systemInstruction,
        }
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of result) {
          const text = chunk.text;
          if (text) {
             controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: { 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
       },
    });

  } catch (error: any) {
    console.error("Error in Gemini API handler:", error);
    const errorMessage = error.message || 'An internal server error occurred.';
    const errorStatus = error.status || 500;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: errorStatus,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}