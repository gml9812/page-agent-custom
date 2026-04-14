import { ChevronDown, History, Send, Settings, Square } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useConversation } from '@/agent/useConversation'
import { ChatMessageList } from '@/components/ChatMessageList'
import { ConfigPanel } from '@/components/ConfigPanel'
import { HistoryDetail } from '@/components/HistoryDetail'
import { HistoryList } from '@/components/HistoryList'
import { ActivityCard, EventCard } from '@/components/cards'
import { EmptyState, Logo, MotionOverlay, StatusDot } from '@/components/misc'
import { Button } from '@/components/ui/button'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from '@/components/ui/input-group'
import { saveSession } from '@/lib/db'

type View =
	| { name: 'chat' }
	| { name: 'config' }
	| { name: 'history' }
	| { name: 'history-detail'; sessionId: string }

export default function App() {
	const [view, setView] = useState<View>({ name: 'chat' })
	const [inputValue, setInputValue] = useState('')
	const historyRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const {
		status,
		history,
		activity,
		currentTask,
		config,
		chatMessages,
		plannerStatus,
		plannerError,
		currentRunDraft,
		executedTasks,
		sendMessage,
		runTaskDirect,
		stop,
		configure,
	} = useConversation()
	const [selectedExecutedTaskId, setSelectedExecutedTaskId] = useState<string>('')

	// Persist session when task finishes
	const prevStatusRef = useRef(status)
	useEffect(() => {
		const prev = prevStatusRef.current
		prevStatusRef.current = status

		if (
			prev === 'running' &&
			(status === 'completed' || status === 'error') &&
			history.length > 0 &&
			currentTask &&
			currentRunDraft
		) {
			saveSession({
				task: currentTask,
				userRequest: currentRunDraft.userRequest,
				history,
				status,
			}).catch((err) => console.error('[SidePanel] Failed to save session:', err))
		}
	}, [currentRunDraft, currentTask, history, status])

	// Auto-scroll to bottom on new events
	useEffect(() => {
		if (historyRef.current) {
			historyRef.current.scrollTop = historyRef.current.scrollHeight
		}
	}, [activity, chatMessages, history, plannerStatus])

	const runTask = useCallback(
		(task: string) => {
			const normalizedTask = task.trim()
			if (!normalizedTask || status === 'running' || plannerStatus === 'planning') return

			setInputValue('')
			setView({ name: 'chat' })

			sendMessage(normalizedTask).catch((error) => {
				console.error('[SidePanel] Failed to process message:', error)
			})
		},
		[plannerStatus, sendMessage, status]
	)

	const handleSubmit = useCallback(
		(e?: React.SyntheticEvent) => {
			e?.preventDefault()
			runTask(inputValue)
		},
		[inputValue, runTask]
	)

	const handleStop = useCallback(() => {
		console.log('[SidePanel] Stopping task...')
		stop()
	}, [stop])

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
			e.preventDefault()
			handleSubmit()
		}
	}

	// --- View routing ---

	if (view.name === 'config') {
		return (
			<ConfigPanel
				config={config}
				onSave={async (newConfig) => {
					await configure(newConfig)
					setView({ name: 'chat' })
				}}
				onClose={() => setView({ name: 'chat' })}
			/>
		)
	}

	if (view.name === 'history') {
		return (
			<HistoryList
				onSelect={(id) => setView({ name: 'history-detail', sessionId: id })}
				onBack={() => setView({ name: 'chat' })}
				onRerun={(task, userRequest) => {
					setView({ name: 'chat' })
					runTaskDirect(task, userRequest).catch((error) => {
						console.error('[SidePanel] Failed to rerun task:', error)
					})
				}}
			/>
		)
	}

	if (view.name === 'history-detail') {
		return (
			<HistoryDetail
				sessionId={view.sessionId}
				onBack={() => setView({ name: 'history' })}
				onRerun={(task, userRequest) => {
					setView({ name: 'chat' })
					runTaskDirect(task, userRequest).catch((error) => {
						console.error('[SidePanel] Failed to rerun task:', error)
					})
				}}
			/>
		)
	}

	// --- Chat view ---

	const isRunning = status === 'running'
	const isPlanning = plannerStatus === 'planning'
	const selectedExecutedTask =
		executedTasks.find((task) => task.id === selectedExecutedTaskId) ||
		executedTasks[executedTasks.length - 1] ||
		null
	const showEmptyState =
		chatMessages.length === 0 && history.length === 0 && !isRunning && !isPlanning

	return (
		<div className="relative flex flex-col h-screen bg-background">
			<MotionOverlay active={isRunning} />
			{/* Header */}
			<header className="flex items-center justify-between border-b px-3 py-2">
				<div className="flex items-center gap-2">
					<Logo className="size-5" />
					<span className="text-sm font-medium">Page Agent Ext</span>
				</div>
				<div className="flex items-center gap-1">
					<StatusDot status={status} />
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setView({ name: 'history' })}
						className="cursor-pointer"
					>
						<History className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setView({ name: 'config' })}
						className="cursor-pointer"
					>
						<Settings className="size-3.5" />
					</Button>
				</div>
			</header>

			{/* Content */}
			<main className="flex-1 overflow-hidden flex flex-col">
				{executedTasks.length > 0 && (
					<div className="border-b px-3 py-2 bg-muted/20 space-y-2">
						<div className="flex items-center gap-2">
							<div className="text-[10px] text-muted-foreground uppercase tracking-wide shrink-0">
								Session Tasks
							</div>
							<div className="relative flex-1">
								<select
									value={selectedExecutedTaskId}
									onChange={(e) => setSelectedExecutedTaskId(e.target.value)}
									className="h-8 w-full appearance-none rounded-md border border-input bg-background px-2 pr-8 text-xs cursor-pointer"
								>
									{executedTasks.map((task, index) => (
										<option key={task.id} value={task.id}>
											{index + 1}. {task.userRequest}
										</option>
									))}
								</select>
								<ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
							</div>
						</div>

						{selectedExecutedTask && (
							<div className="rounded-md border bg-background px-2.5 py-2">
								<div className="flex items-center justify-between gap-2">
									<div className="text-[10px] text-muted-foreground uppercase tracking-wide">
										Selected Task
									</div>
									<span className="text-[10px] text-muted-foreground capitalize">
										{selectedExecutedTask.status}
									</span>
								</div>
								<div
									className="mt-1 text-xs font-medium truncate"
									title={selectedExecutedTask.userRequest}
								>
									{selectedExecutedTask.userRequest}
								</div>
								<div
									className="mt-1 text-[11px] text-muted-foreground whitespace-pre-wrap line-clamp-3"
									title={selectedExecutedTask.task}
								>
									{selectedExecutedTask.task}
								</div>
							</div>
						)}
					</div>
				)}

				{/* History */}
				<div ref={historyRef} className="flex-1 overflow-y-auto p-3 space-y-2">
					{showEmptyState && <EmptyState />}

					{(chatMessages.length > 0 || isPlanning || plannerError) && (
						<ChatMessageList
							messages={chatMessages}
							plannerStatus={plannerStatus}
							plannerError={plannerError}
						/>
					)}

					{history.map((event, index) => (
						<EventCard key={index} event={event} />
					))}

					{/* Activity indicator at bottom */}
					{activity && <ActivityCard activity={activity} />}
				</div>
			</main>

			{/* Input */}
			<footer className="border-t p-3">
				<InputGroup className="relative rounded-lg">
					<InputGroupTextarea
						ref={textareaRef}
						placeholder="Ask a question or describe a task... (Enter to send)"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						disabled={isRunning || isPlanning}
						className="text-xs pr-12 min-h-10"
					/>
					<InputGroupAddon align="inline-end" className="absolute bottom-0 right-0">
						{isRunning ? (
							<InputGroupButton
								size="icon-sm"
								variant="destructive"
								onClick={handleStop}
								className="size-7"
							>
								<Square className="size-3" />
							</InputGroupButton>
						) : (
							<InputGroupButton
								size="icon-sm"
								variant="default"
								onClick={() => handleSubmit()}
								disabled={!inputValue.trim() || isPlanning}
								className="size-7 cursor-pointer"
							>
								<Send className="size-3" />
							</InputGroupButton>
						)}
					</InputGroupAddon>
				</InputGroup>
			</footer>
		</div>
	)
}
