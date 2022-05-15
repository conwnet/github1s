/**
 * @file date util
 * @author netcon
 */

import * as dayjs from 'dayjs';
import * as relativeTimePlugin from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTimePlugin);

export const relativeTimeTo = (date: dayjs.ConfigType) => dayjs().to(dayjs(date));
