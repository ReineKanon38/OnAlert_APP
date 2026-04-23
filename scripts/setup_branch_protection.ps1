param(
    [string]$Owner = "ReineKanon38",
    [string]$Repo = "OnAlert_APP",
    [string]$Token = $env:GITHUB_TOKEN
)

if (-not $Token) {
    Write-Error "Missing token. Set GITHUB_TOKEN or pass -Token."
    exit 1
}

$headers = @{
    Accept = "application/vnd.github+json"
    Authorization = "Bearer $Token"
    "X-GitHub-Api-Version" = "2022-11-28"
}

function Set-BranchProtection {
    param(
        [string]$Branch,
        [bool]$EnforceAdmins,
        [string[]]$Contexts
    )

    $uri = "https://api.github.com/repos/$Owner/$Repo/branches/$Branch/protection"

    $body = @{
        required_status_checks = @{
            strict = $true
            contexts = $Contexts
        }
        enforce_admins = $EnforceAdmins
        required_pull_request_reviews = @{
            dismiss_stale_reviews = $true
            require_code_owner_reviews = $false
            required_approving_review_count = 1
        }
        restrictions = $null
        required_linear_history = $true
        allow_force_pushes = $false
        allow_deletions = $false
        block_creations = $false
        required_conversation_resolution = $true
        lock_branch = $false
        allow_fork_syncing = $true
    } | ConvertTo-Json -Depth 8

    Write-Host "Applying protection to '$Branch'..."
    Invoke-RestMethod -Method Put -Uri $uri -Headers $headers -Body $body | Out-Null
    Write-Host "Protection applied to '$Branch'."
}

try {
    $contexts = @("backend-check", "dashboard-build", "flutter-quality")

    Set-BranchProtection -Branch "main" -EnforceAdmins $true -Contexts $contexts
    Set-BranchProtection -Branch "develop" -EnforceAdmins $false -Contexts $contexts

    Write-Host "Done. Branch protection configured for main and develop."
}
catch {
    Write-Error $_
    exit 1
}
