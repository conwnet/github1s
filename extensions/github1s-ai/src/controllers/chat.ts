import type { ViewEvent } from '@/common/protocol';
import { getQuickAction } from '@/common/quick-actions';
import {
	isSameContextAttachment,
	preserveContextAttachmentId,
	selectFile,
	type ContextAttachmentDescriptor,
} from '@/contexts';
import type { Stores } from '@/stores';

import { Controller } from './common';
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
		await this.runner.send({ text: event.text });
	}

	@Controller.handler('chat.cancel')
	async handleCancel(_event: ViewEvent<'chat.cancel'>): Promise<void> {
		await this.runner.cancelCurrent();
	}

	@Controller.handler('chat.runQuickAction')
	async handleRunQuickAction(event: ViewEvent<'chat.runQuickAction'>): Promise<void> {
		const runtime = await this.stores.runtime.get();
		const action = getQuickAction(event.action);
		const attachment = action.attachment ? runtime.chat[action.attachment] : undefined;
		if (action.attachment && !attachment) {
			const message =
				action.attachment === 'currentFile'
					? 'No current file is available.'
					: 'Select some code before running this action.';
			await this.stores.runtime.setIn('chat.notice', { severity: 'error', message });
			return;
		}
		if (attachment) await this.add([attachment]);
		await this.runner.send({ action: event.action });
	}

	@Controller.handler('chat.addContextAttachment')
	async handleAddContextAttachment(event: ViewEvent<'chat.addContextAttachment'>): Promise<void> {
		const runtime = await this.stores.runtime.get();
		let descriptor: ContextAttachmentDescriptor | undefined;
		try {
			switch (event.action) {
				case 'selectFile':
					descriptor = await selectFile();
					break;
				case 'currentFile':
					descriptor = runtime.chat.currentFile;
					break;
				case 'currentSelection':
					descriptor = runtime.chat.currentSelection;
					break;
				case 'descriptor':
					descriptor = event.descriptor;
					break;
			}
		} catch (error) {
			const detail = error instanceof Error ? error.message : 'Unknown error.';
			await this.stores.runtime.setIn('chat.notice', {
				severity: 'error',
				message: `Unable to select a context attachment. ${detail}`,
			});
			return;
		}
		if (descriptor) await this.add([descriptor]);
	}

	@Controller.handler('chat.removeContextAttachment')
	async handleRemoveContextAttachment(event: ViewEvent<'chat.removeContextAttachment'>): Promise<void> {
		const runtime = await this.stores.runtime.get();
		await this.stores.runtime.setIn('chat', {
			...runtime.chat,
			pendingAttachments: (runtime.chat.pendingAttachments ?? []).filter(({ id }) => id !== event.id),
			notice: undefined,
		});
	}

	private async add(descriptors: readonly ContextAttachmentDescriptor[]): Promise<void> {
		const runtime = await this.stores.runtime.get();
		await this.stores.runtime.setIn('chat', {
			...runtime.chat,
			pendingAttachments: mergeAttachmentDescriptors(runtime.chat.pendingAttachments ?? [], descriptors),
			notice: undefined,
		});
	}
}

const mergeAttachmentDescriptors = (
	current: readonly ContextAttachmentDescriptor[],
	incoming: readonly ContextAttachmentDescriptor[],
): ContextAttachmentDescriptor[] => {
	const merged = current.map((descriptor) => ({ ...descriptor }));
	for (const descriptor of incoming) {
		const index = merged.findIndex((existing) => isSameContextAttachment(existing, descriptor));
		const next = preserveContextAttachmentId(descriptor, index >= 0 ? merged[index] : undefined);
		if (index >= 0) merged.splice(index, 1);
		merged.push(next);
	}
	return merged;
};
