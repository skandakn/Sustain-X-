# ============================================================
#  ADAPTIVA — Emergency "Hide Video" script
#  Run this ONE command before your competition if the
#  Video feature is not working:
#
#    powershell -ExecutionPolicy Bypass -File hide-video.ps1
#
#  It will:
#    1. Remove "Video" from the navbar
#    2. Replace /video page with a "Coming soon" redirect
#    3. Commit + push to GitHub (Vercel redeploys automatically)
# ============================================================

Write-Host "🚀 Hiding Video feature..." -ForegroundColor Cyan

# ── 1. Remove Video from the navbar ──────────────────────────
$shellPath = "d:\sustainx\components\layout\site-shell.tsx"
$shell = [System.IO.File]::ReadAllText($shellPath, [System.Text.Encoding]::UTF8)
$shell = $shell -replace "  \{ href: `"/video`", label: `"Video`" \},?\r?\n", ""
[System.IO.File]::WriteAllText($shellPath, $shell, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ Removed Video from navbar" -ForegroundColor Green

# ── 2. Replace /video page with a redirect to /learn ─────────
$videoPage = @'
import { redirect } from "next/navigation";

export default function VideoPage() {
  redirect("/learn");
}
'@
[System.IO.File]::WriteAllText(
  "d:\sustainx\app\video\page.tsx",
  $videoPage,
  [System.Text.Encoding]::UTF8
)
Write-Host "  ✓ Video page now redirects to /learn" -ForegroundColor Green

# ── 3. Commit and push ────────────────────────────────────────
Set-Location "d:\sustainx"
git add -A
git commit -m "chore: hide video feature for competition demo"

Write-Host "  Pushing to GitHub..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) {
  # Retry once (handles intermittent DNS issues)
  Write-Host "  Retrying push..." -ForegroundColor Yellow
  git pull origin main --rebase
  git push origin main
}

Write-Host ""
Write-Host "✅ Done! Vercel will redeploy in ~60 seconds." -ForegroundColor Green
Write-Host "   Video tab is gone. /video redirects to /learn." -ForegroundColor Green
