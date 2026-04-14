import type { HistoricalEvent } from '@page-agent/core'

export type ChatRole = 'user' | 'assistant' | 'task'
export type ConversationLanguage = 'en' | 'ko'
export type TaskRunStatus = 'running' | 'completed' | 'error'

export interface ChatMessage {
	id: string
	role: ChatRole
	content: string
	createdAt: number
	taskRunId?: string
}

export interface TaskDraft {
	userRequest: string
	task: string
	autoRunSuggested: boolean
}

export interface TaskRun {
	id: string
	userRequest: string
	task: string
	language: ConversationLanguage
	status: TaskRunStatus
	history: HistoricalEvent[]
	resultText?: string
	assistantSummary?: string
	createdAt: number
	completedAt?: number
}

export interface ConversationSettings {
	requireApprovalBeforeRun?: boolean
}

export interface PlannerDecision {
	assistantMessage: string
	intent: 'answer' | 'clarify' | 'run_task'
	task?: string
	autoRunSuggested?: boolean
}

export interface PlannerContext {
	messages: ChatMessage[]
	userMessage: string
	currentPageSnapshot?: string
}

export interface ResultSummaryContext {
	userRequest: string
	task: string
	language: ConversationLanguage
	success: boolean
	resultText: string
}
