/**
 * Shared Drive env helpers — keep Referer defaults identical across catalogue,
 * media proxy, and Vite so Google API key allowlists cannot drift.
 *
 * Canonical default is the legacy one-t host still listed on the API key.
 * Prefer setting GOOGLE_API_REFERER in Vercel if the allowlist changes.
 */
export const DRIVE_API_REFERER_DEFAULT = 'https://ritishacreations.vercel.app/'

export function driveApiKey() {
  return process.env.VITE_GOOGLE_DRIVE_API_KEY || process.env.GOOGLE_API_KEY
}

export function driveFolderId() {
  return (
    process.env.VITE_DRIVE_FOLDER_ID ||
    process.env.GOOGLE_DRIVE_FOLDER_ID ||
    '1blEF1JY8k4fGg66R_O1ZcSyN6wFHz9W8'
  )
}

export function driveReferer() {
  return (
    process.env.GOOGLE_API_REFERER ||
    process.env.VITE_GOOGLE_API_REFERER ||
    DRIVE_API_REFERER_DEFAULT
  )
}
