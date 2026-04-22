import * as https from 'https'
import * as fs from 'fs'
import * as path from 'path'

function getCerts() {
  const cert = fs.readFileSync(path.join(process.cwd(), 'teller-certificate.pem'))
  const key = fs.readFileSync(path.join(process.cwd(), 'teller-private-key.pem'))
  return { cert, key }
}

interface TellerResponse {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

export function tellerFetch(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: string
  } = {}
): Promise<TellerResponse> {
  return new Promise((resolve, reject) => {
    const { cert, key } = getCerts()
    const parsed = new URL(url)

    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: options.method ?? 'GET',
        headers: options.headers ?? {},
        cert,
        key,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          resolve({
            ok: res.statusCode! >= 200 && res.statusCode! < 300,
            status: res.statusCode!,
            json: () => Promise.resolve(JSON.parse(data)),
          })
        })
      }
    )

    req.on('error', reject)
    if (options.body) req.write(options.body)
    req.end()
  })
}
