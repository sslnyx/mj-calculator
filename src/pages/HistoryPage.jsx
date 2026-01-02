import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Clock, Eye } from 'lucide-react'
import { getPlayerAvatar } from '../lib/avatar'
import { getFirstName } from '../lib/names'
import MatchDetailsModal from '../components/MatchDetailsModal'
import { calculateRoundChanges } from '../lib/scoring'

const HistoryPage = ({ onBack }) => {
    const { player } = useAuth()
    const [matches, setMatches] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [selectedMatch, setSelectedMatch] = useState(null)
    const [myGamesOnly, setMyGamesOnly] = useState(true) // Filter: show only my games by default

    const fetchHistory = async (showRefresh = false) => {
        if (!player) return
        if (showRefresh) setRefreshing(true)
        else setLoading(true)

        try {
            let rounds = []

            if (myGamesOnly) {
                // ROOM-FIRST STRATEGY: 
                // 1. Find the most recent rooms where the player was winner or loser
                const { data: myRecentRounds } = await supabase
                    .from('game_rounds')
                    .select('room_id')
                    .or(`winner_id.eq.${player.id},loser_id.eq.${player.id}`)
                    .order('created_at', { ascending: false })
                    .limit(300)

                if (myRecentRounds && myRecentRounds.length > 0) {
                    // Extract unique room IDs
                    const roomIds = [...new Set(myRecentRounds.map(r => r.room_id))].slice(0, 50)

                    // 2. Fetch ALL rounds for these specific rooms to ensure zero-sum accuracy
                    const { data: fullMatchRounds, error } = await supabase
                        .from('game_rounds')
                        .select(`
                            *,
                            room:game_rooms (id, room_code, status, created_at, ended_at, final_scores),
                            winner:players!winner_id (id, display_name, avatar_url, avatar_seed),
                            loser:players!loser_id (id, display_name, avatar_url, avatar_seed)
                        `)
                        .in('room_id', roomIds)
                        .order('created_at', { ascending: false })

                    if (!error) rounds = fullMatchRounds
                }
            } else {
                // GLOBAL LOGIC: Just fetch the latest rounds across the server
                const { data: globalRounds, error } = await supabase
                    .from('game_rounds')
                    .select(`
                        *,
                        room:game_rooms (id, room_code, status, created_at, ended_at, final_scores),
                        winner:players!winner_id (id, display_name, avatar_url, avatar_seed),
                        loser:players!loser_id (id, display_name, avatar_url, avatar_seed)
                    `)
                    .order('created_at', { ascending: false })
                    .limit(300)

                if (!error) rounds = globalRounds
            }

            if (rounds.length > 0) {
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
                            finalScores: round.room?.final_scores || null,
                            hasPlayer: false
                        })
                    }

                    const roomData = roomMap.get(roomId)
                    roomData.rounds.push(round)

                    // Initial participation check
                    if (round.winner_id === player.id || round.loser_id === player.id) {
                        roomData.hasPlayer = true
                    }
                    if (round.winner_id === player.id) {
                        roomData.playerWins++
                    }
                })

                // Get player points by recalculating all rounds from SSO
                roomMap.forEach(roomData => {
                    const seatMap = {}
                    const occupiedSeats = new Set()
                    if (roomData.finalScores) {
                        Object.entries(roomData.finalScores).forEach(([seat, data]) => {
                            const seatNum = parseInt(seat.replace('seat', ''))
                            if (data.player_id) {
                                seatMap[data.player_id] = seatNum
                                occupiedSeats.add(seatNum)
                            }
                        })
                    }

                    roomData.rounds.forEach(round => {
                        [round.winner_id, round.loser_id].forEach(pid => {
                            if (pid && !seatMap[pid]) {
                                const availableSeat = [1, 2, 3, 4].find(s => !occupiedSeats.has(s))
                                if (availableSeat) {
                                    seatMap[pid] = availableSeat
                                    occupiedSeats.add(availableSeat)
                                }
                            }
                        })
                    })

                    let points = 0
                    roomData.rounds.forEach(round => {
                        const changes = calculateRoundChanges(round, seatMap)
                        const seat = seatMap[player.id]
                        if (seat) {
                            points += changes[seat] || 0
                            roomData.hasPlayer = true
                        }
                    })
                    roomData.playerPoints = points
                })

                let matchList = Array.from(roomMap.values())
                    .sort((a, b) => new Date(b.room.created_at) - new Date(a.room.created_at))

                if (myGamesOnly) {
                    matchList = matchList.filter(m => m.hasPlayer)
                }

                setMatches(matchList)
            } else {
                setMatches([])
            }
        } catch (error) {
            console.error('Error fetching history:', error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchHistory()
    }, [player, myGamesOnly]) // Re-fetch when filter changes

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
                <p className="font-body font-bold mt-4">載入中...</p>
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

            {/* Filter Toggle */}
            <div className="p-3 bg-white border-b-2 border-black shrink-0">
                <div className="flex gap-2">
                    <button
                        className={`flex-1 py-2 rounded-md font-bold text-sm border-comic-thin transition-all ${!myGamesOnly ? 'bg-purple text-white' : 'bg-white hover:bg-gray-100'}`}
                        onClick={() => setMyGamesOnly(false)}
                    >
                        全部對局
                    </button>
                    <button
                        className={`flex-1 py-2 rounded-md font-bold text-sm border-comic-thin transition-all ${myGamesOnly ? 'bg-purple text-white' : 'bg-white hover:bg-gray-100'}`}
                        onClick={() => setMyGamesOnly(true)}
                    >
                        我的對局
                    </button>
                </div>
            </div>

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
                                            {match.room.room_code}
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
                                            {(() => {
                                                // 1. Build seat map and records from known final_scores
                                                const seatMap = {}
                                                const occupiedSeats = new Set()
                                                const playerRecords = {} // seatNum -> { player_id, player_name }

                                                if (match.finalScores) {
                                                    Object.entries(match.finalScores).forEach(([seat, data]) => {
                                                        const seatNum = parseInt(seat.replace('seat', ''))
                                                        if (data.player_id) {
                                                            seatMap[data.player_id] = seatNum
                                                            occupiedSeats.add(seatNum)
                                                            playerRecords[seatNum] = {
                                                                player_id: data.player_id,
                                                                player_name: data.player_name
                                                            }
                                                        }
                                                    })
                                                }

                                                // 2. Augment map and records with missing players from rounds
                                                match.rounds.forEach(round => {
                                                    [
                                                        { id: round.winner_id, info: round.winner },
                                                        { id: round.loser_id, info: round.loser }
                                                    ].forEach(entry => {
                                                        if (entry.id && !seatMap[entry.id]) {
                                                            const availableSeat = [1, 2, 3, 4].find(s => !occupiedSeats.has(s))
                                                            if (availableSeat) {
                                                                seatMap[entry.id] = availableSeat
                                                                occupiedSeats.add(availableSeat)
                                                                playerRecords[availableSeat] = {
                                                                    player_id: entry.id,
                                                                    player_name: entry.info?.display_name || '?'
                                                                }
                                                            }
                                                        }
                                                    })
                                                })

                                                // 3. Recalculate totals for all seats from rounds
                                                const totals = { 1: 0, 2: 0, 3: 0, 4: 0 }
                                                match.rounds.forEach(round => {
                                                    const changes = calculateRoundChanges(round, seatMap)
                                                    Object.keys(changes).forEach(s => {
                                                        totals[s] += changes[s] || 0
                                                    })
                                                })

                                                // 4. Return complete list for display
                                                return [1, 2, 3, 4].map(seatNum => ({
                                                    seat: `seat${seatNum}`,
                                                    ...playerRecords[seatNum],
                                                    points: totals[seatNum] || 0
                                                }))
                                                    .filter(p => p.player_id) // Only show seats that actually had a player
                                                    .sort((a, b) => b.points - a.points)
                                            })().map((data, idx) => (
                                                <div
                                                    key={data.seat}
                                                    className={`text-center p-2 rounded-lg border-2 ${data.player_id === player.id
                                                        ? 'bg-yellow border-black'
                                                        : idx === 0
                                                            ? 'bg-orange/20 border-orange'
                                                            : 'bg-gray-100 border-gray-300'
                                                        }`}
                                                >
                                                    <div className="text-xs font-bold text-gray-700 truncate">
                                                        {getFirstName(data.player_name) || `P${data.seat.slice(-1)}`}
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

                                {/* Quick Actions */}
                                {match.rounds.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-gray-500">
                                                共 <span className="font-bold">{match.rounds.length}</span> 局
                                                {match.hasPlayer && (
                                                    <span className="ml-2 text-xs bg-cyan/30 px-2 py-0.5 rounded">你有參與</span>
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
