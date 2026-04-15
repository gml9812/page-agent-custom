import type {
	AgentActivity,
	AgentErrorEvent,
	AgentStepEvent,
	HistoricalEvent,
	ObservationEvent,
	RetryEvent,
} from '@page-agent/core'
import {
	Brain,
	CheckCircle,
	Eye,
	Flag,
	Globe,
	Keyboard,
	LibraryBig,
	Mouse,
	MoveVertical,
	RefreshCw,
	Sparkles,
	XCircle,
	Zap,
} from 'lucide-react'
import { Fragment, useState } from 'react'

import type { ConversationLanguage } from '@/agent/conversationTypes'
import { cn } from '@/lib/utils'

function getCardCopy(_language: ConversationLanguage) {
	return {
		result: 'Result',
		success: 'Success',
		failed: 'Failed',
		step: 'Step',
		actions: 'Actions',
		output: 'Output',
		rawRequest: 'Raw Request',
		rawResponse: 'Raw Response',
		copy: 'Copy',
		copySystem: 'Copy System',
		copyUser: 'Copy User',
		copied: 'Copied!',
		thinking: 'Thinking...',
		executing: 'Executing',
		done: 'Done',
		retrying: 'Retrying',
	}
}

function ResultCard({
	success,
	text,
	children,
	language = 'en',
}: {
	success: boolean
	text: string
	children?: React.ReactNode
	language?: ConversationLanguage
}) {
	const copy = getCardCopy(language)

	return (
		<div
			className={cn(
				'rounded-lg border p-3',
				success ? 'border-green-500/30 bg-green-500/10' : 'border-destructive/30 bg-destructive/10'
			)}
		>
			<div className="mb-2 flex items-center gap-2">
				{success ? (
					<CheckCircle className="size-3.5 text-green-500" />
				) : (
					<XCircle className="size-3.5 text-destructive" />
				)}
				<span
					className={cn(
						'text-xs font-medium',
						success ? 'text-green-600 dark:text-green-400' : 'text-destructive'
					)}
				>
					{copy.result}: {success ? copy.success : copy.failed}
				</span>
			</div>
			<p className="whitespace-pre-wrap pl-5 text-[12px] text-foreground">{text}</p>
			{children}
		</div>
	)
}

function ReflectionItem({ icon, value }: { icon: React.ReactNode; value: string }) {
	const [expanded, setExpanded] = useState(false)

	return (
		<Fragment>
			<span className="flex justify-center pt-0.5 text-muted-foreground">{icon}</span>
			<button
				type="button"
				className={cn(
					'cursor-pointer text-left text-[11px] text-muted-foreground hover:text-muted-foreground/70',
					!expanded && 'line-clamp-1'
				)}
				onClick={() => setExpanded((prev) => !prev)}
			>
				{value}
			</button>
		</Fragment>
	)
}

function ReflectionSection({
	reflection,
}: {
	reflection: {
		evaluation_previous_goal?: string
		memory?: string
		next_goal?: string
	}
}) {
	const items = [
		{
			icon: <Brain className="size-3.5" />,
			label: 'eval',
			value: reflection.evaluation_previous_goal,
		},
		{
			icon: <LibraryBig className="size-3.5" />,
			label: 'memory',
			value: reflection.memory,
		},
		{
			icon: <Flag className="size-3.5" />,
			label: 'goal',
			value: reflection.next_goal,
		},
	].filter((item) => item.value)

	if (items.length === 0) return null

	return (
		<div className="mb-2">
			<div className="grid grid-cols-[16px_1fr] gap-x-2 gap-y-2">
				{items.map((item) => (
					<ReflectionItem key={item.label} icon={item.icon} value={item.value!} />
				))}
			</div>
		</div>
	)
}

function ActionIcon({ name, className }: { name: string; className?: string }) {
	const icons: Record<string, React.ReactNode> = {
		click_element_by_index: <Mouse className={className} />,
		double_click_element_by_index: <Mouse className={className} />,
		input: <Keyboard className={className} />,
		scroll: <MoveVertical className={className} />,
		go_to_url: <Globe className={className} />,
	}

	return icons[name] || <Zap className={className} />
}

