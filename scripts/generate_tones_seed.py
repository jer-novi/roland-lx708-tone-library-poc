#!/usr/bin/env python3
"""Generate data/tones_seed.json from the official Roland LX708 Tone List.

Source: LX708/LX706/LX705 Owner's Manual (Tone List, p. 34-35).
The LX708 has 4 tone buttons: Piano, E. Piano, Strings and Other.
Tone numbers restart per button category; the Other category contains
sub-groups (Organ, Upright, Classical, Do Re Mi, Drums, GM2).
"""
import json
import os

PIANO = [
    "European Grand", "European v2", "American Grand", "American v2",
]

E_PIANO = [
    "1976SuitCase", "Tremolo EP", "Pop EP", "Vintage EP", "FM E.Piano",
    "EP Belle", "60's EP", "Clav.", "Stage Phaser", "70's EP", "E.Grand",
]

STRINGS = [
    "SymphonicStr1", "Epic Strings", "Rich Strings", "Orchestra Str",
    "Orchestra", "Chamber Winds", "Harp", "Violin", "Velo Strings",
    "Flute", "Cello", "OrchestraBrs", "Pizzicato Str", "SymphonicStr2",
    "Soft Pad", "Magical Piano", "Jazz Scat", "A.Bass+Cymbl",
]

# Other 1-35 (non-GM2 sub-groups)
OTHER_GROUPS = [
    ("Organ", [
        "Pipe Organ", "Nason Flt 8'", "Combo Jz.Org", "Ballad Organ",
        "ChurchOrgan1", "ChurchOrgan2", "Gospel Spin", "Full Stops",
        "Mellow Bars", "Light Organ", "Lower Organ", "60's Organ",
    ]),
    ("Upright", [
        "Upright Piano", "Mellow Upright", "Bright Upright",
        "Rock Piano", "Ragtime Piano",
    ]),
    ("Classical", [
        "Fortepiano", "Mellow Forte", "Bright Forte",
        "Harpsichord", "Harpsi 8'+4'",
    ]),
    ("Do Re Mi", [
        "Do Re Mi 1#", "Do Re Mi 1b", "Do Re Mi 2#", "Do Re Mi 2b",
    ]),
    ("Drums", [
        "STANDARD Set", "ROOM Set", "POWER Set", "ELEC.Set", "ANALOG Set",
        "JAZZ Set", "BRUSH Set", "ORCH.Set", "SFX Set",
    ]),
]

