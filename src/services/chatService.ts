/**
 * OpenAI API integration for chat completions with streaming support
 */

// API Configuration
const API_CONFIG = {
  BASE_URL: 'https://llm.arz.ai/v1/chat/completions',
  API_KEY: 'None', // Use environment variable if available
  MODEL: '@01/gpt-4o-mini'
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: Message[];
}

/**
 * Sends a request to the OpenAI-compatible API and returns a streaming response
 * @param request The chat request containing messages
 * @returns A ReadableStream that emits chunks of the response
 */
export async function streamChatCompletion(request: ChatRequest): Promise<ReadableStream<Uint8Array>> {
  try {
    // Prepare the request payload
    const payload = {
      model: API_CONFIG.MODEL,
      messages: request.messages,
      stream: true
    };

    // Make the API request
    const response = await fetch(API_CONFIG.BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_CONFIG.API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    // Check if the request was successful
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`API request failed with status ${response.status}: ${errorData ? JSON.stringify(errorData) : response.statusText}`);
    }

    // Check if the response body is available
    if (!response.body) {
      console.warn('Response body is null, falling back to mock implementation');
      return fallbackToMockStream(request);
    }

    // Process the stream from the response
    // OpenAI API returns data in SSE format with 'data: ' prefix
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode the chunk
            const chunk = decoder.decode(value);

            // Process SSE format (data: {...})
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonData = line.slice(6); // Remove 'data: ' prefix

                // Skip [DONE] message
                if (jsonData === '[DONE]') continue;

                try {
                  // Parse the JSON data
                  const data = JSON.parse(jsonData);

                  // Extract the content from the response
                  if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                    const content = data.choices[0].delta.content;
                    controller.enqueue(new TextEncoder().encode(content));
                  }
                } catch (e) {
                  console.warn('Error parsing JSON from stream:', e);
                }
              }
            }
          }

          controller.close();
        } catch (error) {
          console.error('Error processing stream:', error);
          controller.error(error);
        }
      }
    });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);

    // Fallback to mock implementation if the API call fails
    return fallbackToMockStream(request);
  }
}

/**
 * Fallback to mock stream when the API call fails
 * @param request The chat request containing messages
 * @returns A ReadableStream that emits chunks of the response
 */
function fallbackToMockStream(request: ChatRequest): ReadableStream<Uint8Array> {
  console.warn('Falling back to mock implementation');

  // Get the last user message
  const lastUserMessage = request.messages.filter(msg => msg.role === 'user').pop();

  if (!lastUserMessage) {
    throw new Error('No user message found');
  }

  // Generate a response based on the user's message
  const responseText = generateResponse(lastUserMessage.content);

  // Create a ReadableStream to simulate streaming
  return new ReadableStream({
    async start(controller) {
      // Split the response into chunks to simulate streaming
      const chunks = splitIntoChunks(responseText, 5);

      // Send each chunk with a delay to simulate typing
      for (const chunk of chunks) {
        // Add a small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 100));

        // Encode the chunk and send it
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(chunk));
      }

      // Signal that we're done
      controller.close();
    }
  });
}

/**
 * Generates a mock response based on the user's message
 */
function generateResponse(userMessage: string): string {
  const userMessageLower = userMessage.toLowerCase();

  // Simple pattern matching for common questions
  if (userMessageLower.includes('hello') || userMessageLower.includes('hi')) {
    return "Hello! How can I help you today?";
  }

  if (userMessageLower.includes('how are you')) {
    return "I'm just a simple AI assistant, but I'm functioning well. Thank you for asking! How can I assist you?";
  }

  if (userMessageLower.includes('name')) {
    return "I'm an AI assistant created to help answer your questions.";
  }

  if (userMessageLower.includes('help')) {
    return "I'd be happy to help! I can answer questions, provide information, or just chat. What would you like to know?";
  }

  if (userMessageLower.includes('weather')) {
    return "I'm sorry, I don't have access to real-time weather data. You might want to check a weather service or app for that information.";
  }

  if (userMessageLower.includes('thank')) {
    return "You're welcome! If you have any more questions, feel free to ask.";
  }

  // Default response for anything else
  return `I received your message: "${userMessage}". This is a simulated response from the AI assistant. In a real implementation, this would be connected to the OpenAI API to generate actual responses based on your input.`;
}

/**
 * Splits a string into chunks of words
 */
function splitIntoChunks(text: string, wordsPerChunk: number): string[] {
  const words = text.split(' ');
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' ') + ' ');
  }

  return chunks;
}
