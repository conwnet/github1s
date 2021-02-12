/**
 * @file github1s notification
 * @author netcon
 */

import 'vs/css!./notification';

const NOTIFICATION_STORAGE_KEY = 'GITHUB1S_NOTIFICATION';
// change it if a new notification should be shown
const NOTIFICATION_STORAGE_VALUE = '20210212';

const notification = {
	title: 'ATTENTION: This page is NOT officially provided by GitHub.',
	content: 'GitHub1s is an open source project, which is not officially provided by GitHub.',
	link: 'https://github.com/conwnet/github1s',
};

const notificationHtml = `
<div class="notification-main">
	<div class="notification-title">${notification.title}</div>
	<div class="notification-content">
		${notification.content}
		<a class="notification-link" href="${notification.link}" target="_blank">See more</a>
	</div>
</div>
<div class="notification-footer">
	<button class="notification-confirm-button">I know</button>
	<div class="notification-show-me-again">
		<input type="checkbox" checked>Don't show me again</div>
	</div>
</div>
`;

export const renderNotification = () => {
	// if user has confirm the notification and check `don't show me again`, ignore it
	if (!window.localStorage || window.localStorage.getItem(NOTIFICATION_STORAGE_KEY) === NOTIFICATION_STORAGE_VALUE) {
		return;
	}

	const notificationElement = <HTMLDivElement>document.createElement('div');
	notificationElement.classList.add('github1s-notification');
	notificationElement.innerHTML = notificationHtml;
	document.body.appendChild(notificationElement);

	(<HTMLButtonElement>notificationElement.querySelector('.notification-confirm-button'))!.onclick = () => {
		const notShowMeAgain = !!((<HTMLInputElement>notificationElement.querySelector('.notification-show-me-again input'))!.checked);
		if (notShowMeAgain) {
			window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, NOTIFICATION_STORAGE_VALUE);
		}
		document.body.removeChild(notificationElement);
	};
};
