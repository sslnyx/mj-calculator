import { getFirstName } from '../lib/names'
import { getPlayerAvatar } from '../lib/avatar'

// Pattern ID to display name mapping
const PATTERN_NAMES = {
    // Regular
    qing_yi_se: '清一色',
    da_san_yuan: '大三元',
    xiao_san_yuan: '小三元',
    hua_yao_jiu: '花么九',
    hun_yi_se: '混一色',
    dui_dui_hu: '對對糊',
    hua_hu: '花糊',
    yi_tai_hua: '一臺花',
    ping_hu: '平糊',
    men_qian_qing: '門前清',
    zheng_hua: '正花',
    // Limit
    tian_hu: '天胡',
    di_hu: '地胡',
    shi_san_yao: '十三幺',
    jiu_lian_bao_deng: '九蓮寶燈',
    da_si_xi: '大四喜',
    xiao_si_xi: '小四喜',
    zi_yi_se: '字一色',
    qing_yao_jiu: '清么九',
    kan_kan_hu: '坎坎胡',
    shi_ba_luo_han: '十八羅漢',
    ba_xian_guo_hai: '八仙過海',
    // Bonus
    wu_hua: '無花',
    fan_zi: '番子',
    qiang_gang: '搶槓',
    gang_shang_hua: '槓上開花',
    hai_di_lao_yue: '海底撈月'
}

const MatchDetailsModal = ({ isOpen, onClose, match, currentPlayerId }) => {
    if (!isOpen || !match) return null

    const { room, rounds, finalScores } = match

    // Format time for each round
    const formatTime = (dateStr) => {
        const date = new Date(dateStr)
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }

    // Get win type label
    const getWinTypeLabel = (winType) => {
        switch (winType) {
            case 'eat': return '点炮'
            case 'zimo': return '自摸'
            case 'zimo_bao': return '包自摸'
            default: return winType
        }
    }

    // Get win type style
    const getWinTypeStyle = (winType) => {
        switch (winType) {
            case 'eat': return 'bg-pink border-pink'
            case 'zimo': return 'bg-yellow border-yellow'
            case 'zimo_bao': return 'bg-orange border-orange'
            default: return 'bg-gray-200 border-gray-400'
        }
    }

    // Calculate points display for a round
    const calculatePoints = (round) => {
        const basePoints = round.points
        const isZimo = round.win_type === 'zimo' || round.win_type === 'zimo_bao'
        return isZimo ? (basePoints / 2) * 3 : basePoints
    }

    // Get pattern display name
    const getPatternName = (patternId) => {
        return PATTERN_NAMES[patternId] || patternId
    }

    return (
        <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-[400px] max-h-[85vh] rounded-xl border-comic-thick flex flex-col shadow-comic-lg relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-100 border-2 border-black rounded-full text-lg font-bold cursor-pointer hover:bg-red hover:text-white z-10"
                    onClick={onClose}
                >
                    ×
                </button>

                {/* Header */}
                <div className="py-4 px-4 rounded-t-lg border-b-[3px] border-black shrink-0" style={{ backgroundColor: '#9333EA' }}>
                    <h2 className="font-title text-2xl text-center text-white drop-shadow-md">
                        🀄 {room.room_code}
                    </h2>
                    <div className="text-center text-sm text-white/90 mt-1">
                        {new Date(room.created_at).toLocaleDateString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 scroll-section p-4">
                    {/* Final Scores Summary */}
                    {finalScores && Object.keys(finalScores).length > 0 && (
                        <div className="mb-4 p-3 bg-gray-100 rounded-lg border-comic-thin">
                            <div className="text-sm font-bold text-gray-600 mb-2">🏆 最終成績</div>
                            <div className="grid grid-cols-4 gap-2">
                                {Object.entries(finalScores)
                                    .sort((a, b) => b[1].points - a[1].points)
                                    .map(([seat, data], idx) => (
                                        <div
                                            key={seat}
                                            className={`text-center p-2 rounded-lg border-2 ${data.player_id === currentPlayerId
                                                ? 'bg-yellow border-black'
                                                : idx === 0
                                                    ? 'bg-orange/30 border-orange'
                                                    : 'bg-white border-gray-300'
                                                }`}
                                        >
                                            <img
                                                src={getPlayerAvatar(data.avatar_seed, data.avatar_url)}
                                                alt=""
                                                className="w-8 h-8 mx-auto rounded-full border border-black mb-1"
                                                referrerPolicy="no-referrer"
                                            />
                                            <div className="text-xs font-bold text-gray-700 truncate">
                                                {getFirstName(data.player_name) || `P${seat.slice(-1)}`}
                                            </div>
                                            <div className={`font-title text-base ${data.points >= 0 ? 'text-green-bold' : 'text-red-bold'
                                                }`}>
                                                {data.points >= 0 ? '+' : ''}{data.points}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Round by Round Details */}
                    <div className="text-sm font-bold text-gray-600 mb-2">📜 對局詳情 ({rounds.length}局)</div>
                    <div className="flex flex-col gap-2">
                        {rounds
                            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                            .map((round, index) => {
                                const isCurrentPlayerWin = round.winner_id === currentPlayerId
                                const isCurrentPlayerLose = round.loser_id === currentPlayerId
                                const points = calculatePoints(round)

                                return (
                                    <div
                                        key={round.id}
                                        className={`p-3 rounded-lg border-2 ${isCurrentPlayerWin
                                            ? 'bg-green/10 border-green'
                                            : isCurrentPlayerLose
                                                ? 'bg-red/10 border-red'
                                                : 'bg-gray-50 border-gray-300'
                                            }`}
                                    >
                                        {/* Round Header */}
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 bg-black text-white rounded flex items-center justify-center font-title text-xs">
                                                    {index + 1}
                                                </span>
                                                <span className={`text-xs font-bold py-0.5 px-2 rounded border ${getWinTypeStyle(round.win_type)}`}>
                                                    {getWinTypeLabel(round.win_type)}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                {formatTime(round.created_at)}
                                            </span>
                                        </div>

                                        {/* Winner/Loser Info */}
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-green-bold font-bold">
                                                {getFirstName(round.winner?.display_name) || 'Unknown'}
                                            </span>
                                            {round.loser && (
                                                <>
                                                    <span className="text-gray-400">→</span>
                                                    <span className="text-red-bold font-bold">
                                                        {getFirstName(round.loser?.display_name) || 'Unknown'}
                                                    </span>
                                                </>
                                            )}
                                            <span className="ml-auto font-title text-base">
                                                {round.fan_count}番 (+{points})
                                            </span>
                                        </div>

                                        {/* Hand Patterns */}
                                        {round.hand_patterns && round.hand_patterns.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {round.hand_patterns.map((patternId, i) => (
                                                    <span
                                                        key={i}
                                                        className="text-xs bg-cyan/20 text-gray-700 px-2 py-0.5 rounded border border-cyan font-bold"
                                                    >
                                                        {getPatternName(patternId)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                    </div>
                </div>

                {/* Close Button */}
                <button
                    className="m-4 py-3 bg-orange border-comic-medium rounded-lg font-title text-lg shadow-comic-sm cursor-pointer shrink-0"
                    onClick={onClose}
                >
                    關閉
                </button>
            </div>
        </div>
    )
}

export default MatchDetailsModal