# Other 36-291 (GM2 sound set)
GM2 = [
    "Piano 1", "Piano 1w", "Piano 1d", "Piano 2", "Piano 2w", "Piano 3",
    "Piano 3w", "Honky-tonk", "Honky-tonk w", "E.Piano 1", "Detuned EP 1",
    "Vintage EP", "60's E.Piano", "E.Piano 2", "Detuned EP 2", "St.FM EP",
    "EP Legend", "EP Phaser", "Harpsi.", "Coupled Hps.", "Harpsi.w",
    "Harpsi.o", "Clav.", "Pulse Clav.", "Celesta", "Glockenspiel",
    "Music Box", "Vibraphone", "Vibraphone w", "Marimba", "Marimba w",
    "Xylophone", "TubularBells", "Church Bell", "Carillon", "Santur",
    "Organ 1", "TremoloOrgan", "60's Organ", "Organ 2", "Perc.Organ 1",
    "Chorus Organ", "Perc.Organ 2", "Rock Organ", "Church Org.1",
    "Church Org.2", "Church Org.3", "Reed Organ", "Puff Organ",
    "Accordion 1", "Accordion 2", "Harmonica", "Bandoneon", "Nylon-str.Gt",
    "Ukulele", "Nylon Gt o", "Nylon Gt 2", "Steel-str.Gt", "12-str.Gt",
    "Mandolin", "Steel+Body", "Jazz Guitar", "Hawaiian Gt", "Clean Guitar",
    "Chorus Gt 1", "Mid Tone Gt", "Muted Guitar", "Funk Guitar1",
    "Funk Guitar2", "Chorus Gt 2", "Overdrive Gt", "Guitar Pinch",
    "DistortionGt", "Gt Feedback1", "Dist.Rhy Gt", "Gt Harmonics",
    "Gt Feedback2", "AcousticBass", "FingeredBass", "Finger Slap",
    "Picked Bass", "FretlessBass", "Slap Bass 1", "Slap Bass 2",
    "Synth Bass 1", "WarmSyn.Bass", "Synth Bass 3", "Clav.Bass",
    "Hammer Bass", "Synth Bass 2", "Synth Bass 4", "RubberSyn.Bs",
    "Attack Pulse", "Violin", "Slow Violin", "Viola", "Cello",
    "Contrabass", "Tremolo Str.", "PizzicatoStr", "Harp", "Yang Qin",
    "Timpani", "Strings", "Orchestra", "60's Strings", "Slow Strings",
    "Syn.Strings1", "Syn.Strings3", "Syn.Strings2", "Choir 1", "Choir 2",
    "Voice", "Humming", "Synth Voice", "Analog Voice", "OrchestraHit",
    "Bass Hit", "6th Hit", "Euro Hit", "Trumpet", "Dark Trumpet",
    "Trombone 1", "Trombone 2", "Bright Tb", "Tuba", "MuteTrumpet1",
    "MuteTrumpet2", "French Horn1", "French Horn2", "Brass 1", "Brass 2",
    "Synth Brass1", "Synth Brass3", "AnalogBrass1", "Jump Brass",
    "Synth Brass2", "Synth Brass4", "AnalogBrass2", "Soprano Sax",
    "Alto Sax", "Tenor Sax", "Baritone Sax", "Oboe", "English Horn",
    "Bassoon", "Clarinet", "Piccolo", "Flute", "Recorder", "Pan Flute",
    "Bottle Blow", "Shakuhachi", "Whistle", "Ocarina", "Square Lead1",
    "Square Lead2", "Sine Lead", "Saw Lead 1", "Saw Lead 2", "Doctor Solo",
    "Natural Lead", "SequencedSaw", "Syn.Calliope", "Chiffer Lead",
    "Charang", "Wire Lead", "Solo Vox", "5th Saw Lead", "Bass+Lead",
    "Delayed Lead", "Fantasia", "Warm Pad", "Sine Pad", "Polysynth",
    "Space Voice", "Itopia", "Bowed Glass", "Metallic Pad", "Halo Pad",
    "Sweep Pad", "Ice Rain", "Soundtrack", "Crystal", "Synth Mallet",
    "Atmosphere", "Brightness", "Goblins", "Echo Drops", "Echo Bell",
    "Echo Pan", "Star Theme", "Sitar 1", "Sitar 2", "Banjo", "Shamisen",
    "Koto", "Taisho Koto", "Kalimba", "Bagpipe", "Fiddle", "Shanai",
    "Tinkle Bell", "Agogo", "Steel Drums", "Woodblock", "Castanets",
    "Taiko", "Concert BD", "Melodic Tom1", "Melodic Tom2", "Synth Drum",
    "TR-808 Tom", "Elec.Perc.", "Reverse Cym.", "Gt FretNoise",
    "Gt Cut Noise", "BsStringSlap", "Breath Noise", "Fl.Key Click",
    "Seashore", "Rain", "Thunder", "Wind", "Stream", "Bubble", "Bird 1",
    "Dog", "Horse Gallop", "Bird 2", "Telephone 1", "Telephone 2",
    "DoorCreaking", "Door", "Scratch", "Wind Chimes", "Helicopter",
    "Car Engine", "Car Stop", "Car Pass", "Car Crash", "Siren", "Train",
    "Jetplane", "Starship", "Burst Noise", "Applause", "Laughing",
    "Screaming", "Punch", "Heart Beat", "Footsteps", "Gun Shot",
    "Machine Gun", "Laser Gun", "Explosion",
]

