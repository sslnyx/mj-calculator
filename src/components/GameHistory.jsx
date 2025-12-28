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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content history-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>

                <h2 className="history-title">GAME LOG</h2>

                <div className="history-list">
                    {loading ? (
                        <div className="history-loading">Loading...</div>
                    ) : rounds.length === 0 ? (
                        <div className="history-empty">No rounds recorded yet</div>
                    ) : (
                        rounds.map((round, index) => {
                            // Calculate actual winner points
                            const basePoints = round.points
                            const isZimo = round.win_type === 'zimo' || round.win_type === 'zimo_bao'
                            const winnerPoints = isZimo ? (basePoints / 2) * 3 : basePoints

                            return (
                                <div key={round.id} className="history-item">
                                    <div className="history-round-num">#{rounds.length - index}</div>
                                    <div className="history-info">
                                        <div className="history-players">
                                            <span className="history-winner">{getPlayerName(round.winner_id)}</span>
                                            <span className="history-action">
                                                {round.win_type === 'eat' ? '点炮' : '自摸'}
                                            </span>
                                            {round.loser_id && (
                                                <span className="history-loser">{getPlayerName(round.loser_id)}</span>
                                            )}
                                        </div>
                                        <div className="history-details">
                                            {round.fan_count}番 · +{winnerPoints}分
                                        </div>
                                    </div>
                                    <button
                                        className="history-delete-btn"
                                        onClick={() => handleDeleteRound(round)}
                                        disabled={deleting === round.id}
                                    >
                                        {deleting === round.id ? '...' : '🗑️'}
                                    </button>
                                </div>
                            )
                        })
                    )}
                </div>

                <button className="confirm-btn" onClick={onClose}>
                    CLOSE
                </button>
            </div>
        </div>
    )
}

export default GameHistory
