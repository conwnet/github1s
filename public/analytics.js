(function () {
	let mid = 'G-D3LJNF4DN0';
	if (window.location.hostname.match(/\.?gitlab1s\.com$/i)) {
		mid = 'G-1F70ST6944';
	} else if (window.location.hostname.match(/\.?bitbucket1s\.org$/i)) {
		mid = 'G-SPWSR3V6YC';
	} else if (window.location.hostname.match(/\.?npmjs1s\.com$/i)) {
		mid = 'G-VF4VCXYFKV';
	}
	window.dataLayer = window.dataLayer || [];
	function gtag() {
		dataLayer.push(arguments);
	}
	gtag('js', new Date());
	gtag('config', mid);
	window.addEventListener('load', function () {
		const element = window.document.createElement('script');
		element.src = 'https://www.googletagmanager.com/gtag/js?id=' + mid;
		window.document.body.append(element);
	});
})();
