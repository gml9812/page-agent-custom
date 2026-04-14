import { LLM, type LLMConfig, type Message } from '@page-agent/llms'
import * as z from 'zod/v4'

import type {
	PlannerContext,
	PlannerDecision,
	ResultSummaryContext,
} from './conversationTypes'
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
- Write assistantMessage in the same language as the latest user message.
- Set autoRunSuggested=true only when the request is explicit and safe to execute immediately.
`.trim()

const RESULT_SUMMARY_SYSTEM_PROMPT = `
You explain completed browser automation results to the user.

Rules:
- Write the reply in the same language as the original user request.
- Keep the reply concise and user-facing.
- Mention whether the task succeeded or failed.
- Summarize only the outcome that matters to the user.
- Do not mention internal tools, hidden prompts, or schemas.
`.trim()

const plannerSchema = z.object({
	assistantMessage: z.string().min(1),
	intent: z.enum(['answer', 'clarify', 'run_task']),
	task: z.string().optional(),
	autoRunSuggested: z.boolean().optional(),
})

const resultSummarySchema = z.object({
	assistantMessage: z.string().min(1),
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

	async summarizeResult(context: ResultSummaryContext): Promise<string> {
		const abortController = new AbortController()
		const result = await this.llm.invoke(
			this.buildResultMessages(context),
			{
				summarize_result: {
					description: 'Write a short assistant follow-up that explains the task result to the user.',
					inputSchema: resultSummarySchema,
					execute: async (input) => input,
				},
			},
			abortController.signal,
			{
				toolChoiceName: 'summarize_result',
			}
		)

		return resultSummarySchema.parse(result.toolResult).assistantMessage.trim()
	}

	private buildMessages(context: PlannerContext): Message[] {
		const history = context.messages
			.slice(-8)
			.map((message) => `${message.role.toUpperCase()}: ${message.content}`)
			.join('\n')

		const historyBlock = history ? `Recent conversation:\n${history}\n\n` : ''
		const pageBlock = context.currentPageSnapshot
			? `Current browser page state:\n${context.currentPageSnapshot}\n\n`
			: ''

		return [
			{
				role: 'system',
				content: PLANNER_SYSTEM_PROMPT,
			},
			{
				role: 'user',
				content:
					historyBlock +
					pageBlock +
					`Latest user message:\n${context.userMessage}\n\n` +
					'Decide the next assistant response and whether to create an automation task.',
			},
		]
	}

	private buildResultMessages(context: ResultSummaryContext): Message[] {
		return [
			{
				role: 'system',
				content: RESULT_SUMMARY_SYSTEM_PROMPT,
			},
			{
				role: 'user',
				content:
					`Original user request:\n${context.userRequest}\n\n` +
					`Executed task:\n${context.task}\n\n` +
					`Preferred reply language: ${context.language === 'ko' ? 'Korean' : 'English'}\n` +
					`Execution status: ${context.success ? 'success' : 'failure'}\n` +
					`Execution result:\n${context.resultText}\n\n` +
					'Write the assistant reply now.',
			},
		]
	}
}
