# ============================================================
# Volledige MIDI & Apparaat Diagnose
# Voer uit als Administrator!
# ============================================================

if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

$reportFile = "$PSScriptRoot\midi-diagnose-rapport.txt"
$report = [System.Text.StringBuilder]::new()

function Log($msg, $color = "White") {
    Write-Host $msg -ForegroundColor $color
    [void]$report.AppendLine($msg)
}

Log "================================================================" "Cyan"
Log " MIDI & APPARAAT DIAGNOSE - $(Get-Date -Format 'yyyy-MM-dd HH:mm')" "Cyan"
Log "================================================================" "Cyan"
Log ""

# ---------------------------------------------------------------
# SECTIE 1: Alle Phantom/Unknown devices (alle categorieen)
# ---------------------------------------------------------------
Log "=== SECTIE 1: PHANTOM & PROBLEEM-APPARATEN ===" "Yellow"
Log ""

$allDevices = Get-PnpDevice
$phantomAll = $allDevices | Where-Object { $_.Status -eq "Unknown" -or $_.Status -eq "Error" -or $_.Status -eq "Degraded" }
$groupedPhantoms = $phantomAll | Group-Object -Property Class | Sort-Object -Property Count -Descending

$totalPhantoms = ($phantomAll | Measure-Object).Count
Log "Totaal phantom/probleem-apparaten: $totalPhantoms" "Red"
Log ""

foreach ($group in $groupedPhantoms) {
    Log "--- Categorie: $($group.Name) ($($group.Count) stuks) ---" "DarkYellow"
    foreach ($d in $group.Group) {
        $problem = (Get-PnpDeviceProperty -InstanceId $d.InstanceId -KeyName "DEVPKEY_Device_ProblemCode" -ErrorAction SilentlyContinue).Data
        $driver = (Get-PnpDeviceProperty -InstanceId $d.InstanceId -KeyName "DEVPKEY_Device_DriverDesc" -ErrorAction SilentlyContinue).Data
        Log "  [${$d.Status}] $($d.FriendlyName)"
        Log "    InstanceId: $($d.InstanceId)"
        if ($driver) { Log "    Driver: $driver" }
        if ($problem -and $problem -ne 0) { Log "    ProblemCode: $problem" "Red" }
    }
    Log ""
}

# ---------------------------------------------------------------
# SECTIE 2: Roland USB device diepte-analyse
# ---------------------------------------------------------------
Log "=== SECTIE 2: ROLAND USB DEVICE ANALYSE ===" "Yellow"
Log ""

$rolandAll = $allDevices | Where-Object { $_.InstanceId -like "*VID_0582*" -or $_.FriendlyName -like "*Roland*" -or $_.FriendlyName -like "*LX70*" }
if ($rolandAll.Count -eq 0) {
    Log "GEEN Roland-apparaten gevonden!" "Red"
} else {
    Log "Gevonden Roland-apparaten: $($rolandAll.Count)" "Green"
    foreach ($d in $rolandAll) {
        $color = if ($d.Status -eq "OK") { "Green" } else { "Red" }
        Log "  [$($d.Status)] $($d.FriendlyName) (Class: $($d.Class))" $color
        Log "    InstanceId: $($d.InstanceId)"
        
        $hwIds = (Get-PnpDeviceProperty -InstanceId $d.InstanceId -KeyName "DEVPKEY_Device_HardwareIds" -ErrorAction SilentlyContinue).Data
        if ($hwIds) { Log "    HardwareIds: $($hwIds -join ', ')" }
        
        $compatIds = (Get-PnpDeviceProperty -InstanceId $d.InstanceId -KeyName "DEVPKEY_Device_CompatibleIds" -ErrorAction SilentlyContinue).Data
        if ($compatIds) { 
            Log "    CompatibleIds: $($compatIds -join ', ')" 
            $hasMidi = $compatIds | Where-Object { $_ -match "SubClass_03" }
            $hasAudio = $compatIds | Where-Object { $_ -match "SubClass_01" }
            if ($hasMidi) { Log "    >>> MIDI Streaming interface GEVONDEN <<<" "Green" }
            if ($hasAudio) { Log "    >>> Audio Control interface" "Cyan" }
            if (-not $hasMidi -and -not $hasAudio) { Log "    >>> Geen Audio/MIDI subclass" "DarkGray" }
        }
        
        $children = (Get-PnpDeviceProperty -InstanceId $d.InstanceId -KeyName "DEVPKEY_Device_Children" -ErrorAction SilentlyContinue).Data
        if ($children) {
            Log "    Children:"
            foreach ($childId in $children) {
                $child = Get-PnpDevice -InstanceId $childId -ErrorAction SilentlyContinue
                Log "      -> $($child.FriendlyName) [$($child.Status)] ($childId)"
            }
        }
        Log ""
    }
}

