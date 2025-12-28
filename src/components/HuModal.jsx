import { useState, useMemo } from 'react'
import { getPointsForFan, recordDirectWin, recordZimo } from '../lib/scoring'

// Extended Fan options (0-13)
const FAN_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

// Hand patterns with their default fan values
// hasBao: true = this hand CAN trigger 包 (bao) responsibility
const HAND_PATTERNS = {
    // Regular Hands
    regular: [
        { id: 'qing_yi_se', name: '清一色', fan: 7 },
        { id: 'xiao_san_yuan', name: '小三元', fan: 5 },
        { id: 'hun_yi_se', name: '混一色', fan: 3 },
        { id: 'dui_dui_hu', name: '對對糊', fan: 3 },
        { id: 'ping_hu', name: '平糊', fan: 1 },
        { id: 'hua_hu', name: '花糊', fan: 3 },
    ],
    // Limit Hands - hasBao indicates if 包 can apply
    limit: [
        { id: 'shi_san_yao', name: '十三幺', fan: 13, isLimit: true, hasBao: false },
        { id: 'jiu_lian_bao_deng', name: '九蓮寶燈', fan: 13, isLimit: true, hasBao: false },
        { id: 'da_si_xi', name: '大四喜', fan: 13, isLimit: true, hasBao: true },
        { id: 'da_san_yuan', name: '大三元', fan: 13, isLimit: true, hasBao: true },
        { id: 'zi_yi_se', name: '字一色', fan: 13, isLimit: true, hasBao: false },
        { id: 'kan_kan_hu', name: '坎坎胡', fan: 13, isLimit: true, hasBao: false },
    ],
    // Bonus conditions (add-ons)
    bonus: [
        { id: 'wu_hua', name: '無花', fan: 1 },
        { id: 'fan_zi', name: '番子', fan: 1 },
        { id: 'qiang_gang', name: '搶槓', fan: 1 },
        { id: 'gang_shang_hua', name: '槓上開花', fan: 1 },
        { id: 'hai_di_lao_yue', name: '海底撈月', fan: 1 },
    ]
}

