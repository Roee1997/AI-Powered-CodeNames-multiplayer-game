/**
 * Smart Audio File Sound Service
 * Tries multiple paths to find your audio files
 */

class SmartAudioService {
  constructor() {
    this.isEnabled = true;
    this.volume = 0.7;
    this.isInitialized = true;
    
    this.activeAudios = new Set();
    this.audioCache = new Map();
    this.failedFiles = new Set();
    this.gameEndPlaying = false; // מגן מפני צלילי סיום מרובים
    this.lastGameEndSound = null; // מעקב אחר הצליל האחרון
    
    this.loadSettings();
    
    // נתיבים אפשריים לבדיקה - מדרגים שרת המכללה ראשון
    this.possiblePaths = [
      '/cgroup81/test2/tar5/sounds/',       // נתיב שרת המכללה עיקרי - ראשון!
      '/sounds/',                           // נתיב עיקרי ב-public
      './sounds/',          
      'sounds/',
      '/public/sounds/',
      '/cgroup81/test2/tar5/public/sounds/', // נתיב שרת המכללה public
      './public/sounds/',
      'public/sounds/',
      '/src/assets/sounds/',                // גיבוי למקרה
      '/assets/sounds/',
      '/cgroup81/test2/tar5/assets/sounds/' // נתיב שרת המכללה assets
    ];
    
    // קבצי הקול הנדרשים
    this.soundKeys = [
      'card-click', 'card-reveal',
      'turn-change', 'game-start', 'victory', 'defeat',
      'success', 'error', 'assassin',
      'button-click', 'notification',
      'clue', 'timer-tick'  // רמז חדש (clue.mp3) וטיק של טיימר
    ];
    
    this.detectSoundFiles();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('codenames-audio-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.isEnabled = settings.isEnabled ?? true;
        this.volume = settings.volume ?? 0.7;
      }
    } catch (error) {
      console.warn('Failed to load audio settings');
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('codenames-audio-settings', JSON.stringify({
        isEnabled: this.isEnabled,
        volume: this.volume
      }));
    } catch (error) {
      console.warn('Failed to save audio settings');
    }
  }

  // בדיקה אוטומטית לקבצי קול
  async detectSoundFiles() {
    const foundFiles = {};
    
    // אתחל את this.soundFiles כדי למנוע שגיאות
    this.soundFiles = {};
    
    for (const soundKey of this.soundKeys) {
      for (const basePath of this.possiblePaths) {
        for (const ext of ['mp3', 'wav', 'ogg']) {
          const fullPath = `${basePath}${soundKey}.${ext}`;
          
          try {
            const response = await fetch(fullPath, { method: 'HEAD' });
            if (response.ok) {
              foundFiles[soundKey] = fullPath;
              console.log(`✅ Found sound: ${soundKey} at ${fullPath}`);
              break;
            }
          } catch (error) {
            // Silent - continue checking
          }
        }
        if (foundFiles[soundKey]) break;
      }
      
      if (!foundFiles[soundKey]) {
        console.warn(`❌ Missing: ${soundKey}.mp3`);
      }
    }

    this.soundFiles = foundFiles;
    
    // If no sounds found at all, disable sound system to prevent 404 spam
    const foundCount = Object.keys(foundFiles).length;
    if (foundCount === 0) {
      console.warn('🔇 No sound files found - disabling sound system to prevent 404 errors');
      this.isEnabled = false;
      return;
    }
    
    console.log(`🎵 Found ${foundCount}/${this.soundKeys.length} sound files`);
    
    // Add aliases
    this.soundFiles['toast-success'] = foundFiles['success'];
    this.soundFiles['toast-error'] = foundFiles['error'];
    
    // מיפוי עבור הצלילים החדשים
    if (foundFiles['clue']) {
      this.soundFiles['new-clue'] = foundFiles['clue'];
    }
    if (foundFiles['error']) {
      this.soundFiles['guess-wrong'] = foundFiles['error'];
      this.soundFiles['neutral'] = foundFiles['error']; // neutral משתמש באותו צליל כמו guess-wrong
    }
    this.soundFiles['toast-info'] = foundFiles['notification'];
    this.soundFiles['toast-warning'] = foundFiles['error'];
    this.soundFiles['clue-success'] = foundFiles['success'];
    this.soundFiles['clue-error'] = foundFiles['error'];
    this.soundFiles['clue-submit'] = foundFiles['notification'];
    this.soundFiles['player-join'] = foundFiles['success'];
    this.soundFiles['player-leave'] = foundFiles['error'];
    this.soundFiles['guess-correct'] = foundFiles['success'];
    this.soundFiles['guess-wrong'] = foundFiles['error'];
    this.soundFiles['guess-neutral'] = foundFiles['neutral'];
    this.soundFiles['guess-assassin'] = foundFiles['assassin'];
    this.soundFiles['game-end-win'] = foundFiles['victory'];
    this.soundFiles['game-end-lose'] = foundFiles['defeat'];
    this.soundFiles['assassin-dramatic'] = foundFiles['assassin'];

    // Sound files detected and mapped
  }

  async playAudioFile(filePath, options = {}) {
    if (!this.shouldPlay() || !filePath) return Promise.resolve();

    return new Promise((resolve) => {
      try {
        const audio = new Audio(filePath);
        
        // Set volume
        const volume = (options.volume ?? 1) * this.volume;
        audio.volume = Math.max(0, Math.min(1, volume));
        
        this.activeAudios.add(audio);
        
        // סמן צלילים קריטיים שלא צריכים להיפסק
        if (options.critical) {
          audio._isCritical = true;
        }
        
        const cleanup = (isEnded = false) => {
          this.activeAudios.delete(audio);
          audio.removeEventListener('ended', cleanup);
          audio.removeEventListener('error', cleanup);
          
          // בטל את טיימר הגיבוי כשהצליל מסתיים בעצמו
          if (cleanupTimer) {
            clearTimeout(cleanupTimer);
            cleanupTimer = null;
          }
          
          // קרא לcallback אם הצליל הסתיים טבעית (לא מטעות)
          if (isEnded && options.onComplete) {
            try {
              options.onComplete();
            } catch (error) {
              console.error('🔊 שגיאה בcallback של סיום צליל:', error);
            }
          }
          
          resolve();
        };
        
        audio.addEventListener('ended', () => cleanup(true)); // צליל הסתיים טבעית
        audio.addEventListener('error', () => cleanup(false)); // שגיאה - לא צליל טבעי
        
        // Auto-cleanup רק בעתירה למניעת צלילים תקועים - יתבטל כשהצליל מסתיים
        let maxDuration = options.maxDuration || null;
        let cleanupTimer = null;
        
        // אם לא צוין זמן מקסימלי, נחכה לאורך הקובץ האמיתי
        if (!maxDuration) {
          // ברירת מחדל רק למניעת צלילים תקועים - זמן ארוך מאוד
          maxDuration = 300000; // 5 דקות מקסימום (גיבוי בלבד)
          
          // אבל נמנע מטיימר אם זה צליל קריטי
          if (options.critical) {
            // לצלילים קריטיים - רק ברירת מחדל של גיבוי (600 שניות)
            maxDuration = 600000; // 10 דקות - רק אם משהו השתבש
          }
        }
        
        // טיימר גיבוי למניעת צלילים תקועים (רק אם הקובץ לא יסתיים בעצמו)
        cleanupTimer = setTimeout(() => {
          if (this.activeAudios.has(audio)) {
            console.warn(`🔇 Audio cleanup timeout for ${filePath} - forcing stop`);
            audio.pause();
            audio.currentTime = 0;
            cleanup();
          }
        }, maxDuration);
        
        audio.play().catch(error => {
          if (!this.failedFiles.has(filePath)) {
            console.warn(`Failed to play: ${filePath}`);
            this.failedFiles.add(filePath);
          }
          cleanup();
        });
        
      } catch (error) {
        resolve();
      }
    });
  }

  shouldPlay() {
    return this.isEnabled && this.isInitialized;
  }

  async play(soundKey, options = {}) {
    // מפה את הצליל למקביל הנכון
    const mappedKey = this.mapSoundKey(soundKey);
    
    // עבור מנגינות ניצחון/הפסד - סמן כקריטיים אבל תן להם להתנגן לפי האורך הטבעי
    const criticalSounds = ['victory', 'defeat', 'game-end-win', 'game-end-lose', 'assassin'];
    if (criticalSounds.includes(mappedKey)) {
      options.critical = true; // סימון כצליל קריטי
    }
    
    const filePath = this.soundFiles[mappedKey];
    
    if (!filePath) {
      return this.playFallbackSound(soundKey, options);
    }
    
    return this.playAudioFile(filePath, options);
  }

  // צליל "פופ" מיוחד לכפתורים
  playButtonPopSound(audioContext, options = {}) {
    return new Promise((resolve) => {
      try {
        // יצירת צליל דו-טוני נעים
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // חיבור
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // תדרים הרמוניים
        oscillator1.frequency.value = 523.25; // C5
        oscillator2.frequency.value = 659.25; // E5
        
        oscillator1.type = 'sine';
        oscillator2.type = 'sine';
        
        const volume = (options.volume ?? 1) * this.volume * 0.12;
        
        // Envelope נעים עם קפיצה
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.002); // התחלה מהירה
        gainNode.gain.exponentialRampToValueAtTime(volume * 0.4, audioContext.currentTime + 0.02); // קפיצה
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08); // דעיכה חלקה
        
        oscillator1.start(audioContext.currentTime);
        oscillator2.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.08);
        oscillator2.stop(audioContext.currentTime + 0.08);
        
        setTimeout(resolve, 80);
      } catch (error) {
        resolve();
      }
    });
  }

  // מיפוי מיוחד לקבצים עם שמות שונים
  mapSoundKey(soundKey) {
    const mapping = {
      'new-clue': 'clue',        // clue.mp3 -> new-clue
      'neutral': 'error',        // error.mp3 -> neutral (כמו ניחוש שגוי)
      'guess-wrong': 'error'     // error.mp3 -> guess-wrong
    };
    
    return mapping[soundKey] || soundKey;
  }

  // צליל גיבוי סינתטי לקבצים חסרים
  playFallbackSound(soundKey, options = {}) {
    if (!window.AudioContext && !window.webkitAudioContext) {
      return Promise.resolve();
    }

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // תדרים לפי סוג הצליל
      let frequency = 440;
      let duration = 100;
      
      switch (soundKey) {
        case 'card-hover':
          frequency = 1200;
          duration = 80;
          break;
        case 'button-click':
          // צליל "פופ" נעים - שני תדרים
          return this.playButtonPopSound(audioContext, options);
          break;
        // button-hover removed to reduce noise
        case 'neutral':
          frequency = 440;
          duration = 200;
          break;
        case 'team-switch':
          frequency = 600;
          duration = 150;
          break;
        case 'victory':
          frequency = 700; // נעים לניצחון
          duration = 800;  // יותר ארוך אבל לא אינסופי
          break;
        case 'defeat':
          frequency = 300; // נמוך יותר להפסד
          duration = 800;  // יותר ארוך אבל לא אינסופי
          break;
        default:
          frequency = 440;
          duration = 100;
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      
      oscillator.type = 'triangle';
      
      const volume = (options.volume ?? 1) * this.volume * 0.1;
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
      
    } catch (error) {
      // Silent fail
    }
    
    return Promise.resolve();
  }

  async playTeamSound(baseSoundKey, team, options = {}) {
    // Check for team-specific file first
    const teamSpecificKey = `${baseSoundKey}-${team.toLowerCase()}`;
    if (this.soundFiles[teamSpecificKey]) {
      return this.play(teamSpecificKey, options);
    }
    
    // Fallback with team volume adjustment
    const teamOptions = { ...options };
    switch (team) {
      case 'Red':
        teamOptions.volume = (options.volume ?? 1) * 0.9;
        break;
      case 'Blue':
        teamOptions.volume = (options.volume ?? 1) * 1.1;
        break;
      case 'Assassin':
        teamOptions.volume = (options.volume ?? 1) * 1.3;
        break;
    }
    
    return this.play(baseSoundKey, teamOptions);
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    this.saveSettings();
    if (!enabled) {
      this.stopAll();
    }
  }

  stopAll(force = false) {
    const audiosToStop = new Set(this.activeAudios);
    
    audiosToStop.forEach(audio => {
      try {
        // אל תעצור צלילים קריטיים אלא אם זה בכוח
        if (!force && audio._isCritical) {
          return;
        }
        
        audio.pause();
        audio.currentTime = 0;
        this.activeAudios.delete(audio);
      } catch (error) {
        // Silent
      }
    });
    
    // נקה רק צלילים שלא קריטיים
    if (!force) {
      const criticalAudios = new Set();
      this.activeAudios.forEach(audio => {
        if (audio._isCritical) {
          criticalAudios.add(audio);
        }
      });
      this.activeAudios = criticalAudios;
    } else {
      this.activeAudios.clear();
    }
  }

  stopCardSounds() {
    // ספור רק צלילים שלא קריטיים
    const nonCriticalCount = Array.from(this.activeAudios).filter(audio => !audio._isCritical).length;
    
    if (nonCriticalCount > 3) {
      this.stopAll(false); // לא בכוח - ישמור צלילים קריטיים
    }
  }

  // אפס את מצב צלילי סיום המשחק - לקרוא כשמתחיל משחק חדש
  resetGameEndState() {
    this.gameEndPlaying = false;
    this.lastGameEndSound = null;
  }

  // פונקציה מאופטמת לסיום משחק - עם הגנה מפני ביצועים איטיים
  async playGameEndSoundOptimized(isVictory) {
    const currentSound = isVictory ? 'victory' : 'defeat';
    
    // מגן מפני צלילים מרובים שיכולים לגרום לביצועים איטיים
    if (this.gameEndPlaying) {
      return Promise.resolve();
    }
    
    // מגן מפני אותו צליל פעמיים
    if (this.lastGameEndSound === currentSound) {
      return Promise.resolve();
    }
    
    this.gameEndPlaying = true;
    this.lastGameEndSound = currentSound; // שמור את הצליל הנוכחי
    
    // עצור ונקה את כל הצלילים (כולל קריטיים) לפני הסיום
    this.stopAll(true); 
    
    const soundKey = isVictory ? 'victory' : 'defeat';
    const mappedKey = this.mapSoundKey(soundKey);
    const filePath = this.soundFiles[mappedKey];
    
    if (!filePath) {
      const result = await this.playFallbackSound(soundKey, { volume: 1.0 });
      this.gameEndPlaying = false;
      return result;
    }
    
    // נגן עם ניקוי אוטומטי
    const result = this.playAudioFile(filePath, {
      critical: true,
      volume: 1.0,
      onComplete: () => {
        this.gameEndPlaying = false;
      }
    });
    
    return result;
  }

  // פונקציה מיוחדת לסיום משחק - מנגינה מלאה לפי אורך הקובץ
  async playGameEndSound(isVictory, onComplete = null) {
    // עצור צלילים אחרים (לא קריטיים) לפני המנגינה
    this.stopAll(false);
    
    const soundKey = isVictory ? 'victory' : 'defeat';
    const mappedKey = this.mapSoundKey(soundKey);
    const filePath = this.soundFiles[mappedKey];
    
    if (!filePath) {
      const result = await this.playFallbackSound(soundKey, { volume: 1.0 });
      if (onComplete) onComplete(); // קרא ל-callback גם לצליל סינתטי
      return result;
    }
    
    // נגן עם callback מיוחד לסיום
    return this.playAudioFile(filePath, {
      critical: true, // צליל קריטי - לא יעצר
      volume: 1.0,    // עוצמה מלאה
      onComplete: onComplete // callback כשהצליל מסתיים
      // maxDuration לא מוגדר - יתנגן לפי אורך הקובץ הטבעי
    });
  }

  getSettings() {
    return {
      isEnabled: this.isEnabled,
      volume: this.volume
    };
  }

  async preloadAll() {
    // וודא שהקבצים אותרו לפני הטעינה מראש
    if (!this.soundFiles) {
      await this.detectSoundFiles();
    }
    
    const loadPromises = Object.entries(this.soundFiles || {})
      .filter(([_, path]) => path) // Only files that exist
      .map(([key, filePath]) => {
        return new Promise((resolve) => {
          const audio = new Audio(filePath);
          audio.preload = 'auto';
          
          const onLoad = () => {
            this.audioCache.set(filePath, audio);
            audio.removeEventListener('canplaythrough', onLoad);
            audio.removeEventListener('error', onError);
            resolve();
          };
          
          const onError = () => {
            audio.removeEventListener('canplaythrough', onLoad);
            audio.removeEventListener('error', onError);
            resolve();
          };
          
          audio.addEventListener('canplaythrough', onLoad);
          audio.addEventListener('error', onError);
          
          setTimeout(() => onError(), 3000);
        });
      });
    
    await Promise.all(loadPromises);
  }
}

// Create singleton instance
const smartAudioService = new SmartAudioService();

// Export functions
export const playSound = (soundKey, options) => smartAudioService.play(soundKey, options);
export const playTeamSound = (soundKey, team, options) => smartAudioService.playTeamSound(soundKey, team, options);
export const playGameEndSound = (isVictory, onComplete) => smartAudioService.playGameEndSound(isVictory, onComplete); // פונקציה חדשה!
export const playGameEndSoundOptimized = (isVictory) => smartAudioService.playGameEndSoundOptimized(isVictory); // אופטימיזציה לביצועים
export const resetGameEndState = () => smartAudioService.resetGameEndState(); // איפוס מצב צלילי סיום
export const setVolume = (volume) => smartAudioService.setVolume(volume);
export const setSoundEnabled = (enabled) => smartAudioService.setEnabled(enabled);
export const getSoundSettings = () => smartAudioService.getSettings();
export const preloadAllSounds = () => smartAudioService.preloadAll();
export const stopAllSounds = (force) => smartAudioService.stopAll(force);

export default smartAudioService;