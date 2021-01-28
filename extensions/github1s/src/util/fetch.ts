/**
 * @file github1s fetch api
 * @author netcon
 */

const getGithubAuthToken = (): string => {
  return '';
};

export const fetch = (url: string, options?: RequestInit) => {
  const token = getGithubAuthToken();
  const authHeaders = token ? { Authorization: `token ${token}` } : {};
  const customHeaders = (options && 'headers' in options ? options.headers : {})

  return self.fetch(url, {
    ...options,
    headers: { ...customHeaders, ...authHeaders }
  });
};
