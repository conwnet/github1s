/**
 * @file render notification
 * @author netcon
 */

import './notification.css';

const NOTIFICATION_STORAGE_KEY = 'GITHUB1S_NOTIFICATION';
// Change this if a new notification should be shown
const NOTIFICATION_STORAGE_VALUE = '20210212';

/*** begin notificaton block ***/
export const renderNotification = (platform: string) => {
	// If user has confirmed the notification and checked `don't show me again`, ignore it
	if (window.localStorage.getItem(NOTIFICATION_STORAGE_KEY) === NOTIFICATION_STORAGE_VALUE) {
		return;
	}

	const notifications = [
		{
			title: 'ATTENTION: This page is NOT officially provided by ' + platform + '.',
			content: platform + '1s is an open source project, which is not officially provided by ' + platform + '.',
			link: 'https://github.com/conwnet/github1s',
		},
	];

	const notificationBlocksHtml = notifications.map((item) => {
		const linkHtml = item.link
			? ' <a class="notification-link" href="' + item.link + '" target="_blank">See more</a>'
			: '';
		const titleHtml = '<div class="notification-main"><div class="notification-title">' + item.title + '</div>';
		const contentHtml = '<div class="notification-content">' + item.content + linkHtml + '</div></div>';
		return titleHtml + contentHtml;
	});

	const notificationHtml =
		notificationBlocksHtml +
		'<div class="notification-footer"><button class="notification-confirm-button">OK</button>' +
		'<div class="notification-show-me-again"><input type="checkbox" checked>Don\'t show me again</div></div></div>';

	const notificationElement = document.createElement('div');
	notificationElement.classList.add('github1s-notification');
	notificationElement.innerHTML = notificationHtml;
	document.body.appendChild(notificationElement);

	const confirmButton = notificationElement.querySelector('.notification-confirm-button') as HTMLButtonElement;

	confirmButton.onclick = () => {
		const showAgainCheckBox = notificationElement?.querySelector('.notification-show-me-again input');
		const notShowMeAgain = !!(showAgainCheckBox as HTMLInputElement)?.checked;
		if (notShowMeAgain) {
			window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, NOTIFICATION_STORAGE_VALUE);
		}
		document.body.removeChild(notificationElement);
	};
};
