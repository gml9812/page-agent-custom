export type ChatRole = 'user' | 'assistant' | 'task'

export interface ChatMessage {
	id: string
	role: ChatRole
	content: string
	createdAt: number
}

export interface TaskDraft {
	userRequest: string
	task: string
	autoRunSuggested: boolean
}

export interface ExecutedTask extends TaskDraft {
	id: string
	createdAt: number
	status: 'running' | 'completed' | 'error'
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
}
