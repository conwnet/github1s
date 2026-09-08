const COMPOSER_MAX_HEIGHT = 180;

type ComposerKeyboardEvent = Pick<KeyboardEvent, 'altKey' | 'isComposing' | 'key' | 'shiftKey'>;

export const shouldSubmitComposer = (event: ComposerKeyboardEvent): boolean =>
	event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.isComposing;

/**
 * Fit the composer to its content until the agreed maximum height.
 * @param textarea Composer textarea to resize.
 */
export const resizeComposer = (textarea: HTMLTextAreaElement): void => {
	textarea.style.height = 'auto';
	const height = Math.min(textarea.scrollHeight, COMPOSER_MAX_HEIGHT);
	textarea.style.height = `${height}px`;
	textarea.style.overflowY = textarea.scrollHeight > COMPOSER_MAX_HEIGHT ? 'auto' : 'hidden';
};
