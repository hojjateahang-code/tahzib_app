import React, { useState, useEffect, useRef, useCallback } from 'react';

interface DebouncedTextInputProps {
  initialValue?: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  type?: string;
  debounceMs?: number;
}

export const DebouncedTextInput: React.FC<DebouncedTextInputProps> = ({
  initialValue = '',
  onSave,
  placeholder,
  className,
  disabled = false,
  type = 'text',
  debounceMs = 500,
}) => {
  const [value, setValue] = useState(initialValue || '');
  const timerRef = useRef<any>(null);
  const isComposingRef = useRef(false);
  const lastSavedRef = useRef(initialValue || '');
  const latestValueRef = useRef(value);

  // Keep latestValueRef in sync
  latestValueRef.current = value;

  // Sync external changes (e.g., date change or switching assessment record)
  useEffect(() => {
    setValue(initialValue || '');
    lastSavedRef.current = initialValue || '';
  }, [initialValue]);

  const flushSave = useCallback((valToSave: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (valToSave !== lastSavedRef.current) {
      lastSavedRef.current = valToSave;
      onSave(valToSave);
    }
  }, [onSave]);

  // Flush on unmount if pending
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        if (latestValueRef.current !== lastSavedRef.current) {
          onSave(latestValueRef.current);
        }
      }
    };
  }, [onSave]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setValue(nextVal);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      if (!isComposingRef.current) {
        flushSave(nextVal);
      }
    }, debounceMs);
  };

  const handleBlur = () => {
    flushSave(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      flushSave(value);
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    const nextVal = (e.target as HTMLInputElement).value;
    setValue(nextVal);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      flushSave(nextVal);
    }, debounceMs);
  };

  return (
    <input
      type={type}
      dir="rtl"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
    />
  );
};
