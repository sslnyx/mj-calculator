import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Trophy, TrendingUp, Zap, Star } from 'lucide-react'
import { getPlayerAvatar } from '../lib/avatar'
import { getFirstName } from '../lib/names'
import PlayerStatsModal from '../components/PlayerStatsModal'

const RANKING_TABS = [
    { id: 'points', label: '積分', icon: Trophy },
    { id: 'winrate', label: '勝率', icon: TrendingUp },
    { id: 'avgfan', label: '平均番', icon: Zap },
    { id: 'lucky', label: '爆棚王', icon: Star }
]

// Special titles for #1 ranked players in each category
const RANK_TITLES = {
    points: { title: '積分王', emoji: '👑' },
    winrate: { title: '勝率王', emoji: '🏆' },
    avgfan: { title: '番數王', emoji: '🐉' },
    lucky: { title: '爆棚王', emoji: '🍀' }
}

const RankingsPage = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState('points')
    const [players, setPlayers] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedPlayerId, setSelectedPlayerId] = useState(null)

    useEffect(() => {
        fetchRankings()
    }, [activeTab])

    const fetchRankings = async () => {
        setLoading(true)

        // Fetch all players with stats
        const { data } = await supabase
            .from('player_stats')
            .select(`
                *,
                player:players (id, display_name, avatar_url, avatar_seed)
            `)

        if (!data) {
            setPlayers([])
            setLoading(false)
            return
        }

        // Test player IDs to exclude from rankings
        const TEST_PLAYER_IDS = [
            '11111111-1111-1111-1111-111111111111',
            '22222222-2222-2222-2222-222222222222',
            '33333333-3333-3333-3333-333333333333',
            '14fa428d-5e21-4ffc-8dd2-dfbcb28994b4' // ning@iSquare
        ]

        // Filter out test players, admin, and those with low game counts for winrate
        const realPlayers = data.filter(s => {
            const isTest = TEST_PLAYER_IDS.includes(s.player_id)
            if (isTest) return false

            const games = s.total_games || 0
            if (activeTab === 'winrate' || activeTab === 'avgfan') {
                return games > 10
            }
            return games > 0
        })

        // Calculate derived values and sort
        const sorted = realPlayers
            .map(s => {
                const rounds = s.total_games || 0
                const wins = s.total_wins || 0
                const hasEnoughGames = rounds > 10
                return {
                    ...s,
                    netPoints: (s.total_points_won || 0) - (s.total_points_lost || 0),
                    winRate: hasEnoughGames ? ((s.total_wins || 0) / rounds * 100).toFixed(1) : null,
                    avgFan: hasEnoughGames && wins > 0 ? ((s.total_fan_value || 0) / wins).toFixed(1) : null,
                    limitCount: s.total_limit_hands || 0
                }
            })
            .sort((a, b) => {
                switch (activeTab) {
                    case 'points':
                        return b.netPoints - a.netPoints
                    case 'winrate':
                        return (parseFloat(b.winRate) || 0) - (parseFloat(a.winRate) || 0)
                    case 'avgfan':
                        return (parseFloat(b.avgFan) || 0) - (parseFloat(a.avgFan) || 0)
                    case 'lucky':
                        return b.limitCount - a.limitCount
                    default:
                        return 0
                }
            })

        // Assign ranks (same value = same rank)
        const withRanks = []
        for (let i = 0; i < sorted.length; i++) {
            const player = sorted[i]
            let rank = 1
            if (i > 0) {
                const prevPlayer = withRanks[i - 1] // Use already-ranked player
                const isTie = (() => {
                    switch (activeTab) {
                        case 'points':
                            return player.netPoints === prevPlayer.netPoints
                        case 'winrate':
                            return player.winRate === prevPlayer.winRate
                        case 'avgfan':
                            return player.avgFan === prevPlayer.avgFan
                        case 'lucky':
                            return player.limitCount === prevPlayer.limitCount
                        default:
                            return false
                    }
                })()
                rank = isTie ? prevPlayer.rank : i + 1
            }
            withRanks.push({ ...player, rank })
        }

        setPlayers(withRanks)
        setLoading(false)
    }

    const getRankValue = (player) => {
        switch (activeTab) {
            case 'points':
                return `${player.netPoints >= 0 ? '+' : ''}${player.netPoints}`
            case 'winrate':
                return player.winRate ? `${player.winRate}%` : '-'
            case 'avgfan':
                return player.avgFan ? `${player.avgFan} 番` : '-'
            case 'lucky':
                return `${player.limitCount} 次`
            default:
                return ''
        }
    }

    const getRankBgClass = (rank) => {
        if (rank === 1) return 'bg-yellow'
        if (rank === 2) return 'bg-gray-200'
        if (rank === 3) return 'bg-orange/50'
        return 'bg-white'
    }

    const getRankIcon = (rank) => {
        if (rank === 1) return '🥇'
        if (rank === 2) return '🥈'
        if (rank === 3) return '🥉'
        return null
    }

    return (
        <div className="h-[100svh] bg-gray-100 flex flex-col overflow-hidden pb-16">
            {/* Header */}
            <header className="bg-cyan border-b-[3px] border-black p-4 flex items-center gap-4 shrink-0">
                <button
                    className="bg-white border-comic-thin p-2 rounded-md cursor-pointer shadow-comic-sm hover:bg-gray-100"
                    onClick={onBack}
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="font-title text-2xl m-0">排行榜</h1>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 p-4 shrink-0 overflow-x-auto">
                {RANKING_TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`flex flex-col flex-1 items-center gap-1.5 py-2 px-4 rounded-md border-comic-thin font-bold text-sm cursor-pointer transition-all duration-150 whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-orange shadow-comic-sm'
                            : 'bg-white hover:bg-gray-100'
                            }`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <tab.icon size={16} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Rankings List - Scrollable */}
            <div className="flex-1 scroll-section px-4 pb-6">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="loading-spinner"></div>
                    </div>
                ) : players.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="font-body font-bold text-gray-500">暫無數據</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {players.map((player, index) => (
                            <div
                                key={player.player_id}
                                className={`flex items-center gap-3 p-3 rounded-lg border-comic-thin shadow-comic-sm cursor-pointer hover:scale-[1.02] transition-transform ${getRankBgClass(player.rank)}`}
                                onClick={() => setSelectedPlayerId(player.player_id)}
                            >
                                {/* Rank Number */}
                                <div className="w-8 h-8 flex items-center justify-center font-title text-lg shrink-0">
                                    {getRankIcon(player.rank) ? (
                                        <span className="text-2xl">{getRankIcon(player.rank)}</span>
                                    ) : (
                                        <span>{player.rank}</span>
                                    )}
                                </div>

                                {/* Player Info */}
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-full border-2 border-black overflow-hidden bg-gray-200 flex items-center justify-center text-sm font-bold shrink-0">
                                        <img
                                            src={getPlayerAvatar(player.player, 80)}
                                            alt=""
                                            className="w-full h-full object-cover"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold truncate">{getFirstName(player.player?.display_name) || 'Unknown'}</span>
                                        {player.rank === 1 && (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold bg-gradient-to-r from-orange to-pink px-2 py-0.5 rounded-full border border-black w-fit animate-pulse">
                                                <span>{RANK_TITLES[activeTab].emoji}</span>
                                                <span>{RANK_TITLES[activeTab].title}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Rank Value */}
                                <div className="font-title text-lg shrink-0">
                                    {getRankValue(player)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Player Stats Modal */}
            <PlayerStatsModal
                isOpen={!!selectedPlayerId}
                onClose={() => setSelectedPlayerId(null)}
                playerId={selectedPlayerId}
            />
        </div>
    )
}

export default RankingsPage
