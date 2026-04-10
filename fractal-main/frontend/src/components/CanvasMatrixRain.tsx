import { useEffect, useRef, useState } from 'react';

export default function CanvasMatrixRain({ isProcessing }: { isProcessing: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [jitterRate, setJitterRate] = useState("0.00");

    useEffect(() => {
        let jitterInterval: NodeJS.Timeout;
        if (isProcessing) {
            jitterInterval = setInterval(() => {
                setJitterRate((1.1 + Math.random() * 0.25).toFixed(2));
            }, 80); 
        } else {
            setJitterRate("0.00");
        }
        return () => clearInterval(jitterInterval);
    }, [isProcessing]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const columns = Math.floor(canvas.width / 14);
        const drops = Array(columns).fill(1);
        
        const chars = `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%"'#&_(),.;:?!|{}<>[]^~`;

        let animationFrameId: number;

        const draw = () => {
            ctx.fillStyle = 'rgba(2, 6, 23, 0.1)'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#FF453A'; 
            ctx.font = '14px monospace';

            for (let i = 0; i < drops.length; i++) {
                const text = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(text, i * 14, drops[i] * 14);
                if (drops[i] * 14 > canvas.height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            }
            if (isProcessing) animationFrameId = requestAnimationFrame(draw);
        };

        if (isProcessing) draw();
        return () => cancelAnimationFrame(animationFrameId);
    }, [isProcessing]);

    return (
        <div className="relative w-full h-full">
            <div className={`absolute top-2 left-2 z-10 font-mono text-xs font-bold tracking-widest transition-opacity duration-300 ${isProcessing ? 'text-waste opacity-100' : 'text-waste/30 opacity-50'}`}>
                INBOUND STREAM: {jitterRate} GB/s
            </div>
            <canvas ref={canvasRef} className="w-full h-full bg-void block" />
        </div>
    );
}
