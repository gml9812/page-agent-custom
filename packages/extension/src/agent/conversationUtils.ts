import type {
	ConversationLanguage,
	ConversationSettings,
	PlannerDecision,
	TaskDraft,
} from './conversationTypes'
import type { BrowserState } from '@page-agent/page-controller'

export function normalizePlannerDecision(decision: PlannerDecision): PlannerDecision {
	const assistantMessage = decision.assistantMessage.trim()
	const task = decision.task?.trim() || undefined
	const intent = task
		? decision.intent
		: decision.intent === 'run_task'
			? 'clarify'
			: decision.intent

	return {
		assistantMessage,
		intent,
		task,
		autoRunSuggested: decision.autoRunSuggested ?? false,
	}
}

export function createTaskDraft(userRequest: string, decision: PlannerDecision): TaskDraft | null {
	if (decision.intent !== 'run_task' || !decision.task) {
		return null
	}

	return {
		userRequest: userRequest.trim(),
		task: decision.task,
		autoRunSuggested: decision.autoRunSuggested ?? false,
	}
}

export function shouldAutoRunDraft(
	draft: TaskDraft | null,
	settings: ConversationSettings
): boolean {
	if (!draft) return false
	if (settings.requireApprovalBeforeRun ?? true) return false
	return draft.autoRunSuggested
}

export function detectConversationLanguage(text: string): ConversationLanguage {
	return /[\u3131-\u318E\uAC00-\uD7A3]/.test(text) ? 'ko' : 'en'
}

export function formatPlannerPageSnapshot(browserState: BrowserState): string {
	const compact = [browserState.header, browserState.content, browserState.footer]
		.filter(Boolean)
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim()

	const maxLength = 3000
	const trimmed =
		compact.length > maxLength ? `${compact.slice(0, maxLength)}\n\n[Snapshot truncated]` : compact

	return [
		`Current URL: ${browserState.url}`,
		`Current title: ${browserState.title}`,
		'Current readable page snapshot:',
		trimmed || '(empty page snapshot)',
	].join('\n')
}
