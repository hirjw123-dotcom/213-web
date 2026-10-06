import { useState } from "preact/hooks";


export default function useForceUpdate() {
    const [_, setState] = useState();
    return () => setState(_ => _ + 1);
}