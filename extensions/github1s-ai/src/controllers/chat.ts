import type { ContextAttachmentDescriptor } from '@/common/context';
import { resolvePrompts } from '@/common/prompts-config';
import type { ViewEvent } from '@/common/protocol';
import { getQuickAction } from '@/common/quick-actions';
import type { Stores } from '@/stores';

import { Controller } from './common';
import { isSameContextAttachment, preserveContextAttachmentId, selectFile } from './context';
import type { ConversationRunner } from './runner';

export class ChatController extends Controller {
	constructor(
		stores: Stores,
		private readonly runner: ConversationRunner,
	) {
		super(stores);
	}

	@Controller.handler('chat.send')
	async handleSend(event: ViewEvent<'chat.send'>): Promise<void> {
		const { chat } = await this.stores.runtime.get();
		if (chat.editing) await this.runner.edit(event.text);
		else await this.runner.send(event.text);
	}

	@Controller.handler('chat.setEditingMessageId')
	async handleSetEditingMessageId(event: ViewEvent<'chat.setEditingMessageId'>): Promise<void> {
		const { chat } = await this.stores.runtime.get();
		if (this.runner.getPhase(chat.conversation?.id) !== 'idle') return;
		if (event.id === undefined) {
			await this.stores.runtime.setIn('chat', { ...chat, editing: undefined, notice: undefined });
			return;
		}
		if (chat.editing?.messageId === event.id) return;
		const message = chat.conversation?.messages.find((candidate) => candidate.id === event.id);
		if (message?.role !== 'user') return;
		await this.stores.runtime.setIn('chat', {
			...chat,
			editing: {
				messageId: message.id,
				pendingAttachments: message.parts.flatMap((part) =>
					part.type === 'data-attachments' ? part.data.map(({ content, ...descriptor }) => descriptor) : [],
				),
				includeRecentFiles: true,
			},
			notice: undefined,
		});
	}

	@Controller.handler('chat.retry')
	async handleRetry(event: ViewEvent<'chat.retry'>): Promise<void> {
		await this.runner.retry(event.id);
	}

	@Controller.handler('chat.fork')
	async handleFork(event: ViewEvent<'chat.fork'>): Promise<void> {
		await this.runner.fork(event.id);
	}

	@Controller.handler('chat.cancel')
	async handleCancel(_event: ViewEvent<'chat.cancel'>): Promise<void> {
		await this.runner.cancelCurrent();
	}

	@Controller.handler('chat.setIncludeRecentFiles')
	async handleSetIncludeRecentFiles(event: ViewEvent<'chat.setIncludeRecentFiles'>): Promise<void> {
		const { chat } = await this.stores.runtime.get();
		await this.stores.runtime.setIn(
			chat.editing ? 'chat.editing.includeRecentFiles' : 'chat.includeRecentFiles',
			event.enabled,
		);
	}

	@Controller.handler('chat.runQuickAction')
	async handleRunQuickAction(event: ViewEvent<'chat.runQuickAction'>): Promise<void> {
		const { chat } = await this.stores.runtime.get();
		const action = getQuickAction(event.action);
		const attachment = action.attachment ? chat[action.attachment] : undefined;
		if (action.attachment && !attachment) {
			const message =
				action.attachment === 'currentFile'
					? 'No current file is available.'
					: 'Select some code before running this action.';
			await this.stores.runtime.setIn('chat.notice', { severity: 'error', message });
			return;
		}
		if (attachment) await this.add(attachment);
		const prompts = resolvePrompts(await this.stores.promptsConfig.get());
		await this.runner.send(prompts.quickActions[event.action]);
	}

	@Controller.handler('chat.addContextAttachment')
	async handleAddContextAttachment(event: ViewEvent<'chat.addContextAttachment'>): Promise<void> {
		const { chat } = await this.stores.runtime.get();
		let descriptor: ContextAttachmentDescriptor | undefined;
		try {
			if (event.action === 'selectFile') descriptor = await selectFile();
			else if (event.action === 'descriptor') descriptor = event.descriptor;
			else descriptor = chat[event.action];
		} catch (error) {
			const detail = error instanceof Error ? error.message : 'Unknown error.';
			await this.stores.runtime.setIn('chat.notice', {
				severity: 'error',
				message: `Unable to select a context attachment. ${detail}`,
			});
			return;
		}
		if ((await this.stores.runtime.get()).chat.editing?.messageId !== chat.editing?.messageId) return;
		if (descriptor) await this.add(descriptor);
	}

	@Controller.handler('chat.removeContextAttachment')
	async handleRemoveContextAttachment(event: ViewEvent<'chat.removeContextAttachment'>): Promise<void> {
		const runtime = await this.stores.runtime.get();
		const context = runtime.chat.editing ?? runtime.chat;
		const pendingAttachments = (context.pendingAttachments ?? []).filter(({ id }) => id !== event.id);
		await this.stores.runtime.setIn('chat', {
			...runtime.chat,
			...(runtime.chat.editing ? { editing: { ...runtime.chat.editing, pendingAttachments } } : { pendingAttachments }),
			notice: undefined,
		});
	}

	private async add(descriptor: ContextAttachmentDescriptor): Promise<void> {
		const { chat } = await this.stores.runtime.get();
		const pendingAttachments = [...(chat.editing?.pendingAttachments ?? chat.pendingAttachments ?? [])];
		const index = pendingAttachments.findIndex((existing) => isSameContextAttachment(existing, descriptor));
		const next = chat.editing
			? { ...descriptor, id: globalThis.crypto.randomUUID() }
			: preserveContextAttachmentId(descriptor, pendingAttachments[index]);
		if (index >= 0) pendingAttachments.splice(index, 1);
		pendingAttachments.push(next);
		await this.stores.runtime.setIn('chat', {
			...chat,
			...(chat.editing ? { editing: { ...chat.editing, pendingAttachments } } : { pendingAttachments }),
			notice: undefined,
		});
	}
}
