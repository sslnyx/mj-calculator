import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useGameRoom } from '../contexts/GameRoomContext'
import { Trash2 } from 'lucide-react'

// ScoreTable uses GameRoomContext for rounds and scoreTotals (single source of truth)
const ScoreTable = ({ onUpdate }) => {
    const { room, rounds, players, scoreTotals } = useGameRoom()
    const [deleting, setDeleting] = useState(null)

    // Build player lookup for seat position
    const playerLookup = useMemo(() => {
        const lookup = {}
        players.forEach(p => {
            lookup[p.player_id] = p.seat_position
        })
        return lookup
    }, [players])

    // Check if loading
    const loading = !room

    // Get player name by ID (first name only, max 6 chars)
    const getPlayerName = (playerId) => {
        const player = players.find(p => p.player_id === playerId)
        const name = player?.player?.display_name || '?'
        const firstName = name.split(' ')[0]
        return firstName.length > 6 ? firstName.substring(0, 6) : firstName
    }

    // Get seat position for a player
    const getSeatForPlayer = (playerId) => {
        return playerLookup[playerId]
    }

    // Calculate point changes for each round BY SEAT POSITION
    const roundPointChanges = useMemo(() => {
        return rounds.map(round => {
            const basePoints = round.points
            const isZimo = round.win_type === 'zimo' || round.win_type === 'zimo_bao'
            const winnerId = round.winner_id
            const loserId = round.loser_id

            const changes = { 1: 0, 2: 0, 3: 0, 4: 0 }

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
                    [1, 2, 3, 4].forEach(seat => {
                        if (seat !== winnerSeat) {
                            changes[seat] = -halfPoints
                        }
                    })
                }
            } else {
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
                            const pts = scoreTotals[p.seat_position] || 0
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
