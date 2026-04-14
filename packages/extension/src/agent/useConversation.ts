import { useCallback, useEffect, useRef, useState } from 'react'

import { ConversationPlanner } from './ConversationPlanner'
import type { ChatMessage, PlannerDecision, TaskDraft, TaskRun } from './conversationTypes'
import {
	createTaskDraft,
	detectConversationLanguage,
	formatPlannerPageSnapshot,
} from './conversationUtils'
import { type ExtConfig, useAgent } from './useAgent'

export interface UseConversationResult {
	chatMessages: ChatMessage[]
	taskRuns: TaskRun[]
	currentTaskRunId: string | null
	plannerStatus: 'idle' | 'planning'
	plannerError: string | null
	currentRunDraft: TaskDraft | null
	status: ReturnType<typeof useAgent>['status']
	history: ReturnType<typeof useAgent>['history']
	activity: ReturnType<typeof useAgent>['activity']
	currentTask: string
	config: ExtConfig | null
	sendMessage: (content: string) => Promise<void>
	runTaskDirect: (task: string, userRequest?: string) => Promise<void>
	stop: () => void
	configure: ReturnType<typeof useAgent>['configure']
}

export function useConversation(): UseConversationResult {
	const {
		status,
		history,
		activity,
		currentTask,
		config,
		execute,
		inspectCurrentPage,
		stop,
		configure,
	} = useAgent()
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
	const [taskRuns, setTaskRuns] = useState<TaskRun[]>([])
	const [currentTaskRunId, setCurrentTaskRunId] = useState<string | null>(null)
	const [plannerStatus, setPlannerStatus] = useState<'idle' | 'planning'>('idle')
	const [plannerError, setPlannerError] = useState<string | null>(null)
	const [currentRunDraft, setCurrentRunDraft] = useState<TaskDraft | null>(null)
	const plannerRef = useRef<ConversationPlanner | null>(null)
	const messagesRef = useRef<ChatMessage[]>([])

	useEffect(() => {
		messagesRef.current = chatMessages
	}, [chatMessages])

	useEffect(() => {
		if (!config) return
		plannerRef.current = new ConversationPlanner(config)
	}, [config])

	const appendMessage = useCallback(
		(role: ChatMessage['role'], content: string, options?: { taskRunId?: string }) => {
			if (!content.trim()) return

			setChatMessages((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					role,
					content: content.trim(),
					createdAt: Date.now(),
					taskRunId: options?.taskRunId,
				},
			])
		},
		[]
	)

	const runDraft = useCallback(
		async (draft: TaskDraft) => {
			const planner = plannerRef.current
			const normalizedTask = draft.task.trim()
			if (!normalizedTask) return

			const language = detectConversationLanguage(draft.userRequest)
			const nextDraft = { ...draft, task: normalizedTask }
			const taskRunId = crypto.randomUUID()
			const startedAt = Date.now()

			setPlannerError(null)
			setCurrentRunDraft(nextDraft)
			setCurrentTaskRunId(taskRunId)
			appendMessage('task', normalizedTask, { taskRunId })
			appendMessage(
				'assistant',
				language === 'ko'
					? '지금 이 작업을 브라우저에서 실행합니다.'
					: 'Running this task in the browser now.'
			)

			try {
				const result = await execute(normalizedTask)
				const completedRun: TaskRun = {
					id: taskRunId,
					userRequest: draft.userRequest,
					task: normalizedTask,
					language,
					status: result.success ? 'completed' : 'error',
					history: [...result.history],
					resultText: result.data,
					createdAt: startedAt,
					completedAt: Date.now(),
				}

				let assistantSummary: string | null = null
				if (planner) {
					try {
						assistantSummary = await planner.summarizeResult({
							userRequest: draft.userRequest,
							task: normalizedTask,
							language,
							success: result.success,
							resultText: result.data,
						})
					} catch (error) {
						console.warn('[SidePanel] Failed to summarize task result:', error)
					}
				}

				if (!assistantSummary) {
					assistantSummary =
						language === 'ko'
							? result.success
								? `작업이 완료되었습니다. 결과: ${result.data}`
								: `작업이 실패했습니다. 결과: ${result.data}`
							: result.success
								? `The task completed successfully. Result: ${result.data}`
								: `The task failed. Result: ${result.data}`
				}

				setTaskRuns((prev) => [
					...prev,
					{
						...completedRun,
						assistantSummary,
					},
				])
				appendMessage('assistant', assistantSummary)
			} finally {
				setCurrentTaskRunId((prev) => (prev === taskRunId ? null : prev))
			}
		},
		[appendMessage, execute]
	)

	const sendMessage = useCallback(
		async (content: string) => {
			const planner = plannerRef.current
			const userMessage = content.trim()

			if (!planner) throw new Error('Conversation planner not initialized')
			if (!userMessage || status === 'running' || plannerStatus === 'planning') return

			appendMessage('user', userMessage)
			setPlannerError(null)
			setPlannerStatus('planning')

			try {
				const browserState = await inspectCurrentPage()
				const decision = (await planner.plan({
					messages: messagesRef.current,
					userMessage,
					currentPageSnapshot: browserState ? formatPlannerPageSnapshot(browserState) : undefined,
				})) as PlannerDecision

				appendMessage('assistant', decision.assistantMessage)

				const draft = createTaskDraft(userMessage, decision)
				if (!draft) return

				await runDraft(draft)
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error)
				setPlannerError(message)
				appendMessage('assistant', `I could not prepare a task: ${message}`)
			} finally {
				setPlannerStatus('idle')
			}
		},
		[appendMessage, inspectCurrentPage, plannerStatus, runDraft, status]
	)

	const runTaskDirect = useCallback(
		async (task: string, userRequest?: string) => {
			const normalizedTask = task.trim()
			if (!normalizedTask || status === 'running' || plannerStatus === 'planning') return

			const draft = {
				userRequest: userRequest?.trim() || normalizedTask,
				task: normalizedTask,
				autoRunSuggested: false,
			}

			await runDraft(draft)
		},
		[plannerStatus, runDraft, status]
	)

	return {
		chatMessages,
		taskRuns,
		currentTaskRunId,
		plannerStatus,
		plannerError,
		currentRunDraft,
		status,
		history,
		activity,
		currentTask,
		config,
		sendMessage,
		runTaskDirect,
		stop,
		configure,
	}
}
