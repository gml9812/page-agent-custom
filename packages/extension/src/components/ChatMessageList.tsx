import type { AgentActivity, HistoricalEvent } from '@page-agent/core'
import { Bot, ChevronDown, ChevronRight, ListTodo, User } from 'lucide-react'
import { useState } from 'react'

import type { ChatMessage, TaskRun } from '@/agent/conversationTypes'
import { ActivityCard, EventCard } from '@/components/cards'
import { cn } from '@/lib/utils'

const TASK_CARD_COPY = {
	task: 'Task',
	running: 'Running',
	completed: 'Completed',
	error: 'Failed',
	steps: 'steps',
	show: 'Expand',
	hide: 'Collapse',
	pending: 'No steps are available yet.',
}

function TaskMessageCard({
	message,
	run,
	isActive,
	liveHistory,
	liveActivity,
}: {
	message: ChatMessage
	run: TaskRun | null
	isActive: boolean
	liveHistory: HistoricalEvent[]
	liveActivity: AgentActivity | null
}) {
	const [expanded, setExpanded] = useState(false)
	const history = isActive ? liveHistory : run?.history ?? []
	const language = run?.language ?? 'en'
	const status = isActive ? 'running' : run?.status ?? 'running'
	const statusLabel =
		status === 'running'
			? TASK_CARD_COPY.running
			: status === 'completed'
				? TASK_CARD_COPY.completed
				: TASK_CARD_COPY.error
	const summary = run?.assistantSummary

	return (
		<div className="rounded-lg border border-emerald-500/25 bg-emerald-500/8">
			<button
				type="button"
				onClick={() => setExpanded((prev) => !prev)}
				className="flex w-full cursor-pointer items-start gap-2 rounded-lg p-2.5 text-left"
			>
				<ListTodo className="mt-0.5 size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
				<div className="min-w-0 flex-1">
					<div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
						<span>{TASK_CARD_COPY.task}</span>
						<div className="flex items-center gap-2">
							<span>{statusLabel}</span>
							<span>
								{history.filter((event) => event.type === 'step').length} {TASK_CARD_COPY.steps}
							</span>
							<span>{expanded ? TASK_CARD_COPY.hide : TASK_CARD_COPY.show}</span>
							{expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
						</div>
					</div>
					<p className="whitespace-pre-wrap text-foreground">{message.content}</p>
					{summary && !expanded && (
						<p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{summary}</p>
					)}
				</div>
			</button>

			{expanded && (
				<div className="space-y-2 border-t border-emerald-500/15 px-2.5 pb-2.5 pt-2">
					{history.length === 0 && (
						<div className="rounded-md border border-dashed border-muted-foreground/30 px-2 py-2 text-[11px] text-muted-foreground">
							{TASK_CARD_COPY.pending}
						</div>
					)}

					{history.map((event, index) => (
						<EventCard key={`${message.id}-${index}`} event={event} language={language} />
					))}

					{isActive && liveActivity && <ActivityCard activity={liveActivity} language={language} />}
				</div>
			)}
		</div>
	)
}

export function ChatMessageList({
	messages,
	taskRuns,
	currentTaskRunId,
	liveHistory,
	liveActivity,
	plannerStatus,
	plannerError,
}: {
	messages: ChatMessage[]
	taskRuns: TaskRun[]
	currentTaskRunId: string | null
	liveHistory: HistoricalEvent[]
	liveActivity: AgentActivity | null
	plannerStatus: 'idle' | 'planning'
	plannerError: string | null
}) {
	const taskRunMap = new Map(taskRuns.map((run) => [run.id, run]))

	return (
		<div className="space-y-2">
			{messages.map((message) => {
				if (message.role === 'task' && message.taskRunId) {
					return (
						<TaskMessageCard
							key={message.id}
							message={message}
							run={taskRunMap.get(message.taskRunId) ?? null}
							isActive={message.taskRunId === currentTaskRunId}
							liveHistory={liveHistory}
							liveActivity={liveActivity}
						/>
					)
				}

				return (
					<div
						key={message.id}
						className={cn(
							'rounded-lg border p-2.5 text-xs',
							message.role === 'user'
								? 'border-blue-500/20 bg-blue-500/10'
								: 'border-border bg-muted/40'
						)}
					>
						<div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
							{message.role === 'user' ? <User className="size-3" /> : <Bot className="size-3" />}
							<span>{message.role === 'user' ? 'You' : 'Assistant'}</span>
						</div>
						<p className="whitespace-pre-wrap text-foreground">{message.content}</p>
					</div>
				)
			})}

			{plannerStatus === 'planning' && (
				<div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
					Preparing the next step from your request...
				</div>
			)}

			{plannerError && (
				<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
					{plannerError}
				</div>
			)}
		</div>
	)
}
