import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getPointsForFan } from '../lib/scoring'

const GameHistory = ({ isOpen, onClose, roomId, players, onUpdate }) => {
    const [rounds, setRounds] = useState([])
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState(null)

    // Fetch game rounds
    useEffect(() => {
        if (!isOpen || !roomId) return

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
    }, [isOpen, roomId])

    // Get player name by ID
    const getPlayerName = (playerId) => {
        const player = players.find(p => p.player_id === playerId)
        const name = player?.player?.display_name || 'Unknown'
        return name.split(' ')[0] // First name only
    }

    // Delete a round and reverse the points
    const handleDeleteRound = async (round) => {
        if (deleting) return
        setDeleting(round.id)

        try {
            // Reverse the points
            const points = round.points
            const winType = round.win_type
            const winnerId = round.winner_id
            const loserId = round.loser_id

            // Get current player points
            const winnerPlayer = players.find(p => p.player_id === winnerId)
            const loserPlayer = loserId ? players.find(p => p.player_id === loserId) : null

            // Calculate reversal amounts
            if (winType === 'eat') {
                // Direct win: winner loses points, loser gains back
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

                // Reverse winner points
                await supabase
                    .from('room_players')
                    .update({ current_points: (winnerPlayer?.current_points || 0) - winnerPoints })
                    .eq('room_id', roomId)
                    .eq('player_id', winnerId)

                if (winType === 'zimo_bao' && loserPlayer) {
                    // Bao player gets points back
                    await supabase
                        .from('room_players')
                        .update({ current_points: (loserPlayer?.current_points || 0) + winnerPoints })
                        .eq('room_id', roomId)
                        .eq('player_id', loserId)
                } else {
                    // All other players get back half points
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

            // Delete the round record
            await supabase
                .from('game_rounds')
                .delete()
                .eq('id', round.id)

            // Update local state
            setRounds(rounds.filter(r => r.id !== round.id))

            // Notify parent to refresh
            onUpdate?.()
        } catch (err) {
            console.error('Delete round error:', err)
        } finally {
            setDeleting(null)
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-[360px] max-h-[80vh] rounded-xl border-comic-thick flex flex-col shadow-comic-lg relative"
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
                <h2 className="font-title text-2xl text-center py-4 border-b-[3px] border-black bg-cyan shrink-0 rounded-t-lg">
                    GAME LOG
                </h2>

                {/* Scrollable List */}
                <div className="flex-1 scroll-section p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-8 text-gray-500 font-bold">
                            Loading...
                        </div>
                    ) : rounds.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-gray-500 font-bold">
                            No rounds recorded yet
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {rounds.map((round, index) => {
                                // Calculate actual winner points
                                const basePoints = round.points
                                const isZimo = round.win_type === 'zimo' || round.win_type === 'zimo_bao'
                                const winnerPoints = isZimo ? (basePoints / 2) * 3 : basePoints

                                return (
                                    <div
                                        key={round.id}
                                        className="bg-gray-100 border-comic-thin rounded-lg p-3 flex items-center gap-3"
                                    >
                                        {/* Round Number */}
                                        <div className="w-8 h-8 bg-black text-white rounded flex items-center justify-center font-title text-sm shrink-0">
                                            #{rounds.length - index}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1 text-sm font-bold">
                                                <span className="text-green truncate">{getPlayerName(round.winner_id)}</span>
                                                <span className={`py-0.5 px-1 rounded text-[10px] border border-black ${round.win_type === 'eat' ? 'bg-pink' : 'bg-yellow'
                                                    }`}>
                                                    {round.win_type === 'eat' ? '点炮' : '自摸'}
                                                </span>
                                                {round.loser_id && (
                                                    <span className="text-red truncate">{getPlayerName(round.loser_id)}</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {round.fan_count}番 · +{winnerPoints}分
                                            </div>
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            className="w-8 h-8 flex items-center justify-center bg-white border border-black rounded cursor-pointer hover:bg-red transition-colors disabled:opacity-50"
                                            onClick={() => handleDeleteRound(round)}
                                            disabled={deleting === round.id}
                                        >
                                            {deleting === round.id ? '...' : '🗑️'}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Close Button */}
                <button
                    className="m-4 py-3 bg-orange border-comic-medium rounded-lg font-title text-lg shadow-comic-sm cursor-pointer shrink-0"
                    onClick={onClose}
                >
                    CLOSE
                </button>
            </div>
        </div>
    )
}

export default GameHistory
