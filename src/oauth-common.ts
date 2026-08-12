const OAUTH_BROADCAST_CHANNEL_PREFIX = 'github1s:oauth:';

export const getOAuthBroadcastChannelName = (state: string) => `${OAUTH_BROADCAST_CHANNEL_PREFIX}${state}`;
