import { useState, useMemo } from 'react'
import { Info, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { getPointsForFan, recordDirectWin, recordZimo } from '../lib/scoring'

// Extended Fan options (0-13)
const FAN_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

// Hand patterns with their default fan values
// hasBao: true = this hand CAN trigger 包 (bao) responsibility
const HAND_PATTERNS = {
    // Regular Hands (standalone patterns)
    regular: [
        { id: 'da_san_yuan', name: '大三元', fan: 8 },
        { id: 'qing_yi_se', name: '清一色', fan: 7 },
        { id: 'xiao_san_yuan', name: '小三元', fan: 5 },
        { id: 'hua_yao_jiu', name: '花么九', fan: 4 },
        { id: 'hun_yi_se', name: '混一色', fan: 3 },
        { id: 'dui_dui_hu', name: '對對糊', fan: 3 },
    ],
    // Limit Hands - hasBao indicates if 包 can apply
    limit: [
        { id: 'tian_hu', name: '天胡', fan: 13, isLimit: true, hasBao: false },
        { id: 'di_hu', name: '地胡', fan: 13, isLimit: true, hasBao: false },
        { id: 'shi_san_yao', name: '十三幺', fan: 13, isLimit: true, hasBao: false },
        { id: 'jiu_lian_bao_deng', name: '九蓮寶燈', fan: 13, isLimit: true, hasBao: false },
        { id: 'da_si_xi', name: '大四喜', fan: 13, isLimit: true, hasBao: true },
        { id: 'xiao_si_xi', name: '小四喜', fan: 13, isLimit: true, hasBao: true },
        { id: 'zi_yi_se', name: '字一色', fan: 13, isLimit: true, hasBao: true },
        { id: 'qing_yao_jiu', name: '清么九', fan: 13, isLimit: true, hasBao: false },
        { id: 'kan_kan_hu', name: '坎坎胡', fan: 13, isLimit: true, hasBao: false },
        { id: 'shi_ba_luo_han', name: '十八羅漢', fan: 13, isLimit: true, hasBao: false },
        { id: 'ba_xian_guo_hai', name: '八仙過海', fan: 13, isLimit: true, hasBao: false },
    ],
    // Bonus conditions (add-ons that stack with other hands)
    bonus: [
        { id: 'hua_hu', name: '花糊', fan: 3 },
        { id: 'yi_tai_hua', name: '一臺花', fan: 2 },
        { id: 'gang_shang_hua', name: '槓上開花', fan: 2 },
        { id: 'ping_hu', name: '平糊', fan: 1 },
        { id: 'men_qian_qing', name: '門前清', fan: 1 },
        { id: 'zheng_hua', name: '正花', fan: 1 },
        { id: 'wu_hua', name: '無花', fan: 1 },
        { id: 'fan_zi', name: '番子', fan: 1 },
        { id: 'qiang_gang', name: '搶槓', fan: 1 },
        { id: 'hai_di_lao_yue', name: '海底撈月', fan: 1 },
    ]
}

const HuModal = ({ isOpen, onClose, roomId, players, onSuccess, onNavigate }) => {
    const [winType, setWinType] = useState('eat') // 'eat', 'zimo', or 'zimo_bao'
    const [winnerId, setWinnerId] = useState(null)
    const [loserId, setLoserId] = useState(null)
    const [fanCount, setFanCount] = useState(3)
    const [selectedPatterns, setSelectedPatterns] = useState([])
    const [fanZiCount, setFanZiCount] = useState(0) // Counter for 番子 (can be 0-4)
    const [zhengHuaCount, setZhengHuaCount] = useState(0) // Counter for 正花 (can be 0-2)
    const [patternTab, setPatternTab] = useState('regular') // 'regular' or 'limit'
    const [showRareAddons, setShowRareAddons] = useState(false) // Collapse rare add-ons
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState(null)

    // Calculate total fan from selected patterns
    const calculatedFan = useMemo(() => {
        if (selectedPatterns.length === 0 && fanZiCount === 0 && zhengHuaCount === 0) return null

        // Check if any limit hand is selected
        const hasLimit = selectedPatterns.some(id =>
            HAND_PATTERNS.limit.some(p => p.id === id)
        )
        if (hasLimit) return 13

        // Sum up fan from all selected patterns
        let total = 0
        const allPatterns = [...HAND_PATTERNS.regular, ...HAND_PATTERNS.bonus]
        selectedPatterns.forEach(id => {
            // Skip fan_zi and zheng_hua since we handle them separately with counters
            if (id === 'fan_zi' || id === 'zheng_hua') return
            const pattern = allPatterns.find(p => p.id === id)
            if (pattern) total += pattern.fan
        })

        // Add fanZiCount and zhengHuaCount
        total += fanZiCount
        total += zhengHuaCount

        // Add +1 fan bonus for zi-mo (自摸) or bao zi-mo (包自摸)
        if (winType === 'zimo' || winType === 'zimo_bao') {
            total += 1
        }

        return Math.min(total, 13)
    }, [selectedPatterns, fanZiCount, zhengHuaCount, winType])

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
            setZhengHuaCount(0)
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
        setZhengHuaCount(0)
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
        return `${effectiveFan}番 = ${points}分`
    }

    // Check if a limit hand should be disabled (when zimo_bao is selected but hand has no bao)
    const isLimitDisabled = (pattern) => {
        return winType === 'zimo_bao' && !pattern.hasBao
    }

    return (
        <div
            className="fixed inset-0 bg-black/70 flex items-end justify-center z-[100]"
            onClick={handleClose}
        >
            <div
                className="bg-white w-full max-w-[400px] max-h-svh rounded-t-2xl border-t-4 border-x-4 border-black flex flex-col relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-100 border-2 border-black rounded-full text-lg font-bold cursor-pointer hover:bg-red hover:text-white z-10"
                    onClick={handleClose}
                >
                    ×
                </button>

                {/* Header */}
                <h2 className="font-title text-2xl text-center py-4 border-b-[3px] border-black bg-yellow shrink-0">
                    RECORD WIN
                </h2>

                {/* Scrollable Body */}
                <div className="flex-1 scroll-section p-4 space-y-4">
                    {error && (
                        <div className="bg-red text-white p-2 rounded-md text-sm font-bold text-center">
                            {error}
                        </div>
                    )}

                    {/* Winner Selection */}
                    <div>
                        <label className="block font-bold text-sm mb-2 uppercase">邊個食糊?</label>
                        <div className="grid grid-cols-2 gap-2">
                            {players.map(p => (
                                <button
                                    key={p.player_id}
                                    className={`py-3 px-2 rounded-lg border-comic-thin font-bold text-sm transition-all ${winnerId === p.player_id
                                        ? 'bg-green shadow-comic-sm scale-105'
                                        : 'bg-white hover:bg-gray-100'
                                        }`}
                                    onClick={() => setWinnerId(p.player_id)}
                                >
                                    {getShortName(p.player)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Win Type Toggle - 3 tabs */}
                    <div>
                        <div className="grid grid-cols-3 gap-1 bg-gray-200 p-1 rounded-lg">
                            {[
                                { type: 'eat', label: '点炮' },
                                { type: 'zimo', label: '自摸' },
                                { type: 'zimo_bao', label: '包自摸' }
                            ].map(({ type, label }) => (
                                <button
                                    key={type}
                                    className={`py-2 rounded-md font-bold text-sm transition-all ${winType === type
                                        ? 'bg-orange shadow-comic-sm'
                                        : 'bg-transparent hover:bg-white/50'
                                        }`}
                                    onClick={() => { setWinType(type); setLoserId(null) }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Loser Selection (for eat) */}
                    {winType === 'eat' && (
                        <div>
                            <label className="block font-bold text-sm mb-2 uppercase">邊個出銃?</label>
                            <div className="grid grid-cols-2 gap-2">
                                {players.map(p => (
                                    <button
                                        key={p.player_id}
                                        className={`py-3 px-2 rounded-lg border-comic-thin font-bold text-sm transition-all ${loserId === p.player_id
                                            ? 'bg-red text-white shadow-comic-sm'
                                            : p.player_id === winnerId
                                                ? 'bg-gray-100 opacity-50 cursor-not-allowed'
                                                : 'bg-white hover:bg-gray-100'
                                            }`}
                                        onClick={() => p.player_id !== winnerId && setLoserId(p.player_id)}
                                        disabled={p.player_id === winnerId}
                                    >
                                        {getShortName(p.player)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bao player selection (for zimo_bao) */}
                    {winType === 'zimo_bao' && (
                        <div>
                            <label className="block font-bold text-sm mb-2 uppercase">邊個包?</label>
                            <div className="grid grid-cols-2 gap-2">
                                {players.map(p => (
                                    <button
                                        key={p.player_id}
                                        className={`py-3 px-2 rounded-lg border-comic-thin font-bold text-sm transition-all ${loserId === p.player_id
                                            ? 'bg-red text-white shadow-comic-sm'
                                            : p.player_id === winnerId
                                                ? 'bg-gray-100 opacity-50 cursor-not-allowed'
                                                : 'bg-white hover:bg-gray-100'
                                            }`}
                                        onClick={() => p.player_id !== winnerId && setLoserId(p.player_id)}
                                        disabled={p.player_id === winnerId}
                                    >
                                        {getShortName(p.player)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Hand Pattern Selection */}
                    <div>
                        <label className="block font-bold text-sm mb-2 uppercase">牌型</label>

                        {/* Tabs for Regular / Limit */}
                        <div className="flex gap-1 mb-2">
                            <button
                                className={`flex-1 py-2 rounded-md font-bold text-sm border-comic-thin transition-all ${patternTab === 'regular' ? 'bg-cyan' : 'bg-white hover:bg-gray-100'
                                    }`}
                                onClick={() => setPatternTab('regular')}
                            >
                                常規
                            </button>
                            <button
                                className={`flex-1 py-2 rounded-md font-bold text-sm border-comic-thin transition-all ${patternTab === 'limit' ? 'bg-pink' : 'bg-white hover:bg-gray-100'
                                    }`}
                                onClick={() => setPatternTab('limit')}
                            >
                                爆棚
                            </button>
                        </div>

                        {/* Pattern Grid based on active tab */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {patternTab === 'regular' && HAND_PATTERNS.regular.map(p => (
                                <button
                                    key={p.id}
                                    className={`py-2 px-1 rounded-md border-comic-thin text-xs font-bold transition-all ${selectedPatterns.includes(p.id)
                                        ? 'bg-cyan shadow-comic-sm'
                                        : 'bg-white hover:bg-gray-100'
                                        }`}
                                    onClick={() => handlePatternToggle(p.id)}
                                >
                                    {p.name} <span className="text-gray-500">+{p.fan}</span>
                                </button>
                            ))}
                            {patternTab === 'limit' && HAND_PATTERNS.limit.map(p => (
                                <button
                                    key={p.id}
                                    className={`py-2 px-1 rounded-md border-comic-thin text-xs font-bold transition-all relative ${selectedPatterns.includes(p.id)
                                        ? 'bg-pink shadow-comic-sm'
                                        : isLimitDisabled(p)
                                            ? 'bg-gray-100 opacity-50 cursor-not-allowed'
                                            : 'bg-white hover:bg-gray-100'
                                        }`}
                                    onClick={() => !isLimitDisabled(p) && handlePatternToggle(p.id)}
                                    disabled={isLimitDisabled(p)}
                                    title={isLimitDisabled(p) ? '此牌型不適用包' : ''}
                                >
                                    {p.name}
                                    {p.hasBao && (
                                        <span className="absolute -top-1 -right-1 bg-red text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center border border-black">
                                            包
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Bonus / Add-ons */}
                        <div className="bg-gray-100 rounded-lg p-3">
                            <span className="text-xs font-bold text-gray-500 mb-2 block">附加</span>

                            {/* 番子 Counter */}
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-sm">番子</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        className="w-8 h-8 rounded border-comic-thin bg-white font-bold disabled:opacity-50 flex justify-center items-center"
                                        onClick={() => setFanZiCount(prev => Math.max(0, prev - 1))}
                                        disabled={fanZiCount === 0}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="w-6 text-center font-title text-lg">{fanZiCount}</span>
                                    <button
                                        className="w-8 h-8 rounded border-comic-thin bg-white font-bold disabled:opacity-50 flex justify-center items-center"
                                        onClick={() => setFanZiCount(prev => Math.min(4, prev + 1))}
                                        disabled={fanZiCount === 4}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* 正花 Counter */}
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-sm">正花</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        className="w-8 h-8 rounded border-comic-thin bg-white font-bold disabled:opacity-50 flex justify-center items-center"
                                        onClick={() => setZhengHuaCount(prev => Math.max(0, prev - 1))}
                                        disabled={zhengHuaCount === 0}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="w-6 text-center font-title text-lg">{zhengHuaCount}</span>
                                    <button
                                        className="w-8 h-8 rounded border-comic-thin bg-white font-bold disabled:opacity-50 flex justify-center items-center"
                                        onClick={() => setZhengHuaCount(prev => Math.min(2, prev + 1))}
                                        disabled={zhengHuaCount === 2}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Common add-ons (always visible) */}
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <button
                                    className={`py-2 px-2 rounded-md border-comic-thin text-xs font-bold transition-all ${selectedPatterns.includes('ping_hu')
                                        ? 'bg-yellow shadow-comic-sm'
                                        : 'bg-white hover:bg-gray-100'
                                        }`}
                                    onClick={() => handlePatternToggle('ping_hu')}
                                >
                                    平糊 <span className="text-gray-500">+1</span>
                                </button>
                                <button
                                    className={`py-2 px-2 rounded-md border-comic-thin text-xs font-bold transition-all ${selectedPatterns.includes('men_qian_qing')
                                        ? 'bg-yellow shadow-comic-sm'
                                        : 'bg-white hover:bg-gray-100'
                                        }`}
                                    onClick={() => handlePatternToggle('men_qian_qing')}
                                >
                                    門清 <span className="text-gray-500">+1</span>
                                </button>
                            </div>

                            {/* Rare add-ons - Collapsible */}
                            <button
                                className="w-full text-left text-xs font-bold text-gray-500 flex items-center gap-1"
                                onClick={() => setShowRareAddons(!showRareAddons)}
                            >
                                其他附加 {showRareAddons ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                {selectedPatterns.some(id => ['wu_hua', 'qiang_gang', 'gang_shang_hua', 'hai_di_lao_yue', 'hua_hu', 'yi_tai_hua'].includes(id)) && (
                                    <span className="text-orange">•</span>
                                )}
                            </button>

                            {showRareAddons && (
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {HAND_PATTERNS.bonus.filter(p => !['fan_zi', 'zheng_hua', 'ping_hu', 'men_qian_qing'].includes(p.id)).map(p => (
                                        <button
                                            key={p.id}
                                            className={`py-2 px-2 rounded-md border-comic-thin text-xs font-bold transition-all ${selectedPatterns.includes(p.id)
                                                ? 'bg-yellow shadow-comic-sm'
                                                : 'bg-white hover:bg-gray-100'
                                                }`}
                                            onClick={() => handlePatternToggle(p.id)}
                                        >
                                            {p.name} <span className="text-gray-500">+{p.fan}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Fan Selection */}
                    <div>
                        <label className="block font-bold text-sm mb-2 uppercase flex justify-between items-center">
                            <span>番</span>
                            <span className="text-orange font-title text-base">{getPointsDisplay()}</span>
                        </label>
                        <div className="grid grid-cols-7 gap-1">
                            {FAN_OPTIONS.map(fan => (
                                <button
                                    key={fan}
                                    className={`py-2 rounded border-comic-thin font-title text-lg transition-all ${effectiveFan === fan
                                        ? 'bg-orange shadow-comic-sm'
                                        : calculatedFan !== null && fan !== calculatedFan
                                            ? 'bg-gray-100 opacity-40'
                                            : 'bg-white hover:bg-gray-100'
                                        }`}
                                    onClick={() => { setFanCount(fan); setSelectedPatterns([]); setFanZiCount(0) }}
                                >
                                    {fan}
                                </button>
                            ))}
                        </div>
                        {calculatedFan !== null && (
                            <div className="text-xs text-gray-500 mt-1 text-center">
                                ⓘ Auto-calculated from patterns. Tap a number to override.
                            </div>
                        )}
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    className="m-4 py-4 bg-green border-comic-thick rounded-xl font-title text-xl shadow-comic-md transition-all hover:-translate-y-0.5 hover:shadow-comic-lg active:translate-y-0.5 active:shadow-comic-sm disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'SAVING...' : 'CONFIRM!'}
                </button>
            </div>
        </div >
    )
}

export default HuModal
