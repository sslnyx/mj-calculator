import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Trash2 } from 'lucide-react'

const ScoreTable = ({ roomId, players, onUpdate }) => {
    const [rounds, setRounds] = useState([])
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState(null)
    const [playerLookup, setPlayerLookup] = useState({}) // playerId -> seat at time of round

    // Fetch game rounds with player-to-seat mapping
    useEffect(() => {
        if (!roomId) return

        const fetchRounds = async () => {
            setLoading(true)

            // Fetch rounds with winner/loser info
            const { data, error } = await supabase
                .from('game_rounds')
                .select(`
                    *,
                    winner:winner_id(id, display_name),
                    loser:loser_id(id, display_name)
                `)
                .eq('room_id', roomId)
                .order('created_at', { ascending: true })

            if (!error && data) {
                setRounds(data)

                // Build player lookup from current room_players
                // This maps player_id -> seat_position for score calculation
                const lookup = {}
                players.forEach(p => {
                    lookup[p.player_id] = p.seat_position
                })

                // Also include any players from rounds that are not in current room
                // They get mapped to seat based on historical data
                // For now, we'll use current seat mapping only - departed players won't show in columns
                setPlayerLookup(lookup)
            }
            setLoading(false)
        }

        fetchRounds()

        // Subscribe to changes
        const channel = supabase
            .channel(`score_table_${roomId}`)
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
    }, [roomId, players])

    // Get player name by ID (first name only, max 6 chars)
    const getPlayerName = (playerId) => {
        const player = players.find(p => p.player_id === playerId)
        const name = player?.player?.display_name || '?'
        const firstName = name.split(' ')[0]
        return firstName.length > 6 ? firstName.substring(0, 6) : firstName
    }

    // Get seat position for a player (current or historical)
    const getSeatForPlayer = (playerId) => {
        return playerLookup[playerId]
    }

    // Calculate point changes for each round BY SEAT POSITION
    // When player A leaves and player B takes seat 1, seat 1 inherits all scores
    const roundPointChanges = useMemo(() => {
        return rounds.map(round => {
            const basePoints = round.points
            const isZimo = round.win_type === 'zimo' || round.win_type === 'zimo_bao'
            const winnerId = round.winner_id
            const loserId = round.loser_id

            // Initialize changes by seat position (1-4)
            const changes = { 1: 0, 2: 0, 3: 0, 4: 0 }

            // Get winner's seat (current mapping - if player left, this will be undefined)
            const winnerSeat = getSeatForPlayer(winnerId)
            const loserSeat = getSeatForPlayer(loserId)

            if (isZimo) {
                const halfPoints = basePoints / 2
                const winnerGain = halfPoints * 3

                if (winnerSeat) {
                    changes[winnerSeat] = winnerGain
                }

                if (round.win_type === 'zimo_bao' && loserSeat) {
                    changes[loserSeat] = -winnerGain
                } else {
                    // Everyone else loses halfPoints
                    [1, 2, 3, 4].forEach(seat => {
                        if (seat !== winnerSeat) {
                            changes[seat] = -halfPoints
                        }
                    })
                }
            } else {
                // Eat: winner gets base, loser loses base
                if (winnerSeat) {
                    changes[winnerSeat] = basePoints
                }
                if (loserSeat) {
                    changes[loserSeat] = -basePoints
                }
            }

            return { roundId: round.id, changes, fanCount: round.fan_count, winType: round.win_type }
        })
    }, [rounds, playerLookup])

    // Calculate accumulated totals by seat
    const totals = useMemo(() => {
        const result = { 1: 0, 2: 0, 3: 0, 4: 0 }

        roundPointChanges.forEach(({ changes }) => {
            Object.entries(changes).forEach(([seat, pts]) => {
                result[seat] += pts
            })
        })

        return result
    }, [roundPointChanges])

    // Handle delete round
    const handleDeleteRound = async (round) => {
        if (deleting) return
        setDeleting(round.id)

        try {
            const { error } = await supabase
                .from('game_rounds')
                .delete()
                .eq('id', round.id)

            if (error) throw error
            onUpdate?.()
        } catch (err) {
            console.error('Delete round error:', err)
        } finally {
            setDeleting(null)
        }
    }

    // Sort players by seat position
    const sortedPlayers = [...players].sort((a, b) => a.seat_position - b.seat_position)

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500 font-bold">
                載入中...
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header - Player Names */}
            <div className="shrink-0 bg-gradient-to-r from-purple-600 to-purple-500 px-2 py-3 rounded-t-lg">
                <div className="flex items-center">
                    <div className="w-10 text-center text-xs font-bold text-black">#</div>
                    {sortedPlayers.map(p => (
                        <div
                            key={p.player_id}
                            className="flex-1 text-center"
                        >
                            <span className="font-bold truncate text-black">
                                {getPlayerName(p.player_id)}
                            </span>
                        </div>
                    ))}
                    <div className="w-8"></div>
                </div>
            </div>

            {/* Scrollable Rows */}
            <div className="flex-1 overflow-auto">
                {rounds.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 font-bold">
                        <div className="text-center">
                            <div className="text-4xl mb-2">🀄</div>
                            <div>等待記錄...</div>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {rounds.map((round, index) => {
                            const { changes, fanCount, winType } = roundPointChanges[index] || {}
                            const isEven = index % 2 === 0
                            return (
                                <div
                                    key={round.id}
                                    className={`flex items-center px-2 py-3 transition-colors hover:bg-gray-50 ${isEven ? 'bg-white' : 'bg-gray-50/50'}`}
                                >
                                    {/* Round number with type indicator */}
                                    <div className="w-10 flex flex-col items-center">
                                        <span className="text-xs font-bold text-gray-400">{index + 1}</span>
                                        <span className={`text-[10px] font-bold px-1 rounded ${winType === 'eat' ? 'bg-pink/30 text-pink' : 'bg-yellow/50 text-orange'
                                            }`}>
                                            {fanCount}番
                                        </span>
                                    </div>

                                    {/* Point changes by seat */}
                                    {sortedPlayers.map(p => {
                                        const pts = changes?.[p.seat_position] || 0
                                        const isWinner = pts > 0
                                        const isLoser = pts < 0
                                        return (
                                            <div
                                                key={p.player_id}
                                                className="flex-1 text-center"
                                            >
                                                <span className={`font-title text-lg inline-block min-w-[50px] py-1 rounded-md ${isWinner ? 'text-green-bold bg-green/10' :
                                                    isLoser ? 'text-red-bold bg-red/10' :
                                                        'text-gray-300'
                                                    }`}>
                                                    {pts !== 0 ? (pts > 0 ? `+${pts}` : pts) : '·'}
                                                </span>
                                            </div>
                                        )
                                    })}

                                    {/* Delete button */}
                                    <div className="w-8 flex justify-center">
                                        <button
                                            className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red hover:bg-red/10 rounded-full transition-all disabled:opacity-50"
                                            onClick={() => handleDeleteRound(round)}
                                            disabled={deleting === round.id}
                                        >
                                            {deleting === round.id ? (
                                                <span className="text-xs">...</span>
                                            ) : (
                                                <Trash2 size={14} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Footer - Totals by seat */}
            {rounds.length > 0 && (
                <div className="shrink-0 bg-gradient-to-r from-gray-800 to-gray-700 px-2 py-4">
                    <div className="flex items-center">
                        <div className="w-10 text-center">
                            <span className="text-white/50 text-xs font-bold">總計</span>
                        </div>
                        {sortedPlayers.map(p => {
                            const pts = totals[p.seat_position] || 0
                            return (
                                <div
                                    key={p.player_id}
                                    className="flex-1 text-center"
                                >
                                    <span className={`font-title text-2xl ${pts > 0 ? 'text-green' :
                                        pts < 0 ? 'text-red' :
                                            'text-white/50'
                                        }`}>
                                        {pts > 0 ? `+${pts}` : pts}
                                    </span>
                                </div>
                            )
                        })}
                        <div className="w-8"></div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ScoreTable
