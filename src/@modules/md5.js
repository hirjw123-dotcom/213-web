// Compact MD5 implementation (RFC 1321)
const md5 = (function () {
    const hex = '0123456789abcdef'.split('');
    const k = [], r = [];
    for (let i = 0; i < 64; i++) k[i] = Math.floor(2 ** 32 * Math.abs(Math.sin(i + 1)));
    r.push(...[7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22]);
    r.push(...[5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20]);
    r.push(...[4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23]);
    r.push(...[6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21]);

    function add32(a, b) { return (a + b) & 0xFFFFFFFF; }
    function rotl(v, n) { return (v << n) | (v >>> (32 - n)); }

    function toHex(n) {
        let s = '';
        for (let i = 0; i < 4; i++) s += hex[(n >> (i * 8 + 4)) & 0xF] + hex[(n >> (i * 8)) & 0xF];
        return s;
    }

    function utf8Encode(str) {
        const bytes = [];
        for (let i = 0; i < str.length; i++) {
            let c = str.charCodeAt(i);
            if (c < 0x80) bytes.push(c);
            else if (c < 0x800) { bytes.push(0xc0 | (c >> 6)); bytes.push(0x80 | (c & 0x3f)); }
            else { bytes.push(0xe0 | (c >> 12)); bytes.push(0x80 | ((c >> 6) & 0x3f)); bytes.push(0x80 | (c & 0x3f)); }
        }
        return bytes;
    }

    return function md5(str) {
        const msg = utf8Encode(str);
        const bitLen = msg.length * 8;
        msg.push(0x80);
        while (msg.length % 64 !== 56) msg.push(0);
        // append bit length as 64-bit LE
        for (let i = 0; i < 8; i++) msg.push((bitLen / Math.pow(2, 8 * i)) & 0xFF);

        let a0 = 0x67452301, b0 = 0xEFCDAB89, c0 = 0x98BADCFE, d0 = 0x10325476;

        for (let offset = 0; offset < msg.length; offset += 64) {
            const M = [];
            for (let j = 0; j < 16; j++) {
                M[j] = msg[offset + j * 4] | (msg[offset + j * 4 + 1] << 8)
                    | (msg[offset + j * 4 + 2] << 16) | (msg[offset + j * 4 + 3] << 24);
            }
            let a = a0, b = b0, c = c0, d = d0;
            for (let i = 0; i < 64; i++) {
                let f, g;
                if (i < 16) { f = (b & c) | (~b & d); g = i; }
                else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
                else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
                else { f = c ^ (b | ~d); g = (7 * i) % 16; }
                const tmp = d;
                d = c; c = b;
                b = add32(b, rotl(add32(add32(a, f), add32(k[i], M[g])), r[i]));
                a = tmp;
            }
            a0 = add32(a0, a); b0 = add32(b0, b); c0 = add32(c0, c); d0 = add32(d0, d);
        }
        return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
    };
})();

export default md5;
