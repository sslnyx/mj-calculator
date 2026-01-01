# 🀄 PONPONMANIA - Mahjong Calculator v2

A modern, multiplayer Mahjong score calculator built with React and Supabase. Track scores in real-time with friends during your Mahjong sessions!

![PONPONMANIA](https://img.shields.io/badge/PONPONMANIA-Mahjong%20Calculator-orange)

## ✨ Features

### 🎮 Multiplayer Game Rooms
- Create private game rooms with unique 4-character codes
- Up to 4 players per room
- Real-time score synchronization across all devices
- Rejoin games even after leaving

### 📊 Smart Score Tracking
- **Eat (点炮/HIT)**: Winner takes points from the player who discarded
- **Zimo (自摸/TSUMO)**: Self-draw win, other players split the payment
- **Zimo Bao (包)**: One player responsible for full payment
- Automatic point calculation based on fan count (3-13 fan)

### 📜 Game Log
- Complete history of all rounds
- View win type, players involved, and points exchanged
- Delete incorrect entries to reverse point changes
- Swipeable interface for easy navigation

### 👥 Player Management
- Google OAuth login
- Personal statistics tracking (wins, total points, highest fan)
- Admin controls for game management

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18 + Vite 6 |
| Backend | Supabase (PostgreSQL + Realtime) |
| Auth | Google OAuth via Supabase |
| Styling | Vanilla CSS (SuperDesign aesthetic) |
| UI Components | Swiper, Framer Motion |

## 🚀 Getting Started

### Prerequisites
- Node.js v20.19.0+ or v22.12.0+
- A Supabase project
- Google OAuth credentials configured in Supabase

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mj.git
   cd mj/mj-v2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

4. **Set up the database**
   
   Run the schema in your Supabase SQL editor, or use the CLI:
   ```bash
   supabase db push --linked --include-all
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

## 📊 Database Schema

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   players   │────>│ player_stats │     │  fan_points │
└─────────────┘     └──────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ game_rooms  │────>│ room_players │────>│ game_rounds │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │vacated_seats │
                    └──────────────┘
```

### Key Tables
- **players**: User profiles linked to Supabase Auth
- **game_rooms**: Room metadata (code, host, status)
- **room_players**: Players in each room with seat positions and current points
- **game_rounds**: Individual win records
- **vacated_seats**: Preserves points when players leave mid-game

## 🎨 Design System

PONPONMANIA uses a **pop-art/comic** aesthetic inspired by SuperDesign:

- **Primary**: Orange `#FF6B00`, Yellow `#FFEB3B`
- **Accent**: Cyan `#00BCD4`, Pink `#FF0055`
- **Typography**: Serif italics for headers, Sans-serif for body
- **Borders**: Bold 2-3px black outlines with comic shadows
- **Effects**: Wavy decorations, slight rotations, burst animations

## 📱 Usage

### Creating a Game
1. Log in with Google
2. Click "Create Table" on the dashboard
3. Share the 4-character room code with friends
4. Wait for players to join (2-4 players)
5. Click "Start Game" when ready

### Recording a Win
1. Tap "🀄 Record Win (Hu)"
2. Select the winner
3. Choose win type (Eat or Zimo)
4. If Eat or Zimo Bao, select the loser
5. Select hand patterns (optional - auto-calculates fan)
6. Confirm to record the round

## 🀄 Hand Patterns & Fan Values

### Regular Hands (常規)
| Pattern | Name | Fan |
|---------|------|-----|
| 大三元 | Big Three Dragons | 8 |
| 清一色 | Pure One Suit | 7 |
| 小三元 | Small Three Dragons | 5 |
| 花么九 | Mixed Terminals | 4 |
| 混一色 | Half Flush | 3 |
| 對對糊 | All Triplets | 3 |

### Mutual Exclusivity Rules
Certain patterns cannot be selected together:

| Pattern | Conflicts With | Reason |
|---------|---------------|--------|
| 大三元 | 小三元 | Can't have both big and small three dragons |
| 大三元 | 清一色 | Dragons are honor tiles |
| 小三元 | 清一色 | Dragons are honor tiles |
| 清一色 | 混一色 | Pure suit vs suit + honors |
| 清一色 | 花么九 | Terminals require multiple suits |
| 混一色 | 花么九 | One suit vs multiple suits |
| 花么九 | 對對糊 | 花么九 already implies all triplets |
| 對對糊 | 平糊 | All triplets vs all sequences |
| 包自摸 (win type) | 門清 | Bao responsibility conflicts with concealed hand |

### Viewing Game Log
1. Swipe left on the game screen
2. View all recorded rounds
3. Tap ✕ on any entry to delete and reverse points

## 🔧 Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📁 Project Structure

```
mj-v2/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── HuModal.jsx    # Win recording modal
│   │   ├── GameLog.jsx    # Game history list
│   │   └── ConfirmModal.jsx
│   ├── contexts/
│   │   └── AuthContext.jsx # Google OAuth context
│   ├── lib/
│   │   ├── supabase.js    # Supabase client config
│   │   ├── rooms.js       # Room CRUD operations
│   │   └── scoring.js     # Point calculation logic
│   ├── pages/
│   │   ├── Login.jsx      # Login screen
│   │   ├── Dashboard.jsx  # Lobby with room list
│   │   └── GameRoom.jsx   # Main game interface
│   ├── App.jsx
│   ├── App.css            # SuperDesign styles
│   └── main.jsx
├── supabase/
│   ├── schema.sql         # Full database schema
│   └── migrations/        # Incremental migrations
├── .env.example
└── package.json
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ for Mahjong enthusiasts
