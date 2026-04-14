import assert from 'node:assert/strict'
import test from 'node:test'

import { createTaskDraft, normalizePlannerDecision, shouldAutoRunDraft } from './conversationUtils'

test('normalizePlannerDecision trims values and downgrades invalid run_task decisions', () => {
	const decision = normalizePlannerDecision({
		assistantMessage: '  I need more detail.  ',
		intent: 'run_task',
		task: '   ',
		autoRunSuggested: true,
	})

	assert.deepEqual(decision, {
		assistantMessage: 'I need more detail.',
		intent: 'clarify',
		task: undefined,
		autoRunSuggested: true,
	})
})

test('createTaskDraft returns null unless a concrete task exists', () => {
	assert.equal(
		createTaskDraft('open invoices', {
			assistantMessage: 'Need more detail.',
			intent: 'clarify',
		}),
		null
	)

	assert.deepEqual(
		createTaskDraft('open invoices', {
			assistantMessage: 'I can do that.',
			intent: 'run_task',
			task: 'Open the invoice page and summarize overdue invoices.',
			autoRunSuggested: true,
		}),
		{
			userRequest: 'open invoices',
			task: 'Open the invoice page and summarize overdue invoices.',
			autoRunSuggested: true,
		}
	)
})

test('shouldAutoRunDraft respects the approval setting', () => {
	const draft = {
		userRequest: 'open invoices',
		task: 'Open the invoice page and summarize overdue invoices.',
		autoRunSuggested: true,
	}

	assert.equal(shouldAutoRunDraft(draft, { requireApprovalBeforeRun: true }), false)
	assert.equal(shouldAutoRunDraft(draft, { requireApprovalBeforeRun: false }), true)
	assert.equal(
		shouldAutoRunDraft({ ...draft, autoRunSuggested: false }, { requireApprovalBeforeRun: false }),
		false
	)
})