# ---------------------------------------------------------------
# SECTIE 3: USB Descriptors via devcon-style info
# ---------------------------------------------------------------
Log "=== SECTIE 3: USB COMPOSITE DEVICE INTERFACES ===" "Yellow"
Log ""

$compositeRoland = $allDevices | Where-Object { 
    $_.InstanceId -like "USB\VID_0582*" -and $_.Class -eq "USB" -and $_.Status -eq "OK" 
}
foreach ($comp in $compositeRoland) {
    Log "Composite device: $($comp.FriendlyName)" "Cyan"
    Log "  InstanceId: $($comp.InstanceId)"
    
    # Zoek ALLE MI_xx interfaces (ook niet-present)
    $baseId = ($comp.InstanceId -split '\\')[0..1] -join '\'
    $allInterfaces = $allDevices | Where-Object { $_.InstanceId -like "$baseId&MI_*" }
    
    if ($allInterfaces.Count -eq 0) {
        Log "  PROBLEEM: Geen child-interfaces gevonden!" "Red"
        Log "  Dit betekent dat Windows maar 1 interface ziet (MI_00 = Audio)." "Red"
        Log "  Normaal zou er ook MI_01 (MIDI Streaming, SubClass_03) moeten zijn." "Red"
    } else {
        Log "  Gevonden interfaces: $($allInterfaces.Count)"
        foreach ($iface in $allInterfaces) {
            $mi = if ($iface.InstanceId -match "MI_(\d+)") { $Matches[1] } else { "?" }
            $compIds = (Get-PnpDeviceProperty -InstanceId $iface.InstanceId -KeyName "DEVPKEY_Device_CompatibleIds" -ErrorAction SilentlyContinue).Data
            $subClass = "onbekend"
            if ($compIds) {
                if ($compIds -match "SubClass_01") { $subClass = "Audio Control" }
                elseif ($compIds -match "SubClass_02") { $subClass = "Audio Streaming" }
                elseif ($compIds -match "SubClass_03") { $subClass = "MIDI Streaming" }
            }
            $color = if ($iface.Status -eq "OK") { "Green" } else { "DarkGray" }
            Log "  MI_$mi = $subClass [$($iface.Status)] $($iface.FriendlyName)" $color
        }
    }
    Log ""
}

# ---------------------------------------------------------------
# SECTIE 4: MIDI-specifieke apparaten en eindpunten
# ---------------------------------------------------------------
Log "=== SECTIE 4: MIDI-EINDPUNTEN & BLUETOOTH MIDI ===" "Yellow"
Log ""

$midiDevices = $allDevices | Where-Object { 
    $_.Class -eq "SoftwareDevice" -and $_.FriendlyName -like "*MIDI*" -or
    $_.InstanceId -like "*MIDII_*" -or
    $_.Class -like "*MIDI*"
}
if ($midiDevices.Count -eq 0) {
    Log "Geen MIDI-eindpunten gevonden in Windows." "Red"
} else {
    Log "MIDI-eindpunten: $($midiDevices.Count)" "Green"
    foreach ($m in $midiDevices) {
        $color = if ($m.Status -eq "OK") { "Green" } else { "DarkGray" }
        Log "  [$($m.Status)] $($m.FriendlyName) (Class: $($m.Class))" $color
        Log "    InstanceId: $($m.InstanceId)"
    }
}
Log ""

