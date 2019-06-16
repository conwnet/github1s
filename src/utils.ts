export const noop = () => {};

export const trimStart = (str: string, chars: string = ' '): string => {
    let index = 0;

    while (chars.indexOf(str[index]) !== -1) {
        index++;
    }
    return str.slice(index);
};

export const trimEnd = (str: string, chars: string = ' '): string => {
    let length = str.length;

    while (length && chars.indexOf(str[length - 1]) !== -1) {
        length--;
    }
    return str.slice(0, length);
};

export const join = (...segments: string[]) => {
    if (!segments.length) {
        return '';
    }

    return segments.reduce((prev, segment) => {
        return trimEnd(prev, '/') + '/' + trimStart(segment, '/');
    });
};

export const uniqueId = (id => () => id++)(1);
