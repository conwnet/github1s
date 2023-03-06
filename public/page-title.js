(function () {
	if (window.location.hostname.match(/\.?gitlab1s\.com$/i)) {
		window.document.title = 'GitLab1s';
	} else if (window.location.hostname.match(/\.?bitbucket1s\.org$/i)) {
		window.document.title = 'Bitbucket1s';
	} else if (window.location.hostname.match(/\.?npmjs1s\.com$/i)) {
		window.document.title = 'npm1s';
	}
})();
