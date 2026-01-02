import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X } from 'lucide-react'
import { getPlayerAvatar } from '../lib/avatar'
import { getFirstName } from '../lib/names'
import { getPatternName } from '../lib/patterns'
import { calculateHexagonData, getNetPoints, hasEnoughGames } from '../lib/stats'
import HexagonChart from './HexagonChart'

const PlayerStatsModal = ({ isOpen, onClose, playerId }) => {
    const [player, setPlayer] = useState(null)
    const [stats, setStats] = useState(null)
    const [limitRounds, setLimitRounds] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (isOpen && playerId) {
            fetchPlayerData()
        }
    }, [isOpen, playerId])

    const fetchPlayerData = async () => {
        setLoading(true)

        // Fetch player info
        const { data: playerData } = await supabase
            .from('players')
            .select('id, display_name, avatar_url, avatar_seed')
            .eq('id', playerId)
            .single()

        // Fetch player stats
        const { data: statsData } = await supabase
            .from('player_stats')
            .select('*')
            .eq('player_id', playerId)
            .maybeSingle()

        // Fetch limit hand rounds (fan_count >= 10)
        const { data: limitData } = await supabase
            .from('game_rounds')
            .select('id, fan_count, hand_patterns, win_type, points, created_at')
            .eq('winner_id', playerId)
            .gte('fan_count', 10)
            .order('created_at', { ascending: false })

        setPlayer(playerData)
        setStats(statsData)
        setLimitRounds(limitData || [])
        setLoading(false)
    }

    if (!isOpen) return null

    const hexData = calculateHexagonData(stats)
    const netPoints = getNetPoints(stats)

    return (
        <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-[380px] max-h-[85vh] rounded-2xl border-4 border-black flex flex-col relative overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-100 border-2 border-black rounded-full cursor-pointer hover:bg-red hover:text-white z-10"
                    onClick={onClose}
                >
                    <X size={18} />
                </button>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="loading-spinner"></div>
                    </div>
                ) : !player ? (
                    <div className="flex items-center justify-center py-20">
                        <p className="font-body font-bold text-gray-500">搵唔到玩家</p>
                    </div>
                ) : (
                    <div className="flex-1 scroll-section p-5">
                        {/* Player Info */}
                        <section className="text-center mb-4">
                            <div className="w-20 h-20 rounded-full border-comic-thick shadow-comic-md overflow-hidden bg-white flex items-center justify-center mx-auto mb-3">
                                <img
                                    src={getPlayerAvatar(player, 160)}
                                    alt={player.display_name}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                            <h2 className="font-title text-xl m-0 mb-2">{getFirstName(player.display_name)}</h2>
                            <div className={`inline-block font-title text-lg py-1 px-4 rounded-md border-comic-medium shadow-comic-sm ${netPoints >= 0 ? 'bg-green text-black' : 'bg-red text-white'
                                }`}>
                                {netPoints >= 0 ? '+' : ''}{netPoints} 分
                            </div>
                        </section>

                        {/* Hexagon Chart */}
                        <section className="mb-4">
                            <div className="flex justify-center">
                                <HexagonChart
                                    data={hexData}
                                    labels={['速度', '攻擊', '防守', '運氣', '魔法', '心態']}
                                    size={180}
                                />
                            </div>
                        </section>

                        {/* Stats Grid */}
                        <section className="mb-4">
                            <div className="grid grid-cols-3 gap-2">
                                {(() => {
                                    const games = stats?.total_games || 0
                                    const wins = stats?.total_wins || 0
                                    const winRate = hasEnoughGames(stats) ? ((wins / games) * 100).toFixed(1) : '-'
                                    return [
                                        { value: games, label: '總局數' },
                                        { value: wins, label: '勝利' },
                                        { value: stats?.total_zimo || 0, label: '自摸' },
                                        { value: `${winRate}%`, label: '勝率' },
                                        { value: stats?.total_deal_ins || 0, label: '放銃' },
                                        { value: stats?.total_bao || 0, label: '包牌' },
                                    ]
                                })().map((stat, i) => (
                                    <div
                                        key={i}
                                        className={`bg-gray-50 border-comic-thin rounded-lg p-2 text-center shadow-comic-sm ${i % 2 === 0 ? '-rotate-1' : 'rotate-1'
                                            }`}
                                    >
                                        <span className="block font-title text-lg">{stat.value}</span>
                                        <span className="block text-[10px] font-bold text-gray-500 uppercase">{stat.label}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Limit Hands Section */}
                        {limitRounds.length > 0 && (
                            <section className="mb-4">
                                <h3 className="font-title text-sm mb-2 flex items-center gap-1">
                                    <span>🏆</span> 爆棚紀錄
                                    <span className="bg-red text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                                        {limitRounds.length}
                                    </span>
                                </h3>
                                <div className="bg-gradient-to-r from-red/10 to-orange/10 border-comic-thin rounded-lg p-3">
                                    <div className="flex flex-col gap-2">
                                        {limitRounds.map((round, idx) => (
                                            <div
                                                key={round.id}
                                                className="flex items-center gap-2 bg-white p-2 rounded-lg border border-red/20"
                                            >
                                                <span className="bg-red text-white text-xs font-bold px-2 py-1 rounded shrink-0">
                                                    {round.fan_count}番
                                                </span>
                                                <div className="flex flex-wrap gap-1">
                                                    {(round.hand_patterns || []).map((patternId, i) => (
                                                        <span
                                                            key={i}
                                                            className="text-xs font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded"
                                                        >
                                                            {getPatternName(patternId)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Hand Pattern Records */}
                        {stats?.hand_pattern_counts && Object.keys(stats.hand_pattern_counts).length > 0 && (
                            <section>
                                <h3 className="font-title text-sm mb-2 flex items-center gap-1">
                                    <span>🀄</span> 常用牌型
                                </h3>
                                <div className="bg-gray-50 border-comic-thin rounded-lg p-3">
                                    <div className="flex flex-wrap gap-1.5">
                                        {Object.entries(stats.hand_pattern_counts)
                                            .sort((a, b) => b[1] - a[1])
                                            .map(([patternId, count]) => (
                                                <div
                                                    key={patternId}
                                                    className="flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-gray-300"
                                                >
                                                    <span className="font-bold text-xs">{getPatternName(patternId)}</span>
                                                    <span className="bg-orange text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default PlayerStatsModal
