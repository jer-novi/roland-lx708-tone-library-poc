# ============================================================
# Roland LX708 MIDI Fix - Phantom Device Cleanup
# Voer uit als Administrator!
# ============================================================

# Zelf-elevatie naar Administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Script herstart als Administrator..." -ForegroundColor Yellow
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Roland LX708 USB MIDI - Phantom Cleanup   " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# --- STAP 1: Overzicht ---
Write-Host "[STAP 1] Inventarisatie Roland USB-apparaten..." -ForegroundColor Yellow
$allRoland = Get-PnpDevice | Where-Object { $_.InstanceId -like "*VID_0582*PID_01B1*" }
$phantoms = $allRoland | Where-Object { $_.Status -ne "OK" }
$active = $allRoland | Where-Object { $_.Status -eq "OK" }

Write-Host "  Actieve apparaten: $($active.Count)" -ForegroundColor Green
foreach ($a in $active) {
    Write-Host "    [OK] $($a.FriendlyName) ($($a.InstanceId))" -ForegroundColor Green
}
Write-Host "  Phantom apparaten: $($phantoms.Count)" -ForegroundColor Red
foreach ($p in $phantoms) {
    Write-Host "    [PHANTOM] $($p.FriendlyName) ($($p.InstanceId))" -ForegroundColor DarkGray
}
Write-Host ""

# --- STAP 2: Phantom devices verwijderen (USB VID_0582&PID_01B1) ---
if ($phantoms.Count -gt 0) {
    Write-Host "[STAP 2] Verwijderen van $($phantoms.Count) phantom USB devices..." -ForegroundColor Yellow
    foreach ($p in $phantoms) {
        Write-Host "  Verwijderen: $($p.FriendlyName)..." -NoNewline
        $result = & pnputil /remove-device "$($p.InstanceId)" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host " OK" -ForegroundColor Green
        } else {
            Write-Host " MISLUKT ($($result -join ' '))" -ForegroundColor Red
        }
    }
} else {
    Write-Host "[STAP 2] Geen phantom USB devices gevonden - overgeslagen." -ForegroundColor Green
}
Write-Host ""

