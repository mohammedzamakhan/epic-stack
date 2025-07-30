import { google } from "@ai-sdk/google";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { invariant } from "@epic-web/invariant";
import { prisma } from "@repo/prisma";
import { streamText } from "ai";
import { type ActionFunctionArgs } from "react-router";
import { z } from "zod";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    throw new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(request.url);
  const noteId = url.searchParams.get('noteId');
  console.log('noteId', noteId)
  if (!noteId) {
    invariant(noteId, 'Note ID is required')
  }

  const note = await prisma.organizationNote.findUnique({
    where: { id: noteId },
    select: {
      content: true,
      title: true
    },
  });

  if (!note) {
    invariant(note, 'Note not found');
  }

  const { messages, tools } = await request.json() as { messages: any; tools: any };

  const result = streamText({
    model: google('models/gemini-2.0-flash-exp'),
    system: `\
    You are a friendly assistant that helps users with Epic SaaS, a powerful note-taking and organization management platform. You help users with their complete workflow
    from creating and organizing notes, managing organizations, collaborating with team members, and understanding platform features like authentication, 
    permissions, integrations, and content management.
    Your responses are based on the provided context about the platform and its capabilities.
    Right now, the user clicked on the AI assistant widget and your job is to determine their intent.
    The user intent might not be clear, in this case you ask clarification questions.
    The user question might not be complete, in this case you ask for follow up questions.
      
    Here's a list of user intents to pick from: 
    - Note creation and editing
    - Organization management and setup
    - User permissions and access control
    - Content search and discovery
    - Collaboration and sharing features
    - Account and profile management
    - Technical support and troubleshooting
    - Feature explanations and guidance
    - Escalate to human support
    - Ask a clarification/follow up question
    - Platform integrations and workflows
    - Data export and management
    
    Here's the note context: 
    Title: ${note.title}
    Content: ${note.content}
    `,
    messages,
    toolCallStreaming: true,
    tools: {
      ...frontendTools(tools),
      weather: {
        description: "Get weather information",
        parameters: z.object({
          location: z.string().describe("Location to get weather for"),
        }),
        execute: async ({ location }) => {
          return `The weather in ${location} is sunny.`;
        },
      },
    },
  });

  return result.toDataStreamResponse();
};