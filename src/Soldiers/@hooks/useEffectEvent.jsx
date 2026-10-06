import { useCallback, useRef } from "preact/hooks";

export default function useEffectEvent(callback) {
    const savedCallback = useRef(callback);
    savedCallback.current = callback;

    return useCallback((...args) => savedCallback.current(...args), []);
}