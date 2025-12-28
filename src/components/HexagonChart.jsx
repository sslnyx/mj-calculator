import { motion } from 'framer-motion'

/**
 * HexagonChart - 六邊形戰士 Radar Chart
 * 
 * Props:
 * - data: Array of 6 values (0-100%) for each axis
 * - labels: Array of 6 labels for each axis
 * - size: Chart size in pixels (default 280)
 */
const HexagonChart = ({
    data = [50, 50, 50, 50, 50, 50],
    labels = ['速度', '攻擊', '防守', '運氣', '魔法', '心態'],
    size = 280
}) => {
    const padding = 30 // Extra padding for labels
    const svgSize = size + padding * 2
    const center = svgSize / 2
    const radius = size * 0.4
    const labelRadius = size * 0.48

    // Calculate point positions for hexagon
    const getPoint = (index, value) => {
        const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2
        const r = (value / 100) * radius
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle)
        }
    }

    // Generate outer hexagon path (100% boundary)
    const outerPoints = Array.from({ length: 6 }, (_, i) => getPoint(i, 100))
    const outerPath = outerPoints.map((p, i) =>
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ') + ' Z'

    // Generate inner rings (25%, 50%, 75%)
    const rings = [25, 50, 75].map(pct => {
        const pts = Array.from({ length: 6 }, (_, i) => getPoint(i, pct))
        return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
    })

    // Generate data polygon
    const dataPoints = data.map((v, i) => getPoint(i, Math.min(100, Math.max(0, v))))
    const dataPath = dataPoints.map((p, i) =>
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ') + ' Z'

    // Label positions
    const labelPoints = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2
        return {
            x: center + labelRadius * Math.cos(angle),
            y: center + labelRadius * Math.sin(angle)
        }
    })

    return (
        <div className="flex justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${svgSize} ${svgSize}`}>
                {/* Background rings */}
                {rings.map((ring, i) => (
                    <path
                        key={i}
                        d={ring}
                        fill="none"
                        stroke="#E0E0E0"
                        strokeWidth="1"
                    />
                ))}

                {/* Outer boundary */}
                <path
                    d={outerPath}
                    fill="none"
                    stroke="#CCCCCC"
                    strokeWidth="2"
                />

                {/* Axis lines */}
                {outerPoints.map((p, i) => (
                    <line
                        key={i}
                        x1={center}
                        y1={center}
                        x2={p.x}
                        y2={p.y}
                        stroke="#E0E0E0"
                        strokeWidth="1"
                    />
                ))}

                {/* Data polygon - animated */}
                <motion.path
                    d={dataPath}
                    fill="rgba(255, 200, 0, 0.3)"
                    stroke="#FFD600"
                    strokeWidth="3"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                />

                {/* Data points */}
                {dataPoints.map((p, i) => (
                    <motion.circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r="5"
                        fill="#FFD600"
                        stroke="#000000"
                        strokeWidth="2"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                    />
                ))}

                {/* Labels */}
                {labelPoints.map((p, i) => (
                    <text
                        key={i}
                        x={p.x}
                        y={p.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="font-body"
                        fontSize="14"
                        fontWeight="bold"
                        fill="#000000"
                    >
                        {labels[i]}
                    </text>
                ))}

                {/* Values */}
                {dataPoints.map((p, i) => (
                    <text
                        key={`val-${i}`}
                        x={p.x}
                        y={p.y - 12}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#888888"
                    >
                        {Math.round(data[i])}%
                    </text>
                ))}
            </svg>
        </div>
    )
}

export default HexagonChart
