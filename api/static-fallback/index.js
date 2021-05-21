/**
 * @file static files not found fallback
 * According to the config in vercel.json, we cached the
 * static files with `max-age=X` header, but we may get 404
 * response durning deploying, the default behavior for vercel
 * would add the cache header to this 404 response, which caused
 * the user can not get right resources anymore. so we should
 * fallback to here and clear the cache header for such 404 requests.
 * See also: https://github.com/conwnet/github1s/issues/299
 * @author netcon
 */

module.exports = async (req, res) => {
	res.status(404);
	res.setHeader('Cache-Control', 'no-store');
	res.send('Not Found');
};
