$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$previousToken = $env:TELEGRAM_BOT_TOKEN
$previousLocation = Get-Location

try {
    Set-Location -LiteralPath $projectRoot
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCommand) {
        throw 'Install Node.js 22.13 or newer, then open this launcher again.'
    }
    $nodeVersion = [version]((& node --version).Trim().TrimStart('v'))
    if ($nodeVersion -lt [version]'22.13.0') {
        throw 'Node.js 22.13 or newer is required.'
    }
    if (-not $env:TELEGRAM_BOT_TOKEN) {
        Write-Host 'Enter the bot token from BotFather. Input is hidden and is not saved to a file.'
        $secureToken = Read-Host 'Telegram bot token' -AsSecureString
        $tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
        try {
            $env:TELEGRAM_BOT_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer)
        } finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer)
            $secureToken.Dispose()
        }
    }
    Write-Host 'Keep this window open while using the bot. Press Ctrl+C to stop.'
    & node --experimental-strip-types bot/start.mjs
    if ($LASTEXITCODE -ne 0) {
        throw 'The bot stopped. Read the message above and retry.'
    }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
} finally {
    $env:TELEGRAM_BOT_TOKEN = $previousToken
    Set-Location -LiteralPath $previousLocation.Path
}
