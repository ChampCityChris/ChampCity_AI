param(
    [ValidateRange(30, 3600)]
    [int]$PerFileTimeoutSeconds = 900,

    [switch]$Fresh
)

$ErrorActionPreference = "Stop"

$repo = (Get-Location).Path.TrimEnd("\")

if (-not (Test-Path -LiteralPath (Join-Path $repo "package.json"))) {
    throw "Run this script from the ChampCity_AI repository root."
}

if (-not (Test-Path -LiteralPath (Join-Path $repo "test"))) {
    throw "The repository test directory was not found."
}

$outputDir = Join-Path $repo "tmp\test-timing-audit"
$csvPath = Join-Path $outputDir "test-timings.csv"
$slowestPath = Join-Path $outputDir "slowest-first.csv"
$jsonPath = Join-Path $outputDir "test-timings.json"

if ($Fresh -and (Test-Path -LiteralPath $outputDir)) {
    Remove-Item -LiteralPath $outputDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

function Get-RelativeRepoPath {
    param([Parameter(Mandatory = $true)][string]$FullPath)

    $prefix = $repo + "\"
    if (-not $FullPath.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Path is outside the repository: $FullPath"
    }

    return $FullPath.Substring($prefix.Length).Replace("\", "/")
}

function Get-TapCount {
    param(
        [Parameter(Mandatory = $true)][string]$Text,
        [Parameter(Mandatory = $true)][string]$Name
    )

    $pattern = "(?m)^# " + [regex]::Escape($Name) + " (\d+)\s*$"
    $match = [regex]::Match($Text, $pattern)
    if ($match.Success) {
        return [int]$match.Groups[1].Value
    }

    return $null
}

function Save-Results {
    param([Parameter(Mandatory = $true)][object[]]$Rows)

    $Rows |
        Sort-Object TestFile |
        Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8

    $Rows |
        Sort-Object @{ Expression = { [int64]$_.DurationMs }; Descending = $true }, TestFile |
        Export-Csv -Path $slowestPath -NoTypeInformation -Encoding UTF8

    $Rows |
        Sort-Object TestFile |
        ConvertTo-Json -Depth 5 |
        Set-Content -Path $jsonPath -Encoding UTF8
}

$results = @()
$completed = @{}

if ((-not $Fresh) -and (Test-Path -LiteralPath $csvPath)) {
    $existing = @(Import-Csv -LiteralPath $csvPath)
    foreach ($row in $existing) {
        $results += $row
        $completed[$row.TestFile] = $true
    }

    if ($existing.Count -gt 0) {
        Write-Host "Resuming prior audit with $($existing.Count) completed files."
    }
}

$files = @(
    Get-ChildItem -Path (Join-Path $repo "test") -Recurse -File -Filter "*.test.cjs" |
        Sort-Object FullName
)

Write-Host "Found $($files.Count) executable test files."
Write-Host "Per-file timeout: $PerFileTimeoutSeconds seconds."
Write-Host "Results directory: tmp/test-timing-audit"

$index = 0

foreach ($file in $files) {
    $index++
    $relative = Get-RelativeRepoPath -FullPath $file.FullName

    if ($completed.ContainsKey($relative)) {
        Write-Host "[$index/$($files.Count)] SKIP (already recorded) $relative"
        continue
    }

    $safeName = ($relative -replace "[^A-Za-z0-9._-]", "__")
    $stdoutPath = Join-Path $outputDir ($safeName + ".stdout.log")
    $stderrPath = Join-Path $outputDir ($safeName + ".stderr.log")
    $logPath = Join-Path $outputDir ($safeName + ".log")

    Remove-Item -LiteralPath $stdoutPath, $stderrPath, $logPath -Force -ErrorAction SilentlyContinue

    Write-Host ""
    Write-Host "[$index/$($files.Count)] $relative"

    $startedUtc = [DateTime]::UtcNow
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $timedOut = $false
    $startFailure = $null
    $exitCode = $null

    try {
        $startParams = @{
            FilePath = "node"
            ArgumentList = @(
                "--test",
                "--test-concurrency=1",
                "--test-reporter=tap",
                ('"' + $file.FullName + '"')
            )
            WorkingDirectory = $repo
            NoNewWindow = $true
            PassThru = $true
            RedirectStandardOutput = $stdoutPath
            RedirectStandardError = $stderrPath
        }

        $process = Start-Process @startParams
        $completedInTime = $process.WaitForExit($PerFileTimeoutSeconds * 1000)

        if (-not $completedInTime) {
            $timedOut = $true
            Write-Host "  TIMEOUT after $PerFileTimeoutSeconds seconds; terminating process tree."

            try {
                & taskkill.exe /PID $process.Id /T /F *> $null
            }
            catch {
                try { $process.Kill() } catch {}
            }

            try { $process.WaitForExit(5000) | Out-Null } catch {}
        }

        if ($process.HasExited) {
            $exitCode = $process.ExitCode
        }
    }
    catch {
        $startFailure = $_.Exception.Message
    }
    finally {
        $stopwatch.Stop()
    }

    $endedUtc = [DateTime]::UtcNow

    $stdout = if (Test-Path -LiteralPath $stdoutPath) {
        Get-Content -LiteralPath $stdoutPath -Raw -ErrorAction SilentlyContinue
    }
    else {
        ""
    }

    $stderr = if (Test-Path -LiteralPath $stderrPath) {
        Get-Content -LiteralPath $stderrPath -Raw -ErrorAction SilentlyContinue
    }
    else {
        ""
    }

    $combined = @(
        "===== STDOUT ====="
        $stdout
        ""
        "===== STDERR ====="
        $stderr
    ) -join [Environment]::NewLine

    Set-Content -LiteralPath $logPath -Value $combined -Encoding UTF8

    $tests = Get-TapCount -Text $combined -Name "tests"
    $passed = Get-TapCount -Text $combined -Name "pass"
    $failed = Get-TapCount -Text $combined -Name "fail"
    $skipped = Get-TapCount -Text $combined -Name "skipped"
    $cancelled = Get-TapCount -Text $combined -Name "cancelled"

    if ($startFailure) {
        $status = "ExecutionFailed"
        $failureReason = $startFailure
    }
    elseif ($timedOut) {
        $status = "Timeout"
        $failureReason = "Exceeded per-file timeout of $PerFileTimeoutSeconds seconds."
    }
    elseif ($exitCode -eq 0) {
        $status = "Pass"
        $failureReason = ""
    }
    else {
        $status = "Fail"
        $failureReason = "Node test process exited with code $exitCode."
    }

    $row = [PSCustomObject]@{
        TestFile = $relative
        DurationMs = [int64]$stopwatch.ElapsedMilliseconds
        DurationSec = [math]::Round($stopwatch.Elapsed.TotalSeconds, 3)
        Status = $status
        ExitCode = $exitCode
        TimedOut = $timedOut
        Tests = $tests
        Passed = $passed
        Failed = $failed
        Skipped = $skipped
        Cancelled = $cancelled
        StartedUtc = $startedUtc.ToString("o")
        EndedUtc = $endedUtc.ToString("o")
        FailureReason = $failureReason
        LogFile = Get-RelativeRepoPath -FullPath $logPath
    }

    $results += $row
    $completed[$relative] = $true

    Save-Results -Rows $results

    Write-Host ("  {0:N2}s | {1} | exit {2} | tests {3}" -f $stopwatch.Elapsed.TotalSeconds, $status, $exitCode, $tests)
}

Write-Host ""
Write-Host "Audit complete."
Write-Host "Results: tmp/test-timing-audit/test-timings.csv"
Write-Host "Slowest: tmp/test-timing-audit/slowest-first.csv"
Write-Host "JSON:    tmp/test-timing-audit/test-timings.json"
Write-Host "Logs:    tmp/test-timing-audit/*.log"
Write-Host ""

$results |
    Sort-Object @{ Expression = { [int64]$_.DurationMs }; Descending = $true } |
    Select-Object -First 20 TestFile, DurationSec, Status, Tests, Failed, Skipped |
    Format-Table -AutoSize

