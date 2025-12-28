import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const WINDS = ['East', 'South', 'West', 'North']

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

            const winnerPlayer = players.find(p => p.player_id === winnerId)
            const loserPlayer = loserId ? players.find(p => p.player_id === loserId) : null

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
        return <div className="log-loading">Loading...</div>
    }

    if (rounds.length === 0) {
        return <div className="log-empty">No rounds recorded yet</div>
    }

    return (
        <div className="game-log-list">
            {rounds.map((round, index) => {
                const basePoints = round.points
                const isZimo = round.win_type === 'zimo' || round.win_type === 'zimo_bao'
                const winnerPoints = isZimo ? (basePoints / 2) * 3 : basePoints
                const roundNum = rounds.length - index

                return (
                    <div key={round.id} className="log-item">
                        <div className="log-badge">{getSeatWind(round.winner_id)} {roundNum}</div>
                        <div className="log-content">
                            <span className="log-player">{getPlayerName(round.winner_id)}</span>
                            <span className="log-hit">{round.win_type === 'eat' ? 'HIT' : 'TSUMO'}</span>
                            {round.loser_id && (
                                <span className="log-player">{getPlayerName(round.loser_id)}</span>
                            )}
                        </div>
                        <div className="log-points">+{winnerPoints}</div>
                        <button
                            className="log-delete-btn"
                            onClick={() => handleDeleteRound(round)}
                            disabled={deleting === round.id}
                        >
                            {deleting === round.id ? '...' : '✕'}
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

export default GameLog
