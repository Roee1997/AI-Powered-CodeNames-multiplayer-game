// toastService.js
import { toast } from 'react-toastify';
import { playSound } from './soundService';

export const showToast = (message, type = "info", options = {}) => {
  // Play sound based on toast type (unless disabled)
  if (options.playSound !== false) {
    switch (type) {
      case "success":
        playSound('toast-success');
        break;
      case "error":
        playSound('toast-error');
        break;
      case "warning":
        playSound('toast-warning');
        break;
      default:
        playSound('toast-info');
    }
  }

  // Show the toast
  switch (type) {
    case "success":
      toast.success(message, options);
      break;
    case "error":
      toast.error(message, options);
      break;
    case "warning":
      toast.warning(message, options);
      break;
    default:
      toast(message, options);
  }
};

// Enhanced toast functions with built-in sound support
export const showSuccessToast = (message, options = {}) => {
  showToast(message, "success", options);
};

export const showErrorToast = (message, options = {}) => {
  showToast(message, "error", options);
};

export const showWarningToast = (message, options = {}) => {
  showToast(message, "warning", options);
};

export const showInfoToast = (message, options = {}) => {
  showToast(message, "info", options);
};

// Silent versions (no sound)
export const showSilentToast = (message, type = "info", options = {}) => {
  showToast(message, type, { ...options, playSound: false });
};
