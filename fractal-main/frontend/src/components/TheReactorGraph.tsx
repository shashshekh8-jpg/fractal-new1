import { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export function TheReactorGraph({ topology }: { topology: any }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [graphData, setGraphData] = useState<{nodes: any[], links: any[]}>({ nodes: [], links: [] });

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                 });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    useEffect(() => {
        if (topology.target_rule_id) {
            setGraphData(prev => {
                const exists = prev.nodes.find(n => n.id === topology.target_rule_id);
                if (exists) return prev; 
      
                const newNode = { 
                    id: topology.target_rule_id, 
                    name: `Rule ${topology.target_rule_id}`,
                    val: 2 
                };
  
                const newLink = { source: 0, target: topology.target_rule_id };
                
                return {
                     nodes: prev.nodes.length === 0 ? [{ id: 0, val: 5 }, newNode] : [...prev.nodes, newNode],
                    links: prev.links.length === 0 ? [newLink] : [...prev.links, newLink]
                };
            });
        }
     }, [topology.target_rule_id]);

    return (
        <div ref={containerRef} className="w-full h-full bg-void border-x border-intelligence/10">
            {dimensions.width > 0 && (
                <ForceGraph2D
                    graphData={graphData}
                    nodeLabel="name"
                    nodeColor={(node: any) => {
                        if (node.id === 0) return '#FF453A'; 
                        return node.id === topology.pulseTarget ? '#00F3FF' : '#1e293b';
                    }}
                    nodeCanvasObjectMode={() => 'after'}
                    nodeCanvasObject={(node: any, ctx, globalScale) => {
                        if (node.id === topology.pulseTarget) {
                            const label = "MATCH";
                            const fontSize = 12/globalScale;
                            ctx.font = `${fontSize}px JetBrains Mono`;
                            ctx.fillStyle = '#00F3FF';
                            ctx.fillText(label, node.x + 5, node.y + 5);
                        }
                    }}
                    linkColor={() => '#0f172a'}
                    width={dimensions.width}
                    height={dimensions.height}
                    cooldownTicks={100}
                />
            )}
        </div>
    );
}
