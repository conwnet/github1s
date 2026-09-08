import type { ReasoningUIPart } from 'ai';
import { html } from 'htm/preact';

import type { ConversationMessage, ConversationMessageStatus } from '@/common/conversation';

import type { PostMarkdownHighlightRequest } from '../helpers/highlighting';
import {
	createToolActivity,
	isChatToolPart,
	toolActivityStatus,
	type ChatToolPart,
	type ToolActivity,
} from '../helpers/tool-presentation';
import { Icon, type IconName } from './Icon';
import { Markdown } from './Markdown';

export type AssistantActivityPart = ReasoningUIPart | ChatToolPart;
type ActivityState = 'running' | 'error' | 'interrupted' | 'complete';

const ACTIVITY_STATE_ICONS = {
	running: 'sparkle',
	error: 'warning',
	interrupted: 'stop',
	complete: 'check',
} as const satisfies Record<ActivityState, IconName>;

interface AssistantActivityProps {
	parts: readonly AssistantActivityPart[];
	messageStatus: ConversationMessageStatus;
	active: boolean;
	post: PostMarkdownHighlightRequest;
}

export const isAssistantActivityPart = (part: ConversationMessage['parts'][number]): part is AssistantActivityPart =>
	part.type === 'reasoning' || isChatToolPart(part);

export const AssistantActivity = ({ parts, messageStatus, active, post }: AssistantActivityProps) => {
	const toolActivities = parts.flatMap((part) =>
		isChatToolPart(part) ? [createToolActivity(part, messageStatus)] : [],
	);
	const toolActivityById = new Map(toolActivities.map((activity) => [activity.toolCallId, activity]));
	const runningPart = findRunningPart(parts, messageStatus);
	const failedTools = toolActivities.filter(({ status }) => status === 'error').length;
	const state = resolveActivityState(active, messageStatus, failedTools);
	const summary =
		active && runningPart
			? activeActivityLabel(runningPart)
			: completedActivityLabel(
					parts.some(({ type }) => type === 'reasoning'),
					toolActivities.length,
				);
	const statusLabel = activityStatusLabel(state, runningPart, messageStatus, failedTools);

	return html`<details class=${`assistant-activity assistant-activity-${state}`} open=${active}>
		<summary class="assistant-activity-summary">
			<span class="activity-chevron"><${Icon} name="chevron-right" /></span>
			<span class="activity-state-icon"><${Icon} name=${ACTIVITY_STATE_ICONS[state]} /></span>
			<span class="activity-summary-label">${summary}</span>
			<span class="activity-summary-status">${statusLabel}</span>
		</summary>
		<div class="assistant-activity-body">
			${parts.map((part, index) =>
				part.type === 'reasoning'
					? html`<${ReasoningActivity}
							key=${part.id ?? `reasoning-${index}`}
							part=${part}
							running=${isPartRunning(part, messageStatus)}
							post=${post}
						/>`
					: html`<${ToolActivityView} key=${part.toolCallId} activity=${toolActivityById.get(part.toolCallId)} />`,
			)}
		</div>
	</details>`;
};

const ReasoningActivity = ({
	part,
	running,
	post,
}: {
	part: ReasoningUIPart;
	running: boolean;
	post: PostMarkdownHighlightRequest;
}) => html`
	<details class=${`activity-step reasoning-step${running ? ' activity-step-running' : ''}`} open=${running}>
		<summary class="reasoning-entry-summary">
			<span class="activity-step-node"><${Icon} name="sparkle" /></span>
			<strong>Reasoning</strong>
			<span class="reasoning-entry-status">${running ? 'Thinking…' : 'Done'}</span>
			<span class="reasoning-entry-chevron"><${Icon} name="chevron-right" /></span>
		</summary>
		<div class="reasoning-entry-body">
			${part.text
				? html`<${Markdown} source=${part.text} className="reasoning-markdown" post=${post} />`
				: html`<p class="activity-placeholder">Considering the request…</p>`}
		</div>
	</details>
`;

