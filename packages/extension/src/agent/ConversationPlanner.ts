import { LLM, type LLMConfig, type Message } from '@page-agent/llms'
import * as z from 'zod/v4'

import type { PlannerContext, PlannerDecision } from './conversationTypes'
import { normalizePlannerDecision } from './conversationUtils'

const PLANNER_SYSTEM_PROMPT = `
You are the conversation planner for a browser automation assistant.

Your job is to decide whether the latest user message should:
1. be answered conversationally,
2. be clarified before automation,
3. be converted into a concrete browser automation task.

Rules:
- Prefer "clarify" when the user intent is ambiguous or missing critical details.
- Prefer "answer" when the user is asking for explanation, guidance, or discussion only.
- Use "run_task" only when the request is actionable in the browser.
- When you choose "run_task", write the task as a direct instruction for the automation agent.
- Do not mention internal schemas, tools, or hidden reasoning.
- Keep assistantMessage concise and user-facing.
- Set autoRunSuggested=true only when the request is explicit and safe to execute immediately.
`.trim()

const plannerSchema = z.object({
	assistantMessage: z.string().min(1),
	intent: z.enum(['answer', 'clarify', 'run_task']),
	task: z.string().optional(),
	autoRunSuggested: z.boolean().optional(),
})

export class ConversationPlanner {
	private readonly llm: LLM

	constructor(config: LLMConfig) {
		this.llm = new LLM(config)
	}

	async plan(context: PlannerContext): Promise<PlannerDecision> {
		const messages = this.buildMessages(context)
		const abortController = new AbortController()

		const result = await this.llm.invoke(
			messages,
			{
				plan_response: {
					description: 'Plan the assistant response and optional automation task.',
					inputSchema: plannerSchema,
					execute: async (input) => input,
				},
			},
			abortController.signal,
			{
				toolChoiceName: 'plan_response',
			}
		)

		return normalizePlannerDecision(result.toolResult as PlannerDecision)
	}

	private buildMessages(context: PlannerContext): Message[] {
		const history = context.messages
			.slice(-8)
			.map((message) => `${message.role.toUpperCase()}: ${message.content}`)
			.join('\n')

		const historyBlock = history ? `Recent conversation:\n${history}\n\n` : ''

		return [
			{
				role: 'system',
				content: PLANNER_SYSTEM_PROMPT,
			},
			{
				role: 'user',
				content:
					historyBlock +
					`Latest user message:\n${context.userMessage}\n\n` +
					'Decide the next assistant response and whether to create an automation task.',
			},
		]
	}
}
