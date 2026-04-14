import { useCallback, useEffect, useRef, useState } from 'react'

import { ConversationPlanner } from './ConversationPlanner'
import type { ChatMessage, ExecutedTask, PlannerDecision, TaskDraft } from './conversationTypes'
import { createTaskDraft } from './conversationUtils'
import { type ExtConfig, useAgent } from './useAgent'

export interface UseConversationResult {
	chatMessages: ChatMessage[]
	plannerStatus: 'idle' | 'planning'
	plannerError: string | null
	currentRunDraft: TaskDraft | null
	executedTasks: ExecutedTask[]
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
	const { status, history, activity, currentTask, config, execute, stop, configure } = useAgent()
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
	const [plannerStatus, setPlannerStatus] = useState<'idle' | 'planning'>('idle')
	const [plannerError, setPlannerError] = useState<string | null>(null)
	const [currentRunDraft, setCurrentRunDraft] = useState<TaskDraft | null>(null)
	const [executedTasks, setExecutedTasks] = useState<ExecutedTask[]>([])
	const plannerRef = useRef<ConversationPlanner | null>(null)
	const messagesRef = useRef<ChatMessage[]>([])

	useEffect(() => {
		messagesRef.current = chatMessages
	}, [chatMessages])

	useEffect(() => {
		if (!config) return
		plannerRef.current = new ConversationPlanner(config)
	}, [config])

	const appendMessage = useCallback((role: ChatMessage['role'], content: string) => {
		if (!content.trim()) return

		setChatMessages((prev) => [
			...prev,
			{
				id: crypto.randomUUID(),
				role,
				content: content.trim(),
				createdAt: Date.now(),
			},
		])
	}, [])

	const runDraft = useCallback(
		async (draft: TaskDraft) => {
			const normalizedTask = draft.task.trim()
			if (!normalizedTask) return

			const nextDraft = { ...draft, task: normalizedTask }
			const executedTask: ExecutedTask = {
				...nextDraft,
				id: crypto.randomUUID(),
				createdAt: Date.now(),
				status: 'running',
			}

			setPlannerError(null)
			setCurrentRunDraft(nextDraft)
			setExecutedTasks((prev) => [...prev, executedTask])
			appendMessage('task', normalizedTask)
			appendMessage('assistant', 'Running this task in the browser now.')

			try {
				const result = await execute(normalizedTask)
				setExecutedTasks((prev) =>
					prev.map((task) =>
						task.id === executedTask.id
							? {
									...task,
									status: result.success ? 'completed' : 'error',
								}
							: task
					)
				)
			} catch (error) {
				setExecutedTasks((prev) =>
					prev.map((task) =>
						task.id === executedTask.id
							? {
									...task,
									status: 'error',
								}
							: task
					)
				)
				throw error
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
				const decision = (await planner.plan({
					messages: messagesRef.current,
					userMessage,
				})) as PlannerDecision

				appendMessage('assistant', decision.assistantMessage)

				const draft = createTaskDraft(userMessage, decision)
				if (!draft) {
					return
				}

				await runDraft(draft)
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error)
				setPlannerError(message)
				appendMessage('assistant', `I could not prepare a task: ${message}`)
			} finally {
				setPlannerStatus('idle')
			}
		},
		[appendMessage, plannerStatus, runDraft, status]
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
		plannerStatus,
		plannerError,
		currentRunDraft,
		executedTasks,
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