const HuModal = ({ isOpen, onClose, roomId, players, onSuccess }) => {
    const [winType, setWinType] = useState('eat') // 'eat', 'zimo', or 'zimo_bao'
    const [winnerId, setWinnerId] = useState(null)
    const [loserId, setLoserId] = useState(null)
    const [fanCount, setFanCount] = useState(3)
    const [selectedPatterns, setSelectedPatterns] = useState([])
    const [fanZiCount, setFanZiCount] = useState(0) // Counter for 番子 (can be 0-4)
    const [patternTab, setPatternTab] = useState('regular') // 'regular' or 'limit'
    const [showRareAddons, setShowRareAddons] = useState(false) // Collapse rare add-ons
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState(null)

    // Calculate total fan from selected patterns
    const calculatedFan = useMemo(() => {
        if (selectedPatterns.length === 0 && fanZiCount === 0) return null

        // Check if any limit hand is selected
        const hasLimit = selectedPatterns.some(id =>
            HAND_PATTERNS.limit.some(p => p.id === id)
        )
        if (hasLimit) return 13

        // Sum up fan from all selected patterns
        let total = 0
        const allPatterns = [...HAND_PATTERNS.regular, ...HAND_PATTERNS.bonus]
        selectedPatterns.forEach(id => {
            // Skip fan_zi since we handle it separately
            if (id === 'fan_zi') return
            const pattern = allPatterns.find(p => p.id === id)
            if (pattern) total += pattern.fan
        })

        // Add fanZiCount
        total += fanZiCount

        return Math.min(total, 13)
    }, [selectedPatterns, fanZiCount])

    // Sync fan count when patterns change
    const effectiveFan = calculatedFan !== null ? calculatedFan : fanCount

    if (!isOpen) return null

    const handlePatternToggle = (patternId) => {
        setSelectedPatterns(prev => {
            const newPatterns = prev.includes(patternId)
                ? prev.filter(id => id !== patternId)
                : [...prev, patternId]
            return newPatterns
        })
    }

    const handleSubmit = async () => {
        if (!winnerId) {
            setError('Please select a winner')
            return
        }
        if (winType === 'eat' && !loserId) {
            setError('Please select who dealt in')
            return
        }
        if (winType === 'zimo_bao' && !loserId) {
            setError('Please select who is responsible (包)')
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            if (winType === 'eat') {
                await recordDirectWin({
                    roomId,
                    winnerId,
                    loserId,
                    fanCount: effectiveFan,
                    handPatterns: selectedPatterns,
                    roomPlayers: players
                })
            } else {
                await recordZimo({
                    roomId,
                    winnerId,
                    fanCount: effectiveFan,
                    handPatterns: selectedPatterns,
                    baoPlayerId: winType === 'zimo_bao' ? loserId : null,
                    roomPlayers: players
                })
            }

            // Reset and close
            setWinnerId(null)
            setLoserId(null)
            setFanCount(3)
            setSelectedPatterns([])
            setFanZiCount(0)
            onSuccess?.()
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        setWinnerId(null)
        setLoserId(null)
        setFanCount(3)
        setSelectedPatterns([])
        setFanZiCount(0)
        setPatternTab('regular')
        setError(null)
        onClose()
    }

    // Get first name or first 6 chars
    const getShortName = (player) => {
        const name = player?.display_name || 'Player'
        const firstName = name.split(' ')[0]
        return firstName.length > 6 ? firstName.substring(0, 6) : firstName
    }

    // Get points display for current fan
    const getPointsDisplay = () => {
        const points = getPointsForFan(effectiveFan)
        return `${effectiveFan}番 = ${points}pts`
    }

    // Check if a limit hand should be disabled (when zimo_bao is selected but hand has no bao)
    const isLimitDisabled = (pattern) => {
        return winType === 'zimo_bao' && !pattern.hasBao
    }

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content hu-modal" onClick={e => e.stopPropagation()}>
                {/* Close Button */}
                <button className="modal-close" onClick={handleClose}>×</button>

                {/* Header */}
                <h2 className="hu-modal-title">RECORD WIN</h2>

                <div className="modal-body">
                    {error && <div className="modal-error">{error}</div>}

                    {/* Winner Selection */}
                    <div className="form-group">
                        <label>WHO WON?</label>
                        <div className="player-grid-2x2">
                            {players.map(p => (
                                <button
                                    key={p.player_id}
                                    className={`player-btn ${winnerId === p.player_id ? 'selected winner' : ''}`}
                                    onClick={() => setWinnerId(p.player_id)}
                                >
                                    <span className="player-name">{getShortName(p.player)}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Win Type Toggle - 3 tabs */}
                    <div className="form-group">
                        <div className="win-type-toggle three-tabs">
                            <button
                                className={`toggle-btn ${winType === 'eat' ? 'active' : ''}`}
                                onClick={() => { setWinType('eat'); setLoserId(null) }}
                            >
                                点炮
                            </button>
                            <button
                                className={`toggle-btn ${winType === 'zimo' ? 'active' : ''}`}
                                onClick={() => { setWinType('zimo'); setLoserId(null) }}
                            >
                                自摸
                            </button>
                            <button
                                className={`toggle-btn ${winType === 'zimo_bao' ? 'active' : ''}`}
                                onClick={() => { setWinType('zimo_bao'); setLoserId(null) }}
                            >
                                包自摸
                            </button>
                        </div>
                    </div>

                    {/* Loser Selection (for eat) */}
                    {winType === 'eat' && (
                        <div className="form-group">
                            <label>WHO DEALT IN?</label>
                            <div className="player-grid-2x2">
                                {players.map(p => (
                                    <button
                                        key={p.player_id}
                                        className={`player-btn ${loserId === p.player_id ? 'selected loser' : ''} ${p.player_id === winnerId ? 'disabled' : ''}`}
                                        onClick={() => p.player_id !== winnerId && setLoserId(p.player_id)}
                                        disabled={p.player_id === winnerId}
                                    >
                                        <span className="player-name">{getShortName(p.player)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bao player selection (for zimo_bao) */}
                    {winType === 'zimo_bao' && (
                        <div className="form-group">
                            <label>WHO IS 包?</label>
                            <div className="player-grid-2x2">
                                {players.map(p => (
                                    <button
                                        key={p.player_id}
                                        className={`player-btn ${loserId === p.player_id ? 'selected loser' : ''} ${p.player_id === winnerId ? 'disabled' : ''}`}
                                        onClick={() => p.player_id !== winnerId && setLoserId(p.player_id)}
                                        disabled={p.player_id === winnerId}
                                    >
                                        <span className="player-name">{getShortName(p.player)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Hand Pattern Selection - Always Visible with Tabs */}
                    <div className="form-group">
                        <label>牌型 (Hand Patterns)</label>

                        {/* Tabs for Regular / Limit */}
                        <div className="pattern-tabs">
                            <button
                                className={`pattern-tab ${patternTab === 'regular' ? 'active' : ''}`}
                                onClick={() => setPatternTab('regular')}
                            >
                                常規
                            </button>
                            <button
                                className={`pattern-tab ${patternTab === 'limit' ? 'active' : ''}`}
                                onClick={() => setPatternTab('limit')}
                            >
                                爆棚
                            </button>
                        </div>

                        {/* Pattern Grid based on active tab */}
                        <div className="pattern-section">
                            {patternTab === 'regular' && (
                                <div className="pattern-grid">
                                    {HAND_PATTERNS.regular.map(p => (
                                        <button
                                            key={p.id}
                                            className={`pattern-btn ${selectedPatterns.includes(p.id) ? 'selected' : ''}`}
                                            onClick={() => handlePatternToggle(p.id)}
                                        >
                                            {p.name} <span className="pattern-fan">+{p.fan}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {patternTab === 'limit' && (
                                <div className="pattern-grid">
                                    {HAND_PATTERNS.limit.map(p => (
                                        <button
                                            key={p.id}
                                            className={`pattern-btn limit ${selectedPatterns.includes(p.id) ? 'selected' : ''} ${isLimitDisabled(p) ? 'disabled-pattern' : ''}`}
                                            onClick={() => !isLimitDisabled(p) && handlePatternToggle(p.id)}
                                            disabled={isLimitDisabled(p)}
                                            title={isLimitDisabled(p) ? '此牌型不適用包' : ''}
                                        >
                                            {p.name}
                                            {p.hasBao && <span className="bao-indicator">包</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Bonus / Add-ons */}
                        <div className="pattern-group addon-group">
                            <span className="pattern-group-label">附加</span>

                            {/* 番子 Counter - Always visible */}
                            <div className="fanzi-counter">
                                <span className="fanzi-label">番子</span>
                                <div className="counter-controls">
                                    <button
                                        className="counter-btn"
                                        onClick={() => setFanZiCount(prev => Math.max(0, prev - 1))}
                                        disabled={fanZiCount === 0}
                                    >
                                        ◀
                                    </button>
                                    <span className="counter-value">{fanZiCount}</span>
                                    <button
                                        className="counter-btn"
                                        onClick={() => setFanZiCount(prev => Math.min(4, prev + 1))}
                                        disabled={fanZiCount === 4}
                                    >
                                        ▶
                                    </button>
                                </div>
                            </div>

                            {/* Rare add-ons - Collapsible */}
                            <button
                                className="rare-addons-toggle"
                                onClick={() => setShowRareAddons(!showRareAddons)}
                            >
                                其他附加 {showRareAddons ? '▲' : '▼'}
                                {selectedPatterns.some(id => ['wu_hua', 'qiang_gang', 'gang_shang_hua', 'hai_di_lao_yue'].includes(id)) && (
                                    <span className="addon-active-dot">•</span>
                                )}
                            </button>

                            {showRareAddons && (
                                <div className="pattern-grid addon-grid rare-addons">
                                    {HAND_PATTERNS.bonus.filter(p => p.id !== 'fan_zi').map(p => (
                                        <button
                                            key={p.id}
                                            className={`pattern-btn bonus ${selectedPatterns.includes(p.id) ? 'selected' : ''}`}
                                            onClick={() => handlePatternToggle(p.id)}
                                        >
                                            {p.name} <span className="pattern-fan">+{p.fan}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Fan Selection */}
                    <div className="form-group">
                        <label>
                            番 (FAN)
                            <span className="fan-points-display">{getPointsDisplay()}</span>
                        </label>
                        <div className="fan-grid extended">
                            {FAN_OPTIONS.map(fan => (
                                <button
                                    key={fan}
                                    className={`fan-btn ${effectiveFan === fan ? 'selected' : ''} ${calculatedFan !== null && fan !== calculatedFan ? 'dimmed' : ''}`}
                                    onClick={() => { setFanCount(fan); setSelectedPatterns([]); }}
                                >
                                    {fan}
                                </button>
                            ))}
                        </div>
                        {calculatedFan !== null && (
                            <div className="fan-auto-hint">
                                ⓘ Auto-calculated from patterns. Tap a number to override.
                            </div>
                        )}
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    className="confirm-btn"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'SAVING...' : 'CONFIRM!'}
                </button>
            </div>
        </div>
    )
}

export default HuModal