# --- STAP 2B: Stale MIDIU_KSA sessies opruimen (SWD\MIDISRV + SWD\MMDEVAPI) ---
Write-Host "[STAP 2B] Stale Roland MIDIU_KSA sessies opruimen..." -ForegroundColor Yellow
$staleMidi = Get-PnpDevice | Where-Object {
    $_.InstanceId -match "MIDIU_KSA_\d+" -and $_.Status -ne "OK"
}
if ($staleMidi.Count -gt 0) {
    Write-Host "  Gevonden: $($staleMidi.Count) stale MIDIU_KSA entries" -ForegroundColor DarkGray
    foreach ($m in $staleMidi) {
        Write-Host "  Verwijderen: $($m.FriendlyName) ($($m.InstanceId))..." -NoNewline
        $result = & pnputil /remove-device "$($m.InstanceId)" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host " OK" -ForegroundColor Green
        } else {
            Write-Host " MISLUKT ($($result -join ' '))" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  Geen stale MIDIU_KSA sessies gevonden - overgeslagen." -ForegroundColor Green
}
Write-Host ""

# --- STAP 3: Huidig actief Roland device her-enumereren ---
Write-Host "[STAP 3] Roland USB device opnieuw enumereren..." -ForegroundColor Yellow
$activeComposite = Get-PnpDevice -PresentOnly | Where-Object { 
    $_.InstanceId -like "USB\VID_0582&PID_01B1\*" -and $_.Class -eq "USB" -and $_.Status -eq "OK"
}
if ($activeComposite) {
    Write-Host "  Disable+Enable van: $($activeComposite.FriendlyName)..." -NoNewline
    try {
        Disable-PnpDevice -InstanceId $activeComposite.InstanceId -Confirm:$false -ErrorAction Stop
        Start-Sleep -Seconds 2
        Enable-PnpDevice -InstanceId $activeComposite.InstanceId -Confirm:$false -ErrorAction Stop
        Write-Host " OK" -ForegroundColor Green
    } catch {
        Write-Host " MISLUKT: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  Geen actief Roland composite device gevonden. Is de USB-kabel aangesloten?" -ForegroundColor Red
}
Write-Host ""

# --- STAP 4: Windows MIDI Service starten ---
Write-Host "[STAP 4] Windows MIDI Service starten..." -ForegroundColor Yellow
$midiSvc = Get-Service -Name "MidiSrv" -ErrorAction SilentlyContinue
if ($midiSvc) {
    if ($midiSvc.Status -ne "Running") {
        Start-Service -Name "MidiSrv" -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
        $midiSvc = Get-Service -Name "MidiSrv"
    }
    Write-Host "  Windows MIDI Service: $($midiSvc.Status)" -ForegroundColor $(if ($midiSvc.Status -eq "Running") { "Green" } else { "Red" })
} else {
    Write-Host "  Windows MIDI Service niet gevonden." -ForegroundColor DarkGray
}
Write-Host ""

# --- STAP 5: Wacht en controleer resultaat ---
Write-Host "[STAP 5] Wachten op device enumeratie (5 sec)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " RESULTAAT                                  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Check Roland devices na cleanup
$rolandNow = Get-PnpDevice -PresentOnly | Where-Object { $_.InstanceId -like "*VID_0582*PID_01B1*" }
Write-Host ""
Write-Host "Roland USB-apparaten na cleanup:" -ForegroundColor Yellow
foreach ($d in $rolandNow) {
    $compatIds = (Get-PnpDeviceProperty -InstanceId $d.InstanceId -KeyName "DEVPKEY_Device_CompatibleIds" -ErrorAction SilentlyContinue).Data
    $isMidi = $compatIds | Where-Object { $_ -match "SubClass_03" }
    $type = if ($isMidi) { "MIDI" } else { "Audio" }
    Write-Host "  [$type] $($d.FriendlyName) [$($d.Status)] $($d.InstanceId)" -ForegroundColor $(if ($d.Status -eq "OK") { "Green" } else { "Red" })
}

# Check MIDI poorten
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MidiCheck {
    [DllImport("winmm.dll")] public static extern uint midiOutGetNumDevs();
    [DllImport("winmm.dll")] public static extern uint midiInGetNumDevs();
    
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    public struct MIDIOUTCAPS { public ushort wMid; public ushort wPid; public uint vDriverVersion; [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string szPname; public ushort wTechnology; public ushort wVoices; public ushort wNotes; public ushort wChannelMask; public uint dwSupport; }
    
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    public struct MIDIINCAPS { public ushort wMid; public ushort wPid; public uint vDriverVersion; [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string szPname; public uint dwSupport; }
    
    [DllImport("winmm.dll", CharSet = CharSet.Auto)] public static extern uint midiOutGetDevCaps(uint uDeviceID, ref MIDIOUTCAPS caps, uint size);
    [DllImport("winmm.dll", CharSet = CharSet.Auto)] public static extern uint midiInGetDevCaps(uint uDeviceID, ref MIDIINCAPS caps, uint size);
}
"@

$numOut = [MidiCheck]::midiOutGetNumDevs()
$numIn = [MidiCheck]::midiInGetNumDevs()

Write-Host ""
Write-Host "Windows MIDI Poorten:" -ForegroundColor Yellow
Write-Host "  Outputs: $numOut" -ForegroundColor $(if ($numOut -gt 0) { "Green" } else { "Red" })
for ($i = 0; $i -lt $numOut; $i++) {
    $caps = New-Object MidiCheck+MIDIOUTCAPS
    [MidiCheck]::midiOutGetDevCaps($i, [ref]$caps, [System.Runtime.InteropServices.Marshal]::SizeOf($caps)) | Out-Null
    Write-Host "    [$i] $($caps.szPname)"
}
Write-Host "  Inputs:  $numIn" -ForegroundColor $(if ($numIn -gt 0) { "Green" } else { "Red" })
for ($i = 0; $i -lt $numIn; $i++) {
    $caps = New-Object MidiCheck+MIDIINCAPS
    [MidiCheck]::midiInGetDevCaps($i, [ref]$caps, [System.Runtime.InteropServices.Marshal]::SizeOf($caps)) | Out-Null
    Write-Host "    [$i] $($caps.szPname)"
}

Write-Host ""
if ($numOut -gt 0 -or $numIn -gt 0) {
    Write-Host "SUCCESS! MIDI-poorten gevonden. Chrome/Web MIDI zou nu moeten werken." -ForegroundColor Green
} else {
    Write-Host "Nog geen MIDI-poorten. Probeer:" -ForegroundColor Red
    Write-Host "  1. USB-kabel loskoppelen" -ForegroundColor Yellow
    Write-Host "  2. Piano uitzetten" -ForegroundColor Yellow
    Write-Host "  3. PC herstarten" -ForegroundColor Yellow
    Write-Host "  4. Piano aanzetten, daarna USB-kabel aansluiten" -ForegroundColor Yellow
    Write-Host "  5. Dit script opnieuw uitvoeren" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Druk op een toets om af te sluiten..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
