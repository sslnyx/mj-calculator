import { existsSync, readFileSync } from 'node:fs'

if (existsSync('.env')) {
  const envFile = readFileSync('.env', 'utf8')

  for (const line of envFile.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '')
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const tableName = process.env.SUPABASE_KEEPALIVE_TABLE || 'fan_points'

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL/SUPABASE_ANON_KEY or VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.')
  process.exit(1)
}

let projectUrl

try {
  projectUrl = new URL(supabaseUrl)
} catch {
  console.error(`Invalid Supabase URL: ${supabaseUrl}`)
  process.exit(1)
}

const endpoint = new URL(`/rest/v1/${encodeURIComponent(tableName)}`, projectUrl)
endpoint.searchParams.set('select', '*')
endpoint.searchParams.set('limit', '1')

const response = await fetch(endpoint, {
  headers: {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
  },
})

if (!response.ok) {
  const body = await response.text()
  console.error(`Supabase keep-alive failed: ${response.status} ${response.statusText}`)
  console.error(body)
  process.exit(1)
}

console.log(`Supabase keep-alive succeeded for ${projectUrl.host} using table "${tableName}".`)
