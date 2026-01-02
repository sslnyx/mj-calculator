/**
 * Centralized hand pattern definitions for Mahjong scoring
 * Used across HuModal, GameLog, MatchDetailsModal, PatternsPage, etc.
 */

// Extended Fan options (0-13)
export const FAN_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

// Hand patterns with their default fan values
// hasBao: true = this hand CAN trigger 包 (bao) responsibility
export const HAND_PATTERNS = {
    // Regular Hands (standalone patterns)
    regular: [
        { id: 'da_san_yuan', name: '大三元', fan: 8 },
        { id: 'qing_yi_se', name: '清一色', fan: 7 },
        { id: 'xiao_san_yuan', name: '小三元', fan: 5 },
        { id: 'hua_yao_jiu', name: '花么九', fan: 4 },
        { id: 'hun_yi_se', name: '混一色', fan: 3 },
        { id: 'dui_dui_hu', name: '對對糊', fan: 3 },
    ],
    // Limit Hands - hasBao indicates if 包 can apply
    limit: [
        { id: 'tian_hu', name: '天胡', fan: 13, isLimit: true, hasBao: false },
        { id: 'di_hu', name: '地胡', fan: 13, isLimit: true, hasBao: false },
        { id: 'shi_san_yao', name: '十三幺', fan: 13, isLimit: true, hasBao: false },
        { id: 'jiu_lian_bao_deng', name: '九蓮寶燈', fan: 13, isLimit: true, hasBao: false },
        { id: 'da_si_xi', name: '大四喜', fan: 13, isLimit: true, hasBao: true },
        { id: 'xiao_si_xi', name: '小四喜', fan: 13, isLimit: true, hasBao: true },
        { id: 'zi_yi_se', name: '字一色', fan: 13, isLimit: true, hasBao: true },
        { id: 'qing_yao_jiu', name: '清么九', fan: 13, isLimit: true, hasBao: false },
        { id: 'kan_kan_hu', name: '坎坎胡', fan: 13, isLimit: true, hasBao: false },
        { id: 'shi_ba_luo_han', name: '十八羅漢', fan: 13, isLimit: true, hasBao: false },
        { id: 'ba_xian_guo_hai', name: '八仙過海', fan: 13, isLimit: true, hasBao: false },
    ],
    // Bonus conditions (add-ons that stack with other hands)
    bonus: [
        { id: 'hua_hu', name: '花糊', fan: 3 },
        { id: 'yi_tai_hua', name: '一臺花', fan: 2 },
        { id: 'gang_shang_hua', name: '槓上開花', fan: 2 },
        { id: 'ping_hu', name: '平糊', fan: 1 },
        { id: 'men_qian_qing', name: '門前清', fan: 1 },
        { id: 'zheng_hua', name: '正花', fan: 1 },
        { id: 'wu_hua', name: '無花', fan: 1 },
        { id: 'fan_zi', name: '番子', fan: 1 },
        { id: 'qiang_gang', name: '搶槓', fan: 1 },
        { id: 'yao_jiu', name: '幺九', fan: 1 },
        { id: 'hai_di_lao_yue', name: '海底撈月', fan: 1 },
    ]
}

// Helper: Get all patterns flattened
export const getAllPatterns = () => [
    ...HAND_PATTERNS.regular,
    ...HAND_PATTERNS.limit,
    ...HAND_PATTERNS.bonus
]

// Helper: Get pattern name by ID
export const getPatternName = (patternId) => {
    const pattern = getAllPatterns().find(p => p.id === patternId)
    return pattern?.name || patternId
}
