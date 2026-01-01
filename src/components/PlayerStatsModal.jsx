import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X } from 'lucide-react'
import { getPlayerAvatar } from '../lib/avatar'
import { getFirstName } from '../lib/names'
import HexagonChart from './HexagonChart'

// Pattern name translations
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
    yao_jiu: '幺九',
    hai_di_lao_yue: '海底撈月'
}

const PlayerStatsModal = ({ isOpen, onClose, playerId }) => {
    const [player, setPlayer] = useState(null)
    const [stats, setStats] = useState(null)
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
            .single()

        setPlayer(playerData)
        setStats(statsData)
        setLoading(false)
    }

    // Calculate Hexagon values (0-100 scale)
    const calculateHexagonData = () => {
        if (!stats) return [0, 0, 0, 0, 0, 0]

        const rounds = stats.total_games || 1
        const wins = stats.total_wins || 1

        // Speed: Win Rate (35% = 100%)
        const winRate = ((stats.total_wins || 0) / rounds) * 100
        const speed = Math.min(100, (winRate / 35) * 100)

        // Attack: Avg Fan (8 fan = 100%)
        const avgFan = (stats.total_fan_value || 0) / wins
        const attack = Math.min(100, (avgFan / 8) * 100)

        // Defense: Deal-in Avoidance (0% = 100%, 20% = 0%)
        const dealInRate = ((stats.total_deal_ins || 0) / rounds) * 100
        const defense = Math.max(0, 100 - (dealInRate / 40) * 100)

        // Luck: Zimo Rate (70% = 100%)
        const zimoRate = ((stats.total_zimo || 0) / wins) * 100
        const luck = Math.min(100, (zimoRate / 70) * 100)

        // Magic: Pattern diversity & special hands
        // Base: Limit hands contribute 50%, patterns contribute other 50%
        const limitRate = ((stats.total_limit_hands || 0) / wins) * 100
        const limitScore = Math.min(50, (limitRate / 15) * 50)

        // Pattern score: weight different patterns
        const patternWeights = {
            shi_san_yao: 5, jiu_lian_bao_deng: 5, da_si_xi: 5, da_san_yuan: 5, zi_yi_se: 4, kan_kan_hu: 4, // Limit hands
            qing_yi_se: 3, xiao_san_yuan: 3, // High value
            hun_yi_se: 2, dui_dui_hu: 2, hua_hu: 2, // Medium value
            ping_hu: 1, wu_hua: 1, fan_zi: 1, qiang_gang: 2, gang_shang_hua: 2, hai_di_lao_yue: 2 // Others
        }
        let patternScore = 0
        if (stats.hand_pattern_counts) {
            Object.entries(stats.hand_pattern_counts).forEach(([pattern, count]) => {
                patternScore += (patternWeights[pattern] || 1) * count
            })
        }
        // Cap pattern score contribution at 50, scale so 25 points = 50%
        const patternContribution = Math.min(50, (patternScore / 25) * 50)
        const magic = Math.min(100, limitScore + patternContribution)

        // Sanity: Bao Avoidance (0% = 100%, 10% = 0%)
        const baoRate = ((stats.total_bao || 0) / rounds) * 100
        const sanity = Math.max(0, 100 - (baoRate / 10) * 100)

        return [speed, attack, defense, luck, magic, sanity]
    }

    if (!isOpen) return null

    const hexData = calculateHexagonData()
    const netPoints = (stats?.total_points_won || 0) - (stats?.total_points_lost || 0)

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
                                    const winRate = games > 0 ? ((wins / games) * 100).toFixed(1) : '0.0'
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
                                            .slice(0, 8) // Show top 8 patterns
                                            .map(([patternId, count]) => (
                                                <div
                                                    key={patternId}
                                                    className="flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-gray-300"
                                                >
                                                    <span className="font-bold text-xs">{PATTERN_NAMES[patternId] || patternId}</span>
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
