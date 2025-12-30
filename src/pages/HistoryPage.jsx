import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Clock, Eye } from 'lucide-react'
import { getPlayerAvatar } from '../lib/avatar'
import { getFirstName } from '../lib/names'
import MatchDetailsModal from '../components/MatchDetailsModal'

const HistoryPage = ({ onBack }) => {
    const { player } = useAuth()
    const [matches, setMatches] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [selectedMatch, setSelectedMatch] = useState(null)

    const fetchHistory = async (showRefresh = false) => {
        if (!player) return
        if (showRefresh) setRefreshing(true)
        else setLoading(true)

        // Fetch all game_rounds where the player was a winner or loser
        const { data: rounds, error } = await supabase
            .from('game_rounds')
            .select(`
                *,
                room:game_rooms (id, room_code, status, created_at, ended_at, final_scores),
                winner:players!winner_id (id, display_name, avatar_url, avatar_seed),
                loser:players!loser_id (id, display_name, avatar_url, avatar_seed)
            `)
            .or(`winner_id.eq.${player.id},loser_id.eq.${player.id}`)
            .order('created_at', { ascending: false })
            .limit(50)

        if (!error && rounds) {
            // Group rounds by room
            const roomMap = new Map()
            rounds.forEach(round => {
                const roomId = round.room?.id
                if (!roomId) return

                if (!roomMap.has(roomId)) {
                    roomMap.set(roomId, {
                        room: round.room,
                        rounds: [],
                        playerWins: 0,
                        playerPoints: 0,
                        finalScores: round.room?.final_scores || null
                    })
                }

                const roomData = roomMap.get(roomId)
                roomData.rounds.push(round)

                // Calculate player's performance
                if (round.winner_id === player.id) {
                    roomData.playerWins++
                    const isZimo = round.win_type === 'zimo' || round.win_type === 'zimo_bao'
                    roomData.playerPoints += isZimo ? (round.points / 2) * 3 : round.points
                } else if (round.loser_id === player.id) {
                    const isZimo = round.win_type === 'zimo' || round.win_type === 'zimo_bao'
                    roomData.playerPoints -= isZimo ? (round.points / 2) * 3 : round.points
                }
            })

            // Convert to array and sort by most recent
            const matchList = Array.from(roomMap.values())
                .sort((a, b) => new Date(b.room.created_at) - new Date(a.room.created_at))

            setMatches(matchList)
        }

        setLoading(false)
        setRefreshing(false)
    }

    useEffect(() => {
        fetchHistory()
    }, [player])

    const formatDate = (dateStr) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diff = now - date
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))

        if (days === 0) return '今天'
        if (days === 1) return '昨天'
        if (days < 7) return `${days}天前`

        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    }

    if (loading) {
        return (
            <div className="h-[100svh] flex flex-col items-center justify-center bg-gray-100 pb-16">
                <div className="loading-spinner"></div>
                <p className="font-body font-bold mt-4">Loading...</p>
            </div>
        )
    }

    return (
        <div className="h-[100svh] bg-gray-100 flex flex-col overflow-hidden pb-16">
            {/* Header */}
            <header className="bg-purple border-b-[3px] border-black p-4 flex items-center gap-4 shrink-0">
                <button
                    className="bg-white border-comic-thin p-2 rounded-md cursor-pointer shadow-comic-sm hover:bg-gray-100"
                    onClick={onBack}
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="font-title text-2xl m-0 flex-1 text-white">對局歷史</h1>
            </header>

            {/* Match List */}
            <div className="flex-1 scroll-section p-4">
                {matches.length === 0 ? (
                    <div className="text-center py-12">
                        <Clock size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="font-body font-bold text-gray-500">暫無對局記錄</p>
                        <p className="text-gray-400 text-sm mt-2">參加比賽後會在這裡顯示</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {matches.map((match, index) => (
                            <div
                                key={match.room.id}
                                className={`bg-white border-comic-medium rounded-lg p-4 shadow-comic-sm ${index % 2 === 0 ? '-rotate-[0.5deg]' : 'rotate-[0.5deg]'}`}
                            >
                                {/* Match Header */}
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="font-title text-lg">
                                            🀄 {match.room.room_code}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {formatDate(match.room.created_at)} · {match.rounds.length}局
                                        </div>
                                    </div>
                                    <div className={`font-title text-xl ${match.playerPoints >= 0 ? 'text-green-bold' : 'text-red-bold'}`}>
                                        {match.playerPoints >= 0 ? '+' : ''}{match.playerPoints}
                                    </div>
                                </div>

                                {/* Match Summary */}
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 text-sm">
                                        <span className="text-green-bold">勝{match.playerWins}</span>
                                        <span className="text-gray-400">/</span>
                                        <span className="font-bold text-gray-500">負{match.rounds.length - match.playerWins}</span>
                                    </div>

                                    {/* Status Badge */}
                                    <div className={`text-xs font-bold py-0.5 px-2 rounded border border-black ${match.room.status === 'completed' ? 'bg-gray-200' : 'bg-green'
                                        }`}>
                                        {match.room.status === 'completed' ? '已結束' : '進行中'}
                                    </div>
                                </div>

                                {/* Final Scores by Seat */}
                                {match.finalScores && Object.keys(match.finalScores).length > 0 && (
                                    <div className="mt-3 pt-3 border-t-2 border-gray-300">
                                        <div className="text-sm font-bold text-gray-600 mb-2">🏆 最終成績</div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {Object.entries(match.finalScores)
                                                .sort((a, b) => b[1].points - a[1].points) // Sort by points high to low
                                                .map(([seat, data], idx) => (
                                                    <div
                                                        key={seat}
                                                        className={`text-center p-2 rounded-lg border-2 ${data.player_id === player.id
                                                            ? 'bg-yellow border-black'
                                                            : idx === 0
                                                                ? 'bg-orange/20 border-orange'
                                                                : 'bg-gray-100 border-gray-300'
                                                            }`}
                                                    >
                                                        <div className="text-xs font-bold text-gray-700 truncate">
                                                            {getFirstName(data.player_name) || `P${seat.slice(-1)}`}
                                                        </div>
                                                        <div className={`font-title text-lg ${data.points >= 0 ? 'text-green-bold' : 'text-red-bold'
                                                            }`}>
                                                            {data.points >= 0 ? '+' : ''}{data.points}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {/* Round Details */}
                                {match.rounds.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-wrap gap-1.5 flex-1">
                                                {match.rounds.slice(0, 4).map((round, i) => {
                                                    const isWin = round.winner_id === player.id
                                                    return (
                                                        <span
                                                            key={round.id}
                                                            className={`text-sm font-bold px-2.5 py-1 rounded border-2 ${isWin
                                                                ? 'bg-green/20 border-green text-green-bold'
                                                                : 'bg-red/20 border-red text-red-bold'
                                                                }`}
                                                        >
                                                            {isWin ? '勝' : '負'} {round.fan_count}番
                                                        </span>
                                                    )
                                                })}
                                                {match.rounds.length > 4 && (
                                                    <span className="text-sm text-gray-400 self-center">
                                                        +{match.rounds.length - 4}
                                                    </span>
                                                )}
                                            </div>
                                            {/* View Details Button */}
                                            <button
                                                className="flex items-center gap-1 px-3 py-1.5 bg-cyan border-2 border-black rounded-lg font-bold text-sm shadow-comic-sm hover:bg-cyan/80 transition-colors cursor-pointer"
                                                onClick={() => setSelectedMatch(match)}
                                            >
                                                <Eye size={16} />
                                                詳情
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Match Details Modal */}
            <MatchDetailsModal
                isOpen={!!selectedMatch}
                onClose={() => setSelectedMatch(null)}
                match={selectedMatch}
                currentPlayerId={player?.id}
            />
        </div>
    )
}

export default HistoryPage
