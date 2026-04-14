import type { ConversationSettings, PlannerDecision, TaskDraft } from './conversationTypes'

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