const ToolActivityView = ({ activity }: { activity?: ToolActivity }) => {
	if (!activity) return null;
	return html`
		<div class=${`activity-step tool-step tool-step-${activity.status}`}>
			<span class="activity-step-node"><${Icon} name="terminal" /></span>
			<div class="activity-step-content">
				<details class="tool-entry" open=${activity.status === 'running'}>
					<summary class="tool-entry-summary">
						<span class="tool-entry-label">
							<strong>${toolDisplayName(activity.toolName)}</strong>
							${activity.target ? html`<code title=${activity.target}>${activity.target}</code>` : null}
						</span>
						<span class="tool-entry-status">${activity.statusLabel}</span>
						<span class="tool-entry-chevron"><${Icon} name="chevron-right" /></span>
					</summary>
					<div class="tool-entry-details">
						<${ToolDetail} label="Input" value=${activity.input} />
						${activity.output !== undefined
							? html`<${ToolDetail}
									label=${activity.status === 'error' ? 'Error' : 'Output'}
									value=${activity.output}
								/>`
							: null}
					</div>
				</details>
			</div>
		</div>
	`;
};

const ToolDetail = ({ label, value }: { label: string; value: string }) => html`
	<section class="tool-detail">
		<h4>${label}</h4>
		<pre><code>${value || 'No data available.'}</code></pre>
	</section>
`;

const isPartRunning = (part: AssistantActivityPart, messageStatus: ConversationMessageStatus): boolean => {
	if (messageStatus !== 'streaming') return false;
	if (part.type === 'reasoning') return part.state !== 'done';
	return toolActivityStatus(part, messageStatus) === 'running';
};

const findRunningPart = (
	parts: readonly AssistantActivityPart[],
	messageStatus: ConversationMessageStatus,
): AssistantActivityPart | undefined => {
	for (let index = parts.length - 1; index >= 0; index -= 1) {
		const part = parts[index];
		if (isPartRunning(part, messageStatus)) return part;
	}
	return undefined;
};

const resolveActivityState = (
	active: boolean,
	messageStatus: ConversationMessageStatus,
	failedTools: number,
): ActivityState => {
	if (active) return 'running';
	if (messageStatus === 'failed' || failedTools > 0) return 'error';
	if (messageStatus === 'aborted' || messageStatus === 'unknown') return 'interrupted';
	return 'complete';
};

const activityStatusLabel = (
	state: ActivityState,
	runningPart: AssistantActivityPart | undefined,
	messageStatus: ConversationMessageStatus,
	failedTools: number,
): string => {
	if (state === 'running') {
		if (runningPart?.type === 'reasoning') return 'Thinking…';
		return runningPart ? 'Running' : 'Working…';
	}
	if (state === 'error') return failedTools > 0 ? `${failedTools} failed` : 'Failed';
	if (state === 'interrupted') return messageStatus === 'aborted' ? 'Stopped' : 'Interrupted';
	return 'Done';
};

const activeActivityLabel = (part: AssistantActivityPart): string => {
	if (part.type === 'reasoning') return 'Reasoning';
	const toolName = part.type === 'dynamic-tool' ? part.toolName : part.type.slice('tool-'.length);
	return toolDisplayName(toolName);
};

const completedActivityLabel = (hasReasoning: boolean, toolCount: number): string => {
	if (hasReasoning && toolCount > 0) return `Reasoning and ${toolCount} tool ${toolCount === 1 ? 'call' : 'calls'}`;
	if (hasReasoning) return 'Reasoning';
	return `Used ${toolCount} ${toolCount === 1 ? 'tool' : 'tools'}`;
};

const toolDisplayName = (name: string): string => {
	if (name === 'read') return 'Read file';
	if (name === 'ls') return 'List directory';
	const words = name
		.replace(/([a-z\d])([A-Z])/g, '$1 $2')
		.replace(/[_-]+/g, ' ')
		.trim();
	return words ? `${words[0].toUpperCase()}${words.slice(1)}` : 'Tool';
};
