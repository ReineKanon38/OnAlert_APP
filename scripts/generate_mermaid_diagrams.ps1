param(
    [string]$InputFile = "UML_SUPABASE_GUIDE.md",
    [string]$OutputDir = "docs/diagrams",
    [switch]$Render,
    [string[]]$Formats = @("svg")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-Slug {
    param([string]$Text)

    $normalized = [regex]::Replace($Text, "^\s*\d+\)\s*", "")
    $slug = $normalized.ToLowerInvariant()
    $slug = [regex]::Replace($slug, "[^a-z0-9]+", "-")
    $slug = $slug.Trim("-")
    if ([string]::IsNullOrWhiteSpace($slug)) {
        return "diagram"
    }
    return $slug
}

function Parse-MermaidBlocks {
    param([string]$Path)

    $lines = Get-Content -LiteralPath $Path
    $blocks = @()
    $inside = $false
    $current = @()
    $lastHeading = "diagram"

    foreach ($line in $lines) {
        if ($line -match "^##+\s+(.+)$") {
            $lastHeading = $Matches[1].Trim()
        }

        if (-not $inside -and $line.Trim() -eq '```mermaid') {
            $inside = $true
            $current = @()
            continue
        }

        if ($inside -and $line.Trim() -eq '```') {
            $blocks += [pscustomobject]@{
                Heading = $lastHeading
                Content = ($current -join [Environment]::NewLine).Trim()
            }
            $inside = $false
            $current = @()
            continue
        }

        if ($inside) {
            $current += $line
        }
    }

    return $blocks
}

$repoRoot = (Get-Location).Path
$inputPath = if ([System.IO.Path]::IsPathRooted($InputFile)) {
    $InputFile
} else {
    Join-Path $repoRoot $InputFile
}

if (-not (Test-Path -LiteralPath $inputPath)) {
    throw "Input file not found: $inputPath"
}

$outputPath = if ([System.IO.Path]::IsPathRooted($OutputDir)) {
    $OutputDir
} else {
    Join-Path $repoRoot $OutputDir
}

if (-not (Test-Path -LiteralPath $outputPath)) {
    New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
}

$blocks = Parse-MermaidBlocks -Path $inputPath
if ($blocks.Count -eq 0) {
    throw "No mermaid blocks found in: $inputPath"
}

Write-Host "Found $($blocks.Count) Mermaid diagrams in $InputFile"

$diagramFiles = @()
for ($i = 0; $i -lt $blocks.Count; $i++) {
    $index = $i + 1
    $heading = $blocks[$i].Heading
    $slug = Get-Slug -Text $heading
    $fileName = "{0:00}-{1}.mmd" -f $index, $slug
    $filePath = Join-Path $outputPath $fileName

    Set-Content -LiteralPath $filePath -Value ($blocks[$i].Content + [Environment]::NewLine) -NoNewline:$false -Encoding utf8
    $diagramFiles += [pscustomobject]@{
        Heading = $heading
        File = $filePath
    }
    Write-Host "Generated $fileName"
}

if (-not $Render) {
    Write-Host "Render skipped. Use -Render to export images with Mermaid CLI."
    exit 0
}

$mmdc = Get-Command mmdc -ErrorAction SilentlyContinue
$useNpx = $false
if (-not $mmdc) {
    $npx = Get-Command npx -ErrorAction SilentlyContinue
    if ($npx) {
        $useNpx = $true
        Write-Host "mmdc not found globally. Using npx @mermaid-js/mermaid-cli"
    } else {
        Write-Warning "Mermaid CLI (mmdc) and npx are not available. Install Node.js + npm, then run: npm i -g @mermaid-js/mermaid-cli"
        Write-Host "MMD files were still generated in: $outputPath"
        exit 0
    }
}

$formatsNormalized = @()
foreach ($fmt in $Formats) {
    $normalized = $fmt.ToLowerInvariant().Trim()
    if ($normalized -in @("svg", "png", "pdf")) {
        $formatsNormalized += $normalized
    } else {
        Write-Warning "Unsupported format '$fmt'. Supported: svg, png, pdf"
    }
}

if ($formatsNormalized.Count -eq 0) {
    Write-Warning "No valid render formats were provided. Skipping render."
    exit 0
}

foreach ($diagram in $diagramFiles) {
    foreach ($fmt in $formatsNormalized) {
        $outFile = [System.IO.Path]::ChangeExtension($diagram.File, $fmt)
        Write-Host "Rendering $(Split-Path $outFile -Leaf)"
        if ($useNpx) {
            npx --yes @mermaid-js/mermaid-cli@latest -i $diagram.File -o $outFile | Out-Null
        } else {
            & $mmdc.Source -i $diagram.File -o $outFile | Out-Null
        }
    }
}

Write-Host "Done. Files available in: $outputPath"