# Bluetooth MIDI check
$btMidi = $allDevices | Where-Object { $_.FriendlyName -like "*LX708*MIDI*" -or ($_.FriendlyName -like "*LX708*" -and $_.Class -eq "Bluetooth") }
if ($btMidi.Count -gt 0) {
    Log "Bluetooth LX708 apparaten:" "Cyan"
    foreach ($bt in $btMidi) {
        $color = if ($bt.Status -eq "OK") { "Green" } else { "DarkGray" }
        Log "  [$($bt.Status)] $($bt.FriendlyName) (Class: $($bt.Class))" $color
        Log "    InstanceId: $($bt.InstanceId)"
    }
}
Log ""

# ---------------------------------------------------------------
# SECTIE 5: Potentiele conflicten
# ---------------------------------------------------------------
Log "=== SECTIE 5: POTENTIELE CONFLICTEN ===" "Yellow"
Log ""

# Check dubbele MIDI/Audio drivers
$audioDrivers = $allDevices | Where-Object { $_.Class -eq "MEDIA" -and $_.Status -eq "OK" }
Log "Actieve audio/media drivers ($($audioDrivers.Count)):" "Cyan"
foreach ($ad in $audioDrivers) {
    Log "  $($ad.FriendlyName)"
}
Log ""

# Bome Virtual MIDI check
$bome = $allDevices | Where-Object { $_.FriendlyName -like "*Bome*" }
if ($bome) {
    Log "Bome Virtual MIDI gedetecteerd:" "Cyan"
    foreach ($b in $bome) {
        Log "  [$($b.Status)] $($b.FriendlyName)" $(if ($b.Status -eq "OK") { "Green" } else { "Red" })
    }
    Log "  Bome kan MIDI-poorten claimen. Sluit Bome Network/MIDI Translator af als deze draait." "Yellow"
}
Log ""

# USB power management check
Log "USB Root Hub power management:" "Cyan"
$usbHubs = Get-PnpDevice -PresentOnly | Where-Object { $_.FriendlyName -like "*USB Root Hub*" -or $_.FriendlyName -like "*USB-roothub*" }
foreach ($hub in $usbHubs) {
    $power = (Get-PnpDeviceProperty -InstanceId $hub.InstanceId -KeyName "DEVPKEY_Device_PowerData" -ErrorAction SilentlyContinue)
    Log "  $($hub.FriendlyName) [$($hub.Status)]"
}
Log ""

# ---------------------------------------------------------------
# SECTIE 6: Windows MIDI API check
# ---------------------------------------------------------------
Log "=== SECTIE 6: WINDOWS MIDI API ===" "Yellow"
Log ""

