import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import styles from './DropdownSelect.module.css';

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
}

export function DropdownSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  size = 'default',
  align = 'start',
}: {
  label: string;
  value: T;
  options: readonly DropdownOption<T>[];
  onChange: (value: T) => void;
  size?: 'default' | 'compact';
  align?: 'start' | 'end';
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [placement, setPlacement] = useState<'above' | 'below'>('below');
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const listId = useId();
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    optionRefs.current[focusIndex ?? Math.max(selectedIndex, 0)]?.focus();
  }, [focusIndex, open, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const triggerBounds = triggerRef.current?.getBoundingClientRect();
    const menuBounds = menuRef.current?.getBoundingClientRect();
    if (!triggerBounds || !menuBounds) return;
    const roomBelow = window.innerHeight - triggerBounds.bottom;
    const roomAbove = triggerBounds.top;
    setPlacement(roomBelow < menuBounds.height + 7 && roomAbove > roomBelow ? 'above' : 'below');
  }, [open]);

  function openAt(index: number): void {
    setFocusIndex(index);
    setOpen(true);
  }

  function close(restoreFocus: boolean): void {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }

  function choose(option: DropdownOption<T>): void {
    onChange(option.value);
    close(true);
  }

  function moveFocus(index: number): void {
    const next = (index + options.length) % options.length;
    setFocusIndex(next);
    optionRefs.current[next]?.focus();
  }

  return (
    <div
      className={styles.root}
      data-size={size}
      data-align={align}
      data-open={open}
      data-placement={placement}
      ref={rootRef}
    >
      <button
        ref={triggerRef}
        className={styles.trigger}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? close(false) : openAt(Math.max(selectedIndex, 0)))}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            openAt(event.key === 'ArrowDown' ? Math.max(selectedIndex, 0) : options.length - 1);
          } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            openAt(event.key === 'Home' ? 0 : options.length - 1);
          } else if (event.key === 'Escape' && open) {
            event.preventDefault();
            close(true);
          }
        }}
      >
        <span>{selected?.label ?? '请选择'}</span>
        <ChevronDown size={17} aria-hidden="true" />
      </button>
      {open ? (
        <div id={listId} className={styles.menu} role="listbox" aria-label={label} ref={menuRef}>
          {options.map((option, index) => (
            <div
              key={option.value}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              className={styles.option}
              role="option"
              aria-selected={option.value === value}
              tabIndex={index === focusIndex ? 0 : -1}
              onClick={() => choose(option)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault();
                  moveFocus(index + (event.key === 'ArrowDown' ? 1 : -1));
                } else if (event.key === 'Home' || event.key === 'End') {
                  event.preventDefault();
                  moveFocus(event.key === 'Home' ? 0 : options.length - 1);
                } else if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  choose(option);
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  close(true);
                } else if (event.key === 'Tab') {
                  close(false);
                }
              }}
            >
              <span>{option.label}</span>
              {option.value === value ? <Check size={16} aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
