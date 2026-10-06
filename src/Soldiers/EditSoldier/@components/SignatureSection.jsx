import { useEffect, useRef, useState } from 'preact/hooks';
import { plugins } from '../../../@modules/plugins.js';
import { signatureSectionCss } from './css/signatureSectionCss.js';

export default function SignatureSection({ signatureImgId, onChange }) {
    const [imgSrc, setImgSrc] = useState(null);
    const [loading, setLoading] = useState(false);
    const fileRef = useRef(null);

    useEffect(() => {
        if (!signatureImgId) {
            setImgSrc(null);
            return;
        }
        let cancelled = false;
        (async () => {
            const data = await plugins.getImg(signatureImgId);
            if (!cancelled) setImgSrc(data || null);
        })();
        return () => {
            cancelled = true;
        };
    }, [signatureImgId]);

    const handleUpload = async () => {
        const input = fileRef.current;
        if (!input?.files?.[0]) return;
        setLoading(true);
        try {
            if (signatureImgId) await plugins.delImg(signatureImgId);
            const newId = await plugins.saveImg(input);
            onChange(newId);
        } finally {
            setLoading(false);
            if (input) input.value = '';
        }
    };

    const handleDelete = async () => {
        if (!signatureImgId) return;
        if (!await confirm('서명 이미지를 삭제하시겠습니까?')) return;
        await plugins.delImg(signatureImgId);
        onChange(null);
    };

    return (
        <div className="esm-form-group">
            <label className="esm-label">서명 이미지</label>
            <div className="esm-sig-container">
                {imgSrc ? (
                    <div className="esm-sig-preview">
                        <img src={imgSrc} alt="서명" className="esm-sig-img" />
                        <button className="esm-sig-del" onClick={handleDelete} title="삭제">✕</button>
                    </div>
                ) : (
                    <div className="esm-sig-empty" onClick={() => fileRef.current?.click()}>
                        서명 이미지를 첨부해주세요
                    </div>
                )}
                <div className="esm-sig-actions">
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleUpload}
                    />
                    <button
                        className="secondary"
                        onClick={() => fileRef.current?.click()}
                        disabled={loading}
                    >
                        {loading ? '업로드 중...' : imgSrc ? '이미지 변경' : '이미지 첨부'}
                    </button>
                </div>
            </div>
            <style>{signatureSectionCss}</style>
        </div>
    );
}
