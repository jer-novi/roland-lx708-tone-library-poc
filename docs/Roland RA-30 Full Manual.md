# **Roland RA-30 Realtime Arranger \- Owner's Manual**

*(LLM Optimized Reference Markdown)*

## **1\. Introduction & Main Features**

The Roland RA-30 is a realtime arranger that can be connected to an electronic piano (E.P.), acoustic piano (A.P., via KP-24 pickup), or other MIDI instruments.

**Main Features:**

1. **Lots of Tones:** Covers a wide range of instruments (sax, violin, trumpet, etc.) and Drum Tones.  
2. **Arranger:** Built-in auto-accompaniment spanning genres like Pop, Rock, Latin, etc.  
3. **Acoustic Piano Ensemble:** Compatible with the KP-24 Acoustic Keyboard Pickup for non-MIDI pianos.

## **2\. Panel Descriptions**

* **Volume Knob:** Adjusts overall volume.  
* **Balance Buttons:** Adjusts volume balance between Tone (melody) and Arranger (rhythm/accompaniment).  
* **Display:** Shows Music Style, Tone Number, Tempo, and parameter values.  
* **Function Buttons:** Tune (adjust reference pitch), Demo (play built-in songs).  
* **Recorder:** Rec (record performance), Play (playback).  
* **Tempo \-/+:** Adjusts the speed of the style/song (20 to 250 BPM) or alters settings.  
* **Tone Section:** Keyboard button, 8 Tone Group buttons, Tone Select (up/down).  
* **Music Style Section:** 8 Style Group buttons, Style Select (up/down).  
* **Arranger Controls:** To Variation, To Original (Fill-ins), Intro/Ending, Start/Stop.  
* **One Touch:** Keyboard (full keyboard tone play), Arranger (split keyboard for style play).

## **3\. Setup & Connections**

### **3.1 Electronic Piano (E.P.)**

1. **MIDI:** Connect E.P. MIDI OUT to RA-30 MIDI IN. Connect E.P. MIDI IN to RA-30 MIDI OUT.  
2. **Audio:** Connect RA-30 Output R/L to E.P. INPUT R/L (or an external amp).  
3. **Power Up:** Turn on E.P. first. On the RA-30, press the Power switch. The display will briefly show EPS (Electronic Piano Set).  
4. **Settings:** Set E.P. MIDI Transmit and Receive channels to 1\. Set E.P. Local ON/OFF to OFF.

### **3.2 Acoustic Piano (A.P.)**

1. **Connection:** Connect KP-24 pickup's RRC cable to the RA-30's RRC IN. Connect RA-30 audio to an amp.  
2. **Power Up:** Hold down the Organ/Flute Tone button while turning on the RA-30 Power switch. Display shows APS (Acoustic Piano Set).

### **3.3 Other MIDI Devices (MIDI Accordion/Synths)**

1. **Connection:** Connect MIDI OUT of the device to RA-30 MIDI IN.  
2. **Power Up:** Hold down the Strings Tone button while turning on the RA-30. Display shows ACS (Accordion Set).  
3. **Channels (Accordion):** Melody Part 1 (CH 1), Chord Part (CH 2), Bass Part (CH 3).

## **4\. Playing Tones & Styles**

### **4.1 Tuning**

Press Tune. Use Tempo \-/+ to tune (27.0 \= 427Hz to 53.0 \= 453Hz. Default is 40.0 \= 440Hz). Press Tempo \- and \+ simultaneously to reset to 440Hz.

### **4.2 Playing Tones**

1. Press Keyboard (One Touch).  
2. Select a Tone Group (e.g., Sax/Brass).  
3. Use Tone Select (up/down) to find variations. (Press the flashing Group button to save the variation temporarily).

### **4.3 Using Styles (Arranger)**

1. Press Arranger (One Touch). The keyboard splits at F\#3/G3. Left side \= chords/style, Right side \= melody.  
2. Select a Style Group and Variation using Style Select.  
3. Press Start/Stop or play a chord on the left to start (Sync Start).  
4. Press Intro/Ending to start with an intro or end with an outro.  
5. Use To Original or To Variation during playback to insert a Fill-In and change the accompaniment pattern.

### **4.4 Chords & Chord Intelligence**

* The RA-30 recognizes standard chords.  
* **Chord Intelligence (ON by default):** Play simplified chords. Major \= Root only. Minor \= Root \+ minor 3rd. Seventh \= Root \+ major 2nd lower. Major Seventh \= Root \+ minor 2nd lower.  
* **Toggle Chord Intelligence:** Press Tune \+ Demo simultaneously, then press Traditional (Style Group). Use Tempo \-/+ to toggle On/OFF.

## **5\. Handy Functions**

### **5.1 Volume Balance**

Use the Balance (Tone / Arranger) buttons. Range is A63 (Arranger max, Tone min) through 0 (Equal) to t63 (Tone max, Arranger min).

### **5.2 Recording**

