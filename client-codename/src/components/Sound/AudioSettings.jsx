import React, { useState, useEffect } from 'react';
import { getSoundSettings, setVolume, setSoundEnabled, playSound } from '../../services/soundService';
import SoundButton from './SoundButton';

/**
 * Audio Settings Panel Component
 * Allows users to control sound effects volume and enable/disable audio
 */
const AudioSettings = ({ isOpen, onClose, onSettingsChange }) => {
  const [settings, setSettings] = useState({ isEnabled: true, volume: 0.7 });
  const [tempVolume, setTempVolume] = useState(0.7);

  // Load settings on component mount
  useEffect(() => {
    const currentSettings = getSoundSettings();
    setSettings(currentSettings);
    setTempVolume(currentSettings.volume);
  }, []);

  // Handle enable/disable toggle
  const handleToggleSound = () => {
    const newEnabled = !settings.isEnabled;
    setSoundEnabled(newEnabled);
    const newSettings = { ...settings, isEnabled: newEnabled };
    setSettings(newSettings);
    
    // עדכן את הכפתור הצף
    onSettingsChange?.(newSettings);
    
    // Play test sound when enabling
    if (newEnabled) {
      setTimeout(() => playSound('button-click'), 100);
    }
  };

  // Handle volume change
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setTempVolume(newVolume);
  };

  // Apply volume change (with debouncing)
  const handleVolumeApply = () => {
    setVolume(tempVolume);
    setSettings(prev => ({ ...prev, volume: tempVolume }));
    
    // Play test sound with new volume
    if (settings.isEnabled) {
      playSound('button-click');
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            🔊 הגדרות שמע
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Main Toggle */}
        <div className="mb-6">
          <label className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]">
            <span className="text-gray-700 font-medium">הפעל אפקטי קול</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.isEnabled}
                onChange={handleToggleSound}
                className="sr-only"
              />
              <div 
                className={`w-12 h-6 rounded-full transition-all duration-300 ease-in-out cursor-pointer hover:scale-105 active:scale-95 ${
                  settings.isEnabled ? 'bg-blue-600 hover:bg-blue-700 shadow-lg' : 'bg-gray-300 hover:bg-gray-400'
                }`}
              >
                <div 
                  className={`w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 ease-in-out transform hover:scale-125 ${
                    settings.isEnabled ? 'translate-x-6 scale-110' : 'translate-x-0.5 scale-100'
                  } mt-0.5`}
                  style={{
                    boxShadow: settings.isEnabled 
                      ? '0 4px 12px rgba(59, 130, 246, 0.4)' 
                      : '0 2px 4px rgba(0, 0, 0, 0.1)',
                    background: settings.isEnabled
                      ? 'linear-gradient(145deg, #ffffff, #f0f9ff)'
                      : 'linear-gradient(145deg, #ffffff, #f8fafc)'
                  }}
                />
              </div>
            </div>
          </label>
        </div>

        {/* Volume Control */}
        {settings.isEnabled && (
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">
              עוצמת קול: {Math.round(tempVolume * 100)}%
            </label>
            <div className="flex items-center space-x-3">
              <span className="text-gray-400">🔉</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={tempVolume}
                onChange={handleVolumeChange}
                onMouseUp={handleVolumeApply}
                onTouchEnd={handleVolumeApply}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-gray-400">🔊</span>
            </div>
          </div>
        )}


        {/* Info Text */}
        <div className="text-sm text-gray-600 mb-6 p-3 bg-blue-50 rounded-lg">
          <p>💡 אפקטי הקול מעניקים חוויה משופרת ומספקים משוב מיידי על פעולותיך במשחק.</p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <SoundButton
            variant="primary"
            onClick={onClose}
            className="flex-1"
          >
            סגור
          </SoundButton>
        </div>
      </div>

      {/* Custom CSS for slider */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%; 
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
};

/**
 * Floating Audio Settings Button
 * Small button that opens the audio settings panel
 */
export const AudioSettingsButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState({ isEnabled: true, volume: 0.7 });

  // עדכון מיידי כשהחלון נפתח
  const handleOpenSettings = () => {
    const currentSettings = getSoundSettings();
    setSettings(currentSettings);
    setIsOpen(true);
  };

  useEffect(() => {
    const currentSettings = getSoundSettings();
    setSettings(currentSettings);
  }, [isOpen]); // מתעדכן כל פעם שהחלון נפתח/נסגר

  return (
    <>
      <button
        onClick={handleOpenSettings}
        className={`fixed bottom-4 right-4 w-12 h-12 ${
          settings.isEnabled 
            ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800' 
            : 'bg-red-500 hover:bg-red-600 active:bg-red-700'
        } text-white rounded-full shadow-lg transition-all duration-150 transform hover:scale-110 active:scale-95 z-40 ${
          settings.isEnabled ? 'animate-pulse' : ''
        }`}
        title={settings.isEnabled ? "קול פעיל - לחץ להגדרות" : "קול כבוי - לחץ להפעלה"}
        style={{
          fontSize: '18px',
          animationDuration: settings.isEnabled ? '2s' : '0s'
        }}
      >
        {settings.isEnabled ? '🔊' : '🔇'}
      </button>
      
      <AudioSettings 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        onSettingsChange={(newSettings) => setSettings(newSettings)}
      />
    </>
  );
};

export default AudioSettings;