# MIDI Service
$midiSvc = Get-Service -Name "MidiSrv" -ErrorAction SilentlyContinue
$midiStatus = if ($midiSvc) { $midiSvc.Status } else { "NIET GEVONDEN" }
Log "Windows MIDI Service: $midiStatus" $(if ($midiStatus -eq "Running") { "Green" } else { "Red" })

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MidiDiag {
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

$numOut = [MidiDiag]::midiOutGetNumDevs()
$numIn = [MidiDiag]::midiInGetNumDevs()
Log "MIDI Outputs: $numOut" $(if ($numOut -gt 0) { "Green" } else { "Red" })
for ($i = 0; $i -lt $numOut; $i++) {
    $caps = New-Object MidiDiag+MIDIOUTCAPS
    [MidiDiag]::midiOutGetDevCaps($i, [ref]$caps, [System.Runtime.InteropServices.Marshal]::SizeOf($caps)) | Out-Null
    Log "  [$i] $($caps.szPname)"
}
Log "MIDI Inputs:  $numIn" $(if ($numIn -gt 0) { "Green" } else { "Red" })
for ($i = 0; $i -lt $numIn; $i++) {
    $caps = New-Object MidiDiag+MIDIINCAPS
    [MidiDiag]::midiInGetDevCaps($i, [ref]$caps, [System.Runtime.InteropServices.Marshal]::SizeOf($caps)) | Out-Null
    Log "  [$i] $($caps.szPname)"
}
Log ""

# ---------------------------------------------------------------
# SECTIE 7: CONCLUSIE & AANBEVELINGEN
# ---------------------------------------------------------------
Log "=== SECTIE 7: CONCLUSIE ===" "Yellow"
Log ""

$rolandPresent = ($allDevices | Where-Object { $_.InstanceId -like "*VID_0582*" -and $_.Status -eq "OK" }).Count -gt 0
$hasMidiInterface = ($allDevices | Where-Object { 
    $_.InstanceId -like "*VID_0582*MI_01*" -and $_.Status -eq "OK" 
}).Count -gt 0
$hasMidiPorts = $numOut -gt 0 -or $numIn -gt 0
$btMidiPresent = ($btMidi | Where-Object { $_.Status -eq "OK" }).Count -gt 0

if (-not $rolandPresent) {
    Log "PROBLEEM: Roland niet herkend als USB-apparaat." "Red"
    Log "  -> Controleer de USB-kabel (USB-A naar USB-B data kabel)" "Yellow"
    Log "  -> Probeer een andere USB-poort (bij voorkeur USB 2.0)" "Yellow"
} elseif (-not $hasMidiInterface) {
    Log "PROBLEEM: Roland USB heeft GEEN MIDI-interface (alleen Audio)." "Red"
    Log "" 
    Log "De Roland LX708 meldt zich aan met USB Class 01h SubClass 01h" "Yellow"
    Log "(Audio Control) maar NIET met SubClass 03h (MIDI Streaming)." "Yellow"
    Log ""
    Log "Mogelijke oplossingen:" "Cyan"
    Log "  1. HERSTART PC met USB-kabel LOSGEKOPPELD, dan:" "White"
    Log "     - Zet eerst de piano AAN" "White"
    Log "     - Sluit daarna de USB-kabel aan" "White"
    Log "     - Wacht 15 seconden" "White"
    Log ""
    Log "  2. PROBEER EEN ANDERE USB-POORT (USB 2.0 i.p.v. USB 3.0)" "White"
    Log ""
    Log "  3. BLUETOOTH MIDI als alternatief:" "White"
    Log "     - Installeer MIDIberry uit de Microsoft Store" "White"
    Log "     - MIDIberry maakt BLE MIDI beschikbaar als Windows MIDI-poort" "White"
    Log "     - Je LX708 Bluetooth MIDI is al gekoppeld en staat op OK" "White"
    Log ""
    Log "  4. CONTROLEER PIANO-INSTELLINGEN:" "White"
    Log "     - Op de LX708: Function > USB Driver > moet op 'Generic' staan" "White"
    Log "     - Sommige Roland pianos hebben een USB-mode instelling" "White"
} elseif (-not $hasMidiPorts) {
    Log "PROBLEEM: MIDI-interface gevonden maar geen MIDI-poorten." "Red"
    Log "  -> Herstart de Windows MIDI Service" "Yellow"
    Log "  -> Herstart de PC" "Yellow"
} else {
    Log "ALLES OK: MIDI-poorten beschikbaar!" "Green"
}

Log ""

# Opslaan naar bestand
$report.ToString() | Out-File -FilePath $reportFile -Encoding UTF8
Log "Rapport opgeslagen in: $reportFile" "Cyan"
Log ""
Log "Druk op een toets om af te sluiten..." "DarkGray"
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
