# Renders icons/icon16.png ... icon128.png from the shapes in icons/icon.svg,
# with System.Drawing, so no extra tools are needed on Windows.
#
#   powershell -ExecutionPolicy Bypass -File tools/make-icons.ps1

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'icons'
New-Item -ItemType Directory -Force $out | Out-Null

function New-Icon([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.ScaleTransform($size / 128.0, $size / 128.0)

    # The tile: a rounded square with a blue-to-violet gradient.
    $d = 56
    $tile = New-Object System.Drawing.Drawing2D.GraphicsPath
    $tile.AddArc(4, 4, $d, $d, 180, 90)
    $tile.AddArc(124 - $d, 4, $d, $d, 270, 90)
    $tile.AddArc(124 - $d, 124 - $d, $d, $d, 0, 90)
    $tile.AddArc(4, 124 - $d, $d, $d, 90, 90)
    $tile.CloseFigure()
    $from = New-Object System.Drawing.PointF 4, 4
    $to = New-Object System.Drawing.PointF 124, 124
    $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush $from, $to, ([System.Drawing.Color]::FromArgb(255, 0x4C, 0x8D, 0xF6)), ([System.Drawing.Color]::FromArgb(255, 0x9B, 0x6C, 0xF2))
    $g.FillPath($grad, $tile)

    # The tree: a trunk with two branches, a filled root and two leaves.
    $white = [System.Drawing.Color]::White
    $pen = New-Object System.Drawing.Pen $white, 9
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($pen, 40, 34, 40, 92)
    $g.DrawLine($pen, 40, 62, 78, 62)
    $g.DrawLine($pen, 40, 92, 78, 92)
    $fill = New-Object System.Drawing.SolidBrush $white
    $g.FillEllipse($fill, 27, 21, 26, 26)
    $g.FillEllipse($fill, 78, 52, 20, 20)
    $ring = New-Object System.Drawing.Pen $white, 6
    $g.DrawEllipse($ring, 80, 84, 16, 16)

    $file = Join-Path $out "icon$size.png"
    $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $grad.Dispose(); $pen.Dispose(); $ring.Dispose(); $fill.Dispose(); $tile.Dispose()
    Write-Output "wrote $file"
}

foreach ($s in 16, 32, 48, 128) { New-Icon $s }
