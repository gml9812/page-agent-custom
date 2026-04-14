import { Bot, ListTodo, User } from 'lucide-react'

import type { ChatMessage } from '@/agent/conversationTypes'
import { cn } from '@/lib/utils'

export function ChatMessageList({
	messages,
	plannerStatus,
	plannerError,
}: {
	messages: ChatMessage[]
	plannerStatus: 'idle' | 'planning'
	plannerError: string | null
}) {
	return (
		<div className="space-y-2">
			{messages.map((message) => (
				<div
					key={message.id}
					className={cn(
						'rounded-lg border p-2.5 text-xs',
						message.role === 'user'
							? 'bg-blue-500/10 border-blue-500/20'
							: message.role === 'task'
								? 'bg-emerald-500/8 border-emerald-500/25'
								: 'bg-muted/40 border-border'
					)}
				>
					<div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
						{message.role === 'user' ? (
							<User className="size-3" />
						) : message.role === 'task' ? (
							<ListTodo className="size-3" />
						) : (
							<Bot className="size-3" />
						)}
						<span>
							{message.role === 'user' ? 'You' : message.role === 'task' ? 'Task' : 'Assistant'}
						</span>
					</div>
					<p className="whitespace-pre-wrap text-foreground">{message.content}</p>
				</div>
			))}

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
