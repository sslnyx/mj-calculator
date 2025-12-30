import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const WINDS = ['East', 'South', 'West', 'North']

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

const GameLog = ({ roomId, players, onUpdate }) => {
    const [rounds, setRounds] = useState([])
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState(null)

    // Fetch game rounds
    useEffect(() => {
        if (!roomId) return

        const fetchRounds = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('game_rounds')
                .select('*')
                .eq('room_id', roomId)
                .order('created_at', { ascending: false })

            if (!error && data) {
                setRounds(data)
            }
            setLoading(false)
        }

        fetchRounds()

        // Subscribe to changes
        const channel = supabase
            .channel(`game_rounds_${roomId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'game_rounds',
                filter: `room_id=eq.${roomId}`
            }, () => {
                fetchRounds()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [roomId])

    // Get player name by ID
    const getPlayerName = (playerId) => {
        const player = players.find(p => p.player_id === playerId)
        const name = player?.player?.display_name || 'Unknown'
        return name.split(' ')[0]
    }

    // Get seat wind by player ID
    const getSeatWind = (playerId) => {
        const player = players.find(p => p.player_id === playerId)
        const seat = player?.seat_position || 1
        return WINDS[(seat - 1) % 4]
    }

    // Delete a round and reverse the points
    const handleDeleteRound = async (round) => {
        if (deleting) return
        setDeleting(round.id)

        try {
            // First delete the round from database
            const { error: deleteError } = await supabase
                .from('game_rounds')
                .delete()
                .eq('id', round.id)

            if (deleteError) {
                console.error('Failed to delete round:', deleteError)
                alert('Failed to delete round: ' + deleteError.message)
                return
            }

            // Then reverse the points
            const points = round.points
            const winType = round.win_type
            const winnerId = round.winner_id
            const loserId = round.loser_id
            const fanCount = round.fan_count || 0
            const handPatterns = round.hand_patterns || []

            const winnerPlayer = players.find(p => p.player_id === winnerId)
            const loserPlayer = loserId ? players.find(p => p.player_id === loserId) : null

            // Calculate actual winner points for stats reversal
            const isZimo = winType === 'zimo' || winType === 'zimo_bao'
            const actualWinnerPoints = isZimo ? (points / 2) * 3 : points

            if (winType === 'eat') {
                await supabase
                    .from('room_players')
                    .update({ current_points: (winnerPlayer?.current_points || 0) - points })
                    .eq('room_id', roomId)
                    .eq('player_id', winnerId)

                if (loserPlayer) {
                    await supabase
                        .from('room_players')
                        .update({ current_points: (loserPlayer?.current_points || 0) + points })
                        .eq('room_id', roomId)
                        .eq('player_id', loserId)
                }
            } else if (winType === 'zimo' || winType === 'zimo_bao') {
                const halfPoints = points / 2
                const winnerPoints = halfPoints * 3

                await supabase
                    .from('room_players')
                    .update({ current_points: (winnerPlayer?.current_points || 0) - winnerPoints })
                    .eq('room_id', roomId)
                    .eq('player_id', winnerId)

                if (winType === 'zimo_bao' && loserPlayer) {
                    await supabase
                        .from('room_players')
                        .update({ current_points: (loserPlayer?.current_points || 0) + winnerPoints })
                        .eq('room_id', roomId)
                        .eq('player_id', loserId)
                } else {
                    for (const p of players) {
                        if (p.player_id !== winnerId) {
                            await supabase
                                .from('room_players')
                                .update({ current_points: (p.current_points || 0) + halfPoints })
                                .eq('room_id', roomId)
                                .eq('player_id', p.player_id)
                        }
                    }
                }
            }

            // === REVERSE PLAYER STATS ===
            // Reverse stats for all players in the room
            for (const player of players) {
                const pid = player.player_id

                // Fetch current stats
                const { data: stats } = await supabase
                    .from('player_stats')
                    .select('*')
                    .eq('player_id', pid)
                    .single()

                if (!stats) continue

                // Base update: everyone's round count decreases
                const updates = {
                    total_games: Math.max(0, (stats.total_games || 0) - 1)
                }

                // WINNER reversal
                if (pid === winnerId) {
                    updates.total_wins = Math.max(0, (stats.total_wins || 0) - 1)
                    updates.total_points_won = Math.max(0, (stats.total_points_won || 0) - actualWinnerPoints)
                    updates.total_fan_value = Math.max(0, (stats.total_fan_value || 0) - fanCount)

                    if (isZimo) {
                        updates.total_zimo = Math.max(0, (stats.total_zimo || 0) - 1)
                    } else {
                        updates.total_eat = Math.max(0, (stats.total_eat || 0) - 1)
                    }

                    if (fanCount >= 10) {
                        updates.total_limit_hands = Math.max(0, (stats.total_limit_hands || 0) - 1)
                    }

                    // Reverse hand pattern counts
                    if (handPatterns && handPatterns.length > 0) {
                        const patternCounts = stats.hand_pattern_counts || {}
                        handPatterns.forEach(patternId => {
                            if (patternCounts[patternId]) {
                                patternCounts[patternId] = Math.max(0, patternCounts[patternId] - 1)
                                if (patternCounts[patternId] === 0) {
                                    delete patternCounts[patternId]
                                }
                            }
                        })
                        updates.hand_pattern_counts = patternCounts
                    }
                }
                // DEAL-IN LOSER reversal
                else if (winType === 'eat' && pid === loserId) {
                    updates.total_deal_ins = Math.max(0, (stats.total_deal_ins || 0) - 1)
                    updates.total_points_lost = Math.max(0, (stats.total_points_lost || 0) - points)
                }
                // BAO LOSER reversal
                else if (winType === 'zimo_bao' && pid === loserId) {
                    updates.total_bao = Math.max(0, (stats.total_bao || 0) - 1)
                    updates.total_points_lost = Math.max(0, (stats.total_points_lost || 0) - actualWinnerPoints)
                }
                // ZIMO LOSER reversal (everyone else)
                else if (winType === 'zimo' && pid !== winnerId) {
                    const share = actualWinnerPoints / 3
                    updates.total_points_lost = Math.max(0, (stats.total_points_lost || 0) - share)
                }

                await supabase
                    .from('player_stats')
                    .update(updates)
                    .eq('player_id', pid)
            }

            // Update local state immediately
            setRounds(prev => prev.filter(r => r.id !== round.id))
            onUpdate?.()
        } catch (err) {
            console.error('Delete round error:', err)
            alert('Error deleting round: ' + err.message)
        } finally {
            setDeleting(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500 font-bold">
                Loading...
            </div>
        )
    }

    if (rounds.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500 font-bold">
                No rounds recorded yet
            </div>
        )
    }

    return (
        <div className="h-full scroll-section flex flex-col gap-2">
            {rounds.map((round, index) => {
                const basePoints = round.points
                const isZimo = round.win_type === 'zimo' || round.win_type === 'zimo_bao'
                const winnerPoints = isZimo ? (basePoints / 2) * 3 : basePoints
                const roundNum = rounds.length - index

                return (
                    <div
                        key={round.id}
                        className="bg-white border-comic-thin rounded-lg p-3 shadow-comic-sm"
                    >
                        {/* Top Row: Wind, Winner, Type, Loser, Points, Delete */}
                        <div className="flex items-center gap-2">
                            {/* Wind Badge */}
                            <div className="bg-cyan text-black text-xs font-bold py-1 px-2 rounded border-2 border-black shrink-0">
                                {getSeatWind(round.winner_id)} {roundNum}
                            </div>

                            {/* Content */}
                            <div className="flex-1 flex items-center gap-2 min-w-0 text-sm font-bold">
                                <span className="truncate">{getPlayerName(round.winner_id)}</span>
                                <span className={`py-0.5 px-1.5 rounded text-xs border border-black ${round.win_type === 'eat' ? 'bg-pink' : 'bg-yellow'
                                    }`}>
                                    {round.win_type === 'eat' ? 'HIT' : 'TSUMO'}
                                </span>
                                {round.loser_id && (
                                    <span className="truncate text-gray-500">{getPlayerName(round.loser_id)}</span>
                                )}
                            </div>

                            {/* Points */}
                            <div className="font-title text-lg text-green shrink-0">
                                +{winnerPoints}
                            </div>

                            {/* Delete Button */}
                            <button
                                className="w-7 h-7 flex items-center justify-center bg-gray-100 border border-black rounded text-sm cursor-pointer hover:bg-red hover:text-white transition-colors disabled:opacity-50"
                                onClick={() => handleDeleteRound(round)}
                                disabled={deleting === round.id}
                            >
                                {deleting === round.id ? '...' : '✕'}
                            </button>
                        </div>

                        {/* Bottom Row: Hand Patterns & Fan Count */}
                        <div className="flex items-center gap-2 mt-2 text-xs">
                            <span className="text-orange font-bold">{round.fan_count}番</span>
                            {round.hand_patterns && round.hand_patterns.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                    {round.hand_patterns.map((patternId, i) => (
                                        <span
                                            key={i}
                                            className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300 text-gray-700"
                                        >
                                            {PATTERN_NAMES[patternId] || patternId}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-gray-400">手動輸入</span>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export default GameLog
