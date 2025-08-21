// This serverless function acts as a secure backend to interact with the OpenAI Assistants API.
// It is designed to be deployed on a platform like Vercel or Netlify.
// We assume the 'openai' package is available in the serverless function's runtime environment.
import OpenAI from "openai";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Allow': 'POST' },
    });
  }

  try {
    const { action, apiKey, assistantId, threadId, message, runId } = await req.json();

    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'API Key is missing.' }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

    if (action === 'create-thread') {
        const thread = await openai.beta.threads.create();
        return new Response(JSON.stringify({ threadId: thread.id }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    if (action === 'send-message') {
        if (!assistantId || !threadId || !message) {
             return new Response(JSON.stringify({ error: 'Missing required parameters for send-message action.' }), { 
                 status: 400,
                 headers: { 'Content-Type': 'application/json' }
            });
        }

        // 1. Add the user's message to the thread
        await openai.beta.threads.messages.create(threadId, {
            role: "user",
            content: message,
        });

        // 2. Create a run to process the message but DO NOT wait for it.
        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: assistantId,
        });

        // 3. Immediately return the runId to the client for polling.
        return new Response(JSON.stringify({ runId: run.id }), {
            status: 202, // Accepted
            headers: { 'Content-Type': 'application/json' },
        });
    }

    if (action === 'check-status') {
        if (!threadId || !runId) {
            return new Response(JSON.stringify({ error: 'Missing threadId or runId for polling.' }), { 
                 status: 400,
                 headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);

        if (runStatus.status === 'completed') {
            const messagesList = await openai.beta.threads.messages.list(threadId);
            const assistantMessage = messagesList.data.find((m: any) => m.role === 'assistant');

            if (assistantMessage && assistantMessage.content[0].type === 'text') {
                const responseText = assistantMessage.content[0].text.value;
                 return new Response(JSON.stringify({ status: 'completed', response: responseText }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            } else {
                 return new Response(JSON.stringify({ status: 'failed', error: 'No response from assistant found.' }), { 
                     status: 500,
                     headers: { 'Content-Type': 'application/json' }
                });
            }
        } else if (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
             return new Response(JSON.stringify({ status: runStatus.status }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        } else {
            // Handle failed, cancelled, expired, etc.
             return new Response(JSON.stringify({ status: 'failed', error: `Run failed with status: ${runStatus.status}` }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response(JSON.stringify({ error: 'Invalid action specified.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Error in OpenAI API handler:", error);
    const errorMessage = error.message || 'An internal server error occurred.';
    const errorStatus = error.status || 500;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: errorStatus,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}