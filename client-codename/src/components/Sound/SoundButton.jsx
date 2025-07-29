import React from 'react';
import { useSound } from '../../hooks/useSound';

/**
 * Button component with built-in sound effects
 * A wrapper around regular buttons that automatically plays click sounds
 */
const SoundButton = ({ 
  children, 
  onClick, 
  className = "", 
  disabled = false,
  sound = "button-click",
  soundVolume = 1.0,
  variant = "default",
  type = "button",
  ...props 
}) => {
  const { play } = useSound();

  const handleClick = (e) => {
    if (!disabled) {
      // Play sound effect
      play(sound, { volume: soundVolume });
      
      // Call original onClick handler
      if (onClick) {
        onClick(e);
      }
    }
  };

  // Hover sound effects removed to reduce noise

  // Base button styles with variants
  const getVariantClasses = () => {
    switch (variant) {
      case "primary":
        return "bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200";
      case "secondary":
        return "bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors duration-200";
      case "danger":
        return "bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200";
      case "success":
        return "bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200";
      case "team-red":
        return "bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105";
      case "team-blue":
        return "bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105";
      case "ghost":
        return "bg-transparent hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg border border-gray-300 transition-colors duration-200";
      default:
        return "bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors duration-200";
    }
  };

  const disabledClasses = disabled 
    ? "opacity-50 cursor-not-allowed" 
    : "cursor-pointer";

  const combinedClassName = `${getVariantClasses()} ${disabledClasses} ${className}`;

  return (
    <button
      type={type}
      className={combinedClassName}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Icon button variant for smaller actions
 */
export const SoundIconButton = ({ 
  children, 
  onClick, 
  className = "", 
  disabled = false,
  sound = "button-click",
  size = "md",
  ...props 
}) => {
  const { play } = useSound();

  const handleClick = (e) => {
    if (!disabled) {
      play(sound, { volume: 0.8 });
      if (onClick) onClick(e);
    }
  };

  // Hover sound effects removed to reduce noise

  const sizeClasses = {
    sm: "w-8 h-8 p-1",
    md: "w-10 h-10 p-2", 
    lg: "w-12 h-12 p-3"
  };

  const combinedClassName = `
    ${sizeClasses[size]}
    flex items-center justify-center
    rounded-full
    bg-gray-100 hover:bg-gray-200
    text-gray-600 hover:text-gray-800
    transition-all duration-200
    transform hover:scale-110
    ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
    ${className}
  `;

  return (
    <button
      className={combinedClassName}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Special button for team switching with team-specific sounds
 */
export const TeamSwitchButton = ({ team, children, onClick, ...props }) => {
  const { playForTeam } = useSound();

  const handleClick = (e) => {
    playForTeam('team-switch', team);
    if (onClick) onClick(e);
  };

  const variant = team === 'Red' ? 'team-red' : 'team-blue';

  return (
    <SoundButton
      variant={variant}
      onClick={handleClick}
      sound="team-switch" // This will be overridden by our custom handler
      {...props}
    >
      {children}
    </SoundButton>
  );
};

export default SoundButton;