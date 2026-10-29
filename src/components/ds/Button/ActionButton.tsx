'use client';

import React from 'react';

import { useLinkComponent } from '../LinkProvider';
import { Button, type ButtonProps } from './Button';

/** What an action object carries to do something: a click handler, a destination, or both (the link also calls `onSelect`). */
export type ActionTarget =
  | { onSelect: () => void; href?: string }
  | { href: string; onSelect?: () => void };

export interface ActionButtonProps extends Omit<ButtonProps, 'asChild' | 'onClick'> {
  /** With `href` the button renders a real link (the app's link through LinkProvider); `onSelect` still runs on click. */
  href?: string;
  onSelect?: () => void;
}

/** A Button for an `action={{ label, onSelect | href }}` object: a link when it has an `href`, else a button. */
export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ href, onSelect, children, type = 'button', ...props }, ref) => {
    const link = useLinkComponent();
    // A disabled or loading action renders a real (disabled) button: an anchor would stay keyboard-activatable.
    if (href === undefined || props.disabled || props.loading) {
      return (
        <Button ref={ref} type={type} onClick={onSelect} {...props}>
          {children}
        </Button>
      );
    }
    return (
      <Button ref={ref} asChild onClick={onSelect} {...props}>
        {React.createElement(link, { href }, children)}
      </Button>
    );
  },
);

ActionButton.displayName = 'ActionButton';
