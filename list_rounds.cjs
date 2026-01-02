const { createClient } = require('@supabase/supabase-js');

const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

async function listGames() {
    const { data: room } = await supabase
        .from('game_rooms')
        .select('id, room_code, final_scores')
        .eq('room_code', '同老闆講唔關我事')
        .single();

    if (!room) return console.log('Room not found');

    const { data: rounds } = await supabase
        .from('game_rounds')
        .select(`
            *,
            winner:players!winner_id (display_name),
            loser:players!loser_id (display_name)
        `)
        .eq('room_id', room.id)
        .order('created_at', { ascending: true });

    console.log(`\nRoom: ${room.room_code}`);
    console.log(`Total Rounds: ${rounds.length}\n`);

    rounds.forEach((round, i) => {
        const winner = round.winner?.display_name || 'Unknown';
        const loser = round.loser?.display_name || '';
        const winType = round.win_type === 'eat' ? 'HIT' : 'TSUMO';
        const points = round.points;
        const totalWin = (round.win_type === 'zimo' || round.win_type === 'zimo_bao') ? (points / 2) * 3 : points;

        console.log(`Game ${i + 1}: ${winner} ${winType}${loser ? ' (from ' + loser + ')' : ''} | ${round.fan_count} Fan (+${totalWin} pts)`);
    });
}

listGames();