# Wikipedia page-title mapping (English Wikipedia). Keys are matched
# case-insensitively against the tone name; first match wins.
WIKI_EXACT = {
    "european grand": "Grand piano",
    "european v2": "Grand piano",
    "american grand": "Steinway & Sons",
    "american v2": "Steinway & Sons",
    "1976suitcase": "Rhodes piano",
    "tremolo ep": "Rhodes piano",
    "pop ep": "Electric piano",
    "vintage ep": "Wurlitzer electronic piano",
    "fm e.piano": "Yamaha DX7",
    "ep belle": "Electric piano",
    "60's ep": "Wurlitzer electronic piano",
    "70's ep": "Rhodes piano",
    "clav.": "Clavinet",
    "stage phaser": "Phaser (effect)",
    "e.grand": "Yamaha CP-70",
    "symphonicstr1": "String section",
    "symphonicstr2": "String section",
    "epic strings": "String section",
    "rich strings": "String section",
    "orchestra str": "String orchestra",
    "orchestra": "Orchestra",
    "chamber winds": "Wind ensemble",
    "harp": "Harp",
    "violin": "Violin",
    "velo strings": "String section",
    "flute": "Flute",
    "cello": "Cello",
    "orchestrabrs": "Brass section",
    "pizzicato str": "Pizzicato",
    "pizzicatostr": "Pizzicato",
    "soft pad": "Synthesizer",
    "magical piano": "Piano",
    "jazz scat": "Scat singing",
    "a.bass+cymbl": "Double bass",
    "pipe organ": "Pipe organ",
    "nason flt 8'": "Flue pipe",
    "combo jz.org": "Hammond organ",
    "ballad organ": "Hammond organ",
    "churchorgan1": "Pipe organ",
    "churchorgan2": "Pipe organ",
    "gospel spin": "Leslie speaker",
    "full stops": "Pipe organ",
    "mellow bars": "Hammond organ",
    "light organ": "Hammond organ",
    "lower organ": "Hammond organ",
    "60's organ": "Vox Continental",
    "upright piano": "Upright piano",
    "mellow upright": "Upright piano",
    "bright upright": "Upright piano",
    "rock piano": "Piano rock",
    "ragtime piano": "Ragtime",
    "fortepiano": "Fortepiano",
    "mellow forte": "Fortepiano",
    "bright forte": "Fortepiano",
    "harpsichord": "Harpsichord",
    "harpsi 8'+4'": "Harpsichord",
    "standard set": "Drum kit",
    "room set": "Drum kit",
    "power set": "Drum kit",
    "elec.set": "Electronic drum",
    "analog set": "Roland TR-808",
    "jazz set": "Drum kit",
    "brush set": "Brush (music)",
    "orch.set": "Percussion section",
    "sfx set": "Sound effect",
    # GM2 highlights
    "honky-tonk": "Honky-tonk piano",
    "honky-tonk w": "Honky-tonk piano",
    "ep legend": "Yamaha DX7",
    "st.fm ep": "Frequency modulation synthesis",
    "celesta": "Celesta",
    "glockenspiel": "Glockenspiel",
    "music box": "Music box",
    "vibraphone": "Vibraphone",
    "vibraphone w": "Vibraphone",
    "marimba": "Marimba",
    "marimba w": "Marimba",
    "xylophone": "Xylophone",
    "tubularbells": "Tubular bells",
    "church bell": "Church bell",
    "carillon": "Carillon",
    "santur": "Santur",
    "reed organ": "Pump organ",
    "puff organ": "Pump organ",
    "rock organ": "Hammond organ",
    "accordion 1": "Accordion",
    "accordion 2": "Accordion",
    "harmonica": "Harmonica",
    "bandoneon": "Bandoneon",
    "nylon-str.gt": "Classical guitar",
    "nylon gt o": "Classical guitar",
    "nylon gt 2": "Classical guitar",
    "ukulele": "Ukulele",
    "steel-str.gt": "Steel-string acoustic guitar",
    "12-str.gt": "Twelve-string guitar",
    "mandolin": "Mandolin",
    "steel+body": "Steel-string acoustic guitar",
    "jazz guitar": "Jazz guitar",
    "hawaiian gt": "Steel guitar",
    "clean guitar": "Electric guitar",
    "muted guitar": "Palm mute",
    "overdrive gt": "Distortion (music)",
    "distortiongt": "Distortion (music)",
    "acousticbass": "Double bass",
    "fingeredbass": "Bass guitar",
    "picked bass": "Bass guitar",
    "fretlessbass": "Fretless guitar",
    "slap bass 1": "Slapping (music)",
    "slap bass 2": "Slapping (music)",
    "synth bass 1": "Bass synthesizer",
    "synth bass 2": "Bass synthesizer",
    "synth bass 3": "Bass synthesizer",
    "synth bass 4": "Bass synthesizer",
    "warmsyn.bass": "Bass synthesizer",
    "rubbersyn.bs": "Bass synthesizer",
    "slow violin": "Violin",
    "viola": "Viola",
    "contrabass": "Double bass",
    "tremolo str.": "Tremolo",
    "yang qin": "Yangqin",
    "timpani": "Timpani",
    "strings": "String section",
    "60's strings": "String section",
    "slow strings": "String section",
    "syn.strings1": "Synthesizer",
    "syn.strings2": "Synthesizer",
    "syn.strings3": "Synthesizer",
    "choir 1": "Choir",
    "choir 2": "Choir",
    "voice": "Human voice",
    "humming": "Humming",
    "synth voice": "Vocoder",
    "analog voice": "Vocoder",
    "orchestrahit": "Orchestra hit",
    "trumpet": "Trumpet",
    "dark trumpet": "Trumpet",
    "trombone 1": "Trombone",
    "trombone 2": "Trombone",
    "bright tb": "Trombone",
    "tuba": "Tuba",
    "mutetrumpet1": "Mute (music)",
    "mutetrumpet2": "Mute (music)",
    "french horn1": "French horn",
    "french horn2": "French horn",
    "brass 1": "Brass section",
    "brass 2": "Brass section",
    "soprano sax": "Soprano saxophone",
    "alto sax": "Alto saxophone",
    "tenor sax": "Tenor saxophone",
    "baritone sax": "Baritone saxophone",
    "oboe": "Oboe",
    "english horn": "Cor anglais",
    "bassoon": "Bassoon",
    "clarinet": "Clarinet",
    "piccolo": "Piccolo",
    "recorder": "Recorder (musical instrument)",
    "pan flute": "Pan flute",
    "shakuhachi": "Shakuhachi",
    "whistle": "Whistling",
    "ocarina": "Ocarina",
    "sitar 1": "Sitar",
    "sitar 2": "Sitar",
    "banjo": "Banjo",
    "shamisen": "Shamisen",
    "koto": "Koto (instrument)",
    "taisho koto": "Taishōgoto",
    "kalimba": "Mbira",
    "bagpipe": "Bagpipes",
    "fiddle": "Fiddle",
    "shanai": "Shehnai",
    "steel drums": "Steelpan",
    "woodblock": "Wood block",
    "castanets": "Castanets",
    "taiko": "Taiko",
    "concert bd": "Bass drum",
    "tr-808 tom": "Roland TR-808",
    "synth drum": "Electronic drum",
    "agogo": "Agogô",
    "tinkle bell": "Bell",
    "wind chimes": "Wind chime",
    "scratch": "Scratching",
    "applause": "Applause",
    "seashore": "Ocean",
}

