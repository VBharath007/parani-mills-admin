/**
 * Professional AI Voice Assistant in TAMIL (தமிழ்) & Zero-Latency Audio
 * 1. Primary: Google Tamil AI Voice (Streams pure Tamil, No software install needed!)
 * 2. Fallback: Browser Web Speech API (ta-IN or en-IN)
 * 3. Smart Product Name Cleaner: Strips confusing SKU model codes so name sounds clear.
 */

class VoiceAssistant {
  constructor() {
    this.isMuted = true;
    this.currentAudio = null;
    this.tamilVoice = null;
    this.fallbackVoice = null;
    this.initVoice();
  }

  initVoice() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const pickBestVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      // Look for offline Tamil Voice if available on device
      this.tamilVoice = voices.find(v => 
        (v.lang && (v.lang.toLowerCase().startsWith('ta') || v.lang.toLowerCase().includes('ta-in'))) ||
        (v.name && v.name.toLowerCase().includes('tamil'))
      ) || null;

      // Fallback voice
      this.fallbackVoice = voices.find(v => 
        v.lang === 'en-IN' || (v.name && v.name.includes('India'))
      ) || voices.find(v => 
        (v.name.includes('Natural') || v.name.includes('Online')) && v.lang.startsWith('en')
      ) || voices.find(v => 
        (v.name.includes('Google') || v.name.includes('Jenny') || v.name.includes('Zira')) && v.lang.startsWith('en')
      ) || voices[0];
    };

    pickBestVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = pickBestVoices;
    }
  }

  isVoiceMuted() {
    return this.isMuted;
  }

  setVoiceMuted(muted) {
    this.isMuted = muted;
    localStorage.setItem('admin_ai_voice_muted', muted ? 'true' : 'false');
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (muted && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  toggleVoice() {
    const nextState = !this.isMuted;
    this.setVoiceMuted(nextState);
    if (!nextState) {
      this.speakTamil('தமிழ் குரல் உதவியாளர் இயக்கப்பட்டது', 'Tamil Voice assistant activated');
    }
    return !nextState;
  }

  /**
   * Cleans product names so speech sounds crisp, clear, and human-like.
   * Removes messy model numbers, RAPL- codes, dashes, suffixes like "- DETAIL".
   * E.g. "LONG TEETH SEEDER - RAPL-MS-12T LONG - DETAIL" -> "Long Teeth Seeder"
   */
  cleanProductName(raw) {
    if (!raw) return '';
    let name = raw.toString().trim();

    // Remove category prefix if passed as 'category "XYZ"'
    name = name.replace(/^category\s*["']?/i, '').replace(/["']?$/i, '');

    // Remove noise words and codes
    name = name.replace(/\s*-\s*detail\b/gi, '');
    name = name.replace(/\(detail\)/gi, '');
    name = name.replace(/\s*-\s*rapl[\w-]*\b/gi, '');

    // Split on hyphens / slashes / dashes and take the primary human readable name
    const parts = name.split(/\s+[-–—/]\s+/);
    if (parts.length > 1 && parts[0].trim().length >= 4) {
      name = parts[0].trim();
    }

    // Remove brackets, asterisks, hashtags
    name = name.replace(/[[\](){}_#*]/g, ' ').replace(/\s+/g, ' ').trim();

    // Format into clean title casing for smooth speech flow
    name = name.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());

    return name;
  }

  // Play professional audio frequencies using Web Audio API
  playTone(type) {
    if (this.isMuted) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'delete_step1') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.28);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      } else if (type === 'delete_step2') {
        [0, 0.15].forEach(timeOffset => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(650, ctx.currentTime + timeOffset);
          osc.frequency.setValueAtTime(820, ctx.currentTime + timeOffset + 0.08);
          gain.gain.setValueAtTime(0.3, ctx.currentTime + timeOffset);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + timeOffset + 0.14);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + timeOffset);
          osc.stop(ctx.currentTime + timeOffset + 0.14);
        });
      } else if (type === 'edit_step1') {
        [523.25, 659.25].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
          gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.1);
          osc.stop(ctx.currentTime + idx * 0.1 + 0.2);
        });
      } else if (type === 'edit_step2') {
        [659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.28, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.25);
        });
      } else if (type === 'success') {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
          gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.07);
          osc.stop(ctx.currentTime + idx * 0.07 + 0.3);
        });
      }
    } catch (e) {
      console.warn('Audio tone error:', e);
    }
  }

  /**
   * Speaks in Pure Tamil.
   * Method 1: Google Tamil AI Voice (Direct stream - 100% pure Tamil without installing any software!)
   * Method 2: Offline fallback to Web Speech API
   */
  speakTamil(tamilText, tanglishFallbackText) {
    if (this.isMuted || typeof window === 'undefined') return;

    try {
      // Stop previous audio / speech
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      // 1. Backend-proxied Google Tamil Voice Stream (Zero software installation, No 404 blocks!)
      const baseHost = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:5001';
      const apiBase = baseHost.endsWith('/api') ? baseHost : `${baseHost}/api`;
      const backendTtsUrl = `${apiBase}/tts?text=${encodeURIComponent(tamilText)}`;
      const audio = new Audio(backendTtsUrl);
      audio.playbackRate = 1.0;
      this.currentAudio = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Backend Tamil TTS audio play fallback:', err);
          this.speakLocalSpeech(tamilText, tanglishFallbackText);
        });
      }
    } catch (e) {
      console.warn('Tamil TTS error, using local fallback:', e);
      this.speakLocalSpeech(tamilText, tanglishFallbackText);
    }
  }

  // Fallback to local device Speech API if offline
  speakLocalSpeech(tamilText, tanglishFallbackText) {
    if (this.isMuted || typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
      const useTamilVoice = Boolean(this.tamilVoice);
      const textToSpeak = useTamilVoice ? tamilText : (tanglishFallbackText || tamilText);
      const utterance = new SpeechSynthesisUtterance(textToSpeak);

      if (useTamilVoice) {
        utterance.voice = this.tamilVoice;
        utterance.lang = 'ta-IN';
        utterance.rate = 0.95;
      } else {
        if (this.fallbackVoice) {
          utterance.voice = this.fallbackVoice;
        }
        utterance.lang = 'en-IN';
        utterance.rate = 1.0;
      }

      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  // General notify wrapper
  notify(actionType, voicePhrase) {
    this.playTone(actionType);
    if (voicePhrase) {
      setTimeout(() => {
        this.speakTamil(voicePhrase, voicePhrase);
      }, 120);
    }
  }

  // --- SPECIALIZED TAMIL VOICE ANNOUNCEMENTS ---

  /**
   * Edit Step 1: "நீங்கள் [பொருள் பெயர்]-ஐ மாற்ற விரும்புகிறீர்களா?"
   */
  notifyEditStep1(rawName = '') {
    this.playTone('edit_step1');
    const clean = this.cleanProductName(rawName);
    
    setTimeout(() => {
      if (clean) {
        this.speakTamil(
          `நீங்கள் ${clean} ஐ மாற்ற விரும்புகிறீர்களா?`,
          `Are you sure you want to edit ${clean}?`
        );
      } else {
        this.speakTamil(
          'நீங்கள் மாற்ற விரும்புகிறீர்களா?',
          'Are you sure you want to edit?'
        );
      }
    }, 120);
  }

  /**
   * Edit Step 2: "உங்கள் மாற்றங்களை உறுதிப்படுத்தவும்."
   */
  notifyEditStep2() {
    this.playTone('edit_step2');
    setTimeout(() => {
      this.speakTamil(
        'உங்கள் மாற்றங்களை உறுதிப்படுத்தவும்.',
        'Please confirm your changes.'
      );
    }, 120);
  }

  /**
   * Delete Step 1: "எச்சரிக்கை! நீங்கள் [பொருள் பெயர்]-ஐ நீக்க விரும்புகிறீர்களா?"
   */
  notifyDeleteStep1(rawName = '') {
    this.playTone('delete_step1');
    const clean = this.cleanProductName(rawName);

    setTimeout(() => {
      if (clean) {
        this.speakTamil(
          `எச்சரிக்கை! நீங்கள் ${clean} ஐ நீக்க விரும்புகிறீர்களா?`,
          `Warning! Are you sure you want to delete ${clean}?`
        );
      } else {
        this.speakTamil(
          'எச்சரிக்கை! நீங்கள் நீக்க விரும்புகிறீர்களா?',
          'Warning! Are you sure you want to delete?'
        );
      }
    }, 120);
  }

  /**
   * Delete Step 2: "கடைசி எச்சரிக்கை! இது நிரந்தரமாக நீக்கப்படும்."
   */
  notifyDeleteStep2() {
    this.playTone('delete_step2');
    setTimeout(() => {
      this.speakTamil(
        'கடைசி எச்சரிக்கை! இது நிரந்தரமாக நீக்கப்படும்.',
        'Final warning! This action is permanent.'
      );
    }, 120);
  }

  /**
   * Success: "வெற்றிகரமாக முடிந்தது!"
   */
  notifySuccess(tamilMessage = 'வெற்றிகரமாக சேமிக்கப்பட்டது.', englishFallback = 'Success! Changes have been saved.') {
    this.playTone('success');
    setTimeout(() => {
      this.speakTamil(tamilMessage, englishFallback);
    }, 120);
  }
}

export const aiVoice = new VoiceAssistant();
export default aiVoice;
