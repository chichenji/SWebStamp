param([string[]]$PreviousVersions = @('1.3.0', '1.3.1'))

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$release = Join-Path $root 'release'
$package = Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
$version = $package.version
$packageName = "SWebStamp-$version-full.nupkg"
$packagePath = Join-Path $release $packageName
$setupPath = Join-Path $release "SWebStamp Setup $version.exe"

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-ZipText($Zip, [string]$Name) {
    $entry = $Zip.GetEntry($Name)
    if (-not $entry) { throw "Missing package entry: $Name" }
    $reader = [IO.StreamReader]::new($entry.Open())
    try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
}

function Assert-Equal($Actual, $Expected, [string]$Label) {
    if ($Actual -cne $Expected) { throw "$Label mismatch: expected '$Expected', got '$Actual'" }
}

function Get-StreamHash($Stream) {
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($sha.ComputeHash($Stream)).Replace('-', '') }
    finally { $sha.Dispose() }
}

function Assert-PackagedFile($Zip, [string]$RelativePath) {
    $entry = $Zip.GetEntry("lib/net45/resources/app/$RelativePath")
    if (-not $entry) { throw "Missing application file: $RelativePath" }
    $stream = $entry.Open()
    try { $actual = Get-StreamHash $stream } finally { $stream.Dispose() }
    $expected = (Get-FileHash -LiteralPath (Join-Path $root $RelativePath) -Algorithm SHA256).Hash
    Assert-Equal $actual $expected $RelativePath
}

function Assert-PreviousIdentity([string]$Previous, $CurrentApp) {
    $path = Join-Path $release "SWebStamp-$Previous-full.nupkg"
    $oldZip = [IO.Compression.ZipFile]::OpenRead($path)
    try {
        $oldApp = Read-ZipText $oldZip 'lib/net45/resources/app/package.json' | ConvertFrom-Json
        Assert-Equal $CurrentApp.name $oldApp.name 'Electron application name'
        Assert-Equal $CurrentApp.main $oldApp.main 'Electron entry point'
        Assert-Equal $CurrentApp.build.appId $oldApp.build.appId 'Application ID'
        Assert-Equal $CurrentApp.build.productName $oldApp.build.productName 'Executable/product name'
        $oldMetadata = [xml](Read-ZipText $oldZip 'SWebStamp.nuspec')
        Assert-Equal $oldMetadata.package.metadata.id 'SWebStamp' 'Squirrel package identity'
    } finally { $oldZip.Dispose() }
}

function Get-UpgradePlan([string]$Previous, $Assembly, [string]$NewReleaseText) {
    $entryType = $Assembly.GetType('Squirrel.ReleaseEntry')
    $parse = $entryType.GetMethod('ParseReleaseEntry')
    $oldText = (Get-Content -LiteralPath (Join-Path $release "SWebStamp-$Previous-RELEASES") -Raw).Trim()
    $installed = $parse.Invoke($null, @($oldText))
    $available = $entryType.GetMethod('ParseReleaseFile').Invoke($null, @($NewReleaseText))
    $planner = $Assembly.GetType('Squirrel.UpdateInfo').GetMethod('Create')
    $info = $planner.Invoke($null, @($installed, $available, [string]$release))
    Assert-Equal $installed.PackageName 'SWebStamp' 'Installed package name'
    Assert-Equal $info.FutureReleaseEntry.PackageName 'SWebStamp' 'Upgrade package name'
    Assert-Equal $info.CurrentlyInstalledVersion.Version.ToString() $Previous 'Installed version'
    Assert-Equal $info.FutureReleaseEntry.Version.ToString() $version 'Selected upgrade version'
    Assert-Equal $info.ReleasesToApply.Count 1 'Full upgrade package count'
    Assert-Equal $info.ReleasesToApply[0].Filename $packageName 'Selected full upgrade package'
    Assert-Equal $info.IsBootstrapping $false 'Upgrade rather than first installation'
    return @{ from = $Previous; to = $version; package = $info.ReleasesToApply[0].Filename }
}

$releaseText = (Get-Content -LiteralPath (Join-Path $release "SWebStamp-$version-RELEASES") -Raw).Trim()
$fields = $releaseText -split '\s+'
Assert-Equal $fields.Length 3 'RELEASES field count'
Assert-Equal $fields[1] $packageName 'RELEASES filename'
Assert-Equal ([long]$fields[2]) (Get-Item -LiteralPath $packagePath).Length 'RELEASES package size'
Assert-Equal $fields[0] (Get-FileHash -LiteralPath $packagePath -Algorithm SHA1).Hash 'RELEASES package checksum'

$zip = [IO.Compression.ZipFile]::OpenRead($packagePath)
try {
    $metadata = [xml](Read-ZipText $zip 'SWebStamp.nuspec')
    Assert-Equal $metadata.package.metadata.id 'SWebStamp' 'NuGet package ID'
    Assert-Equal $metadata.package.metadata.version $version 'NuGet package version'
    $app = Read-ZipText $zip 'lib/net45/resources/app/package.json' | ConvertFrom-Json
    Assert-Equal $app.version $version 'Packaged application version'
    foreach ($previous in $PreviousVersions) { Assert-PreviousIdentity $previous $app }
    $distRoot = Join-Path $root 'dist'
    $distFiles = @(Get-ChildItem -LiteralPath $distRoot -Recurse -File)
    foreach ($file in $distFiles) {
        $relative = [IO.Path]::GetRelativePath($root, $file.FullName).Replace('\', '/')
        Assert-PackagedFile $zip $relative
    }
    foreach ($file in @('electron/main.js', 'electron/squirrel.js', 'server/utils/libreOfficeProcess.js', 'server/utils/officeUploadPolicy.js')) {
        Assert-PackagedFile $zip $file
    }
    if (-not ($distFiles.Name -match '^scanWorker-.+\.js$')) { throw 'Missing compiled scan worker' }
    if ($zip.Entries.FullName -match '^lib/net45/resources/app/(\.env|server/database\.sqlite)$') {
        throw 'User configuration or database must not be shipped in the package'
    }
    foreach ($name in @('lib/net45/LICENSE', 'lib/net45/version', 'lib/net45/SWebStamp.exe')) {
        if (-not $zip.GetEntry($name)) { throw "Missing Electron runtime entry: $name" }
    }
} finally { $zip.Dispose() }

$assembly = [Reflection.Assembly]::LoadFrom((Join-Path $root 'node_modules/electron-winstaller/vendor/Squirrel.exe'))
$upgradePlans = @($PreviousVersions | ForEach-Object { Get-UpgradePlan $_ $assembly $releaseText })
$setupInfo = (Get-Item -LiteralPath $setupPath).VersionInfo
Assert-Equal $setupInfo.FileVersion $version 'Installer file version'
Assert-Equal $setupInfo.ProductVersion $version 'Installer product version'
$signature = Get-AuthenticodeSignature -LiteralPath $setupPath

@{
    version = $version
    installer = $setupPath
    bytes = (Get-Item -LiteralPath $setupPath).Length
    sha256 = (Get-FileHash -LiteralPath $setupPath -Algorithm SHA256).Hash
    signature = $signature.Status.ToString()
    packagedDistFilesChecked = $distFiles.Count
    upgradePlans = $upgradePlans
    verificationScope = 'Package integrity, source parity, stable identity, native Squirrel upgrade planning. Does not execute installation.'
} | ConvertTo-Json -Depth 6
