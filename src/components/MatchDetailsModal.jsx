import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { getFirstName } from '../lib/names'
import { getPlayerAvatar } from '../lib/avatar'
import { calculateRoundChanges, calculateScoreTotals, getWinnerPoints } from '../lib/scoring'
import { getPatternName } from '../lib/patterns'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'

const MatchDetailsModal = ({ isOpen, onClose, match, currentPlayerId }) => {
    const [playerAvatars, setPlayerAvatars] = useState({}) // player_id -> avatar data
    const [fullRounds, setFullRounds] = useState([])
    const [loadingRounds, setLoadingRounds] = useState(false)

    // Fetch full match data when modal opens
    useEffect(() => {
        if (!isOpen || !match?.room?.id) return

        const fetchData = async () => {
            setLoadingRounds(true)

            // 1. Fetch ALL rounds for this room
            const { data: roundsData } = await supabase
                .from('game_rounds')
                .select(`
                    *,
                    winner:players!winner_id (id, display_name, avatar_url, avatar_seed),
                    loser:players!loser_id (id, display_name, avatar_url, avatar_seed)
                `)
                .eq('room_id', match.room.id)
                .order('created_at', { ascending: true })

            if (roundsData) {
                setFullRounds(roundsData)
            }

            // 2. Fetch player avatars for the participants
            if (match.finalScores) {
                const playerIds = Object.values(match.finalScores)
                    .map(data => data.player_id)
                    .filter(Boolean)

                if (playerIds.length > 0) {
                    const { data: avatarData } = await supabase
                        .from('players')
                        .select('id, avatar_url, avatar_seed')
                        .in('id', playerIds)

                    if (avatarData) {
                        const avatarMap = {}
                        avatarData.forEach(p => {
                            avatarMap[p.id] = { avatar_url: p.avatar_url, avatar_seed: p.avatar_seed, id: p.id }
                        })
                        setPlayerAvatars(avatarMap)
                    }
                }
            }

            setLoadingRounds(false)
        }

        fetchData()
    }, [isOpen, match?.room?.id, match?.finalScores])

    // Build player list from finalScores and FULL rounds (recalculate for SSO)
    const players = useMemo(() => {
        if (!match?.finalScores) return []

        // 1. Start with known seats and players from finalScores
        const seatMap = {}
        const occupiedSeats = new Set()
        const playerRecords = {} // seat_position -> { player_id, player_name }

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

        // 2. Augment map and records with missing players from rounds
        if (fullRounds.length > 0) {
            fullRounds.forEach(round => {
                [
                    { id: round.winner_id, info: round.winner },
                    { id: round.loser_id, info: round.loser }
                ].forEach(entry => {
                    const pid = entry.id
                    if (pid && !seatMap[pid]) {
                        // Find first available seat
                        const availableSeat = [1, 2, 3, 4].find(s => !occupiedSeats.has(s))
                        if (availableSeat) {
                            seatMap[pid] = availableSeat
                            occupiedSeats.add(availableSeat)
                            playerRecords[availableSeat] = {
                                player_id: pid,
                                player_name: entry.info?.display_name || '?'
                            }
                        }
                    }
                })
            })
        }

        // 3. Recalculate totals from rounds
        let totals = { 1: 0, 2: 0, 3: 0, 4: 0 }
        if (fullRounds.length > 0) {
            totals = calculateScoreTotals(fullRounds, seatMap)
        } else {
            // Use stored scores as temporary values
            Object.keys(playerRecords).forEach(seatNum => {
                totals[seatNum] = match.finalScores[`seat${seatNum}`]?.points || 0
            })
        }

        // 4. Return complete list of 4 players (using placeholders for empty seats)
        return [1, 2, 3, 4].map(seatNum => ({
            seat_position: seatNum,
            player_id: playerRecords[seatNum]?.player_id || null,
            player_name: playerRecords[seatNum]?.player_name || null,
            points: totals[seatNum] || 0
        }))
    }, [match, fullRounds])

    // Build player lookup for scoring
    const playerLookup = useMemo(() => {
        const lookup = {}
        players.forEach(p => {
            if (p.player_id) {
                lookup[p.player_id] = p.seat_position
            }
        })
        return lookup
    }, [players])

    // Calculate point changes for each round by seat
    const roundPointChanges = useMemo(() => {
        if (!fullRounds.length) return []

        return fullRounds.map(round => {
            const changes = calculateRoundChanges(round, playerLookup)
            return { roundId: round.id, changes, fanCount: round.fan_count, winType: round.win_type }
        })
    }, [fullRounds, playerLookup])

    if (!isOpen || !match) return null

    const { room, finalScores } = match
    const rounds = fullRounds

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
        return getWinnerPoints(round.points, round.win_type)
    }

    // Get player name by seat
    const getPlayerNameBySeat = (seat) => {
        const player = players.find(p => p.seat_position === seat)
        if (!player) return `P${seat}`
        const name = player.player_name || '?'
        const firstName = name.split(' ')[0]
        return firstName.length > 4 ? firstName.substring(0, 4) : firstName
    }

    // Sort rounds by time
    const sortedRounds = [...rounds].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

    return (
        <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
            onClick={onClose}
        >
            <div
                className="bg-orange w-full max-w-[400px] h-[calc(100svh-56px)] max-h-[600px] rounded-xl border-comic-thick flex flex-col shadow-comic-lg relative overflow-hidden"
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
                <div className="py-4 px-4 rounded-t-lg border-b-[3px] border-black shrink-0 bg-yellow">
                    <h2 className="font-title text-2xl text-center drop-shadow-md">
                        {room.room_code}
                    </h2>
                    <div className="text-center text-sm text-gray-700 mt-1">
                        {new Date(room.created_at).toLocaleDateString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                        {' · '}{loadingRounds ? '...' : rounds.length}局
                    </div>
                </div>

                {loadingRounds ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="loading-spinner"></div>
                    </div>
                ) : (
                    <>
                        {/* Swiper Content */}
                        <Swiper
                            modules={[Pagination]}
                            pagination={{ clickable: true }}
                            className="flex-1 w-full [&_.swiper-pagination]:absolute [&_.swiper-pagination]:!bottom-2 [&_.swiper-pagination]:z-10 [&_.swiper-pagination-bullet]:w-3 [&_.swiper-pagination-bullet]:h-3 [&_.swiper-pagination-bullet]:bg-white [&_.swiper-pagination-bullet]:border-2 [&_.swiper-pagination-bullet]:border-black [&_.swiper-pagination-bullet]:opacity-100 [&_.swiper-pagination-bullet]:mx-1.5 [&_.swiper-pagination-bullet-active]:!bg-cyan [&_.swiper-pagination-bullet-active]:scale-125 [&_.swiper-slide]:h-full [&_.swiper-wrapper]:items-stretch"
                            spaceBetween={0}
                            slidesPerView={1}
                        >
                            {/* Slide 1: Players Grid */}
                            <SwiperSlide className="h-full">
                                <section className="h-full p-4 pb-10 grid grid-cols-2 gap-3 content-start overflow-y-auto">
                                    {[1, 2, 3, 4].map(seat => {
                                        const playerData = players.find(p => p.seat_position === seat)
                                        const points = playerData?.points || 0
                                        const isHighest = playerData && players.every(p => points >= p.points)
                                        const isCurrentPlayer = playerData?.player_id === currentPlayerId

                                        return (
                                            <div
                                                key={seat}
                                                className={`rounded-xl border-comic-medium p-3 flex flex-col items-center justify-center text-center transition-all duration-200 ${playerData
                                                    ? isCurrentPlayer
                                                        ? 'bg-yellow shadow-comic-md'
                                                        : isHighest
                                                            ? 'bg-green/20 shadow-comic-md'
                                                            : 'bg-white shadow-comic-md'
                                                    : 'bg-gray-200/50 border-dashed'
                                                    }`}
                                            >
                                                {playerData ? (
                                                    <>
                                                        <div className="relative mb-2">
                                                            <img
                                                                src={getPlayerAvatar(playerAvatars[playerData.player_id] || { id: playerData.player_id }, 112)}
                                                                alt=""
                                                                className="w-14 h-14 rounded-full border-comic-medium shadow-comic-sm object-cover"
                                                                referrerPolicy="no-referrer"
                                                            />
                                                            {isHighest && (
                                                                <span className="absolute -top-1 -right-1 text-lg">👑</span>
                                                            )}
                                                        </div>
                                                        <div className="font-bold text-sm truncate w-full">
                                                            {getFirstName(playerData.player_name) || `P${seat}`}
                                                        </div>
                                                        <div className={`font-title text-xl ${points >= 0 ? 'text-green' : 'text-red'}`}>
                                                            {points >= 0 ? '+' : ''}{points}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-gray-500">
                                                        <div className="font-bold text-sm">Seat {seat}</div>
                                                        <div className="text-xs">Empty</div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </section>
                            </SwiperSlide>

                            {/* Slide 2: Score Table */}
                            <SwiperSlide className="h-full">
                                <section className="h-full flex flex-col p-4 pb-10">
                                    <div className="flex-1 flex flex-col min-h-0 bg-white border-comic-thin rounded-lg shadow-comic-sm overflow-hidden">
                                        {/* Header - Player Names */}
                                        <div className="shrink-0 bg-gradient-to-r from-purple-600 to-purple-500 px-2 py-2">
                                            <div className="flex items-center">
                                                <div className="w-8 text-center text-xs font-bold text-black">#</div>
                                                {players.map(p => (
                                                    <div key={p.seat_position} className="flex-1 text-center">
                                                        <span className="font-bold truncate text-black text-xs">
                                                            {getPlayerNameBySeat(p.seat_position)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Rows */}
                                        <div className="flex-1 overflow-y-auto">
                                            {rounds.length === 0 ? (
                                                <div className="flex items-center justify-center h-full text-gray-400 font-bold py-8">
                                                    <div className="text-center">
                                                        <div className="text-4xl mb-2">🀄</div>
                                                        <div>無記錄</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-gray-100">
                                                    {sortedRounds.map((round, index) => {
                                                        const roundData = roundPointChanges[index] || {}
                                                        const { changes, fanCount, winType } = roundData
                                                        const isEven = index % 2 === 0
                                                        return (
                                                            <div
                                                                key={round.id}
                                                                className={`flex items-center px-2 py-2 ${isEven ? 'bg-white' : 'bg-gray-50/50'}`}
                                                            >
                                                                {/* Round number */}
                                                                <div className="w-8 flex flex-col items-center">
                                                                    <span className="text-xs font-bold text-gray-400">{index + 1}</span>
                                                                    <span className={`text-[10px] font-bold px-1 rounded ${winType === 'eat' ? 'bg-pink/30 text-pink' : 'bg-yellow/50 text-orange'
                                                                        }`}>
                                                                        {fanCount}番
                                                                    </span>
                                                                </div>

                                                                {/* Point changes by seat */}
                                                                {players.map(p => {
                                                                    const pts = changes?.[p.seat_position] || 0
                                                                    const isWinner = pts > 0
                                                                    const isLoser = pts < 0
                                                                    return (
                                                                        <div key={p.seat_position} className="flex-1 text-center">
                                                                            <span className={`font-title text-sm inline-block min-w-[40px] py-0.5 rounded-md ${isWinner ? 'text-green-bold bg-green/10' :
                                                                                isLoser ? 'text-red-bold bg-red/10' :
                                                                                    'text-gray-300'
                                                                                }`}>
                                                                                {pts !== 0 ? (pts > 0 ? `+${pts}` : pts) : '·'}
                                                                            </span>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer - Totals */}
                                        {rounds.length > 0 && (
                                            <div className="shrink-0 bg-gradient-to-r from-gray-800 to-gray-700 px-2 py-2">
                                                <div className="flex items-center">
                                                    <div className="w-8 text-center">
                                                        <span className="text-white/50 text-[10px] font-bold">總計</span>
                                                    </div>
                                                    {players.map(p => (
                                                        <div key={p.seat_position} className="flex-1 text-center">
                                                            <span className={`font-title text-lg ${p.points > 0 ? 'text-green' :
                                                                p.points < 0 ? 'text-red' :
                                                                    'text-white/50'
                                                                }`}>
                                                                {p.points > 0 ? `+${p.points}` : p.points}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </SwiperSlide>

                            {/* Slide 3: Round Details */}
                            <SwiperSlide>
                                <section className="h-full flex flex-col p-4 pb-10">
                                    <h3 className="font-title text-lg mb-2 shrink-0 text-center">📜 對局詳情</h3>
                                    <div className="flex-1 overflow-auto scroll-section bg-white rounded-lg border-comic-thin">
                                        <div className="flex flex-col gap-2 p-2">
                                            {sortedRounds.map((round, index) => {
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
                                </section>
                            </SwiperSlide>
                        </Swiper>
                    </>
                )}

                {/* Close Button */}
                <button
                    className="m-4 py-3 bg-cyan border-comic-medium rounded-lg font-title text-lg shadow-comic-sm cursor-pointer shrink-0"
                    onClick={onClose}
                >
                    關閉
                </button>
            </div>
        </div>
    )
}

export default MatchDetailsModal