function CopyButton({
	text,
	label,
	copiedLabel,
}: {
	text: string
	label: string
	copiedLabel: string
}) {
	const [copied, setCopied] = useState(false)

	return (
		<button
			type="button"
			onClick={() => {
				navigator.clipboard.writeText(text)
				setCopied(true)
				setTimeout(() => setCopied(false), 1500)
			}}
			className="shrink-0 cursor-pointer rounded border px-1 text-[9px] text-muted-foreground transition-colors hover:text-foreground"
		>
			{copied ? copiedLabel : label}
		</button>
	)
}

function extractPrompt(rawRequest: unknown, role: 'system' | 'user'): string | null {
	const messages = (rawRequest as { messages?: { role: string; content?: unknown }[] })?.messages
	if (!messages) return null

	const message =
		role === 'system'
			? messages.find((item) => item.role === role)
			: messages.findLast((item) => item.role === role)

	if (!message?.content) return null
	return typeof message.content === 'string'
		? message.content
		: JSON.stringify(message.content, null, 2)
}

function RawSection({
	rawRequest,
	rawResponse,
	language = 'en',
}: {
	rawRequest?: unknown
	rawResponse?: unknown
	language?: ConversationLanguage
}) {
	const [activeTab, setActiveTab] = useState<'request' | 'response' | null>(null)
	const copy = getCardCopy(language)

	if (!rawRequest && !rawResponse) return null

	const content =
		activeTab === 'request' ? rawRequest : activeTab === 'response' ? rawResponse : null
	const systemPrompt = activeTab === 'request' ? extractPrompt(rawRequest, 'system') : null
	const userPrompt = activeTab === 'request' ? extractPrompt(rawRequest, 'user') : null

	return (
		<div className="mt-2 border-t border-dashed pt-2">
			<div className="flex items-center gap-3">
				{rawRequest != null && (
					<button
						type="button"
						onClick={() => setActiveTab((prev) => (prev === 'request' ? null : 'request'))}
						className={cn(
							'cursor-pointer border-b text-[10px] transition-colors',
							activeTab === 'request'
								? 'border-foreground text-foreground'
								: 'border-transparent text-muted-foreground hover:text-foreground'
						)}
					>
						{copy.rawRequest}
					</button>
				)}
				{rawResponse != null && (
					<button
						type="button"
						onClick={() => setActiveTab((prev) => (prev === 'response' ? null : 'response'))}
						className={cn(
							'cursor-pointer border-b text-[10px] transition-colors',
							activeTab === 'response'
								? 'border-foreground text-foreground'
								: 'border-transparent text-muted-foreground hover:text-foreground'
						)}
					>
						{copy.rawResponse}
					</button>
				)}
			</div>

			{content != null && (
				<div className="relative mt-1.5">
					<div className="absolute top-1 right-1 flex gap-1">
						{systemPrompt && (
							<CopyButton text={systemPrompt} label={copy.copySystem} copiedLabel={copy.copied} />
						)}
						{userPrompt && (
							<CopyButton text={userPrompt} label={copy.copyUser} copiedLabel={copy.copied} />
						)}
						<CopyButton
							text={JSON.stringify(content, null, 4)}
							label={copy.copy}
							copiedLabel={copy.copied}
						/>
					</div>
					<pre className="max-h-60 overflow-x-auto overflow-y-auto rounded bg-muted p-2 pt-5 text-[10px] text-foreground/70">
						{JSON.stringify(content, null, 4)}
					</pre>
				</div>
			)}
		</div>
	)
}

function StepCard({
	event,
	language = 'en',
}: {
	event: AgentStepEvent
	language?: ConversationLanguage
}) {
	const copy = getCardCopy(language)

	return (
		<div className="rounded-lg border border-l-2 border-l-blue-500/50 bg-muted/40 p-2.5">
			<div className="mb-2 text-[11px] font-semibold tracking-wide text-foreground">
				{copy.step} #{event.stepIndex + 1}
			</div>

			{event.reflection && <ReflectionSection reflection={event.reflection} />}

			{event.action && (
				<div>
					<div className="mb-1 text-[11px] font-semibold tracking-wide text-foreground">
						{copy.actions}
					</div>
					<div className="flex items-start gap-2">
						<ActionIcon
							name={event.action.name}
							className="mt-0.5 size-3.5 shrink-0 text-blue-500"
						/>
						<div className="min-w-0 flex-1">
							<p className="mb-0.5 line-clamp-1 break-all text-xs text-foreground/80 hover:line-clamp-none">
								<span className="font-medium text-foreground/70">{event.action.name}</span>
								{event.action.name !== 'done' && (
									<span className="ml-1.5 text-muted-foreground/70">
										{JSON.stringify(event.action.input)}
									</span>
								)}
							</p>
							<p className="grid grid-cols-[auto_1fr] gap-1.5 text-[11px] text-muted-foreground/70">
								<span>{copy.output}</span>
								<span className="line-clamp-1 break-all hover:line-clamp-3">
									{event.action.output}
								</span>
							</p>
						</div>
					</div>
				</div>
			)}

			<RawSection
				rawRequest={event.rawRequest}
				rawResponse={event.rawResponse}
				language={language}
			/>
		</div>
	)
}

