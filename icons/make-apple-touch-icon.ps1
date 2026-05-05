# ARISE MONARCH — apple-touch-icon.png Generator
# Reines .NET, kein Node nötig. Erzeugt 180x180 PNG mit lila Blitz auf dunklem Background.
# Aufruf: powershell -ExecutionPolicy Bypass -File icons/make-apple-touch-icon.ps1

Add-Type -AssemblyName System.Drawing

$size = 180
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Background: radial dark purple → almost black
$bgRect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
$bgPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$bgPath.AddEllipse(-30, -30, $size + 60, $size + 60)
$bgBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($bgPath)
$bgBrush.CenterColor = [System.Drawing.Color]::FromArgb(255, 26, 10, 58)   # #1a0a3a
$bgBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(255, 5, 8, 16)) # #050810
$g.FillRectangle($bgBrush, $bgRect)

# Lightning bolt — scaled to 180x180 viewbox (was 1024 viewbox in SVG, scale ~5.69)
$scale = $size / 1024.0
$pts = @(
    (New-Object System.Drawing.PointF((580 * $scale), (130 * $scale))),
    (New-Object System.Drawing.PointF((320 * $scale), (540 * $scale))),
    (New-Object System.Drawing.PointF((480 * $scale), (540 * $scale))),
    (New-Object System.Drawing.PointF((380 * $scale), (870 * $scale))),
    (New-Object System.Drawing.PointF((720 * $scale), (460 * $scale))),
    (New-Object System.Drawing.PointF((560 * $scale), (460 * $scale))),
    (New-Object System.Drawing.PointF((660 * $scale), (130 * $scale)))
)

# Glow layers
$glowColors = @(
    @{ alpha = 24; expand = 8 },
    @{ alpha = 36; expand = 5 },
    @{ alpha = 64; expand = 2 }
)
foreach ($glow in $glowColors) {
    $glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($glow.alpha, 192, 132, 252))
    $glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $glowPath.AddPolygon($pts)
    $widenPen = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, [float]$glow.expand)
    $glowPath.Widen($widenPen)
    $g.FillPath($glowBrush, $glowPath)
}

# Bolt fill — purple gradient
$boltBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.PointF(0, 0)),
    (New-Object System.Drawing.PointF($size, $size)),
    [System.Drawing.Color]::FromArgb(255, 233, 213, 255),  # #e9d5ff top
    [System.Drawing.Color]::FromArgb(255, 168, 85, 247)    # #a855f7 bottom
)
$g.FillPolygon($boltBrush, $pts)

# White outline
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 3)
$pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$g.DrawPolygon($pen, $pts)

$outPath = Join-Path $PSScriptRoot 'apple-touch-icon.png'
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved: $outPath ($size x $size)"

$g.Dispose(); $bmp.Dispose()
