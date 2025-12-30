import { ArrowLeft, Info } from 'lucide-react'

// Complete hand patterns data with descriptions
const PATTERNS_DATA = {
    // Standalone hands
    regular: [
        { id: 'da_san_yuan', name: '大三元', fan: 8, desc: '三種三元牌（中/發/白）都是刻子' },
        { id: 'qing_yi_se', name: '清一色', fan: 7, desc: '只有一種數牌，沒有字牌' },
        { id: 'xiao_san_yuan', name: '小三元', fan: 5, desc: '兩組三元牌刻子，第三種三元牌做對子' },
        { id: 'hua_yao_jiu', name: '花么九', fan: 4, desc: '全部刻子都是么九牌（1或9）加字牌' },
        { id: 'hun_yi_se', name: '混一色', fan: 3, desc: '只有一種數牌（萬/筒/條）加字牌' },
        { id: 'dui_dui_hu', name: '對對糊', fan: 3, desc: '四組刻子加一對眼，沒有順子' },
    ],
    // Limit hands (13番)
    limit: [
        { id: 'tian_hu', name: '天胡', fan: 13, desc: '莊家起手14張牌直接胡', hasBao: false },
        { id: 'di_hu', name: '地胡', fan: 13, desc: '閒家在莊家打出第一張牌時胡牌', hasBao: false },
        { id: 'shi_san_yao', name: '十三幺', fan: 13, desc: '一筒一索一萬加七種字牌，外加其中一張做對子', hasBao: false },
        { id: 'jiu_lian_bao_deng', name: '九蓮寶燈', fan: 13, desc: '同一門1112345678999，加任意同門牌', hasBao: false },
        { id: 'da_si_xi', name: '大四喜', fan: 13, desc: '四種風牌（東南西北）都是刻子', hasBao: true },
        { id: 'xiao_si_xi', name: '小四喜', fan: 13, desc: '三組風牌刻子，第四種風牌做對子', hasBao: true },
        { id: 'zi_yi_se', name: '字一色', fan: 13, desc: '全部由字牌（風牌和三元牌）組成', hasBao: true },
        { id: 'qing_yao_jiu', name: '清么九', fan: 13, desc: '全部由么九牌（1和9）組成，沒有字牌', hasBao: false },
        { id: 'kan_kan_hu', name: '坎坎胡', fan: 13, desc: '對對糊且全部刻子都是暗刻（自摸）', hasBao: false },
        { id: 'shi_ba_luo_han', name: '十八羅漢', fan: 13, desc: '開四次槓（18張牌）', hasBao: false },
        { id: 'ba_xian_guo_hai', name: '八仙過海', fan: 13, desc: '收齊全部八張花牌，即時胡牌', hasBao: false },
    ],
    // Bonus add-ons (stackable with other hands)
    bonus: [
        { id: 'hua_hu', name: '花糊', fan: 3, desc: '收到七張花牌' },
        { id: 'yi_tai_hua', name: '一臺花', fan: 2, desc: '收齊四張同系列花牌（春夏秋冬或梅蘭竹菊）' },
        { id: 'gang_shang_hua', name: '槓上開花', fan: 2, desc: '開槓後摸的補牌正好胡牌' },
        { id: 'ping_hu', name: '平糊', fan: 1, desc: '全靠順子組成，無刻子，對子不能是龍' },
        { id: 'men_qian_qing', name: '門前清', fan: 1, desc: '沒有碰/槓其他人的牌，全部靠自己摸' },
        { id: 'zheng_hua', name: '正花', fan: 1, desc: '收到與自己座位對應的花牌（最多2個）' },
        { id: 'wu_hua', name: '無花', fan: 1, desc: '全局沒有收到任何花牌' },
        { id: 'fan_zi', name: '番子', fan: 1, desc: '有三元牌或風牌的刻子（東/南/西/北/中/發/白）' },
        { id: 'qiang_gang', name: '搶槓', fan: 1, desc: '別人加槓時，截糊該張牌' },
        { id: 'hai_di_lao_yue', name: '海底撈月', fan: 1, desc: '摸最後一張牌胡牌' },
    ]
}

const PatternsPage = ({ onBack }) => {
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
                <h1 className="font-title text-2xl m-0 flex-1">🀄 牌型一覽</h1>
            </header>

            {/* Content */}
            <div className="flex-1 scroll-section p-4">
                {/* Regular Hands */}
                <section className="mb-6">
                    <h2 className="font-title text-xl mb-3 flex items-center gap-2">
                        <span className="bg-yellow px-3 py-1 rounded border-2 border-black">常規牌型</span>
                    </h2>
                    <div className="flex flex-col gap-2">
                        {PATTERNS_DATA.regular.map(pattern => (
                            <div
                                key={pattern.id}
                                className="bg-white border-comic-thin rounded-lg p-3 shadow-comic-sm"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-title text-lg">{pattern.name}</span>
                                    <span className="bg-orange text-black text-sm font-bold px-2 py-0.5 rounded border border-black">
                                        +{pattern.fan}番
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600">{pattern.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Limit Hands */}
                <section className="mb-6">
                    <h2 className="font-title text-xl mb-3 flex items-center gap-2">
                        <span className="bg-pink px-3 py-1 rounded border-2 border-black">爆棚牌型</span>
                        <span className="text-sm font-body text-gray-500">(13番)</span>
                    </h2>
                    <div className="flex flex-col gap-2">
                        {PATTERNS_DATA.limit.map(pattern => (
                            <div
                                key={pattern.id}
                                className="bg-white border-comic-thin rounded-lg p-3 shadow-comic-sm relative"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-title text-lg">{pattern.name}</span>
                                    {pattern.hasBao && (
                                        <span className="bg-red text-white text-xs font-bold px-2 py-0.5 rounded border border-black">
                                            可包
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600">{pattern.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Bonus Add-ons */}
                <section className="mb-6">
                    <h2 className="font-title text-xl mb-3 flex items-center gap-2">
                        <span className="bg-green px-3 py-1 rounded border-2 border-black">附加番</span>
                        <span className="text-sm font-body text-gray-500">(可疊加)</span>
                    </h2>
                    <div className="flex flex-col gap-2">
                        {PATTERNS_DATA.bonus.map(pattern => (
                            <div
                                key={pattern.id}
                                className="bg-white border-comic-thin rounded-lg p-3 shadow-comic-sm"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-title text-lg">{pattern.name}</span>
                                    <span className="bg-cyan text-black text-sm font-bold px-2 py-0.5 rounded border border-black">
                                        +{pattern.fan}番
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600">{pattern.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Footer Note */}
                <div className="bg-gray-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">
                        <Info size={12} className="inline mr-1" />
                        基於香港麻將規則，實際番數可能因地區/牌局而異
                    </p>
                </div>
            </div>
        </div>
    )
}

export default PatternsPage

