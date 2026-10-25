# Genera los mp3 que faltan a partir de los JSON de data/.
# Recorre cada objeto con "audio" y lee su texto (voz > instruccion > texto).
# Idioma: "idioma": "en" en el objeto o en la actividad usa la voz inglesa.
# No sobrescribe archivos existentes (las grabaciones de la maestra se respetan); usa -Forzar para regenerar.
#
# Uso:  powershell -ExecutionPolicy Bypass -File tools\generar-audio.ps1
# Requiere: voces de Windows (Sabina es-MX, Zira en-US) y ffmpeg (winget install Gyan.FFmpeg).
param([switch]$Forzar)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path $PSScriptRoot -Parent
Add-Type -AssemblyName System.Speech
$voz = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voces = @{ es = 'Microsoft Sabina Desktop'; en = 'Microsoft Zira Desktop' }

$ffmpeg = (Get-Command ffmpeg -ErrorAction SilentlyContinue).Source
if (-not $ffmpeg) {
  $ffmpeg = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter ffmpeg.exe -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
}
if (-not $ffmpeg) { throw 'No se encontró ffmpeg. Instálalo con: winget install Gyan.FFmpeg' }

$pendientes = @{}
function Get-AudioEntries($nodo, $idioma) {
  if ($nodo -is [System.Array]) { foreach ($x in $nodo) { Get-AudioEntries $x $idioma }; return }
  if ($nodo -isnot [System.Management.Automation.PSCustomObject]) { return }
  if ($nodo.idioma) { $idioma = $nodo.idioma }
  if ($nodo.audio) {
    $texto = @($nodo.voz, $nodo.instruccion, $nodo.texto) | Where-Object { $_ } | Select-Object -First 1
    if ($texto) { $pendientes[$nodo.audio] = @{ texto = [string]$texto; idioma = $idioma } }
  }
  foreach ($p in $nodo.PSObject.Properties) { Get-AudioEntries $p.Value $idioma }
}

Get-ChildItem (Join-Path $raiz 'data') -Recurse -Filter *.json | ForEach-Object {
  Get-AudioEntries (Get-Content $_.FullName -Raw -Encoding UTF8 | ConvertFrom-Json) 'es'
}

$tmp = Join-Path $env:TEMP 'escuela-voz.wav'
$hechos = 0
foreach ($ruta in $pendientes.Keys) {
  $destino = Join-Path $raiz $ruta
  if ((Test-Path $destino) -and -not $Forzar) { continue }
  New-Item -ItemType Directory -Force (Split-Path $destino) | Out-Null
  $e = $pendientes[$ruta]
  $voz.SelectVoice($voces[$e.idioma])
  $voz.Rate = -1   # un poco más lento para niños
  $voz.SetOutputToWaveFile($tmp)
  $voz.Speak($e.texto)
  $voz.SetOutputToNull()
  # volumen normalizado (-16 LUFS); mono, 22 kHz, 40 kbps: ~5 KB por segundo
  & $ffmpeg -y -loglevel error -i $tmp -af "loudnorm=I=-16:TP=-1.5" -ac 1 -ar 22050 -b:a 40k $destino
  $hechos++
  Write-Output "OK  $ruta  <- $($e.texto)"
}
Remove-Item $tmp -ErrorAction SilentlyContinue
Write-Output "$hechos audios generados ($($pendientes.Count) en total en los JSON)."