WIKI_KEYWORDS = [
    ("piano 1", "Piano"), ("piano 2", "Piano"), ("piano 3", "Piano"),
    ("e.piano", "Electric piano"), ("detuned ep", "Electric piano"),
    ("ep phaser", "Electric piano"), ("vintage ep", "Wurlitzer electronic piano"),
    ("harpsi", "Harpsichord"), ("clav", "Clavinet"),
    ("church org", "Pipe organ"), ("organ", "Hammond organ"),
    ("guitar", "Electric guitar"), ("gt", None),
    ("lead", "Lead synthesizer"), ("pad", "Synthesizer pad"),
    ("saw", "Sawtooth wave"), ("square", "Square wave"),
    ("sine", "Sine wave"), ("brass", "Brass section"),
    ("hit", "Orchestra hit"),
]

FUN_FACTS = {
    "European Grand": "Gemodelleerd naar een Europese concertvleugel (Hamburg-stijl); dit is de hoofdklank van de LX708, opgebouwd met Roland's PureAcoustic Piano Modeling — er wordt dus geen sample afgespeeld maar fysiek gemodelleerd.",
    "American Grand": "Gemodelleerd naar een Amerikaanse concertvleugel (New York-stijl) met een vollere, donkerdere bas en directere aanslag — ideaal voor jazz en pop.",
    "1976SuitCase": "Geïnspireerd op de Fender Rhodes Mark I Suitcase uit 1976, dé elektrische piano van Stevie Wonder, Herbie Hancock en talloze soul- en fusionplaten.",
    "FM E.Piano": "Het klassieke FM-pianogeluid van de Yamaha DX7 — hét geluid van vrijwel elke pop-ballad uit de jaren '80.",
    "Clav.": "De Hohner Clavinet is wereldberoemd geworden door Stevie Wonder's 'Superstition' — perfect voor funk-riffs.",
    "Harpsichord": "Bij een klavecimbel worden de snaren getokkeld in plaats van aangeslagen; aanslaggevoeligheid bestond op het origineel dus niet.",
    "Fortepiano": "De voorloper van de moderne piano, zoals Mozart en de jonge Beethoven hem kenden — lichter van toon en sneller uitstervend.",
    "ANALOG Set": "Gebaseerd op de Roland TR-808 drummachine uit 1980 — de basis van hiphop, electro en techno. Een stukje Roland-geschiedenis in je piano.",
    "TR-808 Tom": "De synthetische toms van Roland's eigen TR-808 — onmisbaar in electro en oldschool hiphop.",
    "Gospel Spin": "Hammond-orgel door een roterende Leslie-speaker; het 'spin'-effect ontstaat door de draaiende hoorn die het geluid moduleert.",
    "Vibraphone": "De vibrafoon heeft motorgedreven roterende kleppen in de resonatorbuizen die het kenmerkende vibrato veroorzaken.",
    "Honky-tonk": "Het bewust ontstemde saloon-pianogeluid: twee licht uiteen gestemde pianolagen tegelijk.",
    "Orchestra hit": "De 'orchestra hit' werd populair via de Fairlight CMI-sampler en is hét geluid van vroege hiphop en 80s-pop.",
}

