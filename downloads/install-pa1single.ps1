& {
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$url = "https://raw.githubusercontent.com/3qkd01-svg/t-ng-ng-nh-p/b5a210930d1f37e394c6629b2153937da79025a1/downloads/pa1single.zip"
$expected = "018fe378445a1ea18a7ade6d11de5d54940452fb890ef203b94386c2a52a491e"
$desktop = [Environment]::GetFolderPath("Desktop")
if ([string]::IsNullOrWhiteSpace($desktop)) { $desktop = [Environment]::GetFolderPath("UserProfile") }
$folder = Join-Path $desktop ("pa1single-" + [Guid]::NewGuid().ToString("N").Substring(0,8))
[IO.Directory]::CreateDirectory($folder) | Out-Null
$zip = Join-Path $folder "pa1single.zip"
Write-Host "Dang tai PA1SINGLE 1.0.0..."
Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
$sha = [Security.Cryptography.SHA256]::Create()
try { $actual = [BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes($zip))).Replace("-", "").ToLowerInvariant() }
finally { $sha.Dispose() }
if ($actual -ne $expected) { throw "ZIP tai ve khong dung. Chuong trinh chua duoc chay." }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::ExtractToDirectory($zip, $folder)
$app = Join-Path $folder "pa1single"
Write-Host ("DA TAI VA GIAI NEN: " + $folder) -ForegroundColor Green
Start-Process -FilePath (Join-Path $app "start-pa1single.cmd") -WorkingDirectory $app
}
