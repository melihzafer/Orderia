param()

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$mark = Join-Path $projectRoot 'assets/orderia-mark.svg'
$foreground = Join-Path $projectRoot 'assets/orderia-foreground.svg'
$splash = Join-Path $projectRoot 'assets/orderia-splash.svg'
$magick = Get-Command magick -ErrorAction Stop

function Render-Square {
  param(
    [Parameter(Mandatory)] [string] $Source,
    [Parameter(Mandatory)] [int] $Size,
    [Parameter(Mandatory)] [string] $Destination,
    [string] $Format = 'png'
  )

  & $magick.Source -background none $Source -resize "${Size}x${Size}" -strip "$Format`:$Destination"
}

function Render-RoundIcon {
  param(
    [Parameter(Mandatory)] [int] $Size,
    [Parameter(Mandatory)] [string] $Destination
  )

  & $magick.Source `
    -size 1024x1024 canvas:none `
    -fill '#BE4A26' `
    -draw 'circle 512,512 512,0' `
    $foreground `
    -composite `
    -resize "${Size}x${Size}" `
    -strip `
    "webp:$Destination"
}

function Render-NotificationIcon {
  param(
    [Parameter(Mandatory)] [int] $Size,
    [Parameter(Mandatory)] [string] $Destination
  )

  & $magick.Source `
    -background none `
    $foreground `
    -transparent '#BE4A26' `
    -channel RGB `
    -fill white `
    -colorize 100 `
    -resize "${Size}x${Size}" `
    -strip `
    "png:$Destination"
}

$copies = @(
  @{ Source = $mark; Size = 1024; Destination = 'assets/icon.png' },
  @{ Source = $foreground; Size = 1024; Destination = 'assets/adaptive-icon.png' },
  @{ Source = $splash; Size = 1200; Destination = 'assets/splash.png' },
  @{ Source = $mark; Size = 64; Destination = 'assets/favicon.png' },
  @{ Source = $mark; Size = 1024; Destination = 'icon.png' },
  @{ Source = $foreground; Size = 1024; Destination = 'adaptive-icon.png' },
  @{ Source = $splash; Size = 1200; Destination = 'splash.png' },
  @{ Source = $mark; Size = 64; Destination = 'favicon.png' },
  @{ Source = $mark; Size = 512; Destination = 'orderia_logo.png' },
  @{ Source = $mark; Size = 512; Destination = 'assets/images/Logo.png' },
  @{ Source = $mark; Size = 512; Destination = 'assets/images/Icon.png' },
  @{ Source = $mark; Size = 192; Destination = 'public/icons/icon-192.png' },
  @{ Source = $mark; Size = 512; Destination = 'public/icons/icon-512.png' },
  @{ Source = $mark; Size = 512; Destination = 'public/icons/icon-maskable-512.png' },
  @{ Source = $mark; Size = 180; Destination = 'public/icons/apple-touch-icon.png' }
)

foreach ($copy in $copies) {
  Render-Square `
    -Source $copy.Source `
    -Size $copy.Size `
    -Destination (Join-Path $projectRoot $copy.Destination)
}

Render-NotificationIcon `
  -Size 96 `
  -Destination (Join-Path $projectRoot 'assets/notification-icon.png')

$androidDensities = @(
  @{ Name = 'mdpi'; Launcher = 48; Foreground = 108; Notification = 24; Splash = 288 },
  @{ Name = 'hdpi'; Launcher = 72; Foreground = 162; Notification = 36; Splash = 432 },
  @{ Name = 'xhdpi'; Launcher = 96; Foreground = 216; Notification = 48; Splash = 576 },
  @{ Name = 'xxhdpi'; Launcher = 144; Foreground = 324; Notification = 72; Splash = 864 },
  @{ Name = 'xxxhdpi'; Launcher = 192; Foreground = 432; Notification = 96; Splash = 1152 }
)

foreach ($density in $androidDensities) {
  $mipmap = Join-Path $projectRoot "android/app/src/main/res/mipmap-$($density.Name)"
  $drawable = Join-Path $projectRoot "android/app/src/main/res/drawable-$($density.Name)"

  Render-Square -Source $mark -Size $density.Launcher -Destination (Join-Path $mipmap 'ic_launcher.webp') -Format 'webp'
  Render-RoundIcon -Size $density.Launcher -Destination (Join-Path $mipmap 'ic_launcher_round.webp')
  Render-Square -Source $foreground -Size $density.Foreground -Destination (Join-Path $mipmap 'ic_launcher_foreground.webp') -Format 'webp'
  Render-NotificationIcon -Size $density.Notification -Destination (Join-Path $drawable 'notification_icon.png')
  Render-Square -Source $splash -Size $density.Splash -Destination (Join-Path $drawable 'splashscreen_logo.png')
}

Write-Host 'Orderia brand assets generated from the SVG masters.'
