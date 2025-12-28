import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Trophy, TrendingUp, Zap, Star } from 'lucide-react'

const RANKING_TABS = [
    { id: 'points', label: '積分', icon: Trophy },
    { id: 'winrate', label: '勝率', icon: TrendingUp },
    { id: 'avgfan', label: '平均番', icon: Zap },
    { id: 'lucky', label: '爆棚王', icon: Star }
]

const RankingsPage = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState('points')
    const [players, setPlayers] = useState([])
    const [loading, setLoading] = useState(true)

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
                player:players (id, display_name, avatar_url)
            `)

        if (!data) {
            setPlayers([])
            setLoading(false)
            return
        }

        // Calculate derived values and sort
        const sorted = data
            .map(s => {
                const rounds = s.total_rounds_played || 1
                const wins = s.total_wins || 1
                return {
                    ...s,
                    netPoints: (s.total_points_won || 0) - (s.total_points_lost || 0),
                    winRate: rounds > 0 ? ((s.total_wins || 0) / rounds * 100).toFixed(1) : 0,
                    avgFan: wins > 0 ? ((s.total_fan_value || 0) / wins).toFixed(1) : 0,
                    limitCount: s.total_limit_hands || 0
                }
            })
            .sort((a, b) => {
                switch (activeTab) {
                    case 'points':
                        return b.netPoints - a.netPoints
                    case 'winrate':
                        return parseFloat(b.winRate) - parseFloat(a.winRate)
                    case 'avgfan':
                        return parseFloat(b.avgFan) - parseFloat(a.avgFan)
                    case 'lucky':
                        return b.limitCount - a.limitCount
                    default:
                        return 0
                }
            })

        setPlayers(sorted)
        setLoading(false)
    }

    const getRankValue = (player) => {
        switch (activeTab) {
            case 'points':
                return `${player.netPoints >= 0 ? '+' : ''}${player.netPoints}`
            case 'winrate':
                return `${player.winRate}%`
            case 'avgfan':
                return `${player.avgFan} 番`
            case 'lucky':
                return `${player.limitCount} 次`
            default:
                return ''
        }
    }

    const getRankClass = (index) => {
        if (index === 0) return 'gold'
        if (index === 1) return 'silver'
        if (index === 2) return 'bronze'
        return ''
    }

    return (
        <div className="rankings-page">
            {/* Header */}
            <header className="rankings-header">
                <button className="back-btn" onClick={onBack}>
                    <ArrowLeft size={24} />
                </button>
                <h1>排行榜</h1>
            </header>

            {/* Tabs */}
            <div className="rankings-tabs">
                {RANKING_TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`ranking-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <tab.icon size={16} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Rankings List */}
            <div className="rankings-list">
                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                    </div>
                ) : players.length === 0 ? (
                    <div className="empty-state">
                        <p>暫無數據</p>
                    </div>
                ) : (
                    players.map((player, index) => (
                        <div key={player.player_id} className={`ranking-row ${getRankClass(index)}`}>
                            <div className="rank-number">
                                {index < 3 ? (
                                    <span className="rank-medal">{['🥇', '🥈', '🥉'][index]}</span>
                                ) : (
                                    <span>{index + 1}</span>
                                )}
                            </div>
                            <div className="rank-player">
                                <div className="rank-avatar">
                                    {player.player?.avatar_url ? (
                                        <img src={player.player.avatar_url} alt="" />
                                    ) : (
                                        player.player?.display_name?.charAt(0) || '?'
                                    )}
                                </div>
                                <span className="rank-name">{player.player?.display_name || 'Unknown'}</span>
                            </div>
                            <div className="rank-value">
                                {getRankValue(player)}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default RankingsPage