function ObservationCard({ event }: { event: ObservationEvent }) {
	return (
		<div className="rounded-lg border border-l-2 border-l-green-500/50 bg-muted/40 p-2.5">
			<div className="flex items-start gap-2">
				<Eye className="mt-0.5 size-3.5 shrink-0 text-green-500" />
				<span className="text-[11px] text-muted-foreground">{event.content}</span>
			</div>
		</div>
	)
}

function RetryCard({ event }: { event: RetryEvent }) {
	return (
		<div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
			<div className="flex items-start gap-1.5">
				<RefreshCw className="mt-0.5 size-3 shrink-0 text-amber-500" />
				<span className="text-xs text-amber-600 dark:text-amber-400">
					{event.message} ({event.attempt}/{event.maxAttempts})
				</span>
			</div>
		</div>
	)
}

function ErrorCard({
	event,
	language = 'en',
}: {
	event: AgentErrorEvent
	language?: ConversationLanguage
}) {
	return (
		<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5">
			<div className="flex items-start gap-1.5">
				<XCircle className="mt-0.5 size-3 shrink-0 text-destructive" />
				<span className="text-xs text-destructive">{event.message}</span>
			</div>
			<RawSection rawResponse={event.rawResponse} language={language} />
		</div>
	)
}

export function EventCard({
	event,
	language = 'en',
}: {
	event: HistoricalEvent
	language?: ConversationLanguage
}) {
	if (event.type === 'step' && event.action?.name === 'done') {
		const input = event.action.input as { text?: string; success?: boolean }
		return (
			<>
				<StepCard event={event} language={language} />
				<ResultCard
					success={input?.success ?? true}
					text={input?.text || event.action.output || ''}
					language={language}
				/>
			</>
		)
	}

	if (event.type === 'step') {
		return <StepCard event={event} language={language} />
	}

	if (event.type === 'observation') {
		return <ObservationCard event={event} />
	}

	if (event.type === 'retry') {
		return <RetryCard event={event} />
	}

	if (event.type === 'error') {
		return <ErrorCard event={event} language={language} />
	}

	return null
}

export function ActivityCard({
	activity,
	language = 'en',
}: {
	activity: AgentActivity
	language?: ConversationLanguage
}) {
	const copy = getCardCopy(language)

	const getActivityInfo = () => {
		switch (activity.type) {
			case 'thinking':
				return { text: copy.thinking, color: 'text-blue-500' }
			case 'executing':
				return { text: `${copy.executing} ${activity.tool}...`, color: 'text-amber-500' }
			case 'executed':
				return { text: `${copy.done}: ${activity.tool}`, color: 'text-green-500' }
			case 'retrying':
				return {
					text: `${copy.retrying} (${activity.attempt}/${activity.maxAttempts})...`,
					color: 'text-amber-500',
				}
			case 'error':
				return { text: activity.message, color: 'text-destructive' }
		}
	}

	const info = getActivityInfo()

	return (
		<div className="flex animate-pulse items-center gap-2 rounded-lg border bg-muted/40 p-2.5">
			<div className="relative">
				<Sparkles className={cn('size-3.5', info.color)} />
				<span
					className={cn(
						'absolute -top-0.5 -right-0.5 size-1.5 rounded-full animate-ping',
						activity.type === 'thinking'
							? 'bg-blue-500'
							: activity.type === 'executing'
								? 'bg-amber-500'
								: activity.type === 'retrying'
									? 'bg-amber-500'
									: activity.type === 'error'
										? 'bg-destructive'
										: 'bg-green-500'
					)}
				/>
			</div>
			<span className={cn('text-xs', info.color)}>{info.text}</span>
		</div>
	)
}