1. Press Rec. The button flashes.  
2. Start playing (or press Start/Stop). The RA-30 records up to approx. 5,000 notes.  
3. Press Start/Stop to finish.  
4. Press Play to listen.

### **5.3 Pedal Functions**

The pedal switch (connected to Foot Control) can be reassigned:

1. Press Tune \+ Demo simultaneously.  
2. Press Pop (Style Group). Use Tempo \-/+ to select:  
   * F1: Start/Stop  
   * F2: Fill In  
   * F3: Toggle between Original and Variation  
   * F4: Intro/Ending  
   * F5: Hold (Sustain)  
   * F6: Chord Recognition Off (Useful for acoustic pianos to sustain a style while playing freely).

### **5.4 System Backup**

Saves Tone/Style variations and system settings after power-off.

Press Tune \+ Demo \-\> Press Rock \-\> Toggle On/OFF with Tempo buttons.

### **5.5 Arranger Range (Split Point)**

Change the left-hand split area.

Press Tune \+ Demo \-\> Press Swing (Upper limit) or Contemporary (Lower limit) \-\> Use Tempo buttons or press a key on the piano to set.

### **5.6 Octave Shift**

Press Tune \+ Demo \-\> Press Latin \-\> Use Tempo buttons to shift pitch (-2 to \+6 octaves).

### **5.7 Reverb & Chorus**

* **Reverb:** Press Tune \+ Demo \-\> Press Waltz \-\> Select 0 (Off) to 3 (Max).  
* **Chorus:** Press Tune \+ Demo \-\> Press World \-\> Toggle On/Off.

### **5.8 Factory Reset**

Hold the Keyboard button in the Tone Group while turning on the Power switch. Display shows Int.

## **6\. Using RA-30 as a Sound Module (GS/GM Mode)**

To use the RA-30 as a 16-part multitimbral sound module (bypassing the arranger UI):

1. Hold Others (Tone Group) while turning on the Power switch.  
2. Display shows GS. (It will show GM if it receives a GM System On message).  
3. Only the Volume knob works in this mode. Send MIDI from your software/controller.  
4. Exit by pressing Keyboard or Arranger One Touch buttons, or rebooting.

## **7\. MIDI Implementation Data**

### **Default MIDI Channels (Arranger Mode)**

* CH 1: Upper Note to Arranger 1 / Style Program Change  
* CH 2: Accompaniment Bass  
* CH 3: Note to Arranger 2  
* CH 4: Upper  
* CH 5: Accompaniment 1  
* CH 6: Accompaniment 2  
* CH 10: Accompaniment Drums  
* CH 13: Note to Arranger 3  
* CH 16: Manual Drums

*(Note: In GS Mode, it responds standardly across Channels 1-16).*

### **Recognized Control Changes (CC)**

* CC 0, 32: Bank Select  
* CC 1: Modulation  
* CC 5: Portamento Time  
* CC 6, 38: Data Entry  
* CC 7: Volume  
* CC 10: Panpot  
* CC 11: Expression  
* CC 64: Hold 1 (Sustain)  
* CC 65: Portamento  
* CC 66: Sostenuto  
* CC 67: Soft  
* CC 84: Portamento Control  
* CC 91: Effect 1 (Reverb) Depth  
* CC 93: Effect 3 (Chorus) Depth  
* CC 98, 99: NRPN LSB, MSB  
* CC 100, 101: RPN LSB, MSB

## **8\. Tone Chart & Drum Chart (Excerpts)**

**Tone Groups (128 Tones Total):**

1. **Sax/Brass:** Alto Sax, Soprano Sax, Tenor Sax, Trumpet, Trombone, French Horn, Synth Brass, etc.  
2. **Organ/Flute:** Organ 1-3, Church Organ, Accordion, Harmonica, Flute, Pan Flute, Ocarina.  
3. **Strings:** Violin, Cello, Contrabass, Harp, Timpani, Strings, Choir, Synth Strings, Orchestra Hit.  
4. **Guitar/Bass:** Nylon Gt, Steel Gt, Jazz Gt, Distorted Gt, Acoustic Bass, Slap Bass, Synth Bass.  
5. **Synth:** Square, Saw, Warm Pad, Polysynth, Metal Pad, Sweep Pad.  
6. **Piano:** Piano 1-3, Honkytonk, E.Piano 1-2, Harpsichord, Clav, Vibraphone, Marimba.  
7. **SFX:** Ice Rain, Soundtrack, Crystal, Atmosphere, Goblin, Telephone, Helicopter, Gun Shot.  
8. **Others/Drums:** Sitar, Banjo, Koto, Bag Pipe, Steel Drums, Taiko. **Drum Sets (Var 17-24):** Standard, Room, Power, Electronic, TR-808, Jazz, Brush, Orchestra.

## **9\. Error Messages**

* E00: Battery Low (contact service).  
* E01: MIDI or RRC cable disconnected/communication problem.  
* E02: Received MIDI data batch is too large to process.  
* E03: Sequencer memory full (too much recording data).