import { useCallback, useEffect, useRef } from 'react';
import { playSound, playTeamSound, getSoundSettings } from '../services/soundService';

/**
 * Custom React hook for playing sounds in components
 * Provides easy-to-use functions for common sound patterns
 */
export const useSound = () => {
  const lastPlayTime = useRef({});

  // Debounce function to prevent rapid-fire sounds
  const shouldPlay = useCallback((soundKey, minInterval = 100) => {
    const now = Date.now();
    const lastTime = lastPlayTime.current[soundKey] || 0;
    
    // בינתיים בלי חסימה מיוחדת - אין קבצי קול ממילא
    // if (soundKey.includes('card')) {
    //   minInterval = Math.max(minInterval, 100);
    // }
    
    if (now - lastTime < minInterval) {
      // ביטלנו את הלוג כדי להפסיק את הספאם
      return false;
    }
    
    lastPlayTime.current[soundKey] = now;
    return true;
  }, []);

  // Play a sound with debouncing
  const play = useCallback((soundKey, options = {}) => {
    const minInterval = options.minInterval || 100;
    
    // Use unique debounce key for AI guesses to prevent interference
    const debounceKey = options.aiGuess ? `ai-${soundKey}` : soundKey;
    
    if (!shouldPlay(debounceKey, minInterval)) {
      return;
    }
    
    playSound(soundKey, options);
  }, [shouldPlay]);

  // Play team-specific sound
  const playForTeam = useCallback((soundKey, team, options = {}) => {
    const minInterval = options.minInterval || 100;
    
    // Use unique debounce key for AI guesses to prevent interference
    const baseKey = `${soundKey}-${team}`;
    const debounceKey = options.aiGuess ? `ai-${baseKey}` : baseKey;
    
    if (!shouldPlay(debounceKey, minInterval)) {
      return;
    }
    
    playTeamSound(soundKey, team, options);
  }, [shouldPlay]);

  // Common sound patterns
  const sounds = {
    // Card interactions - אין קבצי אודיו אז חסימה מינימלית
    cardClick: (team) => playForTeam('card-click', team, { minInterval: 50 }),
    cardReveal: (team) => playForTeam('card-reveal', team, { minInterval: 50 }),
    cardHover: () => {}, // Silent - no sound file available
    
    // Game state
    turnChange: () => play('turn-change'),
    gameStart: () => play('game-start'),
    victory: () => play('victory'),
    defeat: () => play('defeat'),
    
    // Timer sounds
    timerTick: () => play('timer-tick', { volume: 0.4 }),
    timerWarning: () => play('timer-warning'),
    timerEnd: () => play('timer-end'),
    
    // Guess results
    correctGuess: (team) => playForTeam('guess-correct', team),
    wrongGuess: () => play('guess-wrong'), // צליל אחיד לכל הניחושים השגויים
    neutralGuess: () => play('guess-wrong'), // אותו צליל כמו ניחוש שגוי
    assassinHit: () => play('guess-assassin', { volume: 1.2 }),
    
    // Clue system
    clueSubmit: () => play('clue-submit'),
    clueSuccess: () => play('clue-success'),
    clueError: () => play('clue-error'),
    newClue: () => {
      console.log('🎯 useSound.newClue() נקרא');
      return play('new-clue');
    }, // צליל חדש לרמז חדש ללוח
    
    // UI interactions
    buttonClick: () => play('button-click', { minInterval: 50 }),
    teamSwitch: () => {}, // Silent - no sound file available
    notification: () => play('notification'),
    
    // Player events
    playerJoin: () => play('player-join'),
    playerLeave: () => play('player-leave'),
    
    // Toast notifications
    toastSuccess: () => play('toast-success'),
    toastError: () => play('toast-error'),
    toastInfo: () => play('toast-info'),
    toastWarning: () => play('toast-warning'),
  };

  return {
    play,
    playForTeam,
    ...sounds
  };
};

/**
 * Hook for components that need to know sound settings
 */
export const useSoundSettings = () => {
  const settings = getSoundSettings();
  return settings;
};

/**
 * Hook for managing sound effects in game components
 * Automatically handles game-specific logic
 */
export const useGameSounds = ({ gameState, userTeam, currentTurn } = {}) => {
  const sound = useSound();
  const prevGameState = useRef(gameState);
  const prevTurn = useRef(currentTurn);

  // Auto-play sounds based on game state changes
  useEffect(() => {
    // Game state changes
    if (prevGameState.current !== gameState) {
      switch (gameState) {
        case 'playing':
          if (prevGameState.current === 'lobby') {
            sound.gameStart();
          }
          break;
        case 'finished':
          // Victory/defeat will be handled by the component
          break;
      }
      prevGameState.current = gameState;
    }

    // Turn changes
    if (prevTurn.current !== currentTurn && currentTurn) {
      if (prevTurn.current) { // Don't play on initial load
        sound.turnChange();
      }
      prevTurn.current = currentTurn;
    }
  }, [gameState, currentTurn, sound]);

  return sound;
};

export default useSound;