COMBOS = {
    "European Grand": "Dual met SymphonicStr1 voor filmische ballads; Split met AcousticBass voor jazz-trio gevoel.",
    "American Grand": "Dual met Soft Pad voor moderne pop; Split met FingeredBass voor singer-songwriter werk.",
    "1976SuitCase": "Dual met Warm Pad voor neo-soul; combineer in Ableton met vinyl-ruis en een TR-808 groove uit Maschine.",
    "Pop EP": "Dual met Choir 1 voor dromerige pop; mooi met sidechain-compressie in een deephouse-context.",
    "FM E.Piano": "Dual met Sine Pad voor 80s-ballads; leg er in Ableton een chorus + reverb overheen.",
    "SymphonicStr1": "Dual met European Grand (klassiek) of met Warm Pad (modern-klassiek à la Ólafur Arnalds).",
    "Epic Strings": "Dual met Magical Piano voor trailer-achtige composities.",
    "Pipe Organ": "Solo gebruiken met veel Ambience voor kerkakoestiek; Split met Choir voor sacrale sfeer.",
    "Combo Jz.Org": "Split met AcousticBass: linkerhand walking bass, rechterhand orgel — instant jazzclub.",
    "Upright Piano": "Mooi met weinig Ambience voor een intieme indie/folk-sound; dual met Tape-achtige pad uit Maschine.",
    "Warm Pad": "Onderlaag onder elke pianoklank voor modern-klassiek; in de mix laagpass-filteren rond 5 kHz.",
}

ORIGIN = {
    "Piano": "Roland PureAcoustic Piano Modeling",
    "E. Piano": "Roland SuperNATURAL",
    "Strings": "Roland SuperNATURAL",
}


def wiki_for(name: str) -> str | None:
    key = name.lower()
    if key in WIKI_EXACT:
        return WIKI_EXACT[key]
    for kw, page in WIKI_KEYWORDS:
        if kw in key:
            return page
    return None


def build():
    tones = []

    def add(category, number, name, subcategory=None):
        tones.append({
            "toneNumber": number,
            "name": name,
            "category": category,
            "subCategory": subcategory,
            "origin": ORIGIN.get(category, "GM2" if subcategory == "GM2" else "Roland SuperNATURAL"),
            "wikipediaPageTitle": wiki_for(name),
            "funFacts": FUN_FACTS.get(name),
            "combinationSuggestions": COMBOS.get(name),
        })

    for i, n in enumerate(PIANO, 1):
        add("Piano", i, n)
    for i, n in enumerate(E_PIANO, 1):
        add("E. Piano", i, n)
    for i, n in enumerate(STRINGS, 1):
        add("Strings", i, n)

    num = 1
    for sub, names in OTHER_GROUPS:
        for n in names:
            add("Other", num, n, sub)
            num += 1
    assert num == 36, f"GM2 should start at 36, got {num}"
    for n in GM2:
        add("Other", num, n, "GM2")
        num += 1
    assert num - 1 == 291, f"Other should end at 291, got {num - 1}"

    categories = [
        {"name": "Piano", "displayOrder": 1, "description": "PureAcoustic gemodelleerde concertvleugels"},
        {"name": "E. Piano", "displayOrder": 2, "description": "Elektrische piano's: Rhodes, Wurlitzer, FM en Clavinet"},
        {"name": "Strings", "displayOrder": 3, "description": "Strijkers, orkest en ensembleklanken"},
        {"name": "Other", "displayOrder": 4, "description": "Orgels, upright piano's, klassiek, drums en de volledige GM2-set"},
    ]
    return {"categories": categories, "tones": tones}


if __name__ == "__main__":
    data = build()
    root = os.path.join(os.path.dirname(__file__), "..")
    for out in (
        os.path.join(root, "data", "tones_seed.json"),
        os.path.join(root, "backend", "src", "main", "resources", "data", "tones_seed.json"),
    ):
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Wrote {len(data['tones'])} tones in {len(data['categories'])} categories to {os.path.abspath(out)}")
