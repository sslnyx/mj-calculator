import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useGameRoom } from '../contexts/GameRoomContext'
import { getPointsForFan, getWinnerPoints, calculateRoundChanges } from '../lib/scoring'
import { getPatternName } from '../lib/patterns'

const WINDS = ['East', 'South', 'West', 'North']

// GameLog now uses GameRoomContext for rounds (single source of truth)
const GameLog = ({ onUpdate }) => {
    const { room, rounds, players, vacatedSeats, masterSeatMap, refreshData } = useGameRoom()
    const [deleting, setDeleting] = useState(null)

    // Get rounds in reverse order (newest first) for display
    const displayRounds = useMemo(() => {
        return [...rounds].reverse()
    }, [rounds])

    // Check if loading
    const loading = !room

    // Get player name by ID - uses round's joined data first, then master seat map info
    const getPlayerName = (playerId, round = null) => {
        // First check if round has the player data (winner or loser)
        if (round) {
            if (round.winner?.id === playerId) {
                const name = round.winner.display_name || 'Unknown'
                return name.split(' ')[0]
            }
            if (round.loser?.id === playerId) {
                const name = round.loser.display_name || 'Unknown'
                return name.split(' ')[0]
            }
        }

        // Try active players
        const active = players.find(p => p.player_id === playerId)
        if (active) return (active.player?.display_name || 'Unknown').split(' ')[0]

        // Try vacated
        const vacated = vacatedSeats.find(vs => vs.player_id === playerId)
        if (vacated) return (vacated.player_name || 'Unknown').split(' ')[0]

        // Try final scores
        if (room?.final_scores) {
            const final = Object.values(room.final_scores).find(fs => fs.player_id === playerId)
            if (final) return (final.player_name || 'Unknown').split(' ')[0]
        }

        return 'Unknown'
    }

    // Get seat wind by player ID
    const getSeatWind = (playerId) => {
        const seat = masterSeatMap[playerId] || 1
        return WINDS[(seat - 1) % 4]
    }

    // Calculate accumulated points for each round
    // Returns a map: roundId -> { seat_position: accumulatedPoints }
    const accumulatedPointsByRound = useMemo(() => {
        if (!rounds.length) return {}

        // Sort rounds by created_at ascending (oldest first) for calculation
        const sortedRounds = [...rounds].sort((a, b) =>
            new Date(a.created_at) - new Date(b.created_at)
        )

        // Initialize all seats with 0 points
        const runningTotals = { 1: 0, 2: 0, 3: 0, 4: 0 }
        const result = {}

        sortedRounds.forEach(round => {
            const changes = calculateRoundChanges(round, masterSeatMap)
            Object.keys(changes).forEach(seat => {
                runningTotals[seat] += changes[seat] || 0
            })

            // Store snapshot
            result[round.id] = { ...runningTotals }
        })

        return result
    }, [rounds, masterSeatMap])

    // Calculate point changes for THIS round only (not accumulated)
    // Returns a map: roundId -> { seat_position: pointChange }
    const roundPointChanges = useMemo(() => {
        const result = {}

        rounds.forEach(round => {
            result[round.id] = calculateRoundChanges(round, masterSeatMap)
        })

        return result
    }, [rounds, masterSeatMap])

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

            // Then reverse the points in room_players (for DB consistency)
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
            const actualWinnerPoints = getWinnerPoints(points, winType)

            if (winType === 'eat') {
                await supabase
                    .from('room_players')
                    .update({ current_points: (winnerPlayer?.current_points || 0) - points })
                    .eq('room_id', room.id)
                    .eq('player_id', winnerId)

                if (loserPlayer) {
                    await supabase
                        .from('room_players')
                        .update({ current_points: (loserPlayer?.current_points || 0) + points })
                        .eq('room_id', room.id)
                        .eq('player_id', loserId)
                }
            } else if (winType === 'zimo' || winType === 'zimo_bao') {
                const halfPoints = points / 2
                const winnerPoints = halfPoints * 3

                await supabase
                    .from('room_players')
                    .update({ current_points: (winnerPlayer?.current_points || 0) - winnerPoints })
                    .eq('room_id', room.id)
                    .eq('player_id', winnerId)

                if (winType === 'zimo_bao' && loserPlayer) {
                    await supabase
                        .from('room_players')
                        .update({ current_points: (loserPlayer?.current_points || 0) + winnerPoints })
                        .eq('room_id', room.id)
                        .eq('player_id', loserId)
                } else {
                    for (const p of players) {
                        if (p.player_id !== winnerId) {
                            await supabase
                                .from('room_players')
                                .update({ current_points: (p.current_points || 0) + halfPoints })
                                .eq('room_id', room.id)
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

            // Trigger refresh via context
            await refreshData()
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
                載入中...
            </div>
        )
    }

    if (displayRounds.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500 font-bold">
                No rounds recorded yet
            </div>
        )
    }

    return (
        <div className="h-full scroll-section flex flex-col gap-2">
            {displayRounds.map((round, index) => {
                const basePoints = round.points
                const isZimo = round.win_type === 'zimo' || round.win_type === 'zimo_bao'
                const winnerPoints = getWinnerPoints(basePoints, round.win_type)
                const roundNum = displayRounds.length - index

                return (
                    <div
                        key={round.id}
                        className="bg-white border-comic-thin rounded-lg p-3 shadow-comic-sm"
                    >
                        {/* Top Row: Wind, Winner, Type, Loser, Points, Delete */}
                        <div className="flex items-center gap-2">
                            {/* Game Number Badge */}
                            <div className="bg-cyan text-black text-xs font-bold py-1 px-2 rounded border-2 border-black shrink-0">
                                Game {roundNum}
                            </div>

                            {/* Content */}
                            <div className="flex-1 flex items-center gap-2 min-w-0 text-sm font-bold">
                                <span className="truncate">{getPlayerName(round.winner_id, round)}</span>
                                <span className={`py-0.5 px-1.5 rounded text-xs border border-black ${round.win_type === 'eat' ? 'bg-pink' : 'bg-yellow'
                                    }`}>
                                    {round.win_type === 'eat' ? 'HIT' : 'TSUMO'}
                                </span>
                                {round.loser_id && (
                                    <span className="truncate text-gray-500">{getPlayerName(round.loser_id, round)}</span>
                                )}
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

                        {/* Stacked Scores: Round Change + Accumulated */}
                        {roundPointChanges[round.id] && (
                            <div className="flex items-stretch gap-1.5 mt-2">
                                {[1, 2, 3, 4].map(seat => {
                                    // Find player ID for this seat
                                    const playerId = Object.keys(masterSeatMap).find(id => masterSeatMap[id] === seat)
                                    if (!playerId) return <div key={seat} className="flex-1"></div>

                                    const roundPts = roundPointChanges[round.id][seat] || 0
                                    const accPts = accumulatedPointsByRound[round.id]?.[seat] || 0
                                    return (
                                        <div
                                            key={seat}
                                            className={`flex-1 text-center py-1.5 rounded-md ${accPts > 0 ? 'bg-green/10' :
                                                accPts < 0 ? 'bg-red/10' :
                                                    'bg-gray-50'
                                                }`}
                                        >
                                            {/* Round change */}
                                            <div className={`font-title text-base ${roundPts > 0 ? 'text-green-bold' :
                                                roundPts < 0 ? 'text-red-bold' :
                                                    'text-gray-300'
                                                }`}>
                                                {roundPts !== 0 ? (roundPts > 0 ? `+${roundPts}` : roundPts) : '·'}
                                            </div>
                                            {/* Player name + accumulated */}
                                            <div className={`text-[10px] font-bold ${accPts > 0 ? 'text-green-bold' :
                                                accPts < 0 ? 'text-red-bold' :
                                                    'text-gray-400'
                                                }`}>
                                                {getPlayerName(playerId)} {accPts > 0 ? `+${accPts}` : accPts}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

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
                                            {getPatternName(patternId)}
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
