import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    const envContent = fs.readFileSync(path.resolve(__dirname, '.env'), 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) env[match[1]] = (match[2] || '').replace(/['\"]/g, '');
    });

    const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
    const roomCode = '同老闆講唔關我事';

    const { data: room } = await supabase.from('game_rooms').select('id').eq('room_code', roomCode).single();
    if (!room) return console.log('Room not found');

    const { data: vacated } = await supabase.from('vacated_seats').select('*').eq('room_id', room.id);
    console.log('Vacated Seats:', JSON.stringify(vacated, null, 2));

    const { data: players } = await supabase.from('room_players').select('*, player:players(*)').eq('room_id', room.id);
    console.log('Active Room Players:', JSON.stringify(players, null, 2));
}
run();
