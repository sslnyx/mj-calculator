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

const headers = {
  apikey: supabaseAnonKey,
  Authorization: `Bearer ${supabaseAnonKey}`,
}

const response = await fetch(endpoint, {
  headers: {
    ...headers,
  },
})

if (!response.ok) {
  const body = await response.text()
  console.error(`Supabase keep-alive failed: ${response.status} ${response.statusText}`)
  console.error(body)
  process.exit(1)
}

const rpcEndpoint = new URL('/rest/v1/rpc/keepalive_ping', projectUrl)
const rpcResponse = await fetch(rpcEndpoint, {
  method: 'POST',
  headers: {
    ...headers,
    'Content-Type': 'application/json',
  },
  body: '{}',
})

if (!rpcResponse.ok) {
  const body = await rpcResponse.text()
  console.error(`Supabase keep-alive RPC failed: ${rpcResponse.status} ${rpcResponse.statusText}`)
  console.error(body)
  process.exit(1)
}

const rpcBody = await rpcResponse.text()

console.log(`Supabase keep-alive read succeeded for ${projectUrl.host} using table "${tableName}".`)
console.log(`Supabase keep-alive write succeeded via keepalive_ping: ${rpcBody}`